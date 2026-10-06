"""OBSIDIAN No. 01 — canonical bottle, studio and shot library (Blender 4.2 / Cycles).

All product imagery for the site is rendered from this one file so the bottle
identity never drifts. Run with the bpy venv:

    /opt/bpyenv/bin/python source/blender/obsidian_scene.py --shot hero_desktop --out out.png
    /opt/bpyenv/bin/python source/blender/obsidian_scene.py --shot hero_loop --frames 0:144 --out dir/

Normalised geometry (1 unit = body width):
    body 1.00 w x 0.55 d x 1.45 h, corner radius 0.08
    neck 0.10 h, cap 0.35 h (incl. brass ring), cap diameter 0.45  -> total 1.90
"""
import argparse
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TEX = os.path.join(ROOT, "source", "textures")

# ---------------------------------------------------------------- geometry
BODY_W, BODY_D, BODY_H, CORNER = 1.00, 0.55, 1.45, 0.08
NECK_R, NECK_H = 0.13, 0.10
CAP_R, CAP_H, RING_H = 0.225, 0.35, 0.022
WALL, BASE_T, TOP_T, FILL = 0.05, 0.20, 0.07, 0.93
BOTTLE_CENTER_Z = 0.95  # visual centre of the 1.90 tall object


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def rounded_box(name, w, d, h, r, z0=0.0, segments=10):
    """Box with rounded vertical + horizontal edges, base at z0."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, z0 + h / 2))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    mod = ob.modifiers.new("bevel", "BEVEL")
    mod.width = r
    mod.segments = segments
    mod.limit_method = "NONE"
    mod.profile = 0.5
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob


def apply_bool(target, cutter, op):
    mod = target.modifiers.new("bool", "BOOLEAN")
    mod.operation = op
    mod.solver = "EXACT"
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def cylinder(name, r, h, z0, verts=128):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=(0, 0, z0 + h / 2))
    ob = bpy.context.active_object
    ob.name = name
    return ob


def smooth(ob, angle=35):
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    ob.select_set(False)


# ---------------------------------------------------------------- materials
def node_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def mat_glass():
    m, nt, out = node_mat("SmokedGlass")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.015
    b.inputs["IOR"].default_value = 1.52
    # subtle manufacturing waviness so reflections are not CG-perfect
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 2.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.005
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (0.42, 0.31, 0.22, 1)  # smoke with warm cast
    vol.inputs["Density"].default_value = 13.0
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    return m


def mat_liquid():
    m, nt, out = node_mat("AmberLiquid")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.0
    b.inputs["IOR"].default_value = 1.36
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption")
    vol.inputs["Color"].default_value = (0.62, 0.30, 0.07, 1)
    vol.inputs["Density"].default_value = 11.0
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
    return m


def mat_cap():
    m, nt, out = node_mat("SatinBlack")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.006, 0.006, 0.007, 1)
    b.inputs["Roughness"].default_value = 0.36
    b.inputs["Specular IOR Level"].default_value = 0.30
    b.inputs["Coat Weight"].default_value = 0.0
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 900.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.04
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def mat_brass():
    m, nt, out = node_mat("WarmBrass")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.78, 0.58, 0.34, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.24
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def mat_metal_dark():
    m, nt, out = node_mat("DarkMetal")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.05, 0.045, 0.04, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.32
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def mat_droplet():
    m, nt, out = node_mat("Droplet")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (1.0, 0.78, 0.5, 1)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.0
    b.inputs["IOR"].default_value = 1.36
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def mat_print(size_ml):
    m, nt, out = node_mat(f"Print{size_ml}")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(TEX, f"label_{size_ml}ml.png"))
    tex.interpolation = "Cubic"
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = 0.55
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], mix.inputs["Fac"])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[1])
    nt.links.new(b.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    m.blend_method = "HASHED"
    return m


def mat_surface(name, color, rough, spec=0.5):
    m, nt, out = node_mat(name)
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = spec
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


def mat_floor(color, rough):
    """Dark studio floor whose colour and reflectivity fall off radially -> no horizon."""
    m, nt, out = node_mat("Floor")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.28
    blk = nt.nodes.new("ShaderNodeBsdfDiffuse")
    blk.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    ln = nt.nodes.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    nt.links.new(tc.outputs["Object"], ln.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.interpolation_type = "SMOOTHSTEP"
    mr.inputs["From Min"].default_value = 2.5
    mr.inputs["From Max"].default_value = 9.0
    nt.links.new(ln.outputs["Value"], mr.inputs["Value"])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mr.outputs["Result"], mix.inputs["Fac"])
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(blk.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


def sweep_mesh(back=5.5, radius=4.0, width=90.0, front=-40.0, top=30.0):
    """Seamless photographic cyc: flat floor that curves up into a back wall (no horizon)."""
    prof = [(front, 0.0), (back, 0.0)]
    for i in range(1, 25):
        a = math.radians(90 * i / 24)
        prof.append((back + math.sin(a) * radius, radius - math.cos(a) * radius))
    prof.append((back + radius, top))
    bm = bmesh.new()
    rows = []
    for x in (-width / 2, width / 2):
        rows.append([bm.verts.new((x, y, z)) for y, z in prof])
    for i in range(len(prof) - 1):
        bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
    me = bpy.data.meshes.new("Sweep")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Floor", me)
    bpy.context.collection.objects.link(ob)
    smooth(ob, 30)
    return ob


def mat_stone():
    """Dark volcanic basalt for plinths."""
    m, nt, out = node_mat("VolcanicStone")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n1 = nt.nodes.new("ShaderNodeTexNoise")
    n1.inputs["Scale"].default_value = 18.0
    n1.inputs["Detail"].default_value = 12.0
    n1.inputs["Roughness"].default_value = 0.65
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 70.0
    nt.links.new(tc.outputs["Object"], n1.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.006, 0.006, 0.006, 1)
    ramp.color_ramp.elements[1].color = (0.022, 0.020, 0.018, 1)
    nt.links.new(n1.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.78
    mixh = nt.nodes.new("ShaderNodeMath")
    mixh.operation = "ADD"
    nt.links.new(n1.outputs["Fac"], mixh.inputs[0])
    vmul = nt.nodes.new("ShaderNodeMath")
    vmul.operation = "MULTIPLY"
    vmul.inputs[1].default_value = 0.9
    nt.links.new(vor.outputs["Distance"], vmul.inputs[0])
    nt.links.new(vmul.outputs["Value"], mixh.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.6
    bump.inputs["Distance"].default_value = 0.03
    nt.links.new(mixh.outputs["Value"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return m


# ---------------------------------------------------------------- bottle
def build_bottle(size_ml="50"):
    root = bpy.data.objects.new("OBSIDIAN_No01", None)
    bpy.context.collection.objects.link(root)

    glass = rounded_box("GlassBody", BODY_W, BODY_D, BODY_H, CORNER)
    neck = cylinder("Neck", NECK_R, NECK_H + 0.02, BODY_H - 0.02, verts=96)
    apply_bool(glass, neck, "UNION")
    # inner cavity -> thick base, finite walls
    cav_h = BODY_H - BASE_T - TOP_T
    cavity = rounded_box("Cavity", BODY_W - 2 * WALL, BODY_D - 2 * WALL, cav_h, CORNER - WALL * 0.6, z0=BASE_T, segments=8)
    apply_bool(glass, cavity, "DIFFERENCE")
    bev = glass.modifiers.new("edge", "BEVEL")
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(40)
    bev.width = 0.006
    bev.segments = 3
    bpy.context.view_layer.objects.active = glass
    bpy.ops.object.modifier_apply(modifier=bev.name)
    smooth(glass, 32)
    glass.data.materials.append(mat_glass())

    eps = 0.0015
    liq_h = cav_h * FILL
    liquid = rounded_box("Liquid", BODY_W - 2 * WALL - 2 * eps, BODY_D - 2 * WALL - 2 * eps, liq_h,
                         CORNER - WALL * 0.6 - eps, z0=BASE_T + eps, segments=8)
    smooth(liquid, 32)
    liquid.data.materials.append(mat_liquid())

    ring = cylinder("BrassRing", CAP_R + 0.0015, RING_H, BODY_H + NECK_H)
    rb = ring.modifiers.new("b", "BEVEL")
    rb.width = 0.003
    rb.segments = 2
    bpy.ops.object.modifier_apply(modifier=rb.name)
    smooth(ring, 40)
    ring.data.materials.append(mat_brass())

    cap = cylinder("Cap", CAP_R, CAP_H - RING_H, BODY_H + NECK_H + RING_H)
    cb = cap.modifiers.new("b", "BEVEL")
    cb.width = 0.014
    cb.segments = 5
    bpy.ops.object.modifier_apply(modifier=cb.name)
    smooth(cap, 40)
    cap.data.materials.append(mat_cap())

    # atomizer under the cap (hidden inside the solid cap when closed; revealed when it lifts)
    collar = cylinder("PumpCollar", NECK_R + 0.006, 0.024, BODY_H + NECK_H, verts=96)
    smooth(collar, 40)
    collar.data.materials.append(mat_metal_dark())
    actuator = cylinder("Actuator", 0.072, 0.075, BODY_H + NECK_H + 0.024, verts=96)
    ab = actuator.modifiers.new("b", "BEVEL")
    ab.width = 0.008
    ab.segments = 3
    bpy.context.view_layer.objects.active = actuator
    bpy.ops.object.modifier_apply(modifier=ab.name)
    smooth(actuator, 40)
    actuator.data.materials.append(mat_brass())
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.011, depth=0.012,
                                        location=(0, -0.072, BODY_H + NECK_H + 0.062), rotation=(math.radians(90), 0, 0))
    nozzle = bpy.context.active_object
    nozzle.name = "Nozzle"
    nozzle.data.materials.append(mat_surface("NozzleHole", (0.0, 0.0, 0.0), 0.6, 0.2))

    # front print: plane hugging the flat front face, a hair outside the glass
    face_w, z0, z1 = 0.84, 0.08, 1.37
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -BODY_D / 2 - 0.0006, (z0 + z1) / 2),
                                     rotation=(math.radians(90), 0, 0))
    label = bpy.context.active_object
    label.name = "FrontPrint"
    label.scale = (face_w, z1 - z0, 1)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    label.data.materials.append(mat_print(size_ml))
    label.visible_shadow = False

    for ob in (glass, liquid, ring, cap, label, collar, actuator, nozzle):
        ob.parent = root
    return root


# ---------------------------------------------------------------- studio
def world_dark():
    w = bpy.data.worlds.new("World")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0006, 0.0006, 0.0007, 1)
    bpy.context.scene.world = w


def area(name, loc, target, size, size_y, power, color, shape="RECTANGLE", visible=False, spread=180):
    ld = bpy.data.lights.new(name, "AREA")
    ld.spread = math.radians(spread)
    ld.shape = shape
    ld.size = size
    ld.size_y = size_y
    ld.energy = power
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    aim(ob, target)
    ob.visible_camera = visible
    return ob


def aim(ob, target):
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


WARM = (1.0, 0.70, 0.42)
WARM_SOFT = (1.0, 0.82, 0.64)
NEUTRAL = (0.92, 0.94, 1.0)


def studio(floor=True, floor_color=(0.005, 0.005, 0.005), floor_rough=0.5, backdrop=True, glow=True):
    world_dark()
    if floor:
        f = sweep_mesh()
        f.data.materials.append(mat_surface("Sweep", floor_color, floor_rough, 0.2))
    lights = {}
    # warm key / rim from upper right behind -> amber edge glow through glass
    lights["key"] = area("KeyRim", (2.1, 3.0, 2.4), (0, 0, 1.15), 0.7, 3.2, 800, WARM, spread=40)
    # thin vertical strip on the left for a clean glass edge highlight
    lights["strip_l"] = area("StripLeft", (-2.4, 1.2, 1.5), (0, 0, 0.9), 0.18, 2.0, 160, WARM_SOFT, spread=25)
    # faint neutral front fill reveals the front plane and print
    lights["fill"] = area("FrontFill", (-4.6, 0.8, 1.6), (0, 0, 0.8), 2.4, 2.4, 55, NEUTRAL, spread=70)
    # top soft for the cap
    lights["top"] = area("TopSoft", (0.4, -0.6, 4.2), (0, 0, 1.8), 1.6, 1.6, 90, WARM_SOFT)
    # moving shoulder highlight (narrow strip reflected in the shoulder)
    lights["sweep"] = area("SweepStrip", (1.6, -2.0, 2.2), (0, 0, 1.3), 0.06, 1.4, 260, WARM, spread=25)
    if glow:
        # warm pool on the backdrop behind the object, separates black glass from bg
        sp = bpy.data.lights.new("BackGlow", "SPOT")
        sp.energy = 15000
        sp.spot_size = math.radians(38)
        sp.spot_blend = 1.0
        sp.color = (1.0, 0.66, 0.38)
        sp.shadow_soft_size = 1.5
        so = bpy.data.objects.new("BackGlow", sp)
        bpy.context.collection.objects.link(so)
        so.location = (0.3, 1.4, 0.6)
        aim(so, (0.8, 10.0, 2.2))
        lights["glow"] = so
    if floor:
        # warm pool on the floor just behind the base -> separates the silhouette
        pp = bpy.data.lights.new("FloorPool", "SPOT")
        pp.energy = 500
        pp.spot_size = math.radians(70)
        pp.spot_blend = 1.0
        pp.color = (1.0, 0.72, 0.46)
        pp.shadow_soft_size = 0.6
        po = bpy.data.objects.new("FloorPool", pp)
        bpy.context.collection.objects.link(po)
        po.location = (0.4, 1.6, 3.4)
        aim(po, (0.0, 0.45, 0.0))
        lights["pool"] = po
    return lights


def exclude_from(light_ob, *objs):
    """Light linking: light_ob does not illuminate objs (a photographic flag)."""
    coll = light_ob.light_linking.receiver_collection or bpy.data.collections.new(f"{light_ob.name}_excl")
    for o in objs:
        if o.name not in coll.objects:
            coll.objects.link(o)
    light_ob.light_linking.receiver_collection = coll
    for co in coll.collection_objects:
        co.light_linking.link_state = "EXCLUDE"


def only_lights(light_ob, *objs):
    """Light linking: light_ob illuminates only objs."""
    coll = bpy.data.collections.new(f"{light_ob.name}_incl")
    for o in objs:
        coll.objects.link(o)
    light_ob.light_linking.receiver_collection = coll
    for co in coll.collection_objects:
        co.light_linking.link_state = "INCLUDE"


def base_card(bottle, strength=9.0):
    """Warm card hidden behind the base: seen only through the thick glass."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.75, 0.10), rotation=(math.radians(90), 0, 0))
    card = bpy.context.active_object
    card.name = "BaseCard"
    card.scale = (0.95, 0.17, 1)
    m, nt, out = node_mat("CardEmit")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (1.0, 0.74, 0.48, 1)
    # soft falloff towards the card edges so the base glows like light, not like a flat panel
    tc = nt.nodes.new("ShaderNodeTexCoord")
    grad = nt.nodes.new("ShaderNodeTexGradient")
    grad.gradient_type = "SPHERICAL"
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.6, 3.2, 1.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], grad.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = strength
    nt.links.new(grad.outputs["Fac"], mul.inputs[0])
    nt.links.new(mul.outputs["Value"], e.inputs["Strength"])
    nt.links.new(e.outputs["Emission"], out.inputs["Surface"])
    card.data.materials.append(m)
    card.visible_diffuse = False
    card.visible_glossy = False
    card.visible_shadow = False
    card.parent = bottle
    return card


