# Stage 5 — Companion Home (design spec)

**Date:** 2026-05-03
**Status:** approved (design), ready for implementation plan
**Stage:** 5 of redesign-mamba-inspired
**Scope:** preview-only screen at `/__preview/home` (does NOT replace production `/feed`)

---

## 1. Concept

Post-assignment "home" screen. The companion feels like a living presence. A large hero portrait collapses into a sticky avatar as the user scrolls; below it is a vertical stream of memory cards (chat-callbacks and milestones) on top of a mood-driven Aurora background.

Reinforces the brand invariant **"одна, только твоя"** (monogamous): there is no list of girls, no swipe — just *her*, and what she remembers about you.

This screen targets users who already have an active assignment. The existing `/feed` (Tinder-style discovery before assignment) is **not** touched in this stage.

---

## 2. User-visible behavior

1. User opens `/__preview/home`. Aurora background appears with mood-tied palette. Hero portrait fills upper ~55% of viewport (4:5 aspect, rounded). Below the portrait: companion name (Playfair, large), mood-line (italic Inter, e.g. "thoughtful today"), and a brand-gradient CTA "Write to her" — in preview this is a no-op (button without `onClick`/`href`); in production wiring it will navigate to `/chat`.
2. User scrolls. The portrait scales down, slides up-left, and rounds into a circular avatar inside a sticky glass header (top-aligned, `backdrop-blur(24px)`). Name shrinks to body-size beside the avatar; CTA collapses to an icon-only button right.
3. The memory stream begins below the hero. Each card is a glass card (light or dark theme respected). Two card kinds:
   - **Quote card**: italic Playfair text, attribution beneath ("you said this 3 days ago").
   - **Milestone card**: large icon (sparkle / heart / star / moon), title ("10 days together"), optional subtitle.
4. Cards are sorted newest-first. Relative timestamps are computed at render time.
5. Mood rotates deterministically every 4 hours of wall-clock time so reloads in a session feel stable.

---

## 3. Architecture

### Routing
- New lazy import in `src/App.tsx`: `PreviewHome` from `src/pages-redesign/Home.tsx`.
- Register `<Route path="home" element={<PreviewHome />} />` inside the existing `__preview` block (only in `import.meta.env.DEV`).
- Update `src/preview/PreviewIndex.tsx` — add `companion-home` entry with `status: 'ready'`, `stage: 5`.

The production `/feed` route and its component remain untouched.

### Files
```
src/pages-redesign/
  Home.tsx                              ← page orchestrator, scroll motion values
  home/
    HeroPortrait.tsx + .module.css      ← single component, scroll-driven transforms
    MemoryStream.tsx + .module.css      ← list, renders MemoryQuoteCard / MemoryMilestoneCard
    MemoryQuoteCard.tsx + .module.css
    MemoryMilestoneCard.tsx + .module.css
    MoodAurora.tsx                      ← thin wrapper over AuroraField w/ palette override
    moodPalettes.ts                     ← Record<CompanionMood, [c1,c2,c3,c4]>
    mockMemories.ts                     ← getMockHomeState(): CompanionHomeState
    relativeTime.ts                     ← formatRelative(ts, lang) -> string (or i18n keys)
```

### Reused components / modules
- `src/components-redesign/Avatar.tsx` — for the collapsed sticky-header version.
- `src/components-redesign/Button.tsx` — `variant="gradient"` for "Write to her".
- `src/components-redesign/GlassCard.tsx` — base for memory cards.
- `src/pages-redesign/auth/AuroraField.tsx` — reused with a new optional prop (see §6).
- `src/preview/PreviewLayout.tsx` — provides theme + language switcher.
- i18n hook `useLanguage` (existing).

### Nav shell
NOT in this stage. The screen renders inside `PreviewLayout`'s sticky toolbar only. Adding `NavShell + BottomTabBar` integration is Stage 6+.

---

## 4. Data model

