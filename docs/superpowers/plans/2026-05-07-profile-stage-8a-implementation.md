# Stage 8a — Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `/__preview/profile` — a shell Profile page with cosmic hero, glass cards, sticky save bar, and Before/After toggle via `?bonded=1`.

**Architecture:** Monolith `pages-redesign/Profile.tsx` (~700 lines) + CSS module. StarField backdrop reused from Stage 5. Mock data via local state, no Supabase. Toggle between two mock profiles based on URL param.

**Tech Stack:** React 19 + Vite 8 + CSS Modules + Framer Motion 12 + lucide-react

---

## File Structure

```
src/pages-redesign/Profile.tsx          # Main component (monolith)
src/pages-redesign/Profile.module.css   # Styles (~600 lines)
src/App.tsx                             # Add lazy route
src/preview/PreviewIndex.tsx            # Update status → in-progress
src/i18n/en.ts                          # Add profile.* namespace
src/i18n/ru.ts                          # Add profile.* namespace
```

---

## Phase 1: Infrastructure (routes + index)

### Task 1: Add lazy route in App.tsx

**Files:**
- Modify: `src/App.tsx` — add lazy import and route for `/__preview/profile`

- [ ] **Step 1: Add lazy import**

Find existing pattern for lazy preview routes (e.g., Landing, Auth, Chat). Add:

```tsx
const Profile = lazy(() => import('./pages-redesign/Profile'));
```

- [ ] **Step 2: Add route**

In the DEV-only routes section, add:

```tsx
<Route path="/__preview/profile" element={<Profile />} />
```

- [ ] **Step 3: Verify no conflicts**

Run: `npx tsc -b`
Expected: no errors

---

### Task 2: Update PreviewIndex status

**Files:**
- Modify: `src/preview/PreviewIndex.tsx:117-123` — change profile status to 'in-progress'

- [ ] **Step 1: Change status**

In the `previewPages` array, find the profile entry (slug: 'profile') and change:

```ts
status: 'planned' → status: 'in-progress'
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx src/preview/PreviewIndex.tsx
git commit -m "feat(preview): add Profile route + set in-progress"
```

---

## Phase 2: i18n strings

### Task 3: Add EN translations

**Files:**
- Modify: `src/i18n/en.ts` — add profile.* namespace

- [ ] **Step 1: Add namespace**

Add after existing namespaces:

```ts
profile: {
  hero: {
    name: 'Your name',
    email: 'you@lumina.app',
  },
  progress: {
    before: 'Profile {percent}% · add {next} +{gain}%',
    after: 'She knows you as {mood}',
  },
  section: {
    basics: 'BASICS',
    lookingFor: 'LOOKING FOR',
    about: 'ABOUT YOU',
    interests: 'INTERESTS',
    lifestyle: 'LIFESTYLE',
  },
  field: {
    name: 'Name',
    age: 'Age',
    city: 'City',
    about: 'About yourself',
    lookingFor: 'Looking for',
    ageRange: 'Age range',
    datingGoal: 'Goal',
    work: 'Work',
    education: 'Education',
    languages: 'Languages',
    interests: 'Interests',
    height: 'Height',
    bodyType: 'Body type',
    smoking: 'Smoking',
    alcohol: 'Alcohol',
    children: 'Children',
    living: 'Living situation',
  },
  sheet: {
    save: 'Save',
    cancel: 'Cancel',
  },
  sticky: {
    discard: 'Discard',
    save: 'Save',
  },
  options: {
    lookingFor: {
      women: 'Women',
      men: 'Men',
      any: 'Any',
    },
    datingGoal: {
      serious: 'Serious relationship',
      casual: 'Casual dating',
      friends: 'Friends first',
      unsure: 'Not sure yet',
    },
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/en.ts
git commit -m "i18n: add profile namespace EN"
```

---

### Task 4: Add RU translations

**Files:**
- Modify: `src/i18n/ru.ts` — add profile.* namespace

- [ ] **Step 1: Add namespace**

Add Russian equivalents:

