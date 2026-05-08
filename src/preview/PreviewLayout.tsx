/**
 * PreviewLayout — обёртка для всех redesign-страниц в /__preview.
 *
 * - Активирует CSS-scope `.redesign-root` (внутри которого работают
 *   все новые токены из variables-redesign.css и стили redesign.css).
 * - Поддерживает переключение темы (light/dark/auto) через localStorage.
 * - Рендерит мини-toolbar сверху для удобной навигации между preview-страницами.
 *
 * НЕ зависит от production AssignmentProvider, useAuth и т.д. — это staging.
 */

import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Moon, Sun, Monitor, ArrowLeft } from 'lucide-react';
import { useLanguage, type Lang } from '../i18n';
import '../styles/redesign.css';

type Theme = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'lumina-redesign-preview-theme';

export default function PreviewLayout() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return saved ?? 'light';
  });

  /**
   * Resolved theme: 'auto' → 'light'|'dark' по prefers-color-scheme.
   * Подписан на изменение system-схемы (matchMedia change), чтобы в
   * процессе работы preview мгновенно подхватывать смену темы.
   */
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    if (theme !== 'auto') return theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme !== 'auto') {
      setResolved(theme);
      return;
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setResolved(mql.matches ? 'dark' : 'light');
    apply();
    mql.addEventListener('change', apply);
    return () => mql.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    // На <html> ставим РЕЗОЛВНУТУЮ тему (light|dark), чтобы portal'ы и
    // CSS-overrides на :root[data-redesign-theme='dark'] работали в auto-режиме.
    document.documentElement.setAttribute('data-redesign-theme', resolved);
    return () => {
      document.documentElement.removeAttribute('data-redesign-theme');
    };
  }, [theme, resolved]);

  const location = useLocation();
  const isIndex = location.pathname === '/__preview' || location.pathname === '/__preview/';

  return (
    <div
      className="redesign-root"
      data-theme={resolved}
      style={{
        // height (not min-height) + flex column gives <main> a known parent
        // height. Pages like Chat use `height: 100%` on their root and rely on
        // <main> being flex:1 with min-height:0 so internal scrollers
        // (.transcript) work without overflowing the viewport.
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--rd-bg-page)',
        color: 'var(--rd-text-primary)',
      }}
    >
      {/* Toolbar (фиксированный сверху, viewable только в preview) */}
      <header
        className="rd-glass"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid var(--rd-border-subtle)',
          fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isIndex && (
            <Link
              to="/__preview"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--rd-text-secondary)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              <ArrowLeft size={16} />
              <span>Index</span>
            </Link>
          )}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              fontSize: 15,
            }}
          >
            Lumina <span className="rd-gradient-text">Redesign Preview</span>
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--rd-radius-pill)',
              background: 'var(--rd-fill-brand-soft)',
              color: 'var(--rd-text-accent)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            DEV ONLY
          </span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ThemeSwitcher theme={theme} onChange={setTheme} />
          <LangSwitcher />
        </div>
      </header>

      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Theme switcher (3 segments)
// ──────────────────────────────────────────────────────────────────
function ThemeSwitcher({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const segments: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'auto', icon: Monitor, label: 'Auto' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      style={{
        display: 'inline-flex',
        padding: 3,
        borderRadius: 'var(--rd-radius-pill)',
        background: 'var(--rd-bg-surface-soft)',
        border: '1px solid var(--rd-border-subtle)',
      }}
    >
      {segments.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => onChange(value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 'var(--rd-radius-pill)',
              border: 'none',
              background: active ? 'var(--gradient-primary)' : 'transparent',
              color: active ? 'var(--rd-text-on-brand)' : 'var(--rd-text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--rd-duration-micro) var(--ease-smooth)',
              boxShadow: active ? 'var(--rd-shadow-sm)' : 'none',
            }}
          >
            <Icon size={13} strokeWidth={2.2} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Language switcher (EN / RU) — preview-only, использует глобальный
// LanguageProvider из main.tsx. Позволяет тестировать оба языка
// без необходимости менять browser locale или localStorage руками.
// ──────────────────────────────────────────────────────────────────
function LangSwitcher() {
  const { lang, setLang } = useLanguage();
  const segments: { value: Lang; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'ru', label: 'RU' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      style={{
        display: 'inline-flex',
        padding: 3,
        borderRadius: 'var(--rd-radius-pill)',
        background: 'var(--rd-bg-surface-soft)',
        border: '1px solid var(--rd-border-subtle)',
      }}
    >
      {segments.map(({ value, label }) => {
        const active = lang === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setLang(value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: 'var(--rd-radius-pill)',
              border: 'none',
              background: active ? 'var(--gradient-primary)' : 'transparent',
              color: active ? 'var(--rd-text-on-brand)' : 'var(--rd-text-secondary)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              transition: 'all var(--rd-duration-micro) var(--ease-smooth)',
              boxShadow: active ? 'var(--rd-shadow-sm)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
