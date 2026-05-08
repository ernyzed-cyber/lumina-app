export type CompanionMood =
  | 'thoughtful'
  | 'warm'
  | 'playful'
  | 'missing-you'
  | 'quiet'
  | 'tender'
  | 'curious';

export type MemoryContext = {
  /** Mock — fragment of conversation just before this memory. */
  beforeKey?: string;
  /** Mock — fragment just after. */
  afterKey?: string;
};

export type MemoryQuote = {
  kind: 'quote';
  id: string;
  text: string;
  i18nKey?: string;
  attributionTs: number;
  context?: MemoryContext;
};

export type MemoryMilestone = {
  kind: 'milestone';
  id: string;
  titleKey: string;
  subtitleKey?: string;
  icon: 'sparkle' | 'heart' | 'star' | 'moon';
  achievedTs: number;
  context?: MemoryContext;
};

export type MemoryCard = MemoryQuote | MemoryMilestone;

export type CompanionHomeState = {
  companionId: string;
  name: string;
  portrait: string;
  mood: CompanionMood;
  moodLineKey: string;
  memories: MemoryCard[];
};
