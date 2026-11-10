import { $ } from '../core/util';
import { state, bus } from '../core/state';

/** Small prompts for the parent, shown at the top while playing together. Not tappable. */
const TIPS = [
  '<b>Ask:</b> Where is the cow? Let your child find it and tap.',
  '<b>Say it together:</b> make the animal\'s sound before you tap it.',
  '<b>Count:</b> one, two, three apples on the tree.',
  '<b>Name the colour:</b> the apple is red, the duck is yellow.',
  '<b>Ask:</b> Who is hungry? Help feed an apple to the puppy.',
  '<b>Pretend:</b> hold out your hands and say "rain, rain" before tapping a cloud.',
  '<b>Wait:</b> let your child tap first. Copy what they do and smile.',
  '<b>Big and small:</b> the cow is big, the hen is small.',
  '<b>Ask:</b> What does the duck say? Pause and let them try.',
  '<b>Peekaboo:</b> cover your eyes, then tap a barn window together.',
  '<b>Point up:</b> the sun is in the sky. At night, the moon!',
  '<b>Narrate:</b> "The pig is jumping! Jump, jump!"',
  '<b>Two languages:</b> say each animal\'s name in Kannada or Hindi too.',
  '<b>Stop while it\'s fun:</b> short sessions work best at this age.'
];
const EVERY_MS = 25000;
let i = Math.floor(Math.random() * TIPS.length);

const visible = () => state.tips && state.started && !state.asleep && $('panel').hidden;

function next() {
  const t = $('tip');
  if (!visible()) { t.classList.remove('show'); return; }
  t.classList.remove('show');
  setTimeout(() => { if (!visible()) return; t.innerHTML = TIPS[i++ % TIPS.length]; t.classList.add('show'); }, 800);
}

export function initTips() {
  setInterval(next, EVERY_MS);
  let was = false;
  bus.addEventListener('change', () => { const v = visible(); if (v && !was) next(); if (!v) $('tip').classList.remove('show'); was = v; });
}
export const showTipNow = next;
