import { $, el, S, rnd, pick, easeOutBack, inPond } from '../core/util';
import { tween } from '../core/engine';
import { objs, Interactive } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { flowerArt } from '../art/props';
import { yard } from './yard';
import { ripple, butterfly } from './fx';

const MAX_FLOWERS = 30;
const flowers: (Interactive & { id: string; g: Element })[] = [];
let n = 0;

export function addFlower(x: number, y: number, instant = false) {
  const id = 'fl' + (n++);
  const g = el('g', { 'data-id': id }, $('lFlowers'));
  const petal = pick(['#FF7BAC', '#FFD23F', '#B57BFF', '#FF8A3D', '#fff', '#7FD6FF']);
  g.innerHTML = `<g>${flowerArt(petal, petal === '#FFD23F' ? '#E8483B' : '#FFD23F')}</g>`;
  const r = g.firstChild as Element;
  const place = (k: number) => g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k})`);
  if (instant) place(1); else tween(500, t => place(Math.max(.01, easeOutBack(t))));
  const o = {
    id, g,
    tap() {
      sfx('sparkle'); butterfly(x, y - 45);
      tween(450, t => r.setAttribute('transform', `translate(0,${-24 * Math.sin(Math.PI * t)}) rotate(${Math.sin(t * Math.PI * 4) * 12} 0 -40)`),
        () => r.removeAttribute('transform'));
      setTimeout(() => speak(Math.random() < .5 ? 'flower' : 'butterfly'), 250);
    }
  };
  objs[id] = o; flowers.push(o);
  if (flowers.length > MAX_FLOWERS) { const old = flowers.shift()!; delete objs[old.id]; old.g.remove(); }
}

export function initGround() {
  // Pond
  objs.pond = {
    tap(p) {
      sfx('splash'); ripple(p.x, p.y);
      if (Math.random() < .5) setTimeout(() => speak('water'), 300);
      const duck = yard.find(a => a.kind === 'duck');
      if (duck && inPond(duck.x, duck.y) && Math.random() < .5) setTimeout(() => duck.tap(), 250);
    }
  };

  // Fence
  let fh = `<rect x="592" y="550" width="664" height="11" rx="4" fill="#F3E3C3" ${S} stroke-width="3"/><rect x="592" y="578" width="664" height="11" rx="4" fill="#F3E3C3" ${S} stroke-width="3"/>`;
  for (let x = 600; x <= 1240; x += 64) fh += `<rect x="${x}" y="538" width="14" height="70" rx="4" fill="#F3E3C3" ${S} stroke-width="3"/>`;
  $('fence').innerHTML = fh;

  // Grass tufts
  let th = '';
  for (let i = 0; i < 26; i++) {
    const x = rnd(0, 1600), y = rnd(640, 895);
    if (inPond(x, y) || (x > 240 && x < 440)) continue;
    const X = x.toFixed(0), Y = y.toFixed(0);
    th += `<path d="M${X},${Y} l-6,-14 M${X},${Y} l0,-18 M${X},${Y} l6,-14"/>`;
  }
  $('tufts').innerHTML = th;

  // Starting flowers
  [[90, 880], [210, 870], [610, 885], [700, 872], [980, 885], [1290, 880], [1380, 892], [1560, 870], [60, 700], [580, 680]]
    .forEach(([x, y]) => addFlower(x, y, true));
}
