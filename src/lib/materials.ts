import {
  Color,
  Mesh,
  Object3D,
  Texture,
  type Material,
  type MeshPhysicalMaterial,
} from "three";
import type { ConfigPart, PartFinish, VehicleDefinition } from "@/config/catalog";
import type { Finish } from "@/config/finishes";

const GLASS_HINT = /glass|lens|wind|tint|transpar/i;
const CHROME_HINT = /chrome|aluminium|aluminum|alum/i;

/** Variant clones must not prefix-match catalog names ("CarPaint…") in applyConfiguratorMaterials. */
const VARIANT_PREFIX = "variant:";

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
  liteGpu = false,
) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.matrixAutoUpdate = false;
    child.updateMatrix();
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
        mat.metalness = 0;
        mat.roughness = Math.min(mat.roughness, 0.08);
        if (liteGpu) {
          // Transmission is a extra fullscreen pass per surface — too heavy on phones.
          mat.transmission = 0;
          mat.thickness = 0;
          mat.opacity = 0.32;
          mat.depthWrite = false;
        } else {
          mat.transmission = Math.max(mat.transmission, 0.85);
          mat.thickness = mat.thickness || 0.4;
        }
      } else if (CHROME_HINT.test(name) && !name.startsWith("int")) {
        mat.metalness = Math.max(mat.metalness, 0.85);
        mat.roughness = Math.min(mat.roughness, 0.22);
      } else if (/tyre|tire/i.test(name)) {
        mat.color.set("#1c1e22");
        mat.metalness = 0;
        mat.roughness = 0.68;
        mat.map = null;
      }

      if (liteGpu) {
        mat.clearcoat = 0;
        mat.clearcoatRoughness = 0.2;
        if ("sheen" in mat) mat.sheen = 0;
        if ("iridescence" in mat) mat.iridescence = 0;
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
    contrast: Finish;
    interior: Finish;
    caliper: Finish;
    lightsOn: boolean;
    liteGpu?: boolean;
  },
) {
  const paintMats: MeshPhysicalMaterial[] = [];
  const accentMats: MeshPhysicalMaterial[] = [];
  const contrastMats: MeshPhysicalMaterial[] = [];
  const contrastNames = vehicle.contrastPaintMaterials ?? [];
  const leatherMats: MeshPhysicalMaterial[] = [];
  const caliperMats: MeshPhysicalMaterial[] = [];
  const emissiveMats: MeshPhysicalMaterial[] = [];

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    for (const mat of asPhysical(child.material)) {
      const name = mat.name || "";
      // Prefix matching: "CarPaint" would also claim "CarPaint (1)" / "CarPaint White".
      if (matches(name, contrastNames)) contrastMats.push(mat);
      else if (contrastNames.length && matches(name, vehicle.accentPaintMaterials)) {
        accentMats.push(mat);
      } else if (matches(name, vehicle.paintMaterials)) paintMats.push(mat);
      else if (matches(name, vehicle.accentPaintMaterials)) accentMats.push(mat);
      else if (matches(name, vehicle.leatherMaterials)) leatherMats.push(mat);
      else if (matches(name, vehicle.caliperMaterials)) caliperMats.push(mat);

      if (matches(name, vehicle.emissiveMaterials)) emissiveMats.push(mat);
    }
  });

  const coat = options.liteGpu
    ? { clearcoat: 0, clearcoatRoughness: 0.4 }
    : {};
  applyFinish(paintMats, { ...options.paint, ...coat });
  applyFinish(accentMats, {
    ...options.paint,
    roughness: Math.min(1, options.paint.roughness + 0.12),
    metalness: Math.max(0, options.paint.metalness - 0.05),
    ...coat,
  });
  applyFinish(contrastMats, { ...options.contrast, ...coat });
  applyFinish(leatherMats, { ...options.interior, ...coat }, { sheen: !options.liteGpu });
  applyFinish(caliperMats, { ...options.caliper, ...coat });

  for (const mat of emissiveMats) {
    mat.emissiveIntensity = options.lightsOn ? 4 : 0.05;
    if (options.lightsOn && mat.emissive.getHex() === 0) {
      mat.emissive.copy(mat.color);
    }
    mat.needsUpdate = true;
  }
}

function resolveTone(
  tone: PartFinish["tone"],
  tones: { paint: Finish; contrast: Finish },
): Finish {
  if (tone === "paint") return tones.paint;
  if (tone === "contrast") return tones.contrast;
  return {
    id: "variant",
    label: "variant",
    clearcoat: 0,
    clearcoatRoughness: 0.1,
    ...tone,
  };
}

