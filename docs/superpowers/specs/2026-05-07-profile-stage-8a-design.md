# Stage 8a — Profile redesign · Design

**Created:** 2026-05-07  
**Stage:** 8a  
**Status:** Approved for implementation  
**Preview:** `/__preview/profile` (before), `/__preview/profile?bonded=1` (after)

---

## 1. Routing & Preview integration

- New lazy route in `src/App.tsx`: `/__preview/profile` → `pages-redesign/Profile.tsx` (dev-only `import.meta.env.DEV`, pattern identical to Stage 7 chat).
- `src/preview/PreviewIndex.tsx` entry:
  - title: **My profile**
  - description: "Stage 8a · cosmic hero, glass cards, sticky save"
  - slug: `profile`
  - status: **in-progress** (change from 'planned')
- URL flags (Stage 7 pattern `?sleep=1`):
  - `?bonded=1` → after-assignment mode
  - no flag → before-assignment (default)
- Toggle in preview-strip switches local mock only; `useAssignment()` **not touched** — this is a shell.

---

## 2. Component shape (monolith)

```
pages-redesign/Profile.tsx           (~700 lines target)
pages-redesign/Profile.module.css    (~600 lines target)
```

Inside `Profile.tsx`, top to bottom:

1. **Constants:** `FIELD_DEFINITIONS`, `SECTIONS_BEFORE`, `SECTIONS_AFTER`, `MOCK_PROFILE_BEFORE`, `MOCK_PROFILE_AFTER`
2. **Types:** `ProfileField` (kind: text | number | textarea | select | chips | range)
3. **Helpers:** 
   - `getCompletion(profile, fields): { percent, missing[] }`
   - `getMockMood(name): Mood` (deterministic, reuse `home/moodForId.ts`)
4. **Inner component:** `BottomSheet({ field, value, onSave, onClose })` (~150 lines)
5. **Inner component:** `FieldRow({ icon, label, value, placeholder, onTap })` (~30 lines)
6. **Main:** `Profile()` — hero + sections + sticky save bar + sheet portal

No separate files; no new reusable components outside the file. StarField imported from `pages-redesign/home/StarField.tsx` (already exists).

---

## 3. Data shape & state

One interface, two mock objects:

```ts
interface ProfileMock {
  name: string;
  age: string;
  city: string;
  about: string;
  // discovery fields (only in before-mode)
  lookingFor: string;     // 'women' | 'men' | 'any'
  ageRange: string;       // '18-45'
  datingGoal: string;     // 'serious' | 'casual' | 'friends' | 'unsure'
  // shared (both modes)
  work: string;
  education: string;
  languages: string;
  interests: string;      // CSV chips
  // lifestyle (shared)
  height: string;
  bodyType: string;
  smoking: string;
  alcohol: string;
  children: string;
  living: string;
  // photos
  avatar: string | null;       // single photo (after-mode shows only this)
  gallery: string[];           // up to 6 (before-mode)
}
```

**State:**
```ts
const [bonded, setBonded] = useState(() => searchParams.has('bonded'));
const [profile, setProfile] = useState<ProfileMock>(bonded ? MOCK_AFTER : MOCK_BEFORE);
const [draft, setDraft] = useState<ProfileMock>(profile); // for dirty detection
const [editingField, setEditingField] = useState<ProfileField | null>(null);
```

`isDirty = !shallowEqual(profile, draft)`. Save → `setProfile(draft)`, Cancel → `setDraft(profile)`. No side-effects, no fetches. All strings/options via `useLanguage().t(...)`.

---

## 4. Visual layout

### Hero (sticky-top, ~360px)

- Backdrop: `<StarField intensity="dim">` (like Memories)
- Center column max-width 480px:
  - **Orb-photo:** 144px circle, mood-tinted ring 2px (gradient `#8B5CF6 → #EC4899` via mood alpha), inner glass-blur background if no photo; "Camera" floating button bottom-right (glass disk 36px) — placeholder, no upload in preview
  - **Name:** 22px Inter SemiBold + Edit icon trail (tap → BottomSheet)
  - **Email:** 13px tertiary text (mock: `you@lumina.app`)
  - **Progress bar:** 4px thin, gradient brand, below whisper text:
    - **Before:** `t('profile.progress.before', { percent, next })` → "Profile 60% · add interests +20%"
    - **After:** `t('profile.afterTagline')` → "She knows you as **someone who notices** ·" (phrase deterministic from name via `moodForId`)

### Sections (scroll content)

**Before-mode (5 sections, ~15 field rows):**
1. **Basics** — name, age, city
2. **Looking for** — lookingFor, ageRange, datingGoal
3. **About you** — about, work, education
4. **Interests** — chip selector (multi)
5. **Lifestyle** — height, bodyType, smoking, alcohol, children, living

**After-mode (3 sections, no discovery fields):**
1. **Basics** — name, age, city
2. **About you** — about (textarea, expanded), work, interests (chips)
3. **Lifestyle** — height, smoking, alcohol, children — what **she** mentions in conversation