```ts
// src/pages-redesign/home/types.ts (new)

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
  text: string;            // EN baseline; RU lookup via i18n key when present
  i18nKey?: string;        // optional: 'home.mockQuotes.lisbon' for translation
  attributionTs: number;   // unix ms; converted to "3 days ago" at render
};

export type MemoryMilestone = {
  kind: 'milestone';
  id: string;
  titleKey: string;        // i18n key, e.g. 'home.milestones.tenDays'
  subtitleKey?: string;
  icon: 'sparkle' | 'heart' | 'star' | 'moon';
  achievedTs: number;
};

export type MemoryCard = MemoryQuote | MemoryMilestone;

export type CompanionHomeState = {
  companionId: string;
  name: string;            // displayed as-is (proper noun)
  portrait: string;        // public/ asset path; mock uses /placeholder-girl-1.jpg
  mood: CompanionMood;
  moodLineKey: string;     // i18n key, e.g. 'home.moodLines.thoughtful'
  memories: MemoryCard[];  // pre-sorted newest first
};
```

Quotes carry both `text` (EN literal) and optional `i18nKey`. For the mock all 5 quotes use i18nKey lookup; the `text` field is fallback.

---

## 5. Mock data (for preview only)

`getMockHomeState()` returns one state:

- `companionId: 'aria'`
- `name: 'Aria'` (or 'Аря' resolved at i18n layer if needed — TBD: keep proper noun untranslated for v1)
- `portrait: '/photos/eb27af8510cd56dc593190b19f246d1b.jpg'` (existing preview asset in `public/photos/`)
- `mood`: deterministic rotation by `Math.floor(Date.now() / (1000*60*60*4)) % moodOrder.length` over a 7-mood ordered array.
- `moodLineKey`: `home.moodLines.<mood>`
- `memories`: 5 entries, mixed kinds:
  1. quote, ts = now − 3h, key `home.mockQuotes.lisbon`
  2. milestone `tenDays`, ts = now − 1d, icon `sparkle`
  3. quote, ts = now − 2d, key `home.mockQuotes.coffee`
  4. milestone `firstLaugh`, ts = now − 5d, icon `heart`
  5. quote, ts = now − 6d, key `home.mockQuotes.book`

Newest first.

---

## 6. AuroraField extension

Current `AuroraField` accepts `currentStep, totalSteps` and resolves palette from internal `STEP_PALETTES`. Add an optional prop:

```ts
type AuroraFieldProps = {
  currentStep?: number;       // legacy, used by Auth
  totalSteps?: number;        // legacy
  palette?: [string, string, string, string]; // NEW — overrides step lookup
};
```

If `palette` is provided, use it directly with the same blob-rendering logic; ignore step props. No transitions handling change required (palette is captured by ref, same as before).

This keeps Auth's behavior identical and gives Home full control via mood.

`MoodAurora.tsx`:
```tsx
import AuroraField from '../auth/AuroraField';
import { moodPalettes } from './moodPalettes';
import type { CompanionMood } from './types';

export function MoodAurora({ mood }: { mood: CompanionMood }) {
  return <AuroraField palette={moodPalettes[mood]} />;
}
```

---

## 7. Scroll-driven hero collapse

In `Home.tsx`:

```tsx
const { scrollY } = useScroll();
const portraitScale       = useTransform(scrollY, [0, 240], [1, 0.16]);
const portraitTranslateX  = useTransform(scrollY, [0, 240], [0, -120]);
const portraitTranslateY  = useTransform(scrollY, [0, 240], [0, -180]);
const portraitBorderRadius= useTransform(scrollY, [0, 240], [32, 999]);
const heroTextOpacity     = useTransform(scrollY, [0, 120], [1, 0]);
const stickyBgOpacity     = useTransform(scrollY, [180, 240], [0, 1]);
```

`HeroPortrait` consumes these motion values via props. `position: sticky; top: 0` on the hero wrapper. Sticky glass header overlay uses `stickyBgOpacity` for `backdrop-filter` reveal.

Reduced-motion: `useReducedMotion()` gates the transforms — when reduced, hero stays full size and just fades on scroll past 200px (CSS `display: none` swap to a static collapsed header).

---

## 8. i18n

