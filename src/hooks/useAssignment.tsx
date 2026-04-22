// src/hooks/useAssignment.tsx
// Единственный источник истины о текущем assignment юзера.
// Возвращает: activeGirlId | null, isOnWaitlist, loading, createAssignment, releaseAssignment

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface AssignmentRow {
  id: number;
  girl_id: string;
  started_at: string;
}

interface AssignmentContext {
  activeGirlId: string | null;       // ID назначенной девушки или null
  assignmentId: number | null;        // PK assignments
  startedAt: string | null;           // когда началось
  isOnWaitlist: boolean;              // юзер в очереди ожидания
  loading: boolean;
  /** ID всех занятых девушек (включая мою). Единый источник истины для Feed/Search/etc. */
  takenGirlIds: Set<string>;
  /** Загружаются ли takenGirlIds */
  takenLoading: boolean;
  /** Перезагрузить список занятых девушек (напр. после создания assignment) */
  refreshTakenGirls: () => Promise<void>;
  /** Создать assignment (вызвать после лайка на Feed) */
  createAssignment: (girlId: string) => Promise<{ error: string | null }>;
  /** Освободить assignment самостоятельно (кнопка "расстаться") */
  releaseAssignment: () => Promise<void>;
  /** Встать в очередь (вызвать если пул пуст) */
  joinWaitlist: () => Promise<void>;
  /** Покинуть очередь */
  leaveWaitlist: () => Promise<void>;
}

const AssignmentCtx = createContext<AssignmentContext | null>(null);

export function AssignmentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [takenGirlIds, setTakenGirlIds] = useState<Set<string>>(new Set());
  const [takenLoading, setTakenLoading] = useState(true);

  // Загрузить список занятых девушек через SECURITY DEFINER функцию (обходит RLS).
  const refreshTakenGirls = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_taken_girl_ids');
    if (error) {
      console.warn('[useAssignment] get_taken_girl_ids failed:', error.message);
      setTakenGirlIds(new Set());
    } else {
      setTakenGirlIds(new Set((data ?? []).map((r: { girl_id: string }) => r.girl_id)));
    }
    setTakenLoading(false);
  }, []);

  // Первая загрузка takenGirls (не зависит от user — публично-читаемо)
  useEffect(() => {
    refreshTakenGirls();
  }, [refreshTakenGirls]);

  // Загрузить текущий статус при монтировании и при смене юзера.
  useEffect(() => {
    if (!user) {
      setAssignment(null);
      setIsOnWaitlist(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Активный assignment?
        const { data: asgn } = await supabase
          .from('assignments')
          .select('id, girl_id, started_at')
          .eq('user_id', user.id)
          .is('released_at', null)
          .maybeSingle();

        if (!cancelled) setAssignment(asgn ?? null);

        // В очереди?
        if (!asgn) {
          const { data: wl } = await supabase
            .from('waitlist')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!cancelled) setIsOnWaitlist(!!wl);
        } else {
          if (!cancelled) setIsOnWaitlist(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const createAssignment = useCallback(async (girlId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'not_authenticated' };

    const { error } = await supabase.from('assignments').insert({
      user_id: user.id,
      girl_id: girlId,
    });

    if (error) {
      // Код 23505 = unique violation (девушку уже забрали)
      if (error.code === '23505') return { error: 'girl_taken' };
      return { error: error.message };
    }

    // Перезагрузить assignment
    const { data: asgn } = await supabase
      .from('assignments')
      .select('id, girl_id, started_at')
      .eq('user_id', user.id)
      .is('released_at', null)
      .maybeSingle();

    setAssignment(asgn ?? null);
    setIsOnWaitlist(false);
    // Обновляем список занятых девушек (наша девушка теперь в занятых)
    await refreshTakenGirls();
    return { error: null };
  }, [user, refreshTakenGirls]);

  const releaseAssignment = useCallback(async () => {
    if (!assignment || !user) return;

    await supabase.from('assignments')
      .update({ released_at: new Date().toISOString(), release_reason: 'user_released' })
      .eq('id', assignment.id);

    setAssignment(null);
    // Девушка снова свободна — обновляем список занятых
    await refreshTakenGirls();
  }, [assignment, user, refreshTakenGirls]);

  const joinWaitlist = useCallback(async () => {
    if (!user || isOnWaitlist) return;
    await supabase.from('waitlist').upsert({ user_id: user.id });
    setIsOnWaitlist(true);
  }, [user, isOnWaitlist]);

  const leaveWaitlist = useCallback(async () => {
    if (!user) return;
    await supabase.from('waitlist').delete().eq('user_id', user.id);
    setIsOnWaitlist(false);
  }, [user]);

  return (
    <AssignmentCtx.Provider value={{
      activeGirlId: assignment?.girl_id ?? null,
      assignmentId: assignment?.id ?? null,
      startedAt: assignment?.started_at ?? null,
      isOnWaitlist,
      loading,
      takenGirlIds,
      takenLoading,
      refreshTakenGirls,
      createAssignment,
      releaseAssignment,
      joinWaitlist,
      leaveWaitlist,
    }}>
      {children}
    </AssignmentCtx.Provider>
  );
}

export function useAssignment() {
  const ctx = useContext(AssignmentCtx);
  if (!ctx) throw new Error('useAssignment must be used within AssignmentProvider');
  return ctx;
}
