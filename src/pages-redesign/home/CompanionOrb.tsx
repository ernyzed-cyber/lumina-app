import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { CompanionMood } from './types';
import s from './CompanionOrb.module.css';

type CompanionOrbProps = {
  mood: CompanionMood;
  name: string;
  thought: string;
  onOpenChat: () => void;
  /**
   * `full` — Home hero (default).
   * `mini` — compact presence bead (~96px) for read-heavy pages.
   *   Hides rings, beam, and the floating thought; tap still opens chat.
   */
  size?: 'full' | 'mini';
};

const moodClass: Record<CompanionMood, string> = {
  thoughtful: s.moodThoughtful,
  warm: s.moodWarm,
  playful: s.moodPlayful,
  'missing-you': s.moodMissingYou,
  quiet: s.moodQuiet,
  tender: s.moodTender,
  curious: s.moodCurious,
};

export function CompanionOrb({ mood, name, thought, onOpenChat, size = 'full' }: CompanionOrbProps) {
  const reducedMotion = useReducedMotion();
  const [listening, setListening] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thoughtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const clearHoldTimer = () => {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const revealThought = () => {
    held.current = true;
    setListening(true);
    if (thoughtTimer.current) clearTimeout(thoughtTimer.current);
    thoughtTimer.current = setTimeout(() => {
      setListening(false);
      held.current = false;
      thoughtTimer.current = null;
    }, 3200);
  };

  const handlePointerDown = () => {
    clearHoldTimer();
    held.current = false;
    holdTimer.current = setTimeout(revealThought, 480);
  };

  const handlePointerUp = () => {
    clearHoldTimer();
  };

  const handleClick = () => {
    if (held.current) return;
    onOpenChat();
  };

  const isMini = size === 'mini';

  return (
    <section
      className={`${s.stage} ${isMini ? s.stageMini : ''}`}
      aria-label={`${name} presence`}
    >
      {!isMini && (
        <motion.p
          className={s.thought}
          initial={false}
          animate={{
            opacity: listening && thought ? 1 : 0,
            y: listening ? 0 : 8,
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
        >
          {thought}
        </motion.p>
      )}

      <div className={`${s.orbWrap} ${moodClass[mood]} ${listening ? s.listening : ''} ${isMini ? s.orbWrapMini : ''}`}>
        {!isMini && <span className={s.beam} aria-hidden="true" />}
        <span className={`${s.ring} ${s.ringA}`} aria-hidden="true" />
        <span className={`${s.ring} ${s.ringB}`} aria-hidden="true" />

        <motion.span
          className={s.halo}
          aria-hidden="true"
          animate={
            reducedMotion
              ? undefined
              : { scale: listening ? [1, 1.12, 1] : [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }
          }
          transition={
            reducedMotion
              ? undefined
              : { duration: listening ? 4.5 : 6, repeat: Infinity, ease: 'easeInOut' }
          }
        />

        <motion.button
          type="button"
          className={s.orbButton}
          aria-label={`Open chat with ${name}. Hold to listen.`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={clearHoldTimer}
          onPointerLeave={clearHoldTimer}
          onClick={handleClick}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={
            reducedMotion
              ? { opacity: 1, scale: 1 }
              : {
                  opacity: 1,
                  scale: listening ? [1, 1.05, 1] : [1, 1.04, 1],
                }
          }
          transition={
            reducedMotion
              ? { duration: 0.8 }
              : {
                  opacity: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                  scale: {
                    duration: listening ? 4.5 : 6,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }
          }
        >
          {/* Glass bubble — 6 layers stacked */}
          <span className={s.bubble} aria-hidden="true">
            <span className={s.refraction} />
            <span className={s.core} />
            <span className={s.innerGlow} />
            <span className={s.rim} />
            <span className={s.specularBottom} />
            <span className={s.specularTop} />
          </span>
        </motion.button>
      </div>
    </section>
  );
}
