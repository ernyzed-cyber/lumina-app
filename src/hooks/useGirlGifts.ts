import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useLanguage } from '../i18n';

export interface GirlGiftSummary {
  giftId: string;
  emoji: string;
  name: string;
  count: number;
  totalStars: number;
}

/**
 * Returns gifts the *current user* has sent to a particular girl,
 * grouped by gift_id with counts. Only the sender sees their own
 * gifts (RLS on gifts_sent enforces user_id = auth.uid()).
 */
export function useGirlGifts(girlId: string | null | undefined) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [gifts, setGifts] = useState<GirlGiftSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !girlId) {
      setGifts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from('gifts_sent')
        .select('gift_id, stars_spent, gift_catalog(emoji, name_ru, name_en)')
        .eq('user_id', user.id)
        .eq('girl_id', girlId);

      if (cancelled) return;

      if (error || !data) {
        setGifts([]);
        setLoading(false);
        return;
      }

      // Aggregate by gift_id
      // Note: PostgREST returns the FK relation as an array even when it's 1:1
      type GiftCatalogJoin = { emoji: string; name_ru: string; name_en: string };
      type Row = {
        gift_id: string;
        stars_spent: number;
        gift_catalog: GiftCatalogJoin | GiftCatalogJoin[] | null;
      };
      const map = new Map<string, GirlGiftSummary>();
      for (const row of data as unknown as Row[]) {
        const catRaw = row.gift_catalog;
        const cat = Array.isArray(catRaw) ? catRaw[0] ?? null : catRaw;
        const existing = map.get(row.gift_id);
        if (existing) {
          existing.count += 1;
          existing.totalStars += row.stars_spent;
        } else {
          map.set(row.gift_id, {
            giftId: row.gift_id,
            emoji: cat?.emoji ?? '🎁',
            name: lang === 'en' ? cat?.name_en ?? row.gift_id : cat?.name_ru ?? row.gift_id,
            count: 1,
            totalStars: row.stars_spent,
          });
        }
      }

      // Sort: by count DESC, then totalStars DESC
      const arr = Array.from(map.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.totalStars - a.totalStars;
      });

      setGifts(arr);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, girlId, lang]);

  return { gifts, loading };
}