function partMeshes(root: Object3D, part: ConfigPart, visit: (mesh: Mesh) => void) {
  for (const name of part.nodeNames) {
    root.getObjectByName(name)?.traverse((child) => {
      if (child instanceof Mesh && !Array.isArray(child.material)) visit(child);
    });
  }
}

/**
 * Slot options can share geometry and differ only in material (rim finish,
 * colour-coded bumper). Visible options swap in per-mesh clones; everything
 * else gets its original material back.
 */
export function applyPartFinishes(
  root: Object3D,
  vehicle: VehicleDefinition,
  hiddenPartIds: ReadonlySet<string>,
  tones: { paint: Finish; contrast: Finish },
) {
  const variants = vehicle.parts.filter((part) => part.finish);
  for (const part of variants) {
    partMeshes(root, part, (mesh) => {
      if (mesh.userData.baseMaterial) mesh.material = mesh.userData.baseMaterial;
    });
  }
  for (const part of variants) {
    if (hiddenPartIds.has(part.id)) continue;
    const { materials, tone } = part.finish!;
    const finish = resolveTone(tone, tones);
    partMeshes(root, part, (mesh) => {
      const base = (mesh.userData.baseMaterial ?? mesh.material) as Material;
      if (!materials.includes(base.name)) return;
      mesh.userData.baseMaterial = base;
      const cache: Record<string, MeshPhysicalMaterial> = (mesh.userData.variants ??= {});
      let clone = cache[part.id];
      if (!clone) {
        clone = base.clone() as MeshPhysicalMaterial;
        clone.name = `${VARIANT_PREFIX}${base.name}`;
        cache[part.id] = clone;
      }
      applyFinish([clone], finish);
      mesh.material = clone;
    });
  }
}

function drawableSize(image: unknown): {
  width: number;
  height: number;
  source: CanvasImageSource;
} | null {
  if (!image || typeof image !== "object") return null;
  if (!("width" in image) || !("height" in image)) return null;
  const width = Number((image as { width: number }).width);
  const height = Number((image as { height: number }).height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null;
  }
  if (
    image instanceof HTMLImageElement ||
    image instanceof HTMLCanvasElement ||
    image instanceof HTMLVideoElement ||
    (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) ||
    (typeof OffscreenCanvas !== "undefined" && image instanceof OffscreenCanvas)
  ) {
    return { width, height, source: image };
  }
  return null;
}

type DrawableSource = {
  width: number;
  height: number;
  source: CanvasImageSource;
};

const textureOriginal = new WeakMap<Texture, DrawableSource>();
const downscaledByMax = new WeakMap<CanvasImageSource, Map<number, HTMLCanvasElement>>();

function rememberOriginal(texture: Texture, sized: DrawableSource) {
  if (!textureOriginal.has(texture)) {
    textureOriginal.set(texture, sized);
  }
}

function downscaleTo(
  original: DrawableSource,
  maxSize: number,
): HTMLCanvasElement | null {
  if (original.width <= maxSize && original.height <= maxSize) {
    return null;
  }
  let byMax = downscaledByMax.get(original.source as CanvasImageSource);
  if (!byMax) {
    byMax = new Map();
    downscaledByMax.set(original.source as CanvasImageSource, byMax);
  }
  const cached = byMax.get(maxSize);
  if (cached) return cached;

  const scale = maxSize / Math.max(original.width, original.height);
  const width = Math.max(1, Math.round(original.width * scale));
  const height = Math.max(1, Math.round(original.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(original.source, 0, 0, width, height);
  byMax.set(maxSize, canvas);
  return canvas;
}

/** Shrink decoded maps so mobile GPUs are not holding several 4K textures. */
export function constrainTextureSize(texture: Texture, maxSize: number) {
  const image = texture.image as unknown;
  const sized = drawableSize(image);
  if (!sized) return;

  rememberOriginal(texture, sized);
  const original = textureOriginal.get(texture)!;

  if (original.width <= maxSize && original.height <= maxSize) {
    if (texture.image !== original.source) {
      texture.image = original.source;
      texture.needsUpdate = true;
    }
    return;
  }

  const canvas = downscaleTo(original, maxSize);
  if (!canvas) return;
  texture.image = canvas;
  texture.needsUpdate = true;
}

/** Sharper oblique surfaces; call once after the GLB is loaded. */
export function tuneVehicleTextureSampling(
  root: Object3D,
  maxAnisotropy: number,
  maxTextureSize = 4096,
) {
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
          constrainTextureSize(value, maxTextureSize);
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

export function setPartVisibility(
  root: Object3D,
  part: ConfigPart,
  visible: boolean,
) {
  const scope = part.presetRoot
    ? root.getObjectByName(part.presetRoot)
    : root;
  if (!scope) return;
  for (const name of part.nodeNames) {
    const node = scope.getObjectByName(name);
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
