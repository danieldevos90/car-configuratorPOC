"""Combine OEM G550 + Retro restomod into one configurator master GLB.

Each build lives under a root empty (Build_OEM / Build_Retro). The runtime
toggles visibility on those roots — only one preset should be visible at a time.

Usage (from repo root):

  blender -b --python scripts/build-master-vehicle.py -- \\
    public/models/source/MB-G550-original-model.glb \\
    public/models/source/WIP-gelande-werke-RETRO.glb \\
    public/models/source/GW-G550-configurator-master.glb

Then: npm run optimize:glb  (adds web export) and bump WEB_MODEL_REV.
"""

from __future__ import annotations

import sys
from pathlib import Path

import bpy

ROOT_EMPTY_OEM = "Build_OEM"
ROOT_EMPTY_RETRO = "Build_Retro"
COLLECTION_OEM = "Configurator_OEM"
COLLECTION_RETRO = "Configurator_Retro"


def _args_after_double_dash() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for coll in list(bpy.data.collections):
        if coll.name != "Collection":
            bpy.data.collections.remove(coll)


def link_collection(parent: bpy.types.Collection, child: bpy.types.Collection) -> None:
    if child.name not in parent.children:
        parent.children.link(child)


def import_glb_under_root(
    filepath: Path,
    collection_name: str,
    root_empty_name: str,
) -> bpy.types.Object:
    scene_coll = bpy.context.scene.collection
    import_coll = bpy.data.collections.new(collection_name)
    link_collection(scene_coll, import_coll)

    before = {obj.name for obj in bpy.data.objects}

    with bpy.context.temp_override(
        scene=bpy.context.scene,
        collection=import_coll,
        view_layer=bpy.context.view_layer,
    ):
        bpy.ops.import_scene.gltf(filepath=str(filepath))

    imported = [obj for obj in bpy.data.objects if obj.name not in before]
    if not imported:
        raise RuntimeError(f"No objects imported from {filepath}")

    root_empty = bpy.data.objects.new(root_empty_name, None)
    import_coll.objects.link(root_empty)

    imported_set = set(imported)
    for obj in imported:
        if obj.parent is None or obj.parent not in imported_set:
            obj.parent = root_empty
            obj.matrix_parent_inverse = root_empty.matrix_world.inverted()

    # Hide OEM by default; Retro is the primary Gelände Werke build.
    if root_empty_name == ROOT_EMPTY_OEM:
        root_empty.hide_viewport = True
        root_empty.hide_render = True

    print(
        f"imported {filepath.name}: {len(imported)} objects under {root_empty_name}",
    )
    return root_empty


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
        export_image_format="AUTO",
        use_mesh_edges=False,
        use_mesh_vertices=False,
    )
    print(f"exported {filepath}")


def main() -> None:
    argv = _args_after_double_dash()
    repo = Path(__file__).resolve().parents[1]
    oem = Path(
        argv[0] if len(argv) > 0 else repo / "public/models/source/MB-G550-original-model.glb",
    )
    retro = Path(
        argv[1]
        if len(argv) > 1
        else repo / "public/models/source/WIP-gelande-werke-RETRO.glb",
    )
    out = Path(
        argv[2]
        if len(argv) > 2
        else repo / "public/models/source/GW-G550-configurator-master.glb",
    )

    if not oem.is_file():
        raise SystemExit(f"OEM GLB not found: {oem}")
    if not retro.is_file():
        raise SystemExit(f"Retro GLB not found: {retro}")

    reset_scene()
    import_glb_under_root(oem.resolve(), COLLECTION_OEM, ROOT_EMPTY_OEM)
    import_glb_under_root(retro.resolve(), COLLECTION_RETRO, ROOT_EMPTY_RETRO)
    export_glb(out.resolve())


if __name__ == "__main__":
    main()
