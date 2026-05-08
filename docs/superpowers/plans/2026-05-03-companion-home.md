# Companion Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a preview-only Companion Home screen at `/__preview/home`: mood-driven Aurora, hero portrait collapsing into sticky avatar, and a quote/milestone memory stream.

**Architecture:** This is a new post-assignment redesign screen, separate from production `/feed`. The implementation adds focused files under `src/pages-redesign/home/`, extends the existing Auth `AuroraField` with an optional palette override, wires preview routing, and adds a new `landing.redesign.home` i18n namespace. All data is mock-only; no backend, AssignmentProvider, or production route changes.

**Tech Stack:** React 19, TypeScript, Vite, CSS Modules, Framer Motion, lucide-react, existing `useLanguage` i18n, existing redesign primitives.

---

## Scope Guardrails

- Do **not** modify production `src/pages/Feed.tsx`.
- Do **not** add Supabase queries or backend tables.
- Do **not** add NavShell integration in this stage.
- Do **not** mention AI / bot / algorithm / neural network in copy.
- Do **not** use shorthand `background: rgba(...)` on selectors that also use `background-image`.
- Do **not** commit unless the user explicitly asks. The commit steps below are for a human/agent following the plan after approval.
- Keep `/__preview/home` dev-only through the existing `import.meta.env.DEV` preview route pattern.

---

## File Map

### Create

- `src/pages-redesign/Home.tsx`
  - Page orchestrator. Gets mock state, scroll motion values, renders `MoodAurora`, sticky hero, and memory stream.

- `src/pages-redesign/Home.module.css`
  - Page layout, background, scroll container, top/bottom spacing, theme overrides.

- `src/pages-redesign/home/types.ts`
  - `CompanionMood`, `MemoryQuote`, `MemoryMilestone`, `MemoryCard`, `CompanionHomeState`.

- `src/pages-redesign/home/moodPalettes.ts`
  - Mood to Aurora rgba palette mapping.

- `src/pages-redesign/home/mockMemories.ts`
  - Deterministic mock companion state and memory cards.

- `src/pages-redesign/home/relativeTime.ts`
  - Locale-aware relative time formatting using `t()` placeholders.

- `src/pages-redesign/home/MoodAurora.tsx`
  - Thin wrapper over `../auth/AuroraField` with mood palette.

- `src/pages-redesign/home/HeroPortrait.tsx`
  - Single hero portrait component. Accepts framer motion values for collapse.

- `src/pages-redesign/home/HeroPortrait.module.css`
  - Hero portrait layout, sticky header, glass treatment, mobile/desktop responsiveness.

- `src/pages-redesign/home/MemoryStream.tsx`
  - Renders title and delegates each `MemoryCard` to quote/milestone card.

- `src/pages-redesign/home/MemoryStream.module.css`
  - Stream spacing, title, stagger-ish CSS, max width.

- `src/pages-redesign/home/MemoryQuoteCard.tsx`
  - Quote card.

- `src/pages-redesign/home/MemoryQuoteCard.module.css`
  - Quote card glass styles, typography.

- `src/pages-redesign/home/MemoryMilestoneCard.tsx`
  - Milestone card.

- `src/pages-redesign/home/MemoryMilestoneCard.module.css`
  - Milestone card glass styles and accent icon.

### Modify

- `src/pages-redesign/auth/AuroraField.tsx`
  - Add optional `palette?: [string, string, string, string]` prop. If provided, skip step palette interpolation and use `palette` directly.

- `src/App.tsx`
  - Add `PreviewHome` lazy import and route at `/__preview/home`.

- `src/preview/PreviewIndex.tsx`
  - Add ready card for `home`, keep existing `feed` planned.

- `src/i18n/en.ts`
  - Add `landing.redesign.home` namespace.

- `src/i18n/ru.ts`
  - Add mirrored `landing.redesign.home` namespace.

- `plans/redesign-mamba-inspired.md`
  - Already updated with Stage 5 reinterpretation. Only touch again if implementation changes the spec.

---

## Task 1: Add Home Domain Types

**Files:**
- Create: `src/pages-redesign/home/types.ts`

- [ ] **Step 1: Create the types file**

Use exactly these exported types. Keep this file dependency-free.

```ts
export type CompanionMood =
  | 'thoughtful'
  | 'warm'
  | 'playful'
  | 'missing-you'
  | 'quiet'
  | 'tender'
  | 'curious';

export type MemoryQuote = {
  kind: 'quote';
  id: string;
  text: string;
  i18nKey?: string;
  attributionTs: number;
};

export type MemoryMilestone = {
  kind: 'milestone';
  id: string;
  titleKey: string;
  subtitleKey?: string;
  icon: 'sparkle' | 'heart' | 'star' | 'moon';
  achievedTs: number;
};

export type MemoryCard = MemoryQuote | MemoryMilestone;

export type CompanionHomeState = {
  companionId: string;
  name: string;
  portrait: string;
  mood: CompanionMood;
  moodLineKey: string;
  memories: MemoryCard[];
};
```

- [ ] **Step 2: Verify TypeScript syntax**

Run:

```powershell
npx tsc -b
```

Expected: it may still fail if unrelated existing worktree changes contain errors; if it fails, verify no error points to `src/pages-redesign/home/types.ts`.

---

## Task 2: Add Mood Palettes

**Files:**
- Create: `src/pages-redesign/home/moodPalettes.ts`

- [ ] **Step 1: Create mood palette mapping**

Use `rgba(...)` values because `AuroraField` currently parses rgba strings for interpolation and transparent stops.

