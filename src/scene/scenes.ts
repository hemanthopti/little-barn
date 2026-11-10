import { $ } from '../core/util';
import { state, bus, changed } from '../core/state';
import { input } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { url } from '../art/sprites';
import { kitchenEnter, kitchenLeave } from './kitchen';
import { learnEnter, learnLeave } from './learn';

type Room = 'farm' | 'kitchen' | 'learn';
const ROOMS: Room[] = ['farm', 'kitchen', 'learn'];
const SVG: Record<Room, string> = { farm: 'stage', kitchen: 'kitchen', learn: 'learn' };
const next = (): Room => ROOMS[(ROOMS.indexOf(state.scene) + 1) % ROOMS.length];

/**
 * Rooms. The round button in the corner shows a picture of the other room; tapping it fades across.
 * Farm systems (wandering, find game, idle invites) check state.scene and rest while the kitchen shows.
 */
let switching = false;

const THUMB: Record<Room, string> = { farm: 'bg-hills', kitchen: 'k/kitchen-bg', learn: 'learn-thumb' };
const thumb = () => { $('sceneBtn').style.backgroundImage = `url(${url(THUMB[next()])})`; };

export function goScene(s: Room, instant = false) {
  if (s === state.scene || switching) return;
  const swap = () => {
    if (state.scene === 'kitchen') kitchenLeave();
    if (state.scene === 'learn') learnLeave();
    state.scene = s;
    ROOMS.forEach(r => { $(SVG[r]).style.display = r === s ? '' : 'none'; });
    if (s === 'kitchen') kitchenEnter();
    if (s === 'learn') learnEnter();
    thumb(); changed();
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
  const b = $('sceneBtn') as HTMLButtonElement;
  thumb();
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!state.started || state.asleep) return;
    goScene(next());
  });
  const show = () => { b.hidden = !state.started || state.asleep; };
  bus.addEventListener('change', show); show();
}
