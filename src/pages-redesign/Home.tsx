import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { CompanionOrb } from './home/CompanionOrb';
import { OrbDock } from './home/OrbDock';
import { StarField } from './home/StarField';
import { getMockHomeState } from './home/mockMemories';
import s from './Home.module.css';

export default function Home() {
  const now = useMemo(() => Date.now(), []);
  const home = useMemo(() => getMockHomeState(now), [now]);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const thought = home.memories.find((memory) => memory.kind === 'quote');
  const thoughtText = thought?.kind === 'quote'
    ? thought.i18nKey ? t(thought.i18nKey) : thought.text
    : '';

  return (
    <main className={s.page}>
      <StarField />

      <motion.div
        className={s.shell}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <CompanionOrb
          mood={home.mood}
          name={home.name}
          thought={thoughtText}
          onOpenChat={() => navigate('/chat')}
        />
        <section className={s.identity} aria-label={t('landing.redesign.home.heroAriaLabel')}>
          <p className={s.name}>{home.name}</p>
          <p className={s.state}>{t(home.moodLineKey)}</p>
        </section>
        <OrbDock active="home" />
      </motion.div>
    </main>
  );
}