def plinth():
    """Low, broad dark-stone plinth for the closing frame."""
    ob = rounded_box("Plinth", 3.4, 1.9, 0.32, 0.03, z0=0.0, segments=3)
    smooth(ob, 30)
    ob.data.materials.append(mat_stone())
    return ob


# ---------------------------------------------------------------- camera
def camera(name="Cam", lens=85, sensor=36):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = sensor
    cd.sensor_fit = "AUTO"
    ob = bpy.data.objects.new(name, cd)
    bpy.context.collection.objects.link(ob)
    bpy.context.scene.camera = ob
    return ob


def place_orbit(cam, target, dist, az_deg, el_deg):
    """az 0 = straight in front (-Y), positive az orbits towards +X (camera right)."""
    az, el = math.radians(az_deg), math.radians(el_deg)
    t = Vector(target)
    cam.location = t + Vector((math.sin(az) * math.cos(el) * dist, -math.cos(az) * math.cos(el) * dist, math.sin(el) * dist))
    aim(cam, target)


def frame_distance(lens, sensor_h, subject_h, fraction):
    """Distance such that subject_h fills `fraction` of frame height."""
    frame_h = subject_h / fraction
    return frame_h / 2 / math.tan(math.atan(sensor_h / 2 / lens))


def dof(cam, target, fstop):
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = (Vector(target) - cam.location).length
    cam.data.dof.aperture_fstop = fstop


