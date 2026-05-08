/**
 * Chat (redesign / Stage 7) — message model.
 *
 * Static-only types for the letter-tone preview. NOT a port of prod
 * `src/pages/Chat.tsx` types — we don't carry `pendingReply`, `cooldownUntil`,
 * `failureKind`, etc. Just enough shape for layout & visual review.
 *
 * Speaker:
 *   'her' — italic display, mood-tinted side rule, left-aligned full width.
 *   'you' — quiet sans muted, right-aligned, max-width 60%.
 *
 * Inline texts (mock-only) opt out of i18n by prefixing `__inline:` to the
 * `textKey`. Letter / DayDivider read this prefix and use the literal value.
 */

export type Speaker = 'her' | 'you';

export type ChatMessage = {
  /** Stable id used for `moodForId` hash + React key. Keep stable across renders. */
  id: string;
  speaker: Speaker;
  /** Unix ms timestamp for day grouping + hover-only hh:mm display. */
  ts: number;
  /**
   * i18n key OR `__inline:literal text` for mock content that must not be
   * translated through the i18n table (e.g. user replies).
   * Phase 3 Letter component resolves this via useLanguage().
   */
  textKey: string;
  /**
   * Optional inline gift attachment ("you sent her flower"). Renders as a
   * mono-glass disk with the gift icon + italic caption underneath the text,
   * inside the same message turn — never as a separate turn.
   */
  gift?: ChatGift;
};

export type ChatGiftKind =
  | 'rose'
  | 'bouquet'
  | 'chocolate'
  | 'teddy'
  | 'perfume'
  | 'ring'
  | 'necklace'
  | 'earrings'
  | 'date_coffee'
  | 'date_dinner'
  | 'date_cinema'
  | 'date_concert'
  | 'travel_weekend'
  | 'travel_trip';

export type ChatGift = {
  kind: ChatGiftKind;
  /** Stars price displayed next to the disk in the gift sheet only. */
  stars: number;
};
