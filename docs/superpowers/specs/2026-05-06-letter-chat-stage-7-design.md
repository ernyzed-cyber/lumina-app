# Stage 7 — Letter Chat (Companion redesign)

**Status:** design — pending user final review
**Scope:** `/__preview/chat` static-only redesign shell. No edge functions, no real Stars purchase, no Telegram verification. The production `src/pages/Chat.tsx` is not touched.
**Predecessors:** Stage 5 (Companion Home), Stage 6 (Memories timeline).
**Tone invariant:** companion = a person, not a bot. No "AI / neural / algorithm / bot" wording anywhere.

---

## 1. Concept

The chat screen is not a messenger. It is a long shared document — a page out of her diary or a letter that grew over time, with two voices written into the same paragraph stream. No bubbles, no avatars per message, no tail-marks, no read-ticks. Each reply is a paragraph; the typography (italic vs sans) and a thin mood-tinted side-rule say who spoke.

Continuity with Memories (Stage 6) is intentional: the user feels like the chat and Memories are the same flow of text — the chat is the live page being written today, Memories is everything already committed.

If this concept doesn't land in user testing, we fall back to "glass bubbles" (option 2 from brainstorm). We reserve that escape hatch.

---

## 2. Scope decisions (locked)

### In scope (Stage 7)
- Letter / poem layout (italic display for her, sans muted for you).
- StarField intensity `dim` background (reused from Memories).
- Mini CompanionOrb 88×88 px in the upper-right corner.
- Glass-pill OrbDock (reused from Stage 6).
- Open-at-bottom on mount, like Telegram (last reply + composer in focus).
- Day dividers — hairline + centered uppercase eyebrow date.
- Composer: pill-input + emoji-sheet + gift-trigger.
- Gift-as-message inline — mono-glass 64×64 circle + italic caption ("sent her a soft thing").
- Stars eyebrow `★ 1240` near the orb. Display-only, no-op tap in preview.
- Daily-limit hairline progress bar under composer + system-banner on 100/100.
- Sleep mode: visual shift only (dim typography, lunar vignette, whisper placeholder). **No system phrases in her voice.**
- Preview-only debug strip: toggles for `[awake|asleep]`, `[count: 0|90|100]`, `[lang en|ru]`, `[theme light|dark]`.

### Out of scope (Stage 7) — moved to later stages
| Item | Why deferred | Where it lands |
|---|---|---|
| Eyebrow-name → profile drawer | Profile screen doesn't exist yet | Stage 9 (Companion Profile) wires this up |
| Drawer with her photo / bio / interests / mood-history | Big enough for its own stage | Stage 9 |
| Real gift purchase + Stars-balance modal | Needs catalog screen | Stage 10 (Gifts catalog) |
| Real edge functions / watchdog / persisted reply | Preview is static-only by invariant | Stage N-merge (when Stage 7 lands in prod `Chat.tsx`) |
| Kebab menu, video calls, voice notes | Discarded entirely | Never |
| Notifications integration, Telegram verification | Cross-cutting, doesn't belong here | Future stage |

### Forever out
- Video calls.
- Voice notes.

---

## 3. Architecture

### File layout (planned)

```
src/pages-redesign/
  Chat.tsx                     ← page orchestrator
  Chat.module.css              ← layout, hero/eyebrow, footer hairline-progress, system-banner
  chat/
    Letter.tsx                 ← typographic stream of days + replies
    Letter.module.css          ← italic display her, sans muted you, day dividers, system-row
    Composer.tsx               ← pill-input + emoji + gift trigger, mode-aware placeholder
    Composer.module.css
    DayDivider.tsx             ← hairline + centered date
    DayDivider.module.css
    EmojiSheet.tsx             ← leaf-card (not modal)
    EmojiSheet.module.css
    GiftSheet.tsx              ← mock 6-gift grid, no purchase
    GiftSheet.module.css
    LimitProgress.tsx          ← hairline brand-gradient + 90/100 hint + 100/100 banner
    LimitProgress.module.css
    PreviewDebugStrip.tsx      ← toggles for sleep / count / lang / theme (dev-only)
    PreviewDebugStrip.module.css
    mockConversation.ts        ← 12–18 messages across 2 days, mood-varied, sleep-aware
    types.ts                   ← Message { id, role, text, ts, mood?, kind: 'text' | 'gift' }
    moodForId.ts               ← reused hash from Memories Timeline
```

### Reused without copying
- `StarField` with `intensity="dim"`.
- `OrbDock` (glass pill, `chat` slot already highlighted active).
- `CompanionOrb` with `size="mini"` — sized down to 88×88 px (smaller than Memories' 180 because letter is read-heavy and orb shouldn't dominate).
- `moodPalettes`, `relativeTime`, `useLanguage`.