**Card style:** `glass-light` (background `rgba(255,255,255,0.04)` dark / `rgba(91,33,182,0.05)` light), border 1px subtle, radius 20px, padding 20px, header 11px uppercase tracking 0.08em with lavender accent dot. **FieldRow:** 44px height, icon 18px lavender, label left, value right (or placeholder if empty), chevron-right 16px, tap → opens BottomSheet.

### BottomSheet (per field edit)

- Portal: `document.getElementById('preview-root')` (reuse Stage 7 pattern)
- Backdrop: dark overlay `rgba(0,0,0,0.6)` + blur 8px
- Sheet: glass-blur, radius 28px top, 480px max-width, `max-height: 70vh` with overflow-y auto
- Handle: 32px × 4px, mood-tinted (lavender + pink gradient), centered
- Header: field.icon + field.label, close button X top-right
- Content: per field-kind:
  - `text` → Input 48px, focus-ring brand
  - `number` → Input type="number", min/max from field config
  - `textarea` → Textarea 120px, char counter, limit from field config
  - `select` → vertical list of Option rows (tap → select + auto-close)
  - `chips` → chip-selector (toggle on/off), chips wrap
  - `range` → dual-thumb slider (age range)
- Footer: row with ghost Cancel + brand Save (disabled if no change)

Animation: Spring (stiffness 300, damping 30) — Stage 7 pattern.

### Sticky save bar

- Appears only when `isDirty === true`
- Glass-blur backdrop-filter, border-top 1px subtle
- Height: 72px + safe-area inset
- Row: ghost "Отмена" left + brand-gradient "Сохранить" right
- Animation: slide-up 300ms ease-out, slide-down on save/cancel

---

## 5. Theme & Dark/Light parity

- Root selector: `.profile-page[data-theme='dark'|'light']`
- **Dark (default):**
  - background: `#0F0A1A` (deep cosmic)
  - glass-light: `rgba(255,255,255,0.04)` + border `rgba(139,92,246,0.12)`
  - text primary: `#F8F4FF`
  - text tertiary: `#9D8FBF`
  - focus-ring: `2px rgba(139,92,246,0.55)`
- **Light:**
  - background: `#F5F3FF`
  - glass-light: `rgba(91,33,182,0.05)` + border `rgba(139,92,246,0.15)`
  - text primary: `#1E1B2E`
  - text tertiary: `#6B5F80`
  - focus-ring: `2px rgba(91,33,182,0.5)`

Toggle via `.preview-page[data-theme='light']` — reuse Stage 7 pattern.

---

## 6. Reduced Motion

- Sheet open/close: if `prefers-reduced-motion: reduce` → instant opacity + no translate
- Hero orb pulse: `animation: pulse 4s ease-in-out infinite` → disable
- Progress bar gradient: `animation: shimmer 3s linear infinite` → static
- Sticky bar slide: → instant

---

## 7. A11y

- Semantic: `<main>`, `<section>`, `<header>`, `<button>`, `<input>`, `<textarea>` — no ARIA spam
- Focus trap in BottomSheet: Stage 7 P1 postponed, but for Profile preview-only — baseline: focus-first-on-open, focus-restore-on-close
- Field labels: `aria-label` on inputs, visible label in header
- Dirty state: `aria-live="polite"` on save bar ("Изменения не сохранены")
- Progress: `role="progressbar"`, `aria-valuenow={percent}`, `aria-valuemin=0`, `aria-valuemax=100`
- Interactive elements: `:focus-visible` brand-ring — Stage 7 a11y pattern

---

## 8. i18n namespace

```
profile.*
  hero.name
  hero.email
  progress.before — "Profile {percent}% · add {next} +{gain}%"
  progress.after — "She knows you as {mood}"
  section.basics
  section.lookingFor
  section.about
  section.interests
  section.lifestyle
  field.name, field.age, field.city, field.about, field.lookingFor, field.ageRange, field.datingGoal, field.work, field.education, field.languages, field.interests, field.height, field.bodyType, field.smoking, field.alcohol, field.children, field.living
  sheet.save, sheet.cancel
  sticky.discard, sticky.save — "Сохранить"
  options.lookingFor.women, .men, .any
  options.datingGoal.serious, .casual, .friends, .unsure
```

Two locales: EN (primary), RU (secondary). `useLanguage().t('profile.field.name')` etc.

---

## 9. Testing approach

- **Manual QA:** `/__preview/profile` (before), `/__preview/profile?bonded=1` (after), toggle switch, open/close sheets, save/cancel, theme toggle
- **Typecheck:** `npx tsc -b` — must pass
- **Build:** `npx vite build` — no errors
- **No unit tests:** preview-only, inline mocks

---

## 10. Out of scope

- Real Supabase / auth integration — this is a shell
- Photo upload functionality — camera button is placeholder only
- Settings page — separate Stage 8b
- Notifications page — separate Stage 8c
- Production deployment — redesign stays in `pages-redesign/` until full Stage 8 complete
