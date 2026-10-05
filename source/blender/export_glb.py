"""Export the canonical bottle (same build_bottle() as every render) to GLB for the web viewer.
Materials are replaced in three.js; mesh names are the contract: GlassBody, Liquid, BrassRing, Cap, FrontPrint.
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import obsidian_scene as O  # noqa: E402

out = sys.argv[-1]
O.reset()
root = O.build_bottle("50")
for ob in bpy.data.objects:
    ob.select_set(ob.type == "MESH")
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_materials="PLACEHOLDER",
    export_texcoords=True,
    export_normals=True,
    export_draco_mesh_compression_enable=False,
)
print("exported", out)
