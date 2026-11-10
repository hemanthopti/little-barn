import { el, clamp, easeOut, inPond } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs, Interactive, Drag, Hold } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { VOICE, Kind, Pose } from '../art/animals';
import { SIZE, url } from '../art/sprites';
import { hearts, sparkleAt, ripple } from './fx';

/** Ground area animals can be dragged around in (scene units). */
const YARD = { x0: 60, x1: 1540, y0: 660, y1: 890 };

/**
 * A painted animal. (x, y) is the point between its feet; h is its standing height in scene units.
 * It shows the idle pose, switches to happy while it reacts, and to sleep at bedtime.
 */
export class Animal implements Interactive {
  static all = new Set<Animal>();
  g: SVGGElement;
  r: SVGGElement;
  private image: SVGImageElement;
  private shadow: SVGEllipseElement | null;
  private unit: number;
  pose: Pose = 'idle';
  anim = false;
  busy = false;
  dragging = false;
  private walkG: SVGGElement;
  private faceG: SVGGElement;
  facing: 1 | -1 = -1;
  drag?: Drag;
  hold?: Hold;
  private petting = false;
  private off = { x: 0, y: 0 };

  constructor(public kind: Kind, public id: string, public x: number, public y: number, public h: number,
    layer: Element, draggable = false, withShadow = true) {
    const [iw, ih] = SIZE[`${kind}-idle`];
    this.unit = h / ih;
    const w = iw * this.unit;
    this.g = el('g', { 'data-id': id }, layer) as SVGGElement;
    this.g.innerHTML = (withShadow ? `<ellipse cx="0" cy="-2" rx="${(w * .4).toFixed(1)}" ry="${(h * .07).toFixed(1)}" fill="url(#shadowG)"/>` : '') +
      `<g class="react"><g class="walk"><g class="face"><g class="idle" style="animation-delay:-${(Math.random() * 3).toFixed(2)}s">` +
      `<rect x="${(-w * .55).toFixed(1)}" y="${(-h * 1.05).toFixed(1)}" width="${(w * 1.1).toFixed(1)}" height="${(h * 1.1).toFixed(1)}" fill="transparent"/>` +
      `<image preserveAspectRatio="none"/></g></g></g></g>`;
    this.shadow = withShadow ? this.g.querySelector('ellipse') : null;
    this.r = this.g.querySelector('.react') as SVGGElement;
    this.image = this.g.querySelector('image') as SVGImageElement;
    this.walkG = this.g.querySelector('.walk') as SVGGElement;
    this.faceG = this.g.querySelector('.face') as SVGGElement;
    this.setPose(state.asleep ? 'sleep' : 'idle');
    this.place();
    objs[id] = this;
    Animal.all.add(this);
    // Petting: hold a finger on the animal. It closes its eyes happily, hearts float up, the kitten purrs.
    this.hold = {
      start: () => {
        if (state.asleep || this.anim || this.busy) return;
        this.petting = true; this.busy = true; this.setPose('happy'); this.setWalk(0, 0);
        let t = 0, heartT = 0, soundT = 0;
        const tick = (dt: number) => {
          if (!this.petting) { tickers.delete(tick); return; }
          t += dt; heartT += dt; soundT += dt;
          this.setWalk(0, Math.sin(t / 140) * 4);
          if (heartT > 320) { heartT = 0; const h = this.head(); hearts(h.x + (Math.random() - .5) * this.h * .4, h.y - 10, 1); }
          if (soundT > 1000) { soundT = 0; sfx(this.kind === 'kitten' ? 'purr' : 'content'); }
        };
        sfx(this.kind === 'kitten' ? 'purr' : 'content');
        tickers.add(tick);
      },
      end: () => {
        if (!this.petting) return;
        this.petting = false; this.busy = false; this.setWalk(0, 0); this.rest();
        setTimeout(() => this.say(false), 100);
      }
    };
    if (draggable) this.drag = {
      start: p0 => {
        if (this.anim || state.asleep) return false;
        this.off = { x: this.x - p0.x, y: this.y - p0.y };
        this.dragging = true; this.setWalk(0, 0);
        layer.appendChild(this.g); sfx('boing'); this.setPose('happy');
      },
      move: p => {
        this.x = clamp(p.x + this.off.x, YARD.x0, YARD.x1);
        this.y = clamp(p.y + this.off.y, YARD.y0, YARD.y1);
        this.place();
        this.r.setAttribute('transform', `rotate(${Math.sin(performance.now() / 90) * 8} 0 ${-this.h * .4})`);
      },
      end: () => {
        this.r.removeAttribute('transform'); this.setPose('idle'); this.dragging = false; this.place();
        if (inPond(this.x, this.y)) { sfx('splash'); ripple(this.x, this.y); }
        this.bounce(); setTimeout(() => this.say(false), 150);
      }
    };
  }

