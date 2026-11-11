"""
Cut-out ("puppet") animation from a single painted picture, rendered to sprite sheets.

Each animal gets a few soft "bones" (legs, head, tail) drawn as regions on its picture.
For every frame the bones rotate a little around their pivots and the picture is smoothly
warped to follow (2D skinning: weights fade out at the joints, so there are no seams).
Output: an 8-column WebP sheet per clip, same format as the video clips (see ANIM in sprites.ts).

  python3 scripts/rig/rig.py cow            -> public/anim/cow-walk.webp, cow-happy.webp, cow-idle.webp + printed ANIM entries
"""
import json, math, sys
import numpy as np
from PIL import Image
from scipy import ndimage

STAND = 300          # standing height in the sheet, px
FPS = 15
COLS = 8
PAD = 80             # room around the picture for swinging legs and hops (source px)


def soft(mask, blur):
    return np.clip(ndimage.gaussian_filter(mask.astype(float), blur), 0, 1)


def rot(deg):
    a = math.radians(deg)
    return np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])


class Rig:
    def __init__(self, img, bones):
        self.rgba = np.array(img.convert('RGBA')).astype(float)
        a = self.rgba[..., 3:4] / 255
        self.pre = np.concatenate([self.rgba[..., :3] * a, a * 255], -1)        # premultiplied for clean edges
        self.pre = np.pad(self.pre, ((PAD, PAD), (PAD, PAD), (0, 0)))
        self.h, self.w = self.pre.shape[:2]
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        self.yy, self.xx = yy.astype(float), xx.astype(float)
        self.bones = []
        for b in bones:
            m = np.zeros((self.h, self.w), bool)
            for (x0, y0, x1, y1) in b.get('boxes', []):
                m[y0 + PAD:y1 + PAD, x0 + PAD:x1 + PAD] = True
            if 'leg' in b:
                # A leg: the painted shape below `cut` that contains the seed point (so the whole hoof moves),
                # joined to the hip by a box as wide as the leg
                sx, sy, cut = b['leg']
                alpha = self.pre[..., 3] > 100
                below = alpha.copy(); below[:cut + PAD] = False
                lab, _ = ndimage.label(below)
                comp = lab == lab[sy + PAD, sx + PAD]
                comp = ndimage.binary_dilation(comp, iterations=3)
                xs = np.where(comp.any(0))[0]
                m |= comp
                m[b['pivot'][1] + PAD:cut + PAD + 4, xs.min():xs.max() + 1] = True
            if 'legbox' in b:
                # A leg given as a box (for paws that touch their neighbour). Painted pixels go to whichever
                # leg's centre line is nearest, so neighbouring legs split cleanly with no shared seam.
                x0, y0, x1, y1 = b['legbox']
                alpha = self.pre[..., 3] > 1
                centres = [((o['legbox'][0] + o['legbox'][2]) / 2 + PAD) for o in bones if 'legbox' in o]
                mine = (x0 + x1) / 2 + PAD
                dist = np.abs(self.xx - mine)
                nearest = np.all([dist <= np.abs(self.xx - c) for c in centres], axis=0)
                rows = np.zeros_like(alpha); rows[y0 + PAD:y1 + PAD + 6, :] = True
                m |= ndimage.binary_dilation(alpha & rows & nearest, iterations=3) & nearest   # keep the soft edge too
            if 'tail' in b:
                # A tail: the painted shape right of `cut` that contains the seed point
                sx, sy, cut = b['tail']
                alpha = self.pre[..., 3] > 100
                right = alpha.copy(); right[:, :cut + PAD] = False
                if 'tail_ymax' in b: right[b['tail_ymax'] + PAD:] = False
                lab, _ = ndimage.label(right)
                m |= ndimage.binary_dilation(lab == lab[sy + PAD, sx + PAD], iterations=3)
            w = soft(m, b.get('blur', 10))
            # fade the weight to zero towards the joint, so the limb bends rather than tears
            px, py = b['pivot'][0] + PAD, b['pivot'][1] + PAD
            if 'fade' in b:
                dx, dy = b['fade']                            # direction away from the joint
                d = (self.xx - px) * dx + (self.yy - py) * dy
                w *= np.clip(d / b.get('fadelen', 30), 0, 1)
            self.bones.append(dict(name=b['name'], pivot=(px, py), w=w))
        tot = sum(b['w'] for b in self.bones)
        over = np.maximum(tot, 1)
        for b in self.bones:
            b['w'] = b['w'] / over

    def frame(self, pose):
        """pose: {bone: (angle_deg, dx, dy)}, plus 'body': (dx, dy, sx, sy) for the whole animal.
        Each bone's share of the picture (its soft weight) is moved rigidly; the rest stays put.
        The shares add up to the original picture, so nothing is lost or doubled away from the joints."""
        rest = 1 - sum(b['w'] for b in self.bones)
        acc = self.pre * rest[..., None]
        for b in self.bones:
            ang, tx, ty = pose.get(b['name'], (0, 0, 0))
            layer = self.pre * b['w'][..., None]
            if ang or tx or ty:
                px, py = b['pivot']
                Ri = rot(-ang)
                # output (y, x) -> input (y, x): in = Ri (out - pivot - t) + pivot   (affine_transform works in (row, col))
                M = np.array([[Ri[1, 1], Ri[1, 0]], [Ri[0, 1], Ri[0, 0]]])
                off = np.array([py, px]) - M @ np.array([py + ty, px + tx])
                layer = np.stack([ndimage.affine_transform(layer[..., c], M, offset=off, order=1) for c in range(4)], -1)
            acc += layer
        body = tuple(pose.get('body', (0, 0, 1, 1))) + (0,)
        bx, by, scx, scy, br = body[:5]
        if (bx, by, scx, scy, br) != (0, 0, 1, 1, 0):
            fx, fy = self.w / 2, self.h - PAD
            Ri = rot(-br)                                       # waddle: lean around the feet
            S = np.array([[1 / scy, 0], [0, 1 / scx]])
            Rrc = np.array([[Ri[1, 1], Ri[1, 0]], [Ri[0, 1], Ri[0, 0]]])
            M = S @ Rrc
            off = np.array([fy, fx]) - M @ np.array([fy + by, fx + bx])
            acc = np.stack([ndimage.affine_transform(acc[..., c], M, offset=off, order=1) for c in range(4)], -1)
        # Where two shares overlap after moving, keep the colour and cap the coverage (no over-bright patches)
        acc = acc / np.maximum(acc[..., 3:4] / 255, 1)
        a = np.clip(acc[..., 3:4], 0, 255) / 255
        rgb = np.where(a > 1e-3, acc[..., :3] / np.maximum(a, 1e-3), 0)
        return Image.fromarray(np.concatenate([np.clip(rgb, 0, 255), a * 255], -1).astype('uint8'), 'RGBA')


