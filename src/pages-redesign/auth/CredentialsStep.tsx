/**
 * CredentialsStep — onboarding step 5: email + password + Terms + Turnstile.
 *
 * Submission delegated to Auth.tsx via onSubmit (async). Получает
 * isSubmitting для блокировки UI.
 *
 * Turnstile token — ВАЖНО — управляется снаружи (Auth.tsx) через
 * onTurnstileToken, потому что после регистрации ему нужно слать токен
 * в edge-function (когда verify-turnstile задеплоится). Локально храним
 * только показывать ли виджет.
 *
 * Validation (frontend-only — server тоже проверит):
 *   • email matches /\S+@\S+\.\S+/
 *   • password ≥ 8
 *   • terms accepted
 *   • turnstile token present (если widget enabled)
 *
 * Google OAuth: если юзер кликает "Continue with Google", все данные
 * шагов 1-4 теряются (это OK — Google flow редиректит, и onboarding
 * просто не завершится; profile data можно будет добавить позже на
 * странице профиля). Это compromise vs production.
 */
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';

interface Props {
  email: string;
  password: string;
  termsAccepted: boolean;
  turnstileToken: string | null;
  isSubmitting: boolean;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onChangeTerms: (v: boolean) => void;
  onTurnstileToken: (token: string | null) => void;
  onSubmit: () => void;
  onGoogleSignIn: () => void;
  onBack: () => void;
  onShowError: (msgKey: string) => void;
}

export function CredentialsStep(props: Props) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (props.isSubmitting) return;

    if (!props.email.trim() || !props.password) {
      props.onShowError('landing.redesign.auth.validation.fillAllFields');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(props.email)) {
      props.onShowError('landing.redesign.auth.validation.invalidEmail');
      return;
    }
    if (props.password.length < 8) {
      props.onShowError('landing.redesign.auth.validation.passwordMinLength');
      return;
    }
    if (!props.termsAccepted) {
      props.onShowError('landing.redesign.auth.validation.acceptTerms');
      return;
    }
    if (turnstileSiteKey && !props.turnstileToken) {
      props.onShowError('landing.redesign.auth.validation.captchaRequired');
      return;
    }

    props.onSubmit();
  }

  return (
    <>
      <button type="button" className={s.backBtn} onClick={props.onBack}>
        ←
      </button>

      <h2 className={s.title}>{t('landing.redesign.auth.credentials.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.credentials.subtitle')}</p>

      <button
        type="button"
        className={s.btnGoogle}
        onClick={props.onGoogleSignIn}
        disabled={props.isSubmitting}
      >
        <GoogleIcon />
        {t('landing.redesign.auth.credentials.googleBtn')}
      </button>

      <div className={s.divider}>{t('landing.redesign.auth.credentials.orDivider')}</div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={s.field}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className={s.input}
            placeholder={t('landing.redesign.auth.credentials.emailPlaceholder')}
            value={props.email}
            onChange={(e) => props.onChangeEmail(e.target.value)}
            disabled={props.isSubmitting}
          />
        </div>

        <div className={s.field}>
          <div className={s.passwordWrap}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={s.input}
              placeholder={t('landing.redesign.auth.credentials.passwordPlaceholder')}
              value={props.password}
              onChange={(e) => props.onChangePassword(e.target.value)}
              disabled={props.isSubmitting}
            />
            <button
              type="button"
              className={s.passwordToggle}
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <label className={s.checkbox}>
          <input
            type="checkbox"
            checked={props.termsAccepted}
            onChange={(e) => props.onChangeTerms(e.target.checked)}
            disabled={props.isSubmitting}
          />
          <span>
            {t('landing.redesign.auth.credentials.termsPre')}{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer">
              {t('landing.redesign.auth.credentials.termsLink')}
            </a>
          </span>
        </label>

        {turnstileSiteKey && (
          <div className={s.turnstileWrap}>
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={(token) => props.onTurnstileToken(token)}
              onError={() => props.onTurnstileToken(null)}
              onExpire={() => props.onTurnstileToken(null)}
              options={{ theme: 'auto', size: 'flexible' }}
            />
          </div>
        )}

        <button
          type="submit"
          className={s.btnPrimary}
          disabled={props.isSubmitting}
        >
          {t('landing.redesign.auth.credentials.submitBtn')}
        </button>
      </form>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.32z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
