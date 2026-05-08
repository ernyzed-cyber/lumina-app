import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Moon, Sparkles, Star } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { formatRelativeTime } from '../home/relativeTime';
import { moodPalettes } from '../home/moodPalettes';
import type { CompanionMood, MemoryCard } from '../home/types';
import s from './MemoryCardV2.module.css';

const milestoneIcons = {
  sparkle: Sparkles,
  heart: Heart,
  star: Star,
  moon: Moon,
} as const;

type Props = {
  memory: MemoryCard;
  /** Mood seed used to tint the left accent slash. Stable per-id. */
  mood: CompanionMood;
  now: number;
};

/**
 * Single timeline entry. Renders both quote and milestone variants.
 * Tap toggles an accordion that reveals mock context strings.
 */
export function MemoryCardV2({ memory, mood, now }: Props) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const palette = moodPalettes[mood];
  const accentStyle = {
    '--memory-accent': palette[0],
    '--memory-glow': palette[1],
  } as React.CSSProperties;

  const ts = memory.kind === 'quote' ? memory.attributionTs : memory.achievedTs;
  const relative = formatRelativeTime(ts, now, t);
  const context = memory.context;
  const hasContext = Boolean(context && (context.beforeKey || context.afterKey));

  const handleToggle = () => {
    if (!hasContext) return;
    setExpanded((v) => !v);
  };

  return (
    <article
      className={`${s.card} ${expanded ? s.expanded : ''} ${hasContext ? s.interactive : ''}`}
      style={accentStyle}
    >
      <button
        type="button"
        className={s.header}
        onClick={handleToggle}
        aria-expanded={hasContext ? expanded : undefined}
        aria-disabled={hasContext ? undefined : true}
      >
        <span className={s.accent} aria-hidden="true" />

        <div className={s.body}>
          {memory.kind === 'quote' ? (
            <QuoteBody memory={memory} relative={relative} t={t} />
          ) : (
            <MilestoneBody memory={memory} relative={relative} t={t} />
          )}

          {hasContext && (
            <p className={s.hint} aria-hidden="true">
              {expanded
                ? t('landing.redesign.memories.collapseHint')
                : t('landing.redesign.memories.expandHint')}
            </p>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && hasContext && (
          <motion.div
            className={s.contextWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={s.context}>
              <p className={s.contextEyebrow}>
                {t('landing.redesign.memories.contextEyebrow')}
              </p>
              {context?.beforeKey && (
                <p className={s.contextLine}>{t(context.beforeKey)}</p>
              )}
              {context?.afterKey && (
                <p className={`${s.contextLine} ${s.contextAfter}`}>
                  {t(context.afterKey)}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function QuoteBody({
  memory,
  relative,
  t,
}: {
  memory: Extract<MemoryCard, { kind: 'quote' }>;
  relative: string;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  const text = memory.i18nKey ? t(memory.i18nKey) : memory.text;
  return (
    <>
      <p className={s.eyebrow}>
        <Sparkles size={12} aria-hidden="true" />
        <span>{t('landing.redesign.home.quoteEyebrow')}</span>
        <span className={s.eyebrowDot} aria-hidden="true">·</span>
        <span className={s.eyebrowTime}>{relative}</span>
      </p>
      <blockquote className={s.quote}>“{text}”</blockquote>
    </>
  );
}

function MilestoneBody({
  memory,
  relative,
  t,
}: {
  memory: Extract<MemoryCard, { kind: 'milestone' }>;
  relative: string;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  const Icon = milestoneIcons[memory.icon];
  return (
    <>
      <p className={s.eyebrow}>
        <Icon size={12} aria-hidden="true" />
        <span className={s.eyebrowTime}>{relative}</span>
      </p>
      <h3 className={s.milestoneTitle}>{t(memory.titleKey)}</h3>
      {memory.subtitleKey && (
        <p className={s.milestoneSubtitle}>{t(memory.subtitleKey)}</p>
      )}
    </>
  );
}
