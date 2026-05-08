import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { CompanionOrb } from './home/CompanionOrb';
import { OrbDock } from './home/OrbDock';
import { StarField } from './home/StarField';
import { getMockHomeState } from './home/mockMemories';
import { Timeline } from './memories/Timeline';
import type { MemoryCard } from './home/types';
import s from './Memories.module.css';

type Filter = 'all' | 'quote' | 'milestone';

function tsOf(m: MemoryCard): number {
  return m.kind === 'quote' ? m.attributionTs : m.achievedTs;
}

export default function Memories() {
  const now = useMemo(() => Date.now(), []);
  const home = useMemo(() => getMockHomeState(now), [now]);
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>('all');

  const thought = home.memories.find((m) => m.kind === 'quote');
  const thoughtText =
    thought?.kind === 'quote'
      ? thought.i18nKey
        ? t(thought.i18nKey)
        : thought.text
      : '';

  const sorted = useMemo(
    () => [...home.memories].sort((a, b) => tsOf(b) - tsOf(a)),
    [home.memories],
  );

  const visible = useMemo(() => {
    if (filter === 'all') return sorted;
    return sorted.filter((m) => m.kind === filter);
  }, [sorted, filter]);

  const sinceLabel = useMemo(() => {
    if (sorted.length === 0) return '';
    const oldest = tsOf(sorted[sorted.length - 1]);
    return new Date(oldest).toLocaleDateString(lang, {
      month: 'long',
      year: 'numeric',
    });
  }, [sorted, lang]);

  return (
    <main className={s.page}>
      <StarField intensity="dim" />

      <motion.div
        className={s.shell}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <header
          className={s.hero}
          aria-label={t('landing.redesign.memories.heroAriaLabel', {
            name: home.name,
          })}
        >
          <div className={s.heroText}>
            <p className={s.eyebrow}>{home.name}</p>
            <h1 className={s.title}>
              {lang === 'ru' ? 'Воспоминания' : 'Memories'}
            </h1>
            <p className={s.count}>
              {t('landing.redesign.memories.countLabel', {
                count: home.memories.length,
                since: sinceLabel,
              })}
            </p>
          </div>

          <div className={s.heroOrbSlot}>
            <CompanionOrb
              size="mini"
              mood={home.mood}
              name={home.name}
              thought={thoughtText}
              onOpenChat={() => navigate('/chat')}
            />
          </div>

          <div className={s.filtersRow}>
            <div className={s.filters} role="tablist" aria-label="Filter memories">
              <FilterChip
                label={t('landing.redesign.memories.filterAll')}
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              <FilterChip
                label={t('landing.redesign.memories.filterQuotes')}
                active={filter === 'quote'}
                onClick={() => setFilter('quote')}
              />
              <FilterChip
                label={t('landing.redesign.memories.filterMilestones')}
                active={filter === 'milestone'}
                onClick={() => setFilter('milestone')}
              />
            </div>
          </div>
        </header>

        {visible.length === 0 ? (
          <section className={s.empty}>
            <h2 className={s.emptyTitle}>
              {t('landing.redesign.memories.emptyTitle')}
            </h2>
            <p className={s.emptySubtitle}>
              {t('landing.redesign.memories.emptySubtitle')}
            </p>
          </section>
        ) : (
          <Timeline memories={visible} now={now} locale={lang} />
        )}

        <div className={s.dockSlot}>
          <OrbDock active="memories" />
        </div>
      </motion.div>
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${s.chip} ${active ? s.chipActive : ''}`}
    >
      {label}
    </button>
  );
}
