import type { Object3D } from "three";
import { alignGelandeKitPartsToOem } from "@/lib/align-gelande-parts";

/**
 * Prepare kit GLB beside OEM base: hide build markers, snap each kit part to OEM anchors.
 * Kit scene root stays at origin; alignment is baked on `Gelande_Kits_Root` in the GLB.
 */
export function prepareModularVehicleAssembly(base: Object3D, kit: Object3D) {
  kit.position.set(0, 0, 0);
  kit.rotation.set(0, 0, 0);
  kit.scale.set(1, 1, 1);
  kit.traverse((child) => {
    if (child.name === "Kit_Align_Mesh") child.visible = false;
  });
  alignGelandeKitPartsToOem(base, kit);
}
