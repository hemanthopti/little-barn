export const NS = 'http://www.w3.org/2000/svg';
export const $ = (id: string): any => document.getElementById(id);
/** Standard dark outline used by all art. */
export const S = 'stroke="#3A2E2A" stroke-width="4" stroke-linejoin="round"';

export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export function bounceOut(t: number) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
  return n * (t -= 2.625 / d) * t + .984375;
}

export function el(tag: string, attrs: Record<string, any> = {}, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

export function starPath(r1: number, r2: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = Math.PI / 5 * i - Math.PI / 2;
    d += (i ? 'L' : 'M') + (Math.cos(a) * r).toFixed(1) + ',' + (Math.sin(a) * r).toFixed(1);
  }
  return d + 'Z';
}

/** Pond geometry, shared by several scene modules. */
export const POND = { cx: 830, cy: 792, rx: 205, ry: 56 };
export const inPond = (x: number, y: number) => ((x - POND.cx) / POND.rx) ** 2 + ((y - POND.cy) / POND.ry) ** 2 < 1;
