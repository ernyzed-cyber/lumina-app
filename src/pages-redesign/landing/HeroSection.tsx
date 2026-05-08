/**
 * HeroSection — full-viewport split hero для Landing.
 *
 * Слева:
 *   • Eyebrow chip "Сейчас онлайн" (живая точка)
 *   • Editorial title (Playfair italic accent на 'твоя')
 *   • Lede подзаголовок
 *   • CTA: primary "Найти свою" (gradient) + ghost "Как это работает"
 *   • Trust row: ★★★★★ · 12 000 ранних доступов
 *
 * Справа:
 *   • Breathing portrait card (380×507, aspect 3:4)
 *   • Placeholder gradient + крупный 'S' (Sofia)
 *   • Online chip top-left + verified name + meta + distance pill снизу
 *   • Glow-halo вокруг
 *
 * Анимации:
 *   • Mesh-blobs (CSS keyframes)
 *   • Portrait scale 1 → 1.015 каждые 6s (framer-motion)
 *   • Follow-cursor parallax ±6px (mouse move)
 *
 * Все тексты — через i18n (landing.redesign.hero.*).
 */

import { type CSSProperties, type MouseEvent, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, ArrowRight, ChevronDown } from 'lucide-react';
import Button from '../../components-redesign/Button';
import { useLanguage } from '../../i18n';
import heroPhone from '../../assets/landing/hero-phone-mockup-removebg-preview.png';
import s from './HeroSection.module.css';

type HeroSectionProps = {
  /** Smooth-scroll target id для ghost-CTA. */
  howItWorksId?: string;
  /** href primary CTA. */
  ctaHref?: string;
};

export default function HeroSection({
  howItWorksId = 'how-it-works',
  ctaHref = '/auth',
}: HeroSectionProps) {
  const reduce = useReducedMotion();
  const { t } = useLanguage();
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 ... 0.5
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: cx * 12, y: cy * 12 }); // ±6px
  };

  const onMouseLeave = () => setParallax({ x: 0, y: 0 });

  const onGhostClick = () => {
    const target = document.getElementById(howItWorksId);
    if (target) {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <section className={s.hero} aria-labelledby="hero-title">
      {/* Mesh blobs */}
      <div className={`${s['hero-blob']} ${s['hero-blob-1']}`} aria-hidden="true" />
      <div className={`${s['hero-blob']} ${s['hero-blob-2']}`} aria-hidden="true" />
      <div className={`${s['hero-blob']} ${s['hero-blob-3']}`} aria-hidden="true" />

      <div className={s['hero-inner']}>
        {/* ── Left ─────────────────────────────────────── */}
        <motion.div
          className={s['hero-left']}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <span className={s['hero-eyebrow']}>
            <span className={s['hero-eyebrow-dot']} aria-hidden="true" />
            {t('landing.redesign.hero.eyebrow')}
          </span>

          <h1 id="hero-title" className={s['hero-title']}>
            {t('landing.redesign.hero.titleLine1')}<br />
            {t('landing.redesign.hero.titleLine2Pre')}
            <span className={s['hero-title-accent']}>
              {t('landing.redesign.hero.titleLine2Accent')}
            </span>
            {t('landing.redesign.hero.titleLine2Post')}<br />
            {t('landing.redesign.hero.titleLine3')}
          </h1>

          <p className={s['hero-lede']}>
            {t('landing.redesign.hero.lede')}
          </p>

          <div className={s['hero-cta-row']}>
            <Button href={ctaHref} variant="gradient" size="lg" iconRight={<ArrowRight size={18} />}>
              {t('landing.redesign.hero.ctaPrimary')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onGhostClick}
              iconRight={<ChevronDown size={18} />}
            >
              {t('landing.redesign.hero.ctaSecondary')}
            </Button>
          </div>

          <div className={s['hero-trust']}>
            <span className={s['hero-trust-stars']} aria-label="5 / 5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </span>
            <span>{t('landing.redesign.hero.trustRating')}</span>
            <span className={s['hero-trust-divider']} aria-hidden="true" />
            <span>{t('landing.redesign.hero.trustWaiting')}</span>
          </div>
        </motion.div>

        {/* ── Right: portrait card ──────────────────────── */}
        <motion.div
          className={s['hero-right']}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <motion.div
            className={s['hero-portrait']}
            data-no-card="true"
            style={
              {
                transform: `translate(${parallax.x}px, ${parallax.y}px)`,
                transition: 'transform 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)',
              } as CSSProperties
            }
            animate={
              reduce
                ? undefined
                : {
                    scale: [1, 1.015, 1],
                  }
            }
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className={s['hero-portrait-glow']} aria-hidden="true" />

            {/* Реальный phone-mockup (PNG без фона) */}
            <img
              src={heroPhone}
              alt=""
              aria-hidden="true"
              className={s['hero-phone']}
              draggable={false}
            />

            {/* Distance pill — снаружи карточки */}
            <span className={s['hero-distance-pill']}>
              {t('landing.redesign.hero.distancePill')}
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
