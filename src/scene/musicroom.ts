import { $, el, rnd, pick } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs, input, Pt } from '../core/input';
import { state } from '../core/state';
import { AC, xylo, drum, shaker, jingle, sing, piano } from '../audio/synth';
import { img, fit } from '../art/sprites';
import { speak } from '../audio/speech';
import { TUNE } from '../audio/music';
import { Animal } from './animal';
import { Kind } from '../art/animals';
import { sparkleAt } from './fx';

/**
 * Music room. A big drum, a rainbow xylophone (tap or slide), a tambourine, maracas,
 * an animal choir that sings notes, and a disco ball that starts a dance party.
 * Everything is in one key (C major / pentatonic) so any order of taps sounds pleasant.
 */
const layer = (id: string) => $(id) as SVGGElement;
const COLORS = ['#FF5C5C', '#FF9F43', '#FFD43B', '#51CF66', '#22B8CF', '#4C6EF5', '#9775FA', '#F06595'];
const XY_NOTES = [523.3, 587.3, 659.3, 698.5, 784.0, 880.0, 987.8, 1046.5];
const PIANO_NOTES = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9];
// Painted pieces (art/m/): where each stands (x = centre, y = bottom) and its width
const DRUM = { x: 230, y: 880, w: 290 }, XYL = { x: 740, y: 872, w: 480 }, PIANO = { x: 1205, y: 882, w: 270 };
const MARACAS = { x: 250, y: 618, w: 150 }, TAMB = { x: 1350, y: 612, w: 150 }, BALL = { x: 800, top: 40, w: 112 };
// Bar centres across the xylophone picture, and where the white keys sit on the piano picture (fractions of width/height)
const BAR_X = [85, 137, 190, 243, 295, 347, 401, 453].map(v => v / 534), BAR_Y: [number, number] = [.12, .78];
const KEYS: [number, number] = [43 / 503, 405 / 503], KEY_Y: [number, number] = [.36, .65];
const box = (o: { x: number; y: number; w: number }, name: string) => { const [w, h] = fit('m/' + name, o.w); return { x0: o.x - w / 2, y0: o.y - h, w, h }; };

const CHOIR: { kind: Kind; x: number; h: number; note: number; vowel: 'ah' | 'oo' | 'ee' }[] = [
  { kind: 'cow', x: 470, h: 165, note: 130.8, vowel: 'oo' },
  { kind: 'pig', x: 640, h: 136, note: 196.0, vowel: 'ah' },
  { kind: 'duck', x: 800, h: 114, note: 261.6, vowel: 'ah' },
  { kind: 'puppy', x: 960, h: 142, note: 329.6, vowel: 'oo' },
  { kind: 'kitten', x: 1120, h: 136, note: 392.0, vowel: 'ee' }
];
let singers: Animal[] = [];
let dancing = false;

