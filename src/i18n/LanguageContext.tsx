/* ═══════════════════════════════════════════
   LUMINA — Language Context (i18n)
   Auto-detection + manual switch + t() helper
   ═══════════════════════════════════════════ */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import en from './en';
import ru from './ru';
import type { Translations } from './en';

/* ── Supported languages ── */
export type Lang = 'en' | 'ru';

const translations: Record<Lang, Translations> = { en, ru };

/* ── Detect language from browser ── */
function detectLanguage(): Lang {
  try {
    const saved = localStorage.getItem('lumina_lang');
    if (saved === 'en' || saved === 'ru') return saved;
  } catch {
    // localStorage might not be available
  }

  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('ru') || nav.startsWith('uk') || nav.startsWith('be')) return 'ru';
  return 'en';
}

/* ── Resolve nested key from dot-path ── */
function resolve(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/* ── Interpolate {placeholders} ── */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`,
  );
}

/* ── Context type ── */
interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tr: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

/* ── Provider ── */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLanguage);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem('lumina_lang', newLang);
    } catch {
      // ignore
    }
  }, []);

  const tr = useMemo(() => translations[lang], [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = resolve(translations[lang], key);
      if (typeof value === 'string') return interpolate(value, params);
      // Fallback to English
      const fallback = resolve(translations.en, key);
      if (typeof fallback === 'string') return interpolate(fallback, params);
      // Return key as last resort (makes missing translations visible)
      return key;
    },
    [lang],
  );

  const ctx = useMemo(() => ({ lang, setLang, t, tr }), [lang, setLang, t, tr]);

  return (
    <LanguageContext.Provider value={ctx}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ── Hook ── */
export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>');
  return ctx;
}
