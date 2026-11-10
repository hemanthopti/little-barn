import { $, el, rnd, pick, easeOutBack, inPond } from '../core/util';
import { tween } from '../core/engine';
import { objs, Interactive } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { img, fit } from '../art/sprites';
import { yard } from './yard';
import { ripple, butterfly, leaves, sparkleAt } from './fx';

const MAX_FLOWERS = 30;
const FLOWER_H = 60;
const flowers: (Interactive & { id: string; g: Element; x: number; y: number })[] = [];
export const flowerSpots = () => flowers.map(f => ({ x: f.x, y: f.y, tap: () => f.tap({ x: f.x, y: f.y }) }));
let n = 0;

/** Flowers only grow on open grass: not in or around the pond, not on the path, not under the barn. */
export function flowerSpotOk(x: number, y: number) {
  if (((x - 830) / 262) ** 2 + ((y - 782) / 96) ** 2 < 1) return false;           // pond and its rim
  if (y > 640) { const cx = 330 + (y - 655) * .457, hw = 55 + (y - 655) * .48; if (Math.abs(x - cx) < hw) return false; } // path
  if (x < 590 && y < 680) return false;                                              // barn front
  return y > 680;
}

export function addFlower(x: number, y: number, instant = false) {
  const id = 'fl' + (n++);
  const g = el('g', { 'data-id': id }, $('lFlowers'));
  const name = pick(['flower-1', 'flower-2', 'flower-3']), [w, h] = fit(name, undefined, FLOWER_H);
  g.innerHTML = `<g><rect x="${-w * .6}" y="${-h * 1.05}" width="${w * 1.2}" height="${h * 1.1}" fill="transparent"/>${img(name, 0, 0, w, h)}</g>`;
  const r = g.firstChild as Element;
  const place = (k: number) => g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})`);
  if (instant) place(1); else tween(500, t => place(Math.max(.01, easeOutBack(t))));
  const o = {
    id, g, x, y,
    tap() {
      sfx('sparkle'); butterfly(x, y - h * .8);
      tween(450, t => r.setAttribute('transform', `translate(0,${-20 * Math.sin(Math.PI * t)}) rotate(${Math.sin(t * Math.PI * 4) * 10} 0 ${-h * .6})`),
        () => r.removeAttribute('transform'));
      setTimeout(() => speak(Math.random() < .5 ? 'flower' : 'butterfly'), 250);
    }
  };
  objs[id] = o; flowers.push(o);
  if (flowers.length > MAX_FLOWERS) { const old = flowers.shift()!; delete objs[old.id]; old.g.remove(); }
}

/** A decoration that wobbles when tapped. */
function decor(id: string, name: string, x: number, y: number, w: number, onTap: (x: number, y: number) => void) {
  const [dw, dh] = fit(name, w);
  const g = el('g', { 'data-id': id }, $('lDecor'));
  g.innerHTML = `<ellipse cx="0" cy="-3" rx="${dw * .42}" ry="${dh * .1}" fill="url(#shadowG)"/><g>${img(name, 0, 0, dw, dh)}</g>`;
  g.setAttribute('transform', `translate(${x},${y})`);
  const r = g.lastChild as Element;
  objs[id] = { tap() {
    onTap(x, y - dh * .6);
    tween(500, t => { const k = Math.sin(t * Math.PI * 3) * (1 - t) * .08; r.setAttribute('transform', `scale(${1 + k},${1 - k})`); }, () => r.removeAttribute('transform'));
  } };
}

export function initGround() {
  objs.pond = {
    tap(p) {
      sfx('splash'); ripple(p.x, p.y);
      if (Math.random() < .5) setTimeout(() => speak('water'), 300);
      const duck = yard.find(a => a.kind === 'duck');
      if (duck && inPond(duck.x, duck.y) && Math.random() < .5) setTimeout(() => duck.tap(), 250);
    }
  };

  decor('bush0', 'bush', 40, 668, 210, (x, y) => { sfx('rustle'); leaves(x - 60, x + 60, y - 20, y + 10); butterfly(x, y); });
  decor('bush1', 'bush', 1585, 690, 200, (x, y) => { sfx('rustle'); leaves(x - 60, x + 60, y - 20, y + 10); butterfly(x, y); });
  decor('hay', 'hay', 640, 662, 140, (x, y) => { sfx('boing'); sparkleAt(x, y, 6, true); });

  // Starting flowers: on open grass, away from the pond and the path
  [[110, 880], [220, 860], [600, 890], [700, 885], [990, 890], [1290, 880], [1390, 895], [1560, 875], [60, 760], [1540, 760]]
    .forEach(([x, y]) => addFlower(x, y, true));
}

export const randomGroundSpot = () => ({ x: rnd(60, 1540), y: rnd(690, 890) });
