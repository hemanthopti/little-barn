/** The cast. Art lives in public/art/<kind>-<pose>.webp; sizes in sprites.ts. */
export type Kind = 'cow' | 'pig' | 'sheep' | 'hen' | 'duck' | 'puppy' | 'kitten' | 'frog' | 'parrot';
export type Pose = 'idle' | 'happy' | 'sleep';

/** Which sound each character makes. */
export const VOICE: Record<Kind, string> = {
  cow: 'moo', pig: 'oink', sheep: 'baa', hen: 'cluck', duck: 'quack',
  puppy: 'woof', kitten: 'meow', frog: 'ribbit', parrot: 'squawk'
};