### Routing
- `App.tsx` — lazy-imported `PreviewChat` + route `/__preview/chat`.
- `PreviewIndex.tsx` — entry stage 7 `chat`, status `ready`, lucide icon `MessageSquareDashed`, description "Letter / poem чат — без бабблов, штрих к Memories".

### What we do NOT pull in
`useAssignment`, `useStars`, `useTelegramVerified`, `useNotifications`, `DailyLimitModal`, `GiftPicker` (real), edge `chat-reply` / `chat-schedule`, watchdog, `loadMsgLimits` from prod, `bumpNightAttempts`. All of these stay in `src/pages/Chat.tsx`. Stage 7 is purely visual.

---

## 4. Typography & layout

Reuses fonts already loaded for Memories/Companion — no new font imports.

- **Display italic** = the same italic serif Memories uses for quotes (Cormorant Garamond / system serif italic; exact stack to be confirmed at planning step from existing CSS).
- **Sans body** = the same sans the Companion thought uses.

### Size hierarchy

| Element | Desktop | Mobile | Color |
|---|---|---|---|
| Eyebrow (her name + stars) | 13 px sans, letter-spacing 0.18em, uppercase | 12 px | `text-tertiary` |
| Day divider | 12 px sans uppercase + 1 px hairline | 11 px | `text-tertiary` |
| **Her reply — primary** | 22 px italic display, line-height 1.55 | 18 px | `text-primary` |
| **Her reply — long (>120 chars)** | 19 px italic, line-height 1.6 | 17 px | `text-primary` |
| **Your reply** | 16 px sans regular, line-height 1.55 | 15 px | `text-secondary` (muted) |
| Timestamp (hover/long-press only) | 11 px sans | 11 px | `text-tertiary` |
| System banner (limit) | 13 px sans | 12 px | `text-tertiary` |

The "long" rule is a single threshold, not a switch the user sees: if `message.text.length > 120`, drop her display from 22 → 19 (desktop) / 18 → 17 (mobile). Keeps long paragraphs readable.

### Differentiating speakers — no bubbles

ASCII layout reference:

```
                                          [eyebrow: ALEXA · ★ 1240]
                                                              [orb]

  TUESDAY · MAY 5
  ─────────────

▌ I dreamt of the rain again. It tasted
▌ like the coffee from that small place
▌ in Lisbon — do you remember?

                                       Yeah. The one near the bookshop.

▌ That one. I think part of me is still
▌ sitting at that window.

    ·

                                       Maybe we go back someday.

▌ Maybe.
```

- **`▌`** — left side-rule for her replies. 3 px wide, `border-radius: 2px`, mood-tinted via `moodForId(message.id)` (same hash as Memories Timeline). It is an accent, not a quote-block, not a bubble.
- **Your replies** — `text-align: right`, `max-width: 60%`, no rule. Sans 16 px at opacity 0.78. Sense: "you write into her document."
- **Spacing rhythm:**
  - Between speaker turns (her → you → her): `1.25rem`.
  - Between consecutive same-speaker replies: `0.5rem`.
- **Centered `·`** — only when the gap between two messages is greater than ~1 hour. Literary device, used sparingly. NOT every message.

### Day divider

```
            TUESDAY · MAY 5
  ─────────────────────────────────
```

- Hairline `linear-gradient(90deg, transparent, var(--border-subtle), transparent)` 1 px tall.
- Centered eyebrow date: weekday + month + day, uppercase, letter-spacing 0.32em.
- Margin block: `2.5rem` top, `1.5rem` bottom.
- Locale-aware via `toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric' })`.

### Gift-as-message

```
                                       [♡]
                                       sent her a soft thing

▌ I'll keep it close.
```

- Container 64 × 64 px mono-glass disk: `rgba(255,255,255,0.06)` background + 1 px hairline + `backdrop-filter: blur(8px)` + lucide icon stroked with brand-gradient (CSS mask + linear-gradient on the SVG).
- Italic caption beneath, sans-italic 14 px, opacity 0.7. Examples: `sent her a soft thing` / `kept your gift close`.
- Right-aligned if you sent it. Left-aligned + her side-rule if she "kept" it (introduced fully in Stage 10).
- 6 mock gift icons: `Heart`, `Flower2`, `Coffee`, `Sparkles`, `Moon`, `Gem` (lucide). Names mocked in i18n.

### Timestamp

- Hidden by default — preserves "out of time" feel.
- Appears on:
  - Desktop hover over a message — small `14:32` to the right (her) / left (you).
  - Mobile long-press — mini tooltip above the message.
- Format `HH:mm` 24h, locale-aware.

### System banner (100/100 reached)

