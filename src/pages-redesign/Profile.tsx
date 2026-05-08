import { AnimatePresence, motion } from 'framer-motion';
import {
  Baby,
  Briefcase,
  Camera,
  Check,
  ChevronRight,
  Flame,
  GraduationCap,
  Heart,
  Home,
  Languages,
  MapPin,
  Pencil,
  Ruler,
  Sparkles,
  User,
  Wine,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { StarField } from './home/StarField';
import { moodForId, moodTint } from './home/moodForId';
import type { CompanionMood } from './home/types';
import s from './Profile.module.css';

type MoodName = CompanionMood;

type ProfileData = {
  name: string;
  age: string;
  city: string;
  about: string;
  lookingFor: 'women' | 'men' | 'any';
  ageRangeMin: string;
  ageRangeMax: string;
  datingGoal: 'serious' | 'casual' | 'friends' | 'unsure';
  work: string;
  education: string;
  languages: string;
  interests: string[];
  height: string;
  bodyType: string;
  smoking: string;
  alcohol: string;
  children: string;
  living: string;
  avatar: string | null;
  gallery: string[];
};

type FieldKind = 'text' | 'number' | 'textarea' | 'select' | 'chips' | 'range';

type FieldKey =
  | 'name'
  | 'age'
  | 'city'
  | 'about'
  | 'lookingFor'
  | 'ageRange'
  | 'datingGoal'
  | 'work'
  | 'education'
  | 'languages'
  | 'interests'
  | 'height'
  | 'bodyType'
  | 'smoking'
  | 'alcohol'
  | 'children'
  | 'living';

type OptionValue = {
  value: string;
  labelKey: string;
};

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

type FieldDef = {
  key: FieldKey;
  icon: LucideIcon;
  kind: FieldKind;
  maxLen?: number;
  min?: number;
  max?: number;
  options?: OptionValue[];
};

type SectionDef = {
  titleKey: string;
  fields: FieldKey[];
};

function getMockProfile(t: TranslateFn, bonded: boolean): ProfileData {
  const base: ProfileData = {
    name: 'Yarik',
    age: '27',
    city: t('profile.redesign.mock.city'),
    about: t('profile.redesign.mock.aboutBefore'),
    lookingFor: 'women',
    ageRangeMin: '21',
    ageRangeMax: '34',
    datingGoal: 'serious',
    work: t('profile.redesign.mock.work'),
    education: t('profile.redesign.mock.education'),
    languages: t('profile.redesign.mock.languages'),
    interests: ['cinema', 'running', 'design', 'books'],
    height: '182',
    bodyType: 'athletic',
    smoking: 'never',
    alcohol: 'socially',
    children: 'someday',
    living: 'alone',
    avatar:
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=600&q=80',
    gallery: [],
  };

  if (!bonded) return base;

  return {
    ...base,
    lookingFor: 'any',
    ageRangeMin: '',
    ageRangeMax: '',
    datingGoal: 'serious',
    about: t('profile.redesign.mock.aboutAfter'),
    interests: ['letters', 'night_walks', 'jazz', 'photos'],
  };
}

const FIELD_DEFS: FieldDef[] = [
  { key: 'name', icon: User, kind: 'text', maxLen: 40 },
  { key: 'age', icon: Sparkles, kind: 'number', min: 18, max: 99 },
  { key: 'city', icon: MapPin, kind: 'text', maxLen: 40 },
  { key: 'about', icon: Heart, kind: 'textarea', maxLen: 280 },
  {
    key: 'lookingFor',
    icon: Heart,
    kind: 'select',
    options: [
      { value: 'women', labelKey: 'profile.redesign.options.lookingFor.women' },
      { value: 'men', labelKey: 'profile.redesign.options.lookingFor.men' },
      { value: 'any', labelKey: 'profile.redesign.options.lookingFor.any' },
    ],
  },
  { key: 'ageRange', icon: Sparkles, kind: 'range', min: 18, max: 65 },
  {
    key: 'datingGoal',
    icon: Heart,
    kind: 'select',
    options: [
      { value: 'serious', labelKey: 'profile.redesign.options.datingGoal.serious' },
      { value: 'casual', labelKey: 'profile.redesign.options.datingGoal.casual' },
      { value: 'friends', labelKey: 'profile.redesign.options.datingGoal.friends' },
      { value: 'unsure', labelKey: 'profile.redesign.options.datingGoal.unsure' },
    ],
  },
  { key: 'work', icon: Briefcase, kind: 'text', maxLen: 60 },
  { key: 'education', icon: GraduationCap, kind: 'text', maxLen: 60 },
  { key: 'languages', icon: Languages, kind: 'text', maxLen: 60 },
  {
    key: 'interests',
    icon: Sparkles,
    kind: 'chips',
    options: [
      { value: 'cinema', labelKey: 'profile.redesign.options.interests.cinema' },
      { value: 'running', labelKey: 'profile.redesign.options.interests.running' },
      { value: 'design', labelKey: 'profile.redesign.options.interests.design' },
      { value: 'books', labelKey: 'profile.redesign.options.interests.books' },
      { value: 'letters', labelKey: 'profile.redesign.options.interests.letters' },
      { value: 'jazz', labelKey: 'profile.redesign.options.interests.jazz' },
      { value: 'photos', labelKey: 'profile.redesign.options.interests.photos' },
      { value: 'night_walks', labelKey: 'profile.redesign.options.interests.night_walks' },
    ],
  },
  { key: 'height', icon: Ruler, kind: 'number', min: 140, max: 220 },
  {
    key: 'bodyType',
    icon: Sparkles,
    kind: 'select',
    options: [
      { value: 'slim', labelKey: 'profile.redesign.options.bodyType.slim' },
      { value: 'athletic', labelKey: 'profile.redesign.options.bodyType.athletic' },
      { value: 'average', labelKey: 'profile.redesign.options.bodyType.average' },
    ],
  },
  {
    key: 'smoking',
    icon: Flame,
    kind: 'select',
    options: [
      { value: 'never', labelKey: 'profile.redesign.options.smoking.never' },
      { value: 'sometimes', labelKey: 'profile.redesign.options.smoking.sometimes' },
      { value: 'often', labelKey: 'profile.redesign.options.smoking.often' },
    ],
  },
  {
    key: 'alcohol',
    icon: Wine,
    kind: 'select',
    options: [
      { value: 'never', labelKey: 'profile.redesign.options.alcohol.never' },
      { value: 'socially', labelKey: 'profile.redesign.options.alcohol.socially' },
      { value: 'often', labelKey: 'profile.redesign.options.alcohol.often' },
    ],
  },
  {
    key: 'children',
    icon: Baby,
    kind: 'select',
    options: [
      { value: 'none', labelKey: 'profile.redesign.options.children.none' },
      { value: 'someday', labelKey: 'profile.redesign.options.children.someday' },
      { value: 'have', labelKey: 'profile.redesign.options.children.have' },
    ],
  },
  {
    key: 'living',
    icon: Home,
    kind: 'select',
    options: [
      { value: 'alone', labelKey: 'profile.redesign.options.living.alone' },
      { value: 'roommates', labelKey: 'profile.redesign.options.living.roommates' },
      { value: 'family', labelKey: 'profile.redesign.options.living.family' },
    ],
  },
];

const SECTIONS_BEFORE: SectionDef[] = [
  { titleKey: 'profile.redesign.section.basics', fields: ['name', 'age', 'city'] },
  {
    titleKey: 'profile.redesign.section.lookingFor',
    fields: ['lookingFor', 'ageRange', 'datingGoal'],
  },
  {
    titleKey: 'profile.redesign.section.about',
    fields: ['about', 'work', 'education', 'languages'],
  },
  { titleKey: 'profile.redesign.section.interests', fields: ['interests'] },
  {
    titleKey: 'profile.redesign.section.lifestyle',
    fields: ['height', 'bodyType', 'smoking', 'alcohol', 'children', 'living'],
  },
];

const SECTIONS_AFTER: SectionDef[] = [
  { titleKey: 'profile.redesign.section.basics', fields: ['name', 'age', 'city'] },
  {
    titleKey: 'profile.redesign.section.about',
    fields: ['about', 'work', 'interests'],
  },
  {
    titleKey: 'profile.redesign.section.lifestyle',
    fields: ['height', 'smoking', 'alcohol', 'children'],
  },
];

function fieldByKey(key: FieldKey): FieldDef {
  const found = FIELD_DEFS.find((f) => f.key === key);
  if (!found) {
    throw new Error(`Unknown field key: ${key}`);
  }
  return found;
}

function valueForField(profile: ProfileData, key: FieldKey): string {
  if (key === 'ageRange') {
    if (!profile.ageRangeMin || !profile.ageRangeMax) return '';
    return `${profile.ageRangeMin}-${profile.ageRangeMax}`;
  }
  if (key === 'interests') {
    return profile.interests.join(', ');
  }
  const raw = profile[key as keyof ProfileData];
  return typeof raw === 'string' ? raw : '';
}

function labelForValue(t: TranslateFn, field: FieldDef, profile: ProfileData): string {
  if (field.key === 'interests' && field.options) {
    if (profile.interests.length === 0) return '';
    const labels = profile.interests.map((interest) => {
      const opt = field.options?.find((o) => o.value === interest);
      return opt ? t(opt.labelKey) : interest;
    });
    return labels.join(', ');
  }

  const value = valueForField(profile, field.key);
  if (!value) return '';
  if (field.kind === 'select' && field.options) {
    const opt = field.options.find((o) => o.value === value);
    return opt ? t(opt.labelKey) : value;
  }
  if (field.key === 'height' && value) {
    return `${value} ${t('profile.redesign.units.cm')}`;
  }
  return value;
}

function parseRange(value: string): { min: number; max: number } {
  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
  const [a, b] = value.split('-').map((v) => Number(v.trim()));
  const min = clamp(Number.isFinite(a) ? a : 18, 18, 65);
  const max = clamp(Number.isFinite(b) ? b : 45, 18, 65);
  return { min, max: Math.max(min, max) };
}

function getCompletion(profile: ProfileData, fields: FieldKey[]): {
  percent: number;
  nextField: FieldKey | null;
  gain: number;
} {
  const filled = fields.filter((key) => {
    if (key === 'ageRange') return !!(profile.ageRangeMin && profile.ageRangeMax);
    if (key === 'interests') return profile.interests.length > 0;
    const val = profile[key as keyof ProfileData];
    return typeof val === 'string' ? val.trim().length > 0 : false;
  });
  const percent = Math.round((filled.length / fields.length) * 100);
  const missing = fields.find((key) => !filled.includes(key)) ?? null;
  const remaining = Math.max(0, fields.length - filled.length);
  const gain = remaining > 0 ? Math.max(5, Math.round(100 / fields.length)) : 0;
  return { percent, nextField: missing, gain };
}

function moodLabel(t: TranslateFn, mood: MoodName): string {
  switch (mood) {
    case 'warm':
      return t('profile.redesign.mood.warm');
    case 'playful':
      return t('profile.redesign.mood.playful');
    case 'missing-you':
      return t('profile.redesign.mood.longing');
    case 'quiet':
      return t('profile.redesign.mood.quiet');
    case 'tender':
      return t('profile.redesign.mood.tender');
    case 'curious':
      return t('profile.redesign.mood.curious');
    case 'thoughtful':
    default:
      return t('profile.redesign.mood.thoughtful');
  }
}

type FieldRowProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  onClick: () => void;
};