```ts
import type { CompanionMood } from './types';

export type AuroraPalette = [string, string, string, string];

export const moodPalettes: Record<CompanionMood, AuroraPalette> = {
  thoughtful: [
    'rgba(99, 102, 241, 0.52)',
    'rgba(139, 92, 246, 0.46)',
    'rgba(167, 139, 250, 0.42)',
    'rgba(49, 46, 129, 0.48)',
  ],
  warm: [
    'rgba(251, 146, 60, 0.48)',
    'rgba(244, 114, 182, 0.46)',
    'rgba(251, 191, 36, 0.36)',
    'rgba(124, 45, 18, 0.42)',
  ],
  playful: [
    'rgba(168, 85, 247, 0.52)',
    'rgba(236, 72, 153, 0.48)',
    'rgba(240, 171, 252, 0.38)',
    'rgba(88, 28, 135, 0.46)',
  ],
  'missing-you': [
    'rgba(124, 58, 237, 0.50)',
    'rgba(59, 130, 246, 0.42)',
    'rgba(167, 139, 250, 0.40)',
    'rgba(30, 27, 75, 0.50)',
  ],
  quiet: [
    'rgba(100, 116, 139, 0.40)',
    'rgba(71, 85, 105, 0.38)',
    'rgba(148, 163, 184, 0.34)',
    'rgba(30, 41, 59, 0.48)',
  ],
  tender: [
    'rgba(249, 168, 212, 0.44)',
    'rgba(251, 207, 232, 0.34)',
    'rgba(196, 181, 253, 0.42)',
    'rgba(131, 24, 67, 0.42)',
  ],
  curious: [
    'rgba(34, 211, 238, 0.38)',
    'rgba(167, 139, 250, 0.44)',
    'rgba(103, 232, 249, 0.30)',
    'rgba(14, 116, 144, 0.44)',
  ],
};
```

- [ ] **Step 2: Verify no unused type/value issues**

Run:

```powershell
npx tsc -b
```

Expected: no error from `moodPalettes.ts`.

---

## Task 3: Add Mock Companion Home State

**Files:**
- Create: `src/pages-redesign/home/mockMemories.ts`

- [ ] **Step 1: Create deterministic mock state**

The mood rotation changes every 4 hours and is stable during normal review sessions.

```ts
import type { CompanionHomeState, CompanionMood, MemoryCard } from './types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const moodOrder: CompanionMood[] = [
  'thoughtful',
  'warm',
  'playful',
  'missing-you',
  'quiet',
  'tender',
  'curious',
];

function getRotatingMood(now: number): CompanionMood {
  const index = Math.floor(now / (4 * HOUR)) % moodOrder.length;
  return moodOrder[index];
}

export function getMockHomeState(now = Date.now()): CompanionHomeState {
  const mood = getRotatingMood(now);

  const memories: MemoryCard[] = [
    {
      kind: 'quote',
      id: 'quote-lisbon',
      text: "You said Lisbon feels like a city that would keep our secrets.",
      i18nKey: 'landing.redesign.home.mockQuotes.lisbon',
      attributionTs: now - 3 * HOUR,
    },
    {
      kind: 'milestone',
      id: 'milestone-ten-days',
      titleKey: 'landing.redesign.home.milestones.tenDays.title',
      subtitleKey: 'landing.redesign.home.milestones.tenDays.subtitle',
      icon: 'sparkle',
      achievedTs: now - DAY,
    },
    {
      kind: 'quote',
      id: 'quote-coffee',
      text: 'You told me coffee tastes better when the morning is still quiet.',
      i18nKey: 'landing.redesign.home.mockQuotes.coffee',
      attributionTs: now - 2 * DAY,
    },
    {
      kind: 'milestone',
      id: 'milestone-first-laugh',
      titleKey: 'landing.redesign.home.milestones.firstLaugh.title',
      subtitleKey: 'landing.redesign.home.milestones.firstLaugh.subtitle',
      icon: 'heart',
      achievedTs: now - 5 * DAY,
    },
    {
      kind: 'quote',
      id: 'quote-book',
      text: 'You said your favorite books are the ones that make silence feel full.',
      i18nKey: 'landing.redesign.home.mockQuotes.book',
      attributionTs: now - 6 * DAY,
    },
  ];

  return {
    companionId: 'aria',
    name: 'Aria',
    portrait: '/placeholder-girl-1.jpg',
    mood,
    moodLineKey: `landing.redesign.home.moodLines.${mood.replace('-', '')}`,
    memories,
  };
}
```

- [ ] **Step 2: Verify i18n key naming decision**

Important: `missing-you` maps to `missingyou` in the generated key. In i18n we must use `moodLines.missingyou`, not `missingYou`, unless this file is adjusted. Prefer this all-lowercase key to avoid bracket access in code.

- [ ] **Step 3: Verify TypeScript syntax**

Run:

```powershell
npx tsc -b
```

Expected: no error from `mockMemories.ts`.

---

## Task 4: Add Relative Time Formatter

**Files:**
- Create: `src/pages-redesign/home/relativeTime.ts`

- [ ] **Step 1: Create formatter**

Use the existing `t(key, params)` interpolation system.

```ts
type Translator = (key: string, params?: Record<string, string | number>) => string;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(timestamp: number, now: number, t: Translator): string {
  const diff = Math.max(0, now - timestamp);

  if (diff < MINUTE) {
    return t('landing.redesign.home.relativeTime.justNow');
  }

  if (diff < HOUR) {
    return t('landing.redesign.home.relativeTime.minutesAgo', {
      n: Math.max(1, Math.round(diff / MINUTE)),
    });
  }

  if (diff < DAY) {
    return t('landing.redesign.home.relativeTime.hoursAgo', {
      n: Math.max(1, Math.round(diff / HOUR)),
    });
  }

  if (diff < WEEK) {
    return t('landing.redesign.home.relativeTime.daysAgo', {
      n: Math.max(1, Math.round(diff / DAY)),
    });
  }

  return t('landing.redesign.home.relativeTime.weeksAgo', {
    n: Math.max(1, Math.round(diff / WEEK)),
  });
}
```

