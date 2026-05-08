/**
 * FinalCtaSection — финальный full-bleed CTA блок + минималистичный footer.
 *
 * "Она уже ждёт." (italic Playfair) + одна большая белая кнопка на gradient bg.
 * Footer: brand · Terms · Privacy · Community Guidelines · ©.
 *
 * Все тексты — через i18n (landing.redesign.finalCta.*, landing.redesign.footer.*).
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n';
import s from './FinalCtaSection.module.css';

type Props = {
  ctaHref?: string;
};

export default function FinalCtaSection({ ctaHref = '/auth' }: Props) {
  const reduce = useReducedMotion();
  const { t } = useLanguage();

  return (
    <>
      <section className={s.cta} aria-labelledby="final-cta-title">
        <motion.div
          className={s['cta-inner']}
          initial={reduce ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <span className={s['cta-eyebrow']}>
            <Sparkles size={12} strokeWidth={2.5} />
            {t('landing.redesign.finalCta.eyebrow')}
          </span>

          <h2 id="final-cta-title" className={s['cta-title']}>
            {t('landing.redesign.finalCta.title')}
          </h2>

          <p className={s['cta-text']}>
            {t('landing.redesign.finalCta.text')}
          </p>

          <a href={ctaHref} className={s['cta-button']}>
            {t('landing.redesign.finalCta.ctaLabel')}
            <ArrowRight size={20} strokeWidth={2.5} />
          </a>
        </motion.div>
      </section>

      <footer className={s.footer}>
        <div className={s['footer-inner']}>
          <span className={s['footer-brand']}>Lumina</span>
          <nav className={s['footer-links']} aria-label={t('landing.redesign.footer.legalNavLabel')}>
            <a href="/terms" className={s['footer-link']}>
              {t('landing.redesign.footer.terms')}
            </a>
            <a href="/privacy" className={s['footer-link']}>
              {t('landing.redesign.footer.privacy')}
            </a>
            <a href="/guidelines" className={s['footer-link']}>
              {t('landing.redesign.footer.guidelines')}
            </a>
          </nav>
          <span className={s['footer-copy']}>
            © {new Date().getFullYear()} Lumina
          </span>
        </div>
      </footer>
    </>
  );
}
