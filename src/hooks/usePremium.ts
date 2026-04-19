import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/helpers';

// ── Types ────────────────────────────────────────────────────────────

type Plan = 'monthly' | 'yearly';

interface PremiumState {
  active: boolean;
  plan: Plan | null;
  activatedAt: string | null;
}

interface Limits {
  dailyLikes: number;
  dailySuperLikes: number;
  dailyMessages: number;
}

interface UsePremiumReturn {
  isPremium: boolean;
  activatePremium: (plan: Plan) => void;
  deactivatePremium: () => void;
  limits: Limits;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'premium'; // storage helper adds the lumina_ prefix

const DEFAULT_STATE: PremiumState = {
  active: false,
  plan: null,
  activatedAt: null,
};

const FREE_LIMITS: Limits = {
  dailyLikes: 5,
  dailySuperLikes: 1,
  dailyMessages: 100,
};

const PREMIUM_LIMITS: Limits = {
  dailyLikes: Infinity,
  dailySuperLikes: Infinity,
  dailyMessages: Infinity,
};

// ── Hook ─────────────────────────────────────────────────────────────

export function usePremium(): UsePremiumReturn {
  const [state, setState] = useState<PremiumState>(() =>
    storage.load<PremiumState>(STORAGE_KEY, DEFAULT_STATE) ?? DEFAULT_STATE,
  );

  // Sync every state change back to localStorage
  useEffect(() => {
    storage.save(STORAGE_KEY, state);
  }, [state]);

  const activatePremium = useCallback((plan: Plan) => {
    setState({
      active: true,
      plan,
      activatedAt: new Date().toISOString(),
    });
  }, []);

  const deactivatePremium = useCallback(() => {
    setState({
      active: false,
      plan: null,
      activatedAt: null,
    });
  }, []);

  const limits = useMemo<Limits>(
    () => (state.active ? PREMIUM_LIMITS : FREE_LIMITS),
    [state.active],
  );

  return { isPremium: state.active, activatePremium, deactivatePremium, limits };
}
