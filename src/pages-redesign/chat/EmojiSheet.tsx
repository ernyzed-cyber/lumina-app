/**
 * EmojiSheet — bottom sheet of common emoji.
 *
 * Static curated list (no full picker, no Unicode dump). Tap inserts the
 * emoji at the textarea caret via the `onPick` callback. Phase 4 scope.
 */

import { useEffect } from 'react';
import { useLanguage } from '../../i18n';
import s from './Composer.module.css';

const EMOJI = [
  '🤍', '✨', '🌙', '☕', '🌸', '🕯️', '🌧️', '🍷',
  '📖', '🎶', '🌊', '🌿', '🌌', '⭐', '🫧', '🦋',
  '😊', '🥺', '😌', '🙈', '🥹', '😴', '😶‍🌫️', '🫶',
  '💭', '🫣', '😇', '🥰', '🌷', '🌼', '🌒', '🪞',
];

type Props = {
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiSheet({ onPick, onClose }: Props) {
  const { t } = useLanguage();

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = t('landing.redesign.chatPage.composer.emoji');

  return (
    <>
      <div
        className={s.sheetBackdrop}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className={s.sheetTitle}>{title}</p>
        <div className={s.emojiGrid}>
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className={s.emojiBtn}
              onClick={() => onPick(e)}
              aria-label={e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
