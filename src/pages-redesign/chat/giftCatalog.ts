/**
 * Static gift catalog for redesign preview (Stage 7).
 *
 * Mirrors the prod `gift_catalog` Supabase seed 1:1 — same ids, same prices
 * (in stars), same emoji, same EN/RU names, same 4 categories. The redesign
 * preview is offline / static, so we duplicate the seed here rather than hit
 * the database. Keep this in sync with
 * `supabase/migrations/20260423_gift_catalog.sql`.
 *
 * Categories: 'gift' | 'jewelry' | 'date' | 'travel'.
 */

export type GiftCategory = 'gift' | 'jewelry' | 'date' | 'travel';

export type GiftKind =
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

export type GiftCatalogItem = {
  id: GiftKind;
  category: GiftCategory;
  emoji: string;
  nameEn: string;
  nameRu: string;
  priceStars: number;
  /** Same field used by prod for grid order. Lower = first. */
  sortOrder: number;
};

/** Sorted by `sortOrder` (matches prod seed order). */
export const GIFT_CATALOG: readonly GiftCatalogItem[] = [
  { id: 'rose',           category: 'gift',    emoji: '🌹',  nameEn: 'Rose',            nameRu: 'Роза',             priceStars: 20,   sortOrder: 10 },
  { id: 'bouquet',        category: 'gift',    emoji: '💐',  nameEn: 'Bouquet',         nameRu: 'Букет цветов',     priceStars: 150,  sortOrder: 20 },
  { id: 'chocolate',      category: 'gift',    emoji: '🍫',  nameEn: 'Chocolates',      nameRu: 'Конфеты',          priceStars: 50,   sortOrder: 30 },
  { id: 'teddy',          category: 'gift',    emoji: '🧸',  nameEn: 'Teddy bear',      nameRu: 'Плюшевый мишка',   priceStars: 100,  sortOrder: 40 },
  { id: 'perfume',        category: 'gift',    emoji: '💫',  nameEn: 'Perfume',         nameRu: 'Парфюм',           priceStars: 300,  sortOrder: 50 },
  { id: 'ring',           category: 'jewelry', emoji: '💍',  nameEn: 'Ring',            nameRu: 'Кольцо',           priceStars: 500,  sortOrder: 60 },
  { id: 'necklace',       category: 'jewelry', emoji: '📿',  nameEn: 'Necklace',        nameRu: 'Ожерелье',         priceStars: 400,  sortOrder: 70 },
  { id: 'earrings',       category: 'jewelry', emoji: '💎',  nameEn: 'Earrings',        nameRu: 'Серьги',           priceStars: 350,  sortOrder: 80 },
  { id: 'date_coffee',    category: 'date',    emoji: '☕',  nameEn: 'Coffee date',     nameRu: 'Свидание в кафе',  priceStars: 200,  sortOrder: 100 },
  { id: 'date_dinner',    category: 'date',    emoji: '🍷',  nameEn: 'Dinner date',     nameRu: 'Ужин в ресторане', priceStars: 500,  sortOrder: 110 },
  { id: 'date_cinema',    category: 'date',    emoji: '🎬',  nameEn: 'Movie date',      nameRu: 'Кино',             priceStars: 300,  sortOrder: 120 },
  { id: 'date_concert',   category: 'date',    emoji: '🎵',  nameEn: 'Concert',         nameRu: 'Концерт',          priceStars: 800,  sortOrder: 130 },
  { id: 'travel_weekend', category: 'travel',  emoji: '🏖️', nameEn: 'Weekend getaway', nameRu: 'Выходные вдвоём',  priceStars: 2000, sortOrder: 200 },
  { id: 'travel_trip',    category: 'travel',  emoji: '✈️',  nameEn: 'Trip',            nameRu: 'Путешествие',      priceStars: 5000, sortOrder: 210 },
] as const;

export const GIFT_CATEGORIES: readonly GiftCategory[] = [
  'gift',
  'jewelry',
  'date',
  'travel',
] as const;

/** Lookup by id. Throws in dev for unknown kinds (catalog should be exhaustive). */
export function findGift(id: GiftKind): GiftCatalogItem {
  const found = GIFT_CATALOG.find((g) => g.id === id);
  if (!found) {
    throw new Error(`[gift catalog] unknown gift id: ${id}`);
  }
  return found;
}

export function giftName(item: GiftCatalogItem, lang: 'en' | 'ru'): string {
  return lang === 'ru' ? item.nameRu : item.nameEn;
}
