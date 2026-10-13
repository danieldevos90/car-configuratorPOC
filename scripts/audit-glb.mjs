import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

function loadGltfJson(path) {
  const buffer = readFileSync(path);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
}

function audit(path) {
  const gltf = loadGltfJson(path);
  const nodes = gltf.nodes ?? [];
  const meshes = gltf.meshes ?? [];
  const materials = gltf.materials ?? [];
  const images = gltf.images ?? [];
  const accessors = gltf.accessors ?? [];
  const bufferViews = gltf.bufferViews ?? [];

  let vertices = 0;
  let indices = 0;
  for (const mesh of meshes) {
    for (const prim of mesh.primitives ?? []) {
      const pos = prim.attributes?.POSITION;
      if (pos != null) vertices += accessors[pos]?.count ?? 0;
      if (prim.indices != null) indices += accessors[prim.indices]?.count ?? 0;
    }
  }

  const namedNodes = nodes.filter((n) => n.name).map((n) => n.name);
  const namedMaterials = materials.filter((m) => m.name).map((m) => m.name);
  const textureBytes = images.reduce((sum, image) => {
    const view = image.bufferView;
    return sum + (view != null ? bufferViews[view]?.byteLength ?? 0 : 0);
  }, 0);

  return {
    file: basename(path),
    generator: gltf.asset?.generator ?? null,
    extensionsUsed: gltf.extensionsUsed ?? [],
    nodes: nodes.length,
    namedNodes,
    meshes: meshes.length,
    materials: materials.length,
    namedMaterials,
    images: images.length,
    textureMb: Number((textureBytes / 1024 / 1024).toFixed(1)),
    vertices,
    triangles: Math.floor(indices / 3),
  };
}

const root = fileURLToPath(new URL("..", import.meta.url));

function resolveAuditPaths(argv) {
  if (argv.length > 0) return argv.map((path) => join(process.cwd(), path));
  const names = [
    "MB-G550-original-model.glb",
    "WIP-gelande-werke-RETRO.glb",
  ];
  const dirs = ["public/models/web", "public/models/source", "glb"];
  const resolved = [];
  for (const name of names) {
    for (const dir of dirs) {
      const path = join(root, dir, name);
      if (existsSync(path)) {
        resolved.push(path);
        break;
      }
    }
  }
  return resolved;
}

const files = resolveAuditPaths(process.argv.slice(2));
if (files.length === 0) {
  console.error("No GLB files found to audit.");
  process.exit(1);
}
const report = files.map(audit);
mkdirSync(join(root, "src/generated"), { recursive: true });
writeFileSync(
  join(root, "src/generated/glb-audit.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
