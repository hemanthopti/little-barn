// Makes every spoken word in the game with natural Indian AI voices (Sarvam AI "Bulbul v3"),
// then runs the normal audio step so they're trimmed, loudness-matched and listed in the manifest.
//
//   1. Get a free API key at https://dashboard.sarvam.ai (sign in, copy the key).
//   2. In the little-barn folder:   set SARVAM_API_KEY=your_key        (PowerShell: $env:SARVAM_API_KEY="your_key")
//   3. npm run voices                      all languages, only words not made yet
//      npm run voices -- --lang kn         just Kannada
//      npm run voices -- --only cow,pig    just these words (remakes them)
//      npm run voices -- --force           remake everything
//      npm run voices -- --dry             count characters and cost, call nothing
//      npm run voices -- --voice kn=kavya  try another voice for a language
//   4. npm run build
//
// Words come from src/content/words.ts, so new words in the game are picked up automatically.
// Your own recordings in recordings/words/<lang>/ are never overwritten (only files ending in .ai.wav are ours).
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = n => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : undefined; };

// A warm, clear voice per language. Listen at https://www.sarvam.ai/text-to-speech and change with --voice.
const VOICE = { en: 'priya', hi: 'ritu', kn: 'ishita' };
for (const v of (opt('voice') || '').split(',').filter(Boolean)) { const [l, s] = v.split('='); VOICE[l] = s; }
const TAG = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };
const PACE = Number(opt('pace') || 0.9);            // a little slower for little ears

let WORDS;
try { ({ WORDS } = await import('../src/content/words.ts')); }
catch (e) { console.error('Could not read src/content/words.ts. This needs Node.js 22.18 or newer (run: node --version).\n', e.message); process.exit(1); }

const langs = opt('lang') ? opt('lang').split(',') : Object.keys(TAG);
const only = opt('only')?.split(',');
const keys = Object.keys(WORDS).filter(k => !only || only.includes(k));
const IN = 'recordings/words';
const mine = (lang, key) => join(IN, lang, `${key}.ai.wav`);
const theirs = (lang, key) => existsSync(join(IN, lang)) && readdirSync(join(IN, lang)).some(f => f.split('.')[0] === key && !f.endsWith('.ai.wav'));

const jobs = [];
for (const lang of langs) for (const key of keys) {
  const text = WORDS[key]?.[lang];
  if (!text) continue;
  if (theirs(lang, key)) continue;                                   // a family recording wins
  if (existsSync(mine(lang, key)) && !flag('force') && !only) continue;
  jobs.push({ lang, key, text });
}
const chars = jobs.reduce((n, j) => n + j.text.length, 0);
console.log(`${jobs.length} word(s) to make, ${chars} characters (about ₹${(chars / 10000 * 30).toFixed(2)} at ₹30 per 10,000; new accounts get free credits).`);
console.log(`Voices: ${langs.map(l => `${l}=${VOICE[l]}`).join(', ')}  pace ${PACE}\n`);
if (flag('dry') || !jobs.length) process.exit(0);

const key = process.env.SARVAM_API_KEY;
if (!key) { console.error('Set SARVAM_API_KEY first (see the top of scripts/make-voices.mjs).'); process.exit(1); }

let ok = 0, bad = 0;
for (const j of jobs) {
  try {
    // The free tier allows only a few requests a minute: go gently, and wait and retry when told to slow down.
    let r;
    for (let wait = 4000; ; wait *= 2) {
      r = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: j.text, target_language_code: TAG[j.lang], speaker: VOICE[j.lang], model: 'bulbul:v3', pace: PACE, speech_sample_rate: 24000 })
      });
      if (r.status !== 429 || wait > 64000) break;
      console.log(`    (busy, waiting ${wait / 1000}s)`);
      await new Promise(res => setTimeout(res, wait));
    }
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    mkdirSync(join(IN, j.lang), { recursive: true });
    writeFileSync(mine(j.lang, j.key), Buffer.from(data.audios.join(''), 'base64'));
    ok++; console.log(`  ✓ ${j.lang} ${j.key.padEnd(14)} ${j.text}`);
    await new Promise(res => setTimeout(res, 700));
  } catch (e) {
    bad++; console.error(`  ✗ ${j.lang} ${j.key}: ${e.message}`);
    if (/^40[13] /.test(e.message)) { console.error('\nThe API key was refused. Check SARVAM_API_KEY.'); break; }
  }
}
console.log(`\n${ok} made${bad ? `, ${bad} failed` : ''}. Now trimming and loudness-matching…\n`);
spawnSync(process.execPath, ['scripts/process-audio.mjs'], { stdio: 'inherit' });
