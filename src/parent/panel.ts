import { $ } from '../core/util';
import { state, save, bus, changed, Lang } from '../core/state';
import { LANGS, WORDS, RECORD_ORDER } from '../content/words';
import { hasSpeech, voiceFor, voicesKnown, speak } from '../audio/speech';
import { preloadClips } from '../audio/clips';
import { getMic, recordClip, stopMic } from '../audio/mic';
import { hasFamily, familyCount, saveFamily, deleteFamily, previewFamily } from '../audio/family';
import { setNight } from '../scene/sky';
import { VISITORS, showVisitor } from '../scene/visitors';
import { photoUrl, setPhoto, removePhoto } from '../scene/photos';
import { minutesLeft, wakeUp, restartTimer } from '../scene/bedtime';

const HOLD_MS = 500;
const MAX_REC_MS = 3000;
const TIMERS = [0, 10, 15, 20];

/** The recording in progress, if any, so the list can be redrawn safely mid-recording. */
let recording: { key: string; stop: () => void } | null = null;

/** Parent gate (hold the gear half a second) and settings panel. Nothing here is reachable by a quick tap. */
export function initPanel() {
  const gear = $('gear'), panel = $('panel');
  let hold = 0;

  $('lang').innerHTML = LANGS.map(l => `<button data-v="${l.id}">${l.label}</button>`).join('');
  $('timer').innerHTML = TIMERS.map(m => `<button data-v="${m}">${m ? m + ' min' : 'Off'}</button>`).join('') + `<button id="bWake" class="on">Wake up</button>`;

  gear.addEventListener('pointerdown', (e: PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    gear.classList.add('fill');
    hold = window.setTimeout(() => { gear.classList.remove('fill'); panel.hidden = false; changed(); }, HOLD_MS);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => gear.addEventListener(ev, () => { clearTimeout(hold); gear.classList.remove('fill'); }));

  $('lang').addEventListener('click', (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    state.lang = b.dataset.v as Lang; save(); preloadClips(); changed(); speak('cow');
  });
  $('timer').addEventListener('click', (e: MouseEvent) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    if (b.id === 'bWake') { wakeUp(); return; }
    state.timer = Number(b.dataset.v); save(); restartTimer();
  });
  $('tSound').addEventListener('click', () => { state.sound = !state.sound; save(); changed(); });
  $('tTips').addEventListener('click', () => { state.tips = !state.tips; save(); changed(); });
  $('tFind').addEventListener('click', () => { state.findit = !state.findit; save(); changed(); });
  $('tMirror').addEventListener('click', () => { state.mirror = !state.mirror; state.micBlocked = false; save(); changed(); });
  $('bNight').addEventListener('click', () => setNight(!state.night));
  $('bVis').addEventListener('click', () => showVisitor((state.visitor + 1) % VISITORS.length));
  $('bFull').addEventListener('click', () => { goFullscreen(); setTimeout(fullLabel, 400); });
  const fullLabel = () => {
    const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || (navigator as any).standalone;
    if (standalone) { $('fullRow').hidden = true; return; }
    if (!canFullscreen()) { $('bFull').hidden = true; $('fullNote').hidden = false; return; }
    $('bFull').textContent = isFull() ? 'Exit full screen' : 'Go full screen';
  };
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, fullLabel));
  fullLabel();
  $('bClose').addEventListener('click', () => { recording?.stop(); panel.hidden = true; changed(); });

  $('famList').addEventListener('click', onFamilyClick);
  for (const i of [0, 1]) {
    $('phIn' + i).addEventListener('change', async (e: Event) => {
      const f = (e.target as HTMLInputElement).files?.[0]; if (f) await setPhoto(i, f);
      (e.target as HTMLInputElement).value = '';
    });
    $('phDel' + i).addEventListener('click', () => removePhoto(i));
  }

  bus.addEventListener('change', render);
  setInterval(() => { if (!panel.hidden) render(); }, 20000); // keep "minutes left" fresh
  render();
}

const doc: any = document;
/** iPhone browsers have no full screen for web pages; there the only way is Add to Home Screen. */
export const canFullscreen = () => !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
const isFull = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);
export function goFullscreen() {
  const d: any = document.documentElement;
  try {
    if (isFull()) { const x = doc.exitFullscreen || doc.webkitExitFullscreen; x?.call(doc)?.catch?.(() => { }); return; }
    const f = d.requestFullscreen || d.webkitRequestFullscreen;
    if (f) { const r = f.call(d, { navigationUI: 'hide' }); r?.catch?.(() => { }); }
  } catch { }
}

