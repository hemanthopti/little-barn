import { $ } from '../core/util';
import { state, bus, changed } from '../core/state';
import { input } from '../core/input';
import { sfx } from '../audio/clips';
import { speak } from '../audio/speech';
import { url } from '../art/sprites';
import { kitchenEnter, kitchenLeave } from './kitchen';

/**
 * Rooms. The round button in the corner shows a picture of the other room; tapping it fades across.
 * Farm systems (wandering, find game, idle invites) check state.scene and rest while the kitchen shows.
 */
let switching = false;

const thumb = () => { $('sceneBtn').style.backgroundImage = `url(${url(state.scene === 'farm' ? 'k/kitchen-bg' : 'bg-hills')})`; };

export function goScene(s: 'farm' | 'kitchen', instant = false) {
  if (s === state.scene || switching) return;
  const swap = () => {
    if (state.scene === 'kitchen') kitchenLeave();
    state.scene = s;
    $('stage').style.display = s === 'farm' ? '' : 'none';
    $('kitchen').style.display = s === 'kitchen' ? '' : 'none';
    if (s === 'kitchen') kitchenEnter();
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
    goScene(state.scene === 'farm' ? 'kitchen' : 'farm');
  });
  const show = () => { b.hidden = !state.started || state.asleep; };
  bus.addEventListener('change', show); show();
}
