import { useState, useMemo, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Heart,
  MessageCircle,
  Sparkles,
  Users,
  MapPin,
  Send,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useLanguage } from '../i18n';
import { supabase } from '../lib/supabase';
import { isValidEmail, getPasswordStrength, storage } from '../utils/helpers';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import PageTransition from '../components/layout/PageTransition';
import { Turnstile } from '@marsidev/react-turnstile';
import { useTelegramVerified } from '../hooks/useTelegramVerified';
import s from './Auth.module.css';

/* ── Types ── */
type Gender = 'male' | 'female' | null;
type Goal = 'relationship' | 'chat' | 'flirt' | 'friendship' | null;
type AuthMode = 'login' | 'onboarding';

/* ── Google SVG icon (inline) ── */
function GoogleIcon() {
  return (
    <svg className={s.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ── Animation variants ── */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
  }),
};

/* ── Constants ── */
const GOAL_ICONS: Record<string, typeof Heart> = {
  relationship: Heart,
  chat: MessageCircle,
  flirt: Sparkles,
  friendship: Users,
};

const TOTAL_ONBOARDING_STEPS = 6;

export default function Auth() {
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { t, tr } = useLanguage();
  const navigate = useNavigate();

  /* ── Translated data arrays ── */
  const MONTHS = tr.auth.months as string[];
  const POPULAR_CITIES = tr.auth.cities as string[];

  const GOALS: { key: Goal; label: string; icon: typeof Heart }[] = [
    { key: 'relationship', label: t('auth.goals.relationship'), icon: GOAL_ICONS.relationship },
    { key: 'chat', label: t('auth.goals.chat'), icon: GOAL_ICONS.chat },
    { key: 'flirt', label: t('auth.goals.flirt'), icon: GOAL_ICONS.flirt },
    { key: 'friendship', label: t('auth.goals.friendship'), icon: GOAL_ICONS.friendship },
  ];

  /* ── Auth mode: login or onboarding (steps 1-5) ── */
  const [mode, setMode] = useState<AuthMode>('onboarding');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [direction, setDirection] = useState(0);

  /* ── Redirect to feed once user is confirmed by context ── */
  useEffect(() => {
    if (!loading && user && mode === 'login') {
      navigate('/feed', { replace: true });
    }
  }, [user, loading, mode, navigate]);

  /* ── Login fields ── */
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  /* ── Onboarding data (steps 1-5) ── */
  const [gender, setGender] = useState<Gender>(null);
  const [name, setName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [city, setCity] = useState('');
  const [goal, setGoal] = useState<Goal>(null);

  /* ── Step 5: Registration fields ── */
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPw, setRegShowPw] = useState(false);
  const [regTerms, setRegTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  /* ── Step 5: Turnstile CAPTCHA ── */
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  /* ── Step 6: Telegram verification ── */
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'waiting' | 'verified' | 'expired'>('idle');
  const { isVerified: telegramVerified, generateCode } = useTelegramVerified();

  /* ── Helpers ── */
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 18; y >= currentYear - 80; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= 31; d++) arr.push(d);
    return arr;
  }, []);

  /* ── Navigation helpers ── */
  function goToOnboardingStep(nextStep: number) {
    setDirection(nextStep > onboardingStep ? 1 : -1);
    setOnboardingStep(nextStep);
  }

  function switchToLogin() {
    setDirection(1);
    setMode('login');
  }

  function switchToOnboarding() {
    setDirection(-1);
    setMode('onboarding');
    setOnboardingStep(1);
  }

  function goBackOnboarding() {
    if (onboardingStep > 1) {
      goToOnboardingStep(onboardingStep - 1);
    }
  }


  /* ── Validation for step 2 ── */
  function validateStep2(): boolean {
    if (!name.trim()) {
      showToast(t('auth.validation.enterName'), 'error');
      return false;
    }
    if (!birthDay || !birthMonth || !birthYear) {
      showToast(t('auth.validation.enterDob'), 'error');
      return false;
    }
    const bd = new Date(Number(birthYear), Number(birthMonth), Number(birthDay));
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
    if (age < 18) {
      showToast(t('auth.validation.ageRestriction'), 'error');
      return false;
    }
    return true;
  }

  /* ── Login handler ── */
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast(t('auth.validation.fillAllFields'), 'error');
      return;
    }
    if (!isValidEmail(loginEmail)) {
      showToast(t('auth.validation.invalidEmail'), 'error');
      return;
    }
    if (loginPassword.length < 8) {
      showToast(t('auth.validation.passwordMinLength'), 'error');
      return;
    }

    setLoginLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoginLoading(false);

    if (error) {
      showToast(error.message || t('auth.toast.loginFailed'), 'error');
    } else {
      showToast(t('auth.toast.welcomeBack'), 'success');
      // Navigation handled by useEffect watching `user` — avoids race with onAuthStateChange
    }
  }

  /* ── Register handler (step 5) ── */
  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!regEmail.trim() || !regPassword.trim()) {
      showToast(t('auth.validation.fillAllFields'), 'error');
      return;
    }
    if (!isValidEmail(regEmail)) {
      showToast(t('auth.validation.invalidEmail'), 'error');
      return;
    }
    if (regPassword.length < 8) {
      showToast(t('auth.validation.passwordMinLength'), 'error');
      return;
    }
    if (!regTerms) {
      showToast(t('auth.validation.acceptTerms'), 'warning');
      return;
    }

    /* Turnstile token must be present (widget-level bot filter).
       NOTE: Full server-side verification should happen in a Supabase Edge
       Function (e.g. `verify-turnstile`). That function is not deployed yet,
       so we only enforce that the user solved the challenge on the client. */
    if (!turnstileToken) {
      showToast('Please complete the CAPTCHA verification', 'error');
      return;
    }

    setRegLoading(true);

    const { error } = await signUp(regEmail, regPassword, name.trim());
    if (error) {
      setRegLoading(false);
      showToast(error.message || t('auth.toast.registrationFailed'), 'error');
      return;
    }

    /* Save onboarding profile data */
    try {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        const birthday = `${birthYear}-${String(Number(birthMonth) + 1).padStart(2, '0')}-${String(Number(birthDay)).padStart(2, '0')}`;
        await supabase.from('profiles').upsert({
          id: newUser.id,
          display_name: name.trim(),
          settings: {
            gender,
            birthday,
            city: city.trim(),
            goal,
          },
        });
      }
    } catch {
      /* Profile save failed — non-blocking, user can fill in later */
    }

    /* Sync onboarding data to localStorage so Profile page picks it up */
    try {
      const bDate = new Date(Number(birthYear), Number(birthMonth), Number(birthDay));
      const ageDiff = Date.now() - bDate.getTime();
      const ageDate = new Date(ageDiff);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

      const goalMap: Record<string, string> = {
        relationship: 'serious',
        chat: 'friendship',
        flirt: 'flirt',
        friendship: 'friendship',
      };

      storage.save('profileData', {
        name: name.trim(),
        age: String(calculatedAge),
        city: city.trim(),
        datingGoal: goal ? (goalMap[goal] || '') : '',
      });
    } catch {
      /* localStorage save failed — non-blocking */
    }

    setRegLoading(false);
    showToast(t('auth.toast.accountCreated'), 'success');

    /* Generate Telegram verification code and go to step 6 */
    const code = await generateCode();
    if (code) {
      setVerificationCode(code);
      setVerificationStatus('waiting');
    }
    goToOnboardingStep(6);
  }

  /* ── Google auth ── */
  async function handleGoogle() {
    try {
      await signInWithGoogle();
    } catch {
      showToast(t('auth.toast.googleFailed'), 'error');
    }
  }

  /* ── Telegram verification: watch for real-time updates ── */
  useEffect(() => {
    if (telegramVerified && onboardingStep === 6) {
      setVerificationStatus('verified');
      showToast(t('auth.telegramVerify.verified'), 'success');
      setTimeout(() => navigate('/feed'), 1500);
    }
  }, [telegramVerified, onboardingStep, navigate, showToast, t]);

  /* ── Refresh verification code ── */
  const handleRefreshCode = useCallback(async () => {
    const code = await generateCode();
    if (code) {
      setVerificationCode(code);
      setVerificationStatus('waiting');
    }
  }, [generateCode]);

  /* ── Skip telegram verification ── */
  function handleSkipVerification() {
    navigate('/feed');
  }

  /* ── Password strength ── */
  const strength = getPasswordStrength(regPassword);

  /* ── Progress bar percentage (only during onboarding) ── */
  const progressPct = mode === 'onboarding'
    ? `${(onboardingStep / TOTAL_ONBOARDING_STEPS) * 100}%`
    : '0%';

  /* ── Telegram bot deep link ── */
  const telegramBotUrl = verificationCode
    ? `https://t.me/LuminaAuthBot?start=${verificationCode}`
    : 'https://t.me/LuminaAuthBot';

  /* ── Render content based on mode ── */
  function renderContent() {
    /* ═══════ Login Screen ═══════ */
    if (mode === 'login') {
      return (
        <motion.div
          key="login"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={s.stepContent}
        >
          <div className={s.logo}>Lumina</div>

          <h2 className={s.stepTitle}>{t('auth.login.title')}</h2>
          <p className={s.stepSubtitle}>{t('auth.login.subtitle')}</p>

          <form className={s.form} onSubmit={handleLogin}>
            {/* Google OAuth */}
            <button type="button" className={s.googleBtn} onClick={handleGoogle}>
              <GoogleIcon />
              {t('auth.login.googleBtn')}
            </button>

            {/* Divider */}
            <div className={s.divider}>
              <div className={s.dividerLine} />
              <span className={s.dividerText}>{t('common.or')}</span>
              <div className={s.dividerLine} />
            </div>

            {/* Email */}
            <Input
              type="email"
              placeholder={t('auth.login.emailPlaceholder')}
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              icon={<Mail size={18} />}
              autoComplete="email"
            />

            {/* Password */}
            <Input
              type={loginShowPw ? 'text' : 'password'}
              placeholder={t('auth.login.passwordPlaceholder')}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              icon={<Lock size={18} />}
              rightIcon={
                <button
                  type="button"
                  className={s.eyeBtn}
                  onClick={() => setLoginShowPw(!loginShowPw)}
                  tabIndex={-1}
                  aria-label={loginShowPw ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                >
                  {loginShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              autoComplete="current-password"
            />

            {/* Forgot password */}
            <button type="button" className={s.forgotLink}>
              {t('auth.login.forgotPassword')}
            </button>

            {/* Submit */}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loginLoading}>
              {t('auth.login.signInBtn')}
            </Button>
          </form>

          {/* Switch to register */}
          <div className={s.bottomLink}>
            {t('auth.login.noAccount')}
            <button type="button" onClick={switchToOnboarding}>
              {t('auth.login.createOne')}
            </button>
          </div>
        </motion.div>
      );
    }

    /* ═══════ Onboarding Steps 1-5 ═══════ */
    switch (onboardingStep) {
      /* ═══════ Step 1: Gender ═══════ */
      case 1:
        return (
          <motion.div
            key="onboarding-1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={s.stepContent}
          >
            <div className={s.logo}>Lumina</div>

            <h2 className={s.stepTitle}>{t('auth.onboarding.step1Title')}</h2>
            <p className={s.stepSubtitle}>{t('auth.onboarding.step1Subtitle')}</p>

            <div className={s.genderGrid}>
              <button
                type="button"
                className={`${s.genderCard} ${gender === 'male' ? s.genderCardSelected : ''}`}
                onClick={() => {
                  setGender('male');
                  setTimeout(() => goToOnboardingStep(2), 250);
                }}
              >
                <div className={s.genderCardIcon}>
                  <User size={28} />
                </div>
                <span className={s.genderCardLabel}>{t('auth.onboarding.male')}</span>
              </button>

              <button
                type="button"
                className={`${s.genderCard} ${gender === 'female' ? s.genderCardSelected : ''}`}
                onClick={() => {
                  setGender('female');
                  setTimeout(() => goToOnboardingStep(2), 250);
                }}
              >
                <div className={s.genderCardIcon}>
                  <User size={28} />
                </div>
                <span className={s.genderCardLabel}>{t('auth.onboarding.female')}</span>
              </button>
            </div>

            {/* Switch to login */}
            <div className={s.bottomLink}>
              {t('auth.welcome.alreadyHaveAccount')}
              <button type="button" onClick={switchToLogin}>
                {t('auth.welcome.signIn')}
              </button>
            </div>

            {/* 18+ badge */}
            <div className={s.ageBadge}>
              <div className={s.ageBadgeIcon}>18+</div>
              <span className={s.ageBadgeText}>
                {t('auth.welcome.ageBadgeText')}
              </span>
            </div>
          </motion.div>
        );

      /* ═══════ Step 2: Name + Birthday ═══════ */
      case 2:
        return (
          <motion.div
            key="onboarding-2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={s.stepContent}
          >
            <button type="button" className={s.backBtn} onClick={goBackOnboarding}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </button>

            <h2 className={s.stepTitle}>{t('auth.onboarding.step2Title')}</h2>
            <p className={s.stepSubtitle}>{t('auth.onboarding.step2Subtitle')}</p>

            <div className={s.fieldGap}>
              <Input
                type="text"
                placeholder={t('auth.onboarding.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User size={18} />}
                autoComplete="given-name"
              />
            </div>

            <div className={s.fieldLabel}>{t('auth.onboarding.dobLabel')}</div>
            <div className={s.dateRow}>
              <div className={s.selectWrap}>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  aria-label={t('auth.onboarding.dayPlaceholder')}
                >
                  <option value="">{t('auth.onboarding.dayPlaceholder')}</option>
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className={s.selectWrap}>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  aria-label={t('auth.onboarding.monthPlaceholder')}
                >
                  <option value="">{t('auth.onboarding.monthPlaceholder')}</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className={s.selectWrap}>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  aria-label={t('auth.onboarding.yearPlaceholder')}
                >
                  <option value="">{t('auth.onboarding.yearPlaceholder')}</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={s.btnRow}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  if (validateStep2()) goToOnboardingStep(3);
                }}
              >
                {t('common.continue')}
              </Button>
            </div>
          </motion.div>
        );

      /* ═══════ Step 3: City ═══════ */
      case 3:
        return (
          <motion.div
            key="onboarding-3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={s.stepContent}
          >
            <button type="button" className={s.backBtn} onClick={goBackOnboarding}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </button>

            <h2 className={s.stepTitle}>{t('auth.onboarding.step3Title')}</h2>
            <p className={s.stepSubtitle}>{t('auth.onboarding.step3Subtitle')}</p>

            <div className={s.fieldGap}>
              <Input
                type="text"
                placeholder={t('auth.onboarding.cityPlaceholder')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                icon={<MapPin size={18} />}
              />
            </div>

            <div className={s.cityChips}>
              {POPULAR_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${s.cityChip} ${city === c ? s.cityChipActive : ''}`}
                  onClick={() => setCity(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className={s.btnRow}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!city.trim()}
                onClick={() => goToOnboardingStep(4)}
              >
                {t('common.continue')}
              </Button>
            </div>
          </motion.div>
        );

      /* ═══════ Step 4: Goal ═══════ */
      case 4:
        return (
          <motion.div
            key="onboarding-4"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={s.stepContent}
          >
            <button type="button" className={s.backBtn} onClick={goBackOnboarding}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </button>

            <h2 className={s.stepTitle}>{t('auth.onboarding.step4Title')}</h2>
            <p className={s.stepSubtitle}>{t('auth.onboarding.step4Subtitle')}</p>

            <div className={s.goalGrid}>
              {GOALS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  className={`${s.goalCard} ${goal === key ? s.goalCardSelected : ''}`}
                  onClick={() => setGoal(key)}
                >
                  <div className={s.goalCardIcon}>
                    <Icon size={24} />
                  </div>
                  <span className={s.goalCardLabel}>{label}</span>
                </button>
              ))}
            </div>

            <div className={s.btnRow}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!goal}
                onClick={() => goToOnboardingStep(5)}
              >
                {t('common.continue')}
              </Button>
            </div>
          </motion.div>
        );

      /* ═══════ Step 5: Email + Password (final) ═══════ */
      case 5:
        return (
          <motion.div
            key="onboarding-5"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={s.stepContent}
          >
            <button type="button" className={s.backBtn} onClick={goBackOnboarding}>
              <ArrowLeft size={16} />
              {t('common.back')}
            </button>

            <h2 className={s.stepTitle}>{t('auth.onboarding.step5Title')}</h2>
            <p className={s.stepSubtitle}>{t('auth.onboarding.step5Subtitle')}</p>

            <form className={s.form} onSubmit={handleRegister}>
              {/* Email */}
              <Input
                type="email"
                placeholder={t('auth.onboarding.emailPlaceholder')}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                icon={<Mail size={18} />}
                autoComplete="email"
              />

              {/* Password */}
              <Input
                type={regShowPw ? 'text' : 'password'}
                placeholder={t('auth.onboarding.passwordPlaceholder')}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                icon={<Lock size={18} />}
                rightIcon={
                  <button
                    type="button"
                    className={s.eyeBtn}
                    onClick={() => setRegShowPw(!regShowPw)}
                    tabIndex={-1}
                    aria-label={regShowPw ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                  >
                    {regShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
                autoComplete="new-password"
              />

              {/* Password strength meter */}
              {regPassword.length > 0 && (
                <div className={s.strengthMeter}>
                  <div className={s.strengthBar}>
                    <div
                      className={s.strengthFill}
                      style={{ width: strength.pct, backgroundColor: strength.color }}
                    />
                  </div>
                  <span className={s.strengthText} style={{ color: strength.color }}>
                    {strength.text}
                  </span>
                </div>
              )}

              {/* Terms checkbox */}
              <div className={s.checkboxWrap}>
                <div className={s.checkbox}>
                  <input
                    type="checkbox"
                    checked={regTerms}
                    onChange={(e) => setRegTerms(e.target.checked)}
                    id="terms"
                  />
                  <div className={s.checkboxVisual}>
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path
                        d="M1 5L4.5 8.5L11 1.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <label htmlFor="terms" className={s.checkboxLabel}>
                  {t('auth.onboarding.termsLabel')}{' '}
                  <a href="/terms">{t('auth.onboarding.termsLink')}</a>
                </label>
              </div>

              {/* Turnstile CAPTCHA (invisible) */}
              <div className={s.turnstileWrap}>
                <Turnstile
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: 'dark', size: 'compact' }}
                />
              </div>

              {/* Submit */}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={regLoading} disabled={!turnstileToken}>
                {t('auth.onboarding.createAccount')}
              </Button>

              {/* Divider */}
              <div className={s.divider}>
                <div className={s.dividerLine} />
                <span className={s.dividerText}>{t('common.or')}</span>
                <div className={s.dividerLine} />
              </div>

              {/* Google OAuth */}
              <button type="button" className={s.googleBtn} onClick={handleGoogle}>
                <GoogleIcon />
                {t('auth.welcome.googleBtn')}
              </button>
            </form>
          </motion.div>
        );

      /* ═══════ Step 6: Telegram Verification ═══════ */
      case 6:
        return (
          <motion.div
            key="onboarding-6"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={s.stepContent}
          >
            <div className={s.telegramVerifyWrap}>
              {/* Icon */}
              <div className={s.telegramVerifyIcon}>
                {verificationStatus === 'verified' ? (
                  <ShieldCheck size={48} />
                ) : (
                  <Send size={48} />
                )}
              </div>

              <h2 className={s.stepTitle}>{t('auth.telegramVerify.title')}</h2>
              <p className={s.stepSubtitle}>{t('auth.telegramVerify.subtitle')}</p>

              {/* Verification code display */}
              {verificationCode && verificationStatus !== 'verified' && (
                <div className={s.verificationCodeBlock}>
                  <span className={s.verificationCodeLabel}>{t('auth.telegramVerify.yourCode')}</span>
                  <span className={s.verificationCode}>{verificationCode}</span>
                </div>
              )}

              {/* Status indicator */}
              {verificationStatus === 'waiting' && (
                <div className={s.verificationWaiting}>
                  <div className={s.verificationSpinner} />
                  <span>{t('auth.telegramVerify.waitingVerification')}</span>
                </div>
              )}

              {verificationStatus === 'verified' && (
                <div className={s.verificationSuccess}>
                  <ShieldCheck size={20} />
                  <span>{t('auth.telegramVerify.verified')}</span>
                </div>
              )}

              {/* How it works */}
              {verificationStatus !== 'verified' && (
                <div className={s.howItWorks}>
                  <p className={s.howItWorksTitle}>{t('auth.telegramVerify.howItWorks')}</p>
                  <p className={s.howItWorksStep}>{t('auth.telegramVerify.step1')}</p>
                  <p className={s.howItWorksStep}>{t('auth.telegramVerify.step2')}</p>
                  <p className={s.howItWorksStep}>{t('auth.telegramVerify.step3')}</p>
                </div>
              )}

              {/* Open Telegram Bot button */}
              {verificationStatus !== 'verified' && (
                <a
                  href={telegramBotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.telegramBtn}
                >
                  <Send size={18} />
                  {t('auth.telegramVerify.openBot')}
                </a>
              )}

              {/* Refresh code */}
              {verificationStatus === 'expired' && (
                <button type="button" className={s.refreshCodeBtn} onClick={handleRefreshCode}>
                  <RefreshCw size={16} />
                  {t('auth.telegramVerify.refreshCode')}
                </button>
              )}

              {/* Skip button */}
              {verificationStatus !== 'verified' && (
                <div className={s.skipVerification}>
                  <button type="button" className={s.skipBtn} onClick={handleSkipVerification}>
                    {t('auth.telegramVerify.skip')}
                  </button>
                  <p className={s.skipNote}>{t('auth.telegramVerify.skipNote')}</p>
                </div>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  }

  return (
    <PageTransition>
      <div className={s.page}>
        {/* Animated background blobs */}
        <div className={s.bgBlobs}>
          <div className={`${s.blob} ${s.blob1}`} />
          <div className={`${s.blob} ${s.blob2}`} />
          <div className={`${s.blob} ${s.blob3}`} />
          <div className={`${s.blob} ${s.blob4}`} />
        </div>

        {/* Auth card */}
        <motion.div
          className={s.card}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Progress bar — visible only during onboarding steps 1-6 */}
          {mode === 'onboarding' && (
            <div className={s.progressBar}>
              <div
                className={s.progressFill}
                style={{ width: progressPct }}
              />
            </div>
          )}

          {/* Step content with AnimatePresence */}
          <AnimatePresence mode="wait" custom={direction}>
            {renderContent()}
          </AnimatePresence>
        </motion.div>

        {/* Toast notifications */}
        <ToastContainer />
      </div>
    </PageTransition>
  );
}
