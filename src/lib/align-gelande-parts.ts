import { Box3, Object3D, Vector3 } from "three";
import { GELANDE_KIT_ATTACHMENT_RULES } from "@/config/gelande-kit-attachments";
import {
  applyWorldPositionDelta,
  meshBounds,
  meshCentroid,
  meshGroundPoint,
} from "@/lib/mesh-bounds";

const OEM_WHEEL_NODES = [
  "WheelFrLeft",
  "WheelFrRight",
  "WheelRearLeft",
  "WheelRearRight",
] as const;

const ALIGNED_FLAG = "__gelandePartsAligned";

function clusterGelandeWheelGroundPoints(newWheels: Object3D): Vector3[] {
  const meshes: Object3D[] = [];
  newWheels.traverse((child) => {
    if (child.type === "Mesh" || child.type === "SkinnedMesh") meshes.push(child);
  });

  const buckets = new Map<string, Vector3[]>();
  for (const mesh of meshes) {
    const box = new Box3().setFromObject(mesh);
    const center = box.getCenter(new Vector3());
    if (Math.abs(center.z) > 2.05) continue;
    const side = center.x < 0 ? "L" : "R";
    const axle = center.z >= 0 ? "F" : "R";
    const key = `${side}${axle}`;
    const ground = new Vector3(
      (box.min.x + box.max.x) * 0.5,
      box.min.y,
      (box.min.z + box.max.z) * 0.5,
    );
    const list = buckets.get(key) ?? [];
    list.push(ground);
    buckets.set(key, list);
  }

  const points: Vector3[] = [];
  for (const list of buckets.values()) {
    points.push(
      list
        .reduce((acc, p) => acc.add(p), new Vector3())
        .multiplyScalar(1 / list.length),
    );
  }
  return points;
}

function sortWheelPoints(points: Vector3[]) {
  return [...points].sort((a, b) => a.z - b.z || a.x - b.x);
}

function wheelDiameter(node: Object3D): number {
  const size = meshBounds(node).getSize(new Vector3());
  return (size.x + size.y + size.z) / 3;
}

function gelandeWheelDiameters(newWheels: Object3D): number[] {
  const meshes: Object3D[] = [];
  newWheels.traverse((child) => {
    if (child.type === "Mesh" || child.type === "SkinnedMesh") meshes.push(child);
  });

  const buckets = new Map<string, Object3D[]>();
  for (const mesh of meshes) {
    const center = meshBounds(mesh).getCenter(new Vector3());
    if (Math.abs(center.z) > 2.05) continue;
    const side = center.x < 0 ? "L" : "R";
    const axle = center.z >= 0 ? "F" : "R";
    const key = `${side}${axle}`;
    const list = buckets.get(key) ?? [];
    list.push(mesh);
    buckets.set(key, list);
  }

  const diameters: number[] = [];
  for (const list of buckets.values()) {
    const box = new Box3();
    for (const mesh of list) box.expandByObject(mesh);
    const size = box.getSize(new Vector3());
    diameters.push((size.x + size.y + size.z) / 3);
  }
  return diameters;
}

function applyUniformScale(obj: Object3D, scale: number) {
  if (Math.abs(scale - 1) < 0.001) return;
  const pivot = meshCentroid(obj);
  obj.updateMatrixWorld(true);
  const worldPivot = pivot.clone();
  obj.scale.multiplyScalar(scale);
  obj.updateMatrixWorld(true);
  const after = meshCentroid(obj);
  applyWorldPositionDelta(obj, worldPivot.sub(after));
}

