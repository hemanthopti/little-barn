import { $, el, rnd, pick, easeOut } from '../core/util';
import { tween } from '../core/engine';
import { objs, tapListeners } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { SIZE, url } from '../art/sprites';
import { VOICE, Kind } from '../art/animals';
import { Animal } from './animal';
import { yard } from './yard';
import { confetti, sparkleAt, leaves } from './fx';

/**
 * Hide and seek. An animal says "Find me!", runs to a hiding place (behind the hay, a bush or the barn)
 * and peeks out now and then. Tapping the hiding place or the peeking animal finds it: "Peekaboo!".
 * Nothing is ever wrong; if the child doesn't find it, the animal gets impatient and pops out by itself.
 */
type Spot = {
  ids: string[];            // tapping any of these finds the animal
  hx: number; hy: number;   // hidden animal: point between its feet (it stands behind the cover)
  h: number;                // its height while hidden
  peek: [number, number];   // how far it slides out to peek
  fx: number; fy: number;   // where it lands in front when found
  mirror: boolean;          // face right (peeking out to the right)
  kinds: Kind[];
};
const SMALL: Kind[] = ['pig', 'puppy', 'kitten', 'duck'];
const SPOTS: Spot[] = [
  { ids: ['hay'], hx: 640, hy: 658, h: 95, peek: [0, -42], fx: 640, fy: 728, mirror: false, kinds: SMALL },
  { ids: ['bush0'], hx: 62, hy: 664, h: 104, peek: [0, -46], fx: 150, fy: 730, mirror: true, kinds: SMALL },
  { ids: ['bush1'], hx: 1560, hy: 686, h: 100, peek: [0, -46], fx: 1470, fy: 760, mirror: false, kinds: SMALL },
  { ids: ['barn', 'door', 'loft', 'win0', 'win1', 'doorA', 'loftA'], hx: 452, hy: 640, h: 138, peek: [70, -6], fx: 600, fy: 700, mirror: true, kinds: [...SMALL, 'cow'] }
];
const FIRST_PEEK_MS = 2500, PEEK_EVERY_MS = 3500, NOISY_AFTER_MS = 10000, GIVE_UP_MS = 35000;

let game: { a: Animal; s: Spot; g: SVGGElement; inner: SVGGElement; img: SVGImageElement; t0: number; nextPeek: number; peeking: boolean; done: boolean } | null = null;
let lastSpot: Spot | null = null;

export const hideActive = () => !!game;

/** Start a round. Returns false if no animal is free to play right now. */
export function startHide(): boolean {
  if (game) return false;
  const spots = SPOTS.filter(s => s !== lastSpot);
  for (let tries = 0; tries < 6; tries++) {
    const s = pick(spots), a = pick(yard.filter(a => s.kinds.includes(a.kind) && a.free()));
    if (!a) continue;
    lastSpot = s;
    run(a, s);
    return true;
  }
  return false;
}

function run(a: Animal, s: Spot) {
  a.busy = true; a.stopClip(); a.setWalk(0, 0);
  a.bounce(); a.say(false);
  setTimeout(() => speak('hide'), 700);
  // Hop over to the hiding place, then slip behind it
  setTimeout(() => {
    const x0 = a.x, y0 = a.y, d = Math.hypot(s.fx - x0, s.fy - y0);
    a.setFacing(s.fx > x0 ? 1 : -1); a.setPose('happy');
    tween(Math.max(700, d * 1.6), t => {
      a.x = x0 + (s.fx - x0) * t; a.y = y0 + (s.fy - y0) * t; a.place();
      a.setWalk(Math.abs(Math.sin(t * Math.PI * 4)) * 22, 0);
    }, () => {
      a.setWalk(0, 0); a.setPose('idle');
      a.g.style.display = 'none';
      hideBehind(a, s);
    });
  }, 1600);
}

