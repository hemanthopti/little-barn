export type Lang = 'en' | 'hi' | 'kn';

export const state = {
  lang: 'en' as Lang,
  sound: true,
  mirror: false,
  night: false,
  visitor: 0,
  micBlocked: false,
  started: false
};

const KEY = 'littleBarn';
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (['en', 'hi', 'kn'].includes(saved.lang)) state.lang = saved.lang;
  if (typeof saved.sound === 'boolean') state.sound = saved.sound;
  if (typeof saved.mirror === 'boolean') state.mirror = saved.mirror;
} catch { /* storage unavailable: defaults are fine */ }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ lang: state.lang, sound: state.sound, mirror: state.mirror })); } catch { }
}

/** Anything that shows state (the parent panel) listens here. */
export const bus = new EventTarget();
export const changed = () => bus.dispatchEvent(new Event('change'));
