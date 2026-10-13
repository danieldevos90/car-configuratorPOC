import { Box3, Object3D, Vector3 } from "three";

export function meshBounds(root: Object3D): Box3 {
  const box = new Box3();
  let hasMesh = false;
  root.traverse((child) => {
    if (child.type === "Mesh" || child.type === "SkinnedMesh") {
      box.expandByObject(child);
      hasMesh = true;
    }
  });
  if (!hasMesh) box.setFromObject(root);
  return box;
}

export function meshCentroid(root: Object3D): Vector3 {
  return meshBounds(root).getCenter(new Vector3());
}

export function meshGroundPoint(root: Object3D): Vector3 {
  const box = meshBounds(root);
  return new Vector3(
    (box.min.x + box.max.x) * 0.5,
    box.min.y,
    (box.min.z + box.max.z) * 0.5,
  );
}

export function applyWorldPositionDelta(obj: Object3D, deltaWorld: Vector3) {
  obj.updateMatrixWorld(true);
  const target = obj.getWorldPosition(new Vector3()).add(deltaWorld);
  if (obj.parent) {
    obj.parent.updateMatrixWorld(true);
    obj.parent.worldToLocal(target);
  }
  obj.position.copy(target);
}
