import { state } from './state';
import { AC } from '../audio/synth';

export type Pt = { x: number; y: number };
export interface Drag { start(p0: Pt, p: Pt): boolean | void; move(p: Pt): void; end(p: Pt): void }
export interface Interactive { tap(p: Pt): void; drag?: Drag }

/** Every tappable thing in the scene registers here under the same id as its data-id attribute. */
export const objs: Record<string, Interactive> = {};
export const input = { lastTouch: Date.now() };

const COOLDOWN_MS = 450;
const DRAG_START = 14; // scene units a finger must move before a tap becomes a drag
const lastTap: Record<string, number> = {};

export function initInput(svg: SVGSVGElement, onEmptyTap: (p: Pt) => void, onTrail: (p: Pt) => void) {
  const toScene = (e: PointerEvent): Pt => {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM()!.inverse());
  };
  type Active = { o?: Interactive; id?: string; s: Pt; lp: Pt; moved: boolean; drag: boolean };
  const ptrs = new Map<number, Active>();

  svg.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!state.started) return;
    AC(); input.lastTouch = Date.now();
    const p = toScene(e);
    const t = (e.target as Element).closest?.('[data-id]');
    const id = t?.getAttribute('data-id') || undefined;
    ptrs.set(e.pointerId, { o: id ? objs[id] : undefined, id, s: p, lp: p, moved: false, drag: false });
  });

  window.addEventListener('pointermove', e => {
    const a = ptrs.get(e.pointerId); if (!a) return;
    const p = toScene(e);
    if (!a.moved && Math.hypot(p.x - a.s.x, p.y - a.s.y) > DRAG_START) {
      a.moved = true;
      if (a.o?.drag && a.o.drag.start(a.s, p) !== false) a.drag = true;
    }
    if (a.drag) a.o!.drag!.move(p);
    else if (a.moved && !a.o && Math.hypot(p.x - a.lp.x, p.y - a.lp.y) > 30) { onTrail(p); a.lp = p; }
  });

  const up = (e: PointerEvent, cancel = false) => {
    const a = ptrs.get(e.pointerId); if (!a) return;
    ptrs.delete(e.pointerId);
    const p = toScene(e);
    if (a.drag) { a.o!.drag!.end(p); return; }
    if (cancel || (a.moved && !a.o)) return;
    if (a.o) {
      const now = Date.now();
      if (now - (lastTap[a.id!] || 0) < COOLDOWN_MS) return;
      lastTap[a.id!] = now;
      a.o.tap(p);
    } else onEmptyTap(p);
  };
  window.addEventListener('pointerup', e => up(e));
  window.addEventListener('pointercancel', e => up(e, true));
  ['contextmenu', 'gesturestart', 'dblclick', 'selectstart'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
}