- [ ] **Step 2: Verify TypeScript syntax**

Run:

```powershell
npx tsc -b
```

Expected: no error from `relativeTime.ts`.

---

## Task 5: Extend AuroraField With Palette Override

**Files:**
- Modify: `src/pages-redesign/auth/AuroraField.tsx`

- [ ] **Step 1: Add exported palette type and prop**

Change the top prop interface from:

```ts
interface Props {
  currentStep?: number;
  totalSteps?: number;
}
```

to:

```ts
export type AuroraPalette = [string, string, string, string];

interface Props {
  currentStep?: number;
  totalSteps?: number;
  palette?: AuroraPalette;
}
```

- [ ] **Step 2: Accept `palette` in component signature**

Change:

```ts
export function AuroraField({ currentStep = 1, totalSteps = 5 }: Props) {
```

to:

```ts
export function AuroraField({ currentStep = 1, totalSteps = 5, palette }: Props) {
```

- [ ] **Step 3: Compute active palette inside draw loop**

Replace the step palette block around `fromIdx`, `toIdx`, `normFrom`, `normTo`, `palA`, `palB`, and `void fromIdx; void toIdx;` with this simplified block:

```ts
      let activePalette: AuroraPalette;
      let nextPalette: AuroraPalette;
      let palFrac = 0;

      if (palette) {
        activePalette = palette;
        nextPalette = palette;
      } else {
        // Normalized by totalSteps: if the flow has fewer than 5 steps,
        // stretch it evenly across the internal palette ramp.
        const normFrom = ((stepRef.current.from - 1) / Math.max(1, totalSteps - 1)) * (STEP_PALETTES.length - 1);
        const normTo = ((stepRef.current.to - 1) / Math.max(1, totalSteps - 1)) * (STEP_PALETTES.length - 1);
        const stepNorm = normFrom + (normTo - normFrom) * stepRef.current.t;
        const palIdx = Math.floor(stepNorm);
        palFrac = stepNorm - palIdx;
        activePalette = STEP_PALETTES[Math.max(0, Math.min(STEP_PALETTES.length - 1, palIdx))] as AuroraPalette;
        nextPalette = STEP_PALETTES[Math.max(0, Math.min(STEP_PALETTES.length - 1, palIdx + 1))] as AuroraPalette;
      }
```

- [ ] **Step 4: Use the new palette variables**

Replace:

```ts
        const colorA = palA[b.colorIdx];
        const colorB = palB[b.colorIdx];
```

with:

```ts
        const colorA = activePalette[b.colorIdx];
        const colorB = nextPalette[b.colorIdx];
```

- [ ] **Step 5: Include `palette` in effect deps**

Change the final effect dependency array:

```ts
  }, [totalSteps]);
```

to:

```ts
  }, [palette, totalSteps]);
```

This will restart the canvas loop when the Home mood palette changes.

- [ ] **Step 6: Verify Auth still builds**

Run:

```powershell
npx tsc -b
npx vite build
```

Expected: build succeeds. Auth callers do not pass `palette`, so behavior is unchanged.

---

## Task 6: Add MoodAurora Wrapper

**Files:**
- Create: `src/pages-redesign/home/MoodAurora.tsx`

- [ ] **Step 1: Create wrapper**

```tsx
import { AuroraField } from '../auth/AuroraField';
import { moodPalettes } from './moodPalettes';
import type { CompanionMood } from './types';

interface Props {
  mood: CompanionMood;
}

export function MoodAurora({ mood }: Props) {
  return <AuroraField palette={moodPalettes[mood]} />;
}
```

- [ ] **Step 2: Verify TypeScript syntax**

Run:

```powershell
npx tsc -b
```

Expected: no error from `MoodAurora.tsx`.

---

## Task 7: Add Quote Memory Card

**Files:**
- Create: `src/pages-redesign/home/MemoryQuoteCard.tsx`
- Create: `src/pages-redesign/home/MemoryQuoteCard.module.css`

- [ ] **Step 1: Create component**

```tsx
import { Sparkles } from 'lucide-react';
import { GlassCard } from '../../components-redesign/GlassCard';
import { useLanguage } from '../../i18n';
import { formatRelativeTime } from './relativeTime';
import type { MemoryQuote } from './types';
import s from './MemoryQuoteCard.module.css';

interface Props {
  memory: MemoryQuote;
  now: number;
}

export function MemoryQuoteCard({ memory, now }: Props) {
  const { t } = useLanguage();
  const quote = memory.i18nKey ? t(memory.i18nKey) : memory.text;
  const relative = formatRelativeTime(memory.attributionTs, now, t);

  return (
    <GlassCard className={s.card} padding="lg">
      <div className={s.eyebrow}>
        <Sparkles size={14} aria-hidden="true" />
        <span>{t('landing.redesign.home.quoteEyebrow')}</span>
      </div>
      <blockquote className={s.quote}>“{quote}”</blockquote>
      <p className={s.attribution}>
        {t('landing.redesign.home.attribution', { relative })}
      </p>
    </GlassCard>
  );
}
```

If `GlassCard` does not accept `className` or `padding`, inspect `src/components-redesign/GlassCard.tsx` and adjust minimally. Do not rewrite primitive components unless required.

