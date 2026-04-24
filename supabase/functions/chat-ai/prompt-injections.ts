export interface GiftMemoryRow {
  summary: string;
  gift_ref: string;
  intimacy_weight: number;
  created_at: string;
}

export function buildIntimacyBlock(level: number, lang: 'ru' | 'en'): string {
  const rounded = Math.round(level * 10) / 10;
  if (lang === 'en') {
    if (level >= 8) return `[INTIMACY LEVEL: ${rounded} — you may be explicit, intimate, sexual when context invites]`;
    if (level >= 5) return `[INTIMACY LEVEL: ${rounded} — flirty, teasing, suggestive hints allowed]`;
    return `[INTIMACY LEVEL: ${rounded} — warm and friendly; no sexual content]`;
  }
  // ru
  if (level >= 8) return `[INTIMACY LEVEL: ${rounded} — можешь быть откровенной, интимной, сексуальной когда контекст уместен]`;
  if (level >= 5) return `[INTIMACY LEVEL: ${rounded} — можешь флиртовать, дразнить, делать намёки]`;
  return `[INTIMACY LEVEL: ${rounded} — дружелюбно и тепло, без сексуального контекста]`;
}

export function buildGiftMemoriesBlock(rows: GiftMemoryRow[], lang: 'ru' | 'en'): string {
  if (rows.length === 0) return '';
  const header = lang === 'en'
    ? '[SHE REMEMBERS GIFTS FROM HIM, reference them naturally over days]'
    : '[SHE REMEMBERS GIFTS FROM HIM, ссылайся органически через дни]';
  const bullets = rows.slice(0, 5).map((r) => `- ${r.summary}`).join('\n');
  return `${header}\n${bullets}`;
}

const SCENE_CUES: Record<string, { ru: string; en: string }> = {
  first_night: {
    ru: '[SCENE: после ужина первая ночь вместе — будь тёплой, близкой, не описывай технически]',
    en: '[SCENE: first night together after dinner — be warm, intimate, not clinical]',
  },
  weekend_away: {
    ru: '[SCENE: выходные вдвоём на море/в отеле — расслабленность, близость]',
    en: '[SCENE: weekend getaway together — relaxed, close]',
  },
  long_trip: {
    ru: '[SCENE: большое путешествие вдвоём — преображающий опыт]',
    en: '[SCENE: a long trip together — transformative]',
  },
};

export function buildSceneDirectiveBlock(sceneId: string | null, lang: 'ru' | 'en'): string {
  if (!sceneId) return '';
  const cue = SCENE_CUES[sceneId];
  if (!cue) return '';
  return lang === 'en' ? cue.en : cue.ru;
}
