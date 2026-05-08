import type { CompanionMood } from './types';

export type AuroraPalette = [string, string, string, string];

export const moodPalettes: Record<CompanionMood, AuroraPalette> = {
  thoughtful: [
    'rgba(99, 102, 241, 0.52)',
    'rgba(139, 92, 246, 0.46)',
    'rgba(167, 139, 250, 0.42)',
    'rgba(49, 46, 129, 0.48)',
  ],
  warm: [
    'rgba(251, 146, 60, 0.48)',
    'rgba(244, 114, 182, 0.46)',
    'rgba(251, 191, 36, 0.36)',
    'rgba(124, 45, 18, 0.42)',
  ],
  playful: [
    'rgba(168, 85, 247, 0.52)',
    'rgba(236, 72, 153, 0.48)',
    'rgba(240, 171, 252, 0.38)',
    'rgba(88, 28, 135, 0.46)',
  ],
  'missing-you': [
    'rgba(124, 58, 237, 0.50)',
    'rgba(59, 130, 246, 0.42)',
    'rgba(167, 139, 250, 0.40)',
    'rgba(30, 27, 75, 0.50)',
  ],
  quiet: [
    'rgba(100, 116, 139, 0.40)',
    'rgba(71, 85, 105, 0.38)',
    'rgba(148, 163, 184, 0.34)',
    'rgba(30, 41, 59, 0.48)',
  ],
  tender: [
    'rgba(249, 168, 212, 0.44)',
    'rgba(251, 207, 232, 0.34)',
    'rgba(196, 181, 253, 0.42)',
    'rgba(131, 24, 67, 0.42)',
  ],
  curious: [
    'rgba(34, 211, 238, 0.38)',
    'rgba(167, 139, 250, 0.44)',
    'rgba(103, 232, 249, 0.30)',
    'rgba(14, 116, 144, 0.44)',
  ],
};