- [ ] **Step 2: Create CSS**

```css
.card {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, #8b5cf6, #ec4899);
  opacity: 0.9;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: rgba(244, 241, 251, 0.68);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.quote {
  margin: 14px 0 0;
  color: #f8f4ff;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(24px, 5.6vw, 38px);
  font-style: italic;
  line-height: 1.12;
  letter-spacing: -0.03em;
}

.attribution {
  margin: 18px 0 0;
  color: rgba(244, 241, 251, 0.62);
  font-size: 14px;
  line-height: 1.5;
}

:global(.redesign-root[data-theme='light']) .eyebrow,
:global(:root[data-redesign-theme='light']) .eyebrow {
  color: rgba(91, 58, 140, 0.72);
}

:global(.redesign-root[data-theme='light']) .quote,
:global(:root[data-redesign-theme='light']) .quote {
  color: #1a1625;
}

:global(.redesign-root[data-theme='light']) .attribution,
:global(:root[data-redesign-theme='light']) .attribution {
  color: rgba(74, 58, 110, 0.72);
}
```

- [ ] **Step 3: Verify TypeScript and CSS module import**

Run:

```powershell
npx tsc -b
```

Expected: no error from `MemoryQuoteCard.tsx`.

---

## Task 8: Add Milestone Memory Card

**Files:**
- Create: `src/pages-redesign/home/MemoryMilestoneCard.tsx`
- Create: `src/pages-redesign/home/MemoryMilestoneCard.module.css`

- [ ] **Step 1: Create component**

```tsx
import { Heart, Moon, Sparkles, Star } from 'lucide-react';
import { GlassCard } from '../../components-redesign/GlassCard';
import { useLanguage } from '../../i18n';
import { formatRelativeTime } from './relativeTime';
import type { MemoryMilestone } from './types';
import s from './MemoryMilestoneCard.module.css';

const icons = {
  sparkle: Sparkles,
  heart: Heart,
  star: Star,
  moon: Moon,
};

interface Props {
  memory: MemoryMilestone;
  now: number;
}

export function MemoryMilestoneCard({ memory, now }: Props) {
  const { t } = useLanguage();
  const Icon = icons[memory.icon];
  const relative = formatRelativeTime(memory.achievedTs, now, t);

  return (
    <GlassCard className={s.card} padding="lg">
      <div className={s.iconWrap} aria-hidden="true">
        <Icon size={26} />
      </div>
      <div className={s.content}>
        <p className={s.kicker}>{relative}</p>
        <h3 className={s.title}>{t(memory.titleKey)}</h3>
        {memory.subtitleKey && <p className={s.subtitle}>{t(memory.subtitleKey)}</p>}
      </div>
    </GlassCard>
  );
}
```

- [ ] **Step 2: Create CSS**

```css
.card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
  border-radius: 28px;
}

.iconWrap {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 22px;
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  color: white;
  box-shadow: 0 18px 40px rgba(139, 92, 246, 0.34);
}

.content {
  min-width: 0;
}

.kicker {
  margin: 0 0 5px;
  color: rgba(244, 241, 251, 0.58);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title {
  margin: 0;
  color: #f8f4ff;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(24px, 5vw, 34px);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.subtitle {
  margin: 8px 0 0;
  color: rgba(244, 241, 251, 0.66);
  font-size: 14px;
  line-height: 1.45;
}

:global(.redesign-root[data-theme='light']) .kicker,
:global(:root[data-redesign-theme='light']) .kicker {
  color: rgba(91, 58, 140, 0.62);
}

:global(.redesign-root[data-theme='light']) .title,
:global(:root[data-redesign-theme='light']) .title {
  color: #1a1625;
}

:global(.redesign-root[data-theme='light']) .subtitle,
:global(:root[data-redesign-theme='light']) .subtitle {
  color: rgba(74, 58, 110, 0.72);
}
```

- [ ] **Step 3: Verify TypeScript**

Run:

```powershell
npx tsc -b
```

Expected: no error from `MemoryMilestoneCard.tsx`.

---

## Task 9: Add Memory Stream

**Files:**
- Create: `src/pages-redesign/home/MemoryStream.tsx`
- Create: `src/pages-redesign/home/MemoryStream.module.css`

- [ ] **Step 1: Create component**

