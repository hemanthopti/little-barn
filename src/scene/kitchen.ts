import { $, el, rnd, pick, clamp, easeOut, bounceOut } from '../core/util';
import { tween, tickers } from '../core/engine';
import { objs, input, Pt } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { fit, img } from '../art/sprites';
import { Animal } from './animal';
import { hearts, sparkleAt } from './fx';

/**
 * The kitchen: a fridge full of food to feed the puppy and kitty, soup to stir, an oven that bakes cookies,
 * a toaster, a sink to wash the plate in, a whistling kettle and a cuckoo clock.
 * Same scene units as the farm (1600 x 900). Everything here has an id starting with "k-".
 */

const pic = (n: string, x: number, y: number, w: number, h: number, a: 'bottom' | 'center' | 'topleft' = 'bottom', extra = '') =>
  img('k/' + n, x, y, w, h, a, extra);
const layer = (id: string) => $(id) as SVGGElement;
const kfx = () => layer('kfx');
const active = () => state.started && !state.asleep && state.scene === 'kitchen' && $('panel').hidden;

// ---------- layout (scene units) ----------
const COUNTER_Y = 482;                       // where things stand on the worktop
const SINK = { x: 933, y: 478, x0: 790, x1: 1076, spoutX: 967, spoutY: 392 };
const SOUP = { x: 547, y: 474, rx: 75, ry: 27 };
const BOWL = { x: 1180, y: 716, w: 112 };
const HOME_PLATE = { x: 1130, y: COUNTER_Y + 2 };

const FOOD: Record<string, { h: number; c: string }> = {
  milk: { h: 74, c: '#FFFFFF' }, cheese: { h: 52, c: '#F7C948' }, grapes: { h: 62, c: '#8E5BC4' },
  banana: { h: 58, c: '#F5D547' }, orange: { h: 58, c: '#FF9800' }, tomato: { h: 56, c: '#E53935' },
  carrot: { h: 70, c: '#F08A24' }, broccoli: { h: 62, c: '#5DAA3A' }, watermelon: { h: 50, c: '#F25C5C' },
  toast: { h: 56, c: '#D9A05B' }, cookie: { h: 46, c: '#C88A4A' }
};
const SHELVES: [string, number, number][] = [
  ['milk', 140, 511], ['cheese', 219, 511], ['grapes', 298, 511],
  ['banana', 140, 596], ['orange', 219, 596], ['tomato', 298, 596],
  ['carrot', 140, 681], ['broccoli', 219, 681], ['watermelon', 298, 681]
];

let pets: Animal[] = [];

// ---------- food you can carry around ----------
type Item = { id: string; name: string; g: SVGGElement; x: number; y: number; h: number; s: number; home?: Pt; out: boolean; busy: boolean };
const items: Item[] = [];
let seq = 0;

function place(it: Item) { it.g.setAttribute('transform', `translate(${it.x.toFixed(1)},${it.y.toFixed(1)}) scale(${it.s.toFixed(3)})`); }

function makeItem(name: string, x: number, y: number, parent: Element, home = false): Item {
  const h = FOOD[name].h, [w] = fit('k/' + name, undefined, h);
  const id = home ? `k-f-${name}` : `k-${name}-${++seq}`;
  const g = el('g', { 'data-id': id }, parent) as SVGGElement;
  g.innerHTML = `<rect x="${(-w * .65).toFixed(1)}" y="${(-h * 1.2).toFixed(1)}" width="${(w * 1.3).toFixed(1)}" height="${(h * 1.35).toFixed(1)}" fill="transparent"/>` +
    pic(name, 0, 0, w, h);
  const it: Item = { id, name, g, x, y, h, s: 1, home: home ? { x, y } : undefined, out: false, busy: false };
  place(it);
  let off = { x: 0, y: 0 };
  objs[id] = {
    tap: () => {
      if (it.busy) return;
      hop(it); speak(name); sparkleAt(it.x, it.y - h / 2, 5, true);
      if (fridgeOpen) armFridgeClose();
    },
    drag: {
      start: p0 => {
        if (it.busy) return false;
        off = { x: it.x - p0.x, y: it.y - p0.y };
        layer('kFront').appendChild(g);
        if (!it.out) { it.out = true; items.push(it); }
        else { items.splice(items.indexOf(it), 1); items.push(it); }
        it.s = 1.2; place(it); sfx('pop');
        if (fridgeOpen) armFridgeClose();
      },
      move: p => {
        it.x = clamp(p.x + off.x, 20, 1580); it.y = clamp(p.y + off.y, 140, 892);
        place(it);
      },
      end: () => { it.s = 1; place(it); drop(it); }
    }
  };
  return it;
}

