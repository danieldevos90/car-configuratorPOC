/**
 * Turns CAD/WIP source GLBs into web-ready assets without dropping triangles:
 * weld (identical vertices only) → WebP textures → Meshopt.
 *
 * 8K maps are capped at 4096. A decoded 8192² texture is 256 MB of VRAM;
 * every 4K map in the source is kept at full resolution.
 *
 * Output: public/models/web/<filename>
 * Runtime prefers these files, then falls back to /models/source.
 * After a successful export, bump WEB_MODEL_REV so the immutable cache
 * picks up the new bytes.
 */
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "node_modules/@gltf-transform/cli/bin/cli.js");
const outDir = join(root, "public/models/web");
mkdirSync(outDir, { recursive: true });

function resolveSourceGlb(file) {
  const candidates = [
    join(root, "public/models/source", file),
    join(root, "glb", file),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

const jobs = [
  "MB-G550-original-model.glb",
  "WIP-gelande-werke-RETRO.glb",
  "GW-G550-configurator-master.glb",
];

for (const file of jobs) {
  const input = resolveSourceGlb(file);
  const output = join(outDir, file);
  // Extension must stay .glb. Any other suffix makes gltf-transform
  // unpack a JSON scene plus external .bin and texture files.
  const temp = join(outDir, file.replace(/\.glb$/i, ".optimizing.glb"));
  if (!input) {
    console.warn("skip missing", file);
    continue;
  }
  rmSync(temp, { force: true });
  console.log("optimize", file);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "optimize",
      input,
      temp,
      "--compress",
      "meshopt",
      "--meshopt-level",
      "high",
      "--texture-compress",
      "webp",
      "--texture-size",
      "4096",
      "--flatten",
      "false",
      "--join",
      "false",
      "--instance",
      "false",
      "--palette",
      "false",
      "--simplify",
      "false",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=20480",
      },
    },
  );
  if (result.status !== 0) {
    rmSync(temp, { force: true });
    console.error("optimize failed", file, result.status);
    process.exit(result.status ?? 1);
  }
  renameSync(temp, output);
}
