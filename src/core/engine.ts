/** Tiny animation engine: one requestAnimationFrame loop drives every tween and ticker. */
type Tween = { t0: number; dur: number; fn: (t: number) => void; done?: () => void };
const tweens = new Set<Tween>();
export const tickers = new Set<(dt: number) => void>();

export function tween(dur: number, fn: (t: number) => void, done?: () => void): Tween {
  const tw = { t0: performance.now(), dur, fn, done };
  tweens.add(tw);
  fn(0);
  return tw;
}
export const cancelTween = (tw?: Tween) => { if (tw) tweens.delete(tw); };

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(50, now - last); last = now;
  for (const tw of [...tweens]) {
    const t = Math.min(1, (now - tw.t0) / tw.dur);
    try { tw.fn(t); } catch { tweens.delete(tw); continue; }
    if (t >= 1) { tweens.delete(tw); tw.done?.(); }
  }
  tickers.forEach(f => f(dt));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
