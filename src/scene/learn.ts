import { $, el, rnd, pick, easeOut, easeOutBack } from '../core/util';
import { tween } from '../core/engine';
import { objs, input } from '../core/input';
import { state, bus } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { SIZE, url } from '../art/sprites';
import { VOICE, Kind } from '../art/animals';
import { NAME } from '../content/words';
import { sparkleAt, confetti, hearts } from './fx';

/**
 * Learn room: picture cards for animals, food and things around the house.
 * Tap a card: it grows big, shows its name and says it (animals make their sound first).
 * Every few taps a gentle "Where is the …?" with two big cards (three once the child gets it often).
 * Nothing is ever wrong: a "wrong" card just says its own name, and the question comes again.
 */
type Card = { k: string; art: string; alt?: string };
type Cat = { id: string; icon: string; colour: string; cards: Card[] };

const A = (k: Kind): Card => ({ k, art: `${k}-idle`, alt: `${k}-happy` });
const K = (k: string, art = k): Card => ({ k, art: 'k/' + art });
const CATS: Cat[] = [
  { id: 'animals', icon: 'cow-idle', colour: '#7FC97F',
    cards: (['cow', 'pig', 'sheep', 'hen', 'duck', 'puppy', 'kitten', 'frog', 'parrot'] as Kind[]).map(A) },
  { id: 'food', icon: 'apple', colour: '#FF8A65',
    cards: [{ k: 'apple', art: 'apple' }, ...['banana', 'orange', 'grapes', 'watermelon', 'tomato', 'carrot', 'broccoli', 'milk', 'cheese', 'bread', 'toast', 'cookie'].map(k => K(k))] },
  { id: 'things', icon: 'k/kettle', colour: '#64B5F6',
    cards: [...['kettle', 'toaster', 'clock', 'spoon', 'bowl', 'plate', 'table', 'pot', 'fridge'].map(k => K(k)), K('oven', 'stove'), K('bird', 'cuckoo'),
      { k: 'balloon', art: 'balloon' }, { k: 'sun', art: 'sun' }, { k: 'moon', art: 'moon' }, { k: 'tree', art: 'tree' }, { k: 'flower', art: 'flower-1' }, { k: 'barn', art: 'barn' }] }
];

const SLOTS = [[400, 360], [800, 360], [1200, 360], [400, 690], [800, 690], [1200, 690]];
const CW = 340, CH = 290;

let cat = CATS[0], board: Card[] = [], taps = 0, zooming = false;
let quiz: { target: Card; cards: Card[]; t0: number; hintT: number } | null = null;
let streak = 0;

const layer = (id: string) => $(id) as SVGGElement;
const label = (k: string) => { const n = NAME[k]?.[state.lang] || k; return state.lang === 'en' ? n[0].toUpperCase() + n.slice(1) : n; };

/** Picture fitted inside a w x h box, centred on (0, cy). */
function picture(c: Card, w: number, h: number, cy: number, art = c.art) {
  const [pw, ph] = SIZE[art], s = Math.min(w / pw, h / ph), iw = pw * s, ih = ph * s;
  return `<image class="pic" href="${url(art)}" x="${(-iw / 2).toFixed(1)}" y="${(cy - ih / 2).toFixed(1)}" width="${iw.toFixed(1)}" height="${ih.toFixed(1)}" preserveAspectRatio="none"/>`;
}
function cardSvg(c: Card, w: number, h: number, colour: string, fs: number) {
  return `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${w * .1}" fill="#fff" stroke="${colour}" stroke-width="7" filter="url(#lShadow)"/>` +
    `<g class="wig">${picture(c, w * .82, h * .66, -h * .1)}</g>` +
    `<text x="0" y="${(h / 2 - h * .09).toFixed(1)}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="#4A3A30" font-family="'Baloo 2',system-ui,sans-serif">${label(c.k)}</text>`;
}

/** Say a card: animals make their noise first. */
function sayCard(c: Card) {
  const v = VOICE[c.k as Kind];
  if (v) { const d = sfx(v); setTimeout(() => speak(c.k), d * 1000 + 80); }
  else speak(c.k);
}

