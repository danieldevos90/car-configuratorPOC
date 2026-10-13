#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OEM="${1:-$ROOT/public/models/source/MB-G550-original-model.glb}"
RETRO="${2:-$ROOT/public/models/source/WIP-gelande-werke-RETRO.glb}"
OUT="${3:-$ROOT/public/models/source/GW-G550-configurator-master.glb}"

if ! command -v blender >/dev/null 2>&1; then
  echo "blender not found in PATH" >&2
  exit 1
fi

echo "Building master GLB (this can take several minutes and needs ~16GB+ RAM)…"
blender -b --python "$ROOT/scripts/build-master-vehicle.py" -- "$OEM" "$RETRO" "$OUT"

echo "Run: npm run optimize:glb  (after adding master to optimize-glb.mjs if needed)"
