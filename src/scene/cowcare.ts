import { $, el, rnd, pick, easeOut, easeOutBack } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs, input, Pt, Interactive } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { jingle } from '../audio/synth';
import { url, fit, img } from '../art/sprites';
import { Animal } from './animal';
import { hearts, sparkleAt, confetti, zzz } from './fx';

/**
 * Cow Care: look after a cow. Six tools along the bottom (cuddle, brush, shower, food, milk, sleep);
 * tap a tool, or drag it onto the cow. Now and then the cow asks for something in a thought bubble
 * (hungry, muddy, sleepy, wants a cuddle, needs milking) and giving it earns a big celebration.
 * There is no wrong answer: every tool always gets a happy reaction.
 * Everything here is under the cc- prefix and draws into #ccFx.
 */
type Tool = 'pet' | 'brush' | 'wash' | 'food' | 'milk' | 'sleep';
type Need = 'hungry' | 'dirty' | 'sleepy' | 'cuddle' | 'milk';
const TOOLS: Tool[] = ['pet', 'brush', 'wash', 'food', 'milk', 'sleep'];
const FIXES: Record<Need, Tool> = { hungry: 'food', dirty: 'wash', sleepy: 'sleep', cuddle: 'pet', milk: 'milk' };
const ASK: Record<Need, string> = { hungry: 'cc-hungry', dirty: 'cc-dirty', sleepy: 'cc-sleepy', cuddle: 'cc-cuddle', milk: 'cc-milk' };
const COLORS: Record<Tool, string> = { pet: '#ffd6de', brush: '#ffe3a5', wash: '#b8efff', food: '#ffe0c4', milk: '#d7eeff', sleep: '#dfd5ff' };
const FOODS: [string, string][] = [['apple', 'apple'], ['carrot', 'k/carrot'], ['banana', 'k/banana'], ['grapes', 'k/grapes']];

// Glossy tool icons (drawn, so they look the same on every phone)
const ICON: Record<Tool, string> = {
  pet: '<path d="M0 35C-60 0-55-45-20-43C-8-42 0-30 0-30S15-55 39-38C63-18 47 7 0 35Z" fill="url(#ccPink)" stroke="#fff1f4" stroke-width="5"/><path d="M-35-20Q-27-40-12-31" fill="none" stroke="white" stroke-opacity=".75" stroke-width="7" stroke-linecap="round"/>',
  brush: '<g transform="rotate(-25)"><rect x="-23" y="-21" width="46" height="82" rx="17" fill="url(#ccWood)" stroke="#ffe0a2" stroke-width="4"/><rect x="-49" y="-48" width="98" height="61" rx="27" fill="url(#ccGold)" stroke="#fff2bf" stroke-width="5"/><path d="M-38-46V-65M-20-48V-68M0-48V-70M20-48V-68M38-46V-65" stroke="#fff5cc" stroke-width="11" stroke-linecap="round"/></g>',
  wash: '<g transform="rotate(-23)"><rect x="-13" y="-6" width="25" height="75" rx="12" fill="url(#ccSilver)"/><ellipse cx="0" cy="-19" rx="47" ry="25" fill="url(#ccSilver)" stroke="#f4fbff" stroke-width="5"/><ellipse cy="-26" rx="37" ry="13" fill="#64b6db" stroke="#d9faff" stroke-width="4"/></g><circle cx="-35" cy="40" r="8" fill="#8cddff"/><circle cx="5" cy="47" r="10" fill="#a9eaff"/><circle cx="43" cy="33" r="8" fill="#70d2ff"/>',
  food: '<image href="' + url('apple') + '" x="-48" y="-58" width="96" height="114" preserveAspectRatio="xMidYMid meet"/>',
  milk: '<path d="M-38-35L-29 46Q0 57 29 46L38-35Z" fill="url(#ccSilver)" stroke="#e3f8ff" stroke-width="5"/><ellipse cy="-35" rx="38" ry="12" fill="#d4e3ed" stroke="#94bac8" stroke-width="6"/><ellipse cy="-35" rx="29" ry="6" fill="white"/><path d="M-38-26Q-59-58-29-64M38-26Q59-58 29-64" fill="none" stroke="#93aeba" stroke-width="8" stroke-linecap="round"/>',
  sleep: '<path d="M18-49A48 48 0 1 0 51 18A40 40 0 0 1 18-49Z" fill="url(#ccMoon)" stroke="#fff6bb" stroke-width="5"/><circle cx="34" cy="-38" r="7" fill="#fff"/><path d="M51-16L57-2L72 2L57 7L52 22L47 7L33 2L47-3Z" fill="#ffeaaa"/>'
};
const BUBBLE_ICON: Record<Need, string> = {
  hungry: ICON.food,
  dirty: '<ellipse cx="-10" cy="5" rx="38" ry="26" fill="#8A5A2B"/><circle cx="26" cy="-14" r="13" fill="#8A5A2B"/><circle cx="-38" cy="-18" r="9" fill="#8A5A2B"/><ellipse cx="-18" cy="-4" rx="12" ry="6" fill="#B07A45"/>',
  sleepy: ICON.sleep,
  cuddle: ICON.pet,
  milk: ICON.milk
};

