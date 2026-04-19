import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Eye,
  Star,
  Crown,
  RotateCcw,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import PageTransition from '../components/layout/PageTransition';
import { useAuth } from '../hooks/useAuth';
import { usePremium } from '../hooks/usePremium';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../i18n';
import s from './Premium.module.css';

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: "easeOut" as const },
  }),
};

/* ── Feature definitions ── */
const FEATURES = [
  { icon: Heart, nameKey: 'premium.features.unlimitedLikes.name', descKey: 'premium.features.unlimitedLikes.desc' },
  { icon: MessageCircle, nameKey: 'premium.features.unlimitedMessages.name', descKey: 'premium.features.unlimitedMessages.desc' },
  { icon: Eye, nameKey: 'premium.features.seeWhoLiked.name', descKey: 'premium.features.seeWhoLiked.desc' },
  { icon: Star, nameKey: 'premium.features.goldBadge.name', descKey: 'premium.features.goldBadge.desc' },
  { icon: RotateCcw, nameKey: 'premium.features.rewind.name', descKey: 'premium.features.rewind.desc' },
  { icon: Crown, nameKey: 'premium.features.priority.name', descKey: 'premium.features.priority.desc' },
] as const;

/* ── FAQ definitions ── */
const FAQ_KEYS = [
  { questionKey: 'premium.faq.cancel.question', answerKey: 'premium.faq.cancel.answer' },
  { questionKey: 'premium.faq.after.question', answerKey: 'premium.faq.after.answer' },
  { questionKey: 'premium.faq.secure.question', answerKey: 'premium.faq.secure.answer' },
] as const;

/* ── Payment methods ── */
const PAYMENT_METHODS: { label: string; disabled: boolean; isKey?: boolean }[] = [
  { label: 'Stripe', disabled: false },
  { label: 'Apple Pay', disabled: false },
  { label: 'Google Pay', disabled: false },
  { label: 'premium.payment.crypto', disabled: true, isKey: true },
];

