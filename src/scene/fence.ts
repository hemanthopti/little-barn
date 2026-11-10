import { $, el, rnd, pick } from '../core/util';
import { tween } from '../core/engine';
import { objs } from '../core/input';
import { state } from '../core/state';
import { xylo, AC } from '../audio/synth';

/**
 * Musical fence: eight sections, eight notes of a pentatonic scale, so any order sounds nice.
 * Tap a section, or slide a finger along the fence for a run of notes.
 */
const X0 = 600, X1 = 1295, N = 8;
const NOTES = [523.3, 587.3, 659.3, 784.0, 880.0, 1046.5, 1174.7, 1318.5];
const COLORS = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#4DABF7', '#9775FA', '#F783AC', '#FF8787'];
const zone = (x: number) => Math.max(0, Math.min(N - 1, Math.floor((x - X0) / ((X1 - X0) / N))));

function play(i: number) {
  if (!state.sound) return;
  AC(); xylo(NOTES[i]);
  const w = (X1 - X0) / N, cx = X0 + w * (i + .5);
  // a coloured glow on the section and a music note floating up
  const glow = el('rect', { x: X0 + w * i + 4, y: 524, width: w - 8, height: 80, rx: 14, fill: COLORS[i], opacity: .55 }, $('fenceGlow'));
  tween(500, t => glow.setAttribute('opacity', String(.55 * (1 - t))), () => glow.remove());
  const n = el('text', { x: 0, y: 0, 'font-size': 44, 'font-weight': 800, fill: COLORS[i], stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', 'text-anchor': 'middle' }, $('fx'));
  n.textContent = pick(['♪', '♫', '♬']);
  const dx = rnd(-30, 30);
  tween(1200, t => {
    n.setAttribute('transform', `translate(${cx + dx * t + Math.sin(t * 9) * 10},${520 - 130 * t}) scale(${.7 + t * .5})`);
    n.setAttribute('opacity', String(t < .7 ? 1 : (1 - t) / .3));
  }, () => n.remove());
}

export function initFence() {
  let last = -1;
  objs.fence = {
    tap: p => play(zone(p.x)),
    drag: {
      start: p0 => { last = zone(p0.x); play(last); },
      move: p => { const z = zone(p.x); if (z !== last) { last = z; play(z); } },
      end: () => { last = -1; }
    }
  };
}
