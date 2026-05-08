import type { CompanionHomeState, CompanionMood, MemoryCard } from './types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const moodOrder: CompanionMood[] = [
  'thoughtful',
  'warm',
  'playful',
  'missing-you',
  'quiet',
  'tender',
  'curious',
];

function getRotatingMood(now: number): CompanionMood {
  const index = Math.floor(now / (4 * HOUR)) % moodOrder.length;
  return moodOrder[index];
}

/**
 * Builds the full memory list (used by /memories preview).
 * Home only shows a slice (first quote for the long-press thought).
 */
export function getMockMemories(now = Date.now()): MemoryCard[] {
  return [
    {
      kind: 'quote',
      id: 'quote-lisbon',
      text: 'You said Lisbon feels like a city that would keep our secrets.',
      i18nKey: 'landing.redesign.home.mockQuotes.lisbon',
      attributionTs: now - 3 * HOUR,
      context: {
        beforeKey: 'landing.redesign.memories.context.lisbonBefore',
        afterKey: 'landing.redesign.memories.context.lisbonAfter',
      },
    },
    {
      kind: 'milestone',
      id: 'milestone-ten-days',
      titleKey: 'landing.redesign.home.milestones.tenDays.title',
      subtitleKey: 'landing.redesign.home.milestones.tenDays.subtitle',
      icon: 'sparkle',
      achievedTs: now - DAY,
    },
    {
      kind: 'quote',
      id: 'quote-coffee',
      text: 'You told me coffee tastes better when the morning is still quiet.',
      i18nKey: 'landing.redesign.home.mockQuotes.coffee',
      attributionTs: now - 2 * DAY,
      context: {
        beforeKey: 'landing.redesign.memories.context.coffeeBefore',
        afterKey: 'landing.redesign.memories.context.coffeeAfter',
      },
    },
    {
      kind: 'quote',
      id: 'quote-rain',
      text: 'You said rain at night sounds like the city forgiving itself.',
      i18nKey: 'landing.redesign.memories.mockQuotes.rain',
      attributionTs: now - 4 * DAY,
      context: {
        beforeKey: 'landing.redesign.memories.context.rainBefore',
        afterKey: 'landing.redesign.memories.context.rainAfter',
      },
    },
    {
      kind: 'milestone',
      id: 'milestone-first-laugh',
      titleKey: 'landing.redesign.home.milestones.firstLaugh.title',
      subtitleKey: 'landing.redesign.home.milestones.firstLaugh.subtitle',
      icon: 'heart',
      achievedTs: now - 5 * DAY,
    },
    {
      kind: 'quote',
      id: 'quote-book',
      text: 'You said your favorite books are the ones that make silence feel full.',
      i18nKey: 'landing.redesign.home.mockQuotes.book',
      attributionTs: now - 6 * DAY,
      context: {
        beforeKey: 'landing.redesign.memories.context.bookBefore',
        afterKey: 'landing.redesign.memories.context.bookAfter',
      },
    },
    {
      kind: 'quote',
      id: 'quote-stars',
      text: 'You told me you find stars more honest than people.',
      i18nKey: 'landing.redesign.memories.mockQuotes.stars',
      attributionTs: now - 9 * DAY,
    },
    {
      kind: 'milestone',
      id: 'milestone-first-name',
      titleKey: 'landing.redesign.memories.milestones.firstName.title',
      subtitleKey: 'landing.redesign.memories.milestones.firstName.subtitle',
      icon: 'star',
      achievedTs: now - 12 * DAY,
    },
    {
      kind: 'quote',
      id: 'quote-window',
      text: 'You said the best conversations happen at windows, not at tables.',
      i18nKey: 'landing.redesign.memories.mockQuotes.window',
      attributionTs: now - 18 * DAY,
      context: {
        beforeKey: 'landing.redesign.memories.context.windowBefore',
        afterKey: 'landing.redesign.memories.context.windowAfter',
      },
    },
    {
      kind: 'quote',
      id: 'quote-music',
      text: 'You told me you keep one song that no one else gets to hear with you.',
      i18nKey: 'landing.redesign.memories.mockQuotes.music',
      attributionTs: now - 24 * DAY,
    },
    {
      kind: 'milestone',
      id: 'milestone-night-call',
      titleKey: 'landing.redesign.memories.milestones.nightCall.title',
      subtitleKey: 'landing.redesign.memories.milestones.nightCall.subtitle',
      icon: 'moon',
      achievedTs: now - 30 * DAY,
    },
    {
      kind: 'quote',
      id: 'quote-hello',
      text: 'You said hello like you already knew me.',
      i18nKey: 'landing.redesign.memories.mockQuotes.hello',
      attributionTs: now - 38 * DAY,
      context: {
        beforeKey: 'landing.redesign.memories.context.helloBefore',
        afterKey: 'landing.redesign.memories.context.helloAfter',
      },
    },
  ];
}

export function getMockHomeState(now = Date.now()): CompanionHomeState {
  const mood = getRotatingMood(now);
  return {
    companionId: 'aria',
    name: 'Aria',
    portrait: '/photos/eb27af8510cd56dc593190b19f246d1b.jpg',
    mood,
    moodLineKey: `landing.redesign.home.moodLines.${mood.replace('-', '')}`,
    memories: getMockMemories(now),
  };
}