function snapWheels(base: Object3D, kit: Object3D, kitNode: string, coverNode?: string) {
  const newWheels = kit.getObjectByName(kitNode);
  if (!newWheels) return;

  const oemDiameters: number[] = [];
  for (const name of OEM_WHEEL_NODES) {
    const node = base.getObjectByName(name);
    if (!node) return;
    oemDiameters.push(wheelDiameter(node));
  }
  const gelDiameters = gelandeWheelDiameters(newWheels);
  if (oemDiameters.length === 4 && gelDiameters.length >= 4) {
    const oemAvg =
      oemDiameters.reduce((sum, d) => sum + d, 0) / oemDiameters.length;
    const gelAvg =
      gelDiameters.reduce((sum, d) => sum + d, 0) / gelDiameters.length;
    if (gelAvg > 1e-6) {
      applyUniformScale(newWheels, oemAvg / gelAvg);
      const covers = coverNode ? kit.getObjectByName(coverNode) : null;
      if (covers) applyUniformScale(covers, oemAvg / gelAvg);
    }
  }

  const oemPoints: Vector3[] = [];
  for (const name of OEM_WHEEL_NODES) {
    const node = base.getObjectByName(name);
    if (!node) return;
    oemPoints.push(meshGroundPoint(node));
  }

  const gelandePoints = clusterGelandeWheelGroundPoints(newWheels);
  if (gelandePoints.length < 4) return;

  const gelSorted = sortWheelPoints(
    gelandePoints.length === 4 ? gelandePoints : gelandePoints.slice(0, 4),
  );
  const oemSorted = sortWheelPoints(oemPoints);

  const delta = new Vector3();
  for (let i = 0; i < 4; i++) {
    delta.add(oemSorted[i].clone().sub(gelSorted[i]));
  }
  delta.multiplyScalar(0.25);
  if (delta.length() < 0.0005) return;

  applyWorldPositionDelta(newWheels, delta);
  if (coverNode) {
    const covers = kit.getObjectByName(coverNode);
    if (covers) applyWorldPositionDelta(covers, delta);
  }
}

function snapCentroid(
  base: Object3D,
  kit: Object3D,
  kitNode: string,
  oemNode: string,
  mode: "centroid" | "ground",
) {
  const kitPart = kit.getObjectByName(kitNode);
  const oemPart = base.getObjectByName(oemNode);
  if (!kitPart || !oemPart) return;

  const kitPoint =
    mode === "ground" ? meshGroundPoint(kitPart) : meshCentroid(kitPart);
  const oemPoint =
    mode === "ground" ? meshGroundPoint(oemPart) : meshCentroid(oemPart);
  const delta = oemPoint.sub(kitPoint);
  if (delta.length() < 0.0005) return;
  applyWorldPositionDelta(kitPart, delta);
}

function snapGrilleGroup(base: Object3D, kit: Object3D, kitNodes: string[], oemNode: string) {
  const lead = kit.getObjectByName(kitNodes[0]);
  const oemPart = base.getObjectByName(oemNode);
  if (!lead || !oemPart) return;

  const delta = meshCentroid(oemPart).sub(meshCentroid(lead));
  if (delta.length() < 0.0005) return;

  for (const name of kitNodes) {
    const node = kit.getObjectByName(name);
    if (node) applyWorldPositionDelta(node, delta);
  }
}

function snapRoofOnBody(base: Object3D, kit: Object3D, kitNodes: string[], oemNode: string) {
  const body = base.getObjectByName(oemNode);
  const lead = kit.getObjectByName(kitNodes[0]);
  if (!body || !lead) return;

  const bodyBox = meshBounds(body);
  const bodyTop = bodyBox.max.y;
  const bodyCenter = bodyBox.getCenter(new Vector3());
  const leadBox = meshBounds(lead);
  const leadCenter = leadBox.getCenter(new Vector3());

  const delta = new Vector3(
    bodyCenter.x - leadCenter.x,
    bodyTop - leadBox.min.y,
    bodyCenter.z - leadCenter.z,
  );
  if (delta.length() < 0.0005) return;

  for (const name of kitNodes) {
    const node = kit.getObjectByName(name);
    if (node) applyWorldPositionDelta(node, delta);
  }
}

/**
 * Snap each Gelände kit root onto matching OEM geometry (wheels↔wheels, bumper↔front, etc.).
 * Does not move the kit scene root — only individual kit parts under `Gelande_Kits_Root`.
 */
export function alignGelandeKitPartsToOem(base: Object3D, kit: Object3D) {
  if ((kit as Object3D & { userData: Record<string, unknown> }).userData[ALIGNED_FLAG]) {
    return;
  }

  base.updateMatrixWorld(true);
  kit.updateMatrixWorld(true);

  for (const rule of GELANDE_KIT_ATTACHMENT_RULES) {
    switch (rule.type) {
      case "wheels":
        snapWheels(base, kit, rule.kitNode, rule.coverNode);
        break;
      case "centroid":
        snapCentroid(base, kit, rule.kitNode, rule.oemNode, "centroid");
        break;
      case "ground":
        snapCentroid(base, kit, rule.kitNode, rule.oemNode, "ground");
        break;
      case "grille-group":
        snapGrilleGroup(base, kit, rule.kitNodes, rule.oemNode);
        break;
      case "roof-on-body":
        snapRoofOnBody(base, kit, rule.kitNodes, rule.oemNode);
        break;
      default:
        break;
    }
  }

  (kit as Object3D & { userData: Record<string, unknown> }).userData[ALIGNED_FLAG] = true;
}