function hideBehind(a: Animal, s: Spot) {
  const [pw, ph] = SIZE[`${a.kind}-idle`], w = s.h * pw / ph;
  const g = el('g', { 'data-id': 'hider', transform: `translate(${s.hx},${s.hy})` }, $('lHide')) as SVGGElement;
  g.innerHTML = `<g class="pk"><g ${s.mirror ? 'transform="scale(-1,1)"' : ''}>` +
    `<image href="${url(a.kind + '-idle')}" x="${(-w / 2).toFixed(1)}" y="${-s.h}" width="${w.toFixed(1)}" height="${s.h}" preserveAspectRatio="none"/></g></g>`;
  const inner = g.querySelector('.pk') as SVGGElement, img = g.querySelector('image') as SVGImageElement;
  sfx('rustle');
  const c = SPOTS.indexOf(s) === 3 ? { x: 520, y: 600 } : { x: s.hx, y: s.hy - 40 };
  leaves(c.x - 50, c.x + 50, c.y - 20, c.y + 10);
  game = { a, s, g, inner, img, t0: Date.now(), nextPeek: Date.now() + FIRST_PEEK_MS, peeking: false, done: false };
  objs.hider = { tap: found };
}

function peek(big: boolean) {
  if (!game || game.peeking) return;
  const gm = game, [dx, dy] = gm.s.peek, k = big ? 1.35 : 1;
  gm.peeking = true;
  if (big) sfx(VOICE[gm.a.kind]); else sfx('rustle');
  tween(1500, t => {
    const u = t < .25 ? easeOut(t / .25) : t > .7 ? 1 - easeOut((t - .7) / .3) : 1;
    const wob = t > .25 && t < .7 ? Math.sin((t - .25) / .45 * Math.PI * 4) * 3 : 0;
    gm.inner.setAttribute('transform', `translate(${(dx * k * u).toFixed(1)},${(dy * k * u).toFixed(1)}) rotate(${wob.toFixed(1)} 0 ${-gm.s.h * .5})`);
  }, () => { gm.inner.removeAttribute('transform'); gm.peeking = false; });
}

function found() {
  if (!game || game.done) return;
  const gm = game; gm.done = true;
  delete objs.hider;
  const [dx, dy] = gm.s.peek;
  gm.img.setAttribute('href', url(gm.a.kind + '-happy'));
  sfx('boing');
  tween(380, t => gm.inner.setAttribute('transform', `translate(${(dx * 1.6 * t).toFixed(1)},${(dy * 1.6 * t - 60 * Math.sin(Math.PI * t)).toFixed(1)})`), () => {
    gm.g.remove();
    const a = gm.a;
    a.g.style.display = ''; a.busy = false;
    a.bounce(true); a.say(false);
    const h = a.head();
    confetti(h.x, h.y - 20); sparkleAt(h.x, h.y - 30, 9, true);
    setTimeout(() => sfx('yay'), 200);
    setTimeout(() => speak('peekaboo'), 900);
    game = null;
  });
}

/** Stop quietly (bedtime, leaving the farm, parent panel): the animal just walks back out. */
function abort() {
  if (!game) return;
  const gm = game; game = null; delete objs.hider;
  gm.g.remove(); gm.a.g.style.display = ''; gm.a.busy = false;
}

export function initHideSeek() {
  tapListeners.push(id => { if (game && !game.done && game.s.ids.includes(id)) found(); });
  setInterval(() => {
    if (!game) return;
    if (!state.started || state.asleep || state.scene !== 'farm') { abort(); return; }
    if (!$('panel').hidden || game.done) return;
    const now = Date.now(), age = now - game.t0;
    if (age > GIVE_UP_MS) { found(); return; }               // can't wait any longer: "Peekaboo!"
    if (now > game.nextPeek) {
      const noisy = age > NOISY_AFTER_MS;
      peek(noisy);
      game.nextPeek = now + (noisy ? PEEK_EVERY_MS * .75 : PEEK_EVERY_MS) + rnd(-500, 500);
    }
  }, 250);
}
