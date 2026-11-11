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
  hide: { en: 'Hide and seek! Find me!', hi: 'छुपन-छुपाई! मुझे ढूँढो!', kn: 'ಕಣ್ಣಾಮುಚ್ಚಾಲೆ! ನನ್ನನ್ನು ಹುಡುಕು!' },
  peekaboo: { en: 'Peekaboo!', hi: 'पीक-अ-बू!', kn: 'ಪೀಕ್-ಎ-ಬೂ!' },
  kitchen: { en: 'Kitchen!', hi: 'रसोई', kn: 'ಅಡುಗೆಮನೆ' },
  farm: { en: 'Farm!', hi: 'खेत', kn: 'ಹೊಲ' },
  banana: { en: 'Banana!', hi: 'केला', kn: 'ಬಾಳೆಹಣ್ಣು' },
  carrot: { en: 'Carrot!', hi: 'गाजर', kn: 'ಕ್ಯಾರೆಟ್' },
  milk: { en: 'Milk!', hi: 'दूध', kn: 'ಹಾಲು' },
  cheese: { en: 'Cheese!', hi: 'चीज़', kn: 'ಚೀಸ್' },
  watermelon: { en: 'Watermelon!', hi: 'तरबूज़', kn: 'ಕಲ್ಲಂಗಡಿ' },
  grapes: { en: 'Grapes!', hi: 'अंगूर', kn: 'ದ್ರಾಕ್ಷಿ' },
  broccoli: { en: 'Broccoli!', hi: 'ब्रोकली', kn: 'ಬ್ರೊಕೊಲಿ' },
  tomato: { en: 'Tomato!', hi: 'टमाटर', kn: 'ಟೊಮೆಟೊ' },
  orange: { en: 'Orange!', hi: 'संतरा', kn: 'ಕಿತ್ತಳೆ' },
  toast: { en: 'Toast!', hi: 'टोस्ट', kn: 'ಟೋಸ್ಟ್' },
  cookie: { en: 'Cookie!', hi: 'बिस्कुट', kn: 'ಬಿಸ್ಕತ್ತು' },
  soup: { en: 'Soup!', hi: 'सूप', kn: 'ಸೂಪ್' },
  soupready: { en: 'Soup is ready!', hi: 'सूप तैयार है!', kn: 'ಸೂಪ್ ಸಿದ್ಧ!' },
  clean: { en: 'All clean!', hi: 'साफ़ हो गया!', kn: 'ಸ್ವಚ್ಛ ಆಯಿತು!' },
  cuckoo: { en: 'Cuckoo! Cuckoo!', hi: 'कू-कू! कू-कू!', kn: 'ಕುಕೂ! ಕುಕೂ!' },
  hot: { en: 'Hot hot!', hi: 'गरम गरम!', kn: 'ಬಿಸಿ ಬಿಸಿ!' },
  sleep: { en: 'Time to sleep. Good night!', hi: 'सोने का समय। शुभ रात्रि', kn: 'ಮಲಗುವ ಸಮಯ. ಶುಭ ರಾತ್ರಿ' }
};

/** Plain names, used to build the find-game questions. */
export const NAME: Record<string, Record<Lang, string>> = {
  cow: { en: 'cow', hi: 'गाय', kn: 'ಹಸು' }, pig: { en: 'pig', hi: 'सूअर', kn: 'ಹಂದಿ' }, duck: { en: 'duck', hi: 'बत्तख', kn: 'ಬಾತುಕೋಳಿ' },
  puppy: { en: 'puppy', hi: 'कुत्ता', kn: 'ನಾಯಿ' }, kitten: { en: 'kitty', hi: 'बिल्ली', kn: 'ಬೆಕ್ಕು' },
  parrot: { en: 'parrot', hi: 'तोता', kn: 'ಗಿಣಿ' }, frog: { en: 'frog', hi: 'मेंढक', kn: 'ಕಪ್ಪೆ' },
  sun: { en: 'sun', hi: 'सूरज', kn: 'ಸೂರ್ಯ' }, moon: { en: 'moon', hi: 'चाँद', kn: 'ಚಂದ್ರ' },
  tree: { en: 'tree', hi: 'पेड़', kn: 'ಮರ' }, barn: { en: 'barn', hi: 'खलिहान', kn: 'ಕೊಟ್ಟಿಗೆ' }
};

