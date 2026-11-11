import { AC, master } from './synth';
import { state, bus } from '../core/state';

/**
 * Background music: a gentle, original music-box tune made on the fly (no audio file to download).
 * C major, 84 bpm, 8 bars: C Am F G | C Am F G C. Every other time round it changes colour
 * (a higher, sparser bell line) so it doesn't get tiring. Quiet by default, and it dips while
 * anyone is talking so words stay clear. Rests at bedtime (the lullaby takes over) and when the tab is hidden.
 */
const BPM = 84, BEAT = 60 / BPM, BARS = 8;
const VOL = .16;

// [midi note (0 = rest), length in beats]
const TUNE: [number, number][] = [
  [64, 1], [67, 1], [72, 1], [67, 1],
  [69, 2], [72, 1], [69, 1],
  [65, 1], [69, 1], [72, 1], [69, 1],
  [67, 1], [71, 1], [74, 1], [71, 1],
  [64, 1], [67, 1], [72, 1], [76, 1],
  [74, 1], [72, 1], [69, 1], [72, 1],
  [69, 1], [67, 1], [65, 1], [71, 1],
  [72, 3], [0, 1]
];
// Chord for each bar: root and the other two notes (soft pad + bass)
const CHORDS: number[][] = [[48, 64, 67], [45, 60, 64], [41, 60, 65], [43, 62, 67], [48, 64, 67], [45, 60, 64], [41, 60, 65], [48, 64, 67]];
// The gentler second verse: bells on beats 1 and 3, an octave up
const VERSE2: [number, number][] = [
  [76, 2], [79, 2], [81, 2], [76, 2], [77, 2], [81, 2], [79, 2], [74, 2],
  [76, 2], [79, 2], [81, 2], [84, 2], [81, 2], [77, 2], [79, 4]
];

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
let bus2: GainNode | null = null, duckG: GainNode | null = null;
let nextLoop = 0, loopN = 0, timer = 0, playing = false;

function out(): GainNode | null {
  const a = AC(); if (!a || !master) return null;
  if (!bus2) {
    bus2 = a.createGain(); bus2.gain.value = 0;
    duckG = a.createGain(); duckG.gain.value = 1;
    // A touch of warmth: low-pass so the bells are soft, not tinny
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    bus2.connect(duckG); duckG.connect(lp); lp.connect(master);
  }
  return bus2;
}

/** Music-box note: a sine with a faint bell overtone and a quick, soft decay. */
function bell(t: number, m: number, len: number, vol: number) {
  const a = AC()!, o = out()!;
  const f = hz(m), d = Math.min(len * BEAT + .6, 2.2);
  for (const [mult, v] of [[1, 1], [2.01, .18], [4.02, .05]]) {
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = 'sine'; osc.frequency.value = f * mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * v, t + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t + d / (mult > 1 ? 2.5 : 1));
    osc.connect(g); g.connect(o); osc.start(t); osc.stop(t + d + .05);
  }
}
/** Soft pad chord with a round bass note. */
function pad(t: number, notes: number[], len: number) {
  const a = AC()!, o = out()!;
  notes.forEach((m, i) => {
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = i === 0 ? 'sine' : 'triangle'; osc.frequency.value = hz(m);
    const v = i === 0 ? .32 : .05;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + .25);
    g.gain.setValueAtTime(v, t + len - .35);
    g.gain.linearRampToValueAtTime(0, t + len);
    osc.connect(g); g.connect(o); osc.start(t); osc.stop(t + len + .05);
  });
}

function scheduleLoop(t0: number) {
  const second = loopN % 2 === 1;
  let t = t0;
  for (const [m, b] of second ? VERSE2 : TUNE) { if (m) bell(t, m, b, second ? .2 : .26); t += b * BEAT; }
  CHORDS.forEach((c, i) => pad(t0 + i * 4 * BEAT, c, 4 * BEAT));
  loopN++;
}

const wanted = () => state.music && state.sound && state.started && !state.asleep && !document.hidden;

function tick() {
  const a = AC(); if (!a) return;
  if (!wanted()) { stop(); return; }
  if (!playing) start();
  while (nextLoop < a.currentTime + .5) { scheduleLoop(nextLoop); nextLoop += BARS * 4 * BEAT; }
}
function start() {
  const a = AC(), o = out(); if (!a || !o) return;
  playing = true;
  nextLoop = Math.max(nextLoop, a.currentTime + .1);
  o.gain.cancelScheduledValues(a.currentTime);
  o.gain.setValueAtTime(o.gain.value, a.currentTime);
  o.gain.linearRampToValueAtTime(VOL, a.currentTime + 2);       // fade in
}
function stop() {
  if (!playing) return;
  const a = AC(), o = out(); if (!a || !o) return;
  playing = false;
  o.gain.cancelScheduledValues(a.currentTime);
  o.gain.setValueAtTime(o.gain.value, a.currentTime);
  o.gain.linearRampToValueAtTime(0, a.currentTime + .6);      // fade out; notes already queued die away silently
  nextLoop = a.currentTime + 1;                                  // restart on a fresh phrase
  loopN = 0;
}

/** Turn the music down while words are spoken (or right off while the parrot is listening). */
export function duck(seconds = 1.8, level = .3) {
  const a = AC(); if (!a || !duckG) return;
  const g = duckG.gain, now = a.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(level, now + .12);
  g.setValueAtTime(level, now + seconds);
  g.linearRampToValueAtTime(1, now + seconds + .8);
}

export function initMusic() {
  timer = window.setInterval(tick, 150);
  bus.addEventListener('change', tick);
  document.addEventListener('visibilitychange', tick);
  void timer;
}
