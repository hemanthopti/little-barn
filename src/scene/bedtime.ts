import { $, pick } from '../core/util';
import { state, changed } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { setNight } from './sky';
import { yard } from './yard';
import { zzz } from './fx';

/**
 * Bedtime timer. When time is up the farm goes to sleep: night falls, a lullaby plays, the animals
 * close their eyes and snore little z's. Taps only twinkle until a parent wakes the farm from the panel.
 */
let zTimer = 0;

export function initBedtime() {
  setInterval(() => {
    if (!state.started || state.asleep || !state.timer) return;
    if (Date.now() - state.playStart >= state.timer * 60000) goToSleep();
  }, 5000);
}

export function minutesLeft() {
  if (!state.timer || !state.started) return state.timer;
  return Math.max(0, Math.ceil((state.timer * 60000 - (Date.now() - state.playStart)) / 60000));
}

export function goToSleep() {
  if (state.asleep) return;
  state.asleep = true;
  $('stage').classList.add('asleep');
  setNight(true, true);
  speak('sleep');
  setTimeout(() => sfx('lullaby'), 2200);
  zTimer = window.setInterval(() => { const a = pick(yard); const h = a.head(); zzz(h.x + 20, h.y - 30); }, 1100);
  changed();
}

export function wakeUp() {
  if (!state.asleep) return;
  state.asleep = false;
  clearInterval(zTimer);
  $('stage').classList.remove('asleep');
  state.playStart = Date.now();
  setNight(false);
  changed();
}

/** Restart the countdown, e.g. when the parent picks a new time. */
export function restartTimer() { state.playStart = Date.now(); changed(); }
