/**
 * GenderStep — onboarding step 1.
 *
 * UX (как в production): 2 карточки (man/woman), auto-advance после выбора 250ms.
 * Auto-advance срабатывает только при первом выборе (если уже выбрано — клик
 * по другой карточке меняет gender, но не двигает дальше — чтобы не дёргать
 * пользователя, если он листает назад).
 *
 * "alreadyHaveAccount" link → onSignIn (на step 1 нет back-кнопки наверху).
 */
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';
import type { Gender } from './types';

interface Props {
  value: Gender | null;
  onChange: (gender: Gender) => void;
  onNext: () => void;
  onSignIn: () => void;
}

export function GenderStep({ value, onChange, onNext, onSignIn }: Props) {
  const { t } = useLanguage();
  const advancedRef = useRef(false);

  /* Auto-advance only on first selection */
  useEffect(() => {
    if (value && !advancedRef.current) {
      advancedRef.current = true;
      const timer = setTimeout(() => {
        onNext();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [value, onNext]);

  return (
    <>
      <h2 className={s.title}>{t('landing.redesign.auth.gender.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.gender.subtitle')}</p>

      <div className={s.cardGrid}>
        <button
          type="button"
          className={s.card}
          data-selected={value === 'male' ? 'true' : 'false'}
          onClick={() => onChange('male')}
        >
          <span className={s.cardIcon}>♂</span>
          {t('landing.redesign.auth.gender.male')}
        </button>
        <button
          type="button"
          className={s.card}
          data-selected={value === 'female' ? 'true' : 'false'}
          onClick={() => onChange('female')}
        >
          <span className={s.cardIcon}>♀</span>
          {t('landing.redesign.auth.gender.female')}
        </button>
      </div>

      <div className={s.footerNav}>
        {t('landing.redesign.auth.gender.alreadyHaveAccount')}
        <button type="button" className={s.footerLink} onClick={onSignIn}>
          {t('landing.redesign.auth.gender.signIn')}
        </button>
      </div>
    </>
  );
}
