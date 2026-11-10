import type { Lang } from '../core/state';

/** Spoken words. Add a language by adding a column here and a voice tag below. */
export const WORDS: Record<string, Record<Lang, string>> = {
  cow: { en: 'Cow! Moo!', hi: 'गाय', kn: 'ಹಸು' },
  pig: { en: 'Pig! Oink oink!', hi: 'सूअर', kn: 'ಹಂದಿ' },
  sheep: { en: 'Sheep! Baa!', hi: 'भेड़', kn: 'ಕುರಿ' },
  hen: { en: 'Hen! Cluck cluck!', hi: 'मुर्गी', kn: 'ಕೋಳಿ' },
  duck: { en: 'Duck! Quack quack!', hi: 'बत्तख', kn: 'ಬಾತುಕೋಳಿ' },
  puppy: { en: 'Puppy! Woof woof!', hi: 'कुत्ता', kn: 'ನಾಯಿ' },
  kitten: { en: 'Kitty! Meow!', hi: 'बिल्ली', kn: 'ಬೆಕ್ಕು' },
  frog: { en: 'Frog! Ribbit!', hi: 'मेंढक', kn: 'ಕಪ್ಪೆ' },
  parrot: { en: 'Hello!', hi: 'नमस्ते!', kn: 'ನಮಸ್ಕಾರ!' },
  apple: { en: 'Apple!', hi: 'सेब', kn: 'ಸೇಬು' },
  sun: { en: 'Sun!', hi: 'सूरज', kn: 'ಸೂರ್ಯ' },
  moon: { en: 'Moon!', hi: 'चाँद', kn: 'ಚಂದ್ರ' },
  rain: { en: 'Rain!', hi: 'बारिश', kn: 'ಮಳೆ' },
  flower: { en: 'Flower!', hi: 'फूल', kn: 'ಹೂವು' },
  butterfly: { en: 'Butterfly!', hi: 'तितली', kn: 'ಚಿಟ್ಟೆ' },
  water: { en: 'Splash!', hi: 'पानी', kn: 'ನೀರು' },
  yummy: { en: 'Yummy!', hi: 'वाह, स्वादिष्ट!', kn: 'ರುಚಿಯಾಗಿದೆ!' },
  balloon: { en: 'Balloon!', hi: 'गुब्बारा', kn: 'ಬಲೂನು' },
  rainbow: { en: 'Rainbow!', hi: 'इंद्रधनुष', kn: 'ಕಾಮನಬಿಲ್ಲು' },
  barn: { en: 'Barn!', hi: 'खलिहान', kn: 'ಕೊಟ್ಟಿಗೆ' },
  night: { en: 'Good night!', hi: 'शुभ रात्रि', kn: 'ಶುಭ ರಾತ್ರಿ' },
  morning: { en: 'Good morning!', hi: 'सुप्रभात', kn: 'ಶುಭೋದಯ' },
  peekaboo: { en: 'Peekaboo!', hi: 'पीक-अ-बू!', kn: 'ಪೀಕ್-ಎ-ಬೂ!' },
  sleep: { en: 'Time to sleep. Good night!', hi: 'सोने का समय। शुभ रात्रि', kn: 'ಮಲಗುವ ಸಮಯ. ಶುಭ ರಾತ್ರಿ' }
};

/** Order of words in the parent's Family voices list: the most-used first. */
export const RECORD_ORDER = ['cow', 'pig', 'sheep', 'hen', 'duck', 'puppy', 'kitten', 'frog', 'parrot', 'yummy', 'peekaboo',
  'apple', 'sun', 'moon', 'rain', 'flower', 'butterfly', 'water', 'balloon', 'rainbow', 'barn', 'morning', 'night', 'sleep'];

export const LANGS: { id: Lang; label: string; name: string; tag: string }[] = [
  { id: 'en', label: 'English', name: 'English', tag: 'en-IN' },
  { id: 'hi', label: 'हिंदी', name: 'Hindi', tag: 'hi-IN' },
  { id: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada', tag: 'kn-IN' }
];
