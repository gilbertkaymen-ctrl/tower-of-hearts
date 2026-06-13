"""
Sculpted character parts for Bea & the Tower of Hearts.

Run headless:
  & "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" --background --factory-startup --python tools\\build_models.py

Each part is built from overlapping primitive blobs, voxel-remeshed into ONE
smooth watertight mesh (no more stacked-sphere look), smoothed, decimated and
exported to js/models.js as plain arrays (three.js y-up coordinates).
The game falls back to procedural shapes if js/models.js is missing.
"""
import bpy
import json
import math
import os

OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', 'models.js'))


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0:
            bpy.data.meshes.remove(me)


def blob(x, y, z, r, sx=1.0, sy=1.0, sz=1.0):
    """Add a sphere blob. Arguments in three.js coords (y up); Blender is z up."""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x, -z, y), segments=24, ring_count=16)
    o = bpy.context.object
    o.scale = (sx, sz, sy)   # axis swap for the scale too
    return o


def ring(y, rr, br, n, t0=0.0, t1=2 * math.pi, z_off=0.0, y_wave=0.0, r_alt=None):
    """Ring of blobs around the Y axis at height y, ring radius rr, blob radius br."""
    objs = []
    for i in range(n):
        t = t0 + (t1 - t0) * (i / max(1, (n - 1) if abs((t1 - t0) - 2 * math.pi) > 1e-3 else n))
        x = rr * math.sin(t)
        z = -rr * math.cos(t) + z_off
        r = br if (r_alt is None or i % 2 == 0) else r_alt
        yy = y + (y_wave if i % 2 == 0 else -y_wave)
        objs.append(blob(x, yy, z, r))
    return objs


def union_smooth(name, voxel=0.04, smooth_iter=10, smooth_factor=1.0, displace=0.0, target_tris=6000):
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    # bake the active object's transform so v.co are true world/character coords
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    m = obj.modifiers.new('rm', 'REMESH')
    m.mode = 'VOXEL'
    m.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier='rm')

    m = obj.modifiers.new('sm', 'SMOOTH')
    m.factor = smooth_factor
    m.iterations = smooth_iter
    bpy.ops.object.modifier_apply(modifier='sm')

    if displace > 0:
        tex = bpy.data.textures.new('fur_' + name, 'CLOUDS')
        tex.noise_scale = 0.16
        m = obj.modifiers.new('dp', 'DISPLACE')
        m.texture = tex
        m.strength = displace
        m.mid_level = 0.5
        bpy.ops.object.modifier_apply(modifier='dp')
        # re-smooth a touch after displacement
        m = obj.modifiers.new('sm2', 'SMOOTH')
        m.factor = 0.6
        m.iterations = 2
        bpy.ops.object.modifier_apply(modifier='sm2')

    obj.data.calc_loop_triangles()
    tris = len(obj.data.loop_triangles)
    if tris > target_tris:
        m = obj.modifiers.new('dc', 'DECIMATE')
        m.ratio = target_tris / tris
        bpy.ops.object.modifier_apply(modifier='dc')

    bpy.ops.object.shade_smooth()
    return obj


def export_part(obj, rnd=3):
    me = obj.data
    me.calc_loop_triangles()
    pos, nrm, idx = [], [], []
    for v in me.vertices:
        x, y, z = v.co
        pos += [round(x, rnd), round(z, rnd), round(-y, rnd)]   # blender z-up -> three y-up
        nx, ny, nz = v.normal
        nrm += [round(nx, 3), round(nz, 3), round(-ny, 3)]
    for t in me.loop_triangles:
        idx += [t.vertices[0], t.vertices[1], t.vertices[2]]
    print(f'  {obj.name}: {len(me.vertices)} verts, {len(me.loop_triangles)} tris')
    return {'p': pos, 'n': nrm, 'i': idx}


parts = {}


def build(name, fn, **kw):
    clear_scene()
    fn()
    obj = union_smooth(name, **kw)
    parts[name] = export_part(obj)


# ---------------- Bea's hair (one sculpted piece, local to headGrp) ----------------
def bea_hair():
    # skull cap: small enough that the face (r .46) stays proud of the hair
    blob(0, 0.13, -0.08, 0.45)
    blob(0, 0.30, -0.05, 0.34)                       # crown volume
    # scalloped bangs (these define the visible hairline on the forehead)
    for bx, by, bz, br in [(-0.31, 0.24, 0.315, 0.115), (-0.16, 0.28, 0.355, 0.125),
                           (0, 0.29, 0.37, 0.13), (0.16, 0.28, 0.355, 0.125),
                           (0.31, 0.24, 0.315, 0.115)]:
        blob(bx, by, bz, br, 1, 1.15, 0.8)
    # bridge fill between bangs and skull cap (no scalp gaps)
    for bx, by, bz, br in [(-0.26, 0.33, 0.24, 0.14), (0, 0.36, 0.28, 0.15), (0.26, 0.33, 0.24, 0.14)]:
        blob(bx, by, bz, br)
    # side locks (tapered chains framing the face)
    for s in (-1, 1):
        blob(s * 0.42, 0.02, 0.15, 0.115)
        blob(s * 0.44, -0.20, 0.16, 0.10)
        blob(s * 0.43, -0.42, 0.17, 0.09)
        blob(s * 0.41, -0.58, 0.17, 0.075)
    # back curtain: brick-staggered BACK-half rings so it reads as flowing waves
    levels = [(0.24, 0.32, 0.14), (0.06, 0.38, 0.14), (-0.12, 0.41, 0.135),
              (-0.30, 0.43, 0.13), (-0.48, 0.43, 0.125), (-0.66, 0.42, 0.12),
              (-0.82, 0.40, 0.115)]
    for li, (y, rr, br) in enumerate(levels):
        n = 8
        off = (math.pi * 0.80 / n) * 0.5 * (li % 2)   # half-step stagger every other row
        ring(y, rr, br, n, t0=-math.pi * 0.40 + off, t1=math.pi * 0.40 + off)
    # wavy hem
    ring(-0.96, 0.37, 0.11, 9, t0=-math.pi * 0.40, t1=math.pi * 0.40, y_wave=0.04, r_alt=0.085)


