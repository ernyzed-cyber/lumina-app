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
import { useAssignment } from './useAssignment';

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
  /** ID прочитанных уведомлений (персистится в localStorage). */
  readIds: Set<string>;
  /** Пометить уведомление прочитанным. */
  markLocalRead: (id: string) => void;
  /** Пометить несколько прочитанными за раз. */
  markManyLocalRead: (ids: string[]) => void;
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

const READ_IDS_KEY = 'lumina_notifications_read';
const MSG_LAST_READ_KEY = 'lumina_chat_last_read'; // { [girlId]: ISO }

/* ── Хранение "прочитано" локально ── */
function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function loadLastReadMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MSG_LAST_READ_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveLastReadMap(map: Record<string, string>) {
  try {
    localStorage.setItem(MSG_LAST_READ_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeGirlId } = useAssignment();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastNotification, setLastNotification] = useState<AppNotification | null>(null);
  const [currentBanner, setCurrentBanner] = useState<AppNotification | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

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

  /* ── Обновить счётчики ──
     notifications: COUNT неё из notifications WHERE is_read=false МИНУС локально прочитанные (для демо-режима).
     messages: COUNT из messages (role='assistant') с activeGirlId WHERE created_at > last_read_at. Без девушки — 0. */
  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    try {
      const notifRes = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!notifRes.error) {
        setUnreadNotifications(notifRes.count ?? 0);
      }
    } catch {
      // silent
    }

    // Сообщения: только если есть активная девушка
    if (!activeGirlId) {
      setUnreadMessages(0);
      return;
    }

    try {
      const lastReadMap = loadLastReadMap();
      const lastReadIso = lastReadMap[activeGirlId];

      let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('girl_id', activeGirlId)
        .eq('role', 'assistant');

      if (lastReadIso) {
        query = query.gt('created_at', lastReadIso);
      }

      const msgRes = await query;
      if (!msgRes.error) {
        setUnreadMessages(msgRes.count ?? 0);
      }
    } catch {
      // silent
    }
  }, [user, activeGirlId]);

  /* ── Первая загрузка + при смене user / activeGirlId ── */
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
            created_at: string;
            is_read: boolean;
            data?: {
              avatar?: string;
              name?: string;
              text?: string;
              girl_id?: string;
            };
          };
          const data = row.data ?? {};
          const n: AppNotification = {
            id: row.id,
            type: row.type as NotificationType,
            avatar: data.avatar ?? '',
            name: data.name ?? '',
            text: data.text ?? '',
            time: row.created_at,
            read: row.is_read,
            girl_id: data.girl_id,
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
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { role?: string; girl_id?: string };
          // Считаем только входящие от ИИ активной девушки
          if (row.role === 'assistant' && row.girl_id && row.girl_id === activeGirlId) {
            setUnreadMessages((c) => c + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGirlId, pushBanner]);

  /* ── Mark read ── */
  const markLocalRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
    setUnreadNotifications((c) => Math.max(0, c - 1));
  }, []);

  const markManyLocalRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      let added = 0;
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id);
          added++;
        }
      }
      if (added > 0) saveReadIds(next);
      return next;
    });
    setUnreadNotifications((c) => Math.max(0, c - ids.length));
  }, []);

  const markAllLocalRead = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  const resetMessages = useCallback(() => {
    setUnreadMessages(0);
    // Сохраняем timestamp последнего прочтения для активной девушки
    if (activeGirlId) {
      const map = loadLastReadMap();
      map[activeGirlId] = new Date().toISOString();
      saveLastReadMap(map);
    }
  }, [activeGirlId]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      unreadNotifications,
      unreadMessages,
      lastNotification,
      currentBanner,
      readIds,
      markLocalRead,
      markManyLocalRead,
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
      readIds,
      markLocalRead,
      markManyLocalRead,
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
