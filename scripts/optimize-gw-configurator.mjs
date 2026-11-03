/**
 * Web export for the single-file Gelände Werke configurator master
 * (glb/gelande-werke-RETRO+OEMparts.glb): OEM G550 base, OEM parts, RETRO kit
 * and DUO-TONE overlay in one scene.
 *
 * Node names are the configurator contract (src/config/gw-configurator.ts).
 * three's GLTFLoader strips spaces/reserved chars and suffixes duplicates with
 * `_1`, so names are normalised here and every named node is made unique.
 *
 * Output: public/models/web/GW-configurator.glb — bump WEB_MODEL_REV after export.
 */
import { renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  join as joinPrimitives,
  meshopt,
  prune,
  simplifyPrimitive,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const input = join(root, "glb/gelande-werke-RETRO+OEMparts.glb");
const output = join(root, "public/models/web/GW-configurator.glb");
const temp = output.replace(/\.glb$/, ".optimizing.glb");

/** Source root name → stable root name + prefix used to resolve name clashes. */
const ROOTS = {
  "_RETRO-SETUP_": { name: "GW-Retro", tag: "Retro" },
  "Mercedes-G550-base-model": { name: "GW-Base", tag: "Base" },
  "DUO-TONE": { name: "GW-DuoTone", tag: "DuoTone" },
  "_OEM-SETUP-turn-off-for-RETRO-body": { name: "GW-OEM", tag: "OEM" },
};

/**
 * Simplify only removes CAD over-tessellation: 0.00005 of a mesh radius is
 * ~0.02 mm on a tyre, below what any web camera can resolve. Mirror-like
 * surfaces are skipped: studio reflections expose every removed triangle as
 * a wobbly highlight line.
 */
const SIMPLIFY_ERROR = Number(process.env.GW_SIMPLIFY_ERROR ?? 0.00005);
const REFLECTIVE_MATERIAL = /paint|glass|chrome|lens|mirror|wind/i;

function simplifyMatte(document) {
  let skipped = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (REFLECTIVE_MATERIAL.test(prim.getMaterial()?.getName() ?? "")) {
        skipped++;
        continue;
      }
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0, error: SIMPLIFY_ERROR });
    }
  }
  console.log(`simplify: kept ${skipped} reflective primitives at full density`);
}
const TEXTURE_MAX = Number(process.env.GW_TEXTURE_MAX ?? 4096);

function sanitize(name) {
  return name
    .trim()
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[[\].:/\\]/g, "");
}

function normaliseNodeNames(document) {
  const scene = document.getRoot().getDefaultScene();
  const tagOf = new Map();
  for (const node of scene.listChildren()) {
    const mapped = ROOTS[node.getName()];
    if (!mapped) throw new Error(`Unexpected root node: ${node.getName()}`);
    node.setName(mapped.name);
    tagOf.set(node, mapped.tag);
  }

  const nodes = document.getRoot().listNodes();
  for (const node of nodes) {
    if (node.getName() && !tagOf.has(node)) node.setName(sanitize(node.getName()));
  }

  const count = new Map();
  for (const node of nodes) {
    const name = node.getName();
    if (name) count.set(name, (count.get(name) ?? 0) + 1);
  }
  const renamed = [];
  for (const node of nodes) {
    const name = node.getName();
    if (!name || count.get(name) < 2) continue;
    const parent = node.getParentNode();
    const prefix = tagOf.get(parent) ?? parent?.getName() ?? "Node";
    node.setName(`${prefix}-${name}`);
    renamed.push(`${name} → ${node.getName()}`);
  }
  if (renamed.length) console.log("renamed duplicates:\n  " + renamed.join("\n  "));

  const seen = new Set();
  for (const node of nodes) {
    const name = node.getName();
    if (!name) continue;
    if (seen.has(name)) throw new Error(`Node name still not unique: ${name}`);
    seen.add(name);
  }
}

function stats(document, label) {
  let triangles = 0;
  let primitives = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      primitives++;
      const indices = prim.getIndices();
      triangles += (indices ? indices.getCount() : prim.getAttribute("POSITION").getCount()) / 3;
    }
  }
  console.log(
    `${label}: ${(triangles / 1e6).toFixed(2)}M triangles, ${primitives} primitives, ` +
      `${document.getRoot().listTextures().length} textures`,
  );
}

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder });

console.log("read", input);
const document = await io.read(input);
stats(document, "source");

normaliseNodeNames(document);

await document.transform(
  dedup(),
  prune(),
  weld(),
  joinPrimitives({ keepNamed: true }),
);
if (SIMPLIFY_ERROR > 0) simplifyMatte(document);
await document.transform(prune());
stats(document, "geometry");

await document.transform(
  textureCompress({
    encoder: sharp,
    targetFormat: "webp",
    resize: [TEXTURE_MAX, TEXTURE_MAX],
  }),
  meshopt({ encoder: MeshoptEncoder, level: "high" }),
);
stats(document, "web");

rmSync(temp, { force: true });
await io.write(temp, document);
renameSync(temp, output);
console.log(`wrote ${output} (${(statSync(output).size / 1048576).toFixed(1)} MB)`);
