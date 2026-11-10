import { $, rnd, pick, inPond, POND } from '../core/util';
import { tickers } from '../core/engine';
import { objs } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { Animal } from './animal';
import { yard } from './yard';
import { flowerSpots } from './ground';
import { groundApples, eat, GroundApple } from './tree';
import { butterfly } from './fx';

/**
 * Makes the farm feel alive: every yard animal has a small "brain" that picks what to do next
 * (stand, wander, sniff a flower, eat a fallen apple, hop, nap). The duck paddles around the pond.
 * Everything pauses while a child taps or drags an animal, and at bedtime.
 */
type Mode = 'idle' | 'walk' | 'sniff' | 'nap';
type Goal = 'wander' | 'flower' | 'apple' | 'pond';
interface Brain {
  a: Animal; mode: Mode; until: number; tx: number; ty: number; goal: Goal;
  phase: number; speed: number; swims: boolean; apple?: GroundApple; flowerTap?: () => void;
}

const YARD = { x0: 90, x1: 1510, y0: 705, y1: 870 };
const SPEED: Record<string, number> = { pig: 55, puppy: 75, kitten: 70, duck: 32 };
const brains: Brain[] = [];
let now = 0;

const near = (a: Animal, x: number, y: number) => Math.hypot(a.x - x, a.y - y);
/** Where land animals' feet may not go: the painted pond plus its grassy rim (animals are tall, so extra below). */
const wet = (x: number, y: number) => ((x - 830) / 290) ** 2 + ((y - 790) / (y > 790 ? 120 : 95)) ** 2 < 1;
/** Does the straight line from (x0,y0) to (x1,y1) cross the pond? */
function crossesPond(x0: number, y0: number, x1: number, y1: number) {
  for (let t = 0; t <= 1; t += .04) if (wet(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return true;
  return false;
}
const reachable = (a: Animal, x: number, y: number) => !wet(x, y) && !crossesPond(a.x, a.y, x, y);
/** Is anyone else standing (or heading) near this spot? */
function crowded(b: Brain, x: number, y: number) {
  return brains.some(o => o !== b && (Math.hypot(o.a.x - x, o.a.y - y) < 170 || Math.hypot(o.tx - x, o.ty - y) < 170));
}

function pondSpot() {
  const t = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random());
  return { x: POND.cx + Math.cos(t) * POND.rx * .62 * r, y: POND.cy + 12 + Math.sin(t) * POND.ry * .45 * r };
}
function landSpot(b: Brain) {
  for (let i = 0; i < 25; i++) {
    const x = rnd(YARD.x0, YARD.x1), y = rnd(YARD.y0, YARD.y1);
    if (Math.hypot(x - b.a.x, y - b.a.y) > 600) continue;            // short trips look natural
    if (!reachable(b.a, x, y) || crowded(b, x, y)) continue;
    return { x, y };
  }
  return null;
}

function goTo(b: Brain, x: number, y: number, goal: Goal) {
  b.tx = x; b.ty = y; b.goal = goal; b.mode = 'walk';
  b.a.setFacing(x < b.a.x ? -1 : 1);
}
function rest(b: Brain, ms: number) { b.mode = 'idle'; b.until = now + ms; b.a.setWalk(0, 0); }

/** Decide what to do next. */
function think(b: Brain) {
  const a = b.a;
  if (b.swims) {
    if (!inPond(a.x, a.y)) {                                          // dragged out: waddle home after a while
      const p = pondSpot(); goTo(b, p.x, p.y, 'pond');
      return;
    }
    if (Math.random() < .25) { a.bounce(); rest(b, rnd(1500, 3000)); return; }   // little splash-hop
    const p = pondSpot(); goTo(b, p.x, p.y, 'pond'); return;
  }
  if (wet(a.x, a.y)) {                                                // a child dropped it in the pond: climb out
    for (let i = 0; i < 30; i++) {
      const x = rnd(YARD.x0, YARD.x1), y = rnd(YARD.y0, YARD.y1);
      if (!wet(x, y) && Math.hypot(x - a.x, y - a.y) < 450) { goTo(b, x, y, 'wander'); return; }
    }
  }
  const r = Math.random();
  // A fallen apple nearby? Go and eat it.
  const apple = groundApples().filter(o => near(a, o.x, o.y) < 700 && !brains.some(x => x.apple === o))
    .sort((p, q) => near(a, p.x, p.y) - near(a, q.x, q.y))[0];
  if (apple && r < .6) {
    const ax = apple.x + (apple.x < a.x ? 45 : -45), ay = Math.min(YARD.y1, apple.y + 25);
    if (reachable(a, ax, ay)) { b.apple = apple; goTo(b, ax, ay, 'apple'); return; }
  }
  if (r < .3) {                                                       // sniff a flower
    const spots = flowerSpots().map(f => ({ f, x: f.x + (f.x < a.x ? 55 : -55), y: Math.min(YARD.y1, f.y + 18) }))
      .filter(s => near(a, s.x, s.y) < 500 && reachable(a, s.x, s.y) && !crowded(b, s.x, s.y));
    if (spots.length) { const t = pick(spots); b.flowerTap = t.f.tap; goTo(b, t.x, t.y, 'flower'); return; }
  }
  if (r < .42) { a.bounce(); rest(b, rnd(1200, 2500)); return; }     // happy hop
  if (r < .5 && a.kind !== 'duck') { b.mode = 'nap'; b.until = now + rnd(4000, 7000); a.setPose('sleep'); return; }
  if (r < .8) { const s = landSpot(b); if (s) { goTo(b, s.x, s.y, 'wander'); return; } }
  rest(b, rnd(2000, 5000));                                           // just stand and breathe
}

function arrive(b: Brain) {
  const a = b.a;
  a.setWalk(0, 0);
  if (b.goal === 'apple' && b.apple && objs[b.apple.id]) {
    a.setFacing(b.apple.x < a.x ? -1 : 1);
    eat(a, b.apple, true); b.apple = undefined; rest(b, rnd(2500, 4000)); return;
  }
  b.apple = undefined;
  if (b.goal === 'flower') {
    b.mode = 'sniff'; b.until = now + rnd(1500, 2500);
    a.setFacing(b.tx > a.x ? 1 : (b.flowerTap ? (Math.random() < .5 ? 1 : -1) : a.facing));
    return;
  }
  rest(b, rnd(1500, 4500));
}

function step(b: Brain, dt: number) {
  const a = b.a;
  if (!a.free()) {                                                    // child is playing with it: stop
    if (b.mode === 'walk' || b.mode === 'sniff') { a.setWalk(0, 0); rest(b, rnd(1500, 3000)); }
    if (b.mode === 'nap' && a.anim) rest(b, 2000);
    return;
  }
  if (b.mode === 'walk') {
    const dx = b.tx - a.x, dy = b.ty - a.y, d = Math.hypot(dx, dy), v = b.speed * dt / 1000;
    if (d <= v) { a.x = b.tx; a.y = b.ty; a.place(); arrive(b); return; }
    a.x += dx / d * v; a.y += dy / d * v; a.place();
    b.phase += dt * (b.swims ? .005 : .014);
    if (b.swims) a.setWalk(Math.sin(b.phase) * 2, Math.sin(b.phase) * 3);
    else a.setWalk(Math.abs(Math.sin(b.phase)) * a.h * .05, Math.sin(b.phase) * 4);
    if (b.goal === 'apple' && b.apple && !objs[b.apple.id]) { b.apple = undefined; rest(b, 1000); }  // someone else ate it
    return;
  }
  if (b.mode === 'sniff') {
    b.phase += dt * .02;
    a.setWalk(0, 8 + Math.sin(b.phase) * 3);                          // lean in and sniff
    if (now > b.until) {
      a.setWalk(0, 0);
      if (Math.random() < .35) butterflyNear(a);
      rest(b, rnd(1500, 3000));
    }
    return;
  }
  if (b.mode === 'nap') { if (now > b.until) { a.setPose('idle'); rest(b, 1500); } return; }
  if (now > b.until) think(b);
}

function butterflyNear(a: Animal) { butterfly(a.x + a.facing * a.h * .35, a.y - a.h * .3); }

/** Keep animals and apples drawn in depth order: lower on screen = in front. */
function sortActors() {
  const layer = $('lActors') as SVGGElement;
  const kids = [...layer.children] as SVGGElement[];
  const sorted = [...kids].sort((p, q) => Number(p.dataset.y || 0) - Number(q.dataset.y || 0));
  if (sorted.some((k, i) => k !== kids[i])) sorted.forEach(k => layer.appendChild(k));
}

export function initLife() {
  for (const a of yard) {
    brains.push({ a, mode: 'idle', until: rnd(1500, 4000), tx: a.x, ty: a.y, goal: 'wander', phase: 0, speed: SPEED[a.kind] || 55, swims: a.kind === 'duck' });
  }
  let sortT = 0;
  tickers.add(dt => {
    now += dt;
    if (!state.started || !$('panel').hidden) return;
    if (state.asleep) { brains.forEach(b => { if (b.mode !== 'idle') { b.a.setWalk(0, 0); b.mode = 'idle'; } b.until = now + 1000; }); return; }
    brains.forEach(b => step(b, dt));
    if ((sortT += dt) > 200) { sortT = 0; sortActors(); }
  });

  // Ambient: a butterfly drifts by now and then, the parrot fidgets, a lazy squawk now and again
  setInterval(() => {
    if (!state.started || state.asleep || !$('panel').hidden) return;
    const r = Math.random();
    if (r < .45) { const f = flowerSpots(); if (f.length) { const t = pick(f); butterfly(t.x, t.y - 40); } }
    else if (r < .7) { const p = objs.parrot as Animal; if (p?.free()) p.bounce(); }
    else if (r < .8) { const f = objs.frog as Animal; if (f?.free()) f.bounce(false, true); }
  }, 7000);
  // Rarely, a yard animal makes its noise unprompted (quietly reminds the child it's there)
  setInterval(() => {
    if (!state.started || state.asleep || !$('panel').hidden || Math.random() < .5) return;
    const b = pick(brains); if (b.a.free() && b.mode !== 'nap') sfx(({ pig: 'oink', puppy: 'woof', kitten: 'meow', duck: 'quack' } as any)[b.a.kind]);
  }, 25000);
}
