import { $, rnd, pick } from '../core/util';
import { objs, input, tapListeners } from '../core/input';
import { state } from '../core/state';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { Animal } from './animal';
import { sparkleAt, confetti } from './fx';
import { startHide, hideActive } from './hideseek';

/**
 * "Where is the …?" A gentle question every minute or so while the child is playing.
 * Tapping the right thing gives confetti and praise. Nothing else is ever "wrong".
 * After a few seconds the answer sparkles as a hint; after 25 s the question quietly ends.
 */
const HINT_MS = 6000, HINT_EVERY_MS = 3000, GIVE_UP_MS = 25000;
const GAP_MS: [number, number] = [35000, 60000];

/** Where each thing is right now, or null if it isn't in the scene. */
function where(k: string): { x: number; y: number } | null {
  if (k === 'sun') return state.night ? null : { x: 1420, y: 130 };
  if (k === 'moon') return state.night ? { x: 1420, y: 130 } : null;
  if (k === 'tree') return { x: 1330, y: 380 };
  if (k === 'barn') return { x: 320, y: 420 };
  const o = objs[k];
  return o instanceof Animal ? o.head() : null;
}

let active: { k: string; t0: number; lastHint: number } | null = null;
let nextAt = 0, lastK = '';

function ask() {
  const keys = ['cow', 'pig', 'duck', 'puppy', 'kitten', 'parrot', 'frog', 'sun', 'moon', 'tree', 'barn'].filter(k => k !== lastK && where(k));
  if (!keys.length) return;
  const k = pick(keys);
  active = { k, t0: Date.now(), lastHint: 0 }; lastK = k;
  speak('where-' + k);
}

function found() {
  const p = where(active!.k);
  active = null; nextAt = Date.now() + rnd(...GAP_MS);
  if (p) confetti(p.x, p.y - 20);
  setTimeout(() => sfx('yay'), 250);
  setTimeout(() => speak('found'), 1300);   // after the animal's own sound and name
}

export function initFindIt() {
  nextAt = Date.now() + 25000;
  const BARN_PARTS = ['barn', 'door', 'loft', 'win0', 'win1', 'doorA', 'loftA'];
  tapListeners.push(id => { if (active && (id === active.k || (active.k === 'barn' && BARN_PARTS.includes(id)))) found(); });
  setInterval(() => {
    const now = Date.now();
    const playing = state.started && !state.asleep && ($('panel').hidden && state.scene === 'farm') && state.findit;
    if (!playing) { active = null; return; }
    if (hideActive()) { nextAt = now + rnd(...GAP_MS); return; }
    if (active) {
      const age = now - active.t0;
      if (age > GIVE_UP_MS) { active = null; nextAt = now + rnd(...GAP_MS); return; }
      if (age > HINT_MS && now - active.lastHint > HINT_EVERY_MS) {
        active.lastHint = now;
        const p = where(active.k);
        if (p) { sparkleAt(p.x, p.y, 8, true); const o = objs[active.k]; if (o instanceof Animal && o.free()) o.bounce(); }
      }
      return;
    }
    // Only ask while the child is actually playing (touched in the last 30 s)
    // Half the time it's hide and seek instead of a question
    if (now > nextAt && now - input.lastTouch < 30000) { if (!(Math.random() < .5 && startHide())) ask(); }
  }, 500);
}
