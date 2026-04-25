import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../i18n';

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price_stars: number;
  category: string;
}

interface DbRow {
  id: string;
  name_ru: string;
  name_en: string;
  emoji: string;
  price_stars: number;
  category: string;
  sort_order: number;
}

export function useGiftCatalog() {
  const { lang } = useLanguage();
  const [catalog, setCatalog] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('gift_catalog')
        .select('id, name_ru, name_en, emoji, price_stars, category, sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });
      if (dbErr) throw dbErr;
      const rows = (data ?? []) as DbRow[];
      const items: GiftItem[] = rows.map((r) => ({
        id: r.id,
        name: lang === 'ru' ? r.name_ru : r.name_en,
        emoji: r.emoji,
        price_stars: r.price_stars,
        category: r.category,
      }));
      setCatalog(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { catalog, loading, error };
}
