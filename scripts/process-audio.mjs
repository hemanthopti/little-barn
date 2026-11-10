// Turns raw phone recordings into game-ready clips and rewrites public/audio/manifest.json.
//
//   recordings/sfx/moo.m4a          -> public/audio/sfx/moo.mp3
//   recordings/words/kn/cow.m4a     -> public/audio/words/kn/cow.mp3
//
// Each clip: silence trimmed at both ends, loudness-matched, mono 44.1 kHz MP3 at 96 kbps.
// Run with:  npm run audio
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const IN = 'recordings', OUT = 'public/audio';
const AUDIO = new Set(['.m4a', '.mp3', '.wav', '.ogg', '.opus', '.webm', '.aac', '.amr', '.3gp', '.flac']);
const FILTER = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12',
  'areverse',
  'loudnorm=I=-16:TP=-1.5:LRA=11',
  'afade=t=in:d=0.01'
].join(',');

const files = dir => existsSync(dir) ? readdirSync(dir).filter(f => AUDIO.has(extname(f).toLowerCase()) && statSync(join(dir, f)).isFile()) : [];
const manifest = { sfx: {}, words: {} };
let ok = 0, failed = 0;

function convert(src, rel) {
  const dst = join(OUT, rel);
  mkdirSync(join(dst, '..'), { recursive: true });
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-af', FILTER, '-ac', '1', '-ar', '44100', '-b:a', '96k', dst]);
  if (r.status === 0) { ok++; return true; }
  failed++; console.error(`  ✗ ${src}: ${r.stderr.toString().trim().split('\n').pop()}`); return false;
}

for (const f of files(join(IN, 'sfx'))) {
  const name = basename(f, extname(f));
  if (convert(join(IN, 'sfx', f), `sfx/${name}.mp3`)) { manifest.sfx[name] = `sfx/${name}.mp3`; console.log(`  ✓ sound  ${name}`); }
}
const wordsDir = join(IN, 'words');
for (const lang of existsSync(wordsDir) ? readdirSync(wordsDir) : []) {
  if (!statSync(join(wordsDir, lang)).isDirectory()) continue;
  manifest.words[lang] = {};
  for (const f of files(join(wordsDir, lang))) {
    const key = basename(f, extname(f));
    if (convert(join(wordsDir, lang, f), `words/${lang}/${key}.mp3`)) { manifest.words[lang][key] = `words/${lang}/${key}.mp3`; console.log(`  ✓ ${lang.padEnd(6)} ${key}`); }
  }
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`\n${ok} clip(s) ready${failed ? `, ${failed} failed` : ''}. Manifest updated. Run "npm run build" to publish.`);
