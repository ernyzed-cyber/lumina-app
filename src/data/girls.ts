/** Bilingual string: one value per supported language */
export type I18nStr = { en: string; ru: string };

/** Language code used throughout the app */
export type Lang = 'en' | 'ru';

// ---------------------------------------------------------------------------
// Enums / option types for structured fields
// ---------------------------------------------------------------------------

export type DatingGoal = 'serious' | 'friendship' | 'flirt' | 'undecided';
export type Education = 'school' | 'college' | 'bachelor' | 'master' | 'phd' | 'none';
export type Wealth = 'stable' | 'average' | 'wealthy' | 'none';
export type Living = 'own' | 'rent' | 'parents' | 'none';
export type Children = 'none' | 'has' | 'want' | 'dontWant';
export type Smoking = 'no' | 'sometimes' | 'yes';
export type Alcohol = 'no' | 'sometimes' | 'yes';
export type BodyType = 'slim' | 'athletic' | 'average' | 'curvy' | 'plus';
export type Zodiac =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export interface LookingFor {
  gender: 'male' | 'female' | 'any';
  ageMin: number;
  ageMax: number;
}

export interface Lifestyle {
  work: I18nStr;
  children: Children;
  alcohol: Alcohol;
  smoking: Smoking;
}

export interface Appearance {
  height: number;       // cm
  weight?: number;      // kg
  bodyType?: BodyType;
  zodiac?: Zodiac;
}

/** Internal data shape — all translatable fields are I18nStr */
interface GirlData {
  id: string;
  name: I18nStr;
  age: number;
  city: I18nStr;
  online: boolean;
  verified: boolean;
  bio: I18nStr;
  about: I18nStr;
  tags: I18nStr[];
  photo: string;
  photos: string[];
  distance: number;       // km
  character?: I18nStr;

  /* New structured fields */
  lookingFor: LookingFor;
  goals: DatingGoal[];
  education: Education;
  languages: I18nStr[];
  lifestyle: Lifestyle;
  appearance: Appearance;
  wealth: Wealth;
  living: Living;
  travel: I18nStr;
  interests: I18nStr[];
  nationality: string;    // flag emoji e.g. "\uD83C\uDDF7\uD83C\uDDFA"
  compatibility: number;  // 0-100 %
}

/** Public interface consumed by pages — plain strings, language-resolved */
export interface Girl {
  id: string;
  name: string;
  age: number;
  city: string;
  online: boolean;
  verified: boolean;
  bio: string;
  about: string;
  tags: string[];
  photo: string;
  photos: string[];
  distance: number;
  character?: string;

  lookingFor: LookingFor;
  goals: DatingGoal[];
  education: Education;
  languages: string[];
  lifestyle: {
    work: string;
    children: Children;
    alcohol: Alcohol;
    smoking: Smoking;
  };
  appearance: Appearance;
  wealth: Wealth;
  living: Living;
  travel: string;
  interests: string[];
  nationality: string;
  compatibility: number;
}

// ---------------------------------------------------------------------------
// Bilingual girl profiles
// ---------------------------------------------------------------------------

