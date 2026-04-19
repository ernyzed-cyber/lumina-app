import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Heart,
  MessageCircle,
  Eye,
  Star,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageTransition from '../components/layout/PageTransition';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../i18n';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { formatDate } from '../utils/helpers';
import s from './Notifications.module.css';

/* ── Анимация появления ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

const itemVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -40, transition: { duration: 0.25 } },
};

/* ── Типы ── */
type NotificationType = 'like' | 'message' | 'view' | 'favorite';

interface Notification {
  id: string;
  type: NotificationType;
  avatar: string;
  name: string;
  text: string;
  time: string;
  read: boolean;
  girl_id?: string;
}

/* ── Demo action text key по типу ── */
const DEMO_ACTION_KEYS: Record<NotificationType, string> = {
  like: 'notifications.demoActions.ratedProfile',
  message: 'notifications.demoActions.sentMessage',
  view: 'notifications.demoActions.viewedProfile',
  favorite: 'notifications.demoActions.addedFavorite',
};

/* ── Demo-данные (без text — будет подставляться через t()) ── */
interface DemoNotificationData {
  id: string;
  type: NotificationType;
  avatar: string;
  name: string;
  time: string;
  read: boolean;
  girl_id?: string;
}

const DEMO_NOTIFICATIONS_DATA: DemoNotificationData[] = [
  {
    id: 'd1',
    type: 'like',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    name: 'Алина',
    time: new Date(Date.now() - 5 * 60000).toISOString(),
    read: false,
    girl_id: 'alina',
  },
  {
    id: 'd2',
    type: 'message',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
    name: 'Соня',
    time: new Date(Date.now() - 15 * 60000).toISOString(),
    read: false,
    girl_id: 'sonya',
  },
  {
    id: 'd3',
    type: 'view',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face',
    name: 'Даша',
    time: new Date(Date.now() - 45 * 60000).toISOString(),
    read: false,
  },
  {
    id: 'd4',
    type: 'favorite',
    avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face',
    name: 'Настя',
    time: new Date(Date.now() - 2 * 3600000).toISOString(),
    read: true,
  },
  {
    id: 'd5',
    type: 'message',
    avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face',
    name: 'Маша',
    time: new Date(Date.now() - 5 * 3600000).toISOString(),
    read: true,
    girl_id: 'masha',
  },
  {
    id: 'd6',
    type: 'like',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    name: 'Юлия',
    time: new Date(Date.now() - 24 * 3600000).toISOString(),
    read: true,
  },
  {
    id: 'd7',
    type: 'view',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    name: 'Лера',
    time: new Date(Date.now() - 48 * 3600000).toISOString(),
    read: true,
  },
];

/* ── Иконка по типу ── */
function TypeIcon({ type }: { type: NotificationType }) {
  const size = 13;
  switch (type) {
    case 'like':
      return <Heart size={size} className={s.iconLike} />;
    case 'message':
      return <MessageCircle size={size} className={s.iconMessage} />;
    case 'view':
      return <Eye size={size} className={s.iconView} />;
    case 'favorite':
      return <Star size={size} className={s.iconFavorite} />;
  }
}

/* ══════════════════════════════════════
   КОМПОНЕНТ: Notifications
   ══════════════════════════════════════ */
