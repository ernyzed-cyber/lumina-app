/**
 * ManifestoSection — короткий тёмный мост перед финалом.
 *
 * 4 строки-принципа Lumina, ключевой глагол выделен gradient.
 * Минимум декора (2 фоновых glow), максимум типографики.
 *
 * Все тексты — через i18n (landing.redesign.manifesto.*).
 * Каждая строка состоит из 3 частей (Pre/Strong/Post), strong рендерится с gradient-clip.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import s from './ManifestoSection.module.css';

export default function ManifestoSection() {
  const reduce = useReducedMotion();
  const { t } = useLanguage();

  const lines = [
    {
      pre: t('landing.redesign.manifesto.line1Pre'),
      strong: t('landing.redesign.manifesto.line1Strong'),
      post: t('landing.redesign.manifesto.line1Post'),
    },
    {
      pre: t('landing.redesign.manifesto.line2Pre'),
      strong: t('landing.redesign.manifesto.line2Strong'),
      post: t('landing.redesign.manifesto.line2Post'),
    },
    {
      pre: t('landing.redesign.manifesto.line3Pre'),
      strong: t('landing.redesign.manifesto.line3Strong'),
      post: t('landing.redesign.manifesto.line3Post'),
    },
    {
      pre: t('landing.redesign.manifesto.line4Pre'),
      strong: t('landing.redesign.manifesto.line4Strong'),
      post: t('landing.redesign.manifesto.line4Post'),
    },
  ];

  return (
    <section className={s.section} aria-labelledby="manifesto-title">
      <div className={s['bg-glow-1']} aria-hidden="true" />
      <div className={s['bg-glow-2']} aria-hidden="true" />

      <div className={s.inner}>
        <motion.span
          className={s.eyebrow}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5 }}
        >
          {t('landing.redesign.manifesto.eyebrow')}
        </motion.span>

        <motion.h2
          id="manifesto-title"
          className={s.title}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {t('landing.redesign.manifesto.titlePre')}{' '}
          <span className={s.neq} aria-label="≠" role="img">
            <span aria-hidden="true" />
          </span>{' '}
          {t('landing.redesign.manifesto.titlePost')}
        </motion.h2>

        <ul className={s.lines}>
          {lines.map((line, i) => (
            <motion.li
              key={i}
              className={s.line}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{
                duration: 0.55,
                delay: 0.1 + i * 0.12,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              {line.pre}
              <strong>{line.strong}</strong>
              {line.post}
            </motion.li>
          ))}
        </ul>

        <motion.p
          className={s.closer}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          {t('landing.redesign.manifesto.closer')}
        </motion.p>
      </div>
    </section>
  );
}
