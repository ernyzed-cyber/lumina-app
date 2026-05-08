/**
 * NameDobStep — onboarding step 2: имя + дата рождения.
 *
 * Validation:
 *   • name: trim, not empty
 *   • DOB: 3 selects must be filled, age >= 18
 *
 * Validation toasts вызываются через onShowError (чтобы Auth.tsx
 * управлял useToast однозначно). Локального toast-state здесь нет.
 *
 * Months: используем Intl.DateTimeFormat для локализованного списка месяцев.
 */
import { useMemo } from 'react';
import { useLanguage } from '../../i18n';
import s from './authForms.module.css';

interface Props {
  name: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  onChangeName: (v: string) => void;
  onChangeDob: (day: string, month: string, year: string) => void;
  onNext: () => void;
  onBack: () => void;
  onShowError: (msgKey: string) => void;
}

export function NameDobStep({
  name,
  birthDay,
  birthMonth,
  birthYear,
  onChangeName,
  onChangeDob,
  onNext,
  onBack,
  onShowError,
}: Props) {
  const { t, lang } = useLanguage();

  /* Localized month list (1..12). Index = month, label = locale. */
  const months = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: fmt.format(new Date(2024, i, 1)),
    }));
  }, [lang]);

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 80 }, (_, i) => String(currentYear - 18 - i)),
    [currentYear],
  );
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1)),
    [],
  );

  function handleSubmit() {
    if (!name.trim()) {
      onShowError('landing.redesign.auth.validation.enterName');
      return;
    }
    if (!birthDay || !birthMonth || !birthYear) {
      onShowError('landing.redesign.auth.validation.enterDob');
      return;
    }
    /* Age check: must be 18+ */
    const dob = new Date(Number(birthYear), Number(birthMonth), Number(birthDay));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < 18) {
      onShowError('landing.redesign.auth.validation.ageRestriction');
      return;
    }
    onNext();
  }

  return (
    <>
      <button type="button" className={s.backBtn} onClick={onBack}>
        ←
      </button>

      <h2 className={s.title}>{t('landing.redesign.auth.nameDob.title')}</h2>
      <p className={s.subtitle}>{t('landing.redesign.auth.nameDob.subtitle')}</p>

      <div className={s.field}>
        <input
          type="text"
          className={s.input}
          placeholder={t('landing.redesign.auth.nameDob.namePlaceholder')}
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          autoFocus
          maxLength={50}
        />
      </div>

      <div className={s.field}>
        <label className={s.label}>{t('landing.redesign.auth.nameDob.dobLabel')}</label>
        <div className={s.dobRow}>
          <select
            className={s.selectInput}
            value={birthDay}
            onChange={(e) => onChangeDob(e.target.value, birthMonth, birthYear)}
          >
            <option value="">{t('landing.redesign.auth.nameDob.dayPlaceholder')}</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            className={s.selectInput}
            value={birthMonth}
            onChange={(e) => onChangeDob(birthDay, e.target.value, birthYear)}
          >
            <option value="">{t('landing.redesign.auth.nameDob.monthPlaceholder')}</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            className={s.selectInput}
            value={birthYear}
            onChange={(e) => onChangeDob(birthDay, birthMonth, e.target.value)}
          >
            <option value="">{t('landing.redesign.auth.nameDob.yearPlaceholder')}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.btnPrimary} onClick={handleSubmit}>
          →
        </button>
      </div>
    </>
  );
}