```ts
profile: {
  hero: {
    name: 'Ваше имя',
    email: 'you@lumina.app',
  },
  progress: {
    before: 'Профиль {percent}% · добавь {next} +{gain}%',
    after: 'Она знает тебя как {mood}',
  },
  section: {
    basics: 'ОСНОВНОЕ',
    lookingFor: 'ПОИСК',
    about: 'О СЕБЕ',
    interests: 'ИНТЕРЕСЫ',
    lifestyle: 'ОБРАЗ ЖИЗНИ',
  },
  field: {
    name: 'Имя',
    age: 'Возраст',
    city: 'Город',
    about: 'О себе',
    lookingFor: 'Ищу',
    ageRange: 'Возраст',
    datingGoal: 'Цель',
    work: 'Работа',
    education: 'Образование',
    languages: 'Языки',
    interests: 'Интересы',
    height: 'Рост',
    bodyType: 'Телосложение',
    smoking: 'Курение',
    alcohol: 'Алкоголь',
    children: 'Дети',
    living: 'Проживание',
  },
  sheet: {
    save: 'Сохранить',
    cancel: 'Отмена',
  },
  sticky: {
    discard: 'Отмена',
    save: 'Сохранить',
  },
  options: {
    lookingFor: {
      women: 'Девушек',
      men: 'Парней',
      any: 'Всех',
    },
    datingGoal: {
      serious: 'Серьёзные отношения',
      casual: 'Лёгкие свидания',
      friends: 'Сначала дружба',
      unsure: 'Пока не определился',
    },
  },
},
```

- [ ] **Step 2: Commit**

```bash
git add src/i18n/ru.ts
git commit -m "i18n: add profile namespace RU"
```

---

## Phase 3: CSS Module

### Task 5: Create Profile.module.css

**Files:**
- Create: `src/pages-redesign/Profile.module.css`

- [ ] **Step 1: Create file with all CSS tokens**

Write complete CSS with:
- Root selector `.profilePage` with dark/light data-attribute
- Hero styles: `.hero`, `.orbWrapper`, `.orb`, `.moodRing`, `.cameraBtn`, `.name`, `.email`, `.progressBar`, `.progressFill`, `.progressLabel`
- Sections: `.section`, `.sectionHeader`, `.card`, `.fieldRow`, `.fieldIcon`, `.fieldLabel`, `.fieldValue`, `.fieldChevron`
- BottomSheet: `.sheetOverlay`, `.sheet`, `.sheetHandle`, `.sheetHeader`, `.sheetTitle`, `.sheetClose`, `.sheetContent`, `.sheetFooter`, `.sheetOption`
- Sticky bar: `.stickyBar`, `.stickyBtn`
- All dark/light variants via `[data-theme='light']` selectors
- Reduced motion via `@media (prefers-reduced-motion: reduce)`

Focus on: deep cosmic background `#0F0A1A` dark / `#F5F3FF` light, glass-light cards, brand gradient on progress bar, mood-tinted orb ring.

- [ ] **Step 2: Verify file exists + no syntax errors**

Run: `ls src/pages-redesign/Profile.module.css`
Expected: file exists

- [ ] **Step 3: Commit**

```bash
git add src/pages-redesign/Profile.module.css
git commit -m "feat(css): Profile.module.css with cosmic hero + glass cards"
```

---

## Phase 4: Main Component

### Task 6: Create Profile.tsx (monolith)

**Files:**
- Create: `src/pages-redesign/Profile.tsx`

- [ ] **Step 1: Imports**

```ts
import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, MapPin, Heart, Briefcase, GraduationCap, Languages,
  Hash, Ruler, Flame, Wine, Baby, Home, ChevronRight, X,
  Camera, Sparkles,
} from 'lucide-react';
import StarField from './home/StarField';
import { useLanguage } from '../i18n';
import s from './Profile.module.css';
```

- [ ] **Step 2: Define mock data**

Two constants `MOCK_BEFORE` and `MOCK_AFTER` with realistic profile data matching the spec's interface.

- [ ] **Step 3: Define field definitions**

`FIELD_DEFINITIONS` array with all fields: name, age, city, about, lookingFor, ageRange, datingGoal, work, education, languages, interests, height, bodyType, smoking, alcohol, children, living. Each with `key`, `label`, `icon`, `kind`, `options` (for selects/chips), `limits`.

- [ ] **Step 4: Define sections**

