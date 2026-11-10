import { el, rnd, clamp, easeOut, inPond } from '../core/util';
import { tween } from '../core/engine';
import { objs, Interactive, Drag } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { ART, HEAD, VOICE, Kind } from '../art/animals';
import { hearts, sparkleAt, ripple } from './fx';

/** Ground area animals can be dragged around in (scene units). */
const YARD = { x0: 60, x1: 1540, y0: 650, y1: 890 };

export class Animal implements Interactive {
  g: SVGGElement;
  r: SVGGElement;
  anim = false;
  busy = false;
  drag?: Drag;
  private off = { x: 0, y: 0 };

  constructor(public kind: Kind, public id: string, public x: number, public y: number, public s: number,
    layer: Element, draggable = false) {
    this.g = el('g', { 'data-id': id }, layer) as SVGGElement;
    this.g.innerHTML = `<g class="react"><g class="idle" style="animation-delay:-${rnd(0, 3).toFixed(2)}s;--d:-${rnd(0, 4.6).toFixed(2)}s"><circle cx="0" cy="-80" r="100" fill="transparent"/>${ART[kind]()}</g></g>`;
    this.r = this.g.firstChild as SVGGElement;
    this.place();
    objs[id] = this;
    if (draggable) this.drag = {
      start: p0 => {
        if (this.anim) return false;
        this.off = { x: this.x - p0.x, y: this.y - p0.y };
        layer.appendChild(this.g); sfx('boing');
      },
      move: p => {
        this.x = clamp(p.x + this.off.x, YARD.x0, YARD.x1);
        this.y = clamp(p.y + this.off.y, YARD.y0, YARD.y1);
        this.place();
        this.r.setAttribute('transform', `rotate(${Math.sin(performance.now() / 90) * 10} 0 -60)`);
      },
      end: () => {
        this.r.removeAttribute('transform');
        if (inPond(this.x, this.y)) { sfx('splash'); ripple(this.x, this.y); }
        this.bounce(); setTimeout(() => this.say(false), 150);
      }
    };
  }

  place() { this.g.setAttribute('transform', `translate(${this.x.toFixed(1)},${this.y.toFixed(1)}) scale(${this.s})`); }
  head() { const h = HEAD[this.kind]; return { x: this.x + h[0] * this.s, y: this.y + h[1] * this.s }; }
  remove() { this.g.remove(); delete objs[this.id]; }

  /** Squash, jump and wobble. Optional spin; "big" for the frog's leap. */
  bounce(spin = false, big = false) {
    if (this.anim) return;
    this.anim = true;
    const H = big ? 160 : 90;
    tween(big ? 900 : 650, t => {
      let ty = 0, sx = 1, sy = 1, rot = 0;
      if (t < .18) { const k = t / .18; sx = 1 + .16 * k; sy = 1 - .2 * k; }
      else {
        const u = (t - .18) / .82;
        ty = -H * Math.sin(Math.PI * u);
        const w = Math.sin(u * Math.PI * 3) * (1 - u) * .14; sx = 1 - w; sy = 1 + w;
        if (spin) rot = 360 * easeOut(u);
      }
      this.r.setAttribute('transform', `translate(0,${ty.toFixed(1)}) rotate(${rot.toFixed(1)} 0 -70) scale(${sx.toFixed(3)},${sy.toFixed(3)})`);
    }, () => { this.r.removeAttribute('transform'); this.anim = false; });
  }

  /** Make its sound, then say its name. */
  say(word = true) {
    const d = sfx(VOICE[this.kind]);
    if (word) setTimeout(() => speak(this.kind), d * 1000 + 80);
  }

  tap() {
    this.bounce(Math.random() < .25);
    this.say();
    const h = this.head();
    if (Math.random() < .5) hearts(h.x, h.y - 30, 3); else sparkleAt(h.x, h.y - 20, 6, true);
  }
}

/** Anything that can be fed an apple. Scene modules register a getter for their animals. */
const feederSources: (() => (Animal | null | undefined)[])[] = [];
export const registerFeeders = (fn: () => (Animal | null | undefined)[]) => feederSources.push(fn);
export function nearestFeeder(x: number, y: number, within = 140): Animal | null {
  let best: Animal | null = null, bd = within;
  for (const src of feederSources) for (const a of src()) {
    if (!a) continue;
    const h = a.head(), d = Math.hypot(h.x - x, h.y - y);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}
