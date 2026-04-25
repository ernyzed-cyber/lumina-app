import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n';
import type { PackId, PaymentProvider } from '../hooks/useStars';
import s from './PaymentMethodModal.module.css';

interface PackSummary {
  id: PackId;
  stars: number;
  priceUsd: number;
  tgStars: number;
}

interface Props {
  open: boolean;
  pack: PackSummary | null;
  loading: boolean;
  onClose: () => void;
  onPick: (provider: PaymentProvider) => void;
}

export function PaymentMethodModal({ open, pack, loading, onClose, onPick }: Props) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && pack && (
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
            <h2 className={s.title}>{t('shop.choosePaymentMethod')}</h2>
            <p className={s.summary}>
              <span className={s.starIcon} aria-hidden>⭐</span>
              {pack.stars.toLocaleString()}
            </p>

            <button
              type="button"
              className={s.method}
              disabled={loading}
              onClick={() => onPick('cryptocloud')}
            >
              <span className={s.methodIcon} aria-hidden>💎</span>
              <span className={s.methodInfo}>
                <span className={s.methodTitle}>{t('shop.payCrypto')}</span>
                <span className={s.methodDesc}>{t('shop.payCryptoDesc')}</span>
              </span>
              <span className={s.methodPrice}>${pack.priceUsd}</span>
            </button>

            <button
              type="button"
              className={s.method}
              disabled={loading}
              onClick={() => onPick('telegram')}
            >
              <span className={s.methodIcon} aria-hidden>✈️</span>
              <span className={s.methodInfo}>
                <span className={s.methodTitle}>{t('shop.payTelegram')}</span>
                <span className={s.methodDesc}>{t('shop.payTelegramDesc')}</span>
              </span>
              <span className={s.methodPrice}>{pack.tgStars.toLocaleString()} ⭐</span>
            </button>

            <button type="button" className={s.dismissBtn} onClick={onClose}>
              {t('common.cancel')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
