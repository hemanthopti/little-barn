import { $, el, easeOutBack } from '../core/util';
import { tween } from '../core/engine';
import { objs } from '../core/input';
import { changed } from '../core/state';
import { dbGet, dbSet, dbDel } from '../core/db';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { hearts, sparkleAt } from './fx';

/** Family photos in the two barn side windows. Tap a window and the face pops out: peekaboo. */
const WIN = [{ x: 206, y: 402 }, { x: 494, y: 402 }];
const KEY = (i: number) => `photo:${i}`;
const urls: (string | null)[] = [null, null];
const peeking = [false, false];
let clipN = 0;

export const photoUrl = (i: number) => urls[i];

export async function initPhotos() {
  for (let i = 0; i < 2; i++) {
    objs['win' + i] = { tap: () => peek(i) };
    const blob = await dbGet<Blob>(KEY(i));
    if (blob) show(i, blob);
  }
}

function show(i: number, blob: Blob | null) {
  if (urls[i]) URL.revokeObjectURL(urls[i]!);
  urls[i] = blob ? URL.createObjectURL(blob) : null;
  const g = $('winPhoto' + i); g.innerHTML = '';
  if (urls[i]) el('image', { href: urls[i], x: WIN[i].x - 28, y: WIN[i].y - 28, width: 56, height: 56, preserveAspectRatio: 'xMidYMid slice' }, g);
  $('winCross' + i).style.display = urls[i] ? 'none' : '';
  changed();
}

/** Crop to a square and shrink to 320 px so storage stays small. */
async function square(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height), c = document.createElement('canvas');
  c.width = c.height = 320;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 320, 320);
  return new Promise(res => c.toBlob(b => res(b!), 'image/jpeg', .85));
}

export async function setPhoto(i: number, file: Blob) {
  const blob = await square(file);
  await dbSet(KEY(i), blob);
  show(i, blob);
}
export async function removePhoto(i: number) { await dbDel(KEY(i)); show(i, null); }

function peek(i: number) {
  const w = WIN[i], win = $('win' + i);
  if (!urls[i]) { // no photo: the window just wiggles and sparkles
    sfx('pop'); sparkleAt(w.x, w.y, 6, true);
    tween(400, t => win.setAttribute('transform', `rotate(${Math.sin(t * Math.PI * 4) * (1 - t) * 6} ${w.x} ${w.y})`), () => win.removeAttribute('transform'));
    return;
  }
  if (peeking[i]) return;
  peeking[i] = true;
  const cid = 'peekClip' + (clipN++);
  const g = el('g', {}, $('lPeek'));
  g.innerHTML = `<clipPath id="${cid}"><circle r="72"/></clipPath>
    <circle r="80" fill="#FFE9B0" stroke="#3A2E2A" stroke-width="6"/>
    <image href="${urls[i]}" x="-72" y="-72" width="144" height="144" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid})"/>`;
  const top = { x: w.x, y: w.y - 70 };
  const at = (k: number, s: number, rot = 0) =>
    g.setAttribute('transform', `translate(${w.x + (top.x - w.x) * k},${w.y + (top.y - w.y) * k}) rotate(${rot}) scale(${Math.max(.01, s)})`);
  sfx('boing');
  tween(550, t => { const k = easeOutBack(t); at(k, .3 + .7 * k); }, () => {
    speak('peekaboo'); hearts(top.x, top.y - 60, 5);
    tween(1600, t => at(1, 1 + Math.sin(t * Math.PI * 4) * .04, Math.sin(t * Math.PI * 3) * 5), () => {
      tween(400, t => at(1 - t, 1 - .7 * t), () => { g.remove(); peeking[i] = false; });
    });
  });
}
