import { $, pick } from '../core/util';
import { state, changed } from '../core/state';
import { input } from '../core/input';
import { Animal, registerFeeders } from './animal';
import { sparkleAt, pulseRing } from './fx';

export let yard: Animal[] = [];
let micStream: MediaStream | null = null;

export function initYard() {
  const layer = $('lActors');
  yard = [
    new Animal('pig', 'pig', 470, 838, 1.0, layer, true),
    new Animal('duck', 'duck', 760, 805, .85, layer, true),
    new Animal('puppy', 'puppy', 1135, 872, 1.0, layer, true),
    new Animal('kitten', 'kitten', 1478, 812, .95, layer, true)
  ];
  registerFeeders(() => yard);

  const parrot = new Animal('parrot', 'parrot', 1183, 540, .8, layer, false);
  parrot.tap = () => voiceMirror(parrot);

  // Invite play after 20 s of no touches.
  setInterval(() => {
    if (!state.started || !$('panel').hidden) return;
    if (Date.now() - input.lastTouch > 20000) {
      input.lastTouch = Date.now();
      const a = pick(yard); a.bounce(); a.say(false);
      const h = a.head(); sparkleAt(h.x, h.y - 30, 5, true);
    }
  }, 1000);
}

/** The parrot listens for 2.5 s and repeats the child's voice, sped up. Audio never leaves the device. */
async function voiceMirror(p: Animal) {
  if (p.busy) return;
  if (!state.mirror) { p.bounce(); p.say(); return; }
  p.busy = true;
  try {
    if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(micStream), chunks: Blob[] = [];
    rec.ondataavailable = e => chunks.push(e.data);
    const h = p.head(); pulseRing(h.x, h.y, 2500);
    rec.onstop = () => {
      const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
      const au: any = new Audio(url);
      au.preservesPitch = false; au.mozPreservesPitch = false; au.webkitPreservesPitch = false;
      au.playbackRate = 1.6;
      const wig = setInterval(() => p.bounce(), 700);
      const done = () => { clearInterval(wig); p.busy = false; URL.revokeObjectURL(url); };
      au.onended = done;
      au.play().catch(done);
    };
    rec.start();
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), 2500);
  } catch {
    state.micBlocked = true; changed();
    p.busy = false; p.bounce(); p.say();
  }
}
