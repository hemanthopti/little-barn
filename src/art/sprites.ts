/**
 * Painted art. Files live in public/art/*.webp (made from the AI art kit).
 * SIZE holds each image's pixel size so the scene can lay pieces out before they load.
 */
export const SIZE: Record<string, [number, number]> = {
  apple: [168, 200], balloon: [149, 156], 'barn-door': [195, 300], barn: [495, 376], 'bg-ground': [1648, 342], 'bg-hills': [1648, 928],
  bush: [292, 168], 'cloud-1': [260, 155], 'cloud-2': [224, 142], fence: [414, 153], 'flower-1': [121, 159], 'flower-2': [126, 161],
  'flower-3': [126, 162], hay: [250, 184], 'loft-shutter': [124, 142], moon: [184, 193], pond: [422, 141], rainbow: [305, 127],
  sun: [168, 160], tree: [318, 356],
  'cow-idle': [556, 520], 'cow-happy': [525, 489], 'cow-sleep': [613, 383],
  'duck-idle': [374, 520], 'duck-happy': [447, 475], 'duck-sleep': [459, 368],
  'frog-idle': [454, 505], 'frog-happy': [573, 520], 'frog-sleep': [534, 386],
  'hen-idle': [404, 520], 'hen-happy': [475, 498], 'hen-sleep': [479, 375],
  'kitten-idle': [463, 520], 'kitten-happy': [447, 515], 'kitten-sleep': [548, 386],
  'parrot-idle': [387, 520], 'parrot-happy': [555, 519], 'parrot-sleep': [501, 386],
  'pig-idle': [536, 520], 'pig-happy': [506, 506], 'pig-sleep': [550, 362],
  'puppy-idle': [472, 520], 'puppy-happy': [458, 518], 'puppy-sleep': [583, 353],
  'sheep-idle': [472, 520], 'sheep-happy': [473, 507], 'sheep-sleep': [583, 376]
};

export const url = (name: string) => `art/${name}.webp`;

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
}
