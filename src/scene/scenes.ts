import { $ } from '../core/util';
import { state, bus, changed } from '../core/state';
import { input } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { url } from '../art/sprites';
import { kitchenEnter, kitchenLeave } from './kitchen';
import { learnEnter, learnLeave } from './learn';

/**
 * Rooms. Round picture buttons in the corner lead to every other room; tapping one fades across.
 * Farm systems (wandering, find game, idle invites) check state.scene and rest while another room shows.
 */
type Room = 'farm' | 'kitchen' | 'learn';
const ROOMS: Room[] = ['farm', 'kitchen', 'learn'];
const SVG: Record<Room, string> = { farm: 'stage', kitchen: 'kitchen', learn: 'learn' };
const THUMB: Record<Room, string> = { farm: 'farm-thumb', kitchen: 'k/kitchen-bg', learn: 'learn-thumb' };
const LABEL: Record<Room, string> = { farm: 'Go to the farm', kitchen: 'Go to the kitchen', learn: 'Go to the picture cards' };
let switching = false;

/** One button for each room you are not in. */
function drawButtons() {
  const box = $('rooms') as HTMLDivElement;
  box.innerHTML = '';
  ROOMS.filter(r => r !== state.scene).forEach(r => {
    const b = document.createElement('button');
    b.style.backgroundImage = `url(${url(THUMB[r])})`;
    b.setAttribute('aria-label', LABEL[r]);
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (!state.started || state.asleep) return;
      goScene(r);
    });
    box.appendChild(b);
  });
}

export function goScene(s: Room, instant = false) {
  if (s === state.scene || switching) return;
  const swap = () => {
    if (state.scene === 'kitchen') kitchenLeave();
    if (state.scene === 'learn') learnLeave();
    state.scene = s;
    ROOMS.forEach(r => { $(SVG[r]).style.display = r === s ? '' : 'none'; });
    if (s === 'kitchen') kitchenEnter();
    if (s === 'learn') learnEnter();
    drawButtons(); changed();
  };
  if (instant) { swap(); return; }
  switching = true; sfx('swish');
  $('fade').classList.add('on');
  setTimeout(() => {
    swap(); input.lastTouch = Date.now();
    $('fade').classList.remove('on');
    setTimeout(() => { switching = false; speak(s); }, 350);
  }, 350);
}

export function initScenes() {
  drawButtons();
  const show = () => { ($('rooms') as HTMLDivElement).hidden = !state.started || state.asleep; };
  bus.addEventListener('change', show); show();
}
