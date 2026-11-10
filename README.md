# Little Barn

A tap-and-play farm for 2-year-olds. No ads, no paywalls, no accounts. Works offline once loaded.

## Run and build

```bash
npm install
npm run dev      # http://localhost:5173, also on your phone via the Network URL
npm run build    # typecheck + production build into dist/
```

## Deploy to Hostinger

1. `npm run build`
2. In hPanel File Manager, open the subdomain folder (for play.starlinkwatch.com: `public_html/play`) and delete the old files.
3. Upload everything inside `dist/`, including the hidden `.htaccess`.
4. Open the site once on the phone. After that it also works offline and can be added to the home screen.

## Project layout

```
index.html          static SVG scene (sky, barn, tree, pond) and the parent panel markup
src/main.ts         boot order
src/core/           util, animation engine, state + settings, touch/drag routing
src/audio/          synth (fallback sounds), clips (recorded audio), speech (spoken words)
src/art/            characters and props as SVG strings
src/content/        words per language
src/scene/          barn, tree + apples, yard animals + parrot, pond + flowers, sky + night, daily visitors, effects
src/parent/         parent gate and settings panel
public/audio/       recorded sounds and words + manifest.json
```

Every tappable thing has a `data-id` in the SVG and an entry in `objs` (`src/core/input.ts`) with `tap()` and optionally `drag`.

## Adding recorded audio

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
- **An animal:** draw it in `src/art/animals.ts` (origin between the feet, about 170 units tall), add `HEAD` and `VOICE`, then place it in `src/scene/yard.ts` or a barn door pool in `src/scene/barn.ts`.

## Rules (from the design doc)

No dead touches, no fail states, no text in the child's area, targets at least 80 CSS px, nothing leaves the device.
