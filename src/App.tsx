import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import NotificationBanner from './components/NotificationBanner';
import { useLanguage } from './i18n';

/* ── Lazy-loaded pages (code splitting) ── */
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Chat = lazy(() => import('./pages/Chat'));
const Feed = lazy(() => import('./pages/Feed'));
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'));
const Premium = lazy(() => import('./pages/Premium'));
const Waitlist = lazy(() => import('./pages/Waitlist'));
const Released = lazy(() => import('./pages/Released'));

/* ── Фоллбэк при загрузке чанка ── */
function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
        background: 'var(--bg-primary, #0F0D15)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(139,92,246,0.2)',
          borderTopColor: '#8B5CF6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

function App() {
  const { t } = useLanguage();

  return (
    <Suspense fallback={<PageLoader />}>
      <a href="#main-content" className="skip-to-content">
        {t('app.skipToContent')}
      </a>
      <NotificationBanner />
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />

        {/* Защищённые маршруты */}
        <Route element={<ProtectedRoute />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/search" element={<Search />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/released" element={<Released />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