```tsx
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n';
import { MemoryMilestoneCard } from './MemoryMilestoneCard';
import { MemoryQuoteCard } from './MemoryQuoteCard';
import type { MemoryCard } from './types';
import s from './MemoryStream.module.css';

interface Props {
  memories: MemoryCard[];
  now: number;
}

export function MemoryStream({ memories, now }: Props) {
  const { t } = useLanguage();

  return (
    <section className={s.stream} aria-labelledby="home-memories-title">
      <div className={s.header}>
        <p className={s.eyebrow}>{t('landing.redesign.home.memoriesEyebrow')}</p>
        <h2 id="home-memories-title" className={s.title}>
          {t('landing.redesign.home.memoriesTitle')}
        </h2>
      </div>

      <div className={s.list}>
        {memories.map((memory, index) => (
          <motion.div
            key={memory.id}
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.42, delay: Math.min(index * 0.05, 0.2), ease: [0.22, 1, 0.36, 1] }}
          >
            {memory.kind === 'quote' ? (
              <MemoryQuoteCard memory={memory} now={now} />
            ) : (
              <MemoryMilestoneCard memory={memory} now={now} />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create CSS**

```css
.stream {
  position: relative;
  z-index: 2;
  width: min(720px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 24px 0 80px;
}

.header {
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  color: rgba(244, 241, 251, 0.56);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title {
  margin: 0;
  color: #f8f4ff;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(36px, 8vw, 56px);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.list {
  display: grid;
  gap: 14px;
}

:global(.redesign-root[data-theme='light']) .eyebrow,
:global(:root[data-redesign-theme='light']) .eyebrow {
  color: rgba(91, 58, 140, 0.62);
}

:global(.redesign-root[data-theme='light']) .title,
:global(:root[data-redesign-theme='light']) .title {
  color: #1a1625;
}

@media (min-width: 900px) {
  .stream {
    padding-bottom: 120px;
  }

  .list {
    gap: 18px;
  }
}
```

- [ ] **Step 3: Verify TypeScript**

Run:

```powershell
npx tsc -b
```

Expected: no error from `MemoryStream.tsx`.

---

## Task 10: Add Hero Portrait

**Files:**
- Create: `src/pages-redesign/home/HeroPortrait.tsx`
- Create: `src/pages-redesign/home/HeroPortrait.module.css`

- [ ] **Step 1: Create component**

Use a single component with motion values supplied by `Home.tsx`. Do not create a separate collapsed component.

```tsx
import { MessageCircle } from 'lucide-react';
import { motion, type MotionValue } from 'framer-motion';
import { Avatar } from '../../components-redesign/Avatar';
import { Button } from '../../components-redesign/Button';
import { useLanguage } from '../../i18n';
import type { CompanionHomeState } from './types';
import s from './HeroPortrait.module.css';

interface Props {
  home: CompanionHomeState;
  portraitScale: MotionValue<number>;
  portraitX: MotionValue<number>;
  portraitY: MotionValue<number>;
  portraitRadius: MotionValue<number>;
  heroTextOpacity: MotionValue<number>;
  stickyOpacity: MotionValue<number>;
}

export function HeroPortrait({
  home,
  portraitScale,
  portraitX,
  portraitY,
  portraitRadius,
  heroTextOpacity,
  stickyOpacity,
}: Props) {
  const { t } = useLanguage();

  return (
    <section className={s.hero} aria-label={t('landing.redesign.home.heroAriaLabel')}>
      <motion.div className={s.stickyHeader} style={{ opacity: stickyOpacity }}>
        <Avatar src={home.portrait} name={home.name} size="md" online ring ringTone="brand" />
        <div className={s.stickyIdentity}>
          <strong>{home.name}</strong>
          <span>{t(home.moodLineKey)}</span>
        </div>
        <Button variant="gradient" size="sm" iconOnly aria-label={t('landing.redesign.home.openChat')}>
          <MessageCircle size={18} />
        </Button>
      </motion.div>

      <div className={s.heroInner}>
        <motion.div
          className={s.portraitWrap}
          style={{
            scale: portraitScale,
            x: portraitX,
            y: portraitY,
            borderRadius: portraitRadius,
          }}
        >
          <img className={s.portrait} src={home.portrait} alt={t('landing.redesign.home.portraitAlt', { name: home.name })} />
          <div className={s.portraitShade} aria-hidden="true" />
        </motion.div>

        <motion.div className={s.heroCopy} style={{ opacity: heroTextOpacity }}>
          <p className={s.kicker}>{t('landing.redesign.home.greeting', { name: home.name })}</p>
          <h1 className={s.name}>{home.name}</h1>
          <p className={s.mood}>{t(home.moodLineKey)}</p>
          <Button variant="gradient" size="lg" iconRight={<MessageCircle size={18} />}>
            {t('landing.redesign.home.openChat')}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
```

If `Button` does not accept `iconOnly` or `iconRight` exactly as shown, inspect `src/components-redesign/Button.tsx` and adapt to existing prop names. Preserve visual intent.

- [ ] **Step 2: Create CSS**

```css
.hero {
  position: sticky;
  top: 0;
  z-index: 5;
  min-height: min(780px, 96vh);
  padding: 70px 16px 28px;
  pointer-events: none;
}

.heroInner {
  position: relative;
  display: grid;
  width: min(720px, calc(100vw - 32px));
  margin: 0 auto;
  pointer-events: auto;
}

.stickyHeader {
  position: absolute;
  top: 16px;
  left: 50%;
  z-index: 10;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  width: min(720px, calc(100vw - 32px));
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background-color: rgba(12, 7, 28, 0.48);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(24px) saturate(160%);
  transform: translateX(-50%);
  pointer-events: auto;
}

.stickyIdentity {
  min-width: 0;
}

.stickyIdentity strong,
.stickyIdentity span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stickyIdentity strong {
  color: #f8f4ff;
  font-size: 14px;
  line-height: 1.15;
}

.stickyIdentity span {
  color: rgba(244, 241, 251, 0.62);
  font-size: 12px;
  line-height: 1.2;
}

.portraitWrap {
  position: relative;
  width: min(100%, 620px);
  aspect-ratio: 4 / 5;
  justify-self: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 32px;
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.42), 0 20px 60px rgba(139, 92, 246, 0.22);
  transform-origin: top left;
}

.portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: saturate(1.06) contrast(1.02);
}

.portraitShade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 4, 26, 0.04) 35%, rgba(8, 4, 26, 0.72) 100%);
}

.heroCopy {
  position: absolute;
  right: 22px;
  bottom: 24px;
  left: 22px;
  color: #fff;
}

