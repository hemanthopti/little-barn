import { $ } from './util';

/**
 * Screen fitting. The scenes are landscape pictures (1600 x 900 units). On a phone or tablet held upright
 * the whole game is turned sideways to fill the screen, so it plays properly even with rotation lock on;
 * turning the device then gives the normal landscape view. Laptops and desktops are never turned.
 */
export const view = { rot: false, W: window.innerWidth, H: window.innerHeight };

export function initView() {
  const app = $('app') as HTMLDivElement;
  const touch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const fit = () => {
    const W = window.innerWidth, H = window.innerHeight;
    view.W = W; view.H = H;
    view.rot = H > W * 1.05 && touch();
    document.body.classList.toggle('rot', view.rot);
    app.style.width = (view.rot ? H : W) + 'px';
    app.style.height = (view.rot ? W : H) + 'px';
  };
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => { fit(); setTimeout(fit, 300); });
  window.visualViewport?.addEventListener('resize', fit);
  fit();
}

/** Where a finger on the screen lands in scene units (same for every room: viewBox 0 0 1600 900, "meet"). */
export function toScene(cx: number, cy: number) {
  let u = cx, v = cy, Wa = view.W, Ha = view.H;
  if (view.rot) { u = cy; v = view.W - cx; Wa = view.H; Ha = view.W; }
  const s = Math.min(Wa / 1600, Ha / 900), ox = (Wa - 1600 * s) / 2, oy = (Ha - 900 * s) / 2;
  return { x: (u - ox) / s, y: (v - oy) / s };
}
