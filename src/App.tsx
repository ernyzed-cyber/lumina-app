import { lazy, Suspense, useEffect } from 'react';
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
const Shop = lazy(() => import('./pages/Shop'));
const Waitlist = lazy(() => import('./pages/Waitlist'));
const Released = lazy(() => import('./pages/Released'));

/* ── Dev-only: redesign preview catalog (НЕ попадает в production-билд) ── */
// @ts-ignore
const PreviewLayout = import.meta.env.DEV
  ? lazy(() => import('./preview/PreviewLayout'))
  : null;
// @ts-ignore
const PreviewIndex = import.meta.env.DEV
  ? lazy(() => import('./preview/PreviewIndex'))
  : null;
// @ts-ignore
const PreviewPrimitives = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Primitives'))
  : null;
// @ts-ignore
const PreviewNavigation = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Navigation'))
  : null;
// @ts-ignore
const PreviewLanding = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Landing'))
  : null;
// @ts-ignore
const PreviewAuth = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Auth'))
  : null;
// @ts-ignore
const PreviewHome = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Home'))
  : null;
// @ts-ignore
const PreviewMemories = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Memories'))
  : null;
// @ts-ignore
const PreviewChat = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Chat'))
  : null;
// @ts-ignore
const PreviewFeed = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Feed'))
  : null;
// @ts-ignore
const PreviewSearch = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Search'))
  : null;
// @ts-ignore
const PreviewProfile = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Profile'))
  : null;

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

  // One-time migration: clear legacy premium localStorage key
  useEffect(() => {
    localStorage.removeItem('lumina_premium');
  }, []);

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
          <Route path="/shop" element={<Shop />} />
          <Route path="/waitlist" element={<Waitlist />} />
          <Route path="/released" element={<Released />} />
        </Route>

        {/* Dev-only: redesign preview catalog. Tree-shaken in production. */}
        {import.meta.env.DEV && PreviewLayout && PreviewIndex && PreviewPrimitives && PreviewNavigation && PreviewLanding && PreviewAuth && PreviewHome && PreviewMemories && PreviewChat && PreviewFeed && PreviewSearch && PreviewProfile && (
          <Route path="/__preview" element={<PreviewLayout />}>
            <Route index element={<PreviewIndex />} />
            <Route path="primitives" element={<PreviewPrimitives />} />
            <Route path="nav" element={<PreviewNavigation />} />
            <Route path="landing" element={<PreviewLanding />} />
            <Route path="auth" element={<PreviewAuth />} />
            <Route path="home" element={<PreviewHome />} />
            <Route path="memories" element={<PreviewMemories />} />
            <Route path="chat" element={<PreviewChat />} />
            <Route path="feed" element={<PreviewFeed />} />
            <Route path="search" element={<PreviewSearch />} />
            <Route path="profile" element={<PreviewProfile />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}

export default App;