New namespace `landing.redesign.home` in `src/i18n/en.ts` and `src/i18n/ru.ts`. Keys:

- `home.greeting` — "{name}, today" / "{name}, сегодня"
- `home.openChat` — "Write to her" / "Написать ей"
- `home.memoriesTitle` — "She remembers" / "Она помнит"
- `home.moodLines.{thoughtful,warm,playful,missingYou,quiet,tender,curious}` — short italic phrases.
- `home.relativeTime.{minutesAgo,hoursAgo,daysAgo,weeksAgo,justNow}` with `{n}` placeholders.
- `home.attribution` — "you said this {relative}" / "ты сказал это {relative}".
- `home.milestones.{tenDays,firstLaugh,sharedTaste,thirtyDays,morningHello}` — title + subtitle pairs.
- `home.mockQuotes.{lisbon,coffee,book,rain,song}` — 5 quote bodies.

Existing top-level `feed.*` and `landing.redesign.auth.*` are NOT modified.

Localization invariant: NO mention of AI / алгоритм / нейросеть anywhere on this screen. The companion is referenced as "she" / "her" only.

---

## 9. Theme rules

- Dark and light themes both supported, scoped via `:global(.redesign-root[data-theme='dark'|'light'])` and `:global(:root[data-redesign-theme='dark'|'light'])`, same convention as Auth.
- Hero card glass: dark `rgba(28,18,56,0.18)` blur 40px; light `rgba(255,255,255,0.32)` blur 40px.
- Memory glass cards: dark `rgba(255,255,255,0.05)` border `rgba(255,255,255,0.12)`; light `rgba(255,255,255,0.85)` border `rgba(139,92,246,0.18)`.
- CTA "Write to her": brand gradient `#8B5CF6 → #EC4899` (existing Button variant).

CSS rule: never use shorthand `background: rgba(...)` in overrides if a `background-image` exists on the same selector; use `background-color`. (Lesson learned from Iter 7 chevron bug.)

---

## 10. Testing / verification

- `npx tsc -b` — no type errors.
- `npx vite build` — green, no new chunk regressions > 10KB unexplained.
- Manual via `http://localhost:5173/__preview/home`:
  - Light, dark, auto themes (toolbar switcher).
  - EN and RU.
  - Scroll the page: hero collapses smoothly 0→240px, sticky header resolves, no jank, no double-render of portrait.
  - Reduced-motion (OS setting) — static fallback works.
  - 5 memory cards render in order, relative timestamps make sense ("3 hours ago" / "1 day ago" / etc.).

No automated tests added in this stage (no test infra for redesign screens yet).

---

## 11. Out of scope

Explicitly deferred:

- Production routing (replacing or augmenting `/feed` with Home) — Stage 6+.
- Real backend memories: a Supabase `memories` table or RPC over `messages` to extract real chat fragments.
- Voice-note memory cards, photo memory cards, "she is reading X" status, music recommendations.
- NavShell + BottomTabBar integration around Home.
- Actual chat-fragment extraction logic (NLP / heuristics).
- Mood derivation from conversation signals (sentiment, recency, etc.).
- A/B testing different palettes per mood.
- Persistence: which memories the user has dismissed / pinned.
- Notifications connection (e.g. "new memory" badge).

These are tracked as Stage 6+ items.

---

## 12. Risks & open questions

- **Sticky collapse perf** on lower-end Android: `backdrop-filter: blur(40px)` on a sticky element + Aurora canvas underneath could thrash. Mitigation: profile after build; if needed, reduce sticky blur to 16px and skip blur entirely for `prefers-reduced-motion`.
- **Mood deterministic rotation** during preview demos: changes every 4 hours, so demos within a session look stable, but cross-day demos shift. Acceptable for preview — flag if user wants a fixed demo mood.
- **Proper-noun localization**: companion names ("Aria") are not translated. If RU users expect Cyrillic transliteration ("Аря"), flag in implementation; for now keep as-is.
- **Aurora palette switching** on mood change is not animated yet (just instant on mount in preview). Smooth crossfade between palettes is a Stage 6 polish item.