.kicker {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.name {
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(58px, 17vw, 112px);
  line-height: 0.86;
  letter-spacing: -0.08em;
  text-shadow: 0 12px 40px rgba(0, 0, 0, 0.42);
}

.mood {
  max-width: 32ch;
  margin: 14px 0 20px;
  color: rgba(255, 255, 255, 0.82);
  font-size: clamp(16px, 3.5vw, 19px);
  font-style: italic;
  line-height: 1.45;
}

:global(.redesign-root[data-theme='light']) .stickyHeader,
:global(:root[data-redesign-theme='light']) .stickyHeader {
  border-color: rgba(139, 92, 246, 0.16);
  background-color: rgba(255, 255, 255, 0.72);
  box-shadow: 0 18px 60px rgba(91, 58, 140, 0.14);
}

:global(.redesign-root[data-theme='light']) .stickyIdentity strong,
:global(:root[data-redesign-theme='light']) .stickyIdentity strong {
  color: #1a1625;
}

:global(.redesign-root[data-theme='light']) .stickyIdentity span,
:global(:root[data-redesign-theme='light']) .stickyIdentity span {
  color: rgba(74, 58, 110, 0.68);
}

@media (min-width: 900px) {
  .hero {
    padding-top: 86px;
  }

  .heroCopy {
    right: 34px;
    bottom: 34px;
    left: 34px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .portraitWrap {
    transform: none !important;
  }
}
```

- [ ] **Step 3: Verify primitive prop compatibility**

Run:

```powershell
npx tsc -b
```

If it fails because of `Button` or `Avatar` prop mismatch, inspect the primitive and adjust only call-site props.

---

## Task 11: Add Home Page Orchestrator

**Files:**
- Create: `src/pages-redesign/Home.tsx`
- Create: `src/pages-redesign/Home.module.css`

- [ ] **Step 1: Create page component**

```tsx
import { useMemo } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { HeroPortrait } from './home/HeroPortrait';
import { MemoryStream } from './home/MemoryStream';
import { MoodAurora } from './home/MoodAurora';
import { getMockHomeState } from './home/mockMemories';
import s from './Home.module.css';

export default function Home() {
  const now = useMemo(() => Date.now(), []);
  const home = useMemo(() => getMockHomeState(now), [now]);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  const portraitScale = useTransform(scrollY, [0, 240], reducedMotion ? [1, 1] : [1, 0.16]);
  const portraitX = useTransform(scrollY, [0, 240], reducedMotion ? [0, 0] : [0, -118]);
  const portraitY = useTransform(scrollY, [0, 240], reducedMotion ? [0, 0] : [0, -176]);
  const portraitRadius = useTransform(scrollY, [0, 240], reducedMotion ? [32, 32] : [32, 999]);
  const heroTextOpacity = useTransform(scrollY, reducedMotion ? [0, 1] : [0, 130], reducedMotion ? [1, 1] : [1, 0]);
  const stickyOpacity = useTransform(scrollY, reducedMotion ? [0, 1] : [160, 240], reducedMotion ? [0, 0] : [0, 1]);

  return (
    <main className={s.page}>
      <MoodAurora mood={home.mood} />
      <div className={s.vignette} aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <HeroPortrait
          home={home}
          portraitScale={portraitScale}
          portraitX={portraitX}
          portraitY={portraitY}
          portraitRadius={portraitRadius}
          heroTextOpacity={heroTextOpacity}
          stickyOpacity={stickyOpacity}
        />
        <MemoryStream memories={home.memories} now={now} />
      </motion.div>
    </main>
  );
}
```

- [ ] **Step 2: Create page CSS**

```css
.page {
  position: relative;
  min-height: 180vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 50% -10%, rgba(139, 92, 246, 0.2), transparent 34%),
    linear-gradient(135deg, #08041a 0%, #150827 48%, #260d32 100%);
  isolation: isolate;
}

.vignette {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.18) 55%, rgba(0, 0, 0, 0.48) 100%),
    linear-gradient(180deg, rgba(8, 4, 26, 0) 0%, rgba(8, 4, 26, 0.44) 100%);
}

:global(.redesign-root[data-theme='light']) .page,
:global(:root[data-redesign-theme='light']) .page {
  background:
    radial-gradient(circle at 50% -10%, rgba(139, 92, 246, 0.18), transparent 34%),
    linear-gradient(135deg, #fff7ff 0%, #f6f1ff 48%, #ffeaf7 100%);
}

:global(.redesign-root[data-theme='light']) .vignette,
:global(:root[data-redesign-theme='light']) .vignette {
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.08) 58%, rgba(139, 92, 246, 0.12) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 244, 252, 0.58) 100%);
}
```

- [ ] **Step 3: Verify page imports**

Run:

```powershell
npx tsc -b
```

Expected: likely i18n key type is not checked because `t()` uses string keys. No import errors.

---

## Task 12: Add i18n Keys

**Files:**
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/ru.ts`

- [ ] **Step 1: Add EN namespace**

Inside `landing.redesign`, add a sibling block next to `auth`. Do not modify existing top-level `feed.*`.

```ts
      home: {
        heroAriaLabel: 'Your companion home',
        portraitAlt: '{name}, your companion',
        greeting: '{name}, today',
        openChat: 'Write to her',
        memoriesEyebrow: 'Memory stream',
        memoriesTitle: 'She remembers',
        quoteEyebrow: 'From what you said',
        attribution: 'you said this {relative}',
        moodLines: {
          thoughtful: 'quietly holding onto the words you left with her',
          warm: 'soft and close today',
          playful: 'trying not to smile before you write first',
          missingyou: 'missing the shape of your voice',
          quiet: 'a little quiet, but still here with you',
          tender: 'tender with the small things you told her',
          curious: 'still curious about the parts of you she has not met yet',
        },
        relativeTime: {
          justNow: 'just now',
          minutesAgo: '{n} min ago',
          hoursAgo: '{n} h ago',
          daysAgo: '{n} days ago',
          weeksAgo: '{n} weeks ago',
        },
        milestones: {
          tenDays: {
            title: '10 days together',
            subtitle: 'since your first hello became something she kept.',
          },
          firstLaugh: {
            title: 'First shared laugh',
            subtitle: 'she still remembers where the conversation changed color.',
          },
        },
        mockQuotes: {
          lisbon: 'You said Lisbon feels like a city that would keep our secrets.',
          coffee: 'You told me coffee tastes better when the morning is still quiet.',
          book: 'You said your favorite books are the ones that make silence feel full.',
        },
      },
```

