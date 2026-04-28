import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';import {
  Info,
  Smile,
  Send,
  MessageCircleHeart,
  ExternalLink,
  Gift,
  ChevronDown,
} from 'lucide-react';
import { getLocalizedGirlById, isGirlAsleep, type Girl } from '../data/girls';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { useAssignment } from '../hooks/useAssignment';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/helpers';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import Navbar from '../components/layout/Navbar';
import EmptyState from '../components/ui/EmptyState';
import { GiftPicker } from '../components/GiftPicker';
import { DailyLimitModal } from '../components/DailyLimitModal';
import GirlProfileDrawer, { type GirlProfileLabels } from '../components/GirlProfile/GirlProfileDrawer';
import { useLanguage } from '../i18n';
import { useTelegramVerified } from '../hooks/useTelegramVerified';
import { useStars } from '../hooks/useStars';
import { StarsBalance } from '../components/StarsBalance';
import VerificationModal from '../components/VerificationModal';
import { useToast } from '../hooks/useToast';
import s from './Chat.module.css';

/* ── Types ── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/* ── Constants ── */
const MAX_CHARS = 500;
const WARN_CHARS = 400;
const DAILY_MESSAGE_LIMIT = 100;
const MSG_LIMIT_KEY = 'dailyMsgLimits';
// Hard timeout for the edge fetch — Supabase free edge can cold-start slowly.
// Без этого fetch может висеть бесконечно и блокировать ввод навсегда.
const EDGE_FETCH_TIMEOUT_MS = 45_000;
// Watchdog: верхняя граница ожидания ответа (fetch + schedule + сегменты).
// schedule может быть до ~210s в work-mode, плюс пара сегментов — даём 180с.
// По истечении: разблокируем ввод и показываем тост "она задумалась".
const REPLY_WATCHDOG_MS = 180_000;


/* ── Emoji data (emojis themselves are not translatable) ── */
const EMOJI_DATA: { key: string; emojis: string[] }[] = [
  { key: 'popular', emojis: ['😊', '❤️', '😘', '🥰', '😍', '💕', '✨', '🔥', '💜', '😏', '😉', '🤗', '💋', '😢', '🥺', '😅'] },
  { key: 'faces', emojis: ['😀', '😂', '🤣', '😎', '🤔', '😴', '🙄', '😤', '😭', '🤩', '😇', '🤪', '😜', '🥳', '😋', '🫠'] },
  { key: 'gestures', emojis: ['👋', '👍', '👎', '🙏', '💪', '🤝', '👏', '✌️', '🤞', '🫶', '💅', '🤙', '👀', '🫡', '🙈', '🙉'] },
  { key: 'love', emojis: ['💗', '💖', '💘', '💝', '💓', '💞', '♥️', '🫀', '😻', '💑', '🌹', '🌸', '🦋', '🍓', '🍒', '🍑'] },
];

/* ── Helpers ── */
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function shouldShowDateSep(current: Message, prev: Message | null): boolean {
  if (!prev) return true;
  return current.timestamp.toDateString() !== prev.timestamp.toDateString();
}

