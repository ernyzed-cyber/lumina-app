/**
 * Preview mocks — фейковые данные для redesign-страниц в /__preview.
 *
 * Эти моки НЕ зависят от Supabase, AssignmentProvider, useAuth и других
 * production-сервисов. Это позволяет смотреть новые экраны изолированно
 * и без авторизации.
 *
 * Когда страница промоутится в production — она начинает использовать
 * реальные хуки (useAssignment, useMyProfile, и т.д.). На этапе preview
 * мы просто прокидываем эти моки props'ами.
 */

import type { Girl } from '../data/girls';

// ──────────────────────────────────────────────────────────────────
// Девушки — 5 разнообразных профилей для всех redesign-сценариев
// ──────────────────────────────────────────────────────────────────
export const mockGirls: Girl[] = [
  {
    id: 'mock-sofia',
    name: 'София',
    age: 23,
    city: 'Москва',
    online: true,
    verified: true,
    bio: 'Романтик с холодным умом. Люблю джаз, дождь и долгие разговоры.',
    about: 'Ищу настоящую близость. Не свайпы, не интрижки.',
    tags: ['Москва', 'Джаз', 'Книги', 'Кофе'],
    photo: '/placeholder-girl-1.jpg',
    photos: [
      '/placeholder-girl-1.jpg',
      '/placeholder-girl-2.jpg',
      '/placeholder-girl-3.jpg',
    ],
    distance: 2,
    character: 'Романтичная, вдумчивая, верная.',
    lookingFor: { gender: 'male', ageMin: 24, ageMax: 38 },
    goals: ['serious'],
    education: 'master',
    languages: ['Русский', 'Английский', 'Французский'],
    lifestyle: {
      work: 'Куратор галереи',
      children: 'none',
      alcohol: 'sometimes',
      smoking: 'no',
    },
    appearance: { height: 170, weight: 55, bodyType: 'slim', zodiac: 'libra' },
    wealth: 'average',
    living: 'rent',
    travel: 'Париж — мой второй дом',
    interests: ['Джаз', 'Литература', 'Архитектура', 'Винил'],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 87,
    sleepSchedule: { start: 23, end: 8, timezone: 'Europe/Moscow' },
  },
  {
    id: 'mock-alina',
    name: 'Алина',
    age: 22,
    city: 'Санкт-Петербург',
    online: false,
    verified: true,
    bio: 'Дизайнер, фотограф, мечтатель.',
    about: 'Поменьше слов, побольше цветов.',
    tags: ['Питер', 'Фото', 'Искусство'],
    photo: '/placeholder-girl-2.jpg',
    photos: ['/placeholder-girl-2.jpg', '/placeholder-girl-1.jpg'],
    distance: 5,
    character: 'Творческая, задумчивая.',
    lookingFor: { gender: 'male', ageMin: 22, ageMax: 35 },
    goals: ['serious', 'friendship'],
    education: 'bachelor',
    languages: ['Русский', 'Английский'],
    lifestyle: { work: 'Дизайнер', children: 'none', alcohol: 'sometimes', smoking: 'no' },
    appearance: { height: 168, weight: 53, bodyType: 'slim', zodiac: 'pisces' },
    wealth: 'average',
    living: 'rent',
    travel: 'Люблю северные страны',
    interests: ['Фотография', 'Рисование', 'Кино'],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 74,
    sleepSchedule: { start: 0, end: 9, timezone: 'Europe/Moscow' },
  },
  {
    id: 'mock-nika',
    name: 'Ника',
    age: 25,
    city: 'Казань',
    online: true,
    verified: false,
    bio: 'Спорт, йога, путешествия. Ищу партнёра по жизни.',
    about: 'Жизнь короткая — давай делать её насыщенной.',
    tags: ['Казань', 'Спорт', 'Йога'],
    photo: '/placeholder-girl-3.jpg',
    photos: ['/placeholder-girl-3.jpg'],
    distance: 12,
    character: 'Энергичная, целеустремлённая.',
    lookingFor: { gender: 'male', ageMin: 25, ageMax: 40 },
    goals: ['serious'],
    education: 'master',
    languages: ['Русский', 'Английский', 'Татарский'],
    lifestyle: { work: 'Тренер', children: 'want', alcohol: 'no', smoking: 'no' },
    appearance: { height: 172, weight: 58, bodyType: 'athletic', zodiac: 'leo' },
    wealth: 'wealthy',
    living: 'own',
    travel: 'Бали, Грузия',
    interests: ['Йога', 'Бег', 'Путешествия'],
    nationality: '\uD83C\uDDF7\uD83C\uDDFA',
    compatibility: 65,
    sleepSchedule: { start: 22, end: 6, timezone: 'Europe/Moscow' },
  },
  {
    id: 'mock-mia',
    name: 'Мия',
    age: 24,
    city: 'Лондон',
    online: true,
    verified: true,
    bio: 'Born in St.Petersburg, living in London. Music is my language.',
    about: 'Looking for someone with depth.',
    tags: ['London', 'Music', 'Travel'],
    photo: '/placeholder-girl-4.jpg',
    photos: ['/placeholder-girl-4.jpg', '/placeholder-girl-1.jpg', '/placeholder-girl-2.jpg', '/placeholder-girl-3.jpg'],
    distance: 1840,
    character: 'Глубокая, музыкальная.',
    lookingFor: { gender: 'male', ageMin: 26, ageMax: 38 },
    goals: ['serious', 'flirt'],
    education: 'master',
    languages: ['Русский', 'Английский'],
    lifestyle: { work: 'Музыкант', children: 'none', alcohol: 'sometimes', smoking: 'sometimes' },
    appearance: { height: 174, weight: 56, bodyType: 'slim', zodiac: 'aquarius' },
    wealth: 'wealthy',
    living: 'rent',
    travel: 'Весь мир',
    interests: ['Музыка', 'Винил', 'Путешествия'],
    nationality: '\uD83C\uDDEC\uD83C\uDDE7',
    compatibility: 91,
    sleepSchedule: { start: 1, end: 10, timezone: 'Europe/London' },
  },
  {
    id: 'mock-vera',
    name: 'Вера',
    age: 21,
    city: 'Минск',
    online: false,
    verified: true,
    bio: 'Студентка-психолог. Книги, прогулки, разговоры до утра.',
    about: 'Главное — это разговоры.',
    tags: ['Минск', 'Психология', 'Книги'],
    photo: '/placeholder-girl-5.jpg',
    photos: ['/placeholder-girl-5.jpg', '/placeholder-girl-2.jpg'],
    distance: 720,
    character: 'Заботливая, вдумчивая.',
    lookingFor: { gender: 'male', ageMin: 21, ageMax: 30 },
    goals: ['serious', 'friendship'],
    education: 'bachelor',
    languages: ['Русский', 'Белорусский', 'Английский'],
    lifestyle: { work: 'Студентка', children: 'want', alcohol: 'no', smoking: 'no' },
    appearance: { height: 165, weight: 50, bodyType: 'slim', zodiac: 'cancer' },
    wealth: 'average',
    living: 'parents',
    travel: 'Пока только мечтаю',
    interests: ['Психология', 'Чтение', 'Кофе'],
    nationality: '\uD83C\uDDE7\uD83C\uDDFE',
    compatibility: 82,
    sleepSchedule: { start: 23, end: 7, timezone: 'Europe/Minsk' },
  },
];

