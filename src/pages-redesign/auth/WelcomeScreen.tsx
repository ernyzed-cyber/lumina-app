/**
 * WelcomeScreen — первый экран /auth.
 *
 * Сценарий:
 *   • "Sign in" → переключает Auth в mode='signIn'
 *   • "Begin the story" → переключает в mode='onboarding' (step=1)
 *
 * Презентационный — все обработчики через props. State живёт в Auth.tsx.
 *
 * 18+ badge — text-only, без блокировки. Реальная age-проверка на NameDob step.
 */
import { useLanguage } from '../../i18n';
import s from './WelcomeScreen.module.css';

interface Props {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function WelcomeScreen({ onSignIn, onSignUp }: Props) {
  const { t } = useLanguage();

  return (
    <div className={s.root}>
      <h2 className={s.title}>{t('landing.redesign.auth.welcome.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.welcome.subtitle')}</p>

      <div className={s.actions}>
        <button type="button" className={s.btnPrimary} onClick={onSignUp}>
          {t('landing.redesign.auth.welcome.signUpBtn')}
        </button>
        <button type="button" className={s.btnGhost} onClick={onSignIn}>
          {t('landing.redesign.auth.welcome.signInBtn')}
        </button>
      </div>

      <div className={s.ageBadge}>{t('landing.redesign.auth.welcome.ageBadge')}</div>
    </div>
  );
}
