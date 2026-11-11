import { $, el, rnd, pick } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs, input, Pt } from '../core/input';
import { state } from '../core/state';
import { AC, xylo, drum, shaker, jingle, sing } from '../audio/synth';
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
const XY = { x0: 520, step: 72, w: 58, cy: 742 };

const CHOIR: { kind: Kind; x: number; h: number; note: number; vowel: 'ah' | 'oo' | 'ee' }[] = [
  { kind: 'cow', x: 470, h: 150, note: 130.8, vowel: 'oo' },
  { kind: 'pig', x: 640, h: 124, note: 196.0, vowel: 'ah' },
  { kind: 'duck', x: 800, h: 104, note: 261.6, vowel: 'ah' },
  { kind: 'puppy', x: 960, h: 130, note: 329.6, vowel: 'oo' },
  { kind: 'kitten', x: 1120, h: 124, note: 392.0, vowel: 'ee' }
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
function pulse(g: Element, cx: number, cy: number, k = .12, ms = 260) {
  tween(ms, t => g.setAttribute('transform', `translate(${cx},${cy}) scale(${(1 + Math.sin(Math.PI * t) * k).toFixed(3)}) translate(${-cx},${-cy})`), () => g.removeAttribute('transform'));
}

// ---------- instruments ----------
function hitDrum() {
  AC(); drum();
  const skin = $('m-skin'), body = $('m-drumBody');
  tween(300, t => skin.setAttribute('ry', String(34 - Math.sin(Math.PI * t) * 8)));
  pulse(body, 230, 700, .05);
  note(230, 560); note(230, 560);
  // the choir feels the beat
  if (!dancing) singers.forEach((a, i) => setTimeout(() => a.bounce(), i * 40));
}
function shake(g: Element, cx: number, cy: number, sound: () => void) {
  AC(); sound();
  tween(420, t => g.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 6) * 12 * (1 - t)).toFixed(1)} ${cx} ${cy})`), () => g.removeAttribute('transform'));
  note(cx, cy - 80);
}
function xyIndex(p: Pt) { return Math.max(0, Math.min(7, Math.round((p.x - XY.x0 - XY.w / 2) / XY.step))); }
function playBar(i: number) {
  AC(); xylo(XY_NOTES[i]);
  const bar = $('m-bar' + i), x = XY.x0 + i * XY.step + XY.w / 2;
  tween(240, t => bar.setAttribute('transform', `translate(0,${(Math.sin(Math.PI * t) * 8).toFixed(1)})`), () => bar.removeAttribute('transform'));
  note(x, 600, COLORS[i]);
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
  for (let i = 0; i < 6; i++) spots.push(el('ellipse', { rx: 120, ry: 60, fill: COLORS[i + 1], opacity: .9, style: 'mix-blend-mode:screen' }, lights) as SVGEllipseElement);
  let t0 = 0;
  const sweep = (dt: number) => {
    t0 += dt;
    spots.forEach((s, i) => {
      const a = t0 / 900 + i * 1.05;
      s.setAttribute('cx', String(800 + Math.cos(a) * (500 + i * 40)));
      s.setAttribute('cy', String(i % 2 ? 300 + Math.sin(a * 1.3) * 150 : 700 + Math.sin(a) * 120));
    });
    $('m-ballFacets').setAttribute('transform', `translate(${((t0 / 12) % 24).toFixed(1)},0)`);
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
    lights.innerHTML = '';
    sparkleAt(800, 160, 10, true);
  };
  stopDance = end;
  step();
}
let stopDance = () => { };

// ---------- build ----------
export function initMusicRoom() {
  const back = layer('mBack'), mid = layer('mMid'), front = layer('mFront');

  // Bunting across the top
  let b = '<path d="M-60,30 Q800,150 1660,30" fill="none" stroke="#fff" stroke-width="4"/>';
  for (let i = 0; i < 22; i++) {
    const t = (i + .5) / 22, x = -60 + 1720 * t, y = 30 + 120 * 4 * t * (1 - t) * .5 + 4;
    b += `<path d="M${(x - 26).toFixed(1)},${y.toFixed(1)} L${(x + 26).toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${(y + 52).toFixed(1)} Z" fill="${COLORS[i % 8]}"/>`;
  }
  // Music notes painted on the wall, a soft stage spot, and the choir riser
  for (const [x, y, s] of [[150, 260, 70], [1450, 230, 80], [300, 420, 50], [1220, 400, 55]] as const)
    b += `<text x="${x}" y="${y}" font-size="${s}" fill="#fff" opacity=".45" text-anchor="middle">♫</text>`;
  b += `<ellipse cx="800" cy="520" rx="520" ry="70" fill="url(#mSpot)"/>` +
    `<rect x="360" y="470" width="880" height="56" rx="22" fill="#8E5BD6" filter="url(#mSoft)"/><rect x="360" y="470" width="880" height="16" rx="8" fill="#B08AF0"/>`;
  back.innerHTML = b;

  // Disco ball
  const ball = el('g', { 'data-id': 'm-disco' }, back) as SVGGElement;
  ball.innerHTML = `<line x1="800" y1="-200" x2="800" y2="72" stroke="#8E9AAF" stroke-width="4"/>` +
    `<clipPath id="mBallClip"><circle cx="800" cy="128" r="56"/></clipPath>` +
    `<circle cx="800" cy="128" r="56" fill="url(#mBall)" filter="url(#mSoft)"/>` +
    `<g clip-path="url(#mBallClip)" opacity=".55"><g id="m-ballFacets" stroke="#7D8AA3" stroke-width="2">` +
    Array.from({ length: 9 }, (_, i) => `<line x1="${730 + i * 24}" y1="60" x2="${730 + i * 24}" y2="200"/>`).join('') +
    Array.from({ length: 6 }, (_, i) => `<line x1="700" y1="${84 + i * 18}" x2="900" y2="${84 + i * 18}"/>`).join('') +
    `</g></g><circle cx="782" cy="110" r="9" fill="#fff"/>` +
    `<circle cx="800" cy="128" r="80" fill="transparent"/>`;
  objs['m-disco'] = { tap: () => { if (dancing) sparkleAt(800, 128, 6, true); else dance(); } };

  // Animal choir on the riser
  singers = CHOIR.map((c, i) => {
    el('ellipse', { cx: c.x, cy: 478, rx: c.h * .42, ry: 9, fill: 'url(#mShadow)' }, mid);
    const a = new Animal(c.kind, `m-${c.kind}`, c.x, 480, c.h, mid, false, false);
    objs[`m-${c.kind}`] = { tap: () => singAnimal(i) };
    return a;
  });
  singers[0].setFacing(1); singers[1].setFacing(1);

  // Drum
  const dr = el('g', { 'data-id': 'm-drum' }, front) as SVGGElement;
  dr.innerHTML = `<ellipse cx="230" cy="868" rx="150" ry="20" fill="url(#mShadow)"/>` +
    `<g id="m-drumBody"><rect x="100" y="640" width="260" height="210" rx="18" fill="url(#mDrum)"/>` +
    `<path d="M100,660 ${Array.from({ length: 7 }, (_, i) => `L${118 + i * 37},836 L${137 + i * 37},660`).join(' ')}" fill="none" stroke="#FFE08A" stroke-width="5" stroke-linejoin="round"/>` +
    `<rect x="94" y="826" width="272" height="26" rx="13" fill="#FFC94D"/><rect x="94" y="628" width="272" height="26" rx="13" fill="#FFC94D"/>` +
    `<ellipse id="m-skin" cx="230" cy="632" rx="134" ry="34" fill="#FFF4DE" stroke="#FFC94D" stroke-width="8"/></g>`;
  objs['m-drum'] = { tap: hitDrum };

  // Xylophone: frame + eight rainbow bars; tap or slide along
  let x = `<rect x="490" y="690" width="${8 * XY.step + 40}" height="20" rx="10" fill="#8D5524" transform="rotate(-2 800 700)"/>` +
    `<rect x="490" y="780" width="${8 * XY.step + 40}" height="20" rx="10" fill="#8D5524" transform="rotate(2 800 790)"/>`;
  for (let i = 0; i < 8; i++) {
    const h = 240 - i * 14, bx = XY.x0 + i * XY.step, by = XY.cy - h / 2;
    x += `<g id="m-bar${i}"><rect x="${bx}" y="${by}" width="${XY.w}" height="${h}" rx="14" fill="${COLORS[i]}" filter="url(#mSoft)"/>` +
      `<rect x="${bx + 8}" y="${by + 8}" width="12" height="${h - 16}" rx="6" fill="#fff" opacity=".35"/>` +
      `<circle cx="${bx + XY.w / 2}" cy="${by + 22}" r="6" fill="#fff" opacity=".8"/><circle cx="${bx + XY.w / 2}" cy="${by + h - 22}" r="6" fill="#fff" opacity=".8"/></g>`;
  }
  const xy = el('g', { 'data-id': 'm-xylo' }, front) as SVGGElement;
  xy.innerHTML = x;
  let last = -1;
  objs['m-xylo'] = {
    tap: p => playBar(xyIndex(p)),
    drag: {
      start: p0 => { last = xyIndex(p0); playBar(last); },
      move: p => { const i = xyIndex(p); if (i !== last) { last = i; playBar(i); } },
      end: () => { last = -1; }
    }
  };

  // Tambourine
  const tb = el('g', { 'data-id': 'm-tamb' }, front) as SVGGElement;
  let tm = `<circle cx="1310" cy="610" r="92" fill="#F6C76B" filter="url(#mSoft)"/><circle cx="1310" cy="610" r="72" fill="#FFF1D0"/>` +
    `<circle cx="1310" cy="610" r="72" fill="none" stroke="#E0A33A" stroke-width="5"/>`;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, cx = 1310 + Math.cos(a) * 82, cy = 610 + Math.sin(a) * 82;
    tm += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="16" ry="11" fill="#FFD43B" stroke="#C99A1E" stroke-width="3"/>`;
  }
  tb.innerHTML = tm;
  objs['m-tamb'] = { tap: () => shake(tb, 1310, 610, jingle) };

  // Maracas
  const mr = el('g', { 'data-id': 'm-maracas' }, front) as SVGGElement;
  mr.innerHTML = `<ellipse cx="1270" cy="868" rx="120" ry="16" fill="url(#mShadow)"/>` +
    `<g transform="rotate(-18 1220 800)"><rect x="1211" y="790" width="18" height="90" rx="8" fill="#8D5524"/><ellipse cx="1220" cy="760" rx="44" ry="56" fill="#22B8CF" filter="url(#mSoft)"/>` +
    `<path d="M1182,750 Q1220,730 1258,750" stroke="#FFD43B" stroke-width="7" fill="none"/><path d="M1180,775 Q1220,795 1260,775" stroke="#FF5C5C" stroke-width="7" fill="none"/></g>` +
    `<g transform="rotate(20 1340 800)"><rect x="1331" y="790" width="18" height="90" rx="8" fill="#8D5524"/><ellipse cx="1340" cy="760" rx="44" ry="56" fill="#F06595" filter="url(#mSoft)"/>` +
    `<path d="M1302,750 Q1340,730 1378,750" stroke="#51CF66" stroke-width="7" fill="none"/><path d="M1300,775 Q1340,795 1380,775" stroke="#FFD43B" stroke-width="7" fill="none"/></g>`;
  objs['m-maracas'] = { tap: () => shake(mr, 1280, 800, () => { shaker(); shaker(.22); }) };

  // Nothing touched for a while: the disco ball twinkles, or an animal hums a note
  setInterval(() => {
    if (!state.started || state.asleep || state.scene !== 'music' || !$('panel').hidden || dancing) return;
    if (Date.now() - input.lastTouch < 18000) return;
    input.lastTouch = Date.now();
    if (Math.random() < .5) sparkleAt(800, 128, 8, true); else singAnimal(Math.floor(Math.random() * CHOIR.length));
  }, 1000);
}

export function musicEnter() { }
export function musicLeave() { stopDance(); }
