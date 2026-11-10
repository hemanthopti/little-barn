import { $ } from '../core/util';
import { state, save, bus } from '../core/state';
import { LANGS } from '../content/words';
import { hasSpeech, voiceFor, voicesKnown, speak } from '../audio/speech';
import { preloadClips } from '../audio/clips';
import { setNight } from '../scene/sky';
import { VISITORS, showVisitor } from '../scene/visitors';

const HOLD_MS = 3000;

/** Parent gate (hold the gear 3 s) and settings panel. Nothing here is reachable by a quick tap. */
export function initPanel() {
  const gear = $('gear'), panel = $('panel'), langBox = $('lang');
  let hold = 0;

  langBox.innerHTML = LANGS.map(l => `<button data-v="${l.id}">${l.label}</button>`).join('');

  gear.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    gear.classList.add('fill');
    hold = window.setTimeout(() => { gear.classList.remove('fill'); panel.hidden = false; render(); }, HOLD_MS);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => gear.addEventListener(ev, () => { clearTimeout(hold); gear.classList.remove('fill'); }));

  langBox.addEventListener('click', (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    state.lang = b.dataset.v as any; save(); preloadClips(); render(); speak('cow');
  });
  $('tSound').addEventListener('click', () => { state.sound = !state.sound; save(); render(); });
  $('tMirror').addEventListener('click', () => { state.mirror = !state.mirror; state.micBlocked = false; save(); render(); });
  $('bNight').addEventListener('click', () => setNight(!state.night));
  $('bVis').addEventListener('click', () => showVisitor((state.visitor + 1) % VISITORS.length));
  $('bFull').addEventListener('click', goFullscreen);
  $('bClose').addEventListener('click', () => { panel.hidden = true; });

  bus.addEventListener('change', render);
  render();
}

export function goFullscreen() {
  const d: any = document.documentElement;
  const f = d.requestFullscreen || d.webkitRequestFullscreen;
  if (f) { try { const r = f.call(d); r?.catch?.(() => { }); } catch { } }
}

function render() {
  const panel = $('panel'); if (!panel) return;
  document.querySelectorAll<HTMLButtonElement>('#lang button').forEach(b => b.classList.toggle('on', b.dataset.v === state.lang));
  $('tSound').classList.toggle('on', state.sound);
  $('tMirror').classList.toggle('on', state.mirror);
  const name = LANGS.find(l => l.id === state.lang)!.name;
  $('voiceNote').textContent = !hasSpeech ? 'This browser cannot speak words aloud; sounds still play.'
    : (voicesKnown() && !voiceFor(state.lang) ? `This device has no ${name} voice installed, so words are spoken in English until recorded voices are added.` : '');
  $('micNote').textContent = !state.mirror ? '' : state.micBlocked
    ? 'Microphone access was refused. Allow the microphone for this site in the browser settings, then try again.'
    : 'Tap the parrot on the fence: it listens for about 2 seconds, then repeats in a funny voice. Nothing is saved or sent anywhere.';
  $('bNight').textContent = state.night ? 'Make it day' : 'Make it night';
  $('visName').textContent = VISITORS[state.visitor]?.name || '';
}
