/**
 * Lossless shrink of a source GLB:
 * identical buffer views are stored once, and index lists that fit in
 * 16 bits are rewritten from uint32. Vertices and PNG bytes stay the same.
 *
 * Usage: node scripts/compact-source-glb.mjs [file.glb ...]
 */
import { createHash } from "node:crypto";
import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function readGlb(path) {
  const file = readFileSync(path);
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString("utf8"));
  const binStart = 20 + jsonLength + 8;
  return { json, bin: file.subarray(binStart) };
}

function sha1(bytes) {
  return createHash("sha1").update(bytes).digest("hex");
}

function viewBytes(bin, view) {
  const start = view.byteOffset ?? 0;
  return bin.subarray(start, start + view.byteLength);
}

function align4(n) {
  return (n + 3) & ~3;
}

function fingerprint(json, bin) {
  const views = json.bufferViews ?? [];
  const accessors = json.accessors ?? [];
  const parts = [];

  const attributeBytes = (accessorIndex) => {
    const accessor = accessors[accessorIndex];
    const view = views[accessor.bufferView];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    return bin.subarray(start, start + view.byteLength - (accessor.byteOffset ?? 0));
  };

  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      const attributes = Object.keys(prim.attributes ?? {}).sort();
      for (const semantic of attributes) {
        parts.push(semantic + ":" + sha1(attributeBytes(prim.attributes[semantic])));
      }
      if (prim.indices != null) {
        const accessor = accessors[prim.indices];
        const view = views[accessor.bufferView];
        const start =
          (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        const raw = new Uint8Array(
          bin.subarray(start, start + accessor.count * accessorByte(accessor)),
        );
        const asUint32 = new Uint32Array(accessor.count);
        if (accessor.componentType === 5125) {
          asUint32.set(new Uint32Array(raw.buffer, raw.byteOffset, accessor.count));
        } else if (accessor.componentType === 5123) {
          const src = new Uint16Array(raw.buffer, raw.byteOffset, accessor.count);
          for (let i = 0; i < src.length; i++) asUint32[i] = src[i];
        } else {
          throw new Error(`unexpected index component ${accessor.componentType}`);
        }
        parts.push("INDEX:" + sha1(Buffer.from(asUint32.buffer)));
      }
      parts.push("MAT:" + (prim.material ?? ""));
    }
  }

  const imageHash = (image) => {
    if (image.bufferView == null) return image.uri ?? "";
    return sha1(viewBytes(bin, views[image.bufferView]));
  };
  const textureHash = (index) => imageHash(json.images[json.textures[index].source]);

  const materialDump = JSON.stringify(json.materials ?? [], (_key, value) => {
    if (value && typeof value === "object" && typeof value.index === "number" && value.texCoord !== undefined) {
      return { ...value, index: textureHash(value.index) };
    }
    return value;
  });
  parts.push("MATERIALS:" + sha1(materialDump));
  parts.push("NODES:" + (json.nodes ?? []).map((node) => node.name ?? "").join("\n"));
  return sha1(parts.join("\n"));
}

function accessorByte(accessor) {
  const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
  if (!size) throw new Error(`unsupported component ${accessor.componentType}`);
  return size;
}