```
            ─────────────────────────────────
              you've reached today's limit
                  resets in 7h 23m
            ─────────────────────────────────
```

- Full content-width, centered, sans 13 px `text-tertiary`. Hairlines top and bottom.
- **Replaces the composer row** (composer is removed from DOM, banner takes its place).
- Reset timer ticks every 60 s.
- Tone: dry UI message, not in her voice. Keeps her voice untouched by system text.

### Hairline progress (composer footer, count < 100)

```
    [composer pill input............]
    ▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱   ← 50%
```

- 1 px tall, 100% width, brand-gradient `#8B5CF6 → #EC4899`.
- `transform: scaleX(count / 100)` with `transform-origin: left`. CSS-only, no JS reflow.
- On `count >= 90`, a small `text-tertiary` hint appears above the line: `ten breaths left today` (en) / `десять вдохов до конца дня` (ru). This is the **only** "poetic" warning, and it is positioned above the progress as a UI label — never inserted into the letter as her voice.
- On `count >= 100`, line is full and composer-row swaps for the system-banner above.

---

## 5. Open-at-bottom behaviour

When the user navigates to `/__preview/chat`, the layout scroll-snaps the **last her-reply + composer** into view in the first frame. Past replies are above and reachable via scroll-up. Decision rationale: `/__preview/chat` should respect the basic chat affordance (just-back-and-respond), the diary feel comes from typography and rhythm, not from where the document opens.

Implementation note: on mount, `letterRef.current.scrollTop = letterRef.current.scrollHeight` synchronously inside a `useLayoutEffect`. No animation on initial scroll.

---

## 6. Sleep mode (visual shift only)

When `isAsleep === true`:

- Wrap the whole page in `data-sleep="true"`.
- Typography opacity drops from 1.0 → 0.55 (CSS variable `--letter-opacity`).
- StarField stays `intensity="dim"` but a CSS overlay adds a soft cool vignette (radial gradient from edges, `rgba(40,30,80,0.4)`).
- Composer placeholder swaps from default to the whisper variant: `whisper into the night...` (en) / `шепни в ночь…` (ru).
- Composer remains functional — input still accepts text, send still works in preview. The 3-attempts-per-night quota is **not visualized** in Stage 7. We may add it in Stage 7.5 or punt to prod-merge.
- Mini orb halo cools — switch to a desaturated palette (driven via existing `mood` prop on Companion or a new `state="sleeping"` if cleaner). To be picked at planning step.

No system phrase appears in her voice during sleep. The only textual change is the placeholder in the input (a UI string, not a reply).

---

## 7. Daily-limit UX

Already covered in §4 (Hairline progress + 100/100 banner). Summary:

| Count | UI |
|---|---|
| 0–89 | Hairline grows silently. |
| 90–99 | Hairline + tertiary hint above: `ten breaths left today`. |
| 100 | Hairline full. Composer row swaps for system-banner with reset timer. |

No modal. No CTA. No "buy Stars". Stars purchase will live in Stage 10's `/gifts` and possibly a new `/stars` screen — out of Stage 7.

---

## 8. Stars eyebrow

- Position: top-right, paired with `[orb]` in the eyebrow row.
- Format: `★ 1240` — lucide `Sparkle` icon (or `Star`, decide at planning) + tabular-nums number.
- Color: `text-tertiary`, hover-brightens to `text-secondary`.
- Tap: no-op in preview (calls `() => {}` with a TODO comment for Stage 10/11 wiring).
- Number is mocked, hard-coded `1240`. No state.

---

## 9. Mock conversation (`mockConversation.ts`)

Single exported function `getMockConversation(now: Date, opts?: { messageCount?: number; isAsleep?: boolean })` returning an array of 12–18 messages spread across two days (yesterday + today). Mix of:

- ~10 her text replies (italic display target),
- ~5 user text replies,
- 1 gift-as-message from user,
- 1 her reply that "keeps" the gift,
- 2–3 multi-paragraph long replies (>120 chars) to verify the long-rule.

`Message` shape:

```ts
type Mood = 'soft' | 'warm' | 'cool' | 'fire' | 'dusk' | 'mist' | 'storm';

type Message =
  | { id: string; role: 'her' | 'you'; kind: 'text'; ts: Date; textKey: string; mood?: Mood }
  | { id: string; role: 'her' | 'you'; kind: 'gift'; ts: Date; giftKey: string; captionKey: string };
```

`textKey` / `giftKey` / `captionKey` reference i18n keys under `landing.redesign.chat.mock.*`. No raw strings in the mock module.

---

## 10. i18n namespace (`landing.redesign.chat.*`)

To add to both `src/i18n/en.ts` and `src/i18n/ru.ts`:

