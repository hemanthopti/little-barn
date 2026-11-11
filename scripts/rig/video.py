"""
AI video clip (animal on a plain green background) -> sprite sheet for the game.

  python3 scripts/rig/video.py <video.mp4> <name> <animal> [first_frame] [last_frame]
  e.g. python3 scripts/rig/video.py cow-eating.mp4 cow-eat cow 1 78

- frames at 15 fps; green background keyed out (with green spill removed); the AI watermark and any
  other specks dropped by keeping only the largest shape
- scaled so the animal's first frame is the same size as its painted picture (the game's other clips)
- the last few frames blend into the painted standing picture, so the clip hands back to it smoothly
Prints the ANIM entry to paste into src/art/sprites.ts.
"""
import json, math, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage

STAND, COLS, FPS, BLEND = 300, 8, 15, 4


def ffmpeg():
    return subprocess.run(['node', '-e', "import('ffmpeg-static').then(m=>console.log(m.default))"],
                          capture_output=True, text=True).stdout.strip()


def key(rgb):
    """Alpha from how much greener than red/blue a pixel is; then pull the green out of the edges."""
    a = rgb.astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = g - np.maximum(r, b)
    alpha = 1 - np.clip((green - 18) / 45, 0, 1)
    a[..., 1] = np.minimum(g, np.maximum(r, b) + 6)            # despill
    m = alpha > .5
    lab, n = ndimage.label(m)
    if n:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        keep = ndimage.binary_dilation(lab == (np.argmax(sizes) + 1), iterations=3)
        alpha *= keep
    return np.dstack([a, alpha * 255]).clip(0, 255).astype('uint8')


def main():
    src, name, animal = sys.argv[1:4]
    f0 = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    f1 = int(sys.argv[5]) if len(sys.argv) > 5 else 10 ** 6
    tmp = tempfile.mkdtemp()
    subprocess.run([ffmpeg(), '-loglevel', 'error', '-i', src, '-vf', f'fps={FPS}', f'{tmp}/%04d.png'], check=True)
    files = sorted(os.listdir(tmp))[f0 - 1:f1]
    frames = [key(np.array(Image.open(f'{tmp}/{f}').convert('RGB'))) for f in files]

    # Size and feet position from the first frame (the same pose as the painted picture)
    a0 = frames[0][..., 3] > 128
    ys, xs = np.where(a0)
    feet_y, cx, h1 = ys.max(), (xs.min() + xs.max()) / 2, ys.max() - ys.min()
    s = STAND / h1
    # One box that holds every frame
    allm = np.any([f[..., 3] > 20 for f in frames], axis=0)
    ys, xs = np.where(allm)
    m = 12
    x0, x1 = max(0, min(xs.min(), cx - 10) - m), max(xs.max(), cx + 10) + m
    y0, y1 = max(0, ys.min() - m), max(ys.max(), feet_y) + m
    x0 = int(min(x0, 2 * cx - x1)); x1 = int(max(x1, 2 * cx - x0))   # keep the feet centred in the cell
    cw, ch = round((x1 - x0) * s), round((y1 - y0) * s)
    cells = [Image.fromarray(f).crop((x0, y0, x1, y1)).resize((cw, ch), Image.LANCZOS) for f in frames]

    # Blend the last frames into the painted standing picture
    still = Image.open(f'public/art/{animal}-idle.webp').convert('RGBA')
    f = STAND / 515                                         # the painted animals stand 515 px tall in 520 px pictures
    sw, sh = round(still.width * f), round(still.height * f)
    still = still.resize((sw, sh), Image.LANCZOS)
    ax, ay = (cx - x0) * s, (feet_y - y0) * s
    pic = Image.new('RGBA', (cw, ch)); pic.alpha_composite(still, (round(ax - sw / 2), round(ay - 515 * f)))
    last = cells[-1]
    for i in range(1, BLEND + 1):
        cells.append(Image.blend(last, pic, i / BLEND))

    rows = math.ceil(len(cells) / COLS)
    sheet = Image.new('RGBA', (cw * COLS, ch * rows))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % COLS) * cw, (i // COLS) * ch))
    out = f'public/anim/{name}.webp'
    sheet.save(out, quality=86, method=6)
    print(json.dumps(dict(src=f'anim/{name}.webp', cols=COLS, n=len(cells), cw=cw, ch=ch, fps=FPS,
                          ax=round(ax, 1), ay=round(ay, 1), stand=STAND)))


if __name__ == '__main__':
    main()