function compact(json, bin) {
  const views = json.bufferViews ?? [];
  const accessors = json.accessors ?? [];
  const payloads = views.map((view) => Buffer.from(viewBytes(bin, view)));

  const viewUsers = new Array(views.length).fill(0);
  for (const accessor of accessors) {
    if (accessor.bufferView != null) viewUsers[accessor.bufferView] += 1;
  }
  for (const image of json.images ?? []) {
    if (image.bufferView != null) viewUsers[image.bufferView] += 1;
  }

  const vertexCount = new Map();
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      if (prim.indices == null) continue;
      const count = accessors[prim.attributes?.POSITION]?.count ?? Infinity;
      vertexCount.set(prim.indices, Math.max(vertexCount.get(prim.indices) ?? 0, count));
    }
  }

  let narrowed = 0;
  for (let accessorIndex = 0; accessorIndex < accessors.length; accessorIndex++) {
    const accessor = accessors[accessorIndex];
    if (accessor.componentType !== 5125 || accessor.type !== "SCALAR") continue;
    if (accessor.sparse || accessor.byteOffset) continue;
    const viewIndex = accessor.bufferView;
    if (viewIndex == null || viewUsers[viewIndex] !== 1) continue;
    const view = views[viewIndex];
    if (view.byteStride) continue;
    if ((vertexCount.get(accessorIndex) ?? Infinity) > 65535) continue;
    if (view.byteLength !== accessor.count * 4) continue;

    const aligned = new Uint8Array(payloads[viewIndex]);
    const src = new Uint32Array(aligned.buffer);
    let max = 0;
    for (let i = 0; i < src.length; i++) if (src[i] > max) max = src[i];
    if (max > 65535) continue;

    const dst = Buffer.alloc(accessor.count * 2);
    const out = new Uint16Array(dst.buffer, dst.byteOffset, accessor.count);
    for (let i = 0; i < src.length; i++) out[i] = src[i];
    payloads[viewIndex] = dst;
    view.byteLength = dst.length;
    accessor.componentType = 5123;
    narrowed += 1;
  }

  const remap = new Array(views.length);
  const packedViews = [];
  const packedPayloads = [];
  const seen = new Map();
  for (let i = 0; i < views.length; i++) {
    const key = [
      sha1(payloads[i]),
      views[i].byteStride ?? 0,
      views[i].target ?? 0,
    ].join(":");
    const existing = seen.get(key);
    if (existing != null) {
      remap[i] = existing;
      continue;
    }
    remap[i] = packedViews.length;
    seen.set(key, remap[i]);
    const next = { ...views[i], byteLength: payloads[i].length };
    delete next.byteOffset;
    packedViews.push(next);
    packedPayloads.push(payloads[i]);
  }

  let cursor = 0;
  const chunks = [];
  for (let i = 0; i < packedViews.length; i++) {
    cursor = align4(cursor);
    packedViews[i].byteOffset = cursor;
    chunks.push(packedPayloads[i]);
    cursor += packedPayloads[i].length;
  }
  const binOut = Buffer.alloc(align4(cursor));
  cursor = 0;
  for (let i = 0; i < packedViews.length; i++) {
    cursor = packedViews[i].byteOffset;
    packedPayloads[i].copy(binOut, cursor);
  }

  for (const accessor of accessors) {
    if (accessor.bufferView != null) accessor.bufferView = remap[accessor.bufferView];
  }
  for (const image of json.images ?? []) {
    if (image.bufferView != null) image.bufferView = remap[image.bufferView];
  }

  const imageRemap = [];
  const images = [];
  const imageSeen = new Map();
  for (let i = 0; i < (json.images ?? []).length; i++) {
    const image = json.images[i];
    const key = `${image.mimeType ?? ""}:${image.bufferView}`;
    const existing = imageSeen.get(key);
    if (existing != null) {
      imageRemap[i] = existing;
      continue;
    }
    imageRemap[i] = images.length;
    imageSeen.set(key, imageRemap[i]);
    images.push(image);
  }
  for (const texture of json.textures ?? []) {
    if (texture.source != null) texture.source = imageRemap[texture.source];
  }

  json.bufferViews = packedViews;
  json.images = images;
  json.buffers[0].byteLength = binOut.length;
  return { json, bin: binOut, narrowed, viewsIn: views.length, viewsOut: packedViews.length, imagesOut: images.length };
}

function writeGlb(path, json, bin) {
  const jsonText = JSON.stringify(json);
  const jsonPadded = align4(Buffer.byteLength(jsonText));
  const jsonChunk = Buffer.alloc(jsonPadded, 0x20);
  jsonChunk.write(jsonText);
  const binPadded = align4(bin.length);
  const binChunk = Buffer.alloc(binPadded);
  bin.copy(binChunk);

  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const file = Buffer.alloc(total);
  file.writeUInt32LE(0x46546c67, 0);
  file.writeUInt32LE(2, 4);
  file.writeUInt32LE(total, 8);
  file.writeUInt32LE(jsonChunk.length, 12);
  file.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(file, 20);
  const binHeader = 20 + jsonChunk.length;
  file.writeUInt32LE(binChunk.length, binHeader);
  file.writeUInt32LE(0x004e4942, binHeader + 4);
  binChunk.copy(file, binHeader + 8);
  writeFileSync(path, file);
}

function overlaps(views) {
  const spans = views
    .map((view) => [view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength])
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i++) {
    if (spans[i][0] < spans[i - 1][1]) return true;
  }
  return false;
}

const files = process.argv.slice(2);
if (files.length === 0) files.push(join(root, "glb/WIP-gelande-werke-RETRO.glb"));

for (const input of files) {
  const beforeStat = statSync(input);
  const { json, bin } = readGlb(input);
  if ((json.buffers ?? []).length !== 1) throw new Error(`${input}: expected one buffer`);
  if (overlaps(json.bufferViews ?? [])) throw new Error(`${input}: overlapping buffer views`);

  const before = fingerprint(json, bin);
  const result = compact(structuredClone(json), bin);
  const after = fingerprint(result.json, result.bin);
  if (before !== after) throw new Error(`${input}: geometry or texture fingerprint changed`);

  const output = join(dirname(input), `.${basename(input)}.compact`);
  writeGlb(output, result.json, result.bin);
  const reread = readGlb(output);
  if (fingerprint(reread.json, reread.bin) !== before) {
    throw new Error(`${input}: written file does not match`);
  }
  renameSync(output, input);
  const afterStat = statSync(input);
  const saved = (beforeStat.size - afterStat.size) / 1024 / 1024;
  console.log(
    `${basename(input)}: ${(beforeStat.size / 1024 / 1024).toFixed(1)} MB → ${(afterStat.size / 1024 / 1024).toFixed(1)} MB (−${saved.toFixed(1)} MB), indices narrowed ${result.narrowed}, buffer views ${result.viewsIn} → ${result.viewsOut}, images ${result.imagesOut}`,
  );
}
