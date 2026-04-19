/* ═══════════════════════════════════════════
   LUMINA — Full filter panel (modal overlay)
   ═══════════════════════════════════════════ */

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RangeSlider, { SingleSlider } from './RangeSlider';
import type { FilterState, NumericRange } from '../../types/filters';
import { DEFAULT_FILTERS, FILTER_LIMITS } from '../../types/filters';
import type {
  DatingGoal,
  Education,
  Children,
  Smoking,
  Alcohol,
  BodyType,
  Zodiac,
  Wealth,
  Living,
} from '../../data/girls';
import styles from './FilterPanel.module.css';

/* ── Option maps (label lookup) ── */

interface ChipOption<T extends string = string> {
  value: T;
  label: string;
}

interface FilterPanelProps {
  open: boolean;
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
  /** Localized label lookup */
  t: {
    title: string;
    reset: string;
    apply: string;
    age: string;
    height: string;
    weight: string;
    distance: string;
    goals: string;
    education: string;
    children: string;
    smoking: string;
    alcohol: string;
    bodyType: string;
    zodiac: string;
    wealth: string;
    living: string;
    verifiedOnly: string;
    onlineOnly: string;
    km: string;
    cm: string;
    kg: string;
    /* chip labels */
    goalOptions: ChipOption<DatingGoal>[];
    educationOptions: ChipOption<Education>[];
    childrenOptions: ChipOption<Children>[];
    smokingOptions: ChipOption<Smoking>[];
    alcoholOptions: ChipOption<Alcohol>[];
    bodyTypeOptions: ChipOption<BodyType>[];
    zodiacOptions: ChipOption<Zodiac>[];
    wealthOptions: ChipOption<Wealth>[];
    livingOptions: ChipOption<Living>[];
  };
}

/* ── Chip helper ── */

function ChipGroup<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: ChipOption<T>[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };
  return (
    <div className={styles.chipGroup}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`${styles.chip} ${selected.includes(o.value) ? styles.chipActive : ''}`}
          onClick={() => toggle(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Toggle row helper ── */

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggleRow}>
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </label>
  );
}

/* ── Main component ── */

export default function FilterPanel({ open, filters, onApply, onClose, t }: FilterPanelProps) {
  const [draft, setDraft] = useState<FilterState>(filters);

  // Sync when parent changes
  useMemo(() => {
    if (open) setDraft(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
      setDraft(prev => ({ ...prev, [key]: value })),
    [],
  );

  const handleReset = () => setDraft(DEFAULT_FILTERS);

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className={styles.panel}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className={styles.dragHandle} />

            {/* Header */}
            <div className={styles.header}>
              <button className={styles.resetBtn} onClick={handleReset} type="button">
                {t.reset}
              </button>
              <h2 className={styles.title}>{t.title}</h2>
              <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className={styles.body}>
              {/* Toggles */}
              <section className={styles.section}>
                <ToggleRow label={t.verifiedOnly} checked={draft.verifiedOnly} onChange={v => set('verifiedOnly', v)} />
                <ToggleRow label={t.onlineOnly} checked={draft.onlineOnly} onChange={v => set('onlineOnly', v)} />
              </section>

              {/* Age */}
              <section className={styles.section}>
                <RangeSlider
                  label={t.age}
                  min={FILTER_LIMITS.age.min}
                  max={FILTER_LIMITS.age.max}
                  step={FILTER_LIMITS.age.step}
                  value={[draft.age.min, draft.age.max]}
                  onChange={([lo, hi]) => set('age', { min: lo, max: hi } as NumericRange)}
                />
              </section>

              {/* Distance */}
              <section className={styles.section}>
                <SingleSlider
                  label={t.distance}
                  min={FILTER_LIMITS.distance.min}
                  max={FILTER_LIMITS.distance.max}
                  step={FILTER_LIMITS.distance.step}
                  value={draft.distance}
                  onChange={v => set('distance', v)}
                  formatValue={v => `${v} ${t.km}`}
                />
              </section>

              {/* Height */}
              <section className={styles.section}>
                <RangeSlider
                  label={t.height}
                  min={FILTER_LIMITS.height.min}
                  max={FILTER_LIMITS.height.max}
                  step={FILTER_LIMITS.height.step}
                  value={[draft.height.min, draft.height.max]}
                  onChange={([lo, hi]) => set('height', { min: lo, max: hi } as NumericRange)}
                  formatValue={v => `${v} ${t.cm}`}
                />
              </section>

              {/* Weight */}
              <section className={styles.section}>
                <RangeSlider
                  label={t.weight}
                  min={FILTER_LIMITS.weight.min}
                  max={FILTER_LIMITS.weight.max}
                  step={FILTER_LIMITS.weight.step}
                  value={[draft.weight.min, draft.weight.max]}
                  onChange={([lo, hi]) => set('weight', { min: lo, max: hi } as NumericRange)}
                  formatValue={v => `${v} ${t.kg}`}
                />
              </section>

              {/* Goals */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.goals}</span>
                <ChipGroup options={t.goalOptions} selected={draft.goals} onChange={v => set('goals', v)} />
              </section>

              {/* Education */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.education}</span>
                <ChipGroup options={t.educationOptions} selected={draft.education} onChange={v => set('education', v)} />
              </section>

              {/* Body type */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.bodyType}</span>
                <ChipGroup options={t.bodyTypeOptions} selected={draft.bodyType} onChange={v => set('bodyType', v)} />
              </section>

              {/* Children */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.children}</span>
                <ChipGroup options={t.childrenOptions} selected={draft.children} onChange={v => set('children', v)} />
              </section>

              {/* Smoking */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.smoking}</span>
                <ChipGroup options={t.smokingOptions} selected={draft.smoking} onChange={v => set('smoking', v)} />
              </section>

              {/* Alcohol */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.alcohol}</span>
                <ChipGroup options={t.alcoholOptions} selected={draft.alcohol} onChange={v => set('alcohol', v)} />
              </section>

              {/* Zodiac */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.zodiac}</span>
                <ChipGroup options={t.zodiacOptions} selected={draft.zodiac} onChange={v => set('zodiac', v)} />
              </section>

              {/* Wealth */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.wealth}</span>
                <ChipGroup options={t.wealthOptions} selected={draft.wealth} onChange={v => set('wealth', v)} />
              </section>

              {/* Living */}
              <section className={styles.section}>
                <span className={styles.sectionTitle}>{t.living}</span>
                <ChipGroup options={t.livingOptions} selected={draft.living} onChange={v => set('living', v)} />
              </section>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button className={styles.applyBtn} onClick={handleApply} type="button">
                {t.apply}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
