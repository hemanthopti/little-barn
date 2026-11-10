import { $, el, rnd, clamp, easeOut, starPath, inPond } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs } from '../core/input';
import { state, changed } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { img, fit } from '../art/sprites';
import { sparkleAt, ripple, raindrop } from './fx';
import { addFlower, flowerSpotOk } from './ground';

const SUN = { x: 1420, y: 130 };
let skyTaps = 0;

function makeCloud(id: string, name: string, w: number, x: number, y: number) {
  const [cw, ch] = fit(name, w);
  const g = el('g', { 'data-id': id }, $('lClouds')); g.innerHTML = `<g class="bob">${img(name, 0, 0, cw, ch, 'center')}</g>`;
  const c = { x, y, raining: false, dragging: false };
  const place = () => g.setAttribute('transform', `translate(${c.x.toFixed(1)},${c.y.toFixed(1)})`); place();
  let off = { x: 0, y: 0 };
  // Clouds drift slowly across the sky and wrap around
  const speed = .006 + Math.random() * .004;
  tickers.add(dt => { if (c.dragging) return; c.x += dt * speed; if (c.x > 1800) c.x = -200; place(); });
  objs[id] = {
    tap: () => rain(c),
    drag: {
      start: p0 => { off = { x: c.x - p0.x, y: c.y - p0.y }; c.dragging = true; },
      move: p => { c.x = clamp(p.x + off.x, -40, 1640); c.y = clamp(p.y + off.y, 60, 260); place(); },
      end: () => { c.dragging = false; if (!c.raining) rain(c); }
    }
  };
}

/** About 2.5 s of rain under a cloud; drops ripple the pond or grow flowers on the grass. */
function rain(c: { x: number; y: number; raining: boolean }) {
  if (c.raining) return;
  c.raining = true; sfx('rain'); setTimeout(() => speak('rain'), 400);
  let k = 0;
  const iv = setInterval(() => {
    const x = c.x + rnd(-95, 95), ty = rnd(680, 890), i = k++;
    raindrop(x, c.y + 45, ty, () => {
      if (inPond(x, ty)) { if (i % 2 === 0) ripple(x, ty); }
      else if (i % 4 === 0 && flowerSpotOk(x, ty)) addFlower(x, ty);
    });
  }, 60);
  setTimeout(() => { clearInterval(iv); c.raining = false; }, 2400);
}

function spin(id: string) {
  const g = $(id);
  tween(800, t => g.setAttribute('transform', `rotate(${360 * easeOut(t)}) scale(${1 + .22 * Math.sin(Math.PI * t)})`), () => g.removeAttribute('transform'));
}

export function setNight(on: boolean, silent = false) {
  state.night = on;
  $('shade').style.opacity = on ? .5 : 0;
  $('lStars').style.opacity = on ? 1 : 0;
  $('sun').style.opacity = on ? 0 : 1; $('moon').style.opacity = on ? 1 : 0;
  $('sun').style.pointerEvents = on ? 'none' : 'auto'; $('moon').style.pointerEvents = on ? 'auto' : 'none';
  if (!silent) { sfx(on ? 'chimeDown' : 'chimeUp'); setTimeout(() => speak(on ? 'night' : 'morning'), 700); }
  changed();
}

export function initSky() {
  makeCloud('cloud0', 'cloud-1', 270, 560, 120);
  makeCloud('cloud1', 'cloud-2', 240, 960, 95);


  // Stars only in open sky: not over the tree, the barn roof or the moon.
  const stars = $('lStars');
  for (let i = 0, n = 0; n < 40 && i < 400; i++) {
    const x = rnd(-300, 1900), y = rnd(-150, 300);
    if ((x > 1100 && x < 1560 && y > 200) || (x > 60 && x < 590 && y > 270) || Math.hypot(x - SUN.x, y - SUN.y) < 110) continue;
    n++;
    el('path', { d: starPath(rnd(6, 12), 3.5), fill: '#FFF6C8', class: 'tw', transform: `translate(${x.toFixed(0)},${y.toFixed(0)})`, style: `animation-delay:-${rnd(0, 2.4).toFixed(2)}s` }, stars);
  }

  // Three taps on the sun bring night; three on the moon bring morning.
  objs.sun = { tap() { spin('sunSpin'); sparkleAt(SUN.x, SUN.y); setTimeout(() => speak('sun'), 300); if (++skyTaps % 3 === 0) setTimeout(() => setNight(true), 900); } };
  objs.moon = { tap() { spin('moonSpin'); sparkleAt(SUN.x, SUN.y); setTimeout(() => speak('moon'), 300); if (++skyTaps % 3 === 0) setTimeout(() => setNight(false), 900); } };

  const hr = new Date().getHours();
  setNight(hr >= 19 || hr < 6, true);
}

/** Fireflies: soft glowing lights that drift over the yard at night. */
export function initFireflies() {
  const layer = $('lFireflies');
  const flies = Array.from({ length: 16 }, () => {
    const g = el('g', {}, layer);
    g.innerHTML = `<circle r="13" fill="#FFF59D" opacity=".25"/><circle r="4.5" fill="#FFFDE7"/>`;
    return { g, x: rnd(100, 1500), y: rnd(380, 860), a: rnd(0, 6.28), t: rnd(0, 6.28), s: rnd(.02, .045) };
  });
  tickers.add(dt => {
    layer.style.opacity = state.night ? '1' : '0';
    if (!state.night) return;
    for (const f of flies) {
      f.a += (Math.random() - .5) * .25; f.t += dt * .003;
      f.x += Math.cos(f.a) * f.s * dt; f.y += Math.sin(f.a) * f.s * dt * .6;
      if (f.x < 60 || f.x > 1540) f.a = Math.PI - f.a;
      if (f.y < 360 || f.y > 880) f.a = -f.a;
      f.g.setAttribute('transform', `translate(${f.x.toFixed(1)},${f.y.toFixed(1)})`);
      f.g.setAttribute('opacity', (.35 + .65 * Math.abs(Math.sin(f.t))).toFixed(2));
    }
  });
}
