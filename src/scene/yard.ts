import { $, pick } from '../core/util';
import { state } from '../core/state';
import { input } from '../core/input';
import { Animal, registerFeeders } from './animal';
import { sparkleAt, pulseRing } from './fx';
import { getMic, recordClip, stopMic } from '../audio/mic';
import { AC, master } from '../audio/synth';
import { duck } from '../audio/music';

export let yard: Animal[] = [];

export function initYard() {
  const layer = $('lActors');
  // kind, id, x, y (between the feet), standing height
  yard = [
    new Animal('cow', 'cow', 1000, 712, 190, layer, true),
    new Animal('pig', 'pig', 470, 872, 165, layer, true),
    new Animal('duck', 'duck', 785, 805, 115, layer, true),
    new Animal('puppy', 'puppy', 1150, 885, 165, layer, true),
    new Animal('kitten', 'kitten', 1380, 845, 155, layer, true)
  ];
  registerFeeders(() => yard);

  const parrot = new Animal('parrot', 'parrot', 1240, 548, 115, layer, false, false);
  parrot.tap = () => voiceMirror(parrot);

  // Invite play after 20 s of no touches.
  setInterval(() => {
    if (!state.started || state.asleep || !($('panel').hidden && state.scene === 'farm')) return;
    if (Date.now() - input.lastTouch > 20000) {
      input.lastTouch = Date.now();
      const a = pick(yard); a.bounce(); a.say(false);
      const h = a.head(); sparkleAt(h.x, h.y - 30, 5, true);
    }
  }, 1000);
}

/**
 * The parrot listens for 2.5 s and repeats the child's voice, faster and higher. Audio never leaves the device.
 * Played through Web Audio (already unlocked by the first tap): iPhones block <audio> that starts
 * seconds after a tap, which made the parrot silent there.
 */
async function voiceMirror(p: Animal) {
  if (p.busy) return;
  if (!state.mirror) { p.bounce(); p.say(); return; }
  p.busy = true;
  const mic = await getMic();
  if (!mic) { p.busy = false; p.bounce(); p.say(); return; }
  const h = p.head(); pulseRing(h.x, h.y, 2500);
  duck(4.5, 0); // silence the music so the parrot hears the child, not the tune
  let blob: Blob;
  try { blob = await recordClip(mic, 2500).done; } finally { stopMic(); }
  const a = AC();
  if (!a || !master || !state.sound) { p.busy = false; return; }
  let buf: AudioBuffer;
  try { buf = await a.decodeAudioData(await blob.arrayBuffer()); } catch { p.busy = false; p.bounce(); p.say(); return; }
  const src = a.createBufferSource(), g = a.createGain();
  src.buffer = buf; src.playbackRate.value = 1.55; g.gain.value = 1.8;
  src.connect(g); g.connect(master);
  const wig = setInterval(() => p.bounce(), 800);
  src.onended = () => { clearInterval(wig); p.busy = false; };
  p.bounce(); src.start();
}
