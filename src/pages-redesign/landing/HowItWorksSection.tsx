/**
 * HowItWorksSection — "Не как все приложения знакомств".
 * 3 равные карточки в ряд: Одна на одного / Живой характер / Реальные ставки.
 *
 * Анимации:
 *   • Scroll-trigger reveal каждой карточки (stagger 0.12s).
 *   • Hover: lift -4px + brand-gradient outline через ::before mask.
 *
 * Все тексты — через i18n (landing.redesign.howItWorks.*).
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Heart, MessageCircleHeart, Hourglass } from 'lucide-react';
import { useLanguage } from '../../i18n';
import s from './HowItWorksSection.module.css';

type Props = {
  /** id для anchor smooth-scroll'а из hero ghost-кнопки. */
  id?: string;
};

export default function HowItWorksSection({ id = 'how-it-works' }: Props) {
  const reduce = useReducedMotion();
  const { t } = useLanguage();

  const steps = [
    {
      icon: <Heart size={28} fill="currentColor" strokeWidth={0} />,
      title: t('landing.redesign.howItWorks.step1Title'),
      text: t('landing.redesign.howItWorks.step1Text'),
      pull: t('landing.redesign.howItWorks.step1Pull'),
    },
    {
      icon: <MessageCircleHeart size={28} strokeWidth={2} />,
      title: t('landing.redesign.howItWorks.step2Title'),
      text: t('landing.redesign.howItWorks.step2Text'),
      pull: t('landing.redesign.howItWorks.step2Pull'),
    },
    {
      icon: <Hourglass size={28} strokeWidth={2} />,
      title: t('landing.redesign.howItWorks.step3Title'),
      text: t('landing.redesign.howItWorks.step3Text'),
      pull: t('landing.redesign.howItWorks.step3Pull'),
    },
  ];

  return (
    <section id={id} className={s.section} aria-labelledby="hiw-title">
      <div className={s.inner}>
        <motion.div
          className={s.head}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <span className={s.eyebrow}>{t('landing.redesign.howItWorks.eyebrow')}</span>
          <h2 id="hiw-title" className={s.title}>
            {t('landing.redesign.howItWorks.title')}
          </h2>
          <p className={s.subtitle}>{t('landing.redesign.howItWorks.subtitle')}</p>
        </motion.div>

        <div className={s.grid}>
          {steps.map((step, i) => (
            <motion.article
              key={step.title}
              className={s.card}
              initial={reduce ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{
                duration: 0.6,
                delay: i * 0.12,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              <span className={s['card-step']}>{`0${i + 1}`}</span>
              <span className={s['card-icon-wrap']}>{step.icon}</span>
              <h3 className={s['card-title']}>{step.title}</h3>
              <p className={s['card-text']}>{step.text}</p>
              <p className={s['card-pull']}>{step.pull}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
