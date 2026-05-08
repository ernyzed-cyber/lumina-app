/**
 * PublicOnly — guard для маршрутов, доступных только незалогиненым.
 *
 * Используется на /auth (и потенциально / для маркетинга).
 * Если user authenticated → redirect на /feed (или /chat если есть active assignment,
 * но эту проверку оставляем самой странице Auth, чтобы не дублировать запрос).
 *
 * Пока loading — показывает тот же spinner что и ProtectedRoute (визуальная согласованность).
 *
 * Stage 4: подключается к /auth route после merge redesign в production.
 * До merge — тоже можно подключать (не ломает логику, /auth уже редиректит сам после signIn).
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function PublicOnly() {
  const { user, loading } = useAuth();

  if (loading) {
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

  if (user) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
}
