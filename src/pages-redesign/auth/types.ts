/**
 * Auth & Onboarding redesign — shared types and reducer.
 *
 * Mode is the highest-level state machine: welcome → signIn | onboarding → telegram.
 * Onboarding is a 5-step linear flow with one-way transitions (back works locally inside step).
 *
 * Не используем Context — state живёт внутри Auth.tsx через useReducer.
 * После регистрации (step 5 успешный) → переключаемся в mode='telegram' (post-onboarding verify).
 *
 * Why useReducer:
 * - 7+ полей onboarding в одной форме → проще одной редюс-функцией
 * - Транзиции между шагами с direction (для AnimatePresence) централизованы
 * - StrictMode-safe (нет каскадов setState)
 */

export type Gender = 'male' | 'female';
export type Goal = 'relationship' | 'chat' | 'flirt' | 'friendship';

export type AuthMode = 'welcome' | 'signIn' | 'onboarding' | 'telegram';

/** Onboarding step number — 1..5 (1 = gender, 5 = credentials). */
export type StepId = 1 | 2 | 3 | 4 | 5;

export const TOTAL_ONBOARDING_STEPS = 5;

export interface OnboardingData {
  gender: Gender | null;
  name: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  city: string;
  goal: Goal | null;
  /** Step 5: registration credentials (kept here so step transitions don't lose them) */
  email: string;
  password: string;
  termsAccepted: boolean;
}

export interface AuthState {
  mode: AuthMode;
  step: StepId;
  /** Direction for AnimatePresence: +1 = forward, -1 = back. */
  direction: 1 | -1;
  data: OnboardingData;
}

export const initialOnboardingData: OnboardingData = {
  gender: null,
  name: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  city: '',
  goal: null,
  email: '',
  password: '',
  termsAccepted: false,
};

export const initialAuthState: AuthState = {
  mode: 'welcome',
  step: 1,
  direction: 1,
  data: initialOnboardingData,
};

export type AuthAction =
  | { type: 'GO_SIGNIN' }
  | { type: 'GO_WELCOME' }
  | { type: 'START_ONBOARDING' }
  | { type: 'GO_TELEGRAM' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_GENDER'; gender: Gender }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_DOB'; day: string; month: string; year: string }
  | { type: 'SET_CITY'; city: string }
  | { type: 'SET_GOAL'; goal: Goal }
  | { type: 'SET_EMAIL'; email: string }
  | { type: 'SET_PASSWORD'; password: string }
  | { type: 'SET_TERMS'; accepted: boolean };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'GO_SIGNIN':
      return { ...state, mode: 'signIn', direction: 1 };
    case 'GO_WELCOME':
      return { ...state, mode: 'welcome', direction: -1, step: 1 };
    case 'START_ONBOARDING':
      return { ...state, mode: 'onboarding', step: 1, direction: 1 };
    case 'GO_TELEGRAM':
      return { ...state, mode: 'telegram', direction: 1 };
    case 'NEXT_STEP': {
      const next = Math.min(state.step + 1, TOTAL_ONBOARDING_STEPS) as StepId;
      return { ...state, step: next, direction: 1 };
    }
    case 'PREV_STEP': {
      if (state.step === 1) {
        // Back from step 1 → welcome screen
        return { ...state, mode: 'welcome', direction: -1 };
      }
      const prev = (state.step - 1) as StepId;
      return { ...state, step: prev, direction: -1 };
    }
    case 'SET_GENDER':
      return { ...state, data: { ...state.data, gender: action.gender } };
    case 'SET_NAME':
      return { ...state, data: { ...state.data, name: action.name } };
    case 'SET_DOB':
      return {
        ...state,
        data: {
          ...state.data,
          birthDay: action.day,
          birthMonth: action.month,
          birthYear: action.year,
        },
      };
    case 'SET_CITY':
      return { ...state, data: { ...state.data, city: action.city } };
    case 'SET_GOAL':
      return { ...state, data: { ...state.data, goal: action.goal } };
    case 'SET_EMAIL':
      return { ...state, data: { ...state.data, email: action.email } };
    case 'SET_PASSWORD':
      return { ...state, data: { ...state.data, password: action.password } };
    case 'SET_TERMS':
      return { ...state, data: { ...state.data, termsAccepted: action.accepted } };
  }
}
