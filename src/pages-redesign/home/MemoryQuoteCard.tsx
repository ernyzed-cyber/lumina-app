import { Sparkles } from 'lucide-react';
import GlassCard from '../../components-redesign/GlassCard';
import { useLanguage } from '../../i18n';
import { formatRelativeTime } from './relativeTime';
import type { MemoryQuote } from './types';
import s from './MemoryQuoteCard.module.css';

interface Props {
  memory: MemoryQuote;
  now: number;
}

export function MemoryQuoteCard({ memory, now }: Props) {
  const { t } = useLanguage();
  const quote = memory.i18nKey ? t(memory.i18nKey) : memory.text;
  const relative = formatRelativeTime(memory.attributionTs, now, t);

  return (
    <GlassCard className={s.card} padding="lg">
      <div className={s.eyebrow}>
        <Sparkles size={14} aria-hidden="true" />
        <span>{t('landing.redesign.home.quoteEyebrow')}</span>
      </div>
      <blockquote className={s.quote}>“{quote}”</blockquote>
      <p className={s.attribution}>
        {t('landing.redesign.home.attribution', { relative })}
      </p>
    </GlassCard>
  );
}