export default function Premium() {
  const { user, loading: authLoading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { isPremium, activatePremium } = usePremium();
  const navigate = useNavigate();
  const { t } = useLanguage();

  /* ── FAQ accordion state ── */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  /* ── Toggle FAQ ── */
  const toggleFaq = useCallback((index: number) => {
    setOpenFaq(prev => (prev === index ? null : index));
  }, []);

  /* Mouse-follow glow for feature cards */
  const handleGlow = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--glow-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--glow-y', `${e.clientY - rect.top}px`);
  };

  /* ── Subscribe handler (stub) ── */
  const handleSubscribe = useCallback(() => {
    showToast(t('premium.toast.comingSoon'), 'info');
  }, [showToast, t]);

  /* ── Dev: Activate premium ── */
  const handleDevActivate = useCallback(() => {
    activatePremium('monthly');
    showToast(t('premium.toast.devActivated'), 'success');
  }, [activatePremium, showToast, t]);

  /* ── Loading ── */
  if (authLoading) {
    return (
      <div className={s.page}>
        <Navbar />
        <div className={s.main} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />

        <main className={s.main}>
          {/* ════════ Hero ════════ */}
          <motion.section
            className={s.hero}
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
          >
            <span className={s.heroCrown}>{'\u{1F451}'}</span>
            <h1 className={s.heroTitle}>{t('premium.hero.title')}</h1>
            <p className={s.heroSubtitle}>{t('premium.hero.subtitle')}</p>
          </motion.section>

          {/* ════════ Features Grid ════════ */}
          <motion.section
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
          >
            <h2 className={s.featuresTitle}>{t('premium.features.title')}</h2>
            <div className={s.featuresGrid}>
              {FEATURES.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.nameKey}
                    className={s.featureCard}
                    initial="hidden"
                    animate="visible"
                    custom={idx * 0.5 + 1.5}
                    variants={fadeUp}
                    onMouseMove={handleGlow}
                  >
                    <div className={s.featureIcon}>
                      <Icon size={22} />
                    </div>
                    <div className={s.featureCardContent}>
                      <p className={s.featureName}>{t(feature.nameKey)}</p>
                      <p className={s.featureDesc}>{t(feature.descKey)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* ════════ Pricing Cards ════════ */}
          <motion.section
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
          >
            <div className={s.pricingSection}>
              {/* Monthly plan */}
              <div className={s.planCard}>
                <h3 className={s.planName}>{t('premium.plans.monthly.name')}</h3>
                <p className={s.planPrice}>$9.99</p>
                <span className={s.planPeriod}>{t('premium.plans.monthly.period')}</span>

                {isPremium ? (
                  <>
                    <span className={s.currentPlanBadge}>
                      {t('premium.plans.currentPlan')}
                    </span>
                    <button className={s.subscribeBtnDisabled} disabled>
                      {t('premium.plans.subscribed')}
                    </button>
                  </>
                ) : (
                  <button className={s.subscribeBtn} onClick={handleSubscribe}>
                    {t('premium.plans.subscribeBtn')}
                  </button>
                )}
              </div>

              {/* Yearly plan */}
              <div className={`${s.planCard} ${s.planCardHighlighted}`}>
                <span className={s.planBadge}>{t('premium.plans.yearly.badge')}</span>
                <h3 className={s.planName}>{t('premium.plans.yearly.name')}</h3>
                <p className={s.planPrice}>$59.99</p>
                <span className={s.planPeriod}>{t('premium.plans.yearly.period')}</span>
                <span className={s.planSaving}>{t('premium.plans.yearly.saving')}</span>

                {isPremium ? (
                  <>
                    <span className={s.currentPlanBadge}>
                      {t('premium.plans.currentPlan')}
                    </span>
                    <button className={s.subscribeBtnDisabled} disabled>
                      {t('premium.plans.subscribed')}
                    </button>
                  </>
                ) : (
                  <button className={s.subscribeBtn} onClick={handleSubscribe}>
                    {t('premium.plans.subscribeBtn')}
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          {/* ════════ Payment Methods ════════ */}
          <motion.section
            className={s.paymentSection}
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
          >
            <p className={s.paymentTitle}>{t('premium.payment.title')}</p>
            <div className={s.paymentMethods}>
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method.label}
                  className={method.disabled ? s.paymentBadgeDisabled : s.paymentBadge}
                >
                  {method.isKey ? t(method.label) : method.label}
                </span>
              ))}
            </div>
          </motion.section>

          {/* ════════ FAQ Accordion ════════ */}
          <motion.section
            className={s.faqSection}
            initial="hidden"
            animate="visible"
            custom={5}
            variants={fadeUp}
          >
            <h2 className={s.faqTitle}>{t('premium.faq.title')}</h2>

            {FAQ_KEYS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={faq.questionKey} className={s.faqItem}>
                  <button
                    className={s.faqQuestion}
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                  >
                    {t(faq.questionKey)}
                    <ChevronDown
                      size={18}
                      className={`${s.faqChevron} ${isOpen ? s.faqChevronOpen : ''}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        className={s.faqAnswer}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" as const }}
                      >
                        <div className={s.faqAnswerInner}>
                          {t(faq.answerKey)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.section>

          {/* ════════ Dev Mode: Activate Premium ════════ */}
          {import.meta.env.DEV && (
            <motion.section
              className={s.devSection}
              initial="hidden"
              animate="visible"
              custom={6}
              variants={fadeUp}
            >
              <span className={s.devLabel}>DEV MODE</span>
              <button className={s.devBtn} onClick={handleDevActivate}>
                {t('premium.dev.activateBtn')}
              </button>
            </motion.section>
          )}

          {/* ════════ Back to Profile ════════ */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={7}
            variants={fadeUp}
          >
            <Link to="/profile" className={s.backLink}>
              <ArrowLeft size={16} />
              {t('premium.backToProfile')}
            </Link>
          </motion.div>
        </main>

        <ToastContainer />
      </div>
    </PageTransition>
  );
}
