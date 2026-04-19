import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Camera,
  ShieldCheck,
  Clock,
  UserPlus,
  Search,
  MessageCircle,
  Heart,
  Lock,
  Sparkles,
  ChevronDown,
  Zap,
  MapPin,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import { getLocalizedGirls, allPhotos } from '../data/girls';
import { useLanguage } from '../i18n';
import s from './Landing.module.css';

/* ─────────────────────────────────────
   Animation variants (framer-motion)
   ───────────────────────────────────── */

const smoothEase = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: smoothEase },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

/** Floating card entrance — each card flies in from a different direction */
const cardVariants = [
  {
    hidden: { opacity: 0, x: -80, y: 30, rotate: -8 },
    visible: {
      opacity: 1, x: 0, y: 0, rotate: -6,
      transition: { duration: 0.9, delay: 0.3, ease: smoothEase },
    },
  },
  {
    hidden: { opacity: 0, x: 80, y: -20, rotate: 10 },
    visible: {
      opacity: 1, x: 0, y: 0, rotate: 5,
      transition: { duration: 0.9, delay: 0.5, ease: smoothEase },
    },
  },
  {
    hidden: { opacity: 0, x: -60, y: 60, rotate: 6 },
    visible: {
      opacity: 1, x: 0, y: 0, rotate: -3,
      transition: { duration: 0.9, delay: 0.7, ease: smoothEase },
    },
  },
];

/* ─────────────────────────────────────
   useCountUp — animated counter on scroll
   ───────────────────────────────────── */

function useCountUp(
  end: number,
  duration = 2000,
  locale = 'en-US',
): [React.RefObject<HTMLSpanElement | null>, string] {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState('0');
  const started = useRef(false);

  const animate = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(eased * end);
      setValue(current.toLocaleString(locale));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [end, duration, locale]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) animate();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return [ref, value];
}

/* ─────────────────────────────────────
   Static data
   ───────────────────────────────────── */

/* ─────────────────────────────────────
   COMPONENT
   ───────────────────────────────────── */