# ---------------------------------------------------------------- render
def setup_render(w, h, samples, transparent=False):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = samples
    s.cycles.use_adaptive_sampling = True
    s.cycles.adaptive_threshold = 0.015
    s.cycles.use_denoising = True
    s.cycles.denoiser = "OPENIMAGEDENOISE"
    s.cycles.max_bounces = 24
    s.cycles.transmission_bounces = 20
    s.cycles.glossy_bounces = 8
    s.cycles.volume_bounces = 2
    s.cycles.transparent_max_bounces = 16
    s.cycles.caustics_reflective = False
    s.cycles.caustics_refractive = False
    s.cycles.blur_glossy = 1.0
    s.render.resolution_x = w
    s.render.resolution_y = h
    s.render.resolution_percentage = 100
    s.render.film_transparent = transparent
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Medium High Contrast"
    s.view_settings.exposure = 0.0
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_depth = "16"
    s.render.threads_mode = "AUTO"


# ---------------------------------------------------------------- shots
def shot(name, size_ml="50"):
    """Configure the scene for a named shot. Returns dict(w, h, samples, anim callback or None)."""
    reset()
    S = {}
    bottle = build_bottle(size_ml)
    cap_obj = bpy.data.objects["Cap"]
    target = (0, 0, BOTTLE_CENTER_Z)

    if name in ("hero_desktop", "hero_loop"):
        lights = studio()
        bottle.rotation_euler.z = math.radians(-12)
        cam = camera(lens=85)
        w, h = (2560, 1440) if name == "hero_desktop" else (1920, 1080)
        sensor_h = 36 * h / w
        dist = frame_distance(85, sensor_h, 1.90, 0.66)
        cam.data.shift_x = -0.19
        cam.data.shift_y = 0.03 * h / w
        place_orbit(cam, target, dist, 0, 3.5)
        S.update(w=w, h=h, samples=160 if name == "hero_desktop" else 64)
        if name == "hero_loop":
            S["anim"] = lambda f, n: hero_motion(cam, lights, target, dist, f, n)

    elif name in ("hero_mobile", "hero_mobile_loop"):
        lights = studio()
        bottle.rotation_euler.z = math.radians(-12)
        cam = camera(lens=85)
        # dedicated 9:16 composition: quiet dark top for text, bottle centred ~60 % down
        w, h = (1080, 1920) if name == "hero_mobile" else (720, 1280)
        sensor_h = 36  # portrait: AUTO fit uses the larger (vertical) dimension
        dist = frame_distance(85, sensor_h, 1.90, 0.40)
        cam.data.shift_y = 0.10
        place_orbit(cam, target, dist, 0, 3.5)
        S.update(w=w, h=h, samples=160 if name == "hero_mobile" else 64)
        if name == "hero_mobile_loop":
            S["anim"] = lambda f, n: hero_motion(cam, lights, target, dist, f, n)

    elif name.startswith("ref_"):
        lights = studio(glow=True)
        view = name[4:]
        cam = camera(lens=85)
        w, h = 1200, 1500
        if view == "front":
            bottle.rotation_euler.z = 0
            dist = frame_distance(85, 36, 1.90, 0.78)
            place_orbit(cam, target, dist, 0, 2)
        elif view == "three_quarter":
            bottle.rotation_euler.z = math.radians(-35)
            dist = frame_distance(85, 36, 1.90, 0.78)
            place_orbit(cam, target, dist, 0, 6)
        elif view == "side":
            bottle.rotation_euler.z = math.radians(-90)
            dist = frame_distance(85, 36, 1.90, 0.78)
            place_orbit(cam, target, dist, 0, 2)
        elif view == "cap":
            bottle.rotation_euler.z = math.radians(-25)
            cam.data.lens = 100
            t = (0, 0, 1.68)
            dist = frame_distance(100, 36, 0.62, 0.9)
            place_orbit(cam, t, dist, 0, 8)
            dof(cam, (0, -0.2, 1.68), 5.6)
            lights["glow"].data.energy *= 0.45
        elif view == "base":
            bottle.rotation_euler.z = math.radians(-40)
            cam.data.lens = 100
            t = (0.0, 0, 0.26)
            dist = frame_distance(100, 36, 0.80, 0.9)
            place_orbit(cam, t, dist, 0, 2)
            dof(cam, (0.25, -0.3, 0.12), 5.6)
            lights["fill"].data.energy = 0
            lights["key"].location = (1.9, 1.5, 0.55)
            aim(lights["key"], (0, 0, 0.25))
            lights["key"].data.energy = 420
            base_card(bottle)
        S.update(w=w, h=h, samples=128)

    elif name.startswith("object_"):
        # The Object storyboard O0..O3: 4:5 frames, same rig
        lights = studio()
        cam = camera(lens=85)
        w, h = 1440, 1800
        k = name[7:]
        if k == "o0":
            bottle.rotation_euler.z = math.radians(-24)
            dist = frame_distance(85, 36, 1.90, 0.74)
            place_orbit(cam, target, dist, 0, 4)
        elif k == "o1":  # cap + upper shoulder
            bottle.rotation_euler.z = math.radians(-28)
            cam.data.lens = 100
            t = (0.05, 0, 1.40)
            dist = frame_distance(100, 36, 1.25, 1.0)
            place_orbit(cam, t, dist, 0, 4)
            lights["glow"].data.energy *= 0.45
            dof(cam, (0, -0.15, 1.6), 4.0)
            lights["sweep"].location = (1.2, -1.6, 2.6)
            aim(lights["sweep"], (0, 0, 1.45))
        elif k == "o2":  # macro: brass ring + rounded glass shoulder
            bottle.rotation_euler.z = math.radians(-30)
            cam.data.lens = 100
            t = (0.12, 0, 1.47)
            dist = frame_distance(100, 36, 0.60, 1.0)
            place_orbit(cam, t, dist, 0, 3)
            dof(cam, (0.05, -0.2, 1.56), 3.2)
            lights["glow"].data.energy *= 0.45
            lights["sweep"].location = (1.4, -1.2, 2.2)
            aim(lights["sweep"], (0.3, 0, 1.4))
        elif k == "o3":  # thick base + grounded reflection: hero rig, low camera, lower body
            bottle.rotation_euler.z = math.radians(-26)
            cam.data.lens = 100
            t = (0.0, 0, 0.52)
            dist = frame_distance(100, 36, 1.55, 1.0)
            place_orbit(cam, t, dist, 0, 2)
            dof(cam, (0.0, -0.3, 0.15), 6.3)
            lights["sweep"].data.energy = 0
            base_card(bottle)
        S.update(w=w, h=h, samples=160)

    elif name == "product":
        lights = studio(floor_color=(0.016, 0.015, 0.014), floor_rough=0.4)
        bottle.rotation_euler.z = math.radians(-20)
        cam = camera(lens=85)
        w, h = 1600, 2000
        dist = frame_distance(85, 36, 1.90, 0.62)
        cam.data.shift_y = -0.02
        place_orbit(cam, target, dist, 0, 5)
        S.update(w=w, h=h, samples=160)

    elif name in ("closing_desktop", "closing_mobile", "closing_desktop_b", "closing_mobile_b"):
        lights = studio(glow=True)
        p = plinth()
        bottle.location.z = 0.32
        bottle.rotation_euler.z = math.radians(-18)
        # single warm lateral beam
        lights["key"].location = (3.2, 0.6, 1.9)
        lights["key"].data.energy = 1300
        lights["key"].data.size = 0.5
        aim(lights["key"], (0, 0, 1.2))
        if name.endswith("_b"):
            # C1: the same beam, drifted slightly forward — crossfaded on the page as a slow light movement
            lights["key"].location = (3.0, -0.7, 2.05)
            aim(lights["key"], (0, 0, 1.15))
        lights["fill"].data.energy = 40
        lights["strip_l"].data.energy = 90
        lights["sweep"].data.energy = 0
        t = (0, 0, 0.32 + BOTTLE_CENTER_Z * 0.85)
        cam = camera(lens=70)
        if name.startswith("closing_desktop"):
            w, h = 2560, 1280
            dist = frame_distance(70, 36 * h / w, 2.25, 0.74)
            cam.data.shift_x = -0.16
        else:
            w, h = 1200, 1500
            dist = frame_distance(70, 36, 2.25, 0.66)
            cam.data.shift_y = -0.06
        place_orbit(cam, t, dist, 0, 5)
        S.update(w=w, h=h, samples=160)

    elif name in ("reveal", "reveal_mobile"):
        # Scroll-scrubbed hero/object sequence. Frame 0 == hero poster composition.
        lights = studio()
        bottle.rotation_euler.z = math.radians(-12)
        cam = camera(lens=85)
        mobile = name == "reveal_mobile"
        w, h = (576, 1024) if mobile else (1280, 720)
        sensor_h = 36 if mobile else 36 * h / w
        dist = frame_distance(85, sensor_h, 1.90, 0.40 if mobile else 0.66)
        parts = [bpy.data.objects["Cap"], bpy.data.objects["BrassRing"]]  # the ring is part of the cap
        base_z = [o.location.z for o in parts]
        drops = make_droplets()
        S.update(w=w, h=h, samples=24)
        S["anim"] = lambda f, n: reveal_motion(cam, lights, parts, base_z, dist, mobile, f / (n - 1), drops)
        place_orbit(cam, target, dist, 0, 3.5)

    elif name in ("plinth_film", "plinth_film_mobile"):
        # Final frames of the notes film: the closing plinth, framed 16:9 / 9:16, with or without the bottle.
        lights = studio(glow=True)
        plinth()
        bottle.location.z = 0.32
        bottle.rotation_euler.z = math.radians(-18)
        lights["key"].location = (3.2, 0.6, 1.9)
        lights["key"].data.energy = 1300
        lights["key"].data.size = 0.5
        aim(lights["key"], (0, 0, 1.2))
        lights["fill"].data.energy = 40
        lights["strip_l"].data.energy = 90
        lights["sweep"].data.energy = 0
        cam = camera(lens=70)
        t = (0, 0, 0.32 + BOTTLE_CENTER_Z * 0.85)
        if name == "plinth_film":
            w, h = 1600, 900
            dist = frame_distance(70, 36 * h / w, 2.25, 0.72)
            cam.data.shift_x = -0.14
        else:
            w, h = 720, 1280
            dist = frame_distance(70, 36, 2.25, 0.5)
            cam.data.shift_y = 0.12
        place_orbit(cam, t, dist, 0, 5)
        S.update(w=w, h=h, samples=96)

    elif name == "turntable":
        lights = studio()
        cam = camera(lens=85)
        w, h = 1200, 1500
        dist = frame_distance(85, 36, 1.90, 0.74)
        place_orbit(cam, target, dist, 0, 4)
        S.update(w=w, h=h, samples=64)
        S["anim"] = lambda f, n: setattr(bottle.rotation_euler, "z", math.radians(-12 + 360 * f / n))
    else:
        raise SystemExit(f"unknown shot {name}")
    # photographic flags: keep the satin cap dark and the floor quiet
    floor_obj = bpy.data.objects.get("Floor")
    flagged = [o for o in (floor_obj,) if o is not None]
    exclude_from(lights["sweep"], cap_obj, *flagged)
    if flagged:
        exclude_from(lights["key"], *flagged)
        exclude_from(lights["strip_l"], *flagged)
    plinth_obj = bpy.data.objects.get("Plinth")
    pl = [plinth_obj] if plinth_obj else []
    if "pool" in lights:
        exclude_from(lights["pool"], cap_obj, *pl)
    exclude_from(lights["fill"], cap_obj, *pl)
    exclude_from(lights["top"], cap_obj, *pl)
    if plinth_obj:
        exclude_from(lights["key"], plinth_obj)
        exclude_from(lights["strip_l"], plinth_obj)
        rake = area("StoneRake", (3.0, -0.4, 0.35), (0, 0, 0.2), 0.4, 2.0, 30, WARM, spread=30)
        rake.rotation_euler.rotate_axis("Z", math.radians(90))
        only_lights(rake, plinth_obj)
    # print light: a soft source beside the lens that lights only the screen print,
    # so the ink reads without a softbox reflection across the glass
    cam = bpy.context.scene.camera
    lab = bpy.data.objects["FrontPrint"]
    ll = area("PrintLight", cam.location + Vector((-0.6, 0, 1.2)), lab.matrix_world.translation, 1.5, 1.5,
              S.get("print_power", 260), WARM_SOFT)
    only_lights(ll, lab)
    if "top" in lights:
        lights["top"].data.energy *= 0.6
    return S


