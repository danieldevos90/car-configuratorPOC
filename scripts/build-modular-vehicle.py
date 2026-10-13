"""Export Gelände Werke kit meshes only (no duplicate OEM body).

The OEM G550 stays the default base GLB (existing MB-G550-original-model).
This script pulls optional exterior parts from the Retro WIP file.

Usage:

  blender -b --python scripts/build-modular-vehicle.py -- \\
    public/models/source/WIP-gelande-werke-RETRO.glb \\
    public/models/source/GW-gelande-kits.glb

Kit node list must match src/config/gelande-kit-parts.ts.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy

# Keep in sync with GELANDE_KIT_NODE_NAMES in gelande-kit-parts.ts
KIT_ROOT_NAMES = {
    "Roof-rack",
    "Roof-plates",
    "Ladder",
    "Tube",
    "Bracket",
    "Front-bumper-v4",
    "Skidplate-v1",
    "Side-step-v4",
    "Front-fender-add-on-v3",
    "Grill-face",
    "Grille-new",
    "Front-grille",
    "Star",
    "Frame",
    "Bonnet-grill v2",
    "New-wheels",
    "Wheel-cover-rear",
}

KIT_COLLECTION = "Gelande_Kits"
KIT_ROOT_EMPTY = "Gelande_Kits_Root"


def _args_after_double_dash() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def collect_keep_objects() -> set[bpy.types.Object]:
    keep: set[bpy.types.Object] = set()
    for obj in bpy.data.objects:
        if obj.name not in KIT_ROOT_NAMES:
            continue
        keep.add(obj)
        for child in obj.children_recursive:
            keep.add(child)
    return keep


def prune_to_kits() -> None:
    keep = collect_keep_objects()
    if not keep:
        raise RuntimeError("No kit objects found — check KIT_ROOT_NAMES vs Retro GLB")

    for obj in list(bpy.data.objects):
        if obj in keep:
            continue
        bpy.data.objects.remove(obj, do_unlink=True)

    scene_coll = bpy.context.scene.collection
    kit_coll = bpy.data.collections.new(KIT_COLLECTION)
    scene_coll.children.link(kit_coll)

    root = bpy.data.objects.new(KIT_ROOT_EMPTY, None)
    kit_coll.objects.link(root)

    for obj in list(bpy.data.objects):
        if obj == root or obj.type == "CAMERA":
            continue
        if obj.parent is None:
            obj.parent = root


def export_glb(filepath: Path) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        export_apply=False,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    print(f"exported {filepath}")


def main() -> None:
    argv = _args_after_double_dash()
    repo = Path(__file__).resolve().parents[1]
    retro = Path(
        argv[0]
        if len(argv) > 0
        else repo / "public/models/source/WIP-gelande-werke-RETRO.glb",
    )
    out = Path(
        argv[1]
        if len(argv) > 1
        else repo / "public/models/source/GW-gelande-kits.glb",
    )

    if not retro.is_file():
        raise SystemExit(f"Retro GLB not found: {retro}")

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(retro.resolve()))
    prune_to_kits()
    export_glb(out.resolve())


if __name__ == "__main__":
    main()
