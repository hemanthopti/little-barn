import { state } from '../core/state';
import { rnd } from '../core/util';

/** Web Audio context, created on the first touch (iOS needs a user gesture). */
let ac: AudioContext | null = null;
export let master: GainNode | null = null;
let nbuf: AudioBuffer | null = null;

export function AC(): AudioContext | null {
  try {
    if (!ac) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (!C) return null;
      ac = new C();
      const comp = ac.createDynamicsCompressor();
      master = ac.createGain(); master.gain.value = .9;
      master.connect(comp); comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { return null; }
  return ac;
}

type ToneOpts = {
  type?: OscillatorType; f0: number; f1?: number; dur: number; vol?: number; delay?: number;
  att?: number; sus?: number; vib?: [number, number]; filter?: [BiquadFilterType, number, number?];
};
type NoiseOpts = Omit<ToneOpts, 'f0' | 'type'>;

function env(g: GainNode, t: number, o: { vol?: number; att?: number; sus?: number; dur: number }) {
  const v = o.vol || .25, att = o.att || .015;
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + att);
  if (o.sus) g.gain.setValueAtTime(v, t + Math.max(att + .01, o.dur * o.sus));
  g.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
}
function chain(src: AudioNode, o: { filter?: ToneOpts['filter'] }, a: AudioContext) {
  const g = a.createGain(); let n = src;
  if (o.filter) {
    const f = a.createBiquadFilter(); f.type = o.filter[0]; f.frequency.value = o.filter[1]; f.Q.value = o.filter[2] || 1;
    n.connect(f); n = f;
  }
  n.connect(g); g.connect(master!); return g;
}
function tone(o: ToneOpts) {
  const a = AC(); if (!a || !state.sound) return;
  const t = a.currentTime + (o.delay || 0);
  const osc = a.createOscillator(); osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f0, t);
  osc.frequency.exponentialRampToValueAtTime(o.f1 || o.f0, t + o.dur);
  if (o.vib) {
    const l = a.createOscillator(), lg = a.createGain();
    l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
    l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + .05);
  }
  env(chain(osc, o, a), t, o); osc.start(t); osc.stop(t + o.dur + .05);
}
function noise(o: NoiseOpts) {
  const a = AC(); if (!a || !state.sound) return;
  const t = a.currentTime + (o.delay || 0);
  if (!nbuf) {
    nbuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = a.createBufferSource(); s.buffer = nbuf; s.loop = true;
  env(chain(s, o, a), t, o); s.start(t); s.stop(t + o.dur + .05);
}

/** Synthesized fallback for every sound. Each returns its length in seconds. */
export const SYNTH: Record<string, () => number> = {
  pop() { tone({ f0: rnd(450, 750), f1: 1400, dur: .09, vol: .22 }); return .1; },
  boing() { tone({ type: 'triangle', f0: 180, f1: 520, dur: .3, vol: .22, vib: [16, 40] }); return .3; },
  splash() { noise({ dur: .55, filter: ['bandpass', 1100, .8], vol: .35 }); noise({ dur: .25, filter: ['highpass', 3000, .5], vol: .12, delay: .05 }); return .5; },
  sparkle() { for (let i = 0; i < 5; i++) tone({ f0: rnd(1500, 2700), dur: .12, vol: .07, delay: i * .05 }); return .3; },
  chomp() { for (let i = 0; i < 3; i++) noise({ dur: .07, filter: ['lowpass', 900, 1], vol: .45, delay: i * .16 }); return .5; },
  moo() {
    tone({ type: 'sawtooth', f0: 150, f1: 100, dur: 1.1, vol: .22, filter: ['lowpass', 550, 2], vib: [5, 4], sus: .7, att: .1 });
    tone({ type: 'sawtooth', f0: 75, f1: 50, dur: 1.1, vol: .12, filter: ['lowpass', 400], sus: .7, att: .1 }); return 1.1;
  },
  oink() {
    [0, .22].forEach(d => {
      tone({ type: 'square', f0: 240, f1: 150, dur: .16, vol: .14, filter: ['lowpass', 900, 4], delay: d });
      noise({ dur: .14, filter: ['bandpass', 700, 3], vol: .25, delay: d });
    }); return .45;
  },
  baa() { tone({ type: 'sawtooth', f0: 340, f1: 300, dur: .8, vol: .18, filter: ['lowpass', 1600, 3], vib: [11, 30], sus: .6, att: .04 }); return .8; },
  cluck() {
    [0, .13, .26].forEach(d => tone({ type: 'triangle', f0: 900, f1: 600, dur: .07, vol: .25, delay: d }));
    tone({ type: 'triangle', f0: 1300, f1: 700, dur: .22, vol: .25, delay: .42 }); return .7;
  },
  quack() { [0, .24].forEach(d => tone({ type: 'sawtooth', f0: 560, f1: 380, dur: .17, vol: .2, filter: ['bandpass', 1100, 2], delay: d })); return .45; },
  woof() {
    [0, .25].forEach(d => {
      tone({ type: 'square', f0: 320, f1: 120, dur: .15, vol: .2, filter: ['lowpass', 800, 2], delay: d });
      noise({ dur: .1, filter: ['lowpass', 1500], vol: .25, delay: d });
    }); return .45;
  },
  meow() {
    tone({ type: 'triangle', f0: 520, f1: 950, dur: .25, vol: .25, att: .05, sus: .5 });
    tone({ type: 'triangle', f0: 950, f1: 450, dur: .4, vol: .25, delay: .24, sus: .3 }); return .65;
  },
  ribbit() { [0, .18].forEach(d => tone({ type: 'square', f0: 190, f1: 140, dur: .12, vol: .14, filter: ['lowpass', 700, 5], vib: [45, 40], delay: d })); return .35; },
  squawk() { [0, .2].forEach(d => tone({ type: 'sawtooth', f0: 900, f1: 1500, dur: .14, vol: .14, filter: ['bandpass', 1600, 2], delay: d })); return .4; },
  chimeUp() { [523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, dur: .45, vol: .14, delay: i * .12 })); return .8; },
  chimeDown() { [1047, 784, 659, 523].forEach((f, i) => tone({ f0: f, dur: .45, vol: .14, delay: i * .14 })); return .9; },
  rustle() { noise({ dur: .45, filter: ['highpass', 2500], vol: .14, att: .05 }); return .3; },
  thud() { tone({ f0: 170, f1: 60, dur: .15, vol: .35 }); return .15; },
  creak() { tone({ type: 'sawtooth', f0: 110, f1: 170, dur: .35, vol: .07, filter: ['lowpass', 500, 8], vib: [25, 15] }); return .3; },
  /** Original eight-bar lullaby for bedtime: soft sine notes over a low hum. */
  lullaby() {
    const N: Record<string, number> = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, C5: 523 };
    const tune = ['E4', 'G4', 'E4', 'G4', 'A4', 'G4', 'E4', '-', 'D4', 'F4', 'D4', 'F4', 'G4', 'F4', 'D4', '-',
      'E4', 'G4', 'C5', 'A4', 'G4', 'E4', 'D4', '-', 'E4', 'D4', 'C4', '-', '-', '-', '-', '-'];
    const beat = .42;
    tune.forEach((n, i) => { if (n !== '-') tone({ f0: N[n], dur: beat * 1.9, vol: .1, att: .06, delay: i * beat }); });
    [0, 8, 16, 24].forEach(b => tone({ type: 'triangle', f0: b === 8 ? 98 : 131, dur: beat * 8, vol: .05, att: .4, sus: .6, delay: b * beat }));
    return tune.length * beat;
  },
  rain() { noise({ dur: 2.6, filter: ['bandpass', 2600, .6], vol: .08, att: .3, sus: .8 }); return .5; }
};
