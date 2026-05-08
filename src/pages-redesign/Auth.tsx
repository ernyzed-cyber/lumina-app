/**
 * Auth (redesign) — orchestrator для split-screen auth flow.
 *
 * Live in: src/pages-redesign/Auth.tsx
 * Routes:
 *   • /__preview/auth (dev preview — wrapped in PreviewLayout)
 *   • Stage 4 deploy: заменит src/pages/Auth.tsx и подключится к /auth
 *
 * State machine (см. ./auth/types.ts):
 *   mode = welcome → signIn | onboarding(step 1..5) → telegram → /feed
 *
 * Bug fixes vs production /pages/Auth.tsx:
 *   1. Hardcoded EN CAPTCHA string ("Please complete...") → use i18n key
 *   2. Dead i18n keys (auth.welcome.title/subtitle) → moved to landing.redesign.auth.*
 *   3. Forgot-password dead button → real flow via supabase.auth.resetPasswordForEmail
 *   4. mode='login' redirect bug: redirect happened before user state hydrated.
 *      Fixed by checking `user && !loading` only AFTER hooks finished mounting.
 *   5. Goal mapping: оставлено как в prod (relationship→serious в localStorage map)
 *      т.к. зависят downstream pages. См. profile sync block.
 *
 * Concept boundary:
 *   Onboarding → /feed (mutual choice). NO automatic assignment creation here.
 *   Если у юзера ALREADY есть active assignment (он был раньше) — сразу /chat.
 *   Это поддерживает "одна, только твоя" через mutual match, не системное навязывание.
 */
import { useCallback, useEffect, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useTelegramVerified } from '../hooks/useTelegramVerified';
import { useLanguage } from '../i18n';
import { supabase } from '../lib/supabase';
import { storage } from '../utils/helpers';

import { AuthLayout } from './auth/AuthLayout';
import { WelcomeScreen } from './auth/WelcomeScreen';
import { SignInScreen } from './auth/SignInScreen';
import { GenderStep } from './auth/GenderStep';
import { NameDobStep } from './auth/NameDobStep';
import { CityStep } from './auth/CityStep';
import { GoalStep } from './auth/GoalStep';
import { CredentialsStep } from './auth/CredentialsStep';
import { TelegramVerifyStep } from './auth/TelegramVerifyStep';
import { Confetti } from './auth/Confetti';
import {
  authReducer,
  initialAuthState,
  TOTAL_ONBOARDING_STEPS,
  type AuthMode,
} from './auth/types';

