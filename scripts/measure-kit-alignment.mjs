import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const repo = join(import.meta.dirname, "..");

async function loadGlb(path) {
  const buf = await readFile(path);
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(buf.buffer, "", resolve, reject);
  });
}

function centerOf(name, root) {
  const obj = root.getObjectByName(name);
  if (!obj) return null;
  return new Box3().setFromObject(obj).getCenter(new Vector3());
}

function flWheelFromNewWheels(root) {
  const wheels = root.getObjectByName("New-wheels");
  if (!wheels) return null;
  const meshes = [];
  wheels.traverse((c) => {
    if (c.isMesh) meshes.push(c);
  });
  if (!meshes.length) return centerOf("New-wheels", root);
  let best = null;
  let bestScore = Infinity;
  for (const m of meshes) {
    const c = new Box3().setFromObject(m).getCenter(new Vector3());
    const score = c.x + c.z;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

const basePath = join(repo, "public/models/source/MB-G550-original-model.glb");
const retroPath = join(repo, "public/models/source/WIP-gelande-werke-RETRO.glb");
const kitPath = join(repo, "glb/GW-gelande-kits.glb");

const [base, retro, kit] = await Promise.all([
  loadGlb(basePath),
  loadGlb(retroPath),
  loadGlb(kitPath),
]);

const names = [
  "WheelFrLeft",
  "Body",
  "Front-bumper-v4",
  "New-wheels",
  "Gelande_Kits_Root",
];

console.log("--- anchor centers (world, scene at origin) ---");
for (const n of names) {
  console.log(
    n,
    "base:",
    centerOf(n, base.scene)?.toArray().map((v) => v.toFixed(3)),
    "retro:",
    centerOf(n, retro.scene)?.toArray().map((v) => v.toFixed(3)),
    "kit:",
    centerOf(n, kit.scene)?.toArray().map((v) => v.toFixed(3)),
  );
}

const bWheel = centerOf("WheelFrLeft", base.scene);
const rWheel = centerOf("WheelFrLeft", retro.scene);
const kWheel = flWheelFromNewWheels(kit.scene);
const bBumper = centerOf("Front-bumper-v4", base.scene);
const kBumper = centerOf("Front-bumper-v4", kit.scene);

console.log("\n--- suggested deltas (add to kit.position) ---");
if (bWheel && kWheel) {
  const d = bWheel.clone().sub(kWheel);
  console.log("base WheelFrLeft - kit FL wheel:", d.toArray().map((v) => v.toFixed(4)));
}
if (bWheel && kBumper) {
  const d = bWheel.clone().sub(kBumper);
  console.log("base WheelFrLeft - kit bumper (wrong semantic):", d.toArray().map((v) => v.toFixed(4)));
}
if (bWheel && rWheel) {
  console.log("base wheel - retro wheel:", bWheel.clone().sub(rWheel).toArray().map((v) => v.toFixed(4)));
}

const kitRoot = kit.scene.getObjectByName("Gelande_Kits_Root");
if (kitRoot) {
  console.log("\nGelande_Kits_Root position:", kitRoot.position.toArray());
  console.log("Gelande_Kits_Root world pos:", kitRoot.getWorldPosition(new Vector3()).toArray());
}