def keyed(t, keys):
    """Piecewise smoothstep through (t, value) keys: eases into and out of every key (natural holds)."""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0) if t1 > t0 else 1.0
            u = u * u * (3 - 2 * u)
            return v0 + (v1 - v0) * u
    return keys[-1][1]


REVEAL = {
    # Chapter holds (the page overlays its copy here): 0 hero · 0.25 object · 0.45 cap lifted ·
    # 0.6 atomizer · 0.62–1.0 spray, camera pushes into the droplets.
    "az": [(0, 0), (0.25, -22), (0.45, -30), (0.6, -30), (1.0, -17)],
    "dist": [(0, 1.0), (0.25, 0.82), (0.45, 0.56), (0.6, 0.34), (0.85, 0.27), (1.0, 0.13)],
    "tz": [(0, 0.95), (0.25, 1.0), (0.45, 1.84), (0.6, 1.64), (1.0, 1.62)],
    "el": [(0, 3.5), (0.25, 5.0), (0.45, 4.5), (0.6, 2.0), (1.0, 1.0)],
    "shift_x": [(0, -0.19), (0.25, -0.12), (0.45, 0.0), (0.6, -0.08), (1.0, 0.0)],
    "shift_y_mobile": [(0, 0.10), (0.25, 0.06), (0.45, 0.0), (0.6, -0.06), (0.86, -0.04), (1.0, 0.72)],
    "shift_y": [(0, 0.017), (0.86, 0.017), (1.0, 0.5)],
    "cap": [(0, 0), (0.3, 0), (0.45, 0.42), (0.6, 1.6), (1.0, 1.6)],
    "sweep": [(0, -35), (0.25, -5), (0.45, 25), (0.6, -20), (1.0, -45)],
    "spray": [(0.62, 0.0), (1.0, 1.0)],
}
SPRAY_START = 0.62


