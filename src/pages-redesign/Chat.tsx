import {
  useMemo,
  useRef,
  useLayoutEffect,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import { useLanguage } from '../i18n';
import { StarField } from './home/StarField';
import { Bubble, TypingBubble } from './chat/Bubble';
import { Composer, type ComposerHandle } from './chat/Composer';
import { GiftSheet } from './chat/GiftSheet';
import { LimitProgress, LimitBanner } from './chat/LimitProgress';
import { getMockConversation } from './chat/mockConversation';
import type { ChatGift, ChatMessage } from './chat/types';
import s from './Chat.module.css';

const DAILY_LIMIT = 100;
const RESET_HINT_TIME = '7h 23m';

function formatTime(ts: number, locale: string): string {
  return new Date(ts).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function ChatRedesign() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const now = useMemo(() => Date.now(), []);
  const [messages, setMessages] = useState<ChatMessage[]>(() => getMockConversation(now));
  const [giftSheetOpen, setGiftSheetOpen] = useState(false);
  const [usedCount, setUsedCount] = useState(0); // For demo, we start at 0

  const isAsleep = false; // Always awake for now since debug strip is removed
  const [isTyping, setIsTyping] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle>(null);

  useLayoutEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const behavior: ScrollBehavior = reduceMotion ? 'auto' : 'smooth';
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, [messages.length]);

  const remaining = Math.max(0, DAILY_LIMIT - usedCount);
  const atLimit = remaining === 0;

  const handleSend = useCallback((text: string) => {
    if (atLimit) return;
    const id = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        speaker: 'you',
        ts: Date.now(),
        textKey: `__inline:${text}`,
      },
    ]);
    setUsedCount((c) => c + 1);

    if (isAsleep) return;

    setIsTyping(true);
    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: `her-reply-${Date.now()}`,
        speaker: 'her',
        ts: Date.now(),
        textKey: '__inline:I am listening.',
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 2500);
  }, [atLimit, isAsleep]);

  const handleGift = useCallback((gift: ChatGift) => {
    if (atLimit) {
      setGiftSheetOpen(false);
      return;
    }
    setGiftSheetOpen(false);
    const id = `local-gift-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        speaker: 'you',
        ts: Date.now(),
        textKey: '__inline:',
        gift,
      },
    ]);
    setUsedCount((c) => c + 1);

    if (isAsleep) return;

    setIsTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `her-gift-reply-${Date.now()}`,
          speaker: 'her',
          ts: Date.now(),
          textKey: 'landing.redesign.chatPage.gift.kept',
        },
      ]);
      setIsTyping(false);
    }, 2800);
  }, [atLimit, isAsleep]);

  const headerName = t('landing.redesign.chatPage.eyebrow.name' as any) || 'ALEXA';

  let lastDateStr = '';

  return (
    <main className={s.page} data-sleep={isAsleep ? 'true' : undefined}>
      <StarField intensity="dim" />

      <div className={s.shell}>
        <header className={s.header}>
          <div className={s.headerLeft}>
            <button
              type="button"
              className={s.headerBack}
              aria-label="Back"
              onClick={() => navigate('/__preview')}
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </button>
            
            <div className={s.avatar}>
              <img src="https://i.pravatar.cc/150?img=47" alt="Avatar" />
            </div>

            <div className={s.headerInfo}>
              <span className={s.eyebrowName}>{headerName}</span>
              <span className={s.statusText} data-typing={isTyping}>
                {isTyping ? (t('landing.redesign.chatPage.header.status.thinking' as any) || 'typing...') : (t('landing.redesign.chatPage.header.status.online' as any) || 'online')}
              </span>
            </div>
          </div>

          <div className={s.headerRight}>
            <div className={s.starsRight}>
              <Star size={14} className={s.starIcon} fill="currentColor" />
              1240
            </div>
          </div>
        </header>

        <section
          ref={transcriptRef}
          className={s.transcript}
          role="log"
          aria-live="polite"
          onClick={() => {
            setGiftSheetOpen(false);
            composerRef.current?.closeSheets();
          }}
        >
          <div className={s.messageList}>
            {messages.map((m) => {
              const d = new Date(m.ts);
              const dateStr = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', day: 'numeric' });
              const showDivider = dateStr !== lastDateStr;
              lastDateStr = dateStr;

              return (
                <div key={m.id}>
                  {showDivider && (
                    <div className={s.dayDivider}>
                      <span>{dateStr}</span>
                    </div>
                  )}
                  <Bubble message={m} formatTime={formatTime} />
                </div>
              );
            })}
            <TypingBubble isTyping={isTyping} />
          </div>
        </section>

        <div className={s.footerSlot}>
          {atLimit ? (
            <LimitBanner resetTimerStr={RESET_HINT_TIME} />
          ) : (
            <>
              <Composer
                ref={composerRef}
                placeholder={
                  isAsleep
                    ? (t('landing.redesign.chatPage.composer.placeholder.whisper' as any) || 'whisper into the night...')
                    : (t('landing.redesign.chatPage.composer.placeholder.default' as any) || 'write a thought...')
                }
                onSend={handleSend}
                onGiftClick={() => !atLimit && setGiftSheetOpen(true)}
                disabled={atLimit}
              />
              <LimitProgress count={usedCount} total={DAILY_LIMIT} />
            </>
          )}
        </div>
      </div>

      {giftSheetOpen && (
        <GiftSheet
          onPick={handleGift}
          onClose={() => setGiftSheetOpen(false)}
        />
      )}
    </main>
  );
}
