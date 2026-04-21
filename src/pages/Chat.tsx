import { useState, useEffect, useRef, useCallback, useMemo, type KeyboardEvent, type ChangeEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Info,
  Smile,
  Send,
  Menu,
  MessageCircleHeart,
  ExternalLink,
  Gift,
  Megaphone,
  Star,
} from 'lucide-react';
import { getLocalizedGirls, getLocalizedGirlById, type Girl } from '../data/girls';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/helpers';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import Navbar from '../components/layout/Navbar';
import { Paywall } from '../components/Paywall';
import GirlProfileDrawer, { type GirlProfileLabels } from '../components/GirlProfile/GirlProfileDrawer';
import { useLanguage } from '../i18n';
import { useTelegramVerified } from '../hooks/useTelegramVerified';
import VerificationModal from '../components/VerificationModal';
import s from './Chat.module.css';

/* ── Types ── */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DialogPreview {
  girl: Girl;
  lastMessage: string;
  time: string;
  unread: number;
}

/* ── Constants ── */
const MAX_CHARS = 500;
const WARN_CHARS = 400;
const DAILY_MESSAGE_LIMIT = 100;
const MSG_LIMIT_KEY = 'dailyMsgLimits';


/* ── Emoji data (emojis themselves are not translatable) ── */
const EMOJI_DATA: { key: string; emojis: string[] }[] = [
  { key: 'popular', emojis: ['😊', '❤️', '😘', '🥰', '😍', '💕', '✨', '🔥', '💜', '😏', '😉', '🤗', '💋', '😢', '🥺', '😅'] },
  { key: 'faces', emojis: ['😀', '😂', '🤣', '😎', '🤔', '😴', '🙄', '😤', '😭', '🤩', '😇', '🤪', '😜', '🥳', '😋', '🫠'] },
  { key: 'gestures', emojis: ['👋', '👍', '👎', '🙏', '💪', '🤝', '👏', '✌️', '🤞', '🫶', '💅', '🤙', '👀', '🫡', '🙈', '🙉'] },
  { key: 'love', emojis: ['💗', '💖', '💘', '💝', '💓', '💞', '♥️', '🫀', '😻', '💑', '🌹', '🌸', '🦋', '🍓', '🍒', '🍑'] },
];

/* ── Gift items for chat gift picker ── */
const GIFT_ITEMS = [
  { id: 'rose', emoji: '\u{1F339}' },
  { id: 'heart', emoji: '\u{2764}\u{FE0F}' },
  { id: 'star', emoji: '\u{2B50}' },
  { id: 'diamond', emoji: '\u{1F48E}' },
  { id: 'teddy', emoji: '\u{1F9F8}' },
  { id: 'chocolate', emoji: '\u{1F36B}' },
  { id: 'ring', emoji: '\u{1F48D}' },
  { id: 'kiss', emoji: '\u{1F48B}' },
] as const;

/** Check if a message is a gift message */
const GIFT_PREFIX = '[GIFT:';
function parseGiftMessage(content: string): { id: string; emoji: string } | null {
  if (!content.startsWith(GIFT_PREFIX)) return null;
  const endIdx = content.indexOf(']');
  if (endIdx === -1) return null;
  const giftId = content.slice(GIFT_PREFIX.length, endIdx);
  const gift = GIFT_ITEMS.find((g) => g.id === giftId);
  return gift ? { id: gift.id, emoji: gift.emoji } : null;
}

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

/* ══════════════════════════════════════
   COMPONENT: Chat
   ══════════════════════════════════════ */
