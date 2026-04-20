import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/* ── Типы ── */
export type NotificationType = 'like' | 'message' | 'view' | 'favorite';

export interface AppNotification {
  id: string;
  type: NotificationType;
  avatar: string;
  name: string;
  text: string;
  time: string;
  read: boolean;
  girl_id?: string;
}

interface NotificationsContextValue {
  unreadNotifications: number;
  unreadMessages: number;
  lastNotification: AppNotification | null;
  /** Локально пометить уведомление прочитанным (без бэка). */
  markLocalRead: (id: string) => void;
  /** Пометить все локально прочитанными. */
  markAllLocalRead: () => void;
  /** Обнулить счётчик сообщений (например, при открытии чата). */
  resetMessages: () => void;
  /** Ручное обновление счётчиков из базы. */
  refresh: () => Promise<void>;
  /** Показать временный in-app баннер. */
  pushBanner: (n: AppNotification) => void;
  /** Очистить текущий баннер. */
  clearBanner: () => void;
  currentBanner: AppNotification | null;
}

const NotificationsCtx = createContext<NotificationsContextValue | null>(null);

const STORAGE_KEY = 'lumina_notifications_read';

/* ── Хранение "прочитано" локально (для демо-режима без БД) ── */
function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastNotification, setLastNotification] = useState<AppNotification | null>(null);
  const [currentBanner, setCurrentBanner] = useState<AppNotification | null>(null);

  const readIdsRef = useRef<Set<string>>(loadReadIds());
  const bannerTimerRef = useRef<number | null>(null);

  /* ── Показать баннер с авто-скрытием ── */
  const pushBanner = useCallback((n: AppNotification) => {
    setCurrentBanner(n);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setCurrentBanner(null);
    }, 5000);
  }, []);

  const clearBanner = useCallback(() => {
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    setCurrentBanner(null);
  }, []);

  /* ── Обновить счётчики из Supabase ── */
  const refresh = useCallback(async () => {
    if (!user) {
      // Demo fallback: показываем 2 непрочитанных уведомления, если юзер анонимный.
      setUnreadNotifications(2);
      setUnreadMessages(1);
      return;
    }

    try {
      // Запрашиваем только notifications.read — эта колонка точно есть.
      // messages не запрашиваем через БД: колонки read/recipient_id могут отсутствовать.
      // Счётчик сообщений ведём локально через realtime (см. подписку ниже).
      const notifRes = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!notifRes.error) {
        setUnreadNotifications(notifRes.count ?? 0);
      }
    } catch {
      // silent — сохраняем предыдущее значение
    }
  }, [user]);

  /* ── Первая загрузка + при смене user ── */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ── Realtime подписка на новые уведомления/сообщения ── */
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: string;
            avatar: string;
            name: string;
            text: string;
            created_at: string;
            read: boolean;
            girl_id?: string;
          };
          const n: AppNotification = {
            id: row.id,
            type: row.type as NotificationType,
            avatar: row.avatar,
            name: row.name,
            text: row.text,
            time: row.created_at,
            read: row.read,
            girl_id: row.girl_id,
          };
          setLastNotification(n);
          if (!n.read) {
            setUnreadNotifications((c) => c + 1);
            pushBanner(n);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          setUnreadMessages((c) => c + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, pushBanner]);

  /* ── Локальный mark read (для демо) ── */
  const markLocalRead = useCallback((id: string) => {
    readIdsRef.current.add(id);
    saveReadIds(readIdsRef.current);
    setUnreadNotifications((c) => Math.max(0, c - 1));
  }, []);

  const markAllLocalRead = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  const resetMessages = useCallback(() => {
    setUnreadMessages(0);
  }, []);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadNotifications,
      unreadMessages,
      lastNotification,
      currentBanner,
      markLocalRead,
      markAllLocalRead,
      resetMessages,
      refresh,
      pushBanner,
      clearBanner,
    }),
    [
      unreadNotifications,
      unreadMessages,
      lastNotification,
      currentBanner,
      markLocalRead,
      markAllLocalRead,
      resetMessages,
      refresh,
      pushBanner,
      clearBanner,
    ],
  );

  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
