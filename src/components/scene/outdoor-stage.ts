import { Box3, Mesh, Object3D, Vector3 } from "three";

/** Grass clumps are the main draw-call cost; trees/road stay full (fog hides the rest). */
export const OUTDOOR_GRASS_CULL = {
  radiusXZ: 52,
  radiusNavigatingXZ: 36,
};

const carAnchor = new Vector3(0, 0, 0);
const bounds = new Box3();
const center = new Vector3();

function distanceXZToCar(mesh: Mesh) {
  bounds.setFromObject(mesh);
  bounds.getCenter(center);
  return Math.hypot(center.x - carAnchor.x, center.z - carAnchor.z);
}

export function isOutdoorGrassMesh(meshName: string, materialNames: string) {
  return /grass|wheat/i.test(meshName) || /grass|wheat/i.test(materialNames);
}

/** Hide only distant grass instances; forest geometry stays visible. */
export function cullDistantGrass(root: Object3D, radiusXZ: number) {
  root.updateMatrixWorld(true);
  root.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materialName = materials.map((m) => m.name).join(" ");
    if (!isOutdoorGrassMesh(mesh.name, materialName)) return;
    mesh.visible = distanceXZToCar(mesh) <= radiusXZ;
  });
}