export default function Chat() {
  const { t, tr, lang } = useLanguage();
  const { user, session, loading: authLoading } = useAuth();
  const { isVerified: telegramVerified } = useTelegramVerified();
  const { resetMessages, unreadNotifications } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Localized girls data ── */
  const girls = useMemo(() => getLocalizedGirls(lang), [lang]);

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
  const [dialogsOpen, setDialogsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dialogs, setDialogs] = useState<DialogPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [msgLimits, setMsgLimits] = useState<MsgLimits>(loadMsgLimits);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const giftPickerRef = useRef<HTMLDivElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  /* ── Select girl from URL ── */
  useEffect(() => {
    const girlId = searchParams.get('girl');
    if (girlId) {
      const found = getLocalizedGirlById(lang, girlId);
      if (found) {
        setCurrentGirl(found);
        return;
      }
    }
    setCurrentGirl(girls[0]);
  }, [searchParams, lang, girls]);



  /* ── Load real dialog previews from Supabase ── */
  useEffect(() => {
    if (!user) return;

    async function loadDialogs() {
      const previews: DialogPreview[] = [];

      for (const girl of girls) {
        try {
          const { data } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('user_id', user!.id)
            .eq('girl_id', girl.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            const lastMsg = data[0];
            const d = new Date(lastMsg.created_at);
            const now = new Date();
            const diff = now.getTime() - d.getTime();
            let timeStr: string;
            if (diff < 60000) timeStr = 'now';
            else if (diff < 3600000) timeStr = `${Math.floor(diff / 60000)}m`;
            else if (diff < 86400000) timeStr = `${Math.floor(diff / 3600000)}h`;
            else timeStr = `${Math.floor(diff / 86400000)}d`;

            previews.push({
              girl,
              lastMessage: lastMsg.content.length > 50
                ? lastMsg.content.slice(0, 50) + '...'
                : lastMsg.content,
              time: timeStr,
              unread: 0,
            });
          } else {
            previews.push({
              girl,
              lastMessage: t('chat.startChatting'),
              time: '',
              unread: 0,
            });
          }
        } catch {
          previews.push({
            girl,
            lastMessage: t('chat.startChatting'),
            time: '',
            unread: 0,
          });
        }
      }

      setDialogs(previews);
    }

    loadDialogs();
  }, [user, girls, t]);

  /* ── Обновить превью текущего диалога когда приходят новые сообщения ── */
  useEffect(() => {
    if (!currentGirl || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const d = new Date(last.timestamp);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    let timeStr: string;
    if (diff < 60000) timeStr = 'now';
    else if (diff < 3600000) timeStr = `${Math.floor(diff / 60000)}m`;
    else if (diff < 86400000) timeStr = `${Math.floor(diff / 3600000)}h`;
    else timeStr = `${Math.floor(diff / 86400000)}d`;
    const preview = last.content.length > 50 ? last.content.slice(0, 50) + '...' : last.content;
    setDialogs((prev) =>
      prev.map((d) =>
        d.girl.id === currentGirl.id
          ? { ...d, lastMessage: preview, time: timeStr }
          : d,
      ),
    );
  }, [messages, currentGirl]);

  /* ── Load messages from Supabase ── */
  useEffect(() => {
    if (!user || !currentGirl) return;

    let cancelled = false;
    async function load() {
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, role, content, created_at')
          .eq('user_id', user!.id)
          .eq('girl_id', currentGirl!.id)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(200);

        if (error) {
          console.error('[Chat] loadMessages error:', error);
          return;
        }

        if (!cancelled && data) {
          setMessages(
            data.map((row: { id: string | number; role: string; content: string; created_at: string }) => ({
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
        if (!cancelled) setLoadingMessages(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, currentGirl]);

  /* ── Auto-scroll to bottom ── */
  // При смене чата (currentGirl меняется) — мгновенно в конец без анимации.
  // При новом сообщении в уже открытом чате — плавно.
  const prevGirlIdRef = useRef<string | undefined>(undefined);
  const initialScrollDoneRef = useRef(false);

  // Сбрасываем флаг при смене чата
  useEffect(() => {
    initialScrollDoneRef.current = false;
    prevGirlIdRef.current = currentGirl?.id;
  }, [currentGirl?.id]);

  // Когда загрузка завершилась — мгновенно прыгаем в конец (первый раз для этого чата)
  useEffect(() => {
    if (loadingMessages) return;
    if (initialScrollDoneRef.current) return;
    initialScrollDoneRef.current = true;
    if (!messagesAreaRef.current) return;
    messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
  }, [loadingMessages]);

  // Плавный скролл при каждом новом сообщении/typing ПОСЛЕ первоначального скролла
  useEffect(() => {
    if (!initialScrollDoneRef.current) return;
    const el = messagesAreaRef.current;
    if (!el) return;
    el.style.scrollBehavior = 'smooth';
    el.scrollTop = el.scrollHeight;
    // Убираем smooth обратно после анимации чтобы не мешал следующему instant-скроллу
    const t = setTimeout(() => { el.style.scrollBehavior = 'auto'; }, 400);
    return () => clearTimeout(t);
  }, [messages, isTyping]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Close emoji picker on click outside ── */
  useEffect(() => {
    if (!emojiOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiOpen]);

  /* ── Close gift picker on click outside ── */
  useEffect(() => {
    if (!giftOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (giftPickerRef.current && !giftPickerRef.current.contains(e.target as Node)) {
        setGiftOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [giftOpen]);

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
    async (role: 'user' | 'assistant', content: string) => {
      if (!user || !currentGirl) return;
      try {
        const { error } = await supabase.from('messages').insert({
          user_id: user.id,
          girl_id: currentGirl.id,
          role,
          content,
        });
        if (error) {
          console.error('[Chat] saveMessage error:', error);
        }
      } catch (e) {
        console.error('[Chat] saveMessage exception:', e);
      }
    },
    [user, currentGirl],
  );

  /* ── Send message ── */
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || !currentGirl) return;

      // Check daily limit
      if (messagesLeft <= 0) {
        setPaywallOpen(true);
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

      // Update dialog preview
      setDialogs((prev) =>
        prev.map((d) =>
          d.girl.id === currentGirl.id
            ? { ...d, lastMessage: content.length > 50 ? content.slice(0, 50) + '...' : content, time: 'now' }
            : d,
        ),
      );

      // Статус будет управляться расписанием с сервера:
      // фаза "игнор" (offline) → "в сети" (online) → "печатает" (typing) → ответ.
      setIsTyping(false);
      setLiveOnline(false);

      try {
        // Last 8 messages for context
        const recent = [...messages, userMsg].slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        }));

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
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error('[chat-ai] API error', res.status, errText);
          throw new Error(`API error ${res.status}: ${errText}`);
        }

        const data = await res.json();

        // Sleep-режим: девушка спит, сервер намеренно не ответил.
        // Ничего не показываем — ни "онлайн", ни "печатает". Сообщение юзера
        // остаётся, утром сработает проактивность ("привет, я спала...").
        if (data?.skipped === 'sleep') {
          console.log('[chat-ai] sleep-skip:', data?.local_time);
          return;
        }

        const rawReply = data?.reply
          ?? data?.choices?.[0]?.message?.content
          ?? data?.content
          ?? '';
        const replyFull = (typeof rawReply === 'string' ? rawReply.trim() : '')
          || t('chat.aiFallbackReply');

        // Расписание показа: сервер даёт ignore/online/typing в мс.
        // Fallback если по какой-то причине нет schedule: короткие дефолты.
        const schedule = (data?.schedule as
          | { ignoreMs: number; onlineMs: number; typingMs: number }
          | undefined) ?? {
          ignoreMs: 2000,
          onlineMs: 4000,
          typingMs: 3000,
        };

        // Фаза 1: "игнор" — статус offline, ничего не показываем.
        await new Promise((r) => setTimeout(r, schedule.ignoreMs));

        // Фаза 2: "в сети" — она увидела чат, думает как ответить.
        setLiveOnline(true);
        await new Promise((r) => setTimeout(r, schedule.onlineMs));

        // Фаза 3: "печатает" — индикатор typing, всё ещё online.
        setIsTyping(true);
        await new Promise((r) => setTimeout(r, schedule.typingMs));
        setIsTyping(false);

        // Разбиваем на сегменты: модели разрешено слать несколько сообщений через \n\n.
        // Отсекаем пустые, ограничиваем максимум 3 сегмента.
        const segments = replyFull
          .split(/\n{2,}/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3);

        // Пауза между сегментами: зависит от длины следующего, имитирует набор текста.
        const paceDelay = (text: string) =>
          Math.min(600 + text.length * 25, 2800);

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];

          const aiMsg: Message = {
            id: genId(),
            role: 'assistant',
            content: seg,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          saveMessage('assistant', seg);

          // Перед следующим сегментом — короткая "печать"
          if (i < segments.length - 1) {
            setIsTyping(true);
            await new Promise((r) => setTimeout(r, paceDelay(segments[i + 1])));
            setIsTyping(false);
            await new Promise((r) => setTimeout(r, 250));
          }
        }

        // После ответа ещё ~90с держим online, потом "была недавно".
        setTimeout(() => setLiveOnline(false), 90_000);

        const lastSeg = segments[segments.length - 1] ?? replyFull;
        // Update dialog preview with last segment
        setDialogs((prev) =>
          prev.map((d) =>
            d.girl.id === currentGirl.id
              ? { ...d, lastMessage: lastSeg.length > 50 ? lastSeg.slice(0, 50) + '...' : lastSeg, time: 'now' }
              : d,
          ),
        );
      } catch (err) {
        console.error('[chat-ai] fallback triggered:', err);
        const fallbackReplies: string[] = tr.chat.fallbackReplies;
        const fallback = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

        setLiveOnline(true);
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const aiMsg: Message = {
            id: genId(),
            role: 'assistant',
            content: fallback,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          saveMessage('assistant', fallback);
          setTimeout(() => setLiveOnline(false), 30_000);
        }, 1200);
      } finally {
        setTimeout(() => setIsTyping(false), 400);
      }
    },
    [input, currentGirl, messages, session, saveMessage, messagesLeft, t, tr],
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

  /* ── Send gift as special message ── */
  const sendGift = useCallback(
    (giftId: string) => {
      setGiftOpen(false);
      sendMessage(`[GIFT:${giftId}]`);
    },
    [sendMessage],
  );

  /* ── Switch girl ── */
  const switchGirl = useCallback(
    (girl: Girl) => {
      setCurrentGirl(girl);
      setMessages([]);
      setSearchParams({ girl: girl.id });
      setDialogsOpen(false);
    },
    [setSearchParams],
  );

  /* ── Close side panels ── */
  const closeOverlays = useCallback(() => {
    setDialogsOpen(false);
    setProfileOpen(false);
  }, []);

  /* ── Filter dialogs ── */
  const filteredDialogs = searchQuery
    ? dialogs.filter((d) => d.girl.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : dialogs;

  /* ── Loading ── */
  if (authLoading) {
    return (
      <div className={s.loadingPage}>
        <div className={s.loadingSpinner} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageTransition>
    <Navbar />
    <div className={s.chatPage}>
      {/* ════════ Mobile overlay ════════ */}
      <div
        className={`${s.overlay} ${dialogsOpen || profileOpen ? s.overlayVisible : ''}`}
        onClick={closeOverlays}
      />

      {/* ════════ LEFT PANEL — Dialogs ════════ */}
      <aside className={`${s.dialogPanel} ${dialogsOpen ? s.dialogPanelOpen : ''}`}>
        <div className={s.dialogHeader}>
          <h2 className={s.dialogTitle}>{t('chat.dialogTitle')}</h2>
          <div className={s.searchBox}>
            <Search className={s.searchIcon} />
            <input
              className={s.searchInput}
              type="text"
              placeholder={t('chat.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('chat.searchAriaLabel')}
            />
          </div>
        </div>

        <div className={s.dialogList} role="listbox" aria-label={t('chat.chatListAriaLabel')}>
          {/* ── Системный канал «Оповещения» ── */}
          <div
            className={s.dialogRow}
            onClick={() => navigate('/notifications')}
            role="option"
            aria-selected={false}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/notifications'); } }}
          >
            <div className={s.notificationAvatar}>
              <Megaphone size={22} />
            </div>
            <div className={s.dialogInfo}>
              <div className={s.dialogTop}>
                <span className={s.dialogName}>
                  {t('chat.notificationsName')}
                  <span className={s.nameOnlineDot} />
                </span>
                <span className={s.dialogTime} />
              </div>
              <div className={s.dialogBottom}>
                <p className={s.dialogPreview}>{t('chat.notificationsPreview')}</p>
                <div className={s.dialogBadges}>
                  <Star size={14} className={s.starIcon} fill="currentColor" />
                  {unreadNotifications > 0 && (
                    <span className={s.unreadBadge}>{unreadNotifications}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Обычные диалоги ── */}
          {filteredDialogs.map((d) => {
            // Онлайн-статус: только Алина имеет реальную persona в БД и динамический liveOnline.
            // Остальные девушки пока офлайн до появления их personas.
            const isActive = currentGirl?.id === d.girl.id;
            const hasPersona = d.girl.id === 'alina';
            const isOnline = hasPersona ? (isActive ? liveOnline : false) : false;
            return (
            <div
              key={d.girl.id}
              className={`${s.dialogRow} ${isActive ? s.dialogRowActive : ''}`}
              onClick={() => switchGirl(d.girl)}
              role="option"
              aria-selected={isActive}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchGirl(d.girl); } }}
            >
              <Avatar src={d.girl.photo} alt={d.girl.name} size="sm" online={isOnline} />
              <div className={s.dialogInfo}>
                <div className={s.dialogTop}>
                  <span className={s.dialogName}>
                    {d.girl.name}
                    {isOnline && <span className={s.nameOnlineDot} />}
                  </span>
                  {d.time && <span className={s.dialogTime}>{d.time}</span>}
                </div>
                <div className={s.dialogBottom}>
                  <p className={s.dialogPreview}>{d.lastMessage}</p>
                  {d.unread > 0 && (
                    <div className={s.dialogBadges}>
                      <span className={s.unreadBadge}>{d.unread}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </aside>

      {/* ════════ CENTER — Chat ════════ */}
      <main className={s.chatPanel} id="main-content">
        {/* ── Header ── */}
        {currentGirl && (
          <div className={s.chatHeader}>
            <button
              className={`${s.headerBtn} ${s.menuBtn}`}
              onClick={() => setDialogsOpen(true)}
              aria-label={t('chat.openChatsAriaLabel')}
            >
              <Menu size={20} />
            </button>

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
                {messages.map((msg, i) => {
                  const giftData = parseGiftMessage(msg.content);
                  return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {shouldShowDateSep(msg, messages[i - 1] ?? null) && (
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
                      {giftData ? (
                        <div className={`${s.messageBubble} ${s.messageBubbleGift}`}>
                          <span className={s.giftBubbleEmoji}>{giftData.emoji}</span>
                          <span className={s.giftBubbleLabel}>{t('chat.giftSent')}</span>
                          <div className={s.messageTime}>{formatTime(msg.timestamp)}</div>
                        </div>
                      ) : (
                      <div
                        className={`${s.messageBubble} ${
                          msg.role === 'user' ? s.messageBubbleUser : s.messageBubbleGirl
                        }`}
                      >
                        <p className={s.messageText}>{msg.content}</p>
                        <div className={s.messageTime}>{formatTime(msg.timestamp)}</div>
                      </div>
                      )}
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
                    onClick={() => { setEmojiOpen((v) => !v); setGiftOpen(false); }}
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

                <div className={s.giftWrap} ref={giftPickerRef}>
                  <button
                    className={`${s.giftBtn} ${giftOpen ? s.giftBtnActive : ''}`}
                    onClick={() => { setGiftOpen((v) => !v); setEmojiOpen(false); }}
                    aria-label={t('chat.giftAriaLabel')}
                    aria-expanded={giftOpen}
                  >
                    <Gift size={22} />
                  </button>

                  <AnimatePresence>
                    {giftOpen && (
                      <motion.div
                        className={s.giftPicker}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className={s.giftPickerTitle}>{t('chat.giftPickerTitle')}</div>
                        <div className={s.giftGrid}>
                          {GIFT_ITEMS.map((gift) => (
                            <button
                              key={gift.id}
                              className={s.giftItem}
                              onClick={() => sendGift(gift.id)}
                              type="button"
                            >
                              <span className={s.giftItemEmoji}>{gift.emoji}</span>
                              <span className={s.giftItemName}>{t(`profile.gifts.${gift.id}`)}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
                  aria-label={t('chat.sendAriaLabel')}
                  whileTap={{ scale: 0.88 }}
                  whileHover={{ scale: 1.08 }}
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

      <Paywall
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        type="messages"
      />

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
    </PageTransition>
  );
}
