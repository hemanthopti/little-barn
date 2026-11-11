import ASSETS from 'virtual:assets';

/** The real (content-hashed) URL of a picture, animation or sound, e.g. asset('art/cow-idle.webp'). */
export const asset = (path: string) => (ASSETS as Record<string, string>)[path] || path;
