import { useMemo } from 'react';
import type { MemoryCard } from '../home/types';
import { moodForId, moodTint } from '../home/moodForId';
import { MemoryCardV2 } from './MemoryCardV2';
import s from './Timeline.module.css';

type Group = {
  key: string;
  /** Already-localised label like "May 2026". */
  label: string;
  items: MemoryCard[];
};

function tsOf(m: MemoryCard): number {
  return m.kind === 'quote' ? m.attributionTs : m.achievedTs;
}

function groupByMonth(memories: MemoryCard[], locale: string): Group[] {
  const byKey = new Map<string, Group>();
  for (const m of memories) {
    const d = new Date(tsOf(m));
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
    const label = d.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
    let g = byKey.get(key);
    if (!g) {
      g = { key, label, items: [] };
      byKey.set(key, g);
    }
    g.items.push(m);
  }
  // Newest month first. Keys sort lexicographically thanks to padded months.
  return Array.from(byKey.values()).sort((a, b) =>
    a.key < b.key ? 1 : a.key > b.key ? -1 : 0,
  );
}

type Props = {
  memories: MemoryCard[];
  now: number;
  locale: string;
};

/**
 * Vertical timeline: hairline rail on the left + mood-tinted nodes per card,
 * sticky month headers, MemoryCardV2 on the right.
 *
 * Memories are pre-sorted newest-first by the page; we group them into months
 * keeping order intact (each group's items stay in the order they came in).
 */
export function Timeline({ memories, now, locale }: Props) {
  const groups = useMemo(
    () => groupByMonth(memories, locale),
    [memories, locale],
  );

  if (memories.length === 0) return null;

  return (
    <div className={s.timeline}>
      <div className={s.rail} aria-hidden="true" />

      {groups.map((group) => (
        <section key={group.key} className={s.group}>
          <header className={s.monthHeader}>
            <span className={s.monthLabel}>{group.label}</span>
          </header>

          <ul className={s.list}>
            {group.items.map((memory) => {
              const mood = moodForId(memory.id);
              return (
                <li key={memory.id} className={s.row}>
                  <span
                    className={s.node}
                    style={
                      {
                        '--node-tint': moodTint(mood, 0.9),
                      } as React.CSSProperties
                    }
                    aria-hidden="true"
                  />
                  <div className={s.cardWrap}>
                    <MemoryCardV2 memory={memory} mood={mood} now={now} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
