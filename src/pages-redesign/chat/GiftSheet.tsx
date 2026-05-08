/**
 * GiftSheet — floating panel above the composer dock with the full prod
 * catalog (14 gifts × 4 categories), preserved 1:1 from the Supabase seed.
 *
 * Mirrors EmojiSheet positioning (bottom: 92px, max-width: 688px) so the
 * composer stays visible underneath. Categories are switched with tabs;
 * the grid scrolls inside the sheet (max-height capped) when needed.
 *
 * Static-only — no balance check, no edge-function call. Tap fires
 * `onPick({ kind, stars })` and the parent appends a gift-bearing message.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n';
import {
  GIFT_CATALOG,
  GIFT_CATEGORIES,
  giftName,
  type GiftCategory,
} from './giftCatalog';
import type { ChatGift } from './types';
import s from './GiftSheet.module.css';

type Props = {
  onPick: (gift: ChatGift) => void;
  onClose: () => void;
};

export function GiftSheet({ onPick, onClose }: Props) {
  const { t, lang } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<GiftCategory>('gift');

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const items = useMemo(
    () => GIFT_CATALOG.filter((g) => g.category === activeCategory),
    [activeCategory],
  );

  const title = t('landing.redesign.chatPage.gift.sheetTitle');

  return (
    <>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={s.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className={s.title}>{title}</p>

        <div className={s.tabs} role="tablist" aria-label={title}>
          {GIFT_CATEGORIES.map((cat) => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                className={`${s.tab} ${active ? s.tabActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {t(`landing.redesign.chatPage.gift.categories.${cat}`)}
              </button>
            );
          })}
        </div>

        <div className={s.grid}>
          {items.map((item) => {
            const name = giftName(item, lang);
            const aria = t('landing.redesign.chatPage.gift.priceAria', {
              name,
              stars: String(item.priceStars),
            });
            return (
              <button
                key={item.id}
                type="button"
                className={s.tile}
                onClick={() => onPick({ kind: item.id, stars: item.priceStars })}
                aria-label={aria}
              >
                <span className={s.disk} aria-hidden="true">
                  <span className={s.diskEmoji}>{item.emoji}</span>
                </span>
                <span className={s.name}>{name}</span>
                <span className={s.priceChip} aria-hidden="true">
                  <span className={s.priceStar}>⭐</span>
                  {item.priceStars}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
