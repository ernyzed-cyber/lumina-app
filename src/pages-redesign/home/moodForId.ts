/**
 * Stable per-id mood mapping shared across Memories Timeline and Chat letters.
 *
 * The hash MUST stay byte-identical across consumers — same `id` → same mood
 * — so a memory and its companion-letter glow with the same accent tint.
 *
 * Extracted from `memories/Timeline.tsx` in Stage 7 / Phase 2.
 */

import type { CompanionMood } from './types';

export const moodOrder: CompanionMood[] = [
  'thoughtful',
  'warm',
  'playful',
  'missing-you',
  'quiet',
  'tender',
  'curious',
];

/** Stable per-id mood index — used to tint each card / letter accent. */
export function moodForId(id: string): CompanionMood {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return moodOrder[h % moodOrder.length];
}

/** Mood → rgba tint string. Used as `--mood-tint` CSS var. */
export function moodTint(mood: CompanionMood, alpha = 0.9): string {
  switch (mood) {
    case 'warm':
      return `rgba(251, 146, 60, ${alpha})`;
    case 'playful':
      return `rgba(236, 72, 153, ${alpha})`;
    case 'missing-you':
      return `rgba(124, 58, 237, ${alpha})`;
    case 'quiet':
      return `rgba(148, 163, 184, ${alpha})`;
    case 'tender':
      return `rgba(249, 168, 212, ${alpha})`;
    case 'curious':
      return `rgba(34, 211, 238, ${alpha})`;
    case 'thoughtful':
    default:
      return `rgba(139, 92, 246, ${alpha})`;
  }
}
