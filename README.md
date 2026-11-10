# Little Barn

A tap-and-play farm for 2-year-olds. No ads, no paywalls, no accounts. Works offline once loaded.

## Run and build

```bash
npm install
npm run dev      # http://localhost:5173, also on your phone via the Network URL
npm run build    # typecheck + build into ../starlinkwatch/play (auto-uploads to public_html/play)
npm run audio    # process recordings/ into game-ready clips (see RECORDING.md)
```

## Deploy

`npm run build` writes into `../starlinkwatch/play`; the VS Code SFTP sync uploads it to `public_html/play`.
Phones that played before pick up the new version on their second open (offline cache).

## Project layout

```
index.html          static SVG scene (sky, barn, tree, pond) and the parent panel markup
src/main.ts         boot order
src/core/           util, animation engine, state + settings, touch/drag routing
src/audio/          synth (fallback sounds), clips (recorded audio), speech (spoken words)
src/art/            sprite table (sprites.ts) and the cast (animals.ts)
public/art/         painted art (WebP) made with the AI art kit
src/content/        words per language
src/scene/          findit.ts ("Where is the …?" game), fence.ts (musical fence), life.ts (animal behaviours: wander, sniff, eat apples, nap, hop; duck paddles), barn, tree + apples, yard animals + parrot, pond + flowers, sky + night, daily visitors, effects
src/parent/         parent gate, settings panel, co-play tips
scripts/            process-audio.mjs (npm run audio)
recordings/         raw recordings, input for npm run audio
public/audio/       recorded sounds and words + manifest.json
```

Every tappable thing has a `data-id` in the SVG and an entry in `objs` (`src/core/input.ts`) with `tap()` and optionally `drag`.

## Parent features

Hold ⚙ for 3 s. "Where is the…?" questions on/off, family voices (recorded in-game, stored in IndexedDB, trimmed and loudness-matched on load), two family photos
(barn windows, tap for peekaboo), bedtime timer (night, lullaby, sleeping animals, taps only twinkle until "Wake up"),
co-play tips for the parent, voice mirror, language, time of day, visitor, full screen. Nothing leaves the device.

Voice priority: family recording → shipped clip (public/audio) → the phone's voice → English voice.

## Adding recorded audio

See RECORDING.md for the full kit. In short: put raw files in `recordings/`, run `npm run audio`, then build.


Put files in `public/audio/` and list them in `public/audio/manifest.json`:

```json
{
  "sfx":   { "moo": "sfx/moo.mp3", "oink": "sfx/oink.mp3" },
  "words": { "en": { "cow": "words/en/cow.mp3" },
             "kn": { "cow": "words/kn/cow.mp3" } }
}
```

- Sound names: pop, boing, splash, sparkle, chomp, moo, oink, baa, cluck, quack, woof, meow, ribbit, squawk, chimeUp, chimeDown, rustle, thud, creak, rain.
- Word keys: see `src/content/words.ts`.
- Anything not listed falls back to the synthesizer (sounds) or the phone's voice (words).
- Keep clips short (under 2 s), mono, 64–96 kbps MP3, peak-normalised to the same loudness.

## Adding things

- **A language:** add a column to `WORDS` and an entry to `LANGS` in `src/content/words.ts`.
- **A visitor:** add an entry to `VISITORS` in `src/scene/visitors.ts` (`make()` builds it and returns a cleanup function).
- **An animal:** add `<kind>-idle/-happy/-sleep.webp` to `public/art/` and their sizes to `SIZE` in `src/art/sprites.ts`, add it to `Kind` and `VOICE` in `src/art/animals.ts`, then place it in `src/scene/yard.ts` (x, y between the feet, standing height) or a barn door pool in `src/scene/barn.ts`.
- **Replacing art:** keep the file name; if the new image has a different size, update its entry in `SIZE`.

## Rules (from the design doc)

No dead touches, no fail states, no text in the child's area, targets at least 80 CSS px, nothing leaves the device.