/** Names for the Learn room (also give "Where is the …?" questions). */
const MORE: [string, string, string, string][] = [
  ['sheep', 'sheep', 'भेड़', 'ಕುರಿ'], ['hen', 'hen', 'मुर्गी', 'ಕೋಳಿ'],
  ['apple', 'apple', 'सेब', 'ಸೇಬು'], ['banana', 'banana', 'केला', 'ಬಾಳೆಹಣ್ಣು'], ['orange', 'orange', 'संतरा', 'ಕಿತ್ತಳೆ'],
  ['grapes', 'grapes', 'अंगूर', 'ದ್ರಾಕ್ಷಿ'], ['watermelon', 'watermelon', 'तरबूज़', 'ಕಲ್ಲಂಗಡಿ'], ['tomato', 'tomato', 'टमाटर', 'ಟೊಮೆಟೊ'],
  ['carrot', 'carrot', 'गाजर', 'ಕ್ಯಾರೆಟ್'], ['broccoli', 'broccoli', 'ब्रोकली', 'ಬ್ರೊಕೊಲಿ'], ['milk', 'milk', 'दूध', 'ಹಾಲು'],
  ['cheese', 'cheese', 'चीज़', 'ಚೀಸ್'], ['bread', 'bread', 'ब्रेड', 'ಬ್ರೆಡ್'], ['toast', 'toast', 'टोस्ट', 'ಟೋಸ್ಟ್'], ['cookie', 'cookie', 'बिस्कुट', 'ಬಿಸ್ಕತ್ತು'],
  ['kettle', 'kettle', 'केतली', 'ಕೆಟಲ್'], ['toaster', 'toaster', 'टोस्टर', 'ಟೋಸ್ಟರ್'], ['clock', 'clock', 'घड़ी', 'ಗಡಿಯಾರ'],
  ['spoon', 'spoon', 'चम्मच', 'ಚಮಚ'], ['bowl', 'bowl', 'कटोरी', 'ಬಟ್ಟಲು'], ['plate', 'plate', 'थाली', 'ತಟ್ಟೆ'],
  ['table', 'table', 'मेज़', 'ಮೇಜು'], ['pot', 'pot', 'पतीला', 'ಪಾತ್ರೆ'], ['fridge', 'fridge', 'फ्रिज', 'ಫ್ರಿಡ್ಜ್'],
  ['oven', 'oven', 'ओवन', 'ಓವನ್'], ['bird', 'bird', 'चिड़िया', 'ಹಕ್ಕಿ'], ['balloon', 'balloon', 'गुब्बारा', 'ಬಲೂನು'],
  ['flower', 'flower', 'फूल', 'ಹೂವು']
];
for (const [k, en, hi, kn] of MORE) {
  NAME[k] = { en, hi, kn };
  if (!WORDS[k]) WORDS[k] = { en: en[0].toUpperCase() + en.slice(1) + '!', hi, kn };
}
if (!WORDS.tree) WORDS.tree = { en: 'Tree!', hi: 'पेड़', kn: 'ಮರ' };
// Cow Care
WORDS['cc-tickle'] = { en: 'Hee hee, that tickles!', hi: 'ही ही, गुदगुदी हो रही है!', kn: 'ಹಿ ಹಿ, ಕಚಗುಳಿ ಆಗುತ್ತಿದೆ!' };
WORDS['cc-hungry'] = { en: "I'm hungry!", hi: 'मुझे भूख लगी है!', kn: 'ನನಗೆ ಹಸಿವಾಗಿದೆ!' };
WORDS['cc-dirty'] = { en: "Oh no, I'm all muddy!", hi: 'अरे, मैं गंदी हो गई!', kn: 'ಅಯ್ಯೋ, ನಾನು ಕೊಳಕಾದೆ!' };
WORDS['cc-sleepy'] = { en: "I'm sleepy...", hi: 'मुझे नींद आ रही है...', kn: 'ನನಗೆ ನಿದ್ದೆ ಬರುತ್ತಿದೆ...' };
WORDS['cc-cuddle'] = { en: 'Give me a hug!', hi: 'मुझे गले लगाओ!', kn: 'ನನ್ನನ್ನು ಅಪ್ಪಿಕೋ!' };
WORDS['cc-milk'] = { en: 'Time for milking!', hi: 'दूध निकालो!', kn: 'ಹಾಲು ಕರೆಯೋಣ!' };
WORDS['cc-thanks'] = { en: 'Thank you!', hi: 'धन्यवाद!', kn: 'ಧನ್ಯವಾದ!' };
WORDS['cc-wake'] = { en: 'Good morning!', hi: 'सुप्रभात!', kn: 'ಶುಭೋದಯ!' };
WORDS['cc-night'] = { en: 'Good night!', hi: 'शुभ रात्रि!', kn: 'ಶುಭ ರಾತ್ರಿ!' };
WORDS['cc-splash'] = { en: 'Splash splash!', hi: 'छप छप!', kn: 'ಚಪ್ ಚಪ್!' };
WORDS['cc-brush'] = { en: 'Brush brush!', hi: 'ब्रश ब्रश!', kn: 'ಬ್ರಷ್ ಬ್ರಷ್!' };
WORDS.music = { en: "Let's make music!", hi: 'चलो गाना गाएं!', kn: 'ಹಾಡೋಣ!' };
WORDS.dance = { en: "Let's dance!", hi: 'चलो नाचें!', kn: 'ಕುಣಿಯೋಣ!' };
WORDS.learn = { en: "Let's learn!", hi: 'चलो सीखें!', kn: 'ಕಲಿಯೋಣ!' };
WORDS.again = { en: 'Try again!', hi: 'फिर से!', kn: 'ಮತ್ತೊಮ್ಮೆ!' };

