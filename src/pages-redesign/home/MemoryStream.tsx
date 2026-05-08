import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { MemoryMilestoneCard } from './MemoryMilestoneCard';
import { MemoryQuoteCard } from './MemoryQuoteCard';
import type { MemoryCard } from './types';
import s from './MemoryStream.module.css';

interface Props {
  memories: MemoryCard[];
  now: number;
}

export function MemoryStream({ memories, now }: Props) {
  const { t } = useLanguage();

  return (
    <section className={s.stream} aria-labelledby="home-memories-title">
      <div className={s.header}>
        <p className={s.eyebrow}>{t('landing.redesign.home.memoriesEyebrow')}</p>
        <h2 id="home-memories-title" className={s.title}>
          {t('landing.redesign.home.memoriesTitle')}
        </h2>
      </div>

      <div className={s.list}>
        {memories.map((memory, index) => (
          <motion.div
            key={memory.id}
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.42, delay: Math.min(index * 0.05, 0.2), ease: [0.22, 1, 0.36, 1] }}
          >
            {memory.kind === 'quote' ? (
              <MemoryQuoteCard memory={memory} now={now} />
            ) : (
              <MemoryMilestoneCard memory={memory} now={now} />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