# ---------------- Bea's skirt (flowing hem) ----------------
def bea_skirt():
    blob(0, 0.62, 0, 0.26, 1.1, 1.25, 1.05)          # core
    for y, rr, br, n in [(0.70, 0.20, 0.10, 8), (0.56, 0.29, 0.11, 9), (0.45, 0.37, 0.12, 10)]:
        ring(y, rr, br, n)
    ring(0.345, 0.435, 0.125, 12, y_wave=0.028, r_alt=0.095)   # flowing hem


# ---------------- Kay's hair ----------------
def kay_hair():
    """Curly afro-textured hair: a base cap covered in rows of curl blobs."""
    blob(0, 0.14, -0.08, 0.42)                       # base cap under the curls
    # curl rows over the dome (t=0 is the back; front stays open for the face)
    rows = [
        (0.46, 0.14, 0.115, 5, 1.00),    # crown
        (0.36, 0.27, 0.110, 8, 0.85),
        (0.22, 0.37, 0.105, 10, 0.74),
        (0.05, 0.43, 0.100, 11, 0.66),   # sides + back
        (-0.12, 0.41, 0.095, 9, 0.52),
        (-0.24, 0.36, 0.090, 7, 0.40),   # nape curls
    ]
    for ri, (y, rr, br, n, frac) in enumerate(rows):
        off = (math.pi * frac / n) * (ri % 2)        # stagger alternate rows
        ring(y, rr, br, n, t0=-math.pi * frac + off, t1=math.pi * frac + off)
    # curly fringe along the hairline
    for bx, by, bz, br in [(-0.30, 0.26, 0.295, 0.10), (-0.15, 0.30, 0.335, 0.105),
                           (0.02, 0.31, 0.35, 0.11), (0.18, 0.30, 0.33, 0.105),
                           (0.31, 0.26, 0.29, 0.10)]:
        blob(bx, by, bz, br)
    # temple curls
    for s in (-1, 1):
        blob(s * 0.40, 0.10, 0.10, 0.095)
        blob(s * 0.43, -0.04, -0.04, 0.09)


# ---------------- Kay's jacket (collar + hood bundle, body-local) ----------------
def kay_jacket():
    blob(0, 0.72, 0, 0.34, 1.0, 1.45, 0.95)          # torso
    blob(0, 0.52, 0.05, 0.30, 1.05, 1.0, 1.0)        # belly
    for s in (-1, 1):
        blob(s * 0.30, 0.97, 0, 0.13)                # shoulders
    ring(1.04, 0.18, 0.075, 8)                       # collar
    blob(0, 1.00, -0.25, 0.13)                       # hood bundle
    blob(0.10, 0.96, -0.27, 0.10)
    blob(-0.10, 0.96, -0.27, 0.10)
    ring(0.44, 0.30, 0.09, 10)                       # hem


# ---------------- Sausage's fluffy body (legs included; body-local) ----------------
def cat_body():
    blob(0, 0.30, 0, 0.30, 1.05, 0.85, 1.35)         # torso
    blob(0, 0.27, 0.30, 0.21)                        # chest floof
    for s in (-1, 1):
        blob(s * 0.17, 0.24, -0.26, 0.17)            # haunches
    blob(0, 0.30, -0.32, 0.20)                       # rump
    # neck ruff
    blob(0, 0.36, 0.36, 0.11)
    for s in (-1, 1):
        blob(s * 0.14, 0.38, 0.30, 0.10)
        blob(s * 0.20, 0.42, 0.22, 0.09)
    # stubby legs
    for s in (-1, 1):
        for z in (0.22, -0.28):
            blob(s * 0.14, 0.09, z, 0.075, 1, 1.4, 1)


# ---------------- Sausage's plumed tail (local to tailGrp) ----------------
def cat_tail():
    for x, y, z, r in [(0, 0.03, -0.06, 0.085), (0, 0.16, -0.13, 0.105), (0, 0.31, -0.17, 0.12),
                       (0, 0.46, -0.15, 0.11), (0, 0.57, -0.10, 0.085)]:
        blob(x, y, z, r)


print('Building sculpted parts...')
build('beaHair', bea_hair, voxel=0.04, smooth_iter=16, target_tris=7000)
build('beaSkirt', bea_skirt, voxel=0.04, target_tris=5500)
build('kayHair', kay_hair, voxel=0.03, smooth_iter=4, displace=0.02, target_tris=6500)
build('kayJacket', kay_jacket, voxel=0.04, target_tris=6000)
build('catBody', cat_body, voxel=0.035, displace=0.012, target_tris=7000)
build('catTail', cat_tail, voxel=0.03, displace=0.012, target_tris=3500)

with open(OUT, 'w') as f:
    f.write('/* auto-generated by tools/build_models.py — sculpted in Blender ' + bpy.app.version_string + ' */\n')
    f.write('const MODELS = ')
    json.dump(parts, f, separators=(',', ':'))
    f.write(';\n')

size_kb = os.path.getsize(OUT) // 1024
print(f'Wrote {OUT} ({size_kb} KB)')
