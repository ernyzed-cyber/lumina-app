/**
 * Chat (redesign / Stage 7) — mock 14-message conversation.
 *
 * Two days, no virtualization needed. Used only on `/__preview/chat`.
 *
 * Pattern:
 *   - Yesterday 20:14 → 22:41 (8 messages, evening fragment).
 *   - Today 09:22 → 18:33 (6 messages, woven through the day).
 *   - m10 (you, today 11:08) is a gift-as-message: short caption + bouquet disk.
 *   - m04 is the long-rule case: her, > 120 chars, triggers smaller letter size.
 *
 * Timestamps are computed relative to a fixed "now" so the conversation always
 * spans yesterday + today regardless of when the preview is opened. The fixed
 * anchor is the millisecond at 20:00 today, which is then walked backward and
 * forward through the message arc.
 */

import type { ChatMessage } from './types';

/** Build a millisecond timestamp at (now's date - daysAgo, hh:mm local). */
function at(now: Date, daysAgo: number, hh: number, mm: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  return d.getTime();
}

/**
 * Mock 14-message conversation. Pass a stable `now` (e.g. `Date.now()` once at
 * mount) so React doesn't re-shuffle timestamps every render.
 */
export function getMockConversation(now: number = Date.now()): ChatMessage[] {
  const today = new Date(now);

  return [
    // ── Yesterday evening ──────────────────────────────────────────────
    {
      id: 'm01',
      speaker: 'her',
      ts: at(today, 1, 20, 14),
      textKey: 'landing.redesign.chatPage.mock.m01',
    },
    {
      id: 'm02',
      speaker: 'you',
      ts: at(today, 1, 20, 19),
      textKey: 'landing.redesign.chatPage.mock.m02',
    },
    {
      id: 'm03',
      speaker: 'you',
      ts: at(today, 1, 20, 20),
      textKey: 'landing.redesign.chatPage.mock.m03',
    },
    {
      id: 'm04',
      speaker: 'her',
      ts: at(today, 1, 20, 32),
      // > 120 chars — triggers .letterLong size step.
      textKey: 'landing.redesign.chatPage.mock.m04',
    },
    {
      id: 'm05',
      speaker: 'you',
      ts: at(today, 1, 21, 4),
      textKey: 'landing.redesign.chatPage.mock.m05',
    },
    {
      id: 'm06',
      speaker: 'her',
      ts: at(today, 1, 21, 11),
      textKey: 'landing.redesign.chatPage.mock.m06',
    },
    {
      id: 'm07',
      speaker: 'her',
      ts: at(today, 1, 21, 12),
      textKey: 'landing.redesign.chatPage.mock.m07',
    },
    {
      id: 'm08',
      speaker: 'you',
      ts: at(today, 1, 22, 41),
      textKey: 'landing.redesign.chatPage.mock.m08',
    },

    // ── Today (≥ 1h gap from m08 → renders centered "·" divider) ───────
    {
      id: 'm09',
      speaker: 'her',
      ts: at(today, 0, 9, 22),
      textKey: 'landing.redesign.chatPage.mock.m09',
    },
    {
      id: 'm10',
      speaker: 'you',
      ts: at(today, 0, 11, 8),
      textKey: 'landing.redesign.chatPage.mock.m10',
      gift: { kind: 'bouquet', stars: 150 },
    },
    {
      id: 'm11',
      speaker: 'her',
      ts: at(today, 0, 11, 17),
      textKey: 'landing.redesign.chatPage.mock.m11',
    },
    {
      id: 'm12',
      speaker: 'her',
      ts: at(today, 0, 14, 3),
      textKey: 'landing.redesign.chatPage.mock.m12',
    },
    {
      id: 'm13',
      speaker: 'you',
      ts: at(today, 0, 17, 56),
      textKey: 'landing.redesign.chatPage.mock.m13',
    },
    {
      id: 'm14',
      speaker: 'her',
      ts: at(today, 0, 18, 33),
      textKey: 'landing.redesign.chatPage.mock.m14',
    },
  ];
}
