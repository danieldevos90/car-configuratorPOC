"""Print world-space bbox centers for alignment debugging."""

from __future__ import annotations

from pathlib import Path

import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[1]
BASE = REPO / "public/models/source/MB-G550-original-model.glb"
RETRO = REPO / "public/models/source/WIP-gelande-werke-RETRO.glb"
KIT = REPO / "glb/GW-gelande-kits.glb"


def reset() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def bbox_center_world(obj_name: str) -> Vector | None:
    obj = bpy.data.objects.get(obj_name)
    if obj is None:
        return None
    deps = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(deps)
    corners = [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    return sum(corners, Vector()) / 8


def anchor_translation(names: tuple[str, ...]) -> Vector | None:
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            return obj.matrix_world.translation.copy()
    return None


def report(label: str, path: Path, names: list[str]) -> None:
    reset()
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    print(f"\n=== {label} ({path.name}) ===")
    for name in names:
        t = anchor_translation((name,))
        c = bbox_center_world(name)
        print(
            f"  {name}:",
            f"empty={t}" if t else "empty=—",
            f"bbox={c}" if c else "bbox=—",
        )


NAMES = [
    "WheelFrLeft",
    "Body",
    "Mercedes-base-model",
    "Front-bumper-v4",
    "New-wheels",
    "Gelande_Kits_Root",
]

report("G550", BASE, NAMES)

reset()
bpy.ops.import_scene.gltf(filepath=str(BASE.resolve()))
g550_wheel = bbox_center_world("WheelFrLeft")
g550_body = bbox_center_world("Body")

reset()
bpy.ops.import_scene.gltf(filepath=str(RETRO.resolve()))
retro_wheel = bbox_center_world("WheelFrLeft")
retro_bumper = bbox_center_world("Front-bumper-v4")

print("\n=== Combined G550 + Retro (both loaded) ===")
reset()
bpy.ops.import_scene.gltf(filepath=str(BASE.resolve()))
bpy.ops.import_scene.gltf(filepath=str(RETRO.resolve()))
g550_w = bbox_center_world("WheelFrLeft")
retro_w = bbox_center_world("WheelFrLeft")
retro_b = bbox_center_world("Front-bumper-v4")
g550_b = bbox_center_world("Body")
if g550_w and retro_b:
    print("  delta g550_wheel - retro_bumper:", g550_w - retro_b)
if g550_w and retro_w:
    print("  delta g550_wheel - retro_wheel:", g550_w - retro_w)
if g550_b and retro_b:
    print("  delta g550_body bbox - retro_bumper:", g550_b - retro_b)

report("Kit export", KIT, NAMES)

reset()
bpy.ops.import_scene.gltf(filepath=str(BASE.resolve()))
bpy.ops.import_scene.gltf(filepath=str(KIT.resolve()))
kw = bbox_center_world("WheelFrLeft")
kb = bbox_center_world("Front-bumper-v4")
kit_w = bbox_center_world("New-wheels")
if g550_wheel and kb:
    print("\n=== Base + kit GLB ===")
    gw = bbox_center_world("WheelFrLeft")
    print("  delta base_wheel - kit_bumper:", gw - kb)
if gw and kit_w:
    print("  delta base_wheel - kit_new-wheels bbox:", gw - kit_w)