function hop(it: Item) {
  it.busy = true;
  const y0 = it.y;
  tween(420, t => { it.y = y0 - Math.sin(Math.PI * t) * 26; place(it); }, () => { it.y = y0; place(it); it.busy = false; });
}

/** Gone from view: fridge food goes back to its shelf (unseen until the door opens), toast and cookies vanish. */
function gone(it: Item) {
  const i = items.indexOf(it); if (i >= 0) items.splice(i, 1);
  it.out = false; it.busy = false; it.s = 1;
  if (it.home) {
    it.x = it.home.x; it.y = it.home.y; place(it);
    layer('kFoods').appendChild(it.g);
  } else { it.g.remove(); delete objs[it.id]; }
}

/** Keep the floor from filling up: the oldest loose item tidies itself away. */
function tidy() { while (items.length > 10) { const o = items[0]; sparkleAt(o.x, o.y - o.h / 2, 4, true); gone(o); } }

function nearPet(x: number, y: number): Animal | null {
  let best: Animal | null = null, bd = 160;
  for (const a of pets) { const h = a.head(), d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = a; } }
  return best;
}

function drop(it: Item) {
  const cx = it.x, cy = it.y - it.h / 2;
  const a = nearPet(cx, cy);
  if (a) return feed(a, it);
  if (((cx - SOUP.x) / 140) ** 2 + ((cy - SOUP.y) / 85) ** 2 < 1) return intoPot(it);
  if (fridgeOpen && it.home && cx > 95 && cx < 345 && cy > 360 && cy < 720) { // put it back in the fridge
    sparkleAt(cx, cy, 5, true); sfx('pop'); gone(it); return;
  }
  fall(it);
}

function fall(it: Item) {
  const onCounter = it.y < 565 && it.x > 275 && it.x < 1585 && !(it.x > 395 && it.x < 705) && !(it.x > SINK.x0 && it.x < SINK.x1);
  const ty = onCounter ? COUNTER_Y + rnd(-2, 4) : Math.min(885, Math.max(it.y, rnd(735, 760)));
  const y0 = it.y, d = Math.abs(ty - y0);
  if (d < 4) { it.y = ty; place(it); tidy(); return; }
  it.busy = true;
  tween(clamp(d * 1.6, 200, 650), t => { it.y = y0 + (ty - y0) * bounceOut(t); place(it); }, () => {
    it.busy = false; sfx('thud'); tidy();
  });
}

function feed(a: Animal, it: Item) {
  it.busy = true;
  const h = a.head(), x0 = it.x, y0 = it.y, tx = h.x, ty = h.y + it.h * .4;
  a.setFacing(x0 > a.x ? 1 : -1);
  tween(380, t => { it.x = x0 + (tx - x0) * t; it.y = y0 + (ty - y0) * t; it.s = 1 - t * .9; place(it); }, () => {
    gone(it);
    sfx('chomp'); a.bounce(); hearts(h.x, h.y - 20, 4);
    setTimeout(() => speak('yummy'), 650);
  });
}

// ---------- soup pot ----------
const soup = { colours: [] as string[], ready: false, turns: 0, serving: false };
let soupEl: SVGEllipseElement, swirlEl: SVGGElement, spoonEl: SVGGElement, steamT = 0;

