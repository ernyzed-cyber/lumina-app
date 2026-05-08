/**
 * FeatureSection — переиспользуемая Mamba-секция (текст + phone + fluffy).
 *
 * Принимает на вход: title / subtitle / cta / phone-content / fluffy-content.
 * Переключает чередование через side='left' | 'right'.
 * Пастельный фон через bg prop.
 *
 * Phone и fluffy — пока CSS-placeholder'ы. Когда появятся файлы в src/assets/landing/,
 * заменю renderPhone и renderFluffy на <img src=...>.
 */

import { type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import s from './FeatureSection.module.css';

export type FeatureSectionProps = {
  /** Сторона, на которой текст. Phone+fluffy идут с противоположной. */
  side: 'left' | 'right';
  /** Background CSS-цвет/градиент секции (light mode). */
  bg: string;
  /** Background для dark-mode (опционально, fallback = bg). */
  bgDark?: string;
  /** Background следующей секции — для wave-divider mask (light mode). */
  bgNext?: string;
  /** Background следующей секции для dark-mode wave (опционально). */
  bgNextDark?: string;
  /** Foreground (для title) — обычно тёмный, но можно переопределить. */
  fg?: string;
  /** Foreground для dark-mode (по умолчанию #F5F5F7). */
  fgDark?: string;
  /** Muted foreground (для subtitle). */
  fgMuted?: string;
  /** Muted foreground для dark-mode. */
  fgMutedDark?: string;
  /** Background phone'а — внутренняя карточка. */
  phoneBg?: string;
  /** Цвет fluffy 3D-объекта (radial-gradient). */
  fluffyColor?: string;
  /** Контент внутри fluffy (lucide-иконка). */
  fluffyIcon?: ReactNode;
  /** Заголовок секции. */
  title: ReactNode;
  /** Подзаголовок. */
  subtitle: ReactNode;
  /** Текст CTA-кнопки. */
  ctaLabel: string;
  /** href CTA. */
  ctaHref: string;
  /** Контент phone'а: caption + кнопка. */
  phoneCaption: string;
  phoneButtonLabel: string;
  /** Wave-разделители — отключай для первой/последней секции. */
  waveTop?: boolean;
  waveBottom?: boolean;
  /** Path к image phone-mockup'у (опционально, для замены placeholder). */
  phoneImageSrc?: string;
  phoneImageAlt?: string;
  /** Path к fluffy 3D-объекту (опционально). */
  fluffyImageSrc?: string;
  fluffyImageAlt?: string;
  /** Если задан id — для anchor scroll. */
  id?: string;
};

export default function FeatureSection({
  side,
  bg,
  bgDark,
  bgNext,
  bgNextDark,
  fg,
  fgDark,
  fgMuted,
  fgMutedDark,
  phoneBg,
  fluffyColor,
  fluffyIcon,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  phoneCaption,
  phoneButtonLabel,
  waveTop = true,
  waveBottom = true,
  phoneImageSrc,
  phoneImageAlt,
  fluffyImageSrc,
  fluffyImageAlt,
  id,
}: FeatureSectionProps) {
  const reduce = useReducedMotion();

  const sectionStyle = {
    '--feature-bg': bg,
    '--feature-bg-dark': bgDark ?? bg,
    '--feature-bg-next': bgNext ?? bg,
    '--feature-bg-next-dark': bgNextDark ?? bgDark ?? bgNext ?? bg,
    '--feature-fg': fg ?? '#1A1A1A',
    '--feature-fg-dark': fgDark ?? '#F5F5F7',
    '--feature-fg-muted': fgMuted ?? 'rgba(26, 26, 26, 0.7)',
    '--feature-fg-muted-dark': fgMutedDark ?? 'rgba(245, 245, 247, 0.7)',
    '--phone-bg': phoneBg ?? 'linear-gradient(180deg, #FBB9DF 0%, #EC4899 100%)',
    '--fluffy-color': fluffyColor ?? 'radial-gradient(circle at 35% 30%, #C4B5FD 0%, #8B5CF6 70%)',
  } as CSSProperties;

  return (
    <section
      id={id}
      className={s.section}
      data-side={side}
      data-wave-top={waveTop ? 'true' : 'false'}
      data-wave-bottom={waveBottom ? 'true' : 'false'}
      style={sectionStyle}
    >
      <div className={s.inner}>
        {/* Text column */}
        <motion.div
          className={s.text}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <h2 className={s.title}>{title}</h2>
          <p className={s.subtitle}>{subtitle}</p>
          <div className={s['cta-row']}>
            <a href={ctaHref} className={s.cta}>
              {ctaLabel}
            </a>
          </div>
        </motion.div>

        {/* Mockup column */}
        <motion.div
          className={s.mockup}
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {phoneImageSrc ? (
            <img
              src={phoneImageSrc}
              alt={phoneImageAlt ?? ''}
              className={s['phone-img']}
              draggable={false}
            />
          ) : (
            <div className={s.phone} aria-hidden="true">
              <div className={s['phone-decor']} />
              <div className={s['phone-content']}>
                <p className={s['phone-caption']}>{phoneCaption}</p>
                <div className={s['phone-button']}>{phoneButtonLabel}</div>
              </div>
            </div>
          )}

          {fluffyImageSrc ? (
            <img
              src={fluffyImageSrc}
              alt={fluffyImageAlt ?? ''}
              className={s['fluffy-img']}
              draggable={false}
            />
          ) : (
            <div className={s.fluffy} aria-hidden="true">
              {fluffyIcon}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
