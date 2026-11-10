import { $, el, rnd, pick, clamp, bounceOut, easeOutBack } from '../core/util';
import { tween } from '../core/engine';
import { objs, Interactive } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { img, fit } from '../art/sprites';
import { Animal, nearestFeeder } from './animal';
import { hearts, leaves } from './fx';

const REGROW_MS = 7000;
const MAX_GROUND_APPLES = 6;
/** Tree art box in the scene (matches index.html). */
const TREE = { x: 1120, y: 220, w: 419.8, h: 470 };
/** Apple spots as fractions of the tree box, all inside the leaves. */
const SPOTS = [[.3, .28], [.52, .17], [.74, .3], [.42, .46], [.63, .5], [.2, .5], [.86, .5]];
const APPLE_TREE = fit('apple', undefined, 46), APPLE_GROUND = fit('apple', undefined, 56);

type GroundApple = Interactive & { id: string; g: SVGGElement; x: number; y: number };
const ground: GroundApple[] = [];
let n = 0;

export function initTree() {
  const canopy = $('canopy');
  const onTree = SPOTS.map(([fx, fy]) => {
    const x = TREE.x + fx * TREE.w, y = TREE.y + fy * TREE.h;
    const g = el('g', { transform: `translate(${x},${y})` }, canopy);
    g.innerHTML = img('apple', 0, 0, APPLE_TREE[0], APPLE_TREE[1], 'center');
    return { x, y, g, on: true };
  });

  const shake = () => tween(600, t => canopy.setAttribute('transform', `rotate(${Math.sin(t * Math.PI * 5) * (1 - t) * 2.5} 1335 690)`),
    () => canopy.removeAttribute('transform'));

  objs.tree = {
    tap() {
      sfx('rustle'); shake(); leaves(1180, 1480, 280, 500);
      const avail = onTree.filter(a => a.on); if (!avail.length) return;
      const a = pick(avail); a.on = false; a.g.setAttribute('opacity', '0');
      dropApple(a.x, a.y); setTimeout(() => speak('apple'), 500);
      setTimeout(() => tween(500, t => {
        a.g.setAttribute('opacity', '1');
        a.g.setAttribute('transform', `translate(${a.x},${a.y}) scale(${Math.max(.01, easeOutBack(t))})`);
      }, () => { a.on = true; }), REGROW_MS);
    }
  };
}

function removeApple(o: GroundApple) {
  const i = ground.indexOf(o); if (i >= 0) ground.splice(i, 1);
  delete objs[o.id]; o.g.remove();
}

function dropApple(x0: number, y0: number) {
  const layer = $('lActors');
  const id = 'ap' + (n++);
  const g = el('g', { 'data-id': id }, layer) as SVGGElement;
  g.innerHTML = `<g><ellipse cx="0" cy="${APPLE_GROUND[1] / 2 - 2}" rx="22" ry="6" fill="url(#shadowG)"/><circle r="40" fill="transparent"/>${img('apple', 0, 0, APPLE_GROUND[0], APPLE_GROUND[1], 'center')}</g>`;
  const r = g.firstChild as SVGGElement;
  let s = 1, busy = true, off = { x: 0, y: 0 };
  const o: GroundApple = { id, g, x: x0, y: y0, tap: () => { }, drag: undefined };
  const place = () => g.setAttribute('transform', `translate(${o.x.toFixed(1)},${o.y.toFixed(1)}) scale(${s})`);
  const fallTo = (gx: number, gy: number, dur: number) => {
    const sx = o.x, sy = o.y; busy = true;
    tween(dur, t => { o.x = sx + (gx - sx) * t; o.y = sy + (gy - sy) * bounceOut(t); place(); }, () => { busy = false; sfx('thud'); });
  };
  fallTo(clamp(x0 + rnd(-70, 70), 1170, 1510), rnd(705, 770), 850);

  o.tap = () => {
    if (busy) return;
    sfx('pop'); speak('apple');
    tween(400, t => r.setAttribute('transform', `translate(0,${-30 * Math.sin(Math.PI * t)})`), () => r.removeAttribute('transform'));
  };
  o.drag = {
    start: p0 => { if (busy) return false; off = { x: o.x - p0.x, y: o.y - p0.y }; layer.appendChild(g); s = 1.2; place(); sfx('pop'); },
    move: p => { o.x = p.x + off.x; o.y = p.y + off.y; place(); },
    end: () => {
      s = 1;
      const a = nearestFeeder(o.x, o.y);
      if (a) eat(a, o);
      else if (o.y < 670) fallTo(o.x, rnd(690, 770), 600);
      else place();
    }
  };
  objs[id] = o; ground.push(o);
  if (ground.length > MAX_GROUND_APPLES) removeApple(ground[0]);
}

function eat(a: Animal, o: GroundApple) {
  delete objs[o.id];
  const i = ground.indexOf(o); if (i >= 0) ground.splice(i, 1);
  const h = a.head(), mx = h.x, my = h.y + a.h * .15, sx = o.x, sy = o.y;
  tween(350, t => o.g.setAttribute('transform', `translate(${sx + (mx - sx) * t},${sy + (my - sy) * t}) scale(${1 - t + .01})`), () => {
    o.g.remove(); sfx('chomp'); a.bounce(); hearts(h.x, h.y - 30, 6);
    setTimeout(() => speak('yummy'), 550);
  });
}