async function onFamilyClick(e: MouseEvent) {
  const b = (e.target as HTMLElement).closest('button'); if (!b) return;
  const key = b.dataset.k!, lang = state.lang;
  if (b.dataset.a === 'play') { previewFamily(lang, key); return; }
  if (b.dataset.a === 'del') { await deleteFamily(lang, key); return; }
  // record / stop
  if (recording) { if (recording.key === key) recording.stop(); return; }
  const mic = await getMic();
  if (!mic) { $('famNote').textContent = 'Microphone access was refused. Allow the microphone for this site in your browser settings, then try again.'; return; }
  $('famNote').textContent = '';
  const r = recordClip(mic, MAX_REC_MS);
  recording = { key, stop: r.stop };
  render();
  const blob = await r.done;
  recording = null;
  setTimeout(() => { if (!recording) stopMic(); }, 5000); // free the mic so sounds play at full volume again
  if (blob.size > 0) await saveFamily(lang, key, blob);
  render();
  previewFamily(lang, key);
}

function renderFamily() {
  const lang = state.lang;
  $('famCount').textContent = `${familyCount(lang)} of ${RECORD_ORDER.length} recorded in ${LANGS.find(l => l.id === lang)!.name}`;
  $('famList').innerHTML = RECORD_ORDER.map(k => {
    const has = hasFamily(lang, k), rec = recording?.key === k, busy = !!recording && !rec;
    const sub = lang === 'en' ? '' : `<small> · ${WORDS[k].en}</small>`;
    return `<div class="fam"><span class="has">${has ? '✓' : ''}</span><span class="w">${WORDS[k][lang]}${sub}</span>
      <button class="rec${rec ? ' on' : ''}" data-a="rec" data-k="${k}" ${busy ? 'disabled' : ''} aria-label="Record">${rec ? '■' : '●'}</button>
      <button data-a="play" data-k="${k}" ${has && !recording ? '' : 'disabled'} aria-label="Play">▶</button>
      <button data-a="del" data-k="${k}" ${has && !recording ? '' : 'disabled'} aria-label="Delete">✕</button></div>`;
  }).join('');
}

function render() {
  const panel = $('panel'); if (!panel) return;
  document.querySelectorAll<HTMLButtonElement>('#lang button').forEach(b => b.classList.toggle('on', b.dataset.v === state.lang));
  document.querySelectorAll<HTMLButtonElement>('#timer button[data-v]').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === state.timer));
  $('bWake').hidden = !state.asleep;
  $('timerNote').textContent = state.asleep ? 'The farm is asleep. Tap Wake up to play again.'
    : state.timer ? `About ${minutesLeft()} min left, then the animals fall asleep` : 'The animals fall asleep when time is up';
  $('tSound').classList.toggle('on', state.sound);
  $('tTips').classList.toggle('on', state.tips);
  $('tFind').classList.toggle('on', state.findit);
  $('tMirror').classList.toggle('on', state.mirror);

  const name = LANGS.find(l => l.id === state.lang)!.name;
  $('voiceNote').textContent = !hasSpeech ? 'This browser cannot speak words aloud; sounds still play.'
    : (voicesKnown() && !voiceFor(state.lang) ? `This device has no ${name} voice installed, so unrecorded words are spoken in English. Record them under Family voices.` : '');
  $('micNote').textContent = !state.mirror ? '' : state.micBlocked
    ? 'Microphone access was refused. Allow the microphone for this site in your browser settings, then try again.'
    : 'Tap the parrot on the fence: it listens for about 2 seconds, then repeats in a funny voice. Nothing is saved or sent anywhere.';
  $('bNight').textContent = state.night ? 'Make it day' : 'Make it night';
  $('visName').textContent = VISITORS[state.visitor]?.name || '';

  for (const i of [0, 1]) {
    const img = $('ph' + i) as HTMLImageElement, u = photoUrl(i);
    if (u) img.src = u; else img.removeAttribute('src');
    $('phDel' + i).disabled = !u;
  }
  if (!panel.hidden) renderFamily();
}
