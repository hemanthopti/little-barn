import { $, el, S, rnd, pick, clamp, bounceOut, easeOutBack } from '../core/util';
import { tween } from '../core/engine';
import { objs, Interactive } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { APPLE } from '../art/props';
import { Animal, nearestFeeder } from './animal';
import { hearts, leaves } from './fx';

const REGROW_MS = 7000;
const MAX_GROUND_APPLES = 6;
const CANOPY = [[1320, 330, 112], [1215, 385, 86], [1425, 385, 86], [1255, 268, 82], [1390, 262, 82], [1320, 212, 76]];
const APPLE_SPOTS = [[1235, 360], [1330, 300], [1405, 370], [1290, 410], [1370, 238], [1200, 305], [1440, 325]];

type GroundApple = Interactive & { id: string; g: SVGGElement; x: number; y: number };
const ground: GroundApple[] = [];
let n = 0;

export function initTree() {
  const canopy = $('canopy');
  canopy.innerHTML =
    CANOPY.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#4FAF4A" ${S} stroke-width="5"/>`).join('') +
    CANOPY.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 3}" fill="#4FAF4A"/>`).join('') +
    `<circle cx="1280" cy="250" r="30" fill="#6CC85C"/><circle cx="1400" cy="300" r="24" fill="#6CC85C"/><circle cx="1210" cy="360" r="20" fill="#6CC85C"/>`;

  const onTree = APPLE_SPOTS.map(([x, y]) => {
    const g = el('g', { transform: `translate(${x},${y})` }, canopy); g.innerHTML = APPLE;
    return { x, y, g, on: true };
  });

  const shake = () => tween(600, t => canopy.setAttribute('transform', `rotate(${Math.sin(t * Math.PI * 5) * (1 - t) * 4} 1325 640)`),
    () => canopy.removeAttribute('transform'));

  objs.tree = {
    tap() {
      sfx('rustle'); shake(); leaves(1200, 1440, 300, 420);
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
  g.innerHTML = `<g><circle r="34" fill="transparent"/>${APPLE}</g>`;
  const r = g.firstChild as SVGGElement;
  let s = 1.6, busy = true, off = { x: 0, y: 0 };
  const o: GroundApple = { id, g, x: x0, y: y0, tap: () => { }, drag: undefined };
  const place = () => g.setAttribute('transform', `translate(${o.x.toFixed(1)},${o.y.toFixed(1)}) scale(${s})`);
  const fallTo = (gx: number, gy: number, dur: number) => {
    const sx = o.x, sy = o.y; busy = true;
    tween(dur, t => { o.x = sx + (gx - sx) * t; o.y = sy + (gy - sy) * bounceOut(t); place(); }, () => { busy = false; sfx('thud'); });
  };
  fallTo(clamp(x0 + rnd(-70, 70), 1160, 1500), rnd(690, 760), 850);

  o.tap = () => {
    if (busy) return;
    sfx('pop'); speak('apple');
    tween(400, t => r.setAttribute('transform', `translate(0,${-30 * Math.sin(Math.PI * t)})`), () => r.removeAttribute('transform'));
  };
  o.drag = {
    start: p0 => { if (busy) return false; off = { x: o.x - p0.x, y: o.y - p0.y }; layer.appendChild(g); s = 1.9; place(); sfx('pop'); },
    move: p => { o.x = p.x + off.x; o.y = p.y + off.y; place(); },
    end: () => {
      s = 1.6;
      const a = nearestFeeder(o.x, o.y);
      if (a) eat(a, o);
      else if (o.y < 660) fallTo(o.x, rnd(680, 760), 600);
      else place();
    }
  };
  objs[id] = o; ground.push(o);
  if (ground.length > MAX_GROUND_APPLES) removeApple(ground[0]);
}

function eat(a: Animal, o: GroundApple) {
  delete objs[o.id];
  const i = ground.indexOf(o); if (i >= 0) ground.splice(i, 1);
  const h = a.head(), mx = h.x, my = h.y + 25 * a.s, sx = o.x, sy = o.y;
  tween(350, t => o.g.setAttribute('transform', `translate(${sx + (mx - sx) * t},${sy + (my - sy) * t}) scale(${1.6 * (1 - t) + .01})`), () => {
    o.g.remove(); sfx('chomp'); a.bounce(); hearts(h.x, h.y - 30, 6);
    setTimeout(() => speak('yummy'), 550);
  });
}
