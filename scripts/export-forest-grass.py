"""Export Forest Pine grass cards with albedo, opacity, and normals packed for glTF."""

import bpy
import numpy as np

BLEND = "glb/Forest Pine/Road.blend"
OUT = "/tmp/forest-pine-grass.glb"

bpy.ops.wm.open_mainfile(filepath=BLEND)


def stats(image):
    w, h = image.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(buf)
    rgb = buf.reshape(-1, 4)
    return {
        "size": (w, h),
        "rgb_min": rgb[:, :3].min(axis=0).round(3).tolist(),
        "rgb_max": rgb[:, :3].max(axis=0).round(3).tolist(),
        "a_min": float(rgb[:, 3].min()),
        "a_max": float(rgb[:, 3].max()),
        "r_mean": float(rgb[:, 0].mean()),
    }


def as_noncolor(image):
    image.colorspace_settings.name = "Non-Color"
    return image


def pack_alpha(color_image, opacity_image, name):
    as_noncolor(opacity_image)
    w, h = color_image.size
    color = np.empty(w * h * 4, dtype=np.float32)
    color_image.pixels.foreach_get(color)
    opacity = np.empty(opacity_image.size[0] * opacity_image.size[1] * 4, dtype=np.float32)
    opacity_image.pixels.foreach_get(opacity)
    if opacity_image.size[0] != w or opacity_image.size[1] != h:
        raise RuntimeError(f"{name} size mismatch")
    # Opacity cards store the mask in RGB. Use the brightest channel.
    mask = opacity.reshape(-1, 4)[:, :3].max(axis=1)
    packed = color.reshape(-1, 4).copy()
    packed[:, 3] = mask
    image = bpy.data.images.new(name, w, h, alpha=True, float_buffer=False)
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(packed.reshape(-1))
    image.pack()
    return image


def wire(material, albedo, normal, roughness):
    material.use_nodes = True
    material.blend_method = "CLIP"
    material.alpha_threshold = 0.35
    material.use_backface_culling = False
    tree = material.node_tree
    tree.nodes.clear()
    output = tree.nodes.new("ShaderNodeOutputMaterial")
    bsdf = tree.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0.0
    color_tex = tree.nodes.new("ShaderNodeTexImage")
    color_tex.image = albedo
    color_tex.interpolation = "Smart"
    normal_tex = tree.nodes.new("ShaderNodeTexImage")
    normal_tex.image = as_noncolor(normal)
    normal_tex.interpolation = "Smart"
    normal_map = tree.nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = 0.6
    uv = tree.nodes.new("ShaderNodeTexCoord")
    tree.links.new(uv.outputs["UV"], color_tex.inputs["Vector"])
    tree.links.new(uv.outputs["UV"], normal_tex.inputs["Vector"])
    tree.links.new(color_tex.outputs["Color"], bsdf.inputs["Base Color"])
    tree.links.new(color_tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    tree.links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
    tree.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])


for image_name in (
    "Grass_Clumps_B_Opacity.png.001",
    "Grass_Clumps_C_3.png.001",
    "WheatGrass_Clump_Opacity.png",
):
    print("OPACITY", image_name, stats(bpy.data.images[image_name]))

grass_a = pack_alpha(
    bpy.data.images["Grass_Clumps_B.png.001"],
    bpy.data.images["Grass_Clumps_B_Opacity.png.001"],
    "Grass_A_Albedo",
)
grass_c = pack_alpha(
    bpy.data.images["Grass_Clumps_C_2.png.001"],
    bpy.data.images["Grass_Clumps_C_3.png.001"],
    "Grass_C_Albedo",
)
wheat = pack_alpha(
    bpy.data.images["WheatGrass_Clump_Diffuse.png"],
    bpy.data.images["WheatGrass_Clump_Opacity.png"],
    "Wheat_Albedo",
)

wire(bpy.data.materials["Grass_A"], grass_a, bpy.data.images["Grass_Clumps_B_Normal.png.001"], 0.5)
wire(bpy.data.materials["Grass_C"], grass_c, bpy.data.images["Grass_Clumps_C_Normal.png.001"], 0.7)
wire(
    bpy.data.materials["WheatGrass_Low"],
    wheat,
    bpy.data.images["WheatGrass_Clump_Normal.png"],
    0.55,
)

for mesh_name in ("Leaves", "Leaves.002", "Leaves.004"):
    mesh = bpy.data.meshes[mesh_name]
    mesh.uv_layers["uv0"].active = True
    mesh.uv_layers["uv0"].active_render = True

bpy.ops.object.select_all(action="DESELECT")
selected = 0
for obj in bpy.context.view_layer.objects:
    if obj.type != "MESH":
        continue
    if "Grass" not in obj.name and "Wheat" not in obj.name:
        continue
    obj.hide_set(False)
    obj.select_set(True)
    selected += 1

print("selected", selected)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    use_selection=True,
    export_format="GLB",
    export_yup=True,
    export_apply=False,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
)
print("wrote", OUT)