/** Things the find game can ask about. */
export const FIND_KEYS = Object.keys(NAME);
for (const k of FIND_KEYS) {
  const n = NAME[k];
  WORDS['where-' + k] = { en: `Where is the ${n.en}?`, hi: `${n.hi} कहाँ है?`, kn: `${n.kn} ಎಲ್ಲಿದೆ?` };
}
WORDS.found = { en: 'Yay! You found it!', hi: 'शाबाश! मिल गया!', kn: 'ಭೇಷ್! ಸಿಕ್ಕಿತು!' };

/** Order of words in the parent's Family voices list: the most-used first. */
export const RECORD_ORDER = [...new Set(['cow', 'pig', 'sheep', 'hen', 'duck', 'puppy', 'kitten', 'frog', 'parrot', 'yummy', 'peekaboo', 'hide',
  'apple', 'sun', 'moon', 'rain', 'flower', 'butterfly', 'water', 'balloon', 'rainbow', 'barn', 'morning', 'night', 'sleep',
  'kitchen', 'farm', 'banana', 'carrot', 'milk', 'cheese', 'watermelon', 'grapes', 'broccoli', 'tomato', 'orange',
  'toast', 'cookie', 'soup', 'learn', 'music', 'dance', 'cc-tickle', 'cc-hungry', 'cc-dirty', 'cc-sleepy', 'cc-cuddle', 'cc-milk', 'cc-thanks', 'cc-wake', 'cc-night', 'cc-splash', 'cc-brush', 'tree', 'bread', 'kettle', 'toaster', 'clock', 'spoon', 'bowl', 'plate', 'table', 'pot', 'fridge', 'oven', 'bird', 'soupready', 'clean', 'cuckoo', 'hot',
  'found', ...FIND_KEYS.map(k => 'where-' + k)])];

export const LANGS: { id: Lang; label: string; name: string; tag: string }[] = [
  { id: 'en', label: 'English', name: 'English', tag: 'en-IN' },
  { id: 'hi', label: 'हिंदी', name: 'Hindi', tag: 'hi-IN' },
  { id: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada', tag: 'kn-IN' }
];
