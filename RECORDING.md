# Recording kit

There are two ways to give Little Barn real voices.

| | Family voices (in the game) | Shipped clips (this kit) |
| --- | --- | --- |
| Who hears them | Only the phone they were recorded on | Everyone who plays |
| How | Parent settings › Family voices › ● | Record files, run `npm run audio`, build |
| Best for | Mum, Dad, grandparents saying the words | The default voices and real animal sounds |

Family voices win over shipped clips, and shipped clips win over the phone's built-in voice.

## Recording tips

- Quiet room, no fan, phone 15–20 cm from the mouth.
- Say each word once, warmly and a little slower than normal. Smile while you say it.
- Leave a short pause before and after. The script trims silence.
- Any phone voice-recorder app works (.m4a, .mp3, .wav, .ogg, .opus, .aac).
- Name each file exactly as in the tables below. The extension doesn't matter.

## 1. Words (record once per language)

Put files in `recordings/words/en/`, `recordings/words/hi/` and `recordings/words/kn/`.

| File name | English | ಕನ್ನಡ | हिंदी |
| --- | --- | --- | --- |
| cow | Cow! Moo! | ಹಸು | गाय |
| pig | Pig! Oink oink! | ಹಂದಿ | सूअर |
| sheep | Sheep! Baa! | ಕುರಿ | भेड़ |
| hen | Hen! Cluck cluck! | ಕೋಳಿ | मुर्गी |
| duck | Duck! Quack quack! | ಬಾತುಕೋಳಿ | बत्तख |
| puppy | Puppy! Woof woof! | ನಾಯಿ | कुत्ता |
| kitten | Kitty! Meow! | ಬೆಕ್ಕು | बिल्ली |
| frog | Frog! Ribbit! | ಕಪ್ಪೆ | मेंढक |
| parrot | Hello! | ನಮಸ್ಕಾರ! | नमस्ते! |
| yummy | Yummy! | ರುಚಿಯಾಗಿದೆ! | वाह, स्वादिष्ट! |
| peekaboo | Peekaboo! | ಪೀಕ್-ಎ-ಬೂ! | पीक-अ-बू! |
| apple | Apple! | ಸೇಬು | सेब |
| sun | Sun! | ಸೂರ್ಯ | सूरज |
| moon | Moon! | ಚಂದ್ರ | चाँद |
| rain | Rain! | ಮಳೆ | बारिश |
| flower | Flower! | ಹೂವು | फूल |
| butterfly | Butterfly! | ಚಿಟ್ಟೆ | तितली |
| water | Splash! | ನೀರು | पानी |
| balloon | Balloon! | ಬಲೂನು | गुब्बारा |
| rainbow | Rainbow! | ಕಾಮನಬಿಲ್ಲು | इंद्रधनुष |
| barn | Barn! | ಕೊಟ್ಟಿಗೆ | खलिहान |
| morning | Good morning! | ಶುಭೋದಯ | सुप्रभात |
| night | Good night! | ಶುಭ ರಾತ್ರಿ | शुभ रात्रि |
| sleep | Time to sleep. Good night! | ಮಲಗುವ ಸಮಯ. ಶುಭ ರಾತ್ರಿ | सोने का समय। शुभ रात्रि |

Say what feels natural at home. The words above are only suggestions; the file name is what matters.

## 2. Sounds (optional, record once)

Put files in `recordings/sfx/`. Real animal sounds matter most. Everything else already has a good-enough generated sound.

| File name | Sound | Priority |
| --- | --- | --- |
| moo, oink, baa, cluck, quack, woof, meow, ribbit, squawk | The animal sounds (a grown-up imitating them works well and toddlers love it) | High |
| splash, chomp | Water splash, apple crunch (bite a real apple near the mic) | Medium |
| pop, boing, sparkle, rustle, thud, creak, rain, chimeUp, chimeDown, lullaby | Effects | Low |

Only use recordings you made yourself or ones whose licence allows use in an app (for example CC0). Don't use clips cut from videos or other apps.

## 3. Process and publish

```
npm run audio    # trims, matches loudness, converts, updates public/audio/manifest.json
npm run build    # publishes to the play folder
```

Re-run both whenever you add or replace a recording. To drop a clip, delete its file in `recordings/` and run them again.
