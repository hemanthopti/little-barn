import { $, el } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs } from '../core/input';
import { state, changed } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { BALLOON } from '../art/props';
import { Animal, registerFeeders } from './animal';
import { sparkleAt, ripple } from './fx';

/** One surprise visitor per day. Each make() returns a cleanup function. Add new visitors here. */
type Visitor = { name: string; make(): () => void };
let frog: Animal | null = null;
registerFeeders(() => [frog]);

export const VISITORS: Visitor[] = [
  {
    name: 'Frog',
    make() {
      const layer = $('lVisitor');
      const pad = el('ellipse', { cx: 990, cy: 808, rx: 46, ry: 15, fill: '#3E9E3A', stroke: '#2F7A2B', 'stroke-width': 3 }, layer);
      const f = new Animal('frog', 'frog', 990, 806, .62, layer);
      f.tap = () => { f.say(); f.bounce(false, true); setTimeout(() => { sfx('splash'); ripple(f.x, f.y + 4); }, 850); };
      frog = f;
      return () => { pad.remove(); f.remove(); frog = null; };
    }
  },
  {
    name: 'Balloon',
    make() {
      const g = el('g', { 'data-id': 'balloon' }, $('lBalloon'));
      g.innerHTML = `<g>${BALLOON}</g>`;
      const r = g.firstChild as Element;
      const o = { x: 140, y: 250, t: 0 };
      const tick = (dt: number) => {
        o.x += dt * .022; if (o.x > 1760) o.x = -160; o.t += dt;
        g.setAttribute('transform', `translate(${o.x.toFixed(1)},${(o.y + Math.sin(o.t / 800) * 12).toFixed(1)}) scale(.9)`);
      };
      tickers.add(tick); tick(0);
      objs.balloon = {
        tap() {
          sfx('boing'); sparkleAt(o.x, o.y - 70, 7, true); setTimeout(() => speak('balloon'), 300);
          tween(800, t => r.setAttribute('transform', `translate(0,${-90 * Math.sin(Math.PI * t)})`), () => r.removeAttribute('transform'));
        }
      };
      return () => { tickers.delete(tick); g.remove(); delete objs.balloon; };
    }
  },
  {
    name: 'Rainbow',
    make() {
      const g = el('g', { 'data-id': 'rainbow', opacity: .9 }, $('lRainbow'));
      g.innerHTML = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA'].map((c, i) => {
        const r = 440 - i * 20;
        return `<path d="M${820 - r},612 A${r},${r} 0 0 1 ${820 + r},612" fill="none" stroke="${c}" stroke-width="21"/>`;
      }).join('');
      objs.rainbow = {
        tap() {
          sfx('chimeUp');
          for (let i = 0; i < 5; i++) {
            const a = Math.PI * (0.15 + 0.7 * Math.random());
            setTimeout(() => sparkleAt(820 - Math.cos(a) * 390, 612 - Math.sin(a) * 390, 5, true), i * 120);
          }
          setTimeout(() => speak('rainbow'), 300);
        }
      };
      return () => { g.remove(); delete objs.rainbow; };
    }
  }
];

let clear: (() => void) | null = null;
export function showVisitor(i: number) {
  clear?.();
  state.visitor = i;
  clear = VISITORS[i].make();
  changed();
}
export function initVisitors() {
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  showVisitor(day % VISITORS.length);
}
