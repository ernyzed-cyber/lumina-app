import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useGiftCatalog } from '../hooks/useGiftCatalog';
import { useStars } from '../hooks/useStars';
import { supabase } from '../lib/supabase';
import { tg } from '../lib/telegram';
import { useLanguage } from '../i18n';
import s from './GiftPicker.module.css';

interface Props {
  open: boolean;
  girlId: string;
  onClose: () => void;
  onSent: () => void;
}

export function GiftPicker({ open, girlId, onClose, onSent }: Props) {
  const { t } = useLanguage();
  const { catalog, loading } = useGiftCatalog();
  const { balance } = useStars();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(catalog.map((g) => g.category))),
    [catalog],
  );

  const displayCategory = activeCategory ?? categories[0] ?? null;

  const filtered = useMemo(
    () =>
      displayCategory
        ? catalog.filter((g) => g.category === displayCategory)
        : catalog,
    [catalog, displayCategory],
  );

  async function handleSend(giftId: string, priceStars: number) {
    if (balance < priceStars) {
      setError(t('dailyLimit.notEnough'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { error: fnErr } = await supabase.functions.invoke('gift-send', {
        body: { girl_id: girlId, gift_id: giftId },
      });
      if (fnErr) throw fnErr;
      tg.haptic('success');
      onSent();
      onClose();
    } catch (e) {
      tg.haptic('error');
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={s.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className={s.sheet}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className={s.header}>
              <span className={s.title}>{t('chat.giftPickerTitle')}</span>
              <button
                className={s.closeBtn}
                onClick={onClose}
                aria-label={t('common.cancel')}
              >
                <X size={20} />
              </button>
            </div>

            {/* Balance hint */}
            <div className={s.balanceHint}>⭐ {balance}</div>

            {/* Category tabs */}
            {categories.length > 1 && (
              <div className={s.tabs}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`${s.tab} ${displayCategory === cat ? s.tabActive : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {t(`gifts.category.${cat as 'gift' | 'jewelry' | 'date' | 'travel'}`)}
                  </button>
                ))}
              </div>
            )}

            {/* Gift grid */}
            {loading ? (
              <div className={s.loadingRow}>{t('common.loading')}</div>
            ) : (
              <div className={s.grid}>
                {filtered.map((gift) => {
                  const canAfford = balance >= gift.price_stars;
                  return (
                    <button
                      key={gift.id}
                      className={`${s.item} ${!canAfford ? s.itemDim : ''}`}
                      onClick={() => handleSend(gift.id, gift.price_stars)}
                      disabled={sending}
                      aria-label={`${gift.name} ⭐${gift.price_stars}`}
                    >
                      <span className={s.emoji}>{gift.emoji}</span>
                      <span className={s.name}>{gift.name}</span>
                      <span className={s.price}>⭐ {gift.price_stars}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {error && <p className={s.error}>{error}</p>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
