import { $, pick } from '../core/util';
import { state } from '../core/state';
import { input } from '../core/input';
import { Animal, registerFeeders } from './animal';
import { sparkleAt, pulseRing } from './fx';
import { getMic, recordClip } from '../audio/mic';

export let yard: Animal[] = [];

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
    if (!state.started || state.asleep || !$('panel').hidden) return;
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
  const mic = await getMic();
  if (!mic) { p.busy = false; p.bounce(); p.say(); return; }
  const h = p.head(); pulseRing(h.x, h.y, 2500);
  const blob = await recordClip(mic, 2500).done;
  const url = URL.createObjectURL(blob);
  const au: any = new Audio(url);
  au.preservesPitch = false; au.mozPreservesPitch = false; au.webkitPreservesPitch = false;
  au.playbackRate = 1.6;
  const wig = setInterval(() => p.bounce(), 700);
  const done = () => { clearInterval(wig); p.busy = false; URL.revokeObjectURL(url); };
  au.onended = done;
  au.play().catch(done);
}
