/**
 * AuthLayout — центрированная стеклянная карточка на full-screen
 * aurora-backdrop фоне.
 *
 * Архитектура:
 *   z=0 — gradient backdrop (deep purple) / в light — soft lavender
 *   z=1 — AuroraField (full-screen northern-lights blobs)
 *   z=2 — soft static glow halos (доп. атмосфера)
 *   z=3 — vignette (уводит края в темноту)
 *   z=10 — glass card (frosted, почти прозрачная)
 *
 * `currentStep` / `totalSteps` опциональны — если переданы, рисуется
 * progress-bar сверху карточки + цвет аорой меняется по шагу.
 */
import { type ReactNode } from 'react';
import s from './AuthLayout.module.css';
import { AuroraField } from './AuroraField';

interface Props {
  children: ReactNode;
  /** 1..N — для color interpolation в ParticleField и progress-bar */
  currentStep?: number;
  totalSteps?: number;
  /** Опциональная строка-подпись над progress (e.g. "Step 2 of 5") */
  stepLabel?: string;
}

export function AuthLayout({ children, currentStep, totalSteps, stepLabel }: Props) {
  const showProgress =
    typeof currentStep === 'number' && typeof totalSteps === 'number' && totalSteps > 0;

  return (
    <div className={s.layout}>
      {/* Living aurora backdrop (full-screen) */}
      <AuroraField currentStep={currentStep ?? 1} totalSteps={totalSteps ?? 5} />

      {/* Vignette (мягкие края) */}
      <div className={s.vignette} aria-hidden="true" />

      {/* Centered glass card */}
      <main className={s.cardWrap}>
        <div className={s.card}>
          {/* Brand mark — top-left corner of card */}
          <div className={s.brand}>Lumina</div>

          {/* Progress (onboarding only) */}
          {showProgress && (
            <div
              className={s.progress}
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={currentStep}
              aria-label={stepLabel}
            >
              {stepLabel && <div className={s.progressLabel}>{stepLabel}</div>}
              <div className={s.progressTrack}>
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={s.progressDot}
                    data-active={i + 1 <= currentStep ? 'true' : 'false'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Form content */}
          <div className={s.content}>{children}</div>
        </div>
      </main>
    </div>
  );
}