  setPose(p: Pose) {
    this.pose = p;
    const [pw, ph] = SIZE[`${this.kind}-${p}`];
    const w = pw * this.unit, h = ph * this.unit;
    this.image.setAttribute('href', url(`${this.kind}-${p}`));
    this.image.setAttribute('x', (-w / 2).toFixed(1)); this.image.setAttribute('y', (-h).toFixed(1));
    this.image.setAttribute('width', w.toFixed(1)); this.image.setAttribute('height', h.toFixed(1));
  }
  private rest() { this.setPose(state.asleep ? 'sleep' : 'idle'); }

  place() {
    this.g.setAttribute('transform', `translate(${this.x.toFixed(1)},${this.y.toFixed(1)})`);
    this.g.dataset.y = String(this.dragging ? 99999 : this.y);
  }
  /** Face left (-1) or right (1). The painted animals all look to the left, so facing right means mirroring. */
  setFacing(d: 1 | -1) { if (d === this.facing) return; this.facing = d; this.faceG.setAttribute('transform', d > 0 ? 'scale(-1,1)' : ''); }
  /** Walking/sniffing body motion: lift (scene units) and tilt (degrees). */
  setWalk(lift: number, tilt: number) {
    if (!lift && !tilt) { this.walkG.removeAttribute('transform'); return; }
    this.walkG.setAttribute('transform', `translate(0,${(-lift).toFixed(1)}) rotate(${tilt.toFixed(1)} 0 ${(-this.h * .3).toFixed(1)})`);
  }
  /** Free to do things on its own: not tapped, dragged, busy or asleep. */
  free() { return !this.anim && !this.dragging && !this.busy && !state.asleep; }
  head() { return { x: this.x, y: this.y - this.h * (this.pose === 'sleep' ? .45 : .72) }; }
  remove() { this.g.remove(); delete objs[this.id]; Animal.all.delete(this); }

  /** Squash, jump in the happy pose and land. Optional spin; "big" for the frog's leap. */
  bounce(spin = false, big = false) {
    if (this.anim) return;
    this.anim = true;
    if (!state.asleep) this.setPose('happy');
    const H = this.h * (big ? .9 : .5);
    tween(big ? 900 : 700, t => {
      let ty = 0, sx = 1, sy = 1, rot = 0;
      if (t < .15) { const k = t / .15; sx = 1 + .12 * k; sy = 1 - .14 * k; }
      else {
        const u = (t - .15) / .85;
        ty = -H * Math.sin(Math.PI * u);
        const w = Math.sin(u * Math.PI * 3) * (1 - u) * .1; sx = 1 - w; sy = 1 + w;
        if (spin) rot = 360 * easeOut(u);
      }
      this.r.setAttribute('transform', `translate(0,${ty.toFixed(1)}) rotate(${rot.toFixed(1)} 0 ${(-this.h * .45).toFixed(1)}) scale(${sx.toFixed(3)},${sy.toFixed(3)})`);
      if (this.shadow) { const k = 1 - .5 * (-ty / (H || 1)); this.shadow.setAttribute('transform', `scale(${k.toFixed(3)})`); }
    }, () => { this.r.removeAttribute('transform'); this.shadow?.removeAttribute('transform'); this.anim = false; this.rest(); });
  }

  /** Make its sound, then say its name. */
  say(word = true) {
    const d = sfx(VOICE[this.kind]);
    if (word) setTimeout(() => speak(this.kind), d * 1000 + 80);
  }

  tap() {
    this.bounce(Math.random() < .2);
    this.say();
    const h = this.head();
    if (Math.random() < .5) hearts(h.x, h.y - 30, 3); else sparkleAt(h.x, h.y - 20, 6, true);
  }
}

/** Put every animal to sleep or wake them all (bedtime). */
export function allPose(p: Pose) { Animal.all.forEach(a => { if (!a.anim) a.setPose(p); }); }

/** Anything that can be fed an apple. Scene modules register a getter for their animals. */
const feederSources: (() => (Animal | null | undefined)[])[] = [];
export const registerFeeders = (fn: () => (Animal | null | undefined)[]) => feederSources.push(fn);
export function nearestFeeder(x: number, y: number, within = 150): Animal | null {
  let best: Animal | null = null, bd = within;
  for (const src of feederSources) for (const a of src()) {
    if (!a) continue;
    const h = a.head(), d = Math.hypot(h.x - x, h.y - y);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}
