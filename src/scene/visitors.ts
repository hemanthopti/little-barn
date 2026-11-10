import { $, el } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs } from '../core/input';
import { state, changed } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { img, fit } from '../art/sprites';
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
      const f = new Animal('frog', 'frog', 1005, 812, 95, layer, false, false);
      f.tap = () => { f.say(); f.bounce(false, true); setTimeout(() => { sfx('splash'); ripple(f.x, f.y + 4); }, 850); };
      frog = f;
      return () => { f.remove(); frog = null; };
    }
  },
  {
    name: 'Balloon',
    make() {
      const g = el('g', { 'data-id': 'balloon' }, $('lBalloon'));
      const [bw, bh] = fit('balloon', 125);
      g.innerHTML = `<g><circle cx="0" cy="-60" r="85" fill="transparent"/>
        <path d="M-22,-8 L-15,22 M22,-8 L15,22 M0,-4 L0,22" stroke="#7A4A2A" stroke-width="2.5"/>
        <rect x="-20" y="20" width="40" height="28" rx="6" fill="#C68B59" stroke="#8A5A3B" stroke-width="3"/>
        <path d="M-20,30 h40 M-20,39 h40" stroke="#A8703F" stroke-width="2.5"/>
        ${img('balloon', 0, 0, bw, bh)}</g>`;
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