- `eyebrow.name` (companion display name, fallback)
- `composer.placeholder.default` / `placeholder.whisper` / `placeholder.atLimit`
- `composer.send` (aria)
- `composer.gift` (aria)
- `composer.emoji` (aria)
- `limit.hint` (`ten breaths left today` / Russian equivalent)
- `limit.banner.title` (`you've reached today's limit`)
- `limit.banner.resetIn` (with `{time}` interpolation)
- `gift.sent` (`sent her a soft thing`)
- `gift.kept` (`kept your gift close`)
- `gift.names.{heart|flower|coffee|sparkles|moon|gem}` (6 mock names)
- `mock.conversation.{m01..m18}` — actual mock reply texts. Two voices, poetic register, no AI/tech vocabulary.
- `daysAgo` / weekday names will reuse `toLocaleDateString` — no extra i18n keys.

Tone for mock conversation: matches Stage 5 thoughts and Stage 6 quotes — literal poetic, she/her voice, present-tense, no metaphors-of-AI. Russian variant should feel as natural as English; if a phrase doesn't translate cleanly, rewrite the EN version too rather than producing a stilted RU.

---

## 11. Preview debug strip

Visible only inside `/__preview/chat`. Position: fixed top-left, glass pill, small.

Toggles (state lives in component, no persistence):

- **Awake / Asleep** — flips `isAsleep` prop driving §6.
- **Count 0 / 90 / 100** — picks a fixed daily count, drives §4 footer state.
- **Lang en / ru** — calls `setLang` from `useLanguage`.
- **Theme light / dark** — flips `data-theme` on `.redesign-root` (same mechanism as Stage 5/6).

Strip is a separate component `PreviewDebugStrip.tsx` with its own CSS module. Excluded from any merge to prod by being only mounted under `/__preview/*` route.

---

## 12. Performance budget

- Letter rendering: plain DOM. ~20 messages on screen at once (mock max 18). No virtualization needed at this scale.
- StarField: reused `intensity="dim"` — same layer count as Memories (3 star layers + 2 nebulas + vignette).
- Backdrop blur usage:
  - OrbDock: `blur(16px) saturate(1.2)` (already exists).
  - Gift disk: `blur(8px)` per disk × max ~2 visible at once = fine.
  - Mini orb: same as Stage 6 mini.
- No new framer-motion usages beyond what Stage 5/6 already pull in (height-auto for emoji/gift sheet).
- `prefers-reduced-motion` honored: orb breathing already respects it via Companion logic; sheet expand collapses to opacity-only; letter has no motion.

---

## 13. Accessibility notes

- Letter container: `role="log"`, `aria-live="polite"` (announces new messages but doesn't interrupt).
- Each message: visible text only (no aria-hidden tricks). Speaker is conveyed via prefix in screen-reader text — append a visually-hidden `<span>` like `She: …` / `You: …` before each message.
- Day divider: `<div role="separator" aria-label="Tuesday May 5">`.
- Gift-as-message: full text alternative — `aria-label="You sent her a soft thing"` on the disk container.
- System banner: `role="status"` so it's announced when limit hits.
- Composer: textarea (auto-resize), proper labels for emoji + gift + send buttons.
- Stars eyebrow: announced as "1240 stars". Tab-stop preserved even though no-op (so future Stage 10 wiring needs no markup change).
- Preview debug strip: not in tab-order from main page (use `tabindex="0"` only on internals when focused), aria-label "Preview debug controls".

---

## 14. Verification at end of Stage 7

- `npx tsc -b` green.
- `npx vite build` green.
- Manual QA matrix on `/__preview/chat`:
  - Light + dark theme.
  - EN + RU.
  - Mobile widths 320 / 360 / 414 / 520.
  - All four debug-strip toggle combinations exercised.
  - Hover/long-press timestamps visible.
  - Day divider locale formatting correct in both languages.
  - Hairline progress at 0/90/100 visually distinct.
  - Sleep mode dims letter and swaps placeholder.
  - Mock conversation includes a long reply, a gift-as-message, and a multi-day span.

---

## 15. What this design intentionally does NOT promise

- **It does not decide font names.** "Display italic" = whatever Memories already uses. The exact CSS stack will be lifted at planning time from `MemoryCardV2.module.css`.
- **It does not decide exact gift icons or names.** 6 lucide icons, names mocked. Final palette of mock gifts is editorial, locked at planning.
- **It does not decide colour tokens.** Reuses existing `--text-primary`, `--text-secondary`, `--text-tertiary`, `--border-subtle`, brand-gradient. No new tokens introduced.
- **It does not decide animation curves for sheet expand.** Will reuse the framer-motion easing already used in Memories accordion.
- **It does not promise night-attempts UI** (the 3-strikes counter from prod) — explicitly deferred or dropped.

Everything above is fixed unless this document is amended.
