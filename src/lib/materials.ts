import {
  Color,
  Mesh,
  Object3D,
  Texture,
  type Material,
  type MeshPhysicalMaterial,
} from "three";
import type { VehicleDefinition } from "@/config/catalog";
import type { Finish } from "@/config/finishes";

const GLASS_HINT = /glass|lens|wind|tint|transpar/i;
const CHROME_HINT = /chrome|aluminium|aluminum|alum/i;

function asPhysical(material: Material | Material[]): MeshPhysicalMaterial[] {
  const list = Array.isArray(material) ? material : [material];
  return list.filter(
    (m): m is MeshPhysicalMaterial =>
      Boolean(m) && "color" in m && "roughness" in m,
  );
}

function matches(name: string, patterns: string[]) {
  return patterns.some((pattern) => name === pattern || name.startsWith(pattern));
}

export function sanitizeVehicleMaterials(
  root: Object3D,
  vehicle: VehicleDefinition,
) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    for (const mat of asPhysical(child.material)) {
      const name = mat.name || "";
      const isGlass =
        matches(name, vehicle.glassMaterials) || GLASS_HINT.test(name);

      if (!isGlass && "transmission" in mat) {
        mat.transmission = 0;
        mat.thickness = 0;
      }

      if (isGlass) {
        mat.transparent = true;
        mat.transmission = Math.max(mat.transmission, 0.85);
        mat.thickness = mat.thickness || 0.4;
        mat.roughness = Math.min(mat.roughness, 0.08);
        mat.metalness = 0;
      } else if (CHROME_HINT.test(name) && !name.startsWith("int")) {
        mat.metalness = Math.max(mat.metalness, 0.85);
        mat.roughness = Math.min(mat.roughness, 0.22);
      }

      mat.needsUpdate = true;
    }
  });
}

function applyFinish(
  materials: MeshPhysicalMaterial[],
  finish: Finish,
  extras?: { sheen?: boolean },
) {
  const color = new Color(finish.color);
  for (const mat of materials) {
    mat.color.copy(color);
    mat.roughness = finish.roughness;
    mat.metalness = finish.metalness;
    mat.clearcoat = finish.clearcoat;
    mat.clearcoatRoughness = finish.clearcoatRoughness;
    if ("transmission" in mat) mat.transmission = 0;
    if (extras?.sheen && "sheen" in mat) {
      mat.sheen = 0.55;
      mat.sheenRoughness = 0.45;
      if (finish.sheen) mat.sheenColor.set(finish.sheen);
    }
    mat.needsUpdate = true;
  }
}

export function applyConfiguratorMaterials(
  root: Object3D,
  vehicle: VehicleDefinition,
  options: {
    paint: Finish;
    interior: Finish;
    caliper: Finish;
    lightsOn: boolean;
  },
) {
  const paintMats: MeshPhysicalMaterial[] = [];
  const accentMats: MeshPhysicalMaterial[] = [];
  const leatherMats: MeshPhysicalMaterial[] = [];
  const caliperMats: MeshPhysicalMaterial[] = [];
  const emissiveMats: MeshPhysicalMaterial[] = [];

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    for (const mat of asPhysical(child.material)) {
      const name = mat.name || "";
      if (matches(name, vehicle.paintMaterials)) paintMats.push(mat);
      else if (matches(name, vehicle.accentPaintMaterials)) accentMats.push(mat);
      else if (matches(name, vehicle.leatherMaterials)) leatherMats.push(mat);
      else if (matches(name, vehicle.caliperMaterials)) caliperMats.push(mat);

      if (matches(name, vehicle.emissiveMaterials)) emissiveMats.push(mat);
    }
  });

  applyFinish(paintMats, options.paint);
  applyFinish(accentMats, {
    ...options.paint,
    roughness: Math.min(1, options.paint.roughness + 0.12),
    metalness: Math.max(0, options.paint.metalness - 0.05),
  });
  applyFinish(leatherMats, options.interior, { sheen: true });
  applyFinish(caliperMats, options.caliper);

  for (const mat of emissiveMats) {
    mat.emissiveIntensity = options.lightsOn ? 4 : 0.05;
    if (options.lightsOn && mat.emissive.getHex() === 0) {
      mat.emissive.copy(mat.color);
    }
    mat.needsUpdate = true;
  }
}

/** Sharper oblique surfaces; call once after the GLB is loaded. */
export function tuneVehicleTextureSampling(root: Object3D, maxAnisotropy: number) {
  const anisotropy = Math.min(16, Math.max(1, maxAnisotropy));
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value instanceof Texture) {
          value.anisotropy = anisotropy;
          value.needsUpdate = true;
        }
      }
    }
  });
}

export function setNamedVisibility(
  namedNodes: Map<string, Object3D>,
  nodeNames: string[],
  visible: boolean,
) {
  for (const name of nodeNames) {
    const node = namedNodes.get(name);
    if (node) node.visible = visible;
  }
}

export function collectNamedNodes(root: Object3D) {
  const named = new Map<string, Object3D>();
  root.traverse((child) => {
    if (child.name) named.set(child.name, child);
  });
  return named;
}

export function findNamedAncestor(object: Object3D, names: Set<string>) {
  let current: Object3D | null = object;
  while (current) {
    if (current.name && names.has(current.name)) return current.name;
    current = current.parent;
  }
  return null;
}