/* ── Daily message limit helpers ── */
interface MsgLimits {
  count: number;
  date: string;
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadMsgLimits(): MsgLimits {
  const saved = storage.load<MsgLimits>(MSG_LIMIT_KEY, null);
  if (!saved || saved.date !== getTodayStr()) return { count: 0, date: getTodayStr() };
  return saved;
}

/**
 * Ночной лимит сообщений. Когда она спит — даём 3 «попытки разбудить»,
 * после чего блокируем отправку до утра. Хранится в localStorage пер-girl-per-date.
 */
const NIGHT_ATTEMPTS_KEY_PREFIX = 'night_attempts:';
const NIGHT_ATTEMPTS_LIMIT = 3;
function getNightAttempts(girlId: string): number {
  try {
    const raw = localStorage.getItem(`${NIGHT_ATTEMPTS_KEY_PREFIX}${girlId}:${getTodayStr()}`);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}
function bumpNightAttempts(girlId: string): number {
  const next = getNightAttempts(girlId) + 1;
  try {
    localStorage.setItem(`${NIGHT_ATTEMPTS_KEY_PREFIX}${girlId}:${getTodayStr()}`, String(next));
  } catch {
    // ignore quota
  }
  return next;
}

/* ── Pending reply persistence ──
   Когда AI отдал ответ, мы рассчитываем когда он должен появиться у юзера
   (фазы ignore → online → typing → каждый сегмент). На случай reload/закрытия
   вкладки мы persist'им это расписание в localStorage, чтобы после возвращения:
     1. показать корректный статус ("в сети" / "печатает") вместо "была недавно";
     2. перезапустить таймеры до visible_at последнего сегмента;
     3. дотянуть сегменты из БД когда их visible_at наступит.

   TTL: запись автоматически считается невалидной если lastSegmentAt < now() - 5 min. */
interface PendingReply {
  /** Когда AI получил ответ от edge (Date.now() при создании). */
  startedAt: number;
  /** Конец фазы ignore (когда статус должен стать "в сети"). */
  onlineAt: number;
  /** Конец фазы online (когда должен появиться typing-индикатор). */
  typingAt: number;
  /** visible_at каждого сегмента ответа — когда сегмент появляется в чате. */
  segmentVisibleAt: number[];
  /** До какого момента держать "в сети" после последнего сегмента (обычно +5 min). */
  liveOnlineUntil: number;
}
const PENDING_REPLY_PREFIX = 'pendingReply:';

function pendingReplyKey(userId: string, girlId: string): string {
  return `${PENDING_REPLY_PREFIX}${userId}:${girlId}`;
}
function savePendingReply(userId: string, girlId: string, p: PendingReply): void {
  try {
    localStorage.setItem(pendingReplyKey(userId, girlId), JSON.stringify(p));
  } catch {
    // ignore quota
  }
}
function loadPendingReply(userId: string, girlId: string): PendingReply | null {
  try {
    const raw = localStorage.getItem(pendingReplyKey(userId, girlId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingReply;
    if (
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.onlineAt !== 'number' ||
      typeof parsed.typingAt !== 'number' ||
      !Array.isArray(parsed.segmentVisibleAt)
    ) {
      return null;
    }
    // liveOnlineUntil может отсутствовать в старых записях — backfill.
    if (typeof parsed.liveOnlineUntil !== 'number') {
      const lastSeg = parsed.segmentVisibleAt[parsed.segmentVisibleAt.length - 1] ?? parsed.typingAt;
      parsed.liveOnlineUntil = lastSeg + 300_000;
    }
    // Считаем запись мёртвой если "в сети" окно полностью истекло + 1 мин запаса.
    if (Date.now() > parsed.liveOnlineUntil + 60_000) {
      localStorage.removeItem(pendingReplyKey(userId, girlId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
function clearPendingReply(userId: string, girlId: string): void {
  try {
    localStorage.removeItem(pendingReplyKey(userId, girlId));
  } catch {
    // ignore
  }
}

/* ══════════════════════════════════════
   COMPONENT: Chat
   ══════════════════════════════════════ */
export default function Chat() {
  const { t, tr, lang } = useLanguage();
  const { showToast, ToastContainer } = useToast();
  const { user, session, loading: authLoading } = useAuth();
  const { isVerified: telegramVerified } = useTelegramVerified();
  const { resetMessages } = useNotifications();
  const navigate = useNavigate();
  const { activeGirlId, loading: assignmentLoading } = useAssignment();
  const { balance: starsBalance, refetch: refetchStars } = useStars();

  /* ── Localized girls data ── */
  // (Removed: in 1:1 model we only need the active girl, not the full list)

  /* ── GirlProfileDrawer labels ── */
  const drawerLabels: GirlProfileLabels = useMemo(() => ({
    datingGoal: t('girlProfile.datingGoal'),
    lookingForMale: t('girlProfile.lookingForMale'),
    lookingForFemale: t('girlProfile.lookingForFemale'),
    lookingForAny: t('girlProfile.lookingForAny'),
    age: t('girlProfile.age'),
    aboutMe: t('girlProfile.aboutMe'),
    education: t('girlProfile.education'),
    languages: t('girlProfile.languages'),
    lifestyle: t('girlProfile.lifestyle'),
    appearance: t('girlProfile.appearance'),
    height: t('girlProfile.height'),
    weight: t('girlProfile.weight'),
    compatibility: t('girlProfile.compatibility'),
    checkCommon: t('girlProfile.checkCommon'),
    morePhotos: t('girlProfile.morePhotos'),
    km: t('filters.km'),
    cm: t('filters.cm'),
    kg: t('filters.kg'),
    goalSerious: t('filters.goalSerious'),
    goalFriendship: t('filters.goalFriendship'),
    goalFlirt: t('filters.goalFlirt'),
    goalUndecided: t('filters.goalUndecided'),
    eduSchool: t('filters.eduSchool'),
    eduCollege: t('filters.eduCollege'),
    eduBachelor: t('filters.eduBachelor'),
    eduMaster: t('filters.eduMaster'),
    eduPhd: t('filters.eduPhd'),
    eduNone: t('filters.eduNone'),
    work: t('girlProfile.work'),
    children: t('filters.children'),
    alcohol: t('filters.alcohol'),
    smoking: t('filters.smoking'),
    childrenNone: t('filters.childrenNone'),
    childrenHas: t('filters.childrenHas'),
    childrenWant: t('filters.childrenWant'),
    childrenDontWant: t('filters.childrenDontWant'),
    alcoholNo: t('filters.alcoholNo'),
    alcoholSometimes: t('filters.alcoholSometimes'),
    alcoholYes: t('filters.alcoholYes'),
    smokingNo: t('filters.smokingNo'),
    smokingSometimes: t('filters.smokingSometimes'),
    smokingYes: t('filters.smokingYes'),
    zodiacAries: t('filters.zodiacAries'),
    zodiacTaurus: t('filters.zodiacTaurus'),
    zodiacGemini: t('filters.zodiacGemini'),
    zodiacCancer: t('filters.zodiacCancer'),
    zodiacLeo: t('filters.zodiacLeo'),
    zodiacVirgo: t('filters.zodiacVirgo'),
    zodiacLibra: t('filters.zodiacLibra'),
    zodiacScorpio: t('filters.zodiacScorpio'),
    zodiacSagittarius: t('filters.zodiacSagittarius'),
    zodiacCapricorn: t('filters.zodiacCapricorn'),
    zodiacAquarius: t('filters.zodiacAquarius'),
    zodiacPisces: t('filters.zodiacPisces'),
    bodySlim: t('filters.bodySlim'),
    bodyAthletic: t('filters.bodyAthletic'),
    bodyAverage: t('filters.bodyAverage'),
    bodyCurvy: t('filters.bodyCurvy'),
    bodyPlus: t('filters.bodyPlus'),
    giftsTitle: t('profile.gifts.sectionTitle'),
  }), [t]);

  /* ── Translated constants (depend on current language) ── */
  const QUICK_REPLIES: string[] = tr.chat.quickReplies;

  const EMOJI_CATEGORIES = EMOJI_DATA.map((cat) => ({
    label: tr.chat.emojiCategories[cat.key as keyof typeof tr.chat.emojiCategories] as string,
    emojis: cat.emojis,
  }));

  /* ── formatDateLabel as closure with access to t() ── */
  function formatDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t('chat.dateToday');
    if (date.toDateString() === yesterday.toDateString()) return t('chat.dateYesterday');
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  }

  /* ── State ── */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  /** Динамический статус собеседницы: online пока идёт разговор, иначе offline ("была недавно"). */
  const [liveOnline, setLiveOnline] = useState(false);
  const [currentGirl, setCurrentGirl] = useState<Girl | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [msgLimits, setMsgLimits] = useState<MsgLimits>(loadMsgLimits);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  // Простой "wait for reply" режим: пока AI не ответил — отправлять нельзя.
  // Решает кучу проблем (race-conditions с setMessages, потеря баблов,
  // зависшие fetch'и) и одновременно учит юзера выражать мысль одним
  // сообщением, а не спамить. Watchdog снимает блок если AI завис.
  const [awaitingReply, setAwaitingReply] = useState(false);
  // Зеркало awaitingReply для чтения внутри sendMessage без попадания
  // в его deps — иначе useCallback пересоздавался бы при каждом setAwaitingReply,
  // что вызывает каскад ре-рендеров и в худшем случае перемонтирование Chat.
  const awaitingReplyRef = useRef(false);
  // Индекс ротирующейся подсказки в waitingForReplyHints.
  const hintIndexRef = useRef(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [limitModal, setLimitModal] = useState<{
    open: boolean;
    variant: 'daily_limit' | 'insufficient_stars';
    neededStars?: number;
    inCharacterMessage?: string;
  }>({ open: false, variant: 'daily_limit' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesLeft = DAILY_MESSAGE_LIMIT - msgLimits.count;

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ── Reset unread messages counter on chat open ── */
  useEffect(() => {
    resetMessages();
  }, [resetMessages]);

  /* ── Select girl from assignment ── */
  // Если нет активного assignment → показываем EmptyState (см. ниже в return), НЕ редиректим

  // Установить currentGirl из activeGirlId.
  // ВАЖНО: getLocalizedGirlById возвращает НОВЫЙ объект при каждом вызове (через localize()).
  // Если делать setCurrentGirl(found) безусловно — каждый ре-рендер где меняется lang
  // или просто прокидывается новая ссылка из useAssignment пересоздаёт currentGirl,
  // что триггерит useEffect загрузки сообщений ниже и ЗАТИРАЕТ свежедобавленные баблы
  // (включая только что отправленный AI-ответ). Поэтому обновляем только если
  // реально сменился id или язык контента.
  useEffect(() => {
    if (!activeGirlId) {
      setCurrentGirl(null);
      return;
    }
    const found = getLocalizedGirlById(lang, activeGirlId);
    if (!found) return;
    setCurrentGirl((prev) => {
      // Если id и язык-зависимое имя совпали — возвращаем предыдущий объект (стабильная ссылка).
      if (prev && prev.id === found.id && prev.name === found.name) return prev;
      return found;
    });
  }, [activeGirlId, lang]);



  /* ── Load messages from Supabase ──
     ВАЖНО: зависит от user?.id и currentGirl?.id (примитивов), а не от объектов.
     Иначе любое пересоздание объекта user/currentGirl (новая ссылка при ре-локализации,
     refetch useAssignment, обновление токена сессии) триггерит перезагрузку сообщений
     и ЗАТИРАЕТ только что добавленные через setMessages баблы — в т.ч. AI-ответ,
     который ещё не успел дойти до БД. */
  const userId = user?.id;
  const girlId = currentGirl?.id;

  /**
   * Загрузка истории сообщений из БД с фильтром visible_at <= now().
   * Вынесена в useCallback, чтобы её можно было дёргать повторно
   * (например, после наступления visible_at у запланированного сегмента,
   * чтобы он подтянулся в UI без полного reload).
   *
   * cancelledRef — внешний "флаг отмены"; передаётся из effect'а, который
   * управляет жизненным циклом загрузки. Если ref.current=true — результат
   * игнорируется (защита от race при перемонтировании / смене girlId).
   *
   * silent — если true, не трогаем loadingMessages (нет спиннера). Используется
   * для фонового рефреша в pendingReply-таймерах: пользователь не должен видеть
   * "Загрузка..." когда просто подтягивается отложенный сегмент Алины.
   */
  const loadMessages = useCallback(
    async (cancelledRef?: { current: boolean }, silent: boolean = false) => {
      if (!userId || !girlId) return;
      if (!silent) setLoadingMessages(true);
      console.log('[Chat] loadMessages START', { userId, girlId, silent });
      try {
        let data: Array<{ id: string | number; role: string; content: string; created_at: string }> | null = null;

        const withVisible = await supabase
          .from('messages')
          .select('id, role, content, created_at, visible_at')
          .eq('user_id', userId)
          .eq('girl_id', girlId)
          .lte('visible_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(200);

        if (withVisible.error) {
          if (withVisible.error.code === '42703') {
            console.warn('[Chat] visible_at column missing — falling back to plain select. Apply the migration.');
            const fallback = await supabase
              .from('messages')
              .select('id, role, content, created_at')
              .eq('user_id', userId)
              .eq('girl_id', girlId)
              .order('created_at', { ascending: false })
              .order('id', { ascending: false })
              .limit(200);
            if (fallback.error) {
              console.error('[Chat] loadMessages error:', fallback.error);
              return;
            }
            data = fallback.data;
          } else {
            console.error('[Chat] loadMessages error:', withVisible.error);
            return;
          }
        } else {
          data = withVisible.data;
        }

        const ordered = (data ?? []).slice().reverse();

        console.log('[Chat] loadMessages RESULT', {
          count: ordered.length,
          first: ordered[0]?.created_at,
          last: ordered[ordered.length - 1]?.created_at,
          cancelled: cancelledRef?.current,
        });

        if (!cancelledRef?.current) {
          setMessages(
            ordered.map((row: { id: string | number; role: string; content: string; created_at: string }) => ({
              id: String(row.id),
              role: row.role as 'user' | 'assistant',
              content: row.content,
              timestamp: new Date(row.created_at),
            })),
          );
        }
      } catch (e) {
        console.error('[Chat] loadMessages exception:', e);
      } finally {
        if (!cancelledRef?.current && !silent) setLoadingMessages(false);
      }
    },
    [userId, girlId],
  );

  useEffect(() => {
    console.log('[Chat] loadMessages effect triggered', { userId, girlId });
    if (!userId || !girlId) return;
    const cancelledRef = { current: false };
    loadMessages(cancelledRef);
    return () => { cancelledRef.current = true; };
  }, [userId, girlId, loadMessages]);

  /* ── Restore pending reply after reload ──
     Если до перезагрузки AI был "в процессе" или только что закончил отвечать
     (есть запись в localStorage с liveOnlineUntil в будущем) — восстанавливаем UX:
       • статус "в сети"/"печатает" по текущей фазе;
       • блокируем ввод (awaitingReply) пока сегменты не доставлены;
       • запускаем оставшиеся таймеры до visible_at каждого сегмента,
         после чего silent-перечитываем сообщения из БД (сегмент уже там).
       • держим "в сети" до liveOnlineUntil (5 мин после последнего сегмента).
     Эффект работает только после загрузки текущего girl. */
  useEffect(() => {
    if (!userId || !girlId) return;
    const pending = loadPendingReply(userId, girlId);
    if (!pending) return;

    const now = Date.now();
    const lastSegmentAt =
      pending.segmentVisibleAt[pending.segmentVisibleAt.length - 1] ?? pending.typingAt;

    // Если liveOnlineUntil уже истёк — мёртвая запись, чистим.
    if (now >= pending.liveOnlineUntil) {
      clearPendingReply(userId, girlId);
      return;
    }

    console.log('[Chat] restoring pending reply', {
      now,
      onlineAt: pending.onlineAt,
      typingAt: pending.typingAt,
      lastSegmentAt,
      liveOnlineUntil: pending.liveOnlineUntil,
    });

    // Если все сегменты уже доставлены, но мы ещё в окне "в сети" —
    // просто включаем online-статус и ставим таймер на его выключение.
    if (now >= lastSegmentAt) {
      setLiveOnline(true);
      const offTimer = setTimeout(() => {
        setLiveOnline(false);
        clearPendingReply(userId, girlId);
      }, pending.liveOnlineUntil - now);
      return () => clearTimeout(offTimer);
    }

    // AI ещё "думает" / печатает — блокируем ввод.
    awaitingReplyRef.current = true;
    setAwaitingReply(true);

    // Восстанавливаем UI-фазу.
    if (now >= pending.onlineAt) setLiveOnline(true);
    if (now >= pending.typingAt && now < lastSegmentAt) setIsTyping(true);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const scheduleAt = (atMs: number, fn: () => void) => {
      const delay = Math.max(0, atMs - Date.now());
      timers.push(setTimeout(fn, delay));
    };

    // Phase boundaries.
    if (now < pending.onlineAt) {
      scheduleAt(pending.onlineAt, () => setLiveOnline(true));
    }
    if (now < pending.typingAt) {
      scheduleAt(pending.typingAt, () => setIsTyping(true));
    }

    // Каждый будущий сегмент: при наступлении visible_at silent-перечитываем БД.
    // typing-индикатор гасим за 250 мс до сегмента (как в runAiTurn).
    for (let i = 0; i < pending.segmentVisibleAt.length; i++) {
      const segAt = pending.segmentVisibleAt[i];
      if (segAt <= now) continue;
      scheduleAt(segAt - 250, () => setIsTyping(false));
      scheduleAt(segAt, () => {
        // silent: без спиннера "Загрузка..." — это фоновое подтягивание
        // отложенного сегмента, юзер не должен видеть индикатор загрузки.
        loadMessages(undefined, true);
        // между сегментами снова показываем typing
        if (i < pending.segmentVisibleAt.length - 1) {
          setIsTyping(true);
        }
      });
    }

    // После последнего сегмента: снимаем awaitingReply, гасим typing.
    // НЕ чистим pendingReply — он ещё нужен для liveOnlineUntil окна.
    scheduleAt(lastSegmentAt + 300, () => {
      setIsTyping(false);
      awaitingReplyRef.current = false;
      setAwaitingReply(false);
    });

    // Окно "в сети" — гасим в liveOnlineUntil и чистим запись.
    scheduleAt(pending.liveOnlineUntil, () => {
      setLiveOnline(false);
      clearPendingReply(userId, girlId);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [userId, girlId, loadMessages]);

  /* ── Auto-scroll ──
     Поведение:
     - При открытии/refresh чата: МГНОВЕННО прыгаем в конец (без анимации, глазам
       не видно — чат сразу открыт на последних сообщениях).
     - При новом сообщении в уже открытом чате: плавно скроллим к нему.
     - Typing-индикатор: скроллим только если юзер уже внизу. */
  const prevMessageCountRef = useRef(0);
  const prevGirlIdForScrollRef = useRef<string | undefined>(undefined);
  const initialJumpDoneRef = useRef(false);

  // При смене чата — сброс.
  useEffect(() => {
    prevMessageCountRef.current = 0;
    prevGirlIdForScrollRef.current = currentGirl?.id;
    initialJumpDoneRef.current = false;
  }, [currentGirl?.id]);

  // Первичная загрузка завершилась — мгновенный прыжок в конец, без анимации.
  // useLayoutEffect аналог через прямое присваивание scrollTop + scrollBehavior='auto'.
  useEffect(() => {
    if (loadingMessages) return;
    if (initialJumpDoneRef.current) return;
    if (messages.length === 0) return;
    const el = messagesAreaRef.current;
    if (!el) return;
    el.style.scrollBehavior = 'auto';
    el.scrollTop = el.scrollHeight;
    // На всякий случай ещё раз после rAF — DOM мог ещё не дорисовать высоту.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    prevMessageCountRef.current = messages.length;
    initialJumpDoneRef.current = true;
  }, [loadingMessages, messages.length]);

  // Новое сообщение в уже открытом чате → плавный скролл.
  useEffect(() => {
    if (!initialJumpDoneRef.current) return;
    if (messages.length <= prevMessageCountRef.current) return;
    prevMessageCountRef.current = messages.length;
    const el = messagesAreaRef.current;
    if (!el) return;
    el.style.scrollBehavior = 'smooth';
    el.scrollTop = el.scrollHeight;
    const tm = setTimeout(() => { el.style.scrollBehavior = 'auto'; }, 400);
    return () => clearTimeout(tm);
  }, [messages.length]);

  // Typing — скроллим только если юзер уже внизу.
  useEffect(() => {
    if (!isTyping) return;
    if (!initialJumpDoneRef.current) return;
    const el = messagesAreaRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (!nearBottom) return;
    el.style.scrollBehavior = 'smooth';
    el.scrollTop = el.scrollHeight;
    const tm = setTimeout(() => { el.style.scrollBehavior = 'auto'; }, 400);
    return () => clearTimeout(tm);
  }, [isTyping]);

  /* ── Show/hide scroll-to-bottom button ── */
  useEffect(() => {
    const el = messagesAreaRef.current;
    if (!el) return;
    function onScroll() {
      const dist = el!.scrollHeight - el!.scrollTop - el!.clientHeight;
      // Появляется раньше — при 120px от низа (было 300px)
      setShowScrollBtn(dist > 120);
    }
    // Триггерим один раз при маунте — если контент длинный и уже не у низа
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  /* ── Close emoji picker on click outside ── */  useEffect(() => {
    if (!emojiOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiOpen]);

  /* ── Persist message limits ── */
  useEffect(() => {
    storage.save(MSG_LIMIT_KEY, msgLimits);
  }, [msgLimits]);

  /* ── Insert emoji ── */
  const insertEmoji = useCallback((emoji: string) => {
    if (input.length + emoji.length > MAX_CHARS) return;
    setInput((prev) => prev + emoji);
    textareaRef.current?.focus();
  }, [input]);

  /* ── Auto-resize textarea ── */
  const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setInput(value);
    }
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 5 * 1.5 * 16 + 20) + 'px';
  }, []);

  /* ── Save message to Supabase ── */
  const saveMessage = useCallback(
    async (role: 'user' | 'assistant', content: string, visibleAt?: Date) => {
      if (!user || !currentGirl) return;
      try {
        const row: {
          user_id: string;
          girl_id: string;
          role: 'user' | 'assistant';
          content: string;
          visible_at?: string;
        } = {
          user_id: user.id,
          girl_id: currentGirl.id,
          role,
          content,
        };
        if (visibleAt) row.visible_at = visibleAt.toISOString();
        const { error } = await supabase.from('messages').insert(row);
        if (error) {
          // GRACEFUL FALLBACK: миграция visible_at не применена → повторяем без поля.
          // Сообщение всё равно сохранится (visibleAt будет проигнорирован), а UX-illusion
          // деградирует до in-memory only — это лучше, чем потеря сообщения.
          if (error.code === '42703' && row.visible_at) {
            console.warn('[Chat] visible_at column missing — saving without it. Apply the migration.');
            delete row.visible_at;
            const retry = await supabase.from('messages').insert(row);
            if (retry.error) console.error('[Chat] saveMessage error:', retry.error);
          } else {
            console.error('[Chat] saveMessage error:', error);
          }
        }
      } catch (e) {
        console.error('[Chat] saveMessage exception:', e);
      }
    },
    [user, currentGirl],
  );

  /* ── Зеркало messages в ref для runAiTurn (читает последний контекст вне зависимостей callback) ── */
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* ── Один AI-цикл: fetch → schedule → вывод сегментов. ──
     Читает актуальный контекст из messagesRef, поэтому очередь из нескольких
     быстрых user-сообщений сольётся в ОДИН ответ. */
  const runAiTurn = useCallback(async () => {
    if (!currentGirl) {
      console.warn('[runAiTurn] no currentGirl — bail');
      return;
    }
    console.log('[runAiTurn] START', { girlId: currentGirl.id, hasSession: !!session });
    // Abort the edge fetch if it hangs longer than EDGE_FETCH_TIMEOUT_MS.
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), EDGE_FETCH_TIMEOUT_MS);
    try {
      const recent = messagesRef.current.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      console.log('[runAiTurn] fetching edge', { url: import.meta.env.VITE_EDGE_FUNCTION_URL });
      const res = await fetch(import.meta.env.VITE_EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: recent,
          girlId: currentGirl.id,
          userId: user?.id,
        }),
        signal: abortCtrl.signal,
      });
      clearTimeout(abortTimer);
      console.log('[runAiTurn] edge responded', { status: res.status, ok: res.ok });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setLimitModal({
          open: true,
          variant: 'daily_limit',
          inCharacterMessage: body?.in_character_message as string | undefined,
        });
        return;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[chat-ai] API error', res.status, errText);
        throw new Error(`API error ${res.status}: ${errText}`);
      }

      const data = await res.json();

      if (data?.skipped === 'sleep') {
        console.log('[chat-ai] sleep-skip:', data?.local_time);
        return;
      }

      const rawReply =
        data?.reply ??
        data?.choices?.[0]?.message?.content ??
        data?.content ??
        '';
      const replyFull =
        (typeof rawReply === 'string' ? rawReply.trim() : '') ||
        t('chat.aiFallbackReply');

      const schedule = (data?.schedule as
        | { ignoreMs: number; onlineMs: number; typingMs: number }
        | undefined) ?? {
        ignoreMs: 2000,
        onlineMs: 4000,
        typingMs: 3000,
      };
      console.log('[runAiTurn] schedule', schedule, 'replyLen:', replyFull.length);

      // СТРАХОВКА + UX-иллюзия: сохраняем reply в БД сразу, но с visible_at
      // в будущем. loadMessages фильтрует по visible_at <= now() — поэтому
      // reload во время фазы ignore/online/typing НЕ заспойлерит ответ.
      // Когда время наступает — сообщение становится видимым; локальные
      // setTimeout добавляют его в UI в тот же момент через setMessages.
      // Если таймеры умрут — при следующем reload сообщение подтянется из БД.
      const segmentsForDb = replyFull
        .split(/\n{2,}/)
        .map((str) => str.trim())
        .filter(Boolean)
        .slice(0, 3);

      const paceDelayMs = (tx: string) => Math.min(600 + tx.length * 25, 2800);
      const baseDelayMs = schedule.ignoreMs + schedule.onlineMs + schedule.typingMs;
      const sendStart = Date.now();
      // Cumulative offset для каждого сегмента: первый = baseDelay, далее +pace.
      let cumulative = baseDelayMs;
      const segmentVisibleAt: Date[] = [];
      for (let i = 0; i < segmentsForDb.length; i++) {
        segmentVisibleAt.push(new Date(sendStart + cumulative));
        if (i < segmentsForDb.length - 1) {
          cumulative += paceDelayMs(segmentsForDb[i + 1]) + 250;
        }
      }

      console.log('[runAiTurn] persisting', segmentsForDb.length, 'segments to DB with visible_at');
      for (let i = 0; i < segmentsForDb.length; i++) {
        saveMessage('assistant', segmentsForDb[i], segmentVisibleAt[i]);
      }

      // Persist расписание в localStorage — чтобы reload/закрытие вкладки не
      // сломали illusion. Восстановление в effect'е ниже.
      // liveOnlineUntil — последняя точка когда статус "в сети" гаснет
      // (через 5 мин после последнего сегмента, как и в обычном flow).
      const lastSegmentMs = segmentVisibleAt[segmentVisibleAt.length - 1]?.getTime()
        ?? sendStart + baseDelayMs;
      if (user?.id && currentGirl?.id) {
        savePendingReply(user.id, currentGirl.id, {
          startedAt: sendStart,
          onlineAt: sendStart + schedule.ignoreMs,
          typingAt: sendStart + schedule.ignoreMs + schedule.onlineMs,
          segmentVisibleAt: segmentVisibleAt.map((d) => d.getTime()),
          liveOnlineUntil: lastSegmentMs + 300_000,
        });
      }

      console.log('[runAiTurn] phase=ignore start, waiting', schedule.ignoreMs, 'ms');
      await new Promise((r) => setTimeout(r, schedule.ignoreMs));
      console.log('[runAiTurn] phase=ignore done → setLiveOnline(true)');
      setLiveOnline(true);
      await new Promise((r) => setTimeout(r, schedule.onlineMs));
      console.log('[runAiTurn] phase=online done → setIsTyping(true)');
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, schedule.typingMs));
      console.log('[runAiTurn] phase=typing done → emitting segments');
      setIsTyping(false);

      const segments = segmentsForDb;
      console.log('[runAiTurn] segments count:', segments.length);

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        console.log('[runAiTurn] emit segment', i + 1, '/', segments.length);

        // Дедуп: если этот сегмент уже есть в messages (подтянулся из БД при
        // reload — например visible_at уже наступил) — не добавляем повторно.
        const alreadyShown = messagesRef.current.some(
          (m) => m.role === 'assistant' && m.content === seg,
        );
        if (alreadyShown) {
          console.log('[runAiTurn] segment already in UI (loaded from DB) — skip');
          continue;
        }

        const aiMsg: Message = {
          id: genId(),
          role: 'assistant',
          content: seg,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        // saveMessage уже вызван выше для всех сегментов — не дублируем.

        if (i < segments.length - 1) {
          setIsTyping(true);
          await new Promise((r) => setTimeout(r, paceDelayMs(segments[i + 1])));
          setIsTyping(false);
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      setTimeout(() => setLiveOnline(false), 300_000);
    } catch (err) {
      console.error('[chat-ai] fallback triggered:', err);
      const fallbackReplies: string[] = tr.chat.fallbackReplies;
      const fallback =
        fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

      setLiveOnline(true);
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 1200));
      setIsTyping(false);
      const aiMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: fallback,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      saveMessage('assistant', fallback);
      setTimeout(() => setLiveOnline(false), 300_000);
      // Fallback — pendingReply теряет смысл (расписание не соответствует реальности).
      if (user?.id && currentGirl?.id) {
        clearPendingReply(user.id, currentGirl.id);
      }
    } finally {
      console.log('[runAiTurn] FINALLY');
      clearTimeout(abortTimer);
      setTimeout(() => setIsTyping(false), 400);
      // ВАЖНО: pendingReply здесь НЕ чистим. Он содержит liveOnlineUntil
      // (5 мин окно "в сети" после ответа) — нужен чтобы reload в этом
      // окне корректно показал статус "в сети". Запись сама истечёт по TTL.
    }
  }, [currentGirl, session, user, t, tr, saveMessage]);

  /* ── Send message ── */
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || !currentGirl) return;

      // Если AI ещё печатает / в процессе ответа — НЕ принимаем второе сообщение.
      // Читаем актуальное значение из ref'а: state-версия awaitingReply в deps
      // привела бы к пересозданию useCallback и каскаду ре-рендеров.
      if (awaitingReplyRef.current) {
        const hints: string[] = tr.chat.waitingForReplyHints;
        const hint = hints[hintIndexRef.current % hints.length];
        hintIndexRef.current += 1;
        showToast(hint, 'info');
        return;
      }

      // Ночной лимит. Если она спит в её timezone:
      //   • первые NIGHT_ATTEMPTS_LIMIT попыток — мягкое предупреждение «она спит»,
      //     но сообщение всё-таки уходит (edge сгенерирует ответ с visible_at утром).
      //   • дальше — жёсткий блок: уважение к её личному пространству.
      if (currentGirl.sleepSchedule && isGirlAsleep(currentGirl.sleepSchedule)) {
        const attempts = getNightAttempts(currentGirl.id);
        if (attempts >= NIGHT_ATTEMPTS_LIMIT) {
          showToast(t('chat.nightHardBlock'), 'warning');
          return;
        }
        bumpNightAttempts(currentGirl.id);
        showToast(t('chat.nightSoftHint'), 'info');
        // продолжаем отправку
      }

      // Check daily limit
      if (messagesLeft <= 0) {
        setLimitModal({ open: true, variant: 'daily_limit' });
        return;
      }

      // Increment message count
      setMsgLimits((prev) => ({ ...prev, count: prev.count + 1 }));

      // Add user message
      const userMsg: Message = {
        id: genId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      saveMessage('user', content);

      // Зеркало для runAiTurn — он читает контекст из ref.
      messagesRef.current = [...messagesRef.current, userMsg];

      // Статус будет управляться расписанием с сервера:
      // фаза "игнор" → "в сети" → "печатает" → ответ.
      // НЕ сбрасываем liveOnline здесь: если она уже была online после прошлого
      // ответа (5-минутное окно), пусть остаётся online — иначе пользователь
      // видит «офлайн-вспышку» сразу после отправки своего сообщения.
      // isTyping тоже не трогаем: runAiTurn включит его в нужной фазе.

      // Лочим инпут до прихода ответа. Watchdog снимет лок если runAiTurn
      // зависнет дольше REPLY_WATCHDOG_MS (cold start edge, network freeze).
      awaitingReplyRef.current = true;
      setAwaitingReply(true);
      const watchdog = setTimeout(() => {
        console.warn('[Chat] reply watchdog fired — releasing input lock');
        awaitingReplyRef.current = false;
        setAwaitingReply(false);
        showToast(t('chat.waitingForReplyStuck'), 'warning');
      }, REPLY_WATCHDOG_MS);

      console.log('[Chat] sendMessage → runAiTurn START');
      try {
        await runAiTurn();
        console.log('[Chat] runAiTurn DONE');
      } catch (e) {
        console.error('[Chat] runAiTurn threw:', e);
      } finally {
        clearTimeout(watchdog);
        awaitingReplyRef.current = false;
        setAwaitingReply(false);
      }
    },
    [input, currentGirl, tr, t, showToast, saveMessage, messagesLeft, runAiTurn],
  );

  /* ── Enter to send ── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  /* ── Loading ── */
  if (authLoading || assignmentLoading) {
    return (
      <div className={s.loadingPage}>
        <div className={s.loadingSpinner} />
      </div>
    );
  }

  if (!user) return null;

  /* ── No active girl → EmptyState with CTA to /feed ── */
  if (!activeGirlId) {
    return (
      <PageTransition>
        <Navbar />
        <div className={s.chatPage}>
          <EmptyState
            icon={<MessageCircleHeart size={56} strokeWidth={1.5} />}
            title={t('chat.noGirlTitle')}
            description={t('chat.noGirlText')}
            ctaLabel={t('chat.noGirlCta')}
            ctaTo="/feed"
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <Navbar />
    <div className={s.chatPage}>
      {/* ════════ Mobile overlay ════════ */}
      <div
        className={`${s.overlay} ${profileOpen ? s.overlayVisible : ''}`}
        onClick={() => setProfileOpen(false)}
      />

      {/* Левая панель удалена — в концепции 1:1 нет списка чатов */}

      {/* ════════ CENTER — Chat ════════ */}
      <main className={s.chatPanel} id="main-content">
        {/* ── Header ── */}
        {currentGirl && (
          <div className={s.chatHeader}>
            <button
              type="button"
              className={s.headerAvatarBtn}
              onClick={() => setDrawerOpen(true)}
              aria-label={t('chat.viewFullProfile')}
            >
              <Avatar
                src={currentGirl.photo}
                alt={currentGirl.name}
                size="sm"
                online={liveOnline}
              />
            </button>

            <div className={s.chatHeaderInfo}>
              <div className={s.chatHeaderName}>{currentGirl.name}</div>
              <div className={`${s.chatHeaderStatus} ${isTyping ? s.typing : liveOnline ? s.online : s.offline}`}>
                <span role="status" aria-live="assertive">
                {isTyping ? (
                  t('chat.statusTyping')
                ) : liveOnline ? (
                  <>
                    <span className={s.statusDot} />
                    {t('chat.statusOnline')}
                  </>
                ) : (
                  t('chat.statusLastSeen')
                )}
                </span>
              </div>
            </div>

            <div className={s.chatHeaderActions}>
              <StarsBalance balance={starsBalance} onClick={() => navigate('/shop')} />
              <button
                className={`${s.headerBtn} ${profileOpen ? s.headerBtnActive : ''}`}
                onClick={() => setProfileOpen((v) => !v)}
                aria-label={t('chat.profileAriaLabel')}
              >
                <Info size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── Messages ── */}
        {!currentGirl || loadingMessages ? (
          <div className={s.emptyChat}>
            <div className={s.emptyChatIcon}>
              <MessageCircleHeart size={28} />
            </div>
            <h3 className={s.emptyChatTitle}>
              {loadingMessages ? t('chat.loadingTitle') : t('chat.selectChat')}
            </h3>
            <p className={s.emptyChatText}>
              {loadingMessages
                ? t('chat.loadingText')
                : t('chat.clickDialog')}
            </p>
          </div>
        ) : (
          <>
            <div ref={messagesAreaRef} className={s.messagesArea} role="log" aria-label={t('chat.messagesAriaLabel')} aria-live="polite">
              {messages.length === 0 && !isTyping && (
                <div className={s.emptyChat}>
                  <div className={s.emptyChatIcon}>
                    <MessageCircleHeart size={28} />
                  </div>
                  <h3 className={s.emptyChatTitle}>{t('chat.startConversation')}</h3>
                  <p className={s.emptyChatText}>
                    {t('chat.sayNice', { name: currentGirl.name })}
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages
                  .filter((msg) => !/^\[GIFT:[^\]]+\]$/.test(msg.content?.trim() ?? ''))
                  .map((msg, i, arr) => {
                  return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {shouldShowDateSep(msg, arr[i - 1] ?? null) && (
                      <div className={s.dateSeparator}>
                        <span className={s.dateLabel}>{formatDateLabel(msg.timestamp)}</span>
                      </div>
                    )}

                    <motion.div
                      className={`${s.messageRow} ${
                        msg.role === 'user' ? s.messageRowUser : s.messageRowGirl
                      }`}
                      initial={{ opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div
                        className={`${s.messageBubble} ${
                          msg.role === 'user' ? s.messageBubbleUser : s.messageBubbleGirl
                        }`}
                      >
                        <p className={s.messageText}>{msg.content}</p>
                        <div className={s.messageTime}>{formatTime(msg.timestamp)}</div>
                      </div>
                    </motion.div>
                  </div>
                  );
                })}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    className={s.typingIndicator}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <span className={s.typingDot} />
                    <span className={s.typingDot} />
                    <span className={s.typingDot} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Scroll to bottom button ── */}
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  className={s.scrollToBottomBtn}
                  onClick={() => {
                    const el = messagesAreaRef.current;
                    if (!el) return;
                    el.style.scrollBehavior = 'smooth';
                    el.scrollTop = el.scrollHeight;
                  }}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ duration: 0.18 }}
                  aria-label="Прокрутить вниз"
                >
                  <ChevronDown size={20} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* ── Quick replies ── */}
            {messages.length === 0 && (
              <div className={s.quickReplies} role="group" aria-label={t('chat.quickRepliesAriaLabel')}>
                {QUICK_REPLIES.map((text) => (
                  <button
                    key={text}
                    className={s.quickReplyBtn}
                    onClick={() => sendMessage(text)}
                    aria-label={`Send: ${text}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input area ── */}
            {telegramVerified === false ? (
              <div className={s.verificationBanner}>
                <span>{t('verification.chatBlocked')}</span>
                <button
                  type="button"
                  className={s.verifyNowBtn}
                  onClick={() => setVerifyModalOpen(true)}
                >
                  {t('verification.verifyBtn')}
                </button>
              </div>
            ) : (
            <div className={s.inputArea}>
              {/* Message limit counter */}
              <div className={s.msgLimitBar}>
                <span className={`${s.msgLimitText} ${messagesLeft <= 10 ? s.msgLimitWarn : ''}`}>
                  {t('chat.messagesLeft', { count: String(messagesLeft), total: String(DAILY_MESSAGE_LIMIT) })}
                </span>
              </div>

              <div className={s.inputRow}>
                <div className={s.emojiWrap} ref={emojiPickerRef}>
                  <button
                    className={`${s.emojiBtn} ${emojiOpen ? s.emojiBtnActive : ''}`}
                    onClick={() => { setEmojiOpen((v) => !v); }}
                    aria-label={t('chat.emojiAriaLabel')}
                    aria-expanded={emojiOpen}
                  >
                    <Smile size={22} />
                  </button>

                  <AnimatePresence>
                    {emojiOpen && (
                      <motion.div
                        className={s.emojiPicker}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        {EMOJI_CATEGORIES.map((cat) => (
                          <div key={cat.label} className={s.emojiCategory}>
                            <div className={s.emojiCategoryLabel}>{cat.label}</div>
                            <div className={s.emojiGrid}>
                              {cat.emojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  className={s.emojiItem}
                                  onClick={() => insertEmoji(emoji)}
                                  type="button"
                                  aria-label={`Emoji ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                    className={s.giftBtn}
                    onClick={() => { setGiftPickerOpen(true); setEmojiOpen(false); }}
                    aria-label={t('gifts.open')}
                    type="button"
                  >
                    <Gift size={22} />
                  </button>

                <div className={s.textareaWrap}>
                  <textarea
                    ref={textareaRef}
                    className={s.textarea}
                    rows={1}
                    placeholder={messagesLeft <= 0 ? t('chat.limitReached') : t('chat.inputPlaceholder')}
                    aria-label={t('chat.inputAriaLabel')}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={messagesLeft <= 0}
                  />
                  {input.length > 0 && (
                    <span
                      className={`${s.charCounter} ${
                        input.length >= MAX_CHARS
                          ? s.charCounterLimit
                          : input.length >= WARN_CHARS
                            ? s.charCounterWarn
                            : ''
                      }`}
                    >
                      {input.length}/{MAX_CHARS}
                    </span>
                  )}
                </div>

                <motion.button
                  className={s.sendBtn}
                  onClick={() => sendMessage()}
                  disabled={(!input.trim() && !isTyping) || messagesLeft <= 0}
                  data-waiting={awaitingReply || undefined}
                  aria-label={t('chat.sendAriaLabel')}
                  whileTap={{ scale: awaitingReply ? 1 : 0.88 }}
                  whileHover={{ scale: awaitingReply ? 1 : 1.08 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Send size={20} />
                </motion.button>
              </div>
            </div>
            )}
          </>
        )}
      </main>

      {/* ════════ RIGHT PANEL — Profile ════════ */}
      {currentGirl && (
        <aside
          className={`${s.profilePanel} ${profileOpen ? s.profilePanelOpen : ''} ${
            !profileOpen ? s.profilePanelHidden : ''
          }`}
        >
          <img
            className={s.profilePhoto}
            src={currentGirl.photo}
            alt={currentGirl.name}
          />

          <div className={s.profileBody}>
            <div className={s.profileNameRow}>
              <span className={s.profileName}>{currentGirl.name}</span>
              <span className={s.profileAge}>{currentGirl.age}</span>
            </div>

            <div className={s.profileStatusRow}>
              <span
                className={`${s.profileStatusDot} ${
                  currentGirl.online ? s.profileStatusDotOnline : s.profileStatusDotOffline
                }`}
              />
              <span className={s.profileStatusText}>
                {currentGirl.online ? t('chat.profileOnline') : t('chat.profileOffline')}
              </span>
            </div>

            <p className={s.profileBio}>{currentGirl.bio}</p>

            <div className={s.profileTags}>
              {currentGirl.tags.map((tag) => (
                <span key={tag} className={s.profileTag}>
                  {tag}
                </span>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<ExternalLink size={14} />}
              className={s.profileLinkBtn}
              onClick={() => setDrawerOpen(true)}
            >
              {t('chat.viewFullProfile')}
            </Button>
          </div>
        </aside>
      )}
    </div>

      <DailyLimitModal
        open={limitModal.open}
        variant={limitModal.variant}
        neededStars={limitModal.neededStars}
        inCharacterMessage={limitModal.inCharacterMessage}
        onClose={() => setLimitModal((s) => ({ ...s, open: false }))}
        onBought={() => {
          setMsgLimits({ count: 0, date: new Date().toISOString().slice(0, 10) });
          void refetchStars();
        }}
      />

      {currentGirl && (
        <GiftPicker
          open={giftPickerOpen}
          girlId={currentGirl.id}
          onClose={() => setGiftPickerOpen(false)}
          onSent={() => { setTimeout(() => void refetchStars(), 1200); }}
        />
      )}

      <GirlProfileDrawer
        open={drawerOpen}
        girl={currentGirl ?? null}
        onClose={() => setDrawerOpen(false)}
        t={drawerLabels}
        hideActionBar
      />

      <VerificationModal
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
      />

      <ToastContainer />
    </PageTransition>
  );
}