def make_droplets(n=900, seed=7):
    """Deterministic droplet field: each droplet has a launch time, direction in a cone, travel and size."""
    import random

    rnd = random.Random(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
    proto = bpy.context.active_object
    proto.name = "DropletProto"
    proto.data.materials.append(mat_droplet())
    bpy.ops.object.shade_smooth()
    proto.hide_render = True
    drops = []
    for i in range(n):
        ob = bpy.data.objects.new(f"Drop{i}", proto.data)
        bpy.context.collection.objects.link(ob)
        u, v = rnd.random(), rnd.random()
        spread = math.radians(14) * math.sqrt(u)
        phi = 2 * math.pi * v
        drops.append({
            "ob": ob,
            "t0": rnd.random() * 0.55,                   # launch, in spray-normalised time
            "spread": (math.cos(phi) * spread, math.sin(phi) * spread * 0.7),
            "travel": 1.2 + rnd.random() * 4.5,
            "size": 0.0018 + rnd.random() ** 4 * 0.009,
        })
        ob.scale = (0, 0, 0)
    return drops


def place_droplets(drops, tau):
    """Ballistic spray from the nozzle along the bottle's front axis (yaw −12°), with drag and a little gravity."""
    yaw = math.radians(-12)
    # nozzle at local (0, -0.078, 1.612) rotated by the bottle yaw
    nozzle = Vector((0.078 * math.sin(yaw), -0.078 * math.cos(yaw), BODY_H + NECK_H + 0.062))
    base_dir = Vector((math.sin(yaw), -math.cos(yaw), 0.04))
    side = Vector((math.cos(yaw), math.sin(yaw), 0))
    up = Vector((0, 0, 1))
    for d in drops:
        age = tau - d["t0"]
        ob = d["ob"]
        if age <= 0:
            ob.scale = (0, 0, 0)
            continue
        dirv = (base_dir + side * math.tan(d["spread"][0]) + up * math.tan(d["spread"][1])).normalized()
        k = 3.2
        dist = d["travel"] * (1 - math.exp(-k * age))
        pos = nozzle + dirv * dist + Vector((0, 0, -0.18 * age * age))
        ob.location = pos
        grow = min(1.0, age * 6)
        r = d["size"] * (0.35 + 0.65 * grow)
        # stretch slightly along travel while fast (cheap motion streak)
        speed = d["travel"] * k * math.exp(-k * age)
        ob.rotation_euler = dirv.to_track_quat("Z", "Y").to_euler()
        ob.scale = (r, r, r * (1 + min(1.6, speed * 0.25)))


def reveal_motion(cam, lights, parts, base_z, dist, mobile, t, drops=None):
    R = REVEAL
    target = (0, 0, keyed(t, R["tz"]))
    place_orbit(cam, target, dist * keyed(t, R["dist"]), keyed(t, R["az"]), keyed(t, R["el"]))
    if mobile:
        cam.data.shift_x = 0
        cam.data.shift_y = keyed(t, R["shift_y_mobile"])
    else:
        cam.data.shift_x = keyed(t, R["shift_x"])
        cam.data.shift_y = keyed(t, R["shift_y"])
    lift = keyed(t, R["cap"])
    for o, z in zip(parts, base_z):
        o.location.z = z + lift
    a = math.radians(keyed(t, R["sweep"]))
    sw = lights["sweep"]
    sw.location = (math.sin(a) * 2.6, -math.cos(a) * 2.6, 2.3)
    aim(sw, (0, 0, 1.4 + min(lift, 0.4) * 0.6))
    pl = bpy.data.objects.get("PrintLight")
    if pl is not None:
        pl.location = cam.location + Vector((-0.6, 0, 1.2)) * keyed(t, R["dist"])
        aim(pl, bpy.data.objects["FrontPrint"].matrix_world.translation)
    if drops is not None:
        tau = max(0.0, (t - SPRAY_START) / (1 - SPRAY_START))
        place_droplets(drops, tau)
    # shallow focus once the camera is close to the atomizer
    if t > 0.5:
        cam.data.dof.use_dof = True
        cam.data.dof.focus_distance = (Vector(target) - cam.location).length
        cam.data.dof.aperture_fstop = 3.5


def hero_motion(cam, lights, target, dist, f, n):
    """Seamless 6 s loop: gentle push-in (2.5 %) + 4 deg arc + highlight travelling
    across the shoulder; all channels return to the start pose at f == n."""
    t = f / n
    s = (1 - math.cos(2 * math.pi * t)) / 2          # 0 -> 1 -> 0, eased at both ends
    az = -2.0 + 4.0 * s
    place_orbit(cam, target, dist * (1 - 0.025 * s), az, 3.5)
    sw = lights["sweep"]
    a = math.radians(-35 + 50 * s)
    sw.location = (math.sin(a) * 2.6, -math.cos(a) * 2.6, 2.3)
    aim(sw, (0, 0, 1.35))


# ---------------------------------------------------------------- main
def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", required=True)
    ap.add_argument("--size", default="50")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=float, default=1.0, help="resolution multiplier for tests")
    ap.add_argument("--samples", type=int, default=0)
    ap.add_argument("--frames", default="", help="a:b frame range for animated shots (n = 144)")
    ap.add_argument("--nframes", type=int, default=144)
    ap.add_argument("--step", type=int, default=1, help="render every Nth frame of the range")
    ap.add_argument("--save-blend", default="")
    ap.add_argument("--no-bottle", action="store_true", help="hide the bottle (empty set for transitions)")
    a = ap.parse_args(argv)

    S = shot(a.shot, a.size)
    if a.no_bottle:
        for o in bpy.data.objects["OBSIDIAN_No01"].children_recursive:
            o.hide_render = True
        for n in ("PrintLight", "BaseCard"):
            if n in bpy.data.objects:
                bpy.data.objects[n].hide_render = True
    setup_render(int(S["w"] * a.scale), int(S["h"] * a.scale), a.samples or S["samples"])
    if a.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=a.save_blend)
    sc = bpy.context.scene
    if "anim" in S and a.frames:
        f0, f1 = (int(x) for x in a.frames.split(":"))
        os.makedirs(a.out, exist_ok=True)
        for f in range(f0, f1, a.step):
            path = os.path.join(a.out, f"f{f:04d}.png")
            if os.path.exists(path):
                continue
            S["anim"](f, a.nframes)
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            print("frame", f, flush=True)
    else:
        sc.render.filepath = a.out
        bpy.ops.render.render(write_still=True)
    print("done", a.out)


if __name__ == "__main__":
    main()
