/**
 * SignInScreen — login через email/password или Google OAuth.
 *
 * Делегирует всю auth-логику в Auth.tsx через onSubmit/onGoogleSignIn props.
 * Сам только держит локальный form-state (email, pwd, showPwd, forgot-modal).
 *
 * Forgot password (FIX vs production):
 *   В prod был "dead button" без обработчика. Здесь — реальный flow:
 *   модалка → email → supabase.auth.resetPasswordForEmail → toast.
 *
 * Captcha-string fix (vs production):
 *   В prod на login-форме перед signIn была проверка `if (!turnstileToken)`
 *   с hardcoded EN message. Login → CAPTCHA не нужна (Turnstile только на регистрации).
 *
 * onForgotPassword - функция асинхронная, родитель отдаёт supabase-call + toast.
 */
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';

interface Props {
  onSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onBackToWelcome: () => void;
  isSubmitting: boolean;
}

export function SignInScreen({
  onSubmit,
  onGoogleSignIn,
  onForgotPassword,
  onBackToWelcome,
  isSubmitting,
}: Props) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSending, setForgotSending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    await onSubmit(email, password);
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    if (forgotSending || !forgotEmail) return;
    setForgotSending(true);
    try {
      await onForgotPassword(forgotEmail);
      setForgotOpen(false);
      setForgotEmail('');
    } finally {
      setForgotSending(false);
    }
  }

  return (
    <>
      <button type="button" className={s.backBtn} onClick={onBackToWelcome}>
        ← {t('landing.redesign.auth.welcome.signInBtn')}
      </button>

      <h2 className={s.title}>{t('landing.redesign.auth.signIn.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.signIn.subtitle')}</p>

      <button
        type="button"
        className={s.btnGoogle}
        onClick={onGoogleSignIn}
        disabled={isSubmitting}
      >
        <GoogleIcon />
        {t('landing.redesign.auth.signIn.googleBtn')}
      </button>

      <div className={s.divider}>{t('landing.redesign.auth.signIn.orDivider')}</div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={s.field}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            className={s.input}
            placeholder={t('landing.redesign.auth.signIn.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className={s.field}>
          <div className={s.passwordWrap}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={s.input}
              placeholder={t('landing.redesign.auth.signIn.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className={s.passwordToggle}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword
                  ? t('landing.redesign.auth.signIn.hidePassword')
                  : t('landing.redesign.auth.signIn.showPassword')
              }
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="button"
          className={s.forgotLink}
          onClick={() => {
            setForgotEmail(email);
            setForgotOpen(true);
          }}
        >
          {t('landing.redesign.auth.signIn.forgotPassword')}
        </button>

        <button
          type="submit"
          className={s.btnPrimary}
          disabled={isSubmitting}
        >
          {t('landing.redesign.auth.signIn.submitBtn')}
        </button>
      </form>

      <div className={s.footerNav}>
        {t('landing.redesign.auth.signIn.noAccount')}
        <button
          type="button"
          className={s.footerLink}
          onClick={onBackToWelcome}
        >
          {t('landing.redesign.auth.signIn.createOne')}
        </button>
      </div>

      {forgotOpen && (
        <ForgotPasswordModal
          email={forgotEmail}
          onChangeEmail={setForgotEmail}
          onSubmit={handleForgotSubmit}
          onCancel={() => setForgotOpen(false)}
          sending={forgotSending}
        />
      )}
    </>
  );
}

/* ── Google "G" mark (inline SVG, no extra dependency) ── */
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

/* ── Forgot password modal (inline; no portal needed for /auth) ── */
interface ForgotProps {
  email: string;
  onChangeEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  sending: boolean;
}

function ForgotPasswordModal({ email, onChangeEmail, onSubmit, onCancel, sending }: ForgotProps) {
  const { t } = useLanguage();
  return (
    <div className={s.modalBackdrop} role="dialog" aria-modal="true" onClick={onCancel}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={s.modalTitle}>{t('landing.redesign.auth.signIn.forgotModalTitle')}</h3>
        <p className={s.modalText}>{t('landing.redesign.auth.signIn.forgotModalText')}</p>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            inputMode="email"
            className={s.input}
            placeholder={t('landing.redesign.auth.signIn.emailPlaceholder')}
            value={email}
            onChange={(e) => onChangeEmail(e.target.value)}
            autoFocus
            disabled={sending}
          />
          <div className={s.modalActions}>
            <button type="button" className={s.btnSecondary} onClick={onCancel} disabled={sending}>
              {t('landing.redesign.auth.signIn.forgotCancel')}
            </button>
            <button type="submit" className={s.btnPrimary} disabled={sending || !email}>
              {t('landing.redesign.auth.signIn.forgotSendBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