// The cow stands at (CX, CY); FACE etc. are spots on her body in scene units
const CX = 790, CY = 735, CH = 470;
const k = CH / 520, P = (sx: number, sy: number): Pt => ({ x: CX + (sx - 278) * k, y: CY - (520 - sy) * k });
const MOUTH = P(150, 240), FACE = P(170, 190), UDDER = P(335, 428), BACK = P(370, 262), BELL = P(178, 300);
const BUCKET = { x: 1165, y: 778 };
const MUD_SPOTS: [number, number, number][] = [[300, 300, 30], [392, 278, 26], [352, 360, 32], [425, 345, 22], [255, 385, 24], [330, 245, 20]];

let cow!: Animal, fx!: SVGGElement;
let entered = false, busy = false, sleeping = false, sleepT = 0, need: Need | null = null;
let nextNeedAt = 0, askedAt = 0, milkLevel = 0, foodIdx = 0;
let mud: { g: SVGGElement; dirt: number; x: number; y: number; r: number }[] = [];
let ghost: SVGGElement | null = null;
const layer = (id: string) => $(id) as SVGGElement;
const active = () => entered && state.scene === 'cowcare' && state.started && !state.asleep && $('panel').hidden;
const later = (ms: number, fn: () => void) => setTimeout(() => { if (entered) fn(); }, ms);
const toolSvg = (t: Tool, x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${ICON[t]}</g>`;

function particle(kind: 'drop' | 'bubble' | 'milk' | 'spark', x: number, y: number, vx = rnd(-120, 120), rise = rnd(40, 140)) {
  const p = el(kind === 'spark' ? 'path' : 'circle', {
    fill: kind === 'drop' ? '#88dfff' : kind === 'milk' ? '#ffffff' : kind === 'spark' ? '#ffe37c' : '#e8fbff',
    stroke: '#fff', 'stroke-width': 2, opacity: .9
  }, fx);
  if (kind === 'spark') p.setAttribute('d', 'M0-14L4-4L14 0L4 4L0 14L-4 4L-14 0L-4-4Z'); else p.setAttribute('r', String(rnd(5, 12)));
  const fall = kind === 'drop' || kind === 'milk' ? 260 : -40;
  tween(900, t => {
    p.setAttribute('transform', `translate(${(x + vx * t).toFixed(1)} ${(y - rise * t + fall * t * t).toFixed(1)}) scale(${(1 - .5 * t).toFixed(2)})`);
    p.setAttribute('opacity', String(.9 * (1 - t)));
  }, () => p.remove());
}

/** Back to standing, breathing quietly. */
function settle() { cow.setWalk(0, 0); cow.rest(); busy = false; setFurniture(); }
/** The bell and the mud only make sense while she's standing. */
function setFurniture() {
  // Hidden during the video jump too: that cow is drawn a little differently, so the collar wouldn't line up
  const standing = cow.pose === 'idle' && !sleeping && cow.clip !== 'happy';
  layer('ccBell').style.display = standing ? '' : 'none';
  layer('ccMud').style.display = standing || (cow.pose === 'happy' && cow.clip !== 'happy') ? '' : 'none';
}
function sway(ms: number, amp = 4, done?: () => void) {
  let t = 0;
  const tick = (dt: number) => {
    t += dt;
    cow.setWalk(Math.abs(Math.sin(t / 220)) * 6, Math.sin(t / 220) * amp);
    if (t > ms) { tickers.delete(tick); cow.setWalk(0, 0); done?.(); }
  };
  tickers.add(tick);
}

// ---------- needs ----------
function showBubble(n: Need) {
  const b = layer('ccBubble');
  b.innerHTML = `<circle cx="905" cy="345" r="11" fill="#fff"/><circle cx="935" cy="308" r="17" fill="#fff"/>` +
    `<g filter="url(#ccToolShadow)"><path d="M965,240 C940,180 1010,140 1050,165 C1080,120 1160,135 1165,185 C1215,195 1215,265 1165,275 C1150,320 1070,320 1050,295 C1010,320 950,300 965,240 Z" fill="#fff"/></g>` +
    `<g transform="translate(1068 228) scale(.9)">${BUBBLE_ICON[n]}</g>`;
  b.style.display = '';
  tween(380, t => b.setAttribute('transform', `translate(1068 228) scale(${easeOutBack(t).toFixed(3)}) translate(-1068 -228)`));
}
function hideBubble() {
  const b = layer('ccBubble');
  tween(220, t => b.setAttribute('transform', `translate(1068 228) scale(${(1 - t).toFixed(3)}) translate(-1068 -228)`), () => { b.style.display = 'none'; });
}
function ask(n: Need) {
  need = n; askedAt = Date.now();
  showBubble(n);
  if (n === 'dirty') addMud();
  sfx('moo'); setTimeout(() => speak(ASK[n]), 900);
  if (!sleeping && !busy) sway(900, 3);
}
function pickNeed(): Need {
  const all: Need[] = ['hungry', 'dirty', 'sleepy', 'cuddle', 'milk'];
  return pick(all.filter(n => n !== need && !(n === 'milk' && milkLevel >= 1)));
}
/** A wish came true: confetti, a happy jump and "Thank you!". */
function fulfilled(n: Need) {
  if (need !== n) return;
  need = null; hideBubble();
  nextNeedAt = Date.now() + rnd(12000, 20000);
  later(n === 'sleepy' ? 400 : 1200, () => {
    confetti(CX, FACE.y - 60, 40); sfx('yay');
    if (!sleeping && !busy) { busy = true; cow.bounce(); later(1600, settle); }
    later(700, () => speak('cc-thanks'));
  });
}

// ---------- mud ----------
function addMud() {
  const g = layer('ccMud'); g.innerHTML = ''; mud = [];
  sfx('thud');
  MUD_SPOTS.forEach(([sx, sy, r], i) => {
    const p = P(sx, sy), s = el('g', { opacity: 0 }, g) as SVGGElement;
    s.innerHTML = `<ellipse cx="${p.x}" cy="${p.y}" rx="${r * k * 1.25}" ry="${r * k}" fill="#7A4A22" opacity=".85"/>` +
      `<circle cx="${p.x + r * .9}" cy="${p.y - r * .5}" r="${r * .3}" fill="#7A4A22" opacity=".8"/>` +
      `<ellipse cx="${p.x - r * .3}" cy="${p.y - r * .25}" rx="${r * .4}" ry="${r * .18}" fill="#A06A3A" opacity=".8"/>`;
    mud.push({ g: s, dirt: 1, x: p.x, y: p.y, r });
    setTimeout(() => tween(260, t => s.setAttribute('opacity', String(easeOut(t)))), i * 90);
  });
}
const dirty = () => mud.some(m => m.dirt > .05);
function scrub(p: Pt, amount = .35) {
  let hit = false;
  for (const m of mud) if (m.dirt > 0 && Math.hypot(m.x - p.x, m.y - p.y) < m.r * 2.2 + 30) {
    m.dirt = Math.max(0, m.dirt - amount); m.g.setAttribute('opacity', String(m.dirt)); hit = true;
    if (m.dirt === 0) { sparkleAt(m.x, m.y, 4, true); sfx('pop'); }
  }
  if (hit && !dirty()) { later(300, () => speak('clean')); fulfilled('dirty'); }
  return hit;
}
function rinseAll() {
  for (const m of mud) { const d0 = m.dirt; tween(900, t => { m.dirt = d0 * (1 - t); m.g.setAttribute('opacity', String(m.dirt)); }); }
  const was = need === 'dirty';
  later(1000, () => { mud.forEach(m => m.dirt = 0); if (was) { speak('clean'); fulfilled('dirty'); } });
}

// ---------- sleep ----------
function goToSleep() {
  sleeping = true; sleepT = 0; busy = false;
  cow.stopClip(); cow.setPose('sleep'); setFurniture();
  sfx('chimeDown'); speak('cc-night');
  layer('ccNight').style.display = '';
  tween(800, t => layer('ccNight').setAttribute('opacity', String(.35 * t)));
  if (need === 'sleepy') fulfilled('sleepy');
}
function wakeUp() {
  if (!sleeping) return;
  sleeping = false; busy = true;
  tween(600, t => layer('ccNight').setAttribute('opacity', String(.35 * (1 - t))), () => { layer('ccNight').style.display = 'none'; });
  cow.setWalk(0, 0); cow.setPose('idle'); setFurniture();
  sfx('moo'); later(300, () => speak('cc-wake'));
  cow.bounce(); later(1600, settle);
}

// ---------- tools ----------
function act(t: Tool, at?: Pt) {
  if (!active()) return;
  if (sleeping && t !== 'sleep') { wakeUp(); return; }
  if (busy && t !== 'brush') return;                  // let the current reaction finish
  input.lastTouch = Date.now();
  ({ pet, brush, wash, food, milk, sleep: () => (sleeping ? wakeUp() : goToSleep()) } as Record<Tool, (p?: Pt) => void>)[t](at);
}

function pet(p = FACE) {
  busy = true;
  cow.stopClip(); cow.setPose('happy'); setFurniture();
  sfx('content'); later(250, () => speak('cc-tickle'));
  hearts(p.x, p.y - 20, 6);
  sway(1400, 4, () => { if (need === 'cuddle') fulfilled('cuddle'); settle(); });
}

function brush(p?: Pt) {
  const b = layer('ccBrushAnim');
  if (p) { scrub(p); sparkleAt(p.x, p.y, 3, true); if (!busy) { busy = true; sfx('rustle'); later(500, () => { busy = false; }); } return; }
  busy = true; sfx('rustle'); speak('cc-brush');
  b.style.display = '';
  tween(1500, t => {
    const x = BACK.x - 60 + Math.sin(t * Math.PI * 6) * 110, y = BACK.y - 30 + t * 120;
    b.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(Math.sin(t * Math.PI * 6) * 25).toFixed(1)})`);
    if (Math.random() < .25) scrub({ x, y }, .25);
    if (Math.random() < .2) particle('spark', x, y, rnd(-60, 60), rnd(20, 80));
  }, () => { b.style.display = 'none'; sway(600, 3, settle); });
}