function wiggle(g: SVGGElement, ms = 600) {
  const w = g.querySelector('.wig') as SVGGElement;
  tween(ms, t => w.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 5) * 9 * (1 - t)).toFixed(2)})`), () => w.removeAttribute('transform'));
}

// ---------- the board ----------
function deal(keep = false) {
  if (!keep) {
    const pool = [...cat.cards].sort(() => Math.random() - .5);
    board = pool.slice(0, 6);
  }
  const b = layer('lBoard');
  b.innerHTML = ''; b.setAttribute('opacity', '1');
  board.forEach((c, i) => {
    const [x, y] = SLOTS[i], id = `l-card-${i}`;
    const g = el('g', { 'data-id': id, transform: `translate(${x},${y}) scale(0)` }, b) as SVGGElement;
    g.innerHTML = cardSvg(c, CW, CH, cat.colour, 44);
    setTimeout(() => tween(380, t => g.setAttribute('transform', `translate(${x},${y}) scale(${easeOutBack(t).toFixed(3)})`)), i * 70);
    objs[id] = { tap: () => tapCard(c, x, y) };
  });
  drawTabs();
}

function tapCard(c: Card, x: number, y: number) {
  if (zooming || quiz) return;
  zooming = true;
  sayCard(c);
  const z = layer('lZoom');
  z.innerHTML = `<rect data-id="l-zoom" x="-2400" y="-2400" width="6400" height="5700" fill="#FFF8EC" opacity="0"/>`;
  const g = el('g', {}, z) as SVGGElement;
  g.innerHTML = cardSvg(c, 720, 640, cat.colour, 84);
  const dim = z.firstElementChild!;
  const tx = 800, ty = 460, s0 = CW / 720;
  tween(420, t => {
    const k = easeOutBack(t), s = s0 + (1 - s0) * k;
    g.setAttribute('transform', `translate(${x + (tx - x) * Math.min(1, k)},${y + (ty - y) * Math.min(1, k)}) scale(${s.toFixed(3)})`);
    dim.setAttribute('opacity', String(.75 * Math.min(1, t)));
  }, () => {
    if (c.alt) (g.querySelector('.pic') as SVGImageElement).setAttribute('href', url(c.alt)); // the animal smiles
    wiggle(g, 800);
    if (VOICE[c.k as Kind]) hearts(800, 260, 4); else sparkleAt(800, 300, 8, true);
  });
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    tween(320, t => {
      const s = 1 - (1 - s0) * easeOut(t);
      g.setAttribute('transform', `translate(${tx + (x - tx) * t},${ty + (y - ty) * t}) scale(${s.toFixed(3)})`);
      dim.setAttribute('opacity', String(.75 * (1 - t)));
    }, () => {
      z.innerHTML = ''; zooming = false;
      if (++taps >= 5 && state.findit) { taps = 0; setTimeout(startQuiz, 500); }
    });
  };
  objs['l-zoom'] = { tap: close };
  setTimeout(close, 2600);
}

// ---------- category tabs ----------
function drawTabs() {
  const t = layer('lTabs');
  t.innerHTML = '';
  CATS.forEach((c, i) => {
    const x = 560 + i * 240, on = c === cat, id = `l-tab-${c.id}`;
    const g = el('g', { 'data-id': id, transform: `translate(${x},112) scale(${on ? 1.12 : .92})` }, t) as SVGGElement;
    g.innerHTML = `<circle r="72" fill="${on ? c.colour : '#fff'}" stroke="${c.colour}" stroke-width="7" filter="url(#lShadow)"/>` +
      `<g class="wig">${picture({ k: c.id, art: c.icon }, 100, 100, 0)}</g>`;
    objs[id] = { tap: () => { endQuiz(); if (c !== cat) { cat = c; taps = 0; sfx('pop'); } else sfx('swish'); deal(); } };
  });
}

// ---------- "Where is the …?" ----------
function startQuiz() {
  if (quiz || state.scene !== 'learn' || state.asleep) return;
  const n = streak >= 3 ? 3 : 2;
  const cards = [...cat.cards].sort(() => Math.random() - .5).slice(0, n);
  const target = pick(cards);
  quiz = { target, cards, t0: Date.now(), hintT: 0 };
  tween(300, t => layer('lBoard').setAttribute('opacity', String(1 - t)));
  const q = layer('lQuiz'); q.innerHTML = '';
  const xs = n === 2 ? [530, 1070] : [330, 800, 1270], sc = n === 2 ? 1.35 : 1.2;
  cards.forEach((c, i) => {
    const id = `l-q-${i}`, x = xs[i], y = 500;
    const g = el('g', { 'data-id': id, transform: `translate(${x},${y}) scale(0)` }, q) as SVGGElement;
    g.innerHTML = cardSvg(c, CW, CH, cat.colour, 44);
    setTimeout(() => tween(400, t => g.setAttribute('transform', `translate(${x},${y}) scale(${(sc * easeOutBack(t)).toFixed(3)})`)), 250 + i * 120);
    objs[id] = { tap: () => answer(c, g, x, y) };
  });
  setTimeout(() => quiz && speak('where-' + target.k), 700);
}

function answer(c: Card, g: SVGGElement, x: number, y: number) {
  if (!quiz) return;
  if (c === quiz.target) {
    streak++;
    sfx('yay'); confetti(x, y - 120); sparkleAt(x, y - 60, 9, true);
    if (c.alt) (g.querySelector('.pic') as SVGImageElement).setAttribute('href', url(c.alt));
    wiggle(g, 900);
    setTimeout(() => speak('found'), 300);
    quiz = null;
    setTimeout(() => { if (!quiz) { endQuiz(); deal(); } }, 2400);
  } else {
    // Not wrong, just a different thing: it tells you what it is, then the question comes again.
    streak = 0;
    wiggle(g); sayCard(c);
    const q = quiz;
    setTimeout(() => { if (quiz === q) speak('where-' + q.target.k); }, 1700);
  }
}

function endQuiz() {
  quiz = null;
  layer('lQuiz').innerHTML = '';
  layer('lBoard').setAttribute('opacity', '1');
}

/** Hint after 6 s: the right card glows and wiggles. Gives up quietly after 25 s. */
function quizTick() {
  if (!quiz || state.scene !== 'learn' || !$('panel').hidden) return;
  const el2 = Date.now() - quiz.t0;
  if (el2 > 25000) { endQuiz(); deal(true); return; }
  if (el2 > 6000 && Date.now() - quiz.hintT > 3500) {
    quiz.hintT = Date.now();
    const i = quiz.cards.indexOf(quiz.target), g = layer('lQuiz').children[i] as SVGGElement;
    if (g) { wiggle(g); const m = g.getAttribute('transform')!.match(/translate\(([\d.]+),([\d.]+)/); if (m) sparkleAt(+m[1], +m[2] - 140, 6, true); }
  }
}

// ---------- room ----------
export function initLearn() {
  // A few soft confetti dots on the wallpaper
  const d = layer('lDeco');
  for (let i = 0; i < 60; i++) {
    const x = rnd(0, 1600), y = rnd(0, 900);
    if (y > 190 && y < 860 && x > 200 && x < 1400) continue;
    el('circle', { cx: x, cy: y, r: rnd(6, 16), fill: pick(['#FFD6A5', '#CAFFBF', '#9BF6FF', '#BDB2FF', '#FFC6FF', '#FDFFB6']), opacity: .8 }, d);
  }
  deal();
  setInterval(quizTick, 500);
  // A card says hello when nothing has been touched for a while
  setInterval(() => {
    if (!state.started || state.asleep || state.scene !== 'learn' || !$('panel').hidden || quiz || zooming) return;
    if (Date.now() - input.lastTouch < 20000) return;
    input.lastTouch = Date.now();
    const i = Math.floor(Math.random() * board.length), g = layer('lBoard').children[i] as SVGGElement;
    if (g) { wiggle(g); sparkleAt(SLOTS[i][0], SLOTS[i][1] - 120, 5, true); }
  }, 1000);
  // Labels follow the language setting
  let lang = state.lang;
  bus.addEventListener('change', () => { if (state.lang !== lang) { lang = state.lang; endQuiz(); deal(true); } });
}

export function learnEnter() { endQuiz(); taps = 0; deal(); }
export function learnLeave() { endQuiz(); layer('lZoom').innerHTML = ''; zooming = false; }
