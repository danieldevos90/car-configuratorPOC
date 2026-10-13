import { Box3, Object3D, Vector3 } from "three";
import type { VehicleDefinition } from "@/config/catalog";

function bottomCenter(box: Box3, out = new Vector3()) {
  return out.set(
    (box.min.x + box.max.x) * 0.5,
    box.min.y,
    (box.min.z + box.max.z) * 0.5,
  );
}

function clusterMeshContacts(node: Object3D): Vector3[] {
  const meshes: Object3D[] = [];
  node.traverse((child) => {
    if (child.type === "Mesh" || child.type === "SkinnedMesh") meshes.push(child);
  });
  if (meshes.length === 0) {
    return [bottomCenter(new Box3().setFromObject(node))];
  }
  if (meshes.length === 1) {
    return [bottomCenter(new Box3().setFromObject(meshes[0]))];
  }

  const buckets = new Map<string, Vector3[]>();
  for (const mesh of meshes) {
    const box = new Box3().setFromObject(mesh);
    const center = box.getCenter(new Vector3());
    const side = center.x < 0 ? "L" : "R";
    const axle = center.z >= 0 ? "F" : "R";
    const key = `${side}${axle}`;
    const list = buckets.get(key) ?? [];
    list.push(bottomCenter(box));
    buckets.set(key, list);
  }

  const contacts: Vector3[] = [];
  for (const points of buckets.values()) {
    const avg = points
      .reduce((acc, p) => acc.add(p), new Vector3())
      .multiplyScalar(1 / points.length);
    contacts.push(avg);
  }
  return contacts;
}

function partRoot(
  base: Object3D,
  kit: Object3D | null,
  part: { module?: string; presetRoot?: string },
): Object3D | null {
  const scene = part.module === "gelande" ? kit : base;
  if (!scene) return null;
  if (part.presetRoot) return scene.getObjectByName(part.presetRoot) ?? null;
  return scene;
}

/** Ground contact points (world space) for each visible wheel group. */
export function collectWheelContacts(
  base: Object3D,
  kit: Object3D | null,
  vehicle: VehicleDefinition,
  hiddenPartIds: readonly string[],
): Vector3[] {
  const hidden = new Set(hiddenPartIds);
  const contacts: Vector3[] = [];

  for (const part of vehicle.parts) {
    if (part.category !== "wheels" || hidden.has(part.id)) continue;
    const scope = partRoot(base, kit, part);
    if (!scope || !scope.visible) continue;
    for (const name of part.nodeNames) {
      const node = scope.getObjectByName(name);
      if (!node || !node.visible) continue;
      contacts.push(...clusterMeshContacts(node));
    }
  }
  return contacts;
}
