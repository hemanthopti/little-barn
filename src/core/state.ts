export type Lang = 'en' | 'hi' | 'kn';

export const state = {
  lang: 'en' as Lang,
  sound: true,
  mirror: false,
  night: false,
  visitor: 0,
  micBlocked: false,
  started: false,
  /** Bedtime timer in minutes (0 = off) and when the current play session started. */
  timer: 0,
  playStart: 0,
  asleep: false,
  tips: false,
  /** Gentle background tune */
  music: true,
  /** "Where is the …?" questions */
  findit: true,
  /** Which room is showing (not saved: play always starts on the farm). */
  scene: 'farm' as 'farm' | 'kitchen' | 'learn'
};

const KEY = 'littleBarn';
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  if (['en', 'hi', 'kn'].includes(saved.lang)) state.lang = saved.lang;
  if (typeof saved.sound === 'boolean') state.sound = saved.sound;
  if (typeof saved.mirror === 'boolean') state.mirror = saved.mirror;
  if ([0, 10, 15, 20].includes(saved.timer)) state.timer = saved.timer;
  if (typeof saved.tips === 'boolean') state.tips = saved.tips;
  if (typeof saved.findit === 'boolean') state.findit = saved.findit;
  if (typeof saved.music === 'boolean') state.music = saved.music;
} catch { /* storage unavailable: defaults are fine */ }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ lang: state.lang, sound: state.sound, mirror: state.mirror, timer: state.timer, tips: state.tips, findit: state.findit, music: state.music })); } catch { }
}

/** Anything that shows state (the parent panel) listens here. */
export const bus = new EventTarget();
export const changed = () => bus.dispatchEvent(new Event('change'));
