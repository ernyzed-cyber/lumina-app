import { memo } from 'react';
import { useLanguage } from '../../i18n';
import type { ChatMessage } from './types';
import { TypingDots } from './TypingDots';
import { findGift } from './giftCatalog';
import s from './Bubble.module.css';

interface BubbleProps {
  message: ChatMessage;
  formatTime: (ts: number, locale: string) => string;
}

export const Bubble = memo(function Bubble({ message, formatTime }: BubbleProps) {
  const { t, lang } = useLanguage();

  const isUser = message.speaker === 'you';
  
  // Resolve inline vs i18n key
  let content = message.textKey;
  if (content.startsWith('__inline:')) {
    content = content.replace('__inline:', '');
  } else {
    // Attempt i18n
    const translation = t(content as any);
    if (translation) content = translation;
  }

  const timeString = formatTime(message.ts, lang);

  let giftEmoji = '';
  if (message.gift) {
    try {
      giftEmoji = findGift(message.gift.kind).emoji;
    } catch {}
  }

  return (
    <div className={`${s.row} ${isUser ? s.rowUser : s.rowHer}`}>
      <div className={`${s.bubble} ${isUser ? s.bubbleUser : s.bubbleHer}`}>
        {content && <div className={s.text}>{content}</div>}
        
        {message.gift && (
          <div className={s.giftBox}>
            <div className={s.giftIconWrapper}>
              <span style={{ fontSize: '32px' }}>{giftEmoji}</span>
            </div>
          </div>
        )}
        
        <div className={s.time}>{timeString}</div>
      </div>
    </div>
  );
});

interface TypingBubbleProps {
  isTyping: boolean;
}

export const TypingBubble = memo(function TypingBubble({ isTyping }: TypingBubbleProps) {
  if (!isTyping) return null;
  return (
    <div className={`${s.row} ${s.rowHer}`}>
      <div className={`${s.bubble} ${s.bubbleHer} ${s.typingBubble}`}>
        <TypingDots />
      </div>
    </div>
  );
});
