/**
 * Composer — letter-tone input dock.
 *
 *   - Autosize textarea (1 line min, 6 lines max).
 *   - Leading group: Gift button (Phase 5 wires GiftSheet) + Smile button
 *     (toggles EmojiSheet).
 *   - Trailing: Send button. Disabled when empty or `disabled` prop set.
 *   - Enter sends, Shift+Enter newline.
 *
 * No edge functions, no rate limits — purely static. Daily-limit composer
 * removal is handled at the page level (Phase 6).
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  type KeyboardEvent,
} from 'react';
import { Gift, Smile, ArrowUp } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { EmojiSheet } from './EmojiSheet';
import s from './Composer.module.css';

export type ComposerHandle = {
  focus: () => void;
  closeSheets: () => void;
};

type Props = {
  /** Placeholder copy (default / whisper / atLimit). Resolved by parent. */
  placeholder: string;
  /** Disable textarea (e.g. sleep mode never disables — only daily-limit). */
  disabled?: boolean;
  /** Called with trimmed text when user presses Enter or Send. */
  onSend: (text: string) => void;
  /** Phase 5 will hand a real opener; Phase 4 just no-ops with a console hint. */
  onGiftClick?: () => void;
};

export const Composer = forwardRef<ComposerHandle, Props>(function Composer(
  { placeholder, disabled = false, onSend, onGiftClick },
  ref,
) {
  const { t } = useLanguage();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    closeSheets: () => setEmojiOpen(false),
  }));

  // Autosize on every value change.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
  }, [value]);

  const trimmed = value.trim();
  const canSend = !disabled && trimmed.length > 0;
  const [pulse, setPulse] = useState(false);

  const submit = () => {
    if (!canSend) return;
    onSend(trimmed);
    setValue('');
    setPulse(true);
    window.setTimeout(() => setPulse(false), 380);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = taRef.current;
    if (!ta) {
      setValue((v) => v + emoji);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    // Restore caret after the inserted emoji on next paint.
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  return (
    <>
      <div className={s.composer}>
        <div className={s.leadingGroup}>
          <button
            type="button"
            className={s.iconBtn}
            aria-label={t('landing.redesign.chatPage.composer.gift')}
            onClick={onGiftClick}
            disabled={disabled}
          >
            <Gift size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className={s.iconBtn}
            aria-label={t('landing.redesign.chatPage.composer.emoji')}
            aria-pressed={emojiOpen}
            onClick={() => setEmojiOpen((v) => !v)}
            disabled={disabled}
          >
            <Smile size={18} strokeWidth={1.8} />
          </button>
        </div>

        <textarea
          ref={taRef}
          className={s.input}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          aria-label={t('landing.redesign.chatPage.composer.inputAria')}
        />

        <button
          type="button"
          className={`${s.send} ${canSend ? s.sendActive : ''} ${pulse ? s.sendPulse : ''}`}
          aria-label={t('landing.redesign.chatPage.composer.send')}
          onClick={submit}
          disabled={!canSend}
        >
          <ArrowUp size={18} strokeWidth={2.2} />
        </button>
      </div>

      {emojiOpen && (
        <EmojiSheet
          onPick={(e) => {
            insertEmoji(e);
            // keep open — user might pick more
          }}
          onClose={() => setEmojiOpen(false)}
        />
      )}
    </>
  );
});
