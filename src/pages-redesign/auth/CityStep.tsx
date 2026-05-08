/**
 * CityStep — onboarding step 3: город.
 *
 * UX: text input + chip-row с popular cities из i18n (`auth.cities` массив).
 * Клик по chip → подставляет в input и сразу включает Next.
 *
 * Validation: trim, not empty (мягкая, фронт-only — города не валидируем).
 */
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';

interface Props {
  value: string;
  onChange: (city: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CityStep({ value, onChange, onNext, onBack }: Props) {
  const { t, tr } = useLanguage();
  const cities = (tr.auth.cities ?? []) as string[];

  const isValid = value.trim().length > 0;

  return (
    <>
      <button type="button" className={s.backBtn} onClick={onBack}>
        ←
      </button>

      <h2 className={s.title}>{t('landing.redesign.auth.city.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.city.subtitle')}</p>

      <div className={s.field}>
        <input
          type="text"
          className={s.input}
          placeholder={t('landing.redesign.auth.city.placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          maxLength={60}
        />
      </div>

      {cities.length > 0 && (
        <div className={s.chipRow}>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              className={s.chip}
              data-selected={value === c ? 'true' : 'false'}
              onClick={() => onChange(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className={s.actions}>
        <button
          type="button"
          className={s.btnPrimary}
          onClick={onNext}
          disabled={!isValid}
        >
          →
        </button>
      </div>
    </>
  );
}