def sheet(frames, name, feet_y, stand_px):
    k = STAND / stand_px
    cw, ch = round(frames[0].width * k), round(frames[0].height * k)
    rows = math.ceil(len(frames) / COLS)
    out = Image.new('RGBA', (cw * COLS, ch * rows))
    for i, f in enumerate(frames):
        out.paste(f.resize((cw, ch), Image.LANCZOS), ((i % COLS) * cw, (i // COLS) * ch))
    import os; d = os.environ.get('RIG_OUT', 'public/anim'); os.makedirs(d, exist_ok=True); out.save(f'{d}/{name}.webp', quality=88, method=6)
    ax, ay = cw / 2, (feet_y + PAD) * k
    return dict(src=f'anim/{name}.webp', cols=COLS, n=len(frames), cw=cw, ch=ch, fps=FPS, ax=round(ax, 1), ay=round(ay, 1), stand=STAND)


# ---------- the cow ----------
def cow():
    img = Image.open('public/art/cow-idle.webp')
    # Boxes are in picture pixels (556 x 520). The cow looks at us, body to the right, tail far right.
    bones = [
        dict(name='legFL', leg=(130, 480, 440), pivot=(140, 360), fade=(0, 1), fadelen=40, blur=2),
        dict(name='legFR', leg=(228, 490, 440), pivot=(230, 382), fade=(0, 1), fadelen=40, blur=2),
        dict(name='legBR', leg=(312, 470, 440), pivot=(313, 425), fade=(0, 1), fadelen=25, blur=2),
        dict(name='legBL', leg=(410, 480, 440), pivot=(413, 398), fade=(0, 1), fadelen=40, blur=2),
        dict(name='head', boxes=[(0, 0, 384, 196), (0, 196, 292, 292)], pivot=(205, 300), fade=(0, -1), fadelen=40, blur=8),
        dict(name='tail', tail=(520, 350, 466), pivot=(462, 228), fade=(1, 0), fadelen=14, blur=2),
    ]
    rig = Rig(img, bones)
    feet_y, stand_px = 515, 515
    clips = {}

    # Walk: diagonal pairs swing together (front-left with back-right), 16 frames = about one second
    fr = []
    for i in range(16):
        p = i / 16 * 2 * math.pi
        s, c = math.sin(p), math.cos(p)
        lift = lambda v: -max(0, v) * 7                      # a leg swinging forward lifts its foot
        fr.append(rig.frame({
            'legFL': (14 * s, 0, lift(c)), 'legBR': (12 * s, 0, lift(c)),
            'legFR': (-14 * s, 0, lift(-c)), 'legBL': (-12 * s, 0, lift(-c)),
            'head': (2.2 * math.sin(2 * p), 0, -2.5 * abs(c)),
            'tail': (9 * math.sin(p + 1), 0, 0),
            'body': (0, -4 * abs(math.sin(p)), 1, 1),
        }))
    clips['walk'] = sheet(fr, 'cow-walk', feet_y, stand_px)

    # Happy: squash, jump, land, wiggle, with the tail going
    fr = []
    n = 22
    for i in range(n):
        t = i / (n - 1)
        if t < .18:                                           # crouch
            k = t / .18; hop, sx, sy, leg = 0, 1 + .06 * k, 1 - .08 * k, 0
        elif t < .62:                                         # in the air
            k = (t - .18) / .44; hop = -70 * math.sin(math.pi * k); sx, sy = .97, 1.05; leg = 16 * math.sin(math.pi * k)
        elif t < .76:                                         # land
            k = (t - .62) / .14; hop, sx, sy, leg = 0, 1 + .07 * math.sin(math.pi * k), 1 - .09 * math.sin(math.pi * k), 0
        else:
            hop, sx, sy, leg = 0, 1, 1, 0
        fr.append(rig.frame({
            'legFL': (leg, 0, 0), 'legFR': (-leg, 0, 0), 'legBL': (-leg * .7, 0, 0), 'legBR': (leg * .7, 0, 0),
            'head': (3.5 * math.sin(t * math.pi * 3), 0, 0),
            'tail': (16 * math.sin(t * math.pi * 6), 0, 0),
            'body': (0, hop, sx, sy),
        }))
    clips['happy'] = sheet(fr, 'cow-happy', feet_y, stand_px)

    # Idle: breathing, a slow tail swish, a little head tilt; loops seamlessly (2.4 s)
    fr = []
    for i in range(36):
        p = i / 36 * 2 * math.pi
        fr.append(rig.frame({
            'head': (2 * math.sin(p), 0, 1.2 * math.sin(2 * p)),
            'tail': (10 * math.sin(p * 2), 0, 0),
            'body': (0, 0, 1 - .012 * math.sin(2 * p), 1 + .018 * math.sin(2 * p)),
        }))
    clips['idle'] = sheet(fr, 'cow-idle', feet_y, stand_px)
    return clips


# ---------- the other animals: same three clips from a description of their parts ----------
FOUR = dict(
    pig=dict(feet=519, bones=[
        dict(name='leg0', leg=(150, 480, 443), pivot=(152, 395), fade=(0, 1), fadelen=40, blur=2),
        dict(name='leg1', leg=(243, 490, 443), pivot=(243, 400), fade=(0, 1), fadelen=40, blur=2),
        dict(name='leg2', leg=(330, 470, 443), pivot=(331, 410), fade=(0, 1), fadelen=30, blur=2),
        dict(name='leg3', leg=(423, 480, 443), pivot=(423, 395), fade=(0, 1), fadelen=40, blur=2),
        dict(name='head', boxes=[(0, 0, 330, 300)], pivot=(190, 320), fade=(0, -1), fadelen=40, blur=8),
        dict(name='tail', tail=(505, 230, 468), pivot=(470, 255), fade=(1, 0), fadelen=12, blur=2)]),
    puppy=dict(feet=519, bones=[
        dict(name='leg0', legbox=(58, 372, 165, 512), pivot=(112, 375), fade=(0, 1), fadelen=40, blur=2),
        dict(name='leg1', legbox=(165, 392, 262, 520), pivot=(212, 392), fade=(0, 1), fadelen=40, blur=2),
        dict(name='leg2', legbox=(262, 425, 332, 498), pivot=(296, 425), fade=(0, 1), fadelen=25, blur=2),
        dict(name='leg3', legbox=(332, 372, 430, 508), pivot=(380, 372), fade=(0, 1), fadelen=40, blur=2),
        dict(name='head', boxes=[(0, 0, 402, 292)], pivot=(210, 312), fade=(0, -1), fadelen=40, blur=8),
        dict(name='tail', tail=(440, 260, 405), tail_ymax=335, pivot=(405, 325), fade=(1, 0), fadelen=12, blur=2)]),
    kitten=dict(feet=518, bones=[
        dict(name='leg0', legbox=(55, 362, 152, 515), pivot=(104, 365), fade=(0, 1), fadelen=40, blur=2),
        dict(name='leg1', legbox=(152, 382, 252, 518), pivot=(200, 382), fade=(0, 1), fadelen=40, blur=2),
        dict(name='leg2', legbox=(252, 420, 303, 502), pivot=(278, 420), fade=(0, 1), fadelen=25, blur=2),
        dict(name='leg3', legbox=(303, 378, 392, 508), pivot=(348, 378), fade=(0, 1), fadelen=40, blur=2),
        dict(name='head', boxes=[(0, 0, 372, 296)], pivot=(200, 318), fade=(0, -1), fadelen=40, blur=8),
        dict(name='tail', tail=(430, 230, 352), tail_ymax=345, pivot=(360, 335), fade=(1, 0), fadelen=14, blur=2)]),
)
TWO = dict(
    duck=dict(feet=519, bones=[
        dict(name='leg0', leg=(92, 490, 455), pivot=(105, 440), fade=(0, 1), fadelen=20, blur=2),
        dict(name='leg1', leg=(222, 495, 455), pivot=(215, 440), fade=(0, 1), fadelen=20, blur=2),
        dict(name='head', boxes=[(0, 0, 300, 240)], pivot=(165, 265), fade=(0, -1), fadelen=40, blur=8)]),
)


def animal(kind):
    cfg = {**FOUR, **TWO}[kind]
    rig = Rig(Image.open(f'public/art/{kind}-idle.webp'), cfg['bones'])
    two = kind in TWO
    feet = cfg['feet']
    clips = {}
    lift = lambda v: -max(0, v) * 6

    fr = []
    for i in range(16):
        p = i / 16 * 2 * math.pi
        s_, c = math.sin(p), math.cos(p)
        pose = {'head': (2.2 * math.sin(2 * p), 0, -2 * abs(c)), 'tail': (12 * math.sin(p + 1), 0, 0)}
        if two:      # waddle: legs alternate, body leans side to side
            pose.update({'leg0': (16 * s_, 0, lift(c)), 'leg1': (-16 * s_, 0, lift(-c)), 'body': (0, -3 * abs(s_), 1, 1, 4 * s_)})
        else:        # diagonal pairs: 0 with 2, 1 with 3
            pose.update({'leg0': (12 * s_, 0, lift(c)), 'leg2': (10 * s_, 0, lift(c)),
                         'leg1': (-12 * s_, 0, lift(-c)), 'leg3': (-10 * s_, 0, lift(-c)),
                         'body': (0, -4 * abs(s_), 1, 1)})
        fr.append(rig.frame(pose))
    clips['walk'] = sheet(fr, f'{kind}-walk', feet, feet)

    fr = []
    n = 22
    for i in range(n):
        t = i / (n - 1)
        if t < .18: k = t / .18; hop, sx, sy, leg = 0, 1 + .06 * k, 1 - .08 * k, 0
        elif t < .62: k = (t - .18) / .44; hop = -70 * math.sin(math.pi * k); sx, sy = .97, 1.05; leg = 16 * math.sin(math.pi * k)
        elif t < .76: k = (t - .62) / .14; hop, sx, sy, leg = 0, 1 + .07 * math.sin(math.pi * k), 1 - .09 * math.sin(math.pi * k), 0
        else: hop, sx, sy, leg = 0, 1, 1, 0
        pose = {'head': (4 * math.sin(t * math.pi * 3), 0, 0), 'tail': (18 * math.sin(t * math.pi * 6), 0, 0),
                'leg0': (leg, 0, 0), 'leg1': (-leg, 0, 0), 'leg2': (-leg * .7, 0, 0), 'leg3': (leg * .7, 0, 0),
                'body': (0, hop, sx, sy)}
        fr.append(rig.frame(pose))
    clips['happy'] = sheet(fr, f'{kind}-happy', feet, feet)

    fr = []
    for i in range(36):
        p = i / 36 * 2 * math.pi
        fr.append(rig.frame({'head': (2 * math.sin(p), 0, 1.2 * math.sin(2 * p)), 'tail': (12 * math.sin(p * 2), 0, 0),
                             'body': (0, 0, 1 - .012 * math.sin(2 * p), 1 + .018 * math.sin(2 * p))}))
    clips['idle'] = sheet(fr, f'{kind}-idle', feet, feet)
    return clips


if __name__ == '__main__':
    out = {}
    for which in (sys.argv[1:] or ['cow']):
        out[which] = cow() if which == 'cow' else animal(which)
    print(json.dumps(out, indent=1))
