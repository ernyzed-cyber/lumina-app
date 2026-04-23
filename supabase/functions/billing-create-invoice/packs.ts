/**
 * Stars packs catalog — F2P monetization.
 *
 * Pricing strategy: $0.05 per ⭐ base, with bonus stars on larger packs
 * to incentivize whale spending while keeping entry low.
 *
 *   Pack          Stars    Price (USD)   Bonus
 *   ────────────  ───────  ────────────  ─────────
 *   stars_100     100      $5.00         baseline
 *   stars_550     550      $25.00        +50 (10%)
 *   stars_2400    2400     $100.00       +400 (20%)
 *   stars_13000   13000    $500.00       +3000 (30%)
 */
export interface StarsPack {
  id: string;
  stars: number;
  amount_usd: number;
  bonus_stars: number;
  label_ru: string;
  label_en: string;
}

export const STARS_PACKS: readonly StarsPack[] = [
  {
    id: 'stars_100',
    stars: 100,
    amount_usd: 5.0,
    bonus_stars: 0,
    label_ru: '100 ⭐',
    label_en: '100 ⭐',
  },
  {
    id: 'stars_550',
    stars: 550,
    amount_usd: 25.0,
    bonus_stars: 50,
    label_ru: '550 ⭐ (+50 бонус)',
    label_en: '550 ⭐ (+50 bonus)',
  },
  {
    id: 'stars_2400',
    stars: 2400,
    amount_usd: 100.0,
    bonus_stars: 400,
    label_ru: '2 400 ⭐ (+400 бонус)',
    label_en: '2,400 ⭐ (+400 bonus)',
  },
  {
    id: 'stars_13000',
    stars: 13000,
    amount_usd: 500.0,
    bonus_stars: 3000,
    label_ru: '13 000 ⭐ (+3 000 бонус)',
    label_en: '13,000 ⭐ (+3,000 bonus)',
  },
] as const;

export function findPack(id: string): StarsPack | undefined {
  return STARS_PACKS.find((p) => p.id === id);
}
