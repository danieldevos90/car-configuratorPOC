/**
 * Turns CAD/WIP source GLBs into web-ready assets:
 * weld → simplify → webp textures → Draco.
 *
 * Output: public/models/web/<filename>
 * Runtime prefers these files, then falls back to /models/source.
 */
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "node_modules/@gltf-transform/cli/bin/cli.js");
const outDir = join(root, "public/models/web");
mkdirSync(outDir, { recursive: true });

const jobs = [
  "MB-G550-original-model.glb",
  "WIP-gelande-werke-RETRO.glb",
];

for (const file of jobs) {
  const input = join(root, "glb", file);
  const output = join(outDir, file);
  if (!existsSync(input)) {
    console.warn("skip missing", input);
    continue;
  }
  console.log("optimize", file);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      "optimize",
      input,
      output,
      "--compress",
      "draco",
      "--texture-compress",
      "webp",
      "--texture-size",
      "1024",
      "--flatten",
      "false",
      "--join",
      "false",
      "--instance",
      "false",
      "--palette",
      "false",
      "--simplify",
      "true",
      "--simplify-ratio",
      "0.2",
      "--simplify-error",
      "0.002",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_OPTIONS: "--max-old-space-size=8192",
      },
    },
  );
  if (result.status !== 0) {
    console.error("optimize failed", file, result.status);
    process.exit(result.status ?? 1);
  }
}
