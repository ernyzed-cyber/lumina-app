import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price_stars: number;
  category: string;
}

export function useGiftCatalog() {
  const [catalog, setCatalog] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from('gift_catalog')
        .select('id, name, emoji, price_stars, category')
        .order('price_stars', { ascending: true });
      if (dbErr) throw dbErr;
      setCatalog(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { catalog, loading, error };
}
