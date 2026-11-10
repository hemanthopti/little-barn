import { $, el, rnd, pick, easeOut, starPath } from '../core/util';
import { tween } from '../core/engine';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { HEART } from '../art/props';

/** Particle effects. All live in the #fx layer on top of everything and ignore touches. */
const layer = () => $('fx') as SVGGElement;

function fx(html: string, x: number, y: number) {
  const g = el('g', { transform: `translate(${x},${y})`, opacity: 0 }, layer());
  g.innerHTML = html; return g;
}
const fade = (g: Element, o: number) => g.setAttribute('opacity', String(o));

export function hearts(x: number, y: number, n = 5) {
  for (let i = 0; i < n; i++) {
    const g = fx(HEART, x, y), dx = rnd(-90, 90), rise = rnd(110, 190), s0 = rnd(.9, 1.6);
    setTimeout(() => tween(1100, t => {
      g.setAttribute('transform', `translate(${x + dx * t},${y - rise * t}) scale(${s0 * Math.min(1, t / .2)})`);
      fade(g, t < .6 ? 1 : 1 - (t - .6) / .4);
    }, () => g.remove()), i * 90);
  }
}

export function sparkleAt(x: number, y: number, n = 7, quiet = false) {
  if (!quiet) sfx('sparkle');
  for (let i = 0; i < n; i++) {
    const c = pick(['#FFD23F', '#fff', '#FF9FB2', '#8FE3FF']);
    const g = fx(`<path d="${starPath(14, 6)}" fill="${c}" stroke="#E0A800" stroke-width="1.5"/>`, x, y);
    const a = Math.PI * 2 * i / n + rnd(-.3, .3), d = rnd(70, 120);
    tween(700, t => {
      const k = easeOut(t);
      g.setAttribute('transform', `translate(${x + Math.cos(a) * d * k},${y + Math.sin(a) * d * k}) rotate(${t * 180}) scale(${1.2 - t * .8})`);
      fade(g, 1 - t * t);
    }, () => g.remove());
  }
}

/** What happens when a toddler taps empty sky or grass: no touch is ever wasted. */
export function burst(x: number, y: number) {
  sfx('pop');
  for (let i = 0; i < 8; i++) {
    const star = Math.random() < (state.night ? .8 : .35);
    const c = pick(['#FF7BAC', '#FFD23F', '#7FD6FF', '#B98CFF', '#8EE07A']);
    const g = fx(star ? `<path d="${starPath(16, 7)}" fill="${c}"/>`
      : `<circle r="14" fill="${c}" fill-opacity=".35" stroke="#fff" stroke-width="3"/><circle cx="-5" cy="-5" r="3.5" fill="#fff"/>`, x, y);
    const a = Math.PI * 2 * i / 8 + rnd(-.3, .3), d = rnd(60, 120), s = rnd(.8, 1.6);
    tween(750, t => {
      const k = easeOut(t);
      g.setAttribute('transform', `translate(${x + Math.cos(a) * d * k},${y + Math.sin(a) * d * k - 30 * t}) scale(${s * (.4 + .6 * Math.min(1, t * 4))})`);
      fade(g, 1 - t * t);
    }, () => g.remove());
  }
}

export function trail(x: number, y: number) {
  const g = fx(`<path d="${starPath(11, 5)}" fill="${pick(['#FFD23F', '#fff', '#FF9FB2'])}"/>`, x, y);
  tween(600, t => { g.setAttribute('transform', `translate(${x},${y + 20 * t}) scale(${1 - t * .7})`); fade(g, 1 - t); }, () => g.remove());
}

export function ripple(x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const g = fx(`<ellipse rx="20" ry="7" fill="none" stroke="#fff" stroke-width="4"/>`, x, y);
    setTimeout(() => tween(900, t => { g.setAttribute('transform', `translate(${x},${y}) scale(${1 + t * 3.5})`); fade(g, 1 - t); }, () => g.remove()), i * 160);
  }
  for (let i = 0; i < 6; i++) {
    const g = fx(`<circle r="6" fill="#B9E6FF" stroke="#2E8BC0" stroke-width="1.5"/>`, x, y);
    const dx = rnd(-60, 60), h = rnd(50, 110);
    tween(600, t => { g.setAttribute('transform', `translate(${x + dx * t},${y - h * Math.sin(Math.PI * t)})`); fade(g, 1 - t * .5); }, () => g.remove());
  }
}

export function butterfly(x: number, y: number) {
  const c = pick(['#FF7BAC', '#FFB830', '#8C7BFF', '#46C2FF']), c2 = pick(['#FFE066', '#fff', '#FFC9DE']);
  const w = (cx: number, cy: number, rx: number, ry: number, f: string) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" stroke="#3A2E2A" stroke-width="2"/>`;
  const g = fx(w(-12, -6, 15, 12, c) + w(12, -6, 15, 12, c) + w(-9, 9, 9, 8, c2) + w(9, 9, 9, 8, c2) + `<rect x="-3" y="-15" width="6" height="30" rx="3" fill="#3A2E2A"/>`, x, y);
  fade(g, 1);
  const dir = Math.random() < .5 ? -1 : 1;
  tween(4200, t => {
    const px = x + dir * t * 520 + Math.sin(t * 20) * 30, py = y - t * 750 + Math.sin(t * 13) * 25;
    const flap = .25 + .75 * Math.abs(Math.sin(t * 70));
    g.setAttribute('transform', `translate(${px},${py}) scale(${1.6 * flap},1.6)`);
  }, () => g.remove());
}

export function leaves(x0: number, x1: number, y0: number, y1: number) {
  for (let i = 0; i < 4; i++) {
    const x = rnd(x0, x1), y = rnd(y0, y1), fall = rnd(220, 300);
    const g = fx(`<ellipse rx="10" ry="5" fill="#4FAF4A" stroke="#2F7A2B" stroke-width="2"/>`, x, y);
    tween(1400, t => {
      g.setAttribute('transform', `translate(${x + Math.sin(t * 8) * 22},${y + fall * t}) rotate(${Math.sin(t * 8) * 50})`);
      fade(g, t < .8 ? 1 : (1 - t) * 5);
    }, () => g.remove());
  }
}

export function raindrop(x: number, y0: number, ty: number, landed: () => void) {
  const g = fx(`<path d="M0,-12 q7,11 0,16 q-7,-5 0,-16z" fill="#7FD0F7" stroke="#2E8BC0" stroke-width="1.5"/>`, x, y0);
  fade(g, 1);
  const dist = ty - y0;
  tween(dist / .9, t => g.setAttribute('transform', `translate(${x},${y0 + dist * t * t})`), () => { g.remove(); landed(); });
}

/** Pulsing ring, used while the parrot listens. Returns a function that removes it. */
export function pulseRing(x: number, y: number, ms: number) {
  const g = fx(`<circle r="40" fill="none" stroke="#FFD23F" stroke-width="6"/>`, x, y); fade(g, 1);
  tween(ms, t => g.setAttribute('transform', `translate(${x},${y}) scale(${1 + .25 * Math.sin(t * 30)})`), () => g.remove());
}