function FieldRow({ icon: Icon, label, value, onClick }: FieldRowProps) {
  return (
    <button type="button" className={s.fieldRow} onClick={onClick}>
      <span className={s.fieldIcon}>
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <span className={s.fieldLabel}>{label}</span>
      <span className={`${s.fieldValue} ${!value ? s.fieldPlaceholder : ''}`}>{value || '—'}</span>
      <ChevronRight className={s.fieldChevron} size={16} strokeWidth={1.9} />
    </button>
  );
}

type BottomSheetProps = {
  field: FieldDef;
  profile: ProfileData;
  t: (k: string, p?: Record<string, string | number>) => string;
  onClose: () => void;
  onSave: (draft: Partial<ProfileData>) => void;
};

function BottomSheet({ field, profile, t, onClose, onSave }: BottomSheetProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [value, setValue] = useState(() => valueForField(profile, field.key));

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const save = useCallback(() => {
    if (field.key === 'interests') {
      onSave({ interests: value.split(',').map((v) => v.trim()).filter(Boolean) });
      onClose();
      return;
    }
    if (field.key === 'ageRange') {
      const range = parseRange(value);
      onSave({ ageRangeMin: String(range.min), ageRangeMax: String(range.max) });
      onClose();
      return;
    }

    if (field.kind === 'number') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        onSave({ [field.key]: '' } as Partial<ProfileData>);
        onClose();
        return;
      }
      const min = field.min ?? parsed;
      const max = field.max ?? parsed;
      const clamped = Math.min(max, Math.max(min, parsed));
      onSave({ [field.key]: String(clamped) } as Partial<ProfileData>);
      onClose();
      return;
    }

    onSave({ [field.key]: value } as Partial<ProfileData>);
    onClose();
  }, [field.key, field.kind, field.max, field.min, onClose, onSave, value]);

  const selectedSet = useMemo(() => {
    if (field.key !== 'interests') return new Set<string>();
    return new Set(
      value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    );
  }, [field.key, value]);

  return (
    <motion.div
      className={s.sheetOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        className={s.sheet}
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t(`profile.redesign.field.${field.key}`)}
      >
        <div className={s.sheetHandle} />
        <header className={s.sheetHeader}>
          <h2 className={s.sheetTitle}>
            <field.icon size={17} strokeWidth={1.9} />
            {t(`profile.redesign.field.${field.key}`)}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={s.sheetClose}
            onClick={onClose}
            aria-label={t('profile.redesign.aria.close')}
          >
            <X size={16} />
          </button>
        </header>

        <div className={s.sheetBody}>
          {field.kind === 'text' || field.kind === 'number' ? (
            <input
              className={s.input}
              value={value}
              inputMode={field.kind === 'number' ? 'numeric' : 'text'}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t(`profile.redesign.field.${field.key}`)}
            />
          ) : null}

          {field.kind === 'textarea' ? (
            <>
              <textarea
                className={s.textarea}
                value={value}
                maxLength={field.maxLen}
                onChange={(e) => setValue(e.target.value)}
                aria-label={t(`profile.redesign.field.${field.key}`)}
              />
              <p className={s.counter}>{value.length}/{field.maxLen ?? 280}</p>
            </>
          ) : null}

          {field.kind === 'select' ? (
            <div className={s.options}>
              {(field.options ?? []).map((opt) => {
                const active = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${s.option} ${active ? s.optionActive : ''}`}
                    onClick={() => setValue(opt.value)}
                  >
                    <span>{t(opt.labelKey)}</span>
                    {active ? <Check size={15} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {field.kind === 'chips' ? (
            <div className={s.chips}>
              {(field.options ?? []).map((opt) => {
                const active = selectedSet.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${s.chip} ${active ? s.chipActive : ''}`}
                    onClick={() => {
                      const next = new Set(selectedSet);
                      if (next.has(opt.value)) {
                        next.delete(opt.value);
                      } else {
                        next.add(opt.value);
                      }
                      setValue(Array.from(next).join(', '));
                    }}
                  >
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          ) : null}

          {field.kind === 'range' ? (
            <div className={s.rangeRow}>
              <input
                className={s.input}
                value={parseRange(value).min}
                inputMode="numeric"
                onChange={(e) => {
                  const curr = parseRange(value);
                  setValue(`${e.target.value}-${curr.max}`);
                }}
                aria-label={t('profile.redesign.aria.minAge')}
              />
              <input
                className={s.input}
                value={parseRange(value).max}
                inputMode="numeric"
                onChange={(e) => {
                  const curr = parseRange(value);
                  setValue(`${curr.min}-${e.target.value}`);
                }}
                aria-label={t('profile.redesign.aria.maxAge')}
              />
            </div>
          ) : null}
        </div>

        <footer className={s.sheetFooter}>
          <button type="button" className={s.btnGhost} onClick={onClose}>
            {t('profile.redesign.sheet.cancel')}
          </button>
          <button type="button" className={s.btnPrimary} onClick={save}>
            {t('profile.redesign.sheet.save')}
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}

export default function Profile() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const bonded = searchParams.get('bonded') === '1';

  const [saved, setSaved] = useState<ProfileData>(() => getMockProfile(t, bonded));
  const [draft, setDraft] = useState<ProfileData>(() => getMockProfile(t, bonded));
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    const base = getMockProfile(t, bonded);
    setSaved(base);
    setDraft(base);
    setEditing(null);
  }, [bonded, lang, t]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [draft.avatar]);

  const sections = bonded ? SECTIONS_AFTER : SECTIONS_BEFORE;
  const activeFields = useMemo(() => sections.flatMap((sec) => sec.fields), [sections]);

  const { percent, nextField, gain } = useMemo(() => getCompletion(draft, activeFields), [activeFields, draft]);

  const mood = useMemo(() => moodForId(draft.name || 'profile') as MoodName, [draft.name]);
  const moodColor = useMemo(() => moodTint(mood, 0.9), [mood]);

  const isDirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  const field = editing ? fieldByKey(editing) : null;

  const setBonded = useCallback(
    (next: boolean) => {
      const params = new URLSearchParams(searchParams);
      if (next) {
        params.set('bonded', '1');
      } else {
        params.delete('bonded');
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const saveAll = useCallback(() => {
    setSaved(draft);
  }, [draft]);

  const discardAll = useCallback(() => {
    setDraft(saved);
    setEditing(null);
  }, [saved]);

  return (
    <main className={s.page}>
      <div className={s.starFieldLayer}>
        <StarField intensity="dim" />
      </div>
      <motion.div
        className={s.shell}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className={s.hero}>
          <div className={s.heroStack}>
            <div className={s.orbWrap} style={{ ['--mood-tint' as string]: moodColor }}>
              <span className={s.orbRing} />
              <div className={s.orb}>
                {draft.avatar && !avatarLoadError ? (
                  <img
                    src={draft.avatar}
                    alt=""
                    aria-hidden="true"
                    className={s.orbImg}
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <div className={s.orbFallback}>
                    <User size={28} strokeWidth={1.8} />
                  </div>
                )}
              </div>
              <button type="button" className={s.cameraBtn} aria-label={t('profile.redesign.aria.changePhoto')}>
                <Camera size={17} strokeWidth={1.8} />
              </button>
            </div>

            <div className={s.nameRow}>
              <h1 className={s.name}>{draft.name || t('profile.redesign.hero.name')}</h1>
              <button
                type="button"
                className={s.nameEdit}
                onClick={() => setEditing('name')}
                aria-label={t('profile.redesign.aria.editName')}
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
            </div>
            <p className={s.email}>{t('profile.redesign.hero.email')}</p>

            <div className={s.progressWrap}>
              <div
                className={s.progressTrack}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
              >
                <motion.div
                  className={s.progressFill}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
              {bonded ? (
                <p className={s.progressLabel}>{t('profile.redesign.progress.after', { mood: moodLabel(t, mood) })}</p>
              ) : percent === 100 ? (
                <p className={s.progressLabel}>{t('profile.redesign.progress.completed')}</p>
              ) : (
                <p className={s.progressLabel}>
                  {t('profile.redesign.progress.before', {
                    percent,
                    next: t(`profile.redesign.field.${nextField}`),
                    gain,
                  })}
                </p>
              )}
            </div>

            <div className={s.toggleBar} role="group" aria-label={t('profile.redesign.mode.label')}>
              <button
                type="button"
                className={`${s.toggleBtn} ${!bonded ? s.toggleBtnActive : ''}`}
                onClick={() => setBonded(false)}
              >
                {t('profile.redesign.mode.before')}
              </button>
              <button
                type="button"
                className={`${s.toggleBtn} ${bonded ? s.toggleBtnActive : ''}`}
                onClick={() => setBonded(true)}
              >
                {t('profile.redesign.mode.after')}
              </button>
            </div>
          </div>
        </header>

        <section className={s.sections}>
          {sections.map((sec) => (
            <article key={sec.titleKey} className={s.card}>
              <h2 className={s.cardTitle}>
                <span className={s.titleDot} />
                {t(sec.titleKey)}
              </h2>
              {sec.fields.map((key) => {
                const def = fieldByKey(key);
                const display = labelForValue(t, def, draft);
                return (
                  <FieldRow
                    key={key}
                    icon={def.icon}
                    label={t(`profile.redesign.field.${key}`)}
                    value={display}
                    onClick={() => setEditing(key)}
                  />
                );
              })}
            </article>
          ))}
        </section>
      </motion.div>

      <AnimatePresence>
        {isDirty ? (
          <motion.aside
            className={s.stickyBar}
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            aria-live="polite"
          >
            <div className={s.stickyRow}>
              <button type="button" className={s.btnGhost} onClick={discardAll}>
                {t('profile.redesign.sticky.discard')}
              </button>
              <button type="button" className={s.btnPrimary} onClick={saveAll}>
                {t('profile.redesign.sticky.save')}
              </button>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {field ? (
          <BottomSheet
            field={field}
            profile={draft}
            t={t}
            onClose={() => setEditing(null)}
            onSave={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