`SECTIONS_BEFORE` = ['basics', 'lookingFor', 'about', 'interests', 'lifestyle']
`SECTIONS_AFTER` = ['basics', 'about', 'lifestyle']

- [ ] **Step 5: Helper functions**

`getCompletion(profile, fields)` → `{ percent, missing, nextField, nextGain }`
`getMockMood(name)` → deterministic mood from `home/moodForId.ts`

- [ ] **Step 6: Inner components**

- `FieldRow({ icon, label, value, onClick })` — renders a tappable row
- `BottomSheet({ field, value, onSave, onClose })` — modal sheet with field-specific input

- [ ] **Step 7: Main Profile component**

```tsx
export default function Profile() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const bonded = searchParams.get('bonded') === '1';

  const [profile, setProfile] = useState(bonded ? MOCK_AFTER : MOCK_BEFORE);
  const [draft, setDraft] = useState(profile);
  const [editingField, setEditingField] = useState<string | null>(null);

  const isDirty = useMemo(() => 
    Object.keys(draft).some(k => draft[k as keyof typeof draft] !== profile[k as keyof typeof profile]),
    [draft, profile]
  );

  const { percent, missing, nextField, nextGain } = useMemo(
    () => getCompletion(draft, FIELD_DEFINITIONS),
    [draft]
  );

  const sections = bonded ? SECTIONS_AFTER : SECTIONS_BEFORE;

  const handleSave = useCallback(() => {
    setProfile(draft);
  }, [draft]);

  const handleDiscard = useCallback(() => {
    setDraft(profile);
  }, [profile]);

  // ... render
}
```

- [ ] **Step 8: Render logic**

- Wrap in `<StarField intensity="dim">`
- Hero section with orb-photo, name, email, progress bar
- Map through sections → cards → FieldRows
- Sticky save bar appears when `isDirty`
- AnimatePresence for BottomSheet

- [ ] **Step 9: Test in browser**

Navigate to `/__preview/profile` and `/__preview/profile?bonded=1`. Verify:
- StarField backdrop renders
- Orb photo displays with mood ring
- Progress bar shows percentage
- Tapping field opens BottomSheet
- Save/Discard buttons work

- [ ] **Step 10: Commit**

```bash
git add src/pages-redesign/Profile.tsx
git commit -m "feat(preview): Stage 8a Profile with cosmic hero + glass cards"
```

---

## Phase 5: Verification

### Task 7: Typecheck + Build

**Files:**
- Run: `npx tsc -b && npx vite build`

- [ ] **Step 1: Run typecheck**

Run: `npx tsc -b`
Expected: no errors

- [ ] **Step 2: Run build**

Run: `npx vite build`
Expected: build completes without errors

- [ ] **Step 3: Commit verification**

```bash
git add -A
git commit -m "fix: Stage 8a typecheck + build clean"
```

---

## Phase 6: Changelog

### Task 8: Add Stage 8a to redesign changelog

**Files:**
- Modify: `plans/redesign-mamba-inspired.md` — append Stage 8a entry

- [ ] **Step 1: Add entry**

At end of file, add:

```markdown
---

## Stage 8a — Profile (2026-05-07)

### Done
- P0: Infrastructure — route + PreviewIndex + i18n
- P1: CSS Module — cosmic hero, glass cards, dark/light, RM
- P2: Profile.tsx — monolith with mock data, Before/After toggle
- P3: BottomSheet per-field edit, sticky save bar
- P4: Verification — typecheck + build

### Notes
- Preview-only, no Supabase integration
- Dual mode: before-assignment (full profile) / after-assignment (reduced)
- Toggle via `?bonded=1` URL param
```

- [ ] **Step 2: Commit**

```bash
git add plans/redesign-mamba-inspired.md
git commit -m "changelog: Stage 8a complete"
```

---

## Summary

| Phase | Tasks | Files |
|-------|-------|-------|
| 1 | 2 | App.tsx, PreviewIndex.tsx |
| 2 | 2 | en.ts, ru.ts |
| 3 | 1 | Profile.module.css |
| 4 | 1 | Profile.tsx |
| 5 | 1 | — |
| 6 | 1 | redesign-mamba-inspired.md |
| **Total** | **8** | **8 files** |

**Estimated time:** ~45-60 minutes

---

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/2026-05-07-profile-stage-8a-implementation.md`. Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
