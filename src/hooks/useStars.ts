import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { tg } from '../lib/telegram';

export type PackId = 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000';

export function useStars() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Sum all stars_ledger rows for the current user. */
  const fetchBalance = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data } = await supabase
      .from('stars_ledger')
      .select('amount')
      .eq('user_id', user.id);

    const total = (data ?? []).reduce(
      (sum: number, row: { amount: number }) => sum + row.amount,
      0,
    );
    setBalance(total);
  }, []);

  /* Fetch on mount */
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  /* Re-fetch when user returns to tab after paying on CryptoCloud */
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        fetchBalance();
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchBalance]);

  /**
   * Open CryptoCloud checkout for the given pack.
   * 1. Call billing-create-invoice edge function → get pay_url
   * 2. Open pay_url in a new tab
   * 3. Stars will be credited asynchronously via webhook
   * 4. Balance re-fetches when the user returns to this tab
   */
  const buyPack = useCallback(async (packId: PackId) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'billing-create-invoice',
        { body: { pack_id: packId } },
      );
      if (fnError || !data?.pay_url) {
        tg.haptic('error');
        throw fnError ?? new Error('no pay_url');
      }
      tg.haptic('success');
      window.open(data.pay_url as string, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Spend 100⭐ to buy +100 messages for today.
   * Invokes `messages-buy-pack` edge function (no body needed).
   * Balance is refreshed automatically on success.
   */
  const buyMessagesPack = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: fnError } = await supabase.functions.invoke('messages-buy-pack');
      if (fnError) {
        tg.haptic('error');
        throw fnError;
      }
      tg.haptic('success');
      await fetchBalance();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  return { balance, loading, error, fetchBalance, refetch: fetchBalance, buyPack, buyMessagesPack };
}
