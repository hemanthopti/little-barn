import { state, changed } from '../core/state';

/** One shared microphone stream for the parrot and for recording family voices. */
let stream: MediaStream | null = null;
export async function getMic(): Promise<MediaStream | null> {
  try {
    if (!stream || stream.getTracks().every(t => t.readyState === 'ended'))
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    state.micBlocked = false;
    return stream;
  } catch {
    state.micBlocked = true; changed();
    return null;
  }
}

/** Let go of the microphone. While it's open, iPhones play every other sound quietly through the earpiece. */
export function stopMic() { stream?.getTracks().forEach(t => t.stop()); stream = null; }

/** Record up to maxMs; resolves with the audio. Call the returned stop() to end early. */
export function recordClip(s: MediaStream, maxMs: number) {
  const rec = new MediaRecorder(s), chunks: Blob[] = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>(res => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType })); });
  rec.start();
  const t = setTimeout(() => rec.state !== 'inactive' && rec.stop(), maxMs);
  return { done, stop: () => { clearTimeout(t); if (rec.state !== 'inactive') rec.stop(); } };
}
