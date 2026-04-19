import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../i18n';
import s from './Paywall.module.css';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'likes' | 'superLikes' | 'messages';
}

const titleKeys: Record<PaywallProps['type'], string> = {
  likes: 'paywall.title.likes',
  superLikes: 'paywall.title.superLikes',
  messages: 'paywall.title.messages',
};

const featureKeys = [
  'paywall.feature.unlimitedLikes',
  'paywall.feature.unlimitedMessages',
  'paywall.feature.seeWhoLiked',
] as const;

export function Paywall({ isOpen, onClose, type }: PaywallProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/premium');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={s.overlay}
          ref={overlayRef}
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' as const }}
        >
          <motion.div
            className={s.modal}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 30 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15, ease: 'easeIn' } }}
            transition={shouldReduceMotion
              ? { duration: 0.1 }
              : { type: 'spring', stiffness: 300, damping: 24 }
            }
          >
            <div className={s.crown}>👑</div>

            <h2 className={s.title}>{t(titleKeys[type])}</h2>

            <p className={s.subtitle}>{t('paywall.subtitle')}</p>

            <ul className={s.featureList}>
              {featureKeys.map((key) => (
                <li key={key} className={s.featureItem}>
                  <span className={s.featureCheck}>✓</span>
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>

            <button className={s.upgradeBtn} onClick={handleUpgrade}>
              {t('paywall.upgradeBtn')}
            </button>

            <button className={s.dismissBtn} onClick={onClose}>
              {t('paywall.dismissBtn')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
