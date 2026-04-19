/* ═══════════════════════════════════════════
   LUMINA — Telegram verification hook
   Reads telegram_verified from profiles table
   and provides real-time updates via Supabase
   ═══════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useTelegramVerified() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── Fetch current status ── */
  const fetchStatus = useCallback(async () => {
    if (!user) {
      setIsVerified(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('telegram_verified')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setIsVerified(data.telegram_verified === true);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /* ── Real-time subscription ── */
  useEffect(() => {
    if (!user) return;

    // Use a unique channel name each time to avoid StrictMode double-mount collision
    // (Supabase reuses channels by name, which causes "cannot add callbacks after subscribe()")
    const channelName = `profile-verify-${user.id}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'telegram_verified' in payload.new) {
            setIsVerified(payload.new.telegram_verified === true);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ── Generate verification code ── */
  const generateCode = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LUM-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    const { error } = await supabase
      .from('profiles')
      .update({
        telegram_code: code,
        telegram_code_expires_at: expiresAt,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to save verification code:', error);
      return null;
    }

    return code;
  }, [user]);

  return { isVerified, loading, generateCode, refetch: fetchStatus };
}
