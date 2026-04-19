/* ═══════════════════════════════════════════
   VerificationModal — in-app Telegram verify
   Shows code, link to bot, live status polling
   ═══════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldCheck, X, Send, RefreshCw, CheckCircle } from 'lucide-react';
import { useTelegramVerified } from '../hooks/useTelegramVerified';
import { useLanguage } from '../i18n';
import s from './VerificationModal.module.css';

interface VerificationModalProps {
  open: boolean;
  onClose: () => void;
}

export default function VerificationModal({ open, onClose }: VerificationModalProps) {
  const { t } = useLanguage();
  const { isVerified, generateCode } = useTelegramVerified();

  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ── Generate code when modal opens ── */
  useEffect(() => {
    if (!open) return;
    // Reset state when reopened
    setCode(null);
    setLoading(true);

    let cancelled = false;

    generateCode().then((newCode) => {
      if (!cancelled) {
        setCode(newCode);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, generateCode]);

  /* ── Auto-close on successful verification ── */
  useEffect(() => {
    if (isVerified && open) {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVerified, open, onClose]);

  /* ── Refresh code ── */
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const newCode = await generateCode();
    setCode(newCode);
    setLoading(false);
  }, [generateCode]);

  const telegramBotUrl = code
    ? `https://t.me/LuminaAuthBot?start=${code}`
    : 'https://t.me/LuminaAuthBot';

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={s.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={s.modal}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>

            {/* Icon */}
            <div className={s.iconWrap}>
              <ShieldCheck size={36} />
            </div>

            {/* Title & subtitle */}
            <h2 className={s.title}>{t('auth.telegramVerify.title')}</h2>
            <p className={s.subtitle}>{t('auth.telegramVerify.subtitle')}</p>

            {/* Verification code */}
            {code && !isVerified && (
              <div className={s.codeBlock}>
                <span className={s.codeLabel}>{t('auth.telegramVerify.yourCode')}</span>
                <span className={s.code}>{code}</span>
              </div>
            )}

            {/* Status */}
            {loading && !isVerified && (
              <div className={s.waiting}>
                <div className={s.spinner} />
                <span>{t('auth.telegramVerify.waitingVerification')}</span>
              </div>
            )}

            {!loading && code && !isVerified && (
              <div className={s.waiting}>
                <div className={s.spinner} />
                <span>{t('auth.telegramVerify.waitingVerification')}</span>
              </div>
            )}

            {isVerified && (
              <div className={s.success}>
                <CheckCircle size={20} />
                <span>{t('auth.telegramVerify.verified')}</span>
              </div>
            )}

            {/* How it works */}
            {!isVerified && (
              <div className={s.howItWorks}>
                <p className={s.howItWorksTitle}>{t('auth.telegramVerify.howItWorks')}</p>
                <p className={s.howItWorksStep}>{t('auth.telegramVerify.step1')}</p>
                <p className={s.howItWorksStep}>{t('auth.telegramVerify.step2')}</p>
                <p className={s.howItWorksStep}>{t('auth.telegramVerify.step3')}</p>
              </div>
            )}

            {/* Telegram button */}
            {!isVerified && (
              <a
                href={telegramBotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={s.telegramBtn}
              >
                <Send size={18} />
                {t('auth.telegramVerify.openBot')}
              </a>
            )}

            {/* Refresh code */}
            {!isVerified && code && (
              <button type="button" className={s.refreshBtn} onClick={handleRefresh}>
                <RefreshCw size={14} />
                {t('auth.telegramVerify.refreshCode')}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