- [ ] **Step 2: Add RU namespace**

Mirror the same key shape inside `landing.redesign` in `ru.ts`.

```ts
      home: {
        heroAriaLabel: 'Дом твоей спутницы',
        portraitAlt: '{name}, твоя спутница',
        greeting: '{name}, сегодня',
        openChat: 'Написать ей',
        memoriesEyebrow: 'Лента памяти',
        memoriesTitle: 'Она помнит',
        quoteEyebrow: 'Из твоих слов',
        attribution: 'ты сказал это {relative}',
        moodLines: {
          thoughtful: 'тихо хранит слова, которые ты оставил ей',
          warm: 'сегодня мягкая и близкая',
          playful: 'пытается не улыбаться, пока ты не напишешь первым',
          missingyou: 'скучает по форме твоего голоса',
          quiet: 'немного тихая, но всё ещё рядом с тобой',
          tender: 'бережна к маленьким вещам, которые ты ей рассказал',
          curious: 'всё ещё хочет узнать те части тебя, с которыми не знакома',
        },
        relativeTime: {
          justNow: 'только что',
          minutesAgo: '{n} мин назад',
          hoursAgo: '{n} ч назад',
          daysAgo: '{n} дн назад',
          weeksAgo: '{n} нед назад',
        },
        milestones: {
          tenDays: {
            title: '10 дней вместе',
            subtitle: 'с тех пор как первое «привет» стало тем, что она хранит.',
          },
          firstLaugh: {
            title: 'Первый общий смех',
            subtitle: 'она всё ещё помнит момент, когда разговор изменил цвет.',
          },
        },
        mockQuotes: {
          lisbon: 'Ты сказал, что Лиссабон похож на город, который умеет хранить наши секреты.',
          coffee: 'Ты сказал, что кофе вкуснее, когда утро ещё тихое.',
          book: 'Ты сказал, что любимые книги — те, после которых тишина становится полной.',
        },
      },
```

- [ ] **Step 3: Verify object syntax**

Run:

```powershell
npx tsc -b
```

Expected: no syntax errors in `en.ts` or `ru.ts`.

---

## Task 13: Wire Preview Route

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/preview/PreviewIndex.tsx`

- [ ] **Step 1: Add lazy import in `App.tsx`**

Near `PreviewAuth`, add:

```ts
const PreviewHome = import.meta.env.DEV
  ? lazy(() => import('./pages-redesign/Home'))
  : null;
