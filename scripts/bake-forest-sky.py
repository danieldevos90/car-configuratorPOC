"""Bake the Forest Pine Road.blend world (Nishita sky) to an equirectangular HDR.

blender -b "glb/Forest Pine/Road.blend" --python scripts/bake-forest-sky.py -- public/sky/forest-pine-sky.hdr
"""

import math
import sys

import bpy

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 16
scene.cycles.use_denoising = False
for obj in scene.objects:
    obj.hide_render = obj.type != "CAMERA"

camera = bpy.data.objects.new("Pano", bpy.data.cameras.new("Pano"))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = "PANO"
if hasattr(camera.data, "panorama_type"):
    camera.data.panorama_type = "EQUIRECTANGULAR"
else:
    camera.data.cycles.panorama_type = "EQUIRECTANGULAR"
# Horizontal along +Y, Z up, so the horizon sits on the middle row.
camera.location = (0, 0, 1.5)
camera.rotation_euler = (math.pi / 2, 0, 0)

scene.render.resolution_x = 2048
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "HDR"
scene.render.filepath = sys.argv[-1]
bpy.ops.render.render(write_still=True)
