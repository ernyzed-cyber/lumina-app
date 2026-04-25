import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { tg } from '../lib/telegram';

export type PackId = 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000';
export type PaymentProvider = 'cryptocloud' | 'telegram';

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
      .select('delta')
      .eq('user_id', user.id);

    const total = (data ?? []).reduce(
      (sum: number, row: { delta: number }) => sum + row.delta,
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
   * Open checkout for the given pack via the chosen payment provider.
   *
   *   cryptocloud → calls billing-create-invoice → opens CryptoCloud pay_url
   *   telegram    → calls billing-create-invoice-tg → opens t.me/<bot> deep link
   *
   * In both cases stars are credited asynchronously by a webhook
   * (billing-webhook for CryptoCloud, tg-bot-webhook for Telegram).
   * The balance re-fetches automatically when the user returns to this tab.
   */
  const buyPack = useCallback(async (
    packId: PackId,
    provider: PaymentProvider = 'cryptocloud',
  ) => {
    setLoading(true);
    setError(null);
    try {
      const fnName = provider === 'telegram'
        ? 'billing-create-invoice-tg'
        : 'billing-create-invoice';

      const { data, error: fnError } = await supabase.functions.invoke(
        fnName,
        { body: { pack_id: packId } },
      );

      if (fnError) {
        tg.haptic('error');
        throw fnError;
      }

      const url = provider === 'telegram'
        ? (data as { deep_link?: string } | null)?.deep_link
        : (data as { pay_url?: string } | null)?.pay_url;

      if (!url) {
        tg.haptic('error');
        throw new Error(provider === 'telegram' ? 'no deep_link' : 'no pay_url');
      }

      tg.haptic('success');
      window.open(url, '_blank');
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
  const buyMessagesPack = useCallback(async (): Promise<boolean> => {
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
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  return { balance, loading, error, fetchBalance, refetch: fetchBalance, buyPack, buyMessagesPack };
}