function mix(cs: string[]) {
  const n = cs.length, rgb = [0, 0, 0];
  cs.forEach(c => { for (let i = 0; i < 3; i++) rgb[i] += parseInt(c.slice(1 + i * 2, 3 + i * 2), 16) / n; });
  return '#' + rgb.map(v => Math.round(v * .85 + 30).toString(16).padStart(2, '0')).join('');
}
function drawSoup() {
  const has = soup.colours.length > 0;
  soupEl.style.display = has ? '' : 'none';
  swirlEl.style.display = has ? '' : 'none';
  if (has) soupEl.setAttribute('fill', mix(soup.colours.slice(-6)));
}
function intoPot(it: Item) {
  it.busy = true;
  const x0 = it.x, y0 = it.y;
  tween(360, t => { it.x = x0 + (SOUP.x - x0) * t; it.y = y0 + (SOUP.y + 10 - y0) * t - Math.sin(Math.PI * t) * 60; it.s = 1 - t * .7; place(it); }, () => {
    gone(it);
    soup.colours.push(FOOD[it.name].c); soup.turns = 0; drawSoup();
    sfx('bubble'); splashDrops(SOUP.x, SOUP.y);
    if (soup.colours.length === 1) setTimeout(() => speak('soup'), 400);
  });
}
function splashDrops(x: number, y: number) {
  for (let i = 0; i < 6; i++) {
    const c = el('circle', { r: rnd(4, 7), fill: soup.colours.length ? mix(soup.colours) : '#CFEFFF', cx: x, cy: y }, kfx());
    const dx = rnd(-60, 60), up = rnd(40, 80);
    tween(500, t => { c.setAttribute('cx', String(x + dx * t)); c.setAttribute('cy', String(y - up * Math.sin(Math.PI * t) + 10 * t)); }, () => c.remove());
  }
}
function setSpoon(angle: number | null) {
  if (angle === null) { spoonEl.setAttribute('transform', `translate(${SOUP.x + 40},${SOUP.y + 6}) rotate(0)`); return; }
  const x = SOUP.x + Math.cos(angle) * SOUP.rx * .55, y = SOUP.y + Math.sin(angle) * SOUP.ry * .55 + 6;
  spoonEl.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(Math.cos(angle) * 12).toFixed(1)})`);
  swirlEl.setAttribute('transform', `translate(${SOUP.x},${SOUP.y}) scale(1,${(SOUP.ry / SOUP.rx).toFixed(3)}) rotate(${(angle * 180 / Math.PI).toFixed(1)})`);
}
function soupReady() {
  soup.ready = true; steamT = 0;
  sfx('chimeUp'); sparkleAt(SOUP.x, SOUP.y - 30, 9, true);
  setTimeout(() => speak('soupready'), 500);
}
function steam(x: number, y: number, dx = 0, big = 1) {
  const c = el('circle', { cx: x, cy: y, r: 10 * big, fill: '#fff', opacity: 0 }, kfx());
  const drift = rnd(-20, 20) + dx;
  tween(1400, t => {
    c.setAttribute('cx', String(x + drift * t)); c.setAttribute('cy', String(y - 110 * t * big));
    c.setAttribute('r', String((10 + 22 * t) * big)); c.setAttribute('opacity', String(.55 * Math.sin(Math.PI * t)));
  }, () => c.remove());
}
function serve() {
  if (soup.serving) return;
  soup.serving = true;
  const col = mix(soup.colours.slice(-6));
  const blob = el('ellipse', { rx: 20, ry: 12, fill: col }, kfx());
  sfx('swish');
  const bx = BOWL.x, by = BOWL.y - 62;
  tween(700, t => {
    blob.setAttribute('cx', String(SOUP.x + (bx - SOUP.x) * t));
    blob.setAttribute('cy', String(SOUP.y + (by - SOUP.y) * t - Math.sin(Math.PI * t) * 220));
  }, () => {
    blob.remove();
    const fill = $('k-bowlSoup') as SVGEllipseElement;
    fill.setAttribute('fill', col); fill.style.display = '';
    soup.colours = []; soup.ready = false; soup.turns = 0; drawSoup();
    sfx('splash');
    pets.forEach((a, i) => setTimeout(() => {
      a.setFacing(bx > a.x ? 1 : -1);
      sfx('chomp'); a.bounce(); const h = a.head(); hearts(h.x, h.y - 20, 4);
    }, 300 + i * 500));
    setTimeout(() => speak('yummy'), 900);
    tween(2600, t => { fill.setAttribute('ry', String(13 * (1 - t))); fill.setAttribute('rx', String(42 * (1 - t * .5))); }, () => {
      fill.style.display = 'none'; fill.setAttribute('ry', '13'); fill.setAttribute('rx', '42');
      soup.serving = false;
    });
  });
}

// ---------- fridge ----------
let fridgeOpen = false, fridgeTimer = 0;
function armFridgeClose() { clearTimeout(fridgeTimer); fridgeTimer = window.setTimeout(() => setFridge(false), 20000); }
function setFridge(open: boolean) {
  if (open === fridgeOpen) return;
  fridgeOpen = open;
  $('k-fridgeShut').style.display = open ? 'none' : '';
  $('k-fridgeOpen').style.display = open ? '' : 'none';
  layer('kFoods').style.display = open ? '' : 'none';
  sfx(open ? 'swish' : 'thud');
  if (open) { armFridgeClose(); sparkleAt(220, 470, 6, true); } else clearTimeout(fridgeTimer);
}

// ---------- water ----------
let waterUntil = 0;
function runWater(ms: number) {
  const was = Date.now() < waterUntil;
  waterUntil = Math.max(waterUntil, Date.now() + ms);
  if (was) return;
  sfx('water');
  const s = $('k-stream') as SVGRectElement;
  s.style.display = '';
  let bt = 0;
  const tick = (dt: number) => {
    if (Date.now() > waterUntil || state.scene !== 'kitchen') { s.style.display = 'none'; tickers.delete(tick); return; }
    s.setAttribute('stroke-dashoffset', String((Date.now() / 6) % 40));
    if ((bt += dt) > 140) {
      bt = 0;
      const x = rnd(SINK.x - 90, SINK.x + 90), c = el('circle', { cx: x, cy: SINK.y, r: rnd(5, 10), fill: '#fff', 'fill-opacity': .5, stroke: '#9ADBFF', 'stroke-width': 2 }, kfx());
      tween(900, t => { c.setAttribute('cy', String(SINK.y - 50 * t)); c.setAttribute('opacity', String(1 - t)); }, () => c.remove());
    }
  };
  tickers.add(tick);
}

// ---------- the dirty plate ----------
let plateDirty = true, plateBusy = false;
function plateMarks(on: boolean) { $('k-smudge').setAttribute('opacity', on ? '1' : '0'); }

// ---------- build ----------
export function initKitchen() {
  const back = layer('kBack'), mid = layer('kMid');

  // Cuckoo clock on the wall
  const [cw] = fit('k/clock', undefined, 200);
  const clock = el('g', { 'data-id': 'k-clock' }, back) as SVGGElement;
  clock.innerHTML = `<g id="k-clockSwing">${pic('clock', 170 - cw / 2, 80, cw, 200, 'topleft')}</g>` +
    `<g id="k-cuckoo" transform="translate(170,118) scale(0)">${pic('cuckoo', 0, 0, 74, 67, 'center')}</g>`;
  let ct = 0;
  tickers.add(dt => { if (state.scene !== 'kitchen') return; ct += dt; $('k-clockSwing').setAttribute('transform', `rotate(${(Math.sin(ct / 900) * 1.5).toFixed(2)} 170 80)`); });
  let cuckooBusy = false;
  const cuckoo = () => {
    if (cuckooBusy) return; cuckooBusy = true;
    const b = $('k-cuckoo');
    sfx('cuckoo');
    tween(1300, t => {
      const k = t < .2 ? easeOut(t / .2) : t > .8 ? 1 - (t - .8) / .2 : 1;
      const bob = t > .2 && t < .8 ? Math.abs(Math.sin((t - .2) / .6 * Math.PI * 2)) * -10 : 0;
      b.setAttribute('transform', `translate(170,${(118 - 40 * k + bob).toFixed(1)}) scale(${k.toFixed(3)})`);
    }, () => { cuckooBusy = false; });
    setTimeout(() => speak('cuckoo'), 1200);
  };
  objs['k-clock'] = { tap: cuckoo };

  // Fridge: closed and open pictures; the open one is wider (the door swings out to the left)
  const fridge = el('g', { 'data-id': 'k-fridge' }, back) as SVGGElement;
  const [fw] = fit('k/fridge-open', undefined, 540);
  fridge.innerHTML = `<g id="k-fridgeShut">${pic('fridge', 198, 870, 316, 540)}</g>` +
    `<g id="k-fridgeOpen" style="display:none">${pic('fridge-open', 356 - fw * .96 + fw / 2, 870, fw, 540)}</g>` +
    `<g id="kFoods" style="display:none"></g>`;
  objs['k-fridge'] = { tap: () => setFridge(!fridgeOpen) };
  for (const [n, x, y] of SHELVES) makeItem(n, x, y, $('kFoods'), true);

  // Stove with the soup pot on top
  const stove = el('g', { 'data-id': 'k-stove' }, back) as SVGGElement;
  stove.innerHTML = pic('stove', 550, 875, 300, 330) +
    `<rect id="k-ovenGlow" x="460" y="672" width="180" height="128" rx="26" fill="url(#kGlow)" opacity="0" pointer-events="none"/>`;
  const pot = el('g', { 'data-id': 'k-pot' }, back) as SVGGElement;
  pot.innerHTML = `<ellipse cx="${SOUP.x}" cy="${SOUP.y}" rx="${SOUP.rx + 40}" ry="${SOUP.ry + 50}" fill="transparent"/>` +
    pic('pot', 550, 590, 250, 165) +
    `<ellipse id="k-soup" cx="${SOUP.x}" cy="${SOUP.y}" rx="${SOUP.rx}" ry="${SOUP.ry}" style="display:none"/>` +
    `<g id="k-swirl" style="display:none" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round">` +
    `<path d="M-40,0 A40,40 0 0 1 0,-40"/><path d="M40,0 A40,40 0 0 1 0,40"/><path d="M-18,22 A28,28 0 0 1 -22,-14"/></g>` +
    `<g id="k-spoon">${pic('spoon', 0, 0, 92, 95, 'topleft', 'transform="translate(-14,-86)"')}</g>`;
  soupEl = $('k-soup'); swirlEl = $('k-swirl'); spoonEl = $('k-spoon');
  setSpoon(null);
  let lastA = 0, sinceBubble = 0;
  const angle = (p: Pt) => Math.atan2((p.y - SOUP.y) / SOUP.ry, (p.x - SOUP.x) / SOUP.rx);
  objs['k-pot'] = {
    tap: () => {
      if (soup.ready) return serve();
      sfx('bubble');
      if (soup.colours.length) { splashDrops(SOUP.x, SOUP.y); speak('soup'); }
      else { sparkleAt(SOUP.x, SOUP.y - 20, 5, true); if (!fridgeOpen) { setFridge(true); } }
    },
    drag: {
      start: (p0, p) => {
        if (Math.abs(p0.x - SOUP.x) > 130 || Math.abs(p0.y - SOUP.y) > 90 || soup.serving) return false;
        lastA = angle(p); sinceBubble = 0;
      },
      move: p => {
        const a = angle(p); let d = a - lastA;
        if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
        lastA = a; soup.turns += Math.abs(d); sinceBubble += Math.abs(d);
        setSpoon(a);
        if (sinceBubble > 1.6) { sinceBubble = 0; sfx(soup.colours.length ? 'bubble' : 'swish'); }
        if (!soup.ready && soup.colours.length && soup.turns > Math.PI * 4) soupReady();
      },
      end: () => setSpoon(null)
    }
  };

  // Oven: bake cookies
  let baking = false, trayLeft = 0;
  const tray = el('g', { 'data-id': 'k-tray', style: 'display:none' }, back) as SVGGElement;
  tray.innerHTML = pic('cookies', 728, COUNTER_Y + 2, 104, 61);
  objs['k-stove'] = {
    tap: () => {
      if (baking) return;
      if (trayLeft) { sparkleAt(728, COUNTER_Y - 30, 6); speak('cookie'); return; }
      baking = true; sfx('click'); speak('hot');
      const glow = $('k-ovenGlow');
      tween(3000, t => glow.setAttribute('opacity', String((Math.min(1, t * 5) * (.55 + .25 * Math.sin(t * 30))).toFixed(3))), () => {
        glow.setAttribute('opacity', '0'); baking = false;
        sfx('ding'); trayLeft = 3; tray.style.display = '';
        sparkleAt(728, COUNTER_Y - 30, 9, true);
        setTimeout(() => speak('cookie'), 700);
      });
    }
  };
  objs['k-tray'] = {
    tap: () => {
      if (!trayLeft) return;
      trayLeft--;
      const c = makeItem('cookie', 728, COUNTER_Y - 20, layer('kFront'));
      c.out = true; items.push(c); c.busy = true;
      const tx = rnd(600, 900), ty = rnd(760, 860);
      sfx('pop');
      tween(650, t => { c.x = 728 + (tx - 728) * t; c.y = COUNTER_Y - 20 + (ty - COUNTER_Y + 20) * t - Math.sin(Math.PI * t) * 160; place(c); },
        () => { c.busy = false; sfx('thud'); tidy(); speak('cookie'); });
      if (!trayLeft) setTimeout(() => { tray.style.display = 'none'; }, 300);
    }
  };

  // Toaster: bread goes down, ding, toast pops out
  const [tw] = fit('k/toaster', undefined, 105);
  const toaster = el('g', { 'data-id': 'k-toaster' }, back) as SVGGElement;
  toaster.innerHTML = `<g id="k-bread">${pic('bread', 1278, 406, 58, 56)}</g>` + pic('toaster', 1290, COUNTER_Y, tw, 105);
  let toasting = false;
  objs['k-toaster'] = {
    tap: () => {
      if (toasting) return;
      toasting = true; sfx('click');
      const bread = $('k-bread'), body = toaster.lastElementChild as SVGImageElement;
      tween(250, t => bread.setAttribute('transform', `translate(0,${(30 * t).toFixed(1)})`));
      let tt = 0;
      const shake = (dt: number) => { tt += dt; body.setAttribute('transform', `rotate(${(Math.sin(tt / 40) * 1.2).toFixed(2)} 1290 ${COUNTER_Y})`); };
      tickers.add(shake);
      setTimeout(() => {
        tickers.delete(shake); body.removeAttribute('transform');
        sfx('ding');
        bread.setAttribute('transform', 'translate(0,60)');
        const toast = makeItem('toast', 1278, 400, layer('kFront'));
        toast.out = true; items.push(toast); toast.busy = true;
        const tx = rnd(1180, 1400), ty = rnd(770, 870);
        tween(800, t => {
          toast.x = 1278 + (tx - 1278) * t; toast.y = 400 + (ty - 400) * t - Math.sin(Math.PI * t) * 260;
          toast.g.setAttribute('transform', `translate(${toast.x.toFixed(1)},${toast.y.toFixed(1)}) rotate(${(360 * t).toFixed(0)} 0 -28)`);
        }, () => { toast.busy = false; place(toast); sfx('thud'); tidy(); speak('toast'); });
        setTimeout(() => { tween(300, t => bread.setAttribute('transform', `translate(0,${(60 * (1 - t)).toFixed(1)})`), () => { toasting = false; }); }, 900);
      }, 2000);
    }
  };

  // Kettle
  const [kw] = fit('k/kettle', undefined, 100);
  const kettle = el('g', { 'data-id': 'k-kettle' }, back) as SVGGElement;
  kettle.innerHTML = pic('kettle', 1482, COUNTER_Y, kw, 100);
  let whistling = false;
  objs['k-kettle'] = {
    tap: () => {
      if (whistling) return;
      whistling = true; sfx('whistle');
      let t0 = 0, st = 0;
      const tick = (dt: number) => {
        t0 += dt; st += dt;
        kettle.setAttribute('transform', `rotate(${(Math.sin(t0 / 45) * 2).toFixed(2)} 1482 ${COUNTER_Y})`);
        if (st > 160) { st = 0; steam(1482 - kw * .46, COUNTER_Y - 56, -30, .7); }
        if (t0 > 1500) { tickers.delete(tick); kettle.removeAttribute('transform'); whistling = false; speak('hot'); }
      };
      tickers.add(tick);
    }
  };

  // Sink: taps and faucet run water; the stream is drawn in its own layer
  const water = layer('kWaterL');
  water.innerHTML = `<rect id="k-stream" x="${SINK.spoutX - 6}" y="${SINK.spoutY}" width="12" height="${SINK.y - SINK.spoutY}" rx="6" fill="url(#kWater)" opacity=".9" ` +
    `stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-dasharray="10 30" style="display:none"/>`;
  const taps = el('g', { 'data-id': 'k-tap' }, back) as SVGGElement;
  taps.innerHTML = `<circle cx="880" cy="431" r="34" fill="transparent"/><circle cx="971" cy="431" r="34" fill="transparent"/>` +
    `<rect x="912" y="345" width="70" height="95" fill="transparent"/>`;
  objs['k-tap'] = { tap: () => { runWater(3000); setTimeout(() => speak('water'), 300); } };

  // Dirty plate: drag it into the sink to wash it
  const plate = el('g', { 'data-id': 'k-plate' }, back) as SVGGElement;
  plate.innerHTML = `<rect x="-60" y="-80" width="120" height="90" fill="transparent"/>` + pic('plate', 0, 0, 100, 68) +
    `<g id="k-smudge" fill="#8A5A2B" fill-opacity=".55"><ellipse cx="-14" cy="-38" rx="13" ry="5"/><ellipse cx="16" cy="-30" rx="9" ry="4"/>` +
    `<ellipse cx="4" cy="-44" rx="6" ry="3"/><circle cx="-24" cy="-28" r="3"/></g>`;
  const pl = { x: HOME_PLATE.x, y: HOME_PLATE.y };
  const placePlate = (s = 1) => plate.setAttribute('transform', `translate(${pl.x.toFixed(1)},${pl.y.toFixed(1)}) scale(${s})`);
  placePlate();
  let poff = { x: 0, y: 0 };
  const plateHome = () => {
    const x0 = pl.x, y0 = pl.y;
    tween(450, t => { const k = easeOut(t); pl.x = x0 + (HOME_PLATE.x - x0) * k; pl.y = y0 + (HOME_PLATE.y - y0) * k - Math.sin(Math.PI * t) * 30; placePlate(); },
      () => { plateBusy = false; layer('kBack').appendChild(plate); });
  };
  objs['k-plate'] = {
    tap: () => {
      if (plateBusy) return;
      sfx('pop'); sparkleAt(pl.x, pl.y - 40, 4, true);
      if (plateDirty) { sparkleAt(SINK.x, SINK.y - 20, 5, true); }
    },
    drag: {
      start: p0 => { if (plateBusy) return false; poff = { x: pl.x - p0.x, y: pl.y - p0.y }; layer('kFront').appendChild(plate); placePlate(1.15); sfx('pop'); },
      move: p => { pl.x = clamp(p.x + poff.x, 40, 1560); pl.y = clamp(p.y + poff.y, 150, 890); placePlate(1.15); },
      end: () => {
        placePlate();
        plateBusy = true;
        if (pl.x > SINK.x0 && pl.x < SINK.x1 && pl.y > 400 && pl.y < 560) {
          pl.x = SINK.x; pl.y = SINK.y + 20; placePlate(); layer('kBack').appendChild(plate);
          runWater(2600);
          let wt = 0;
          const scrub = (dt: number) => { wt += dt; plate.setAttribute('transform', `translate(${(pl.x + Math.sin(wt / 60) * 6).toFixed(1)},${pl.y}) scale(1)`); };
          tickers.add(scrub);
          const sm = $('k-smudge');
          tween(2200, t => sm.setAttribute('opacity', String(plateDirty ? 1 - t : 0)), () => {
            tickers.delete(scrub);
            plateDirty = false; plateMarks(false);
            sfx('sparkle'); sparkleAt(SINK.x, SINK.y - 40, 10, true); speak('clean');
            setTimeout(plateHome, 900);
            setTimeout(() => { plateDirty = true; plateMarks(true); }, 30000);
          });
        } else plateHome();
      }
    }
  };

  // Table and bowl
  const table = el('g', {}, mid) as SVGGElement;
  const [bw0, bh] = fit('k/bowl', BOWL.w);
  table.innerHTML = `<ellipse cx="1180" cy="880" rx="130" ry="16" fill="url(#kShadow)"/>` + pic('table', 1180, 885, 300, 206) +
    pic('bowl', BOWL.x, BOWL.y, bw0, bh) +
    `<ellipse id="k-bowlSoup" cx="${BOWL.x}" cy="${BOWL.y - bh * .72}" rx="42" ry="13" style="display:none"/>`;
  el('g', { 'data-id': 'k-bowl' }, table).innerHTML = `<rect x="${BOWL.x - 70}" y="${BOWL.y - bh - 20}" width="140" height="${bh + 30}" fill="transparent"/>`;
  objs['k-bowl'] = { tap: () => { if (soup.ready) serve(); else { sfx('pop'); sparkleAt(BOWL.x, BOWL.y - bh, 5, true); speak('soup'); } } };

  // Puppy and kitty live here too
  el('ellipse', { cx: 850, cy: 883, rx: 80, ry: 14, fill: 'url(#kShadow)' }, mid);
  el('ellipse', { cx: 1475, cy: 883, rx: 72, ry: 13, fill: 'url(#kShadow)' }, mid);
  const puppy = new Animal('puppy', 'k-puppy', 850, 885, 190, mid, false, false);
  const kitten = new Animal('kitten', 'k-kitten', 1475, 885, 172, mid, false, false);
  puppy.setFacing(1);
  pets = [puppy, kitten];

  // Soup steam while it's ready
  tickers.add(dt => {
    if (state.scene !== 'kitchen' || !soup.ready) return;
    if ((steamT += dt) > 380) { steamT = 0; steam(SOUP.x + rnd(-40, 40), SOUP.y - 10); }
  });

  // Nothing touched for a while: something in the kitchen says hello
  setInterval(() => {
    if (!active() || Date.now() - input.lastTouch < 20000) return;
    input.lastTouch = Date.now();
    const r = Math.random();
    if (r < .35) { const a = pick(pets); a.bounce(); a.say(false); const h = a.head(); sparkleAt(h.x, h.y - 30, 5, true); }
    else if (r < .6) cuckoo();
    else if (r < .8) sparkleAt(250, 560, 7);           // the fridge twinkles
    else sparkleAt(550, 730, 7);                         // so does the oven
  }, 1000);
}

export function kitchenEnter() {
  setTimeout(() => { if (state.scene === 'kitchen') { const a = pick(pets); a.bounce(); a.say(false); } }, 900);
}
export function kitchenLeave() { setFridge(false); waterUntil = 0; }
