import { Heart, Moon, Sparkles, Star } from 'lucide-react';
import GlassCard from '../../components-redesign/GlassCard';
import { useLanguage } from '../../i18n';
import { formatRelativeTime } from './relativeTime';
import type { MemoryMilestone } from './types';
import s from './MemoryMilestoneCard.module.css';

const icons = {
  sparkle: Sparkles,
  heart: Heart,
  star: Star,
  moon: Moon,
};

interface Props {
  memory: MemoryMilestone;
  now: number;
}

export function MemoryMilestoneCard({ memory, now }: Props) {
  const { t } = useLanguage();
  const Icon = icons[memory.icon];
  const relative = formatRelativeTime(memory.achievedTs, now, t);

  return (
    <GlassCard className={s.card} padding="lg">
      <div className={s.iconWrap} aria-hidden="true">
        <Icon size={26} />
      </div>
      <div className={s.content}>
        <p className={s.kicker}>{relative}</p>
        <h3 className={s.title}>{t(memory.titleKey)}</h3>
        {memory.subtitleKey && <p className={s.subtitle}>{t(memory.subtitleKey)}</p>}
      </div>
    </GlassCard>
  );
}