function wash() {
  busy = true;
  cow.stopClip(); cow.setPose('idle'); setFurniture();
  sfx('water'); speak('cc-splash');
  const sh = layer('ccShower');
  sh.style.display = '';
  tween(250, t => sh.setAttribute('opacity', String(t)));
  let tt = 0;
  const rain = (dt: number) => {
    tt += dt;
    if (Math.random() < .7) particle('drop', rnd(BACK.x - 60, BACK.x + 110), 300 + rnd(0, 30), rnd(-15, 15), -rnd(0, 20));
    if (tt > 1700) tickers.delete(rain);
  };
  tickers.add(rain);
  if (mud.length) rinseAll();
  later(1800, () => {
    tween(250, t => sh.setAttribute('opacity', String(1 - t)), () => { sh.style.display = 'none'; });
    // Shake off the water like a wet dog, droplets flying both ways
    for (let i = 0; i < 26; i++) setTimeout(() => particle('drop', BACK.x + rnd(-160, 120), BACK.y + rnd(-40, 60), rnd(-260, 260), rnd(60, 160)), i * 30);
    cow.playClip('shake', false, settle);
  });
}

function food(p?: Pt) {
  busy = true;
  const [name, art] = FOODS[foodIdx++ % FOODS.length];
  const [w, h] = fit(art, undefined, 80);
  const f = el('g', {}, fx) as SVGGElement;
  f.innerHTML = img(art, 0, h / 2, w, h);
  const from = p && Math.hypot(p.x - MOUTH.x, p.y - MOUTH.y) > 60 ? p : { x: 865, y: 830 };
  speak(name);
  cow.stopClip(); cow.setPose('idle');
  tween(700, t => {
    const e = easeOut(t), x = from.x + (MOUTH.x - from.x) * e, y = from.y + (MOUTH.y - from.y) * e - Math.sin(Math.PI * t) * 120;
    f.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 - .55 * t).toFixed(2)})`);
  }, () => {
    f.remove();
    sfx('chomp'); later(800, () => sfx('chomp'));
    cow.playClip('eat', false, () => {
      hearts(MOUTH.x, MOUTH.y - 40, 4); speak('yummy');
      if (need === 'hungry') fulfilled('hungry');
      settle();
    });
  });
}

function milk() {
  busy = true;
  cow.stopClip(); cow.setPose('idle'); setFurniture();
  sfx('pop'); speak('milk');
  const s = layer('ccMilkStream'), fill = $('ccMilkFill');
  s.style.display = '';
  const prev = milkLevel; milkLevel = Math.min(1, milkLevel + .34);
  let tt = 0;
  const drip = (dt: number) => { tt += dt; if (Math.random() < .3) particle('milk', BUCKET.x - 10 + rnd(-20, 20), BUCKET.y - 125, rnd(-30, 30), rnd(10, 40)); if (tt > 1300) tickers.delete(drip); };
  tickers.add(drip);
  tween(1400, t => {
    s.setAttribute('stroke-dashoffset', String(-t * 400));
    const lv = prev + (milkLevel - prev) * t;
    fill.setAttribute('ry', String(4 + 12 * lv)); fill.setAttribute('cy', String(BUCKET.y - 110 + 0 * lv)); fill.setAttribute('opacity', String(lv > 0 ? 1 : 0));
  }, () => {
    s.style.display = 'none';
    sway(700, 2, () => {
      if (milkLevel >= 1) { sparkleAt(BUCKET.x, BUCKET.y - 120, 8, true); later(9000, () => { milkLevel = 0; fill.setAttribute('opacity', '0'); }); }
      if (need === 'milk') fulfilled('milk');
      settle();
    });
  });
}

function makeTool(t: Tool, i: number) {
  const x = 125 + i * 218, y = 782;
  const g = el('g', { 'data-id': 'cc-' + t, role: 'button', 'aria-label': t }, layer('ccTools')) as SVGGElement;
  g.innerHTML = `<rect id="ccBtn-${t}" x="${x}" y="${y}" rx="36" width="172" height="102" fill="${COLORS[t]}" stroke="#fffaec" stroke-width="6" filter="url(#ccToolShadow)"/>` +
    `<path d="M${x + 22} ${y + 16} Q${x + 85} ${y - 3} ${x + 146} ${y + 16}" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="8" stroke-linecap="round"/>` +
    toolSvg(t, x + 86, y + 51, .68);
  const press = () => tween(260, k2 => g.setAttribute('transform', `translate(${x + 86} ${y + 51}) scale(${(1 - Math.sin(Math.PI * k2) * .08).toFixed(3)}) translate(${-(x + 86)} ${-(y + 51)})`), () => g.removeAttribute('transform'));
  const onCow = (p: Pt) => p.x > CX - 260 && p.x < CX + 260 && p.y > CY - CH - 20 && p.y < CY + 10;
  const tool: Interactive = {
    tap: () => { press(); act(t); },
    drag: {
      start(_p0, p) {
        if (!active()) return false;
        ghost?.remove();
        ghost = el('g', { 'pointer-events': 'none' }, layer('ccDrag')) as SVGGElement;
        ghost.innerHTML = `<ellipse cy="10" rx="62" ry="58" fill="#fff9e6" stroke="#fff" stroke-width="6" opacity=".9"/>` + toolSvg(t, 0, 0, .9);
        ghost.setAttribute('transform', `translate(${p.x} ${p.y})`);
        if (sleeping && t !== 'sleep') wakeUp();
      },
      move(p) {
        ghost?.setAttribute('transform', `translate(${p.x} ${p.y})`);
        if (t === 'brush' && onCow(p) && !sleeping) { act('brush', p); if (Math.random() < .3) particle('spark', p.x, p.y); }
        if (t === 'wash' && onCow(p) && Math.random() < .5) particle('drop', p.x, p.y, rnd(-40, 40), -10);
      },
      end(p) {
        ghost?.remove(); ghost = null;
        if (t === 'brush') { if (onCow(p) && !busy) settle(); return; }
        if (onCow(p)) act(t, p);
      }
    }
  };
  objs['cc-' + t] = tool;
}

export function initCowCare() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'cowcare');
  svg.setAttribute('class', 'scene');
  svg.setAttribute('viewBox', '0 0 1600 900');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.display = 'none';
  svg.innerHTML = [
    '<defs>',
    '<linearGradient id="ccWall" x2=".8" y2="1"><stop stop-color="#f3996d"/><stop offset=".52" stop-color="#ca664f"/><stop offset="1" stop-color="#a94d3a"/></linearGradient>',
    '<linearGradient id="ccFloor" x2="0" y2="1"><stop stop-color="#f9d5a2"/><stop offset=".6" stop-color="#e0aa71"/><stop offset="1" stop-color="#bf7b49"/></linearGradient>',
    '<linearGradient id="ccWood" x2=".7" y2="1"><stop stop-color="#ffcc8e"/><stop offset=".5" stop-color="#ca8a4f"/><stop offset="1" stop-color="#9d623d"/></linearGradient>',
    '<radialGradient id="ccGold"><stop stop-color="#fff8cb"/><stop offset=".6" stop-color="#ffdd78"/><stop offset="1" stop-color="#eaa83c"/></radialGradient>',
    '<linearGradient id="ccSilver" x2="1" y2=".25"><stop stop-color="#87aab9"/><stop offset=".28" stop-color="#f9ffff"/><stop offset=".6" stop-color="#b5cdd5"/><stop offset="1" stop-color="#638c9d"/></linearGradient>',
    '<radialGradient id="ccPink"><stop stop-color="#ffcddc"/><stop offset=".65" stop-color="#fc8ba9"/><stop offset="1" stop-color="#d95780"/></radialGradient>',
    '<linearGradient id="ccMoon" x2="1" y2="1"><stop stop-color="#fff8c3"/><stop offset="1" stop-color="#ddb2ff"/></linearGradient>',
    '<radialGradient id="ccWindowGlow"><stop stop-color="#fff9bf" stop-opacity=".7"/><stop offset="1" stop-color="#fff9bf" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="ccShadow"><stop offset="0" stop-color="#5A2E1E" stop-opacity=".32"/><stop offset="1" stop-color="#5A2E1E" stop-opacity="0"/></radialGradient>',
    '<filter id="ccToolShadow" x="-30%" y="-40%" width="170%" height="190%"><feDropShadow dx="0" dy="9" stdDeviation="9" flood-color="#603b26" flood-opacity=".3"/></filter>',
    '<filter id="ccSoftShadow"><feDropShadow dx="0" dy="10" stdDeviation="13" flood-color="#562a23" flood-opacity=".26"/></filter>',
    '<clipPath id="ccWindowClip"><rect x="92" y="137" width="388" height="313" rx="24"/></clipPath>',
    '</defs>',
    // Barn stall
    '<rect x="-2400" y="-2400" width="6400" height="3010" fill="url(#ccWall)"/>',
    '<g opacity=".23" stroke="#873e31" stroke-width="7"><path d="M-400 202H2000M-400 406H2000M-400 600H2000"/></g>',
    '<g stroke="url(#ccWood)" stroke-width="33" opacity=".95"><path d="M85 0V610M1515 0V610M-400 68H2000"/></g>',
    '<rect x="69" y="115" width="435" height="360" rx="45" fill="#ffe2ad" stroke="#fff3ce" stroke-width="14" filter="url(#ccSoftShadow)"/>',
    '<g clip-path="url(#ccWindowClip)"><rect x="90" y="136" width="390" height="320" fill="#9ee5fc"/><image href="' + url('bg-hills') + '" x="90" y="139" width="390" height="316" preserveAspectRatio="xMidYMid slice"/><rect x="90" y="136" width="390" height="320" fill="url(#ccWindowGlow)"/></g>',
    '<path d="M286 135V451M90 298H485" stroke="#ffeccc" stroke-width="17"/>',
    '<path d="M105 450H479" stroke="#e7b87b" stroke-width="14" stroke-linecap="round"/>',
    '<rect x="1122" y="156" width="373" height="27" rx="14" fill="url(#ccWood)" filter="url(#ccSoftShadow)"/>',
    '<image href="' + url('hay') + '" x="1220" y="230" width="240" height="170" filter="url(#ccSoftShadow)"/>',
    '<image href="' + url('bush') + '" x="1188" y="80" width="190" height="110"/>',
    '<rect x="-2400" y="610" width="6400" height="3000" fill="url(#ccFloor)"/>',
    '<g stroke="#b57f56" stroke-width="5" opacity=".32"><path d="M-400 691H2000M-400 807H2000M300 610L150 900M920 610L862 900M1420 610L1510 900"/></g>',
    '<ellipse cx="807" cy="745" rx="405" ry="75" fill="#a5d7c7" opacity=".4"/>',
    '<ellipse cx="804" cy="741" rx="359" ry="53" fill="#d9f8e8" opacity=".83"/>',
    // Bucket beside her back legs, with the milk inside
    `<g id="ccBucket" filter="url(#ccSoftShadow)"><path d="M${BUCKET.x - 70} ${BUCKET.y - 128}L${BUCKET.x - 58} ${BUCKET.y - 8}Q${BUCKET.x} ${BUCKET.y + 12} ${BUCKET.x + 58} ${BUCKET.y - 8}L${BUCKET.x + 70} ${BUCKET.y - 128}Z" fill="url(#ccSilver)" stroke="#eaf8ff" stroke-width="6"/>` +
    `<ellipse cx="${BUCKET.x}" cy="${BUCKET.y - 128}" rx="70" ry="18" fill="#e8faff" stroke="#7797a5" stroke-width="7"/>` +
    `<ellipse id="ccMilkFill" cx="${BUCKET.x}" cy="${BUCKET.y - 110}" rx="58" ry="4" fill="#fff" opacity="0"/>` +
    `<path d="M${BUCKET.x - 70} ${BUCKET.y - 118}Q${BUCKET.x} ${BUCKET.y - 236} ${BUCKET.x + 70} ${BUCKET.y - 118}" fill="none" stroke="#8eafbf" stroke-width="11"/></g>`,
    `<ellipse cx="${CX}" cy="${CY - 2}" rx="230" ry="34" fill="url(#ccShadow)"/>`,
    '<g id="ccCowLayer"></g>',
    '<g id="ccMud" pointer-events="none"></g>',
    // Milk from the udder into the bucket
    `<path id="ccMilkStream" d="M${UDDER.x} ${UDDER.y + 10} Q${UDDER.x + 120} ${UDDER.y - 20} ${BUCKET.x - 20} ${BUCKET.y - 125}" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" stroke-dasharray="30 14" style="display:none" pointer-events="none"/>`,
    // Shower head above her back
    `<g id="ccShower" style="display:none" opacity="0" pointer-events="none">${toolSvg('wash', BACK.x + 25, 230, 1.3).replace('<g transform', '<g transform="rotate(200 ' + (BACK.x + 25) + ' 230)"><g transform') + '</g>'}</g>`,
    `<g id="ccBrushAnim" style="display:none" pointer-events="none">${toolSvg('brush', 0, 0, 1)}</g>`,
    '<rect id="ccNight" x="-2400" y="-2400" width="6400" height="6400" fill="#1E2450" opacity="0" style="display:none" pointer-events="none"/>',
    '<g id="ccBubble" style="display:none" pointer-events="none"></g>',
    '<g id="ccFx" pointer-events="none"></g>',
    '<g id="ccDrag" pointer-events="none"></g>',
    '<g id="ccTools"></g>'
  ].join('');
  $('rooms').before(svg);
  fx = layer('ccFx');

  cow = new Animal('cow', 'cc-cow', CX, CY, CH, layer('ccCowLayer'), false, false);
  // A bell on a red collar under her chin
  const bell = el('g', { id: 'ccBell', 'data-id': 'cc-bell' }, cow.g) as SVGGElement;
  const bx = BELL.x - CX, by = BELL.y - CY;
  bell.innerHTML = `<path d="M${bx - 62} ${by - 18} Q${bx} ${by + 14} ${bx + 70} ${by - 22}" stroke="#E53935" stroke-width="14" fill="none" stroke-linecap="round"/>` +
    `<g class="b"><path d="M${bx - 20} ${by + 34} Q${bx - 22} ${by + 2} ${bx} ${by} Q${bx + 22} ${by + 2} ${bx + 20} ${by + 34} Z" fill="url(#ccGold)" stroke="#C99A1E" stroke-width="3"/>` +
    `<circle cx="${bx}" cy="${by + 38}" r="7" fill="#C99A1E"/><circle cx="${bx - 7}" cy="${by + 12}" r="4" fill="#fff" opacity=".8"/></g>` +
    `<circle cx="${bx}" cy="${by + 20}" r="44" fill="transparent"/>`;
  objs['cc-bell'] = {
    tap: () => {
      if (!active() || sleeping) return;
      jingle(); jingle(.18);
      const b = bell.querySelector('.b') as SVGGElement;
      tween(700, t => b.setAttribute('transform', `rotate(${(Math.sin(t * Math.PI * 6) * 22 * (1 - t)).toFixed(1)} ${bx} ${by})`), () => b.removeAttribute('transform'));
      sparkleAt(BELL.x, BELL.y + 30, 4, true);
    }
  };

  // The cow herself: tap to cuddle, hold for a long cuddle, rub to give scratches
  let holding = false;
  objs['cc-cow'] = {
    tap: p => act('pet', p),
    hold: {
      start: () => {
        if (!active()) return;
        if (sleeping) { wakeUp(); return; }
        holding = true; busy = true;
        cow.stopClip(); cow.setPose('happy'); setFurniture(); sfx('content');
        let t = 0, ht = 0;
        const tick = (dt: number) => {
          if (!holding) { tickers.delete(tick); return; }
          t += dt; ht += dt;
          cow.setWalk(0, Math.sin(t / 160) * 3);
          if (ht > 300) { ht = 0; hearts(FACE.x + rnd(-80, 80), FACE.y - 40, 1); }
        };
        tickers.add(tick);
        if (need === 'cuddle') later(900, () => fulfilled('cuddle'));
      },
      end: () => { if (!holding) return; holding = false; speak('cc-tickle'); settle(); }
    },
    drag: {
      start: () => { if (!active()) return false; },
      move: p => { if (Math.random() < .12) hearts(p.x, p.y, 1); },
      end: p => act('pet', p)
    }
  };
  TOOLS.forEach(makeTool);

  tickers.add(() => { if (entered) setFurniture(); });

  // Needs come and go; the cow sometimes yawns or swishes while waiting
  setInterval(() => {
    if (!active()) return;
    const now = Date.now();
    if (sleeping) {
      sleepT += 500;
      if (sleepT % 1500 === 0) zzz(FACE.x - 30, FACE.y + 40);
      cow.setWalk(Math.abs(Math.sin(now / 900)) * 3, 0);
      if (sleepT > 15000) wakeUp();
      return;
    }
    if (!need && now > nextNeedAt && !busy) ask(pickNeed());
    else if (need && now - askedAt > 12000 && !busy) { askedAt = now; sfx('moo'); sway(700, 3); speak(ASK[need]); }
  }, 500);
}

export function cowCareEnter() {
  entered = true; busy = false; sleeping = false; need = null; milkLevel = 0;
  layer('ccMud').innerHTML = ''; mud = [];
  layer('ccBubble').style.display = 'none';
  layer('ccNight').style.display = 'none';
  $('ccMilkFill').setAttribute('opacity', '0');
  cow.setWalk(0, 0); cow.rest(); setFurniture();
  nextNeedAt = Date.now() + 5000;
  setTimeout(() => sfx('moo'), 400);
  if (location.search.includes('debug')) (window as any).cc = { ask };
}
export function cowCareLeave() {
  entered = false; ghost?.remove(); ghost = null;
  fx.innerHTML = ''; layer('ccDrag').innerHTML = '';
  if (sleeping) { sleeping = false; cow.setPose('idle'); }
}