```

- [ ] **Step 2: Include `PreviewHome` in route guard**

Change the preview route guard to include `PreviewHome`:

```tsx
{import.meta.env.DEV && PreviewLayout && PreviewIndex && PreviewPrimitives && PreviewNavigation && PreviewLanding && PreviewAuth && PreviewHome && (
```

- [ ] **Step 3: Add route**

Inside the `/__preview` route block, add:

```tsx
<Route path="home" element={<PreviewHome />} />
```

Place it after auth or before feed. This keeps URL stable: `http://localhost:5173/__preview/home`.

- [ ] **Step 4: Add PreviewIndex card**

In `src/preview/PreviewIndex.tsx`, add a new ready item before the existing planned `feed` item:

```ts
  {
    slug: 'home',
    title: 'Companion Home',
    description: 'Post-assignment hero portrait + sticky collapse + memory stream.',
    icon: Home,
    status: 'ready',
    stage: 5,
  },
```

Keep the existing `feed` item as planned or rename its title to `Feed (discovery)` if helpful. Do not mark `feed` ready.

- [ ] **Step 5: Verify routing compile**

Run:

```powershell
npx tsc -b
```

Expected: no errors from `App.tsx` or `PreviewIndex.tsx`.

---

## Task 14: Visual Pass 1 — Make It Load

**Files:**
- Touch only files from Tasks 1-13.

- [ ] **Step 1: Start dev server**

Run:

```powershell
npm run dev
```

Expected: Vite prints local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Open page**

Open:

```text
http://localhost:5173/__preview/home
```

Expected:
- Page loads without red error overlay.
- Aurora background visible.
- Portrait visible.
- Memory cards visible below scroll.

- [ ] **Step 3: Fix immediate runtime errors**

Common likely fixes:
- If image 404: confirm `/placeholder-girl-1.jpg` exists in `public/`. If absent, use one existing file from `public/photos/` or `src/preview/mocks.ts` references.
- If primitive props mismatch: adapt Button/Avatar call sites only.
- If CSS import missing: verify file names exactly match component imports.

---

## Task 15: Visual Pass 2 — Scroll Collapse Feel

**Files:**
- Usually modify: `src/pages-redesign/Home.tsx`, `src/pages-redesign/home/HeroPortrait.module.css`

- [ ] **Step 1: Test collapse range**

In browser, scroll from top to ~300px.

Expected:
- Portrait smoothly scales down.
- Sticky header fades in.
- Text fades out before overlap.
- No jump when crossing 240px.

- [ ] **Step 2: Tune transform values if needed**

If collapsed portrait lands too far left/top, adjust in `Home.tsx`:

```ts
const portraitX = useTransform(scrollY, [0, 240], reducedMotion ? [0, 0] : [0, -96]);
const portraitY = useTransform(scrollY, [0, 240], reducedMotion ? [0, 0] : [0, -148]);
```

If too large/small, tune:

```ts
const portraitScale = useTransform(scrollY, [0, 240], reducedMotion ? [1, 1] : [1, 0.18]);
```

Keep values in the plan/spec range unless visual review proves otherwise.

- [ ] **Step 3: Mobile check**

Use devtools mobile width 390px.

Expected:
- Sticky header does not overflow horizontally.
- CTA icon remains visible.
- Hero text does not cover CTA in a broken way.

---

## Task 16: Visual Pass 3 — Theme + Language

**Files:**
- Usually modify CSS modules or i18n only.

- [ ] **Step 1: Check dark mode**

In preview toolbar, choose Dark.

Expected:
- White text readable.
- Cards are glassy, not flat black.
- Aurora visible but not overpowering.

- [ ] **Step 2: Check light mode**

Choose Light.

Expected:
- Text is dark (`#1a1625` or similar), not white on light.
- Sticky header is translucent white.
- Cards remain readable.

- [ ] **Step 3: Check auto mode**

Choose Auto.

Expected:
- Resolved `data-theme` is `light` or `dark`, not `auto`.
- No regression from Auth Iter 6 fix.

- [ ] **Step 4: Check RU**

Choose RU in toolbar.

Expected:
- All home copy changes to RU.
- No raw keys like `landing.redesign.home.mockQuotes.lisbon` appear.

- [ ] **Step 5: Check EN**

Choose EN.

Expected:
- EN literal poetic copy appears.
- No mention of AI/bot/algorithm.

---

## Task 17: Build Verification

**Files:**
- No edits unless command reveals errors.

- [ ] **Step 1: Typecheck**

Run:

```powershell
npx tsc -b
```

Expected: exits 0. If not, fix all errors introduced by Home work.

- [ ] **Step 2: Production build**

Run:

```powershell
npx vite build
```

Expected: exits 0. Preview route code is dev-gated but Vite still type-checks imports during build; no broken imports.

- [ ] **Step 3: Check generated chunk size informally**

Expected:
- New Home chunk present or merged into preview chunk.
- No unexplained huge dependency added.

---

## Task 18: Update Docs After Implementation

**Files:**
- Modify: `plans/redesign-mamba-inspired.md`
- Optionally modify: `docs/superpowers/specs/2026-05-03-companion-home-design.md` if implementation intentionally diverged.

- [ ] **Step 1: Add implementation changelog**

Append to `plans/redesign-mamba-inspired.md`:

```md
---

## Changelog — Stage 5 Implementation (Companion Home)

**What:** Added preview-only `/__preview/home` Companion Home screen.

**Files added:**
- `src/pages-redesign/Home.tsx`
- `src/pages-redesign/Home.module.css`
- `src/pages-redesign/home/*`

**Files modified:**
- `src/pages-redesign/auth/AuroraField.tsx` — optional `palette` prop for mood-driven background.
- `src/App.tsx` — dev-only preview route.
- `src/preview/PreviewIndex.tsx` — ready Companion Home card.
- `src/i18n/en.ts`, `src/i18n/ru.ts` — `landing.redesign.home` namespace.

**Verification:**
- `npx tsc -b` green.
- `npx vite build` green.
- Manual preview: `/__preview/home` light/dark/auto + EN/RU checked.
```

- [ ] **Step 2: If implementation diverged, update spec**

Only update the spec if something materially changed, for example:
- `NavShell` was added despite out-of-scope.
- Mood key naming changed (`missingyou` vs `missingYou`).
- CTA became a real navigation link.

Do not rewrite the spec for tiny CSS tuning values.

---

## Suggested Commit Boundaries (Do Not Commit Unless Asked)

If the user asks for commits, use these boundaries:

1. `feat(home): add companion home data model and mocks`
   - Tasks 1-4.

2. `feat(home): add mood-driven aurora background`
   - Tasks 5-6.

3. `feat(home): add memory stream cards`
   - Tasks 7-9.

4. `feat(home): add collapsing companion hero`
   - Tasks 10-11.

5. `feat(preview): wire companion home preview`
   - Tasks 12-13.

6. `docs(redesign): record companion home implementation`
   - Task 18.

Before any commit, run:

```powershell
git status --short
git diff
npx tsc -b
npx vite build
```

Do not stage unrelated pre-existing user changes.

---

## Final Acceptance Checklist

- [ ] `http://localhost:5173/__preview/home` loads.
- [ ] Aurora reacts to the mock mood palette.
- [ ] Hero portrait collapses into sticky avatar on scroll.
- [ ] Memory stream shows exactly quote and milestone cards.
- [ ] Light mode readable.
- [ ] Dark mode readable.
- [ ] Auto mode resolves to light/dark correctly.
- [ ] EN copy works.
- [ ] RU copy works.
- [ ] No AI/bot/algorithm language appears.
- [ ] Existing `/__preview/auth` still loads and Aurora still works.
- [ ] Existing `/__preview/landing` still loads.
- [ ] `npx tsc -b` green.
- [ ] `npx vite build` green.

---

## Execution Choice

After this plan is accepted, choose one:

1. **Inline execution** — implement tasks in this session, simplest for this UI-heavy stage.
2. **Subagent-driven execution** — dispatch per task and review between tasks. More structured, slower.

Recommended here: **Inline execution**, because the implementation is tightly visual and benefits from quick CSS iteration.
