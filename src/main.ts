import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

import { $ } from './core/util';
import { state, changed } from './core/state';
import { initInput, input } from './core/input';
import { AC } from './audio/synth';
import { sfx, loadManifest, preloadClips } from './audio/clips';
import { speak } from './audio/speech';
import { burst, trail } from './scene/fx';
import { initGround } from './scene/ground';
import { preloadArt } from './art/sprites';
import { initBarn } from './scene/barn';
import { initTree } from './scene/tree';
import { initYard } from './scene/yard';
import { initLife } from './scene/life';
import { initFence } from './scene/fence';
import { initFindIt } from './scene/findit';
import { initSky, initFireflies } from './scene/sky';
import { initVisitors } from './scene/visitors';
import { initPanel } from './parent/panel';
import { initPhotos } from './scene/photos';
import { initBedtime } from './scene/bedtime';
import { initTips } from './parent/tips';
import { loadFamily, decodeFamily } from './audio/family';
import { initKitchen } from './scene/kitchen';
import { initScenes } from './scene/scenes';
import { initLearn } from './scene/learn';
import { initHideSeek } from './scene/hideseek';

preloadArt();
initGround();
initBarn();
initTree();
initYard();
initSky();
initFireflies();
initLife();
initFence();
initFindIt();
initHideSeek();
initVisitors();
initKitchen();
initLearn();
initScenes();
initPhotos();
initBedtime();
initTips();
initPanel();
loadFamily();
initInput($('stage'), p => burst(p.x, p.y), p => trail(p.x, p.y));
initInput($('kitchen'), p => burst(p.x, p.y), p => trail(p.x, p.y));
initInput($('learn'), p => burst(p.x, p.y), p => trail(p.x, p.y));
loadManifest();

// Splash: the first tap unlocks audio (required on iOS) and starts play.
$('splash').addEventListener('pointerdown', (e: PointerEvent) => {
  e.preventDefault();
  AC(); preloadClips(); decodeFamily();
  state.started = true; state.playStart = Date.now(); input.lastTouch = Date.now();
  $('splash').style.display = 'none';
  sfx('chimeUp');
  setTimeout(() => speak(state.night ? 'night' : 'morning'), 600);
  changed();
});

// Offline support: caches the whole game after the first visit and updates itself quietly.
if ('serviceWorker' in navigator) registerSW({ immediate: true });

// Testing aid: open with ?debug to start hide and seek from the browser console (lb.hide()).
if (location.search.includes('debug')) import('./scene/hideseek').then(m => { (window as any).lb = { hide: m.startHide }; });