export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { t } = useLanguage();
  const { markLocalRead, markAllLocalRead, refresh } = useNotifications();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  /* ── Построить демо-уведомления с переведённым текстом ── */
  const buildDemoNotifications = useCallback((): Notification[] => {
    return DEMO_NOTIFICATIONS_DATA.map((d) => ({
      ...d,
      text: t(DEMO_ACTION_KEYS[d.type]),
    }));
  }, [t]);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ── Загрузка уведомлений ── */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!cancelled && data && !error && data.length > 0) {
          setNotifications(
            data.map(
              (row: {
                id: string;
                type: string;
                avatar: string;
                name: string;
                text: string;
                created_at: string;
                read: boolean;
                girl_id?: string;
              }) => ({
                id: row.id,
                type: row.type as NotificationType,
                avatar: row.avatar,
                name: row.name,
                text: row.text,
                time: row.created_at,
                read: row.read,
                girl_id: row.girl_id,
              }),
            ),
          );
        } else if (!cancelled) {
          // Fallback на демо-данные
          setNotifications(buildDemoNotifications());
        }
      } catch {
        if (!cancelled) {
          setNotifications(buildDemoNotifications());
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, buildDemoNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── Пометить одно как прочитанное ── */
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      markLocalRead(id);

      if (user) {
        try {
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .eq('user_id', user.id);
          refresh();
        } catch {
          // Тихий fallback
        }
      }
    },
    [user, markLocalRead, refresh],
  );

  /* ── Пометить все как прочитанные ── */
  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllLocalRead();
    showToast(t('notifications.toast.allRead'), 'success');

    if (user) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id);
        refresh();
      } catch {
        // Тихий fallback
      }
    }
  }, [user, showToast, t, markAllLocalRead, refresh]);

  /* ── Очистить все ── */
  const clearAll = useCallback(async () => {
    setNotifications([]);
    markAllLocalRead();
    showToast(t('notifications.toast.cleared'), 'success');

    if (user) {
      try {
        await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id);
        refresh();
      } catch {
        // Тихий fallback
      }
    }
  }, [user, showToast, t, markAllLocalRead, refresh]);

  /* ── Клик по уведомлению ── */
  const handleItemClick = useCallback(
    (n: Notification) => {
      markAsRead(n.id);

      if (n.type === 'message' && n.girl_id) {
        navigate(`/chat?girl=${n.girl_id}`);
      }
    },
    [markAsRead, navigate],
  );

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
      <Navbar unreadNotifications={unreadCount} />

      <main className={s.main}>
        {/* ════════ Top Bar ════════ */}
        <motion.div
          className={s.topBar}
          initial="hidden"
          animate="visible"
          custom={0}
          variants={fadeUp}
        >
          <div className={s.titleRow}>
            <h1 className={s.pageTitle}>{t('notifications.pageTitle')}</h1>
            {unreadCount > 0 && (
              <span className={s.countBadge}>{unreadCount}</span>
            )}
          </div>

          <div className={s.topActions}>
            <Button
              variant="ghost"
              size="sm"
              icon={<CheckCheck size={16} />}
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              {t('notifications.markAllRead')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={16} />}
              onClick={clearAll}
              disabled={notifications.length === 0}
            >
              {t('notifications.clearAll')}
            </Button>
          </div>
        </motion.div>

        {/* ════════ Список или пустое состояние ════════ */}
        {loadingData ? (
          <div className={s.loading} style={{ marginLeft: 0, minHeight: 200 }}>
            <div className={s.spinner} />
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            className={s.emptyState}
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
          >
            <div className={s.emptyIcon}>
              <Bell size={32} />
            </div>
            <h3 className={s.emptyTitle}>{t('notifications.emptyTitle')}</h3>
            <p className={s.emptyText}>
              {t('notifications.emptyText')}
            </p>
          </motion.div>
        ) : (
          <div className={s.list}>
            <AnimatePresence>
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  className={`${s.item} ${!n.read ? s.itemUnread : ''}`}
                  variants={itemVariant}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{
                    delay: i * 0.04,
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  onClick={() => handleItemClick(n)}
                >
                  {/* Avatar + type icon */}
                  <div className={s.itemAvatarWrap}>
                    <Avatar src={n.avatar} alt={n.name} size="sm" />
                    <span className={s.itemTypeIcon}>
                      <TypeIcon type={n.type} />
                    </span>
                  </div>

                  {/* Content */}
                  <div className={s.itemContent}>
                    <p className={s.itemText}>
                      <strong>{n.name}</strong> {n.text}
                    </p>
                    <span className={s.itemTime}>{formatDate(n.time)}</span>
                  </div>

                  {/* Unread indicator */}
                  {!n.read && <span className={s.unreadDot} />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      <ToastContainer />
    </div>
    </PageTransition>
  );
}