export default function AuthRedesign() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { isVerified: telegramVerified, generateCode } = useTelegramVerified();

  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  /* Telegram verify state */
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [codeIssuedAt, setCodeIssuedAt] = useState<number>(0);
  const [now, setNow] = useState(() => Date.now());

  /* Tick every 10s while on telegram step to compute "expired" */
  useEffect(() => {
    if (state.mode !== 'telegram') return;
    const id = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(id);
  }, [state.mode]);

  const isCodeExpired =
    codeIssuedAt > 0 && now - codeIssuedAt > 30 * 60 * 1000;

  /* ── Already authenticated? Redirect once user state stabilizes (FIX) ── */
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (state.mode === 'telegram') return; // user just registered, complete verify flow
    void navigateAfterAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  /* ── Pick destination after auth (mutual-choice friendly) ── */
  const navigateAfterAuth = useCallback(async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        navigate('/feed', { replace: true });
        return;
      }
      const { data: asgn } = await supabase
        .from('assignments')
        .select('id')
        .eq('user_id', u.id)
        .is('released_at', null)
        .maybeSingle();
      navigate(asgn ? '/chat' : '/feed', { replace: true });
    } catch {
      navigate('/feed', { replace: true });
    }
  }, [navigate]);

  /* ── Telegram verification: real-time hook → success toast → /feed ── */
  useEffect(() => {
    if (telegramVerified && state.mode === 'telegram') {
      showToast(t('landing.redesign.auth.toast.verified'), 'success');
      const id = setTimeout(() => { void navigateAfterAuth(); }, 1500);
      return () => clearTimeout(id);
    }
  }, [telegramVerified, state.mode, navigateAfterAuth, showToast, t]);

  /* ── Sign in handler ── */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      showToast(t('landing.redesign.auth.validation.fillAllFields'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        showToast(error.message || t('landing.redesign.auth.toast.loginFailed'), 'error');
        return;
      }
      showToast(t('landing.redesign.auth.toast.welcomeBack'), 'success');
      await navigateAfterAuth();
    } finally {
      setSubmitting(false);
    }
  }, [signIn, showToast, t, navigateAfterAuth]);

  /* ── Google OAuth (redirects to /feed callback) ── */
  const handleGoogleSignIn = useCallback(async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      // OAuth redirects — control will not return synchronously
    } catch {
      showToast(t('landing.redesign.auth.toast.googleFailed'), 'error');
      setSubmitting(false);
    }
  }, [signInWithGoogle, showToast, t]);

  /* ── Forgot password (FIX: was dead button) ── */
  const handleForgotPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      showToast(t('landing.redesign.auth.signIn.forgotSent'), 'success');
    } catch {
      showToast(t('landing.redesign.auth.signIn.forgotFailed'), 'error');
    }
  }, [showToast, t]);

  /* ── Onboarding: final submit (step 5 → register → telegram step) ── */
  const handleOnboardingSubmit = useCallback(async () => {
    const { gender, name, birthDay, birthMonth, birthYear, city, goal, email, password } = state.data;
    setSubmitting(true);
    try {
      const { error } = await signUp(email, password, name.trim());
      if (error) {
        showToast(error.message || t('landing.redesign.auth.toast.registrationFailed'), 'error');
        return;
      }

      /* Save onboarding profile data — non-blocking */
      try {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          const birthday = `${birthYear}-${String(Number(birthMonth) + 1).padStart(2, '0')}-${String(Number(birthDay)).padStart(2, '0')}`;
          await supabase.from('profiles').upsert({
            id: newUser.id,
            display_name: name.trim(),
            settings: { gender, birthday, city: city.trim(), goal },
          });
        }
      } catch { /* non-blocking */ }

      /* Mirror to localStorage for Profile page (kept goal mapping for downstream) */
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
      } catch { /* non-blocking */ }

      showToast(t('landing.redesign.auth.toast.accountCreated'), 'success');

      /* Generate Telegram code and switch to telegram step */
      const code = await generateCode();
      if (code) {
        setVerificationCode(code);
        setCodeIssuedAt(Date.now());
      }
      dispatch({ type: 'GO_TELEGRAM' });
    } finally {
      setSubmitting(false);
    }
  }, [state.data, signUp, showToast, t, generateCode]);

  const handleRefreshCode = useCallback(async () => {
    setSubmitting(true);
    try {
      const code = await generateCode();
      if (code) {
        setVerificationCode(code);
        setCodeIssuedAt(Date.now());
      }
    } finally {
      setSubmitting(false);
    }
  }, [generateCode]);

  const handleSkipTelegram = useCallback(() => {
    void navigateAfterAuth();
  }, [navigateAfterAuth]);

  /* ── Step renderer ── */
  function renderStep() {
    if (state.mode === 'welcome') {
      return (
        <WelcomeScreen
          onSignIn={() => dispatch({ type: 'GO_SIGNIN' })}
          onSignUp={() => dispatch({ type: 'START_ONBOARDING' })}
        />
      );
    }
    if (state.mode === 'signIn') {
      return (
        <SignInScreen
          isSubmitting={submitting}
          onSubmit={handleSignIn}
          onGoogleSignIn={handleGoogleSignIn}
          onForgotPassword={handleForgotPassword}
          onBackToWelcome={() => dispatch({ type: 'GO_WELCOME' })}
        />
      );
    }
    if (state.mode === 'telegram') {
      return (
        <TelegramVerifyStep
          verificationCode={verificationCode}
          isRefreshing={submitting}
          isExpired={isCodeExpired}
          onRefreshCode={handleRefreshCode}
          onSkip={handleSkipTelegram}
        />
      );
    }
    /* Onboarding steps */
    const showError = (key: string) => showToast(t(key), 'error');
    switch (state.step) {
      case 1:
        return (
          <GenderStep
            value={state.data.gender}
            onChange={(g) => dispatch({ type: 'SET_GENDER', gender: g })}
            onNext={() => dispatch({ type: 'NEXT_STEP' })}
            onSignIn={() => dispatch({ type: 'GO_SIGNIN' })}
          />
        );
      case 2:
        return (
          <NameDobStep
            name={state.data.name}
            birthDay={state.data.birthDay}
            birthMonth={state.data.birthMonth}
            birthYear={state.data.birthYear}
            onChangeName={(v) => dispatch({ type: 'SET_NAME', name: v })}
            onChangeDob={(d, m, y) => dispatch({ type: 'SET_DOB', day: d, month: m, year: y })}
            onNext={() => dispatch({ type: 'NEXT_STEP' })}
            onBack={() => dispatch({ type: 'PREV_STEP' })}
            onShowError={showError}
          />
        );
      case 3:
        return (
          <CityStep
            value={state.data.city}
            onChange={(v) => dispatch({ type: 'SET_CITY', city: v })}
            onNext={() => dispatch({ type: 'NEXT_STEP' })}
            onBack={() => dispatch({ type: 'PREV_STEP' })}
          />
        );
      case 4:
        return (
          <GoalStep
            value={state.data.goal}
            onChange={(g) => dispatch({ type: 'SET_GOAL', goal: g })}
            onNext={() => dispatch({ type: 'NEXT_STEP' })}
            onBack={() => dispatch({ type: 'PREV_STEP' })}
          />
        );
      case 5:
        return (
          <CredentialsStep
            email={state.data.email}
            password={state.data.password}
            termsAccepted={state.data.termsAccepted}
            turnstileToken={turnstileToken}
            isSubmitting={submitting}
            onChangeEmail={(v) => dispatch({ type: 'SET_EMAIL', email: v })}
            onChangePassword={(v) => dispatch({ type: 'SET_PASSWORD', password: v })}
            onChangeTerms={(v) => dispatch({ type: 'SET_TERMS', accepted: v })}
            onTurnstileToken={setTurnstileToken}
            onSubmit={handleOnboardingSubmit}
            onGoogleSignIn={handleGoogleSignIn}
            onBack={() => dispatch({ type: 'PREV_STEP' })}
            onShowError={showError}
          />
        );
    }
  }

  /* ── animation key: одна перемена за смену экрана ── */
  const animKey: string = animKeyFor(state.mode, state.step);

  /* ── Layout step props (только для onboarding mode) ── */
  const layoutStepProps =
    state.mode === 'onboarding'
      ? {
          currentStep: state.step,
          totalSteps: TOTAL_ONBOARDING_STEPS,
          stepLabel: t('landing.redesign.auth.brand.stepCounter', {
            current: state.step,
            total: TOTAL_ONBOARDING_STEPS,
          }),
        }
      : {};

  return (
    <AuthLayout {...layoutStepProps}>
      <AnimatePresence mode="wait" custom={state.direction}>
        <motion.div
          key={animKey}
          custom={state.direction}
          initial={{ opacity: 0, x: state.direction * 48, scale: 0.96, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: state.direction * -48, scale: 0.96, filter: 'blur(10px)' }}
          transition={{
            x: { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 },
            scale: { type: 'spring', stiffness: 280, damping: 24 },
            opacity: { duration: 0.36, ease: [0.2, 0.8, 0.3, 1] },
            filter: { duration: 0.32 },
          }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
      <Confetti active={telegramVerified === true && state.mode === 'telegram'} />
      <ToastContainer />
    </AuthLayout>
  );
}

function animKeyFor(mode: AuthMode, step: number): string {
  if (mode === 'onboarding') return `onb-${step}`;
  return mode;
}
