import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell,
  Shield,
  Globe,
  Database,
  Info,
  ChevronDown,
  Download,
  Trash2,
  Crown,
  LogOut,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageTransition from '../components/layout/PageTransition';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { storage } from '../utils/helpers';
import { useLanguage } from '../i18n';
import type { Lang } from '../i18n';
import s from './Settings.module.css';

/* ── Анимация появления ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" as const },
  }),
};

/* ── Типы ── */
interface Settings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  sound: boolean;
  readReceipts: boolean;
  showOnlineStatus: boolean;
  language: string;
}

const DEFAULT_SETTINGS: Settings = {
  pushNotifications: true,
  emailNotifications: true,
  sound: true,
  readReceipts: true,
  showOnlineStatus: true,
  language: 'ru',
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

/* ── Toggle-компонент ── */
function Toggle({
  checked,
  onChange,
  id,
  'aria-describedby': ariaDescribedby,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
  'aria-describedby'?: string;
}) {
  return (
    <label className={s.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        id={id}
        aria-describedby={ariaDescribedby}
      />
      <span className={s.toggleTrack} />
      <span className={s.toggleThumb} />
    </label>
  );
}

/* ── Select-компонент ── */
function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className={s.selectWrap}>
      <select
        className={s.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className={s.selectArrow} />
    </div>
  );
}

/* ══════════════════════════════════════
   КОМПОНЕНТ: Settings
   ══════════════════════════════════════ */
export default function Settings() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ── Загрузить настройки ── */
  useEffect(() => {
    if (!user) return;

    (async () => {
      // Сначала — localStorage
      const local = storage.load<Settings>('settings');
      if (local) {
        setSettings({ ...DEFAULT_SETTINGS, ...local });
      }

      // Потом — Supabase (перезаписывает)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();

        if (data?.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<Settings>) };
          setSettings(merged);
          storage.save('settings', merged);
        }
      } catch {
        // Таблица ещё не создана
      }

      setLoaded(true);
    })();
  }, [user]);

  /* ── Обновить одно поле ── */
  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        // Mirror в localStorage
        storage.save('settings', next);
        return next;
      });
    },
    [],
  );

  /* ── Сохранить в Supabase (debounced при размонтировании или вручную) ── */
  useEffect(() => {
    if (!user || !loaded) return;

    const timer = setTimeout(async () => {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          settings,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Тихий fallback
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, settings, loaded]);

  /* ── Экспорт данных ── */
  const handleExportData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data ?? [], null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-messages-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast(t('settings.toast.dataExported'), 'success');
    } catch {
      showToast(t('settings.toast.dataExportError'), 'error');
    }
  }, [user, showToast, t]);

  /* ── Очистить кэш ── */
  const handleClearCache = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('lumina_'));
      keys.forEach((k) => localStorage.removeItem(k));
      showToast(t('settings.toast.cacheCleared', { count: keys.length }), 'success');
    } catch {
      showToast(t('settings.toast.cacheClearError'), 'error');
    }
  }, [showToast, t]);

  /* ── Загрузка ── */
  if (authLoading) {
    return (
      <div className={s.page}>
        <Navbar />
        <div className={s.loading}>
          <div className={s.spinner} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageTransition>
    <div className={s.page}>
      <Navbar />

      <main className={s.main} id="main-content" role="main" aria-label={t('settings.ariaLabel')}>
        {/* ════════ Заголовок ════════ */}
        <motion.h1
          className={s.pageTitle}
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
        >
          {t('settings.pageTitle')}
        </motion.h1>

        {/* ════════ Premium-баннер ════════ */}
        <motion.div
          initial="hidden"
          animate="visible"
          custom={0.5}
          variants={fadeUp}
        >
          <Link to="/premium" className={s.premiumBanner}>
            <Crown size={20} />
            <div className={s.premiumBannerText}>
              <span className={s.premiumBannerTitle}>{t('settings.premiumBanner.title')}</span>
              <span className={s.premiumBannerSub}>{t('settings.premiumBanner.subtitle')}</span>
            </div>
            <ChevronDown size={16} className={s.premiumBannerArrow} />
          </Link>
        </motion.div>

        {/* ════════ Уведомления и звук ════════ */}
        <motion.div
          className={s.section}
          initial="hidden"
          animate="visible"
          custom={1}
          variants={fadeUp}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionIcon}>
              <Bell size={18} />
            </div>
            <div>
              <h3 className={s.sectionTitle}>{t('settings.notifications.sectionTitle')}</h3>
              <p className={s.sectionDesc}>{t('settings.notifications.sectionDesc')}</p>
            </div>
          </div>

          <div className={s.settingRow}>
            <div>
              <div className={s.settingLabel} id="label-push">{t('settings.notifications.pushLabel')}</div>
              <div className={s.settingSub} id="desc-push">{t('settings.notifications.pushDesc')}</div>
            </div>
            <Toggle
              checked={settings.pushNotifications}
              onChange={(v) => updateSetting('pushNotifications', v)}
              id="toggle-push"
              aria-describedby="label-push desc-push"
            />
          </div>

          <div className={s.settingRow}>
            <div>
              <div className={s.settingLabel} id="label-email">{t('settings.notifications.emailLabel')}</div>
              <div className={s.settingSub} id="desc-email">{t('settings.notifications.emailDesc')}</div>
            </div>
            <Toggle
              checked={settings.emailNotifications}
              onChange={(v) => updateSetting('emailNotifications', v)}
              id="toggle-email"
              aria-describedby="label-email desc-email"
            />
          </div>

          <div className={s.settingRow}>
            <div>
              <div className={s.settingLabel} id="label-sound">{t('settings.notifications.soundLabel')}</div>
              <div className={s.settingSub} id="desc-sound">{t('settings.notifications.soundDesc')}</div>
            </div>
            <Toggle
              checked={settings.sound}
              onChange={(v) => updateSetting('sound', v)}
              id="toggle-sound"
              aria-describedby="label-sound desc-sound"
            />
          </div>
        </motion.div>

        {/* ════════ Приватность ════════ */}
        <motion.div
          className={s.section}
          initial="hidden"
          animate="visible"
          custom={2}
          variants={fadeUp}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionIcon}>
              <Shield size={18} />
            </div>
            <div>
              <h3 className={s.sectionTitle}>{t('settings.privacy.sectionTitle')}</h3>
              <p className={s.sectionDesc}>{t('settings.privacy.sectionDesc')}</p>
            </div>
          </div>

          <div className={s.settingRow}>
            <div>
              <div className={s.settingLabel} id="label-read-receipts">{t('settings.privacy.readReceiptsLabel')}</div>
              <div className={s.settingSub} id="desc-read-receipts">{t('settings.privacy.readReceiptsDesc')}</div>
            </div>
            <Toggle
              checked={settings.readReceipts}
              onChange={(v) => updateSetting('readReceipts', v)}
              id="toggle-read-receipts"
              aria-describedby="label-read-receipts desc-read-receipts"
            />
          </div>

          <div className={s.settingRow}>
            <div>
              <div className={s.settingLabel} id="label-online-status">{t('settings.privacy.onlineStatusLabel')}</div>
              <div className={s.settingSub} id="desc-online-status">{t('settings.privacy.onlineStatusDesc')}</div>
            </div>
            <Toggle
              checked={settings.showOnlineStatus}
              onChange={(v) => updateSetting('showOnlineStatus', v)}
              id="toggle-online-status"
              aria-describedby="label-online-status desc-online-status"
            />
          </div>
        </motion.div>

        {/* ════════ Язык ════════ */}
        <motion.div
          className={s.section}
          initial="hidden"
          animate="visible"
          custom={3}
          variants={fadeUp}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionIcon}>
              <Globe size={18} />
            </div>
            <div>
              <h3 className={s.sectionTitle}>{t('settings.language.sectionTitle')}</h3>
              <p className={s.sectionDesc}>{t('settings.language.sectionDesc')}</p>
            </div>
          </div>

          <div className={s.selectRow}>
            <div>
              <div className={s.settingLabel}>{t('settings.language.interfaceLanguage')}</div>
            </div>
            <Select
              value={lang}
              options={LANGUAGES}
              onChange={(v) => setLang(v as Lang)}
            />
          </div>
        </motion.div>

        {/* ════════ Данные ════════ */}
        <motion.div
          className={s.section}
          initial="hidden"
          animate="visible"
          custom={4}
          variants={fadeUp}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionIcon}>
              <Database size={18} />
            </div>
            <div>
              <h3 className={s.sectionTitle}>{t('settings.data.sectionTitle')}</h3>
              <p className={s.sectionDesc}>{t('settings.data.sectionDesc')}</p>
            </div>
          </div>

          <div className={s.dataButtons}>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={16} />}
              onClick={handleExportData}
            >
              {t('settings.data.exportBtn')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={16} />}
              onClick={handleClearCache}
            >
              {t('settings.data.clearCacheBtn')}
            </Button>
          </div>
        </motion.div>

        {/* ════════ О приложении ════════ */}
        <motion.div
          className={s.section}
          initial="hidden"
          animate="visible"
          custom={5}
          variants={fadeUp}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionIcon}>
              <Info size={18} />
            </div>
            <div>
              <h3 className={s.sectionTitle}>{t('settings.about.sectionTitle')}</h3>
            </div>
          </div>

          <div className={s.aboutInfo}>
            <span className={s.aboutVersion}>{t('settings.about.version')}</span>
            <div className={s.aboutLinks}>
              <Link to="/privacy" className={s.aboutLink}>
                {t('settings.about.privacyPolicy')}
              </Link>
              <Link to="/terms" className={s.aboutLink}>
                {t('settings.about.termsOfService')}
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ════════ Выход из аккаунта ════════ */}
        <motion.div
          className={s.section}
          initial="hidden"
          animate="visible"
          custom={6}
          variants={fadeUp}
        >
          <div className={s.sectionHeader}>
            <div className={s.sectionIcon}>
              <LogOut size={18} />
            </div>
            <div>
              <h3 className={s.sectionTitle}>{t('settings.logout.sectionTitle')}</h3>
              <p className={s.sectionDesc}>{t('settings.logout.logoutDesc')}</p>
            </div>
          </div>

          <button
            className={s.logoutBtn}
            onClick={async () => {
              try {
                await signOut();
              } catch {
                /* silent */
              }
              navigate('/');
            }}
          >
            <LogOut size={18} />
            {t('settings.logout.logoutBtn')}
          </button>
        </motion.div>
      </main>

      <ToastContainer />
    </div>
    </PageTransition>
  );
}