// ──────────────────────────────────────────────────────────────────
// Текущий юзер (для Profile, Settings, header avatar)
// ──────────────────────────────────────────────────────────────────
export const mockUser = {
  id: 'mock-user-id',
  email: 'user@example.com',
  name: 'Дмитрий',
  age: 28,
  city: 'Москва',
  gender: 'male' as 'male' | 'female',
  about: 'Ищу настоящую близость. Не свайпы, не интрижки.',
  photo: '/placeholder-user.jpg',
  starsBalance: 250,
  profileCompletion: 60,
  unreadNotifications: 3,
  unreadMessages: 1,
};

// ──────────────────────────────────────────────────────────────────
// Сообщения чата (для Chat preview)
// ──────────────────────────────────────────────────────────────────
export type MockMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number; // unix ms
};

export const mockMessages: MockMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    text: 'Привет :) Как твой день?',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 'm2',
    role: 'user',
    text: 'Привет! Только закончил работу. У тебя как?',
    timestamp: Date.now() - 1000 * 60 * 60 * 2.5,
  },
  {
    id: 'm3',
    role: 'assistant',
    text: 'Я весь день думала о вчерашнем разговоре про джаз. Хочу спросить — ты слушал когда-нибудь Чета Бейкера?',
    timestamp: Date.now() - 1000 * 60 * 60 * 2.4,
  },
  {
    id: 'm4',
    role: 'user',
    text: 'Слушал, и даже на виниле есть. Ты?',
    timestamp: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'm5',
    role: 'assistant',
    text: 'Серьёзно? У меня есть его «Chet Baker Sings», но винила, к сожалению, нет — только на стриминге. Зайдёшь как-нибудь, послушаем вместе? 🎷',
    timestamp: Date.now() - 1000 * 60 * 28,
  },
];

// ──────────────────────────────────────────────────────────────────
// Уведомления (для Notifications preview)
// ──────────────────────────────────────────────────────────────────
export type MockNotification = {
  id: string;
  type: 'message' | 'like' | 'gift' | 'girl_left' | 'waitlist_ready' | 'view';
  title: string;
  body: string;
  girlAvatar?: string;
  girlName?: string;
  read: boolean;
  timestamp: number;
};

export const mockNotifications: MockNotification[] = [
  {
    id: 'n1',
    type: 'message',
    title: 'София',
    body: 'написала тебе сообщение',
    girlAvatar: '/placeholder-girl-1.jpg',
    girlName: 'София',
    read: false,
    timestamp: Date.now() - 1000 * 60 * 5,
  },
  {
    id: 'n2',
    type: 'gift',
    title: 'Подарок отправлен',
    body: 'Алина получила твой букет 💐',
    girlAvatar: '/placeholder-girl-2.jpg',
    girlName: 'Алина',
    read: false,
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'n3',
    type: 'waitlist_ready',
    title: 'Девушка ждёт тебя!',
    body: 'Освободилось место — загляни в ленту',
    read: false,
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: 'n4',
    type: 'like',
    title: 'Ника',
    body: 'обратила на тебя внимание',
    girlAvatar: '/placeholder-girl-3.jpg',
    girlName: 'Ника',
    read: true,
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
  },
];

// ──────────────────────────────────────────────────────────────────
// Star packs (для Shop preview)
// ──────────────────────────────────────────────────────────────────
export type MockStarPack = {
  id: string;
  stars: number;
  priceUsd: number;
  priceTgStars: number;
  badge?: 'popular' | 'best';
};

export const mockStarPacks: MockStarPack[] = [
  { id: 's1', stars: 100, priceUsd: 1.99, priceTgStars: 100 },
  { id: 's2', stars: 550, priceUsd: 9.99, priceTgStars: 500, badge: 'popular' },
  { id: 's3', stars: 2400, priceUsd: 39.99, priceTgStars: 2000, badge: 'best' },
  { id: 's4', stars: 13000, priceUsd: 199, priceTgStars: 10000 },
];
