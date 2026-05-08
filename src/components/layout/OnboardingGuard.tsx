/**
 * OnboardingGuard — guard для маршрутов, требующих заполненного профиля.
 *
 * Условия "заполненности": в `profiles.settings` есть {gender, birthday, city, goal}.
 * Если хотя бы одного поля нет → redirect на /auth (где можно завершить onboarding).
 *
 * Используется поверх ProtectedRoute:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<OnboardingGuard />}>
 *       <Route path="/feed" ... />
 *       <Route path="/chat" ... />
 *     </Route>
 *   </Route>
 *
 * Telegram verification — отдельная проверка, делается на /chat и при like-action,
 * не блокирует доступ к /feed. Это соответствует concept'у "skip → ограничения, не блок".
 *
 * Performance: один запрос к profiles при mount, кэшируем результат через useState.
 * Real-time подписка не нужна — onboarding completion happens once.
 */
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type GuardState = 'checking' | 'allowed' | 'blocked';

export function OnboardingGuard() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<GuardState>('checking');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState('blocked');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .maybeSingle();
        if (cancelled) return;
        const s = (data?.settings ?? {}) as Record<string, unknown>;
        const complete = !!s.gender && !!s.birthday && !!s.city && !!s.goal;
        setState(complete ? 'allowed' : 'blocked');
      } catch {
        // On error: fail-open (allow). Network blip shouldn't lock user out.
        if (!cancelled) setState('allowed');
      }
    })();

    return () => { cancelled = true; };
  }, [user, authLoading]);

  if (authLoading || state === 'checking') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: '#8B5CF6',
            borderRightColor: '#EC4899',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state === 'blocked') {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