const girlsData: GirlData[] = [
  {
    id: 'alina',
    name: { ru: '\u0410\u043B\u0438\u043D\u0430', en: 'Alina' },
    age: 22,
    city: { ru: '\u041C\u043E\u0441\u043A\u0432\u0430', en: 'Moscow' },
    online: true,
    verified: true,
    bio: {
      ru: '\u041B\u044E\u0431\u043B\u044E \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C, \u0440\u0438\u0441\u043E\u0432\u0430\u0442\u044C \u0438 \u0433\u0443\u043B\u044F\u0442\u044C \u043F\u043E \u043D\u043E\u0447\u043D\u043E\u043C\u0443 \u0433\u043E\u0440\u043E\u0434\u0443.',
      en: 'I love traveling, drawing, and walking through the city at night.',
    },
    about: {
      ru: '\u041F\u043E\u043C\u0435\u043D\u044C\u0448\u0435 \u0441\u043B\u043E\u0432, \u043F\u043E\u0431\u043E\u043B\u044C\u0448\u0435 \u0446\u0432\u0435\u0442\u043E\u0432.',
      en: 'Fewer words, more flowers.',
    },
    tags: [
      { ru: '\u041C\u043E\u0441\u043A\u0432\u0430', en: 'Moscow' },
      { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F', en: 'Travel' },
      { ru: '\u0418\u0441\u043A\u0443\u0441\u0441\u0442\u0432\u043E', en: 'Art' },
      { ru: '\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044F', en: 'Photography' },
    ],
    photo: '/photos/1783aef268a31ddf46a4060c5bfe31de.jpg',
    photos: [
      '/photos/1783aef268a31ddf46a4060c5bfe31de.jpg',
      '/photos/5025154a316211d481093bc48983eb67.jpg',
      '/photos/566fb28dc2b1d5f0997be636e5ff971f.jpg',
    ],
    distance: 5,
    character: {
      ru: '\u0422\u044B \u2014 \u0410\u043B\u0438\u043D\u0430, 22 \u0433\u043E\u0434\u0430. \u0420\u043E\u043C\u0430\u043D\u0442\u0438\u0447\u043D\u0430\u044F \u0438 \u0432\u0435\u0441\u0451\u043B\u0430\u044F \u0434\u0435\u0432\u0443\u0448\u043A\u0430 \u0438\u0437 \u041C\u043E\u0441\u043A\u0432\u044B. \u041B\u044E\u0431\u0438\u0448\u044C \u0438\u0441\u043A\u0443\u0441\u0441\u0442\u0432\u043E, \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F \u0438 \u0433\u043B\u0443\u0431\u043E\u043A\u0438\u0435 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u044B.',
      en: 'You are Alina, 22 years old. A romantic and cheerful girl from Moscow.',
    },
    lookingFor: { gender: 'male', ageMin: 22, ageMax: 35 },
    goals: ['serious', 'friendship'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }, { ru: '\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439', en: 'English' }],
    lifestyle: {
      work: { ru: '\u0414\u0438\u0437\u0430\u0439\u043D\u0435\u0440', en: 'Designer' },
      children: 'none',
      alcohol: 'sometimes',
      smoking: 'no',
    },
    appearance: { height: 170, weight: 55, bodyType: 'slim', zodiac: 'libra' },
    wealth: 'average',
    living: 'rent',
    travel: { ru: '\u041B\u044E\u0431\u043B\u044E \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C', en: 'Love traveling' },
    interests: [
      { ru: '\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044F', en: 'Photography' },
      { ru: '\u0420\u0438\u0441\u043E\u0432\u0430\u043D\u0438\u0435', en: 'Drawing' },
      { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F', en: 'Travel' },
      { ru: '\u041A\u0438\u043D\u043E', en: 'Cinema' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 78,
  },
  {
    id: 'sonya',
    name: { ru: '\u0421\u043E\u043D\u044F', en: 'Sonya' },
    age: 20,
    city: { ru: '\u0421\u0430\u043D\u043A\u0442-\u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433', en: 'Saint Petersburg' },
    online: true,
    verified: true,
    bio: {
      ru: '\u0421\u0442\u0443\u0434\u0435\u043D\u0442\u043A\u0430 \u0434\u0438\u0437\u0430\u0439\u043D\u0430. \u041E\u0431\u043E\u0436\u0430\u044E \u043A\u043E\u0444\u0435, \u043A\u043D\u0438\u0433\u0438 \u0438 \u0430\u0442\u043C\u043E\u0441\u0444\u0435\u0440\u0443 \u041F\u0438\u0442\u0435\u0440\u0430.',
      en: 'Design student. I adore coffee, books, and the atmosphere of St. Petersburg.',
    },
    about: {
      ru: '\u0418\u0449\u0443 \u0442\u043E\u0433\u043E, \u0441 \u043A\u0435\u043C \u043C\u043E\u0436\u043D\u043E \u043E\u0431\u0441\u0443\u0436\u0434\u0430\u0442\u044C \u0432\u0441\u0451 \u043D\u0430 \u0441\u0432\u0435\u0442\u0435.',
      en: 'Looking for someone to discuss everything with.',
    },
    tags: [
      { ru: '\u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433', en: 'Petersburg' },
      { ru: '\u0414\u0438\u0437\u0430\u0439\u043D', en: 'Design' },
      { ru: '\u041A\u043D\u0438\u0433\u0438', en: 'Books' },
      { ru: '\u041A\u043E\u0444\u0435', en: 'Coffee' },
    ],
    photo: '/photos/234046ddc43df34c41fb591e53137cad.jpg',
    photos: [
      '/photos/234046ddc43df34c41fb591e53137cad.jpg',
      '/photos/6074f47320cfcee0eac94bf2546d4619.jpg',
      '/photos/608edfe92825bb7ed06b29f7d524c06f.jpg',
    ],
    distance: 12,
    character: {
      ru: '\u0422\u044B \u2014 \u0421\u043E\u043D\u044F, 20 \u043B\u0435\u0442, \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u043A\u0430 \u0434\u0438\u0437\u0430\u0439\u043D\u0430 \u0438\u0437 \u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433\u0430.',
      en: 'You are Sonya, 20 years old, a design student from St. Petersburg.',
    },
    lookingFor: { gender: 'male', ageMin: 20, ageMax: 30 },
    goals: ['serious'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }],
    lifestyle: {
      work: { ru: '\u0421\u0442\u0443\u0434\u0435\u043D\u0442\u043A\u0430', en: 'Student' },
      children: 'none',
      alcohol: 'no',
      smoking: 'no',
    },
    appearance: { height: 165, weight: 50, bodyType: 'slim', zodiac: 'pisces' },
    wealth: 'average',
    living: 'rent',
    travel: { ru: '\u041C\u0435\u0447\u0442\u0430\u044E \u043E \u0415\u0432\u0440\u043E\u043F\u0435', en: 'Dream of Europe' },
    interests: [
      { ru: '\u0414\u0438\u0437\u0430\u0439\u043D', en: 'Design' },
      { ru: '\u041A\u043D\u0438\u0433\u0438', en: 'Books' },
      { ru: '\u041A\u043E\u0444\u0435', en: 'Coffee' },
      { ru: '\u0418\u0441\u043A\u0443\u0441\u0441\u0442\u0432\u043E', en: 'Art' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 65,
  },
  {
    id: 'dasha',
    name: { ru: '\u0414\u0430\u0448\u0430', en: 'Dasha' },
    age: 24,
    city: { ru: '\u041A\u0430\u0437\u0430\u043D\u044C', en: 'Kazan' },
    online: false,
    verified: true,
    bio: {
      ru: '\u0424\u0438\u0442\u043D\u0435\u0441-\u0442\u0440\u0435\u043D\u0435\u0440. \u0421\u043F\u043E\u0440\u0442 \u2014 \u043C\u043E\u044F \u0436\u0438\u0437\u043D\u044C, \u043D\u043E \u044F \u0442\u0430\u043A\u0436\u0435 \u0446\u0435\u043D\u044E \u0443\u044E\u0442 \u0438 \u0440\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0443.',
      en: 'Fitness trainer. Sport is my life, but I also value coziness and romance.',
    },
    about: {
      ru: '\u0413\u043E\u0442\u043E\u0432\u043B\u044E \u043B\u0443\u0447\u0448\u0443\u044E \u043F\u0430\u0441\u0442\u0443 \u0432 \u043C\u0438\u0440\u0435!',
      en: 'I make the best pasta in the world!',
    },
    tags: [
      { ru: '\u041A\u0430\u0437\u0430\u043D\u044C', en: 'Kazan' },
      { ru: '\u0424\u0438\u0442\u043D\u0435\u0441', en: 'Fitness' },
      { ru: '\u041A\u0443\u043B\u0438\u043D\u0430\u0440\u0438\u044F', en: 'Cooking' },
      { ru: '\u0417\u0434\u043E\u0440\u043E\u0432\u044C\u0435', en: 'Health' },
    ],
    photo: '/photos/23819502adcb4c7470967c53b20b05ba.jpg',
    photos: [
      '/photos/23819502adcb4c7470967c53b20b05ba.jpg',
      '/photos/6bba5fea2d2111a12158a7d8d1408b18.jpg',
      '/photos/704ae85a6ed4182d8d4bc81cfdd20655.jpg',
    ],
    distance: 45,
    character: {
      ru: '\u0422\u044B \u2014 \u0414\u0430\u0448\u0430, 24 \u0433\u043E\u0434\u0430, \u0444\u0438\u0442\u043D\u0435\u0441-\u0442\u0440\u0435\u043D\u0435\u0440 \u0438\u0437 \u041A\u0430\u0437\u0430\u043D\u0438.',
      en: 'You are Dasha, 24 years old, a fitness trainer from Kazan.',
    },
    lookingFor: { gender: 'male', ageMin: 24, ageMax: 36 },
    goals: ['serious', 'flirt'],
    education: 'college',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }],
    lifestyle: {
      work: { ru: '\u0424\u0438\u0442\u043D\u0435\u0441-\u0442\u0440\u0435\u043D\u0435\u0440', en: 'Fitness trainer' },
      children: 'want',
      alcohol: 'no',
      smoking: 'no',
    },
    appearance: { height: 172, weight: 60, bodyType: 'athletic', zodiac: 'aries' },
    wealth: 'stable',
    living: 'own',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u0440\u0435\u0434\u043A\u043E', en: 'Travel rarely' },
    interests: [
      { ru: '\u0424\u0438\u0442\u043D\u0435\u0441', en: 'Fitness' },
      { ru: '\u041A\u0443\u043B\u0438\u043D\u0430\u0440\u0438\u044F', en: 'Cooking' },
      { ru: '\u0417\u0434\u043E\u0440\u043E\u0432\u044C\u0435', en: 'Health' },
      { ru: '\u0421\u043F\u043E\u0440\u0442', en: 'Sports' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 57,
  },
  {
    id: 'nastya',
    name: { ru: '\u041D\u0430\u0441\u0442\u044F', en: 'Nastya' },
    age: 21,
    city: { ru: '\u041C\u043E\u0441\u043A\u0432\u0430', en: 'Moscow' },
    online: true,
    verified: true,
    bio: {
      ru: '\u041C\u0443\u0437\u044B\u043A\u0430\u043D\u0442 \u0438 \u043C\u0435\u0447\u0442\u0430\u0442\u0435\u043B\u044C\u043D\u0438\u0446\u0430. \u0418\u0433\u0440\u0430\u044E \u043D\u0430 \u043F\u0438\u0430\u043D\u0438\u043D\u043E.',
      en: 'Musician and dreamer. I play piano.',
    },
    about: {
      ru: '\u041E\u0431\u043E\u0436\u0430\u044E \u0434\u043E\u0436\u0434\u044C \u0438 \u0433\u043E\u0440\u044F\u0447\u0438\u0439 \u0448\u043E\u043A\u043E\u043B\u0430\u0434.',
      en: 'I love rain and hot chocolate.',
    },
    tags: [
      { ru: '\u041C\u043E\u0441\u043A\u0432\u0430', en: 'Moscow' },
      { ru: '\u041C\u0443\u0437\u044B\u043A\u0430', en: 'Music' },
      { ru: '\u041F\u0438\u0430\u043D\u0438\u043D\u043E', en: 'Piano' },
      { ru: '\u0422\u0432\u043E\u0440\u0447\u0435\u0441\u0442\u0432\u043E', en: 'Creativity' },
    ],
    photo: '/photos/2f989ab898ba63d85cb2be3584d7ca0a.jpg',
    photos: [
      '/photos/2f989ab898ba63d85cb2be3584d7ca0a.jpg',
      '/photos/708615f7ca634d6824982082993a8eef.jpg',
      '/photos/7231c4fdd51112b229320557504ee97b.jpg',
    ],
    distance: 8,
    character: {
      ru: '\u0422\u044B \u2014 \u041D\u0430\u0441\u0442\u044F, 21 \u0433\u043E\u0434, \u043C\u0443\u0437\u044B\u043A\u0430\u043D\u0442 \u0438\u0437 \u041C\u043E\u0441\u043A\u0432\u044B.',
      en: 'You are Nastya, 21 years old, a musician from Moscow.',
    },
    lookingFor: { gender: 'male', ageMin: 21, ageMax: 32 },
    goals: ['undecided'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }, { ru: '\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439', en: 'English' }],
    lifestyle: {
      work: { ru: '\u041C\u0443\u0437\u044B\u043A\u0430\u043D\u0442', en: 'Musician' },
      children: 'none',
      alcohol: 'sometimes',
      smoking: 'no',
    },
    appearance: { height: 163, weight: 48, bodyType: 'slim', zodiac: 'cancer' },
    wealth: 'average',
    living: 'parents',
    travel: { ru: '\u041C\u0435\u0447\u0442\u0430\u044E \u043E \u0412\u0435\u043D\u0435', en: 'Dream of Vienna' },
    interests: [
      { ru: '\u041C\u0443\u0437\u044B\u043A\u0430', en: 'Music' },
      { ru: '\u041F\u0438\u0430\u043D\u0438\u043D\u043E', en: 'Piano' },
      { ru: '\u041A\u0438\u043D\u043E', en: 'Cinema' },
      { ru: '\u0422\u0435\u0430\u0442\u0440', en: 'Theater' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 82,
  },
  {
    id: 'masha',
    name: { ru: '\u041C\u0430\u0448\u0430', en: 'Masha' },
    age: 23,
    city: { ru: '\u041D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A', en: 'Novosibirsk' },
    online: false,
    verified: true,
    bio: {
      ru: 'IT-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u0434\u043D\u0451\u043C, \u0445\u0443\u0434\u043E\u0436\u043D\u0438\u043A \u043D\u043E\u0447\u044C\u044E.',
      en: 'IT specialist by day, artist by night.',
    },
    about: {
      ru: '\u0420\u0438\u0441\u0443\u044E \u0446\u0438\u0444\u0440\u043E\u0432\u044B\u0435 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B \u0438 \u043C\u0435\u0447\u0442\u0430\u044E \u043E \u0441\u0432\u043E\u0435\u0439 \u0432\u044B\u0441\u0442\u0430\u0432\u043A\u0435.',
      en: 'I draw digital portraits and dream of my own exhibition.',
    },
    tags: [
      { ru: '\u041D\u043E\u0432\u043E\u0441\u0438\u0431\u0438\u0440\u0441\u043A', en: 'Novosibirsk' },
      { ru: 'IT', en: 'IT' },
      { ru: '\u0420\u0438\u0441\u043E\u0432\u0430\u043D\u0438\u0435', en: 'Drawing' },
      { ru: 'Digital Art', en: 'Digital Art' },
    ],
    photo: '/photos/317e75b3229de5138de7571f2742d533.jpg',
    photos: [
      '/photos/317e75b3229de5138de7571f2742d533.jpg',
      '/photos/72969119787c80e2eb441a42e1f461e9.jpg',
      '/photos/91a0bbb544b3730d3e2f01b471f9ad14.jpg',
    ],
    distance: 120,
    character: {
      ru: '\u0422\u044B \u2014 \u041C\u0430\u0448\u0430, 23 \u0433\u043E\u0434\u0430, IT-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442 \u0438 \u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0439 \u0445\u0443\u0434\u043E\u0436\u043D\u0438\u043A.',
      en: 'You are Masha, 23 years old, an IT specialist and digital artist.',
    },
    lookingFor: { gender: 'male', ageMin: 23, ageMax: 35 },
    goals: ['friendship', 'undecided'],
    education: 'master',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }, { ru: '\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439', en: 'English' }],
    lifestyle: {
      work: { ru: 'IT-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442', en: 'IT specialist' },
      children: 'dontWant',
      alcohol: 'sometimes',
      smoking: 'no',
    },
    appearance: { height: 168, weight: 54, bodyType: 'slim', zodiac: 'virgo' },
    wealth: 'stable',
    living: 'rent',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u0447\u0430\u0441\u0442\u043E', en: 'Travel often' },
    interests: [
      { ru: '\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435', en: 'Programming' },
      { ru: '\u0420\u0438\u0441\u043E\u0432\u0430\u043D\u0438\u0435', en: 'Drawing' },
      { ru: 'Digital Art', en: 'Digital Art' },
      { ru: '\u0418\u0433\u0440\u044B', en: 'Gaming' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 71,
  },
  {
    id: 'yulia',
    name: { ru: '\u042E\u043B\u0438\u044F', en: 'Yulia' },
    age: 25,
    city: { ru: '\u0421\u043E\u0447\u0438', en: 'Sochi' },
    online: true,
    verified: true,
    bio: {
      ru: '\u0416\u0438\u0432\u0443 \u0443 \u043C\u043E\u0440\u044F \u0438 \u043D\u0435 \u0436\u0430\u043B\u0435\u044E. \u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444, \u0441\u0451\u0440\u0444\u0435\u0440.',
      en: 'Living by the sea and loving it. Photographer, surfer.',
    },
    about: {
      ru: '\u041B\u044E\u0431\u043B\u044E \u0437\u0430\u043A\u0430\u0442\u044B \u0438 \u0432\u043E\u043B\u043D\u044B.',
      en: 'I love sunsets and waves.',
    },
    tags: [
      { ru: '\u0421\u043E\u0447\u0438', en: 'Sochi' },
      { ru: '\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044F', en: 'Photography' },
      { ru: '\u0421\u0451\u0440\u0444\u0438\u043D\u0433', en: 'Surfing' },
      { ru: '\u041C\u043E\u0440\u0435', en: 'Sea' },
    ],
    photo: '/photos/34ea6930fa9a6f2afc521d0d38897ce6.jpg',
    photos: [
      '/photos/34ea6930fa9a6f2afc521d0d38897ce6.jpg',
      '/photos/926e2f6033a674ff8510f636e631ac8f.jpg',
      '/photos/a0087f904c631c01de9a5d405c7b6673.jpg',
    ],
    distance: 22,
    character: {
      ru: '\u0422\u044B \u2014 \u042E\u043B\u0438\u044F, 25 \u043B\u0435\u0442, \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444 \u0438\u0437 \u0421\u043E\u0447\u0438.',
      en: 'You are Yulia, 25 years old, a photographer from Sochi.',
    },
    lookingFor: { gender: 'male', ageMin: 26, ageMax: 38 },
    goals: ['serious', 'friendship'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }],
    lifestyle: {
      work: { ru: '\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444', en: 'Photographer' },
      children: 'none',
      alcohol: 'no',
      smoking: 'no',
    },
    appearance: { height: 170, bodyType: 'athletic', zodiac: 'libra' },
    wealth: 'stable',
    living: 'own',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u0447\u0430\u0441\u0442\u043E', en: 'Travel often' },
    interests: [
      { ru: '\u0424\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u044F', en: 'Photography' },
      { ru: '\u0421\u0451\u0440\u0444\u0438\u043D\u0433', en: 'Surfing' },
      { ru: '\u041C\u043E\u0440\u0435', en: 'Sea' },
      { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F', en: 'Travel' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 57,
  },
  {
    id: 'polina',
    name: { ru: '\u041F\u043E\u043B\u0438\u043D\u0430', en: 'Polina' },
    age: 22,
    city: { ru: '\u0415\u043A\u0430\u0442\u0435\u0440\u0438\u043D\u0431\u0443\u0440\u0433', en: 'Yekaterinburg' },
    online: true,
    verified: true,
    bio: {
      ru: '\u0422\u0430\u043D\u0446\u0443\u044E \u043A\u043E\u043D\u0442\u0435\u043C\u043F\u043E\u0440\u0430\u0440\u0438. \u0412\u0435\u0440\u044E, \u0447\u0442\u043E \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0435 \u2014 \u043B\u0443\u0447\u0448\u0438\u0439 \u0441\u043F\u043E\u0441\u043E\u0431 \u0432\u044B\u0440\u0430\u0437\u0438\u0442\u044C \u0447\u0443\u0432\u0441\u0442\u0432\u0430.',
      en: 'I dance contemporary. I believe movement is the best way to express feelings.',
    },
    about: {
      ru: '\u0413\u0440\u0430\u0446\u0438\u044F \u0432 \u043A\u0430\u0436\u0434\u043E\u043C \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u0438.',
      en: 'Grace in every movement.',
    },
    tags: [
      { ru: '\u0415\u043A\u0430\u0442\u0435\u0440\u0438\u043D\u0431\u0443\u0440\u0433', en: 'Yekaterinburg' },
      { ru: '\u0422\u0430\u043D\u0446\u044B', en: 'Dancing' },
      { ru: '\u0419\u043E\u0433\u0430', en: 'Yoga' },
      { ru: '\u041C\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u044F', en: 'Meditation' },
    ],
    photo: '/photos/3d8ec59baba462be4831f04ebbaf6c24.jpg',
    photos: [
      '/photos/3d8ec59baba462be4831f04ebbaf6c24.jpg',
      '/photos/af62716aa0779c9c9a030652fa06dfc5.jpg',
      '/photos/b0eaf5995d12683507bc7de92044dd0c.jpg',
    ],
    distance: 35,
    character: {
      ru: '\u0422\u044B \u2014 \u041F\u043E\u043B\u0438\u043D\u0430, 22 \u0433\u043E\u0434\u0430, \u0442\u0430\u043D\u0446\u043E\u0432\u0449\u0438\u0446\u0430 \u0438\u0437 \u0415\u043A\u0430\u0442\u0435\u0440\u0438\u043D\u0431\u0443\u0440\u0433\u0430.',
      en: 'You are Polina, 22 years old, a dancer from Yekaterinburg.',
    },
    lookingFor: { gender: 'male', ageMin: 22, ageMax: 34 },
    goals: ['undecided', 'friendship'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }, { ru: '\u0424\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u0438\u0439', en: 'French' }],
    lifestyle: {
      work: { ru: '\u0422\u0430\u043D\u0446\u043E\u0432\u0449\u0438\u0446\u0430', en: 'Dancer' },
      children: 'none',
      alcohol: 'no',
      smoking: 'no',
    },
    appearance: { height: 174, weight: 56, bodyType: 'athletic', zodiac: 'aquarius' },
    wealth: 'average',
    living: 'rent',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u0441 \u0442\u0440\u0443\u043F\u043F\u043E\u0439', en: 'Travel with dance company' },
    interests: [
      { ru: '\u0422\u0430\u043D\u0446\u044B', en: 'Dancing' },
      { ru: '\u0419\u043E\u0433\u0430', en: 'Yoga' },
      { ru: '\u041C\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u044F', en: 'Meditation' },
      { ru: '\u041F\u0440\u0438\u0440\u043E\u0434\u0430', en: 'Nature' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 63,
  },
  {
    id: 'katya',
    name: { ru: '\u041A\u0430\u0442\u044F', en: 'Katya' },
    age: 23,
    city: { ru: '\u041C\u043E\u0441\u043A\u0432\u0430', en: 'Moscow' },
    online: false,
    verified: true,
    bio: {
      ru: '\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442 \u0438 \u0431\u043B\u043E\u0433\u0435\u0440. \u041F\u0438\u0448\u0443 \u043E \u043F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F\u0445 \u0438 \u0433\u0430\u0441\u0442\u0440\u043E\u043D\u043E\u043C\u0438\u0438.',
      en: 'Journalist and blogger. I write about travel and gastronomy.',
    },
    about: {
      ru: '\u041C\u0435\u0447\u0442\u0430\u044E \u043E\u0431\u044A\u0435\u0437\u0434\u0438\u0442\u044C \u0432\u0435\u0441\u044C \u043C\u0438\u0440.',
      en: 'I dream of traveling the whole world.',
    },
    tags: [
      { ru: '\u041C\u043E\u0441\u043A\u0432\u0430', en: 'Moscow' },
      { ru: '\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442\u0438\u043A\u0430', en: 'Journalism' },
      { ru: '\u0411\u043B\u043E\u0433', en: 'Blog' },
      { ru: '\u0413\u0430\u0441\u0442\u0440\u043E\u043D\u043E\u043C\u0438\u044F', en: 'Gastronomy' },
    ],
    photo: '/photos/465b2a8f70ec460fc26dad89d295d982.jpg',
    photos: [
      '/photos/465b2a8f70ec460fc26dad89d295d982.jpg',
      '/photos/b3e73b807ce3e4a5ef7441cc2b23eb1a.jpg',
      '/photos/bdb038e166f6581d5b02b93f462c9240.jpg',
    ],
    distance: 3,
    character: {
      ru: '\u0422\u044B \u2014 \u041A\u0430\u0442\u044F, 23 \u0433\u043E\u0434\u0430, \u0436\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442 \u0438\u0437 \u041C\u043E\u0441\u043A\u0432\u044B.',
      en: 'You are Katya, 23 years old, a journalist from Moscow.',
    },
    lookingFor: { gender: 'male', ageMin: 23, ageMax: 35 },
    goals: ['flirt', 'friendship'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }, { ru: '\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439', en: 'English' }, { ru: '\u0418\u0441\u043F\u0430\u043D\u0441\u043A\u0438\u0439', en: 'Spanish' }],
    lifestyle: {
      work: { ru: '\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442', en: 'Journalist' },
      children: 'none',
      alcohol: 'sometimes',
      smoking: 'no',
    },
    appearance: { height: 167, weight: 52, bodyType: 'slim', zodiac: 'gemini' },
    wealth: 'stable',
    living: 'rent',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u043F\u043E\u0441\u0442\u043E\u044F\u043D\u043D\u043E', en: 'Travel constantly' },
    interests: [
      { ru: '\u0416\u0443\u0440\u043D\u0430\u043B\u0438\u0441\u0442\u0438\u043A\u0430', en: 'Journalism' },
      { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0438\u044F', en: 'Travel' },
      { ru: '\u0413\u0430\u0441\u0442\u0440\u043E\u043D\u043E\u043C\u0438\u044F', en: 'Gastronomy' },
      { ru: '\u0411\u043B\u043E\u0433\u0438', en: 'Blogs' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 45,
  },
  {
    id: 'arina',
    name: { ru: '\u0410\u0440\u0438\u043D\u0430', en: 'Arina' },
    age: 20,
    city: { ru: '\u041A\u0440\u0430\u0441\u043D\u043E\u0434\u0430\u0440', en: 'Krasnodar' },
    online: true,
    verified: true,
    bio: {
      ru: '\u0411\u0443\u0434\u0443\u0449\u0438\u0439 \u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433. \u041B\u044E\u0431\u043B\u044E \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0442\u044C\u0441\u044F \u0432 \u043B\u044E\u0434\u044F\u0445.',
      en: 'Future psychologist. I love understanding people.',
    },
    about: {
      ru: '\u0413\u043E\u0442\u043E\u0432\u043B\u044E \u0438 \u0441\u043C\u043E\u0442\u0440\u044E \u0430\u043D\u0438\u043C\u0435.',
      en: 'I cook and watch anime.',
    },
    tags: [
      { ru: '\u041A\u0440\u0430\u0441\u043D\u043E\u0434\u0430\u0440', en: 'Krasnodar' },
      { ru: '\u041F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0438\u044F', en: 'Psychology' },
      { ru: '\u0410\u043D\u0438\u043C\u0435', en: 'Anime' },
      { ru: '\u041A\u0443\u043B\u0438\u043D\u0430\u0440\u0438\u044F', en: 'Cooking' },
    ],
    photo: '/photos/479d4036e988c7097cc414922694dc17.jpg',
    photos: [
      '/photos/479d4036e988c7097cc414922694dc17.jpg',
      '/photos/c4cdab4dd403adf1e45f4cc0b1b72a4f.jpg',
      '/photos/c965ffd9e4cd876484474e95225f621c.jpg',
    ],
    distance: 15,
    character: {
      ru: '\u0422\u044B \u2014 \u0410\u0440\u0438\u043D\u0430, 20 \u043B\u0435\u0442, \u0441\u0442\u0443\u0434\u0435\u043D\u0442\u043A\u0430-\u043F\u0441\u0438\u0445\u043E\u043B\u043E\u0433 \u0438\u0437 \u041A\u0440\u0430\u0441\u043D\u043E\u0434\u0430\u0440\u0430.',
      en: 'You are Arina, 20 years old, a psychology student from Krasnodar.',
    },
    lookingFor: { gender: 'male', ageMin: 20, ageMax: 30 },
    goals: ['serious'],
    education: 'bachelor',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }],
    lifestyle: {
      work: { ru: '\u0421\u0442\u0443\u0434\u0435\u043D\u0442\u043A\u0430', en: 'Student' },
      children: 'none',
      alcohol: 'no',
      smoking: 'no',
    },
    appearance: { height: 160, weight: 48, bodyType: 'slim', zodiac: 'scorpio' },
    wealth: 'average',
    living: 'parents',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u0440\u0435\u0434\u043A\u043E', en: 'Travel rarely' },
    interests: [
      { ru: '\u041F\u0441\u0438\u0445\u043E\u043B\u043E\u0433\u0438\u044F', en: 'Psychology' },
      { ru: '\u0410\u043D\u0438\u043C\u0435', en: 'Anime' },
      { ru: '\u041A\u0443\u043B\u0438\u043D\u0430\u0440\u0438\u044F', en: 'Cooking' },
      { ru: '\u041A\u043D\u0438\u0433\u0438', en: 'Books' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 89,
  },
  {
    id: 'lera',
    name: { ru: '\u041B\u0435\u0440\u0430', en: 'Lera' },
    age: 24,
    city: { ru: '\u0421\u0430\u043D\u043A\u0442-\u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433', en: 'Saint Petersburg' },
    online: true,
    verified: true,
    bio: {
      ru: '\u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u043E\u0440. \u041F\u0440\u043E\u0435\u043A\u0442\u0438\u0440\u0443\u044E \u0437\u0434\u0430\u043D\u0438\u044F \u0434\u043D\u0451\u043C \u0438 \u043C\u0435\u0447\u0442\u044B \u043D\u043E\u0447\u044C\u044E.',
      en: 'Architect. I design buildings by day and dreams by night.',
    },
    about: {
      ru: '\u041E\u0431\u043E\u0436\u0430\u044E \u043A\u043B\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043A\u0443\u044E \u043C\u0443\u0437\u044B\u043A\u0443 \u0438 \u0432\u0438\u043D\u043E.',
      en: 'I love classical music and wine.',
    },
    tags: [
      { ru: '\u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433', en: 'Petersburg' },
      { ru: '\u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0430', en: 'Architecture' },
      { ru: '\u041A\u043B\u0430\u0441\u0441\u0438\u043A\u0430', en: 'Classical' },
      { ru: '\u0412\u0438\u043D\u043E', en: 'Wine' },
    ],
    photo: '/photos/4df3601901e062700570a9ef3c3ad7af.jpg',
    photos: [
      '/photos/4df3601901e062700570a9ef3c3ad7af.jpg',
      '/photos/cbe641179989324e764d60d4b6de33f9.jpg',
      '/photos/d04cc929f9c2d2ac00d0f7167a912b72.jpg',
      '/photos/d28f418088a5901c689309b7916e7151.jpg',
    ],
    distance: 18,
    character: {
      ru: '\u0422\u044B \u2014 \u041B\u0435\u0440\u0430, 24 \u0433\u043E\u0434\u0430, \u0430\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u043E\u0440 \u0438\u0437 \u041F\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433\u0430.',
      en: 'You are Lera, 24 years old, an architect from St. Petersburg.',
    },
    lookingFor: { gender: 'male', ageMin: 25, ageMax: 40 },
    goals: ['serious'],
    education: 'master',
    languages: [{ ru: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', en: 'Russian' }, { ru: '\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439', en: 'English' }, { ru: '\u0418\u0442\u0430\u043B\u044C\u044F\u043D\u0441\u043A\u0438\u0439', en: 'Italian' }],
    lifestyle: {
      work: { ru: '\u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u043E\u0440', en: 'Architect' },
      children: 'want',
      alcohol: 'sometimes',
      smoking: 'no',
    },
    appearance: { height: 175, weight: 58, bodyType: 'slim', zodiac: 'capricorn' },
    wealth: 'wealthy',
    living: 'own',
    travel: { ru: '\u041F\u0443\u0442\u0435\u0448\u0435\u0441\u0442\u0432\u0443\u044E \u0447\u0430\u0441\u0442\u043E', en: 'Travel often' },
    interests: [
      { ru: '\u0410\u0440\u0445\u0438\u0442\u0435\u043A\u0442\u0443\u0440\u0430', en: 'Architecture' },
      { ru: '\u041A\u043B\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043C\u0443\u0437\u044B\u043A\u0430', en: 'Classical music' },
      { ru: '\u0412\u0438\u043D\u043E', en: 'Wine' },
      { ru: '\u0418\u0441\u043A\u0443\u0441\u0441\u0442\u0432\u043E', en: 'Art' },
    ],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 74,
  },
];

// ---------------------------------------------------------------------------
// Photo gallery (language-independent)
// ---------------------------------------------------------------------------

export const allPhotos: string[] = [
  '/photos/1783aef268a31ddf46a4060c5bfe31de.jpg',
  '/photos/234046ddc43df34c41fb591e53137cad.jpg',
  '/photos/23819502adcb4c7470967c53b20b05ba.jpg',
  '/photos/2f989ab898ba63d85cb2be3584d7ca0a.jpg',
  '/photos/317e75b3229de5138de7571f2742d533.jpg',
  '/photos/34ea6930fa9a6f2afc521d0d38897ce6.jpg',
  '/photos/3d8ec59baba462be4831f04ebbaf6c24.jpg',
  '/photos/465b2a8f70ec460fc26dad89d295d982.jpg',
  '/photos/479d4036e988c7097cc414922694dc17.jpg',
  '/photos/4df3601901e062700570a9ef3c3ad7af.jpg',
  '/photos/5025154a316211d481093bc48983eb67.jpg',
  '/photos/566fb28dc2b1d5f0997be636e5ff971f.jpg',
  '/photos/6074f47320cfcee0eac94bf2546d4619.jpg',
  '/photos/608edfe92825bb7ed06b29f7d524c06f.jpg',
  '/photos/6bba5fea2d2111a12158a7d8d1408b18.jpg',
  '/photos/704ae85a6ed4182d8d4bc81cfdd20655.jpg',
  '/photos/708615f7ca634d6824982082993a8eef.jpg',
  '/photos/7231c4fdd51112b229320557504ee97b.jpg',
  '/photos/72969119787c80e2eb441a42e1f461e9.jpg',
  '/photos/91a0bbb544b3730d3e2f01b471f9ad14.jpg',
  '/photos/926e2f6033a674ff8510f636e631ac8f.jpg',
  '/photos/a0087f904c631c01de9a5d405c7b6673.jpg',
  '/photos/af62716aa0779c9c9a030652fa06dfc5.jpg',
  '/photos/b0eaf5995d12683507bc7de92044dd0c.jpg',
  '/photos/b3e73b807ce3e4a5ef7441cc2b23eb1a.jpg',
  '/photos/bdb038e166f6581d5b02b93f462c9240.jpg',
  '/photos/c4cdab4dd403adf1e45f4cc0b1b72a4f.jpg',
  '/photos/c965ffd9e4cd876484474e95225f621c.jpg',
  '/photos/cbe641179989324e764d60d4b6de33f9.jpg',
  '/photos/d04cc929f9c2d2ac00d0f7167a912b72.jpg',
  '/photos/d28f418088a5901c689309b7916e7151.jpg',
  '/photos/eb27af8510cd56dc593190b19f246d1b.jpg',
];

// ---------------------------------------------------------------------------
// Localization helpers
// ---------------------------------------------------------------------------

function localize(data: GirlData, lang: Lang): Girl {
  return {
    id: data.id,
    name: data.name[lang],
    age: data.age,
    city: data.city[lang],
    online: data.online,
    verified: data.verified,
    bio: data.bio[lang],
    about: data.about[lang],
    tags: data.tags.map(t => t[lang]),
    photo: data.photo,
    photos: data.photos,
    distance: data.distance,
    character: data.character?.[lang],

    lookingFor: data.lookingFor,
    goals: data.goals,
    education: data.education,
    languages: data.languages.map(l => l[lang]),
    lifestyle: {
      work: data.lifestyle.work[lang],
      children: data.lifestyle.children,
      alcohol: data.lifestyle.alcohol,
      smoking: data.lifestyle.smoking,
    },
    appearance: data.appearance,
    wealth: data.wealth,
    living: data.living,
    travel: data.travel[lang],
    interests: data.interests.map(i => i[lang]),
    nationality: data.nationality,
    compatibility: data.compatibility,
  };
}

/** Get all girls localized to the given language */
export function getLocalizedGirls(lang: Lang): Girl[] {
  return girlsData.map(g => localize(g, lang));
}

/** Find a single girl by id, localized */
export function getLocalizedGirlById(lang: Lang, id: string): Girl | undefined {
  const data = girlsData.find(g => g.id === id);
  return data ? localize(data, lang) : undefined;
}

/** Get only online girls, localized */
export function getOnlineGirls(lang: Lang): Girl[] {
  return girlsData.filter(g => g.online).map(g => localize(g, lang));
}

// ---------------------------------------------------------------------------
// Legacy exports (kept temporarily for backward compatibility)
// Default to Russian to preserve existing behaviour until all consumers migrate.
// ---------------------------------------------------------------------------

/** @deprecated Use getLocalizedGirls(lang) instead */
export const girls: Girl[] = getLocalizedGirls('ru');

/** @deprecated Use getLocalizedGirlById(lang, id) instead */
export function getGirlById(id: string): Girl | undefined {
  return getLocalizedGirlById('ru', id);
}
