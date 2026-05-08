/**
 * BrandSide — левая колонка AuthLayout с живым particle-constellation.
 *
 * Архитектура (z-order):
 *   z=0 — deep gradient backdrop (#0e0826 → #2a0e3e → #4a1248)
 *   z=1 — ParticleField canvas (60+ частиц + связи + mouse interaction)
 *   z=2 — soft radial glow blobs (mix-blend-mode: screen, magic feel)
 *   z=3 — subtle vignette (depth + readability)
 *   z=4 — content (logo + quote + progress)
 *
 * Step-reactive: цвет частиц интерполируется по currentStep
 * (1=violet → 5=hot pink). При смене step — burst pulse.
 *
 * Variants:
 *   • 'quote'    — welcome / signIn / telegram
 *   • 'progress' — onboarding шаги 1..5 со stepper
 *
 * i18n-agnostic — родитель передаёт уже переведённые строки.
 */
import s from './BrandSide.module.css';
import { ParticleField } from './ParticleField';

interface QuoteProps {
  variant: 'quote';
  title: string;
  subtitle?: string;
}

interface ProgressProps {
  variant: 'progress';
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
}

type Props = QuoteProps | ProgressProps;

export function BrandSide(props: Props) {
  const step = props.variant === 'progress' ? props.currentStep : 1;
  const total = props.variant === 'progress' ? props.totalSteps : 5;

  return (
    <div className={s.root}>
      {/* Living particle constellation */}
      <ParticleField currentStep={step} totalSteps={total} />

      {/* Soft glow blobs — magic feel */}
      <div className={s.glow1} aria-hidden="true" />
      <div className={s.glow2} aria-hidden="true" />

      {/* Vignette for depth + text readability */}
      <div className={s.vignette} aria-hidden="true" />

      {/* Content */}
      <div className={s.logo}>Lumina</div>

      <div className={s.content}>
        <h1 className={s.title}>{props.title}</h1>
        {props.subtitle && <p className={s.subtitle}>{props.subtitle}</p>}

        {props.variant === 'progress' && (
          <div
            className={s.progress}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={props.totalSteps}
            aria-valuenow={props.currentStep}
            aria-label={props.stepLabel}
          >
            <div className={s.progressLabel}>{props.stepLabel}</div>
            <div className={s.progressTrack}>
              {Array.from({ length: props.totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={s.progressDot}
                  data-active={i + 1 <= props.currentStep ? 'true' : 'false'}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
