import { state, changed, Lang } from '../core/state';
import { WORDS, LANGS } from '../content/words';
import { playWord } from './clips';

export const hasSpeech = 'speechSynthesis' in window;
let voices: SpeechSynthesisVoice[] = [];

function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch { voices = []; } changed(); }
if (hasSpeech) { loadVoices(); try { speechSynthesis.onvoiceschanged = loadVoices; } catch { } }

const tagOf = (l: Lang) => LANGS.find(x => x.id === l)!.tag;
export function voiceFor(l: Lang) {
  const tag = tagOf(l).toLowerCase();
  return voices.find(v => v.lang.replace('_', '-').toLowerCase() === tag) || voices.find(v => v.lang.toLowerCase().startsWith(l));
}
export const voicesKnown = () => voices.length > 0;

/** Say a word: recorded clip first, then the device voice, then English if the language has no voice. */
export function speak(key: string) {
  if (!state.sound) return;
  if (playWord(key)) return;
  const w = WORDS[key]; if (!w || !hasSpeech) return;
  let l = state.lang, v = voiceFor(l);
  if (!v && l !== 'en' && voices.length) { l = 'en'; v = voiceFor('en'); }
  try {
    const u = new SpeechSynthesisUtterance(w[l]);
    u.lang = tagOf(l); if (v) u.voice = v;
    u.rate = .85; u.pitch = 1.3;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch { }
}
