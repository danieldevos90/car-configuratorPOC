"""Export Gelände Werke kit meshes aligned to the OEM G550 coordinate system.

G550 and Retro reuse many node names — never import both into one Blender scene
(Blender merges objects by name and breaks coordinates). Alignment is measured
from mesh bounding-box centers with each GLB loaded alone, then applied when
exporting kits from the Retro file only.

Usage:

  blender -b --python scripts/build-modular-vehicle.py -- \\
    public/models/source/MB-G550-original-model.glb \\
    public/models/source/WIP-gelande-werke-RETRO.glb \\
    public/models/source/GW-gelande-kits.glb
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy
from mathutils import Vector

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
KIT_ALIGN_REFERENCE = "Kit_Align_Reference"

OEM_MESH_ANCHORS = ("Body", "WheelFrLeft")
RETRO_MESH_ANCHORS = ("Body", "Mercedes-base-model", "WheelFrLeft")


def _args_after_double_dash() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mesh_bbox_center(obj: bpy.types.Object) -> Vector:
    deps = bpy.context.evaluated_depsgraph_get()
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    found = False

    def walk(node: bpy.types.Object) -> None:
        nonlocal found, mins, maxs
        if node.type == "MESH":
            ev = node.evaluated_get(deps)
            for corner in ev.bound_box:
                world = ev.matrix_world @ Vector(corner)
                mins.x = min(mins.x, world.x)
                mins.y = min(mins.y, world.y)
                mins.z = min(mins.z, world.z)
                maxs.x = max(maxs.x, world.x)
                maxs.y = max(maxs.y, world.y)
                maxs.z = max(maxs.z, world.z)
                found = True
        for child in node.children:
            walk(child)

    walk(obj)
    if not found:
        raise RuntimeError(f"No mesh geometry under {obj.name}")
    return (mins + maxs) / 2


def mesh_anchor_center(names: tuple[str, ...]) -> Vector:
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        return mesh_bbox_center(obj)
    raise RuntimeError(f"No mesh anchor found among {names}")


def alignment_delta_oem_to_retro(oem_path: Path, retro_path: Path) -> Vector:
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(oem_path.resolve()))
    oem_center = mesh_anchor_center(OEM_MESH_ANCHORS)

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(retro_path.resolve()))
    retro_center = mesh_anchor_center(RETRO_MESH_ANCHORS)

    return oem_center - retro_center


def create_align_reference() -> bpy.types.Object | None:
    body = bpy.data.objects.get("Body")
    if body is None:
        return None
    center = mesh_bbox_center(body)
    empty = bpy.data.objects.new(KIT_ALIGN_REFERENCE, None)
    bpy.context.scene.collection.objects.link(empty)
    empty.matrix_world.translation = center

    # Tiny mesh so gltf-transform optimize keeps this node in the web GLB.
    mesh = bpy.data.meshes.new("Kit_Align_Mesh")
    mesh.from_pydata([(0.0, 0.0, 0.0)], [], [])
    mesh.update()
    marker = bpy.data.objects.new("Kit_Align_Mesh", mesh)
    bpy.context.scene.collection.objects.link(marker)
    marker.parent = empty
    marker.location = (0.0, 0.0, 0.0)
    marker.hide_render = True
    marker.hide_viewport = True
    return empty


def collect_keep_objects(align_ref: bpy.types.Object | None) -> set[bpy.types.Object]:
    keep: set[bpy.types.Object] = set()
    if align_ref is not None:
        keep.add(align_ref)
        for child in align_ref.children_recursive:
            keep.add(child)
    for obj in bpy.data.objects:
        if obj.name not in KIT_ROOT_NAMES:
            continue
        keep.add(obj)
        for child in obj.children_recursive:
            keep.add(child)
    return keep


def prune_to_kits(alignment_delta: Vector, align_ref: bpy.types.Object | None) -> None:
    keep = collect_keep_objects(align_ref)
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
    root.location = alignment_delta

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
    oem = Path(
        argv[0]
        if len(argv) > 0
        else repo / "public/models/source/MB-G550-original-model.glb",
    )
    retro = Path(
        argv[1]
        if len(argv) > 1
        else repo / "public/models/source/WIP-gelande-werke-RETRO.glb",
    )
    out = Path(
        argv[2]
        if len(argv) > 2
        else repo / "public/models/source/GW-gelande-kits.glb",
    )

    if not oem.is_file():
        raise SystemExit(f"OEM GLB not found: {oem}")
    if not retro.is_file():
        raise SystemExit(f"Retro GLB not found: {retro}")

    alignment_delta = alignment_delta_oem_to_retro(oem, retro)
    print(
        "kit alignment delta (mesh bbox):",
        f"{alignment_delta.x:.4f}",
        f"{alignment_delta.y:.4f}",
        f"{alignment_delta.z:.4f}",
    )

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(retro.resolve()))
    align_ref = create_align_reference()
    prune_to_kits(alignment_delta, align_ref)
    export_glb(out.resolve())


if __name__ == "__main__":
    main()