/** A music note floats up from a point. */
function note(x: number, y: number, colour = pick(COLORS)) {
  const n = el('text', { 'font-size': 46, 'font-weight': 800, fill: colour, stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', 'text-anchor': 'middle' }, layer('mfx'));
  n.textContent = pick(['♪', '♫', '♬']);
  const dx = rnd(-40, 40);
  tween(1220, t => {
    n.setAttribute('transform', `translate(${(x + dx * t + Math.sin(t * 9) * 10).toFixed(1)},${(y - 150 * t).toFixed(1)}) scale(${(.7 + t * .5).toFixed(2)})`);
    n.setAttribute('opacity', String(t < .7 ? 1 : (1 - t) / .3));
  }, () => n.remove());
}

// ---------- instruments ----------
/** Squash-and-stretch from the bottom centre, like the thing was struck. */
function squash(g: Element, cx: number, by: number, k = .07, ms = 300) {
  tween(ms, t => { const q = Math.sin(Math.PI * t) * k; g.setAttribute('transform', `translate(${cx},${by}) scale(${(1 + q * .6).toFixed(3)},${(1 - q).toFixed(3)}) translate(${-cx},${-by})`); }, () => g.removeAttribute('transform'));
}
function flash(x: number, y: number, w: number, h: number, colour = '#fff') {
  const r = el('rect', { x, y, width: w, height: h, rx: Math.min(w, h) * .3, fill: colour, opacity: .6 }, layer('mfx'));
  tween(380, t => r.setAttribute('opacity', String(.6 * (1 - t))), () => r.remove());
}
function hitDrum() {
  AC(); drum();
  squash($('m-drum'), DRUM.x, DRUM.y, .08);
  const b = box(DRUM, 'drum');
  note(DRUM.x, b.y0); note(DRUM.x, b.y0);
  if (!dancing) singers.forEach((a, i) => setTimeout(() => a.bounce(), i * 40));
}
function shake(g: Element, cx: number, cy: number, sound: () => void) {
  AC(); sound();
  tween(420, t => g.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 6) * 12 * (1 - t)).toFixed(1)} ${cx} ${cy})`), () => g.removeAttribute('transform'));
  note(cx, cy - 80);
}
function xyIndex(p: Pt) {
  const b = box(XYL, 'xylophone'), f = (p.x - b.x0) / b.w;
  let best = 0; BAR_X.forEach((c, i) => { if (Math.abs(c - f) < Math.abs(BAR_X[best] - f)) best = i; });
  return best;
}
function playBar(i: number) {
  AC(); xylo(XY_NOTES[i]);
  const b = box(XYL, 'xylophone'), x = b.x0 + BAR_X[i] * b.w, bw = b.w * .085;
  flash(x - bw / 2, b.y0 + BAR_Y[0] * b.h, bw, (BAR_Y[1] - BAR_Y[0]) * b.h);
  note(x, b.y0, COLORS[i]);
}
function keyIndex(p: Pt) {
  const b = box(PIANO, 'piano'), f = ((p.x - b.x0) / b.w - KEYS[0]) / (KEYS[1] - KEYS[0]);
  return Math.max(0, Math.min(6, Math.floor(f * 7)));
}
function playKey(i: number) {
  AC(); piano(PIANO_NOTES[i]);
  const b = box(PIANO, 'piano'), kw = (KEYS[1] - KEYS[0]) * b.w / 7, x = b.x0 + KEYS[0] * b.w + i * kw;
  flash(x + 2, b.y0 + KEY_Y[0] * b.h, kw - 4, (KEY_Y[1] - KEY_Y[0]) * b.h, COLORS[i]);
  note(x + kw / 2, b.y0, COLORS[i]);
}
function singAnimal(i: number) {
  const c = CHOIR[i], a = singers[i];
  AC(); sing(c.note, c.vowel, .8);
  a.bounce();
  const h = a.head(); note(h.x + 30, h.y - 20, COLORS[i]);
}

// ---------- dance party ----------
const BPM = 116, BEAT = 60 / BPM;
function dance() {
  if (dancing) return;
  dancing = true; AC();
  speak('dance');
  const lights = layer('mLights'), spots: SVGEllipseElement[] = [];
  for (let i = 0; i < 6; i++) spots.push(el('ellipse', { rx: 120, ry: 60, fill: COLORS[i + 1], opacity: .75, filter: 'url(#mBlur)', style: 'mix-blend-mode:screen' }, lights) as SVGEllipseElement);
  let t0 = 0;
  const sweep = (dt: number) => {
    t0 += dt;
    spots.forEach((s, i) => {
      const a = t0 / 900 + i * 1.05;
      s.setAttribute('cx', String(800 + Math.cos(a) * (500 + i * 40)));
      s.setAttribute('cy', String(i % 2 ? 300 + Math.sin(a * 1.3) * 150 : 700 + Math.sin(a) * 120));
    });
    $('m-disco').setAttribute('transform', `rotate(${(Math.sin(t0 / 300) * 4).toFixed(2)} ${BALL.x} 0)`);
    if (Math.random() < .08) sparkleAt(BALL.x + rnd(-40, 40), BALL.top + 110 + rnd(-40, 40), 2, true);
  };
  tickers.add(sweep);
  // 32 beats of the room's own tune, with drum, shaker and bells
  let beat = 0, ni = 0, nextNoteBeat = 0;
  const step = () => {
    if (ended || state.scene !== 'music' || state.asleep) return end();
    const b = beat % 4;
    if (b === 0 || b === 2) drum(); else drum(0, false);
    shaker(BEAT / 2);
    if (b === 3) jingle();
    while (ni < TUNE.length && nextNoteBeat <= beat) {
      const [m, len] = TUNE[ni];
      if (m) xylo(440 * Math.pow(2, (m - 69) / 12));
      nextNoteBeat += len; ni++;
    }
    // animals dance in pairs, alternating
    singers.forEach((a, i) => { if ((i + beat) % 2 === 0) a.bounce(); });
    if (beat % 2 === 0) note(rnd(300, 1220), rnd(350, 500));
    beat++;
    if (beat >= 32) { setTimeout(end, BEAT * 1000); return; }
    setTimeout(step, BEAT * 1000);
  };
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true; dancing = false; tickers.delete(sweep);
    lights.innerHTML = ''; $('m-disco').removeAttribute('transform');
    sparkleAt(BALL.x, BALL.top + 90, 10, true);
  };
  stopDance = end;
  step();
}
let stopDance = () => { };

// ---------- build ----------
export function initMusicRoom() {
  const back = layer('mBack'), mid = layer('mMid'), front = layer('mFront');
  const pic = (n: string, o: { x: number; y: number; w: number }) => { const [w, h] = fit('m/' + n, o.w); return img('m/' + n, o.x, o.y, w, h); };
  const shadow = (x: number, y: number, rx: number) => `<ellipse cx="${x}" cy="${y - 4}" rx="${rx}" ry="${(rx * .13).toFixed(1)}" fill="url(#mShadow)"/>`;

  // Painted stage room
  back.innerHTML = img('m/stage', 800, 900, 1600, 900);

  // Disco ball hanging from the ceiling
  const [bw, bh] = fit('m/disco', BALL.w);
  const ball = el('g', { 'data-id': 'm-disco', id: 'm-disco' }, back) as SVGGElement;
  ball.innerHTML = `<line x1="${BALL.x}" y1="-300" x2="${BALL.x}" y2="${BALL.top + 4}" stroke="#C8A06A" stroke-width="5"/>` +
    img('m/disco', BALL.x, BALL.top + bh, bw, bh) + `<circle cx="${BALL.x}" cy="${BALL.top + bh * .62}" r="${bw * .75}" fill="transparent"/>`;
  objs['m-disco'] = { tap: () => { if (dancing) sparkleAt(BALL.x, BALL.top + bh * .6, 6, true); else dance(); } };

  // Maracas and tambourine at the two ends of the stage
  const mr = el('g', { 'data-id': 'm-maracas' }, back) as SVGGElement;
  mr.innerHTML = shadow(MARACAS.x, MARACAS.y, 70) + pic('maracas', MARACAS);
  objs['m-maracas'] = { tap: () => shake(mr, MARACAS.x, MARACAS.y - 60, () => { shaker(); shaker(.22); }) };
  const tb = el('g', { 'data-id': 'm-tamb' }, back) as SVGGElement;
  tb.innerHTML = shadow(TAMB.x, TAMB.y, 72) + pic('tambourine', TAMB);
  objs['m-tamb'] = { tap: () => shake(tb, TAMB.x, TAMB.y - 60, jingle) };

  // Animal choir on the stage
  singers = CHOIR.map((c, i) => {
    el('ellipse', { cx: c.x, cy: 604, rx: c.h * .42, ry: 10, fill: 'url(#mShadow)' }, mid);
    const a = new Animal(c.kind, `m-${c.kind}`, c.x, 606, c.h, mid, false, false);
    objs[`m-${c.kind}`] = { tap: () => singAnimal(i) };
    return a;
  });
  singers[0].setFacing(1); singers[1].setFacing(1);

  // Drum, xylophone and toy piano on the floor
  const dr = el('g', { 'data-id': 'm-drum', id: 'm-drum' }, front) as SVGGElement;
  dr.innerHTML = shadow(DRUM.x, DRUM.y, 150) + pic('drum', DRUM);
  objs['m-drum'] = { tap: hitDrum };

  const xy = el('g', { 'data-id': 'm-xylo' }, front) as SVGGElement;
  xy.innerHTML = shadow(XYL.x, XYL.y, 230) + pic('xylophone', XYL);
  let last = -1;
  objs['m-xylo'] = {
    tap: p => playBar(xyIndex(p)),
    drag: {
      start: p0 => { last = xyIndex(p0); playBar(last); },
      move: p => { const i = xyIndex(p); if (i !== last) { last = i; playBar(i); } },
      end: () => { last = -1; }
    }
  };

  const pn = el('g', { 'data-id': 'm-piano' }, front) as SVGGElement;
  pn.innerHTML = shadow(PIANO.x, PIANO.y, 140) + pic('piano', PIANO);
  let lastK = -1;
  objs['m-piano'] = {
    tap: p => playKey(keyIndex(p)),
    drag: {
      start: p0 => { lastK = keyIndex(p0); playKey(lastK); },
      move: p => { const i = keyIndex(p); if (i !== lastK) { lastK = i; playKey(i); } },
      end: () => { lastK = -1; }
    }
  };

  // Nothing touched for a while: the disco ball twinkles, or an animal hums a note
  setInterval(() => {
    if (!state.started || state.asleep || state.scene !== 'music' || !$('panel').hidden || dancing) return;
    if (Date.now() - input.lastTouch < 18000) return;
    input.lastTouch = Date.now();
    if (Math.random() < .5) sparkleAt(BALL.x, BALL.top + 90, 8, true); else singAnimal(Math.floor(Math.random() * CHOIR.length));
  }, 1000);
}

export function musicEnter() { }
export function musicLeave() { stopDance(); }
