import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

import { $ } from './core/util';
import { state } from './core/state';
import { initInput, input } from './core/input';
import { AC } from './audio/synth';
import { sfx, loadManifest, preloadClips } from './audio/clips';
import { speak } from './audio/speech';
import { burst, trail } from './scene/fx';
import { initGround } from './scene/ground';
import { initBarn } from './scene/barn';
import { initTree } from './scene/tree';
import { initYard } from './scene/yard';
import { initSky } from './scene/sky';
import { initVisitors } from './scene/visitors';
import { initPanel } from './parent/panel';

initGround();
initBarn();
initTree();
initYard();
initSky();
initVisitors();
initPanel();
initInput($('stage'), p => burst(p.x, p.y), p => trail(p.x, p.y));
loadManifest();

// Splash: the first tap unlocks audio (required on iOS) and starts play.
$('splash').addEventListener('pointerdown', (e: PointerEvent) => {
  e.preventDefault();
  AC(); preloadClips();
  state.started = true; input.lastTouch = Date.now();
  $('splash').style.display = 'none';
  sfx('chimeUp');
  setTimeout(() => speak(state.night ? 'night' : 'morning'), 600);
});

// Offline support: caches the whole game after the first visit and updates itself quietly.
if ('serviceWorker' in navigator) registerSW({ immediate: true });
