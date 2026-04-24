import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n';
import { useStars } from '../hooks/useStars';
import s from './DailyLimitModal.module.css';

interface Props {
  open: boolean;
  variant: 'daily_limit' | 'insufficient_stars';
  neededStars?: number;
  inCharacterMessage?: string;
  onClose: () => void;
  /** Called after successful buyMessagesPack — use to reset client-side count. */
  onBought?: () => void;
}

export function DailyLimitModal({
  open,
  variant,
  neededStars,
  inCharacterMessage,
  onClose,
  onBought,
}: Props) {
  const { t, tr } = useLanguage();
  const navigate = useNavigate();
  const { balance, loading, buyMessagesPack } = useStars();

  const PACK_COST = 100;
  const canAfford = balance >= PACK_COST;

  async function handleBuy() {
    await buyMessagesPack();
    onBought?.();
    onClose();
  }

  function handleTopUp() {
    onClose();
    navigate('/shop');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={s.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className={s.modal}
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <div className={s.icon}>⏳</div>

            <h2 className={s.title}>{t('dailyLimit.title')}</h2>

            {inCharacterMessage ? (
              <p className={s.inCharacter}>{inCharacterMessage}</p>
            ) : (
              <p className={s.subtitle}>{t('dailyLimit.subtitle')}</p>
            )}

            {variant === 'insufficient_stars' && neededStars != null && (
              <p className={s.needMore}>
                {t('dailyLimit.need', { n: String(neededStars) })}
              </p>
            )}

            {/* Balance row */}
            <div className={s.balanceRow}>
              <span className={s.balanceLabel}>{t('shop.balance')}</span>
              <span className={s.balanceValue}>⭐ {balance}</span>
            </div>

            {canAfford ? (
              <button
                className={s.primaryBtn}
                onClick={handleBuy}
                disabled={loading}
              >
                {loading ? t('common.loading') : `${t('dailyLimit.buyMessages')} · ⭐ ${PACK_COST}`}
              </button>
            ) : (
              <>
                <p className={s.notEnough}>{t('dailyLimit.notEnough')}</p>
                <button className={s.primaryBtn} onClick={handleTopUp}>
                  {t('dailyLimit.topUp')}
                </button>
              </>
            )}

            <button className={s.dismissBtn} onClick={onClose}>
              {t('common.cancel')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