export default function Landing() {
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  /* ── Localized girls data ── */
  const girls = useMemo(() => getLocalizedGirls(lang), [lang]);
  const heroGirls = useMemo(() => girls.slice(0, 3), [girls]);

  /* Animation variants — instant when reduced motion is on */
  const fadeUpVariant = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: () => ({ opacity: 1, transition: { duration: 0 } }) }
    : fadeUp;

  /* Parallax tilt for feature cards */
  const handleTilt = shouldReduceMotion
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        e.currentTarget.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
      };

  const handleTiltReset = shouldReduceMotion
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
      };

  /* Animated counters */
  const numLocale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const [ref1, v1] = useCountUp(50, 2000, numLocale);
  const [ref2, v2] = useCountUp(2, 2000, numLocale);
  const [ref3, v3] = useCountUp(4, 1600, numLocale);
  const [ref4, v4] = useCountUp(50, 1800, numLocale);

  /* Duplicate girls array for seamless infinite scroll */
  const avatarGirls = useMemo(() => [...girls, ...girls], [girls]);

  /* Translated data arrays (depend on t, must be inside component) */
  const trustBadges = [
    { icon: Camera, title: t('landing.trustBadges.verifiedPhotos') },
    { icon: ShieldCheck, title: t('landing.trustBadges.identityVerification') },
    { icon: Clock, title: t('landing.trustBadges.activeToday') },
    { icon: Heart, title: t('landing.trustBadges.liveChat') },
  ];

  const howSteps = [
    { icon: UserPlus, num: 1, title: t('landing.howSteps.step1Title'), desc: t('landing.howSteps.step1Desc') },
    { icon: Search, num: 2, title: t('landing.howSteps.step2Title'), desc: t('landing.howSteps.step2Desc') },
    { icon: Heart, num: 3, title: t('landing.howSteps.step3Title'), desc: t('landing.howSteps.step3Desc') },
  ];

  const features = [
    { icon: ShieldCheck, title: t('landing.features.realProfilesTitle'), desc: t('landing.features.realProfilesDesc') },
    { icon: Lock, title: t('landing.features.securityTitle'), desc: t('landing.features.securityDesc') },
    { icon: Heart, title: t('landing.features.matchInterestsTitle'), desc: t('landing.features.matchInterestsDesc') },
    { icon: MessageCircle, title: t('landing.features.convenientChatTitle'), desc: t('landing.features.convenientChatDesc') },
    { icon: MapPin, title: t('landing.features.nearYouTitle'), desc: t('landing.features.nearYouDesc') },
    { icon: Zap, title: t('landing.features.quickStartTitle'), desc: t('landing.features.quickStartDesc') },
  ];

  const chatMessages = [
    { from: 'user' as const, text: t('landing.chatMessages.msg1'), time: '20:14' },
    { from: 'girl' as const, text: t('landing.chatMessages.msg2'), time: '20:15' },
    { from: 'user' as const, text: t('landing.chatMessages.msg3'), time: '20:15' },
    { from: 'girl' as const, text: t('landing.chatMessages.msg4'), time: '20:16' },
  ];

  const reducedCardVariant = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } };

  return (
    <PageTransition>
    <div>
      {/* ═══════════════════════════════════════
          1. HERO
          ═══════════════════════════════════════ */}
      <section className={s.hero}>
        {/* Gradient blob background */}
        <div className={s.heroBg}>
          <div className={s.blob1} />
          <div className={s.blob2} />
          <div className={s.blob3} />
          <div className={s.blob4} />
        </div>

        {/* Floating profile cards */}
        <div className={s.floatingCards}>
          {heroGirls.map((girl, i) => (
            <motion.div
              key={girl.id}
              className={s.floatingCard}
              variants={shouldReduceMotion ? reducedCardVariant : cardVariants[i]}
              initial="hidden"
              animate="visible"
            >
              <img
                className={s.floatingCardImg}
                src={girl.photo}
                alt={girl.name}
                loading="lazy"
              />
              <div className={s.floatingCardInfo}>
                <span className={s.floatingCardName}>{girl.name}</span>
                <span className={s.floatingCardAge}>{girl.age}</span>
                {girl.online && <span className={s.onlineDot} />}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Hero text content */}
        <motion.div
          className={s.heroContent}
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        >
          <h1 className={s.heroTitle}>
            {t('landing.hero.titlePart1')}{' '}
            <span className={s.heroTitleAccent}>{t('landing.hero.titleAccent')}</span>{' '}
            {t('landing.hero.titlePart2')}
          </h1>
          <p className={s.heroSubtitle}>
            {t('landing.hero.subtitle')}
          </p>
          <div className={s.heroCta}>
            <Link to="/auth">
              <Button variant="primary" size="lg">
                {t('landing.hero.ctaPrimary')}
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="ghost" size="lg">
                {t('landing.hero.ctaSecondary')}
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <div className={s.scrollHint}>
          <span>{t('landing.hero.scrollHint')}</span>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ═══════════════════════════════════════
          2. TRUST / VERIFIED
          ═══════════════════════════════════════ */}
      <section className={s.trust}>
        <div className={s.trustInner}>
          {/* Infinite avatar scroll */}
          <div className={s.avatarStrip}>
            <div className={s.avatarTrack}>
              {avatarGirls.map((girl, i) => (
                <img
                  key={`${girl.id}-${i}`}
                  className={s.avatarItem}
                  src={girl.photo}
                  alt={girl.name}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <motion.div
            className={s.trustBadges}
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {trustBadges.map((badge, i) => (
              <motion.div
                key={badge.title}
                className={s.trustBadge}
                variants={fadeUpVariant}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <div className={s.trustBadgeIcon}>
                  <badge.icon size={24} />
                </div>
                <span className={s.trustBadgeTitle}>{badge.title}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          3. HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section id="how-it-works" className={`${s.section} ${s.sectionCenter}`}>
        <div className={s.sectionInner}>
          <motion.div
            variants={fadeUpVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className={s.sectionLabel}>
              <Zap size={14} /> {t('landing.howItWorks.label')}
            </span>
            <h2 className={s.sectionTitle}>{t('landing.howItWorks.title')}</h2>
            <p className={s.sectionSubtitle}>
              {t('landing.howItWorks.subtitle')}
            </p>
          </motion.div>

          <div className={s.steps}>
            <div className={s.stepsLine} />
            {howSteps.map((step, i) => (
              <motion.div
                key={step.num}
                className={s.stepCard}
                variants={fadeUpVariant}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
              >
                <div className={s.stepNumber}>{step.num}</div>
                <div className={s.stepIcon}>
                  <step.icon size={22} />
                </div>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          4. FEATURES
          ═══════════════════════════════════════ */}
      <section className={`${s.section} ${s.sectionCenter}`}>
        <div className={s.sectionInner}>
          <motion.div
            variants={fadeUpVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className={s.sectionLabel}>
              <Sparkles size={14} /> {t('landing.featuresSection.label')}
            </span>
            <h2 className={s.sectionTitle}>{t('landing.featuresSection.title')}</h2>
            <p className={s.sectionSubtitle}>
              {t('landing.featuresSection.subtitle')}
            </p>
          </motion.div>

          <div className={s.featuresGrid}>
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                className={s.featureCard}
                variants={fadeUpVariant}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                onMouseMove={handleTilt}
                onMouseLeave={handleTiltReset}
              >
                <div className={s.featureIcon}>
                  <feat.icon size={24} />
                </div>
                <h3 className={s.featureTitle}>{feat.title}</h3>
                <p className={s.featureDesc}>{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          5. STATS BAR
          ═══════════════════════════════════════ */}
      <section className={s.statsBar}>
        <div className={s.statsGrid}>
          <div className={s.statItem}>
            <div className={s.statValue}>
              <span ref={ref1}>{v1}</span>K+
            </div>
            <div className={s.statLabel}>{t('landing.stats.users')}</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statValue}>
              <span ref={ref2}>{v2}</span>M+
            </div>
            <div className={s.statLabel}>{t('landing.stats.messages')}</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statValue}>
              <span ref={ref3}>{v3}</span>.9
            </div>
            <div className={s.statLabel}>{t('landing.stats.rating')}</div>
          </div>
          <div className={s.statItem}>
            <div className={s.statValue}>
              <span ref={ref4}>{v4}</span>+
            </div>
            <div className={s.statLabel}>{t('landing.stats.cities')}</div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          6. CHAT PREVIEW
          ═══════════════════════════════════════ */}
      <section className={s.chatPreview}>
        <div className={s.chatPreviewInner}>
          {/* Left — text */}
          <motion.div
            className={s.chatText}
            variants={fadeUpVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className={s.sectionLabel}>
              <MessageCircle size={14} /> {t('landing.chatPreview.label')}
            </span>
            <h2 className={s.chatTextTitle}>
              {t('landing.chatPreview.titlePart1')}{' '}
              <span className={s.chatTextHighlight}>{t('landing.chatPreview.titleHighlight')}</span>
            </h2>
            <p className={s.chatTextDesc}>
              {t('landing.chatPreview.desc')}
            </p>
            <Link to="/auth">
              <Button
                variant="primary"
                size="lg"
                icon={<MessageCircle size={18} />}
              >
                {t('landing.chatPreview.cta')}
              </Button>
            </Link>
          </motion.div>

          {/* Right — mock chat window */}
          <motion.div
            className={s.chatWindow}
            variants={fadeUpVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
          >
            {/* Header */}
            <div className={s.chatWindowHeader}>
              <img
                className={s.chatWindowAvatar}
                src={girls[0].photo}
                alt={girls[0].name}
                loading="lazy"
              />
              <div>
                <div className={s.chatWindowName}>{girls[0].name}</div>
                <div className={s.chatWindowStatus}>
                  <span className={s.chatWindowStatusDot} />
                  {t('landing.chatPreview.status')}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={s.chatMessages}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`${s.chatBubble} ${
                    msg.from === 'user' ? s.chatBubbleUser : s.chatBubbleGirl
                  }`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                >
                  {msg.text}
                  <div className={s.chatBubbleTime}>{msg.time}</div>
                </div>
              ))}

              {/* Typing indicator */}
              <div className={s.typingIndicator}>
                <span className={s.typingDot} />
                <span className={s.typingDot} />
                <span className={s.typingDot} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          7. PHOTO GALLERY MARQUEE
          ═══════════════════════════════════════ */}
      <section className={s.gallerySection}>
        {/* Ряд 1 — влево */}
        <div className={s.galleryRow}>
          <div className={s.galleryTrack}>
            {[...allPhotos, ...allPhotos].map((src, i) => (
              <img
                key={`r1-${i}`}
                className={s.galleryImg}
                src={src}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        </div>

        {/* Ряд 2 — вправо */}
        <div className={s.galleryRow}>
          <div className={`${s.galleryTrack} ${s.galleryTrackReverse}`}>
            {[...allPhotos.slice().reverse(), ...allPhotos.slice().reverse()].map((src, i) => (
              <img
                key={`r2-${i}`}
                className={s.galleryImg}
                src={src}
                alt=""
                loading="lazy"
              />
            ))}
          </div>
        </div>

        {/* Оверлей с кнопкой */}
        <div className={s.galleryOverlay}>
          <motion.div
            className={s.galleryContent}
            variants={fadeUpVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className={s.galleryTitle}>{t('landing.gallery.title')}</h2>
            <p className={s.gallerySubtitle}>
              {t('landing.gallery.subtitle')}
            </p>
            <Link to="/auth">
              <Button variant="primary" size="lg" icon={<MessageCircle size={18} />}>
                {t('landing.gallery.cta')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          8. FOOTER
          ═══════════════════════════════════════ */}
      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerLogo}>Lumina</div>

          <ul className={s.footerLinks}>
            <li>
              <Link className={s.footerLink} to="/community-guidelines">
                {t('landing.footer.communityGuidelines')}
              </Link>
            </li>
            <li>
              <Link className={s.footerLink} to="/privacy">
                {t('landing.footer.privacyPolicy')}
              </Link>
            </li>
            <li>
              <Link className={s.footerLink} to="/terms">
                {t('landing.footer.termsOfService')}
              </Link>
            </li>
            <li>
              <span className={s.footerAge}>18+</span>
            </li>
          </ul>

          <p className={s.footerCopyright}>
            {t('landing.footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
    </PageTransition>
  );
}
