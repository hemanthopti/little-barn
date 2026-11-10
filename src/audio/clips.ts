import { state, Lang } from '../core/state';
import { AC, master, SYNTH } from './synth';

/**
 * Recorded audio, with the synthesizer as fallback.
 *
 * Drop files into public/audio/ and list them in public/audio/manifest.json:
 *   { "sfx": { "moo": "sfx/moo.mp3" },
 *     "words": { "en": { "cow": "words/en/cow.mp3" }, "kn": { "cow": "words/kn/cow.mp3" } } }
 * Anything not listed keeps using the synthesizer (sounds) or the browser voice (words).
 */
type Manifest = { sfx?: Record<string, string>; words?: Partial<Record<Lang, Record<string, string>>> };
let manifest: Manifest = {};
const buffers = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<AudioBuffer | null>>();

export async function loadManifest() {
  try {
    const r = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch { /* offline first run or no manifest: synth only */ }
}

function load(path: string): Promise<AudioBuffer | null> {
  if (buffers.has(path)) return Promise.resolve(buffers.get(path)!);
  if (!loading.has(path)) {
    loading.set(path, (async () => {
      const a = AC(); if (!a) return null;
      try {
        const data = await (await fetch('audio/' + path)).arrayBuffer();
        const buf = await a.decodeAudioData(data);
        buffers.set(path, buf); return buf;
      } catch { return null; }
    })());
  }
  return loading.get(path)!;
}

/** Decode every listed clip once audio is unlocked, so the first tap is instant. */
export function preloadClips() {
  Object.values(manifest.sfx || {}).forEach(load);
  Object.values(manifest.words?.[state.lang] || {}).forEach(load);
}

export function playBuffer(buf: AudioBuffer, vol = 1) {
  const a = AC(); if (!a || !master) return;
  const s = a.createBufferSource(), g = a.createGain();
  s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(master); s.start();
}

/** Play a sound effect; returns its length in seconds. */
export function sfx(name: string): number {
  if (!state.sound) return SYNTH[name] ? .3 : 0;
  const path = manifest.sfx?.[name];
  const buf = path && buffers.get(path);
  if (buf) { playBuffer(buf); return buf.duration; }
  if (path) load(path);
  return SYNTH[name]?.() ?? 0;
}

/** Play a recorded word for the current language if it is loaded. Returns false so the caller can fall back. */
export function playWord(key: string): boolean {
  const path = manifest.words?.[state.lang]?.[key];
  if (!path) return false;
  const buf = buffers.get(path);
  if (buf) { playBuffer(buf); return true; }
  // Not decoded yet (first few seconds): play it as soon as it is, rather than the robotic device voice.
  const t0 = performance.now();
  load(path).then(b => { if (b && performance.now() - t0 < 1500) playBuffer(b); });
  return true;
}
