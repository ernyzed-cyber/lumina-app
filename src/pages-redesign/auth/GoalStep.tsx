/**
 * GoalStep — onboarding step 4: цель знакомства.
 *
 * 4 карточки в grid 2x2: relationship / chat / flirt / friendship.
 * Auto-advance после первого выбора (250ms), как в production.
 *
 * Лейблы карточек берём из существующих `auth.goals` (используются и
 * на странице профиля). Заголовок/подзаголовок — из redesign namespace.
 */
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';
import type { Goal } from './types';

interface Props {
  value: Goal | null;
  onChange: (goal: Goal) => void;
  onNext: () => void;
  onBack: () => void;
}

const GOAL_KEYS: { key: Goal; icon: string }[] = [
  { key: 'relationship', icon: '💞' },
  { key: 'chat', icon: '💬' },
  { key: 'flirt', icon: '✨' },
  { key: 'friendship', icon: '🤝' },
];

export function GoalStep({ value, onChange, onNext, onBack }: Props) {
  const { t } = useLanguage();
  const advancedRef = useRef(false);

  useEffect(() => {
    if (value && !advancedRef.current) {
      advancedRef.current = true;
      const timer = setTimeout(onNext, 250);
      return () => clearTimeout(timer);
    }
  }, [value, onNext]);

  return (
    <>
      <button type="button" className={s.backBtn} onClick={onBack}>
        ←
      </button>

      <h2 className={s.title}>{t('landing.redesign.auth.goal.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.goal.subtitle')}</p>

      <div className={s.cardGrid}>
        {GOAL_KEYS.map(({ key, icon }) => (
          <button
            key={key}
            type="button"
            className={s.card}
            data-selected={value === key ? 'true' : 'false'}
            onClick={() => onChange(key)}
          >
            <span className={s.cardIcon}>{icon}</span>
            {t(`auth.goals.${key}`)}
          </button>
        ))}
      </div>
    </>
  );
}
