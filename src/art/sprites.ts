/**
 * Painted art. Files live in public/art/*.webp (made from the AI art kit).
 * SIZE holds each image's pixel size so the scene can lay pieces out before they load.
 */
export const SIZE: Record<string, [number, number]> = {
  apple: [168, 200], balloon: [149, 156], 'barn-door': [195, 300], barn: [495, 376], 'bg-ground': [1648, 342], 'bg-hills': [1648, 928],
  bush: [292, 168], 'cloud-1': [260, 155], 'cloud-2': [224, 142], fence: [414, 153], 'flower-1': [121, 159], 'flower-2': [126, 161],
  'flower-3': [126, 162], hay: [250, 184], 'loft-shutter': [124, 142], moon: [184, 193], pond: [422, 141],
  sun: [168, 160], tree: [318, 356], 'learn-thumb': [300, 200], 'farm-thumb': [480, 260],
  'cow-idle': [556, 520], 'cow-happy': [525, 489], 'cow-sleep': [613, 383],
  'duck-idle': [374, 520], 'duck-happy': [447, 475], 'duck-sleep': [459, 368],
  'frog-idle': [454, 505], 'frog-happy': [573, 520], 'frog-sleep': [534, 386],
  'hen-idle': [404, 520], 'hen-happy': [475, 498], 'hen-sleep': [479, 375],
  'kitten-idle': [463, 520], 'kitten-happy': [447, 515], 'kitten-sleep': [548, 386],
  'parrot-idle': [387, 520], 'parrot-happy': [555, 519], 'parrot-sleep': [501, 386],
  'pig-idle': [536, 520], 'pig-happy': [506, 506], 'pig-sleep': [550, 362],
  'puppy-idle': [472, 520], 'puppy-happy': [458, 518], 'puppy-sleep': [583, 353],
  'sheep-idle': [472, 520], 'sheep-happy': [473, 507], 'sheep-sleep': [583, 376],
  /* kitchen (art/k/) */
  'k/stove': [636, 700], 'k/fridge': [410, 700], 'k/pot': [700, 463], 'k/fridge-open': [614, 700], 'k/banana': [341, 316], 'k/carrot': [279, 358], 'k/milk': [196, 348], 'k/cheese': [292, 286], 'k/watermelon': [362, 251], 'k/grapes': [301, 325], 'k/broccoli': [338, 339], 'k/tomato': [326, 330], 'k/orange': [322, 343], 'k/toaster': [310, 255], 'k/bread': [257, 247], 'k/toast': [261, 248], 'k/spoon': [284, 294], 'k/table': [336, 231], 'k/plate': [341, 232], 'k/bowl': [306, 225], 'k/cookies': [352, 208], 'k/cookie': [258, 259], 'k/clock': [298, 348], 'k/cuckoo': [245, 222], 'k/kettle': [317, 319]
};

export const url = (name: string) => `art/${name}.webp`;

/**
 * Animated clips (sprite sheets made from AI video, see Art Kit step 4).
 * cw/ch = frame size in px; ax/ay = point between the feet inside a frame; stand = standing height in px.
 */
export interface Clip { src: string; cols: number; n: number; cw: number; ch: number; fps: number; ax: number; ay: number; stand: number }
export const ANIM: Record<string, Partial<Record<'walk' | 'happy' | 'idle' | 'eat' | 'sleep', Clip>>> = {
  cow: {
    walk: { src: 'anim/cow-walk.webp', cols: 8, n: 16, cw: 377, ch: 326, fps: 15, ax: 183.3, ay: 322.5, stand: 300 },
    happy: { src: 'anim/cow-happy.webp', cols: 8, n: 22, cw: 380, ch: 432, fps: 15, ax: 188.6, ay: 428.9, stand: 300 }
  }
};

/** Size of a piece drawn at a given width or height (scene units), keeping its proportions. */
export function fit(name: string, w?: number, h?: number): [number, number] {
  const [pw, ph] = SIZE[name];
  if (w) return [w, w * ph / pw];
  return [h! * pw / ph, h!];
}

/** An SVG <image> tag. Anchor 'bottom' puts (x, y) at the bottom centre, 'center' at the middle. */
export function img(name: string, x: number, y: number, w: number, h: number, anchor: 'bottom' | 'center' | 'topleft' = 'bottom', extra = '') {
  const X = anchor === 'topleft' ? x : x - w / 2, Y = anchor === 'bottom' ? y - h : anchor === 'center' ? y - h / 2 : y;
  return `<image href="${url(name)}" x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="none" ${extra}/>`;
}

/** Preload every image so the first tap on anything is instant. */
export function preloadArt() {
  for (const n of Object.keys(SIZE)) { const i = new Image(); i.decoding = 'async'; i.src = url(n); }
  for (const k in ANIM) for (const c of Object.values(ANIM[k])) { const i = new Image(); i.decoding = 'async'; i.src = c!.src; }
}
