export type PackId = 'stars_100' | 'stars_500' | 'stars_2000' | 'stars_10000';

export interface Pack {
  id: PackId;
  stars: number;
  title: string;
  description: string;
}

export const PACKS: Record<PackId, Pack> = {
  stars_100:   { id: 'stars_100',   stars: 100,   title: '100 ⭐',    description: 'Starter pack — 100 Stars' },
  stars_500:   { id: 'stars_500',   stars: 500,   title: '500 ⭐',    description: 'Popular — 500 Stars' },
  stars_2000:  { id: 'stars_2000',  stars: 2000,  title: '2 000 ⭐',  description: 'Best value — 2 000 Stars' },
  stars_10000: { id: 'stars_10000', stars: 10000, title: '10 000 ⭐', description: 'Whale pack — 10 000 Stars' },
};

export function isPackId(v: unknown): v is PackId {
  return typeof v === 'string' && v in PACKS;
}
