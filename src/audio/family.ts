import { state, changed, Lang } from '../core/state';
import { dbGet, dbSet, dbDel, dbKeys } from '../core/db';
import { AC } from './synth';
import { playBuffer } from './clips';

/**
 * Family voices: words a parent records inside the game. Stored as the original recording in
 * IndexedDB; trimmed and loudness-matched when decoded. They take priority over every other voice.
 */
const PREFIX = 'voice:';
const blobs = new Map<string, Blob>();
const bufs = new Map<string, AudioBuffer>();
const id = (lang: Lang, key: string) => `${lang}:${key}`;

export async function loadFamily() {
  const keys = (await dbKeys()).filter(k => k.startsWith(PREFIX));
  for (const k of keys) { const b = await dbGet<Blob>(k); if (b) blobs.set(k.slice(PREFIX.length), b); }
  changed();
}
/** Decode everything once audio is unlocked so playback is instant. */
export function decodeFamily() { blobs.forEach((b, k) => { if (!bufs.has(k)) decode(k, b); }); }

async function decode(k: string, blob: Blob) {
  const a = AC(); if (!a) return null;
  try { const buf = tidy(await a.decodeAudioData(await blob.arrayBuffer()), a); bufs.set(k, buf); return buf; }
  catch { return null; }
}

/** Cut silence at both ends, normalise the peak and add tiny fades so clips start cleanly. */
function tidy(b: AudioBuffer, a: AudioContext): AudioBuffer {
  const src = b.getChannelData(0), len = src.length, sr = b.sampleRate;
  let peak = 0; for (let i = 0; i < len; i++) { const v = Math.abs(src[i]); if (v > peak) peak = v; }
  if (peak < .005) return b;
  const th = peak * .08, pad = Math.floor(sr * .06);
  let s = 0, e = len - 1;
  while (s < len && Math.abs(src[s]) < th) s++;
  while (e > s && Math.abs(src[e]) < th) e--;
  s = Math.max(0, s - pad); e = Math.min(len - 1, e + pad * 2);
  const n = e - s + 1, out = a.createBuffer(1, n, sr), o = out.getChannelData(0);
  const gain = .9 / peak, fade = Math.floor(sr * .01);
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, i / fade, (n - 1 - i) / fade);
    o[i] = src[s + i] * gain * f;
  }
  return out;
}

export const hasFamily = (lang: Lang, key: string) => blobs.has(id(lang, key));
export const familyCount = (lang: Lang) => [...blobs.keys()].filter(k => k.startsWith(lang + ':')).length;

function play(k: string): boolean {
  const buf = bufs.get(k);
  if (buf) { playBuffer(buf); return true; }
  const blob = blobs.get(k); if (!blob) return false;
  decode(k, blob).then(b => b && playBuffer(b));
  return true;
}
/** Used by speak(): plays the family recording for the current language, if there is one. */
export const playFamily = (key: string) => state.sound && play(id(state.lang, key));
export const previewFamily = (lang: Lang, key: string) => play(id(lang, key));

export async function saveFamily(lang: Lang, key: string, blob: Blob) {
  const k = id(lang, key);
  blobs.set(k, blob); bufs.delete(k);
  await dbSet(PREFIX + k, blob);
  await decode(k, blob);
  changed();
}
export async function deleteFamily(lang: Lang, key: string) {
  const k = id(lang, key);
  blobs.delete(k); bufs.delete(k);
  await dbDel(PREFIX + k);
  changed();
}
