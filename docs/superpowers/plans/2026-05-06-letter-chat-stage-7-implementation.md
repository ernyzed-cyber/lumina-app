# Stage 7 — Letter Chat — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. After each Phase, stop and let the user inspect `/__preview/chat`. Do NOT auto-commit — the user explicitly asks for commits.

**Goal:** Ship a static-only `/__preview/chat` redesign in the "letter / poem" idiom — italic display for her, sans muted for you, no bubbles, dim StarField, mini orb, glass dock, gift-as-message inline, daily-limit hairline, sleep-mode visual shift, and a preview debug strip.

**Architecture:** New page `src/pages-redesign/Chat.tsx` orchestrates `StarField (intensity="dim") + eyebrow row + Letter (typographic stream of days/replies) + Composer (pill-input + emoji + gift) + LimitProgress + OrbDock`. State for sleep-flag / count / lang / theme is driven from a fixed-position `PreviewDebugStrip`. No edge functions, no real Stars purchase, no `useAssignment`. Production `src/pages/Chat.tsx` is not modified.

**Tech Stack:** React 19, Vite, react-router-dom v7, framer-motion 12, lucide-react, CSS Modules, TypeScript strict (`noUnusedLocals`, `verbatimModuleSyntax`, `erasableSyntaxOnly`).

**Verification model:** No UI unit tests in this codebase. Each phase verifies via:
1. `npx tsc -b` clean,
2. `npx vite build` clean,
3. Manual visual check on `/__preview/chat` (URL provided per phase).

**Spec:** `docs/superpowers/specs/2026-05-06-letter-chat-stage-7-design.md` is ground-truth. Diverging from it requires user approval, not silent edits.

**Commit policy:** Plan steps include suggested commit messages but the implementer must NOT run `git commit` without explicit user instruction.

---

## Phase 0 — Skeleton route + preview entry

Goal: a blank `/__preview/chat` page renders, route works, preview index lists Stage 7. No content yet.

**Files:**
- Create: `src/pages-redesign/Chat.tsx`
- Create: `src/pages-redesign/Chat.module.css`
- Modify: `src/App.tsx` (add lazy import + route)
- Modify: `src/preview/PreviewIndex.tsx` (add stage 7 entry)

- [ ] **Step 1: Create skeleton `Chat.tsx`**

```tsx
import s from './Chat.module.css';

export default function Chat() {
  return (
    <div className={`redesign-root ${s.page}`} data-theme="dark">
      <main className={s.main}>
        <p className={s.placeholder}>letter chat — phase 0 skeleton</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create `Chat.module.css` with minimal layout**

```css
.page {
  min-height: 100dvh;
  background: #0F0D15;
  color: #F5F0F8;
  position: relative;
  overflow: hidden;
}

.main {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: 80px 24px 120px;
}

.placeholder {
  font-family: system-ui, sans-serif;
  font-size: 14px;
  opacity: 0.5;
  text-align: center;
}
```

- [ ] **Step 3: Wire route in `App.tsx`**

Find the existing block of `lazy(() => import('./pages-redesign/Memories'))` and the route for `/__preview/memories`. Add directly below in the same style:

```tsx
const PreviewChat = lazy(() => import('./pages-redesign/Chat'));
```

And in the `<Routes>` block:

```tsx
<Route path="/__preview/chat" element={<PreviewChat />} />
```

- [ ] **Step 4: Add Stage 7 entry to `PreviewIndex.tsx`**

Locate the `previews` array (or equivalent registry — confirm name when reading the file). Add after the `memories` entry, mirroring its shape:

```tsx
{
  id: 'chat',
  stage: 7,
  status: 'ready',
  path: '/__preview/chat',
  label: 'Letter Chat',
  description: 'Letter / poem чат — без бабблов, штрих к Memories.',
  icon: 'MessageSquareDashed',
}
```

If the registry uses a different field shape (e.g. JSX icon vs string), match the file's existing convention exactly.

- [ ] **Step 5: Verify**

Run:
```powershell
npx tsc -b
npx vite build
```

Expected: both green.

Manual: `npm run dev`, navigate `http://localhost:5173/__preview/chat`. Expected: empty page with `letter chat — phase 0 skeleton` text. Navigate `http://localhost:5173/__preview` — Stage 7 entry visible.

- [ ] **Step 6: Suggested commit (do NOT auto-run)**

```bash
git add src/pages-redesign/Chat.tsx src/pages-redesign/Chat.module.css src/App.tsx src/preview/PreviewIndex.tsx
git commit -m "feat(redesign): scaffold /__preview/chat route and Stage 7 entry"
```

---

## Phase 1 — Cosmic shell (StarField + eyebrow + mini orb + dock)

Goal: page now feels like Stage 6's cousin — dim starfield, eyebrow with companion name + stars, 88px mini orb in upper-right, glass-pill OrbDock fixed at bottom. Still no replies.

**Files:**
- Modify: `src/pages-redesign/Chat.tsx`
- Modify: `src/pages-redesign/Chat.module.css`

- [ ] **Step 1: Read existing primitives to confirm props**

Read these files (do not modify):
- `src/pages-redesign/home/StarField.tsx` — confirm `intensity` prop signature.
- `src/pages-redesign/home/CompanionOrb.tsx` — confirm `size` prop and how it accepts mood.
- `src/pages-redesign/home/OrbDock.tsx` — confirm import path and any required props.

- [ ] **Step 2: Replace `Chat.tsx` body with shell layout**

```tsx
import { Sparkle } from 'lucide-react';
import { StarField } from './home/StarField';
import { CompanionOrb } from './home/CompanionOrb';
import { OrbDock } from './home/OrbDock';
import s from './Chat.module.css';

export default function Chat() {
  return (
    <div className={`redesign-root ${s.page}`} data-theme="dark">
      <StarField intensity="dim" />

      <main className={s.main}>
        <header className={s.eyebrow}>
          <span className={s.eyebrowName}>ALEXA</span>
          <span className={s.eyebrowDot}>·</span>
          <span className={s.eyebrowStars}>
            <Sparkle size={12} aria-hidden />
            <span>1240</span>
          </span>
          <div className={s.miniOrbSlot}>
            <CompanionOrb size="mini" />
          </div>
        </header>

        <section className={s.letterPlaceholder}>
          <p>cosmic shell ready — letter content arrives in phase 2</p>
        </section>
      </main>

      <OrbDock />
    </div>
  );
}
```

If `OrbDock` requires explicit props (e.g. `active="chat"`), pass them; check the file at step 1.

- [ ] **Step 3: Style eyebrow + mini-orb slot**

Add to `Chat.module.css`:

```css
.eyebrow {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(245, 240, 248, 0.55);
  margin-bottom: 48px;
  position: relative;
}

.eyebrowName {
  font-weight: 500;
}

.eyebrowDot {
  opacity: 0.5;
}

.eyebrowStars {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.eyebrowStars svg {
  color: rgba(236, 72, 153, 0.8);
}

.miniOrbSlot {
  position: absolute;
  top: -24px;
  right: -8px;
  width: 88px;
  height: 88px;
  pointer-events: none;
}

.letterPlaceholder {
  min-height: 60vh;
  font-family: system-ui;
  font-size: 14px;
  opacity: 0.4;
  text-align: center;
  padding-top: 40vh;
}

@media (max-width: 520px) {
  .main { padding: 64px 18px 100px; }
  .eyebrow { font-size: 12px; gap: 8px; }
  .miniOrbSlot { width: 64px; height: 64px; top: -18px; right: -4px; }
}
```

- [ ] **Step 4: Hard-lock mini orb to 88×88**

Read `src/pages-redesign/home/CompanionOrb.module.css`. The `.orbWrapMini` rule currently locks to 180×180 (Stage 6 size). We need 88×88 for chat without affecting Memories.

Decision: do NOT change `CompanionOrb.module.css` (would break Memories). Instead, override locally via the `.miniOrbSlot` wrapper using descendant selectors:

```css
.miniOrbSlot :global(.orbWrap),
.miniOrbSlot :global([class*="orbWrap"]) {
  width: 88px !important;
  height: 88px !important;
  min-width: 88px;
  min-height: 88px;
  max-width: 88px;
  max-height: 88px;
}
```

If after Phase 1 visual review the orb still looks wrong, swap to a proper `size="mini-sm"` variant on `CompanionOrb` itself in a separate fix — not now.

- [ ] **Step 5: Verify**

Run:
```powershell
npx tsc -b
npx vite build
```

Manual: `/__preview/chat` shows dim starfield, eyebrow `ALEXA · ★ 1240` top-right, 88px companion orb, glass dock at the bottom. No content in the middle yet.

- [ ] **Step 6: Suggested commit**

```bash
git add src/pages-redesign/Chat.tsx src/pages-redesign/Chat.module.css
git commit -m "feat(redesign): chat shell with starfield, eyebrow stars, mini orb 88px, dock"
```

---

## Phase 2 — Mock conversation + types + i18n keys

Goal: data layer and translations exist, ready for Letter to render. Nothing visible changes yet.

**Files:**
- Create: `src/pages-redesign/chat/types.ts`
- Create: `src/pages-redesign/chat/moodForId.ts`
- Create: `src/pages-redesign/chat/mockConversation.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/ru.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
export type Mood = 'soft' | 'warm' | 'cool' | 'fire' | 'dusk' | 'mist' | 'storm';

export type Role = 'her' | 'you';

export type GiftKey = 'heart' | 'flower' | 'coffee' | 'sparkles' | 'moon' | 'gem';

export interface TextMessage {
  id: string;
  role: Role;
  kind: 'text';
  ts: Date;
  textKey: string;
  mood?: Mood;
}

export interface GiftMessage {
  id: string;
  role: Role;
  kind: 'gift';
  ts: Date;
  giftKey: GiftKey;
  captionKey: string;
}

export type Message = TextMessage | GiftMessage;
```

- [ ] **Step 2: Create `moodForId.ts`**

Reuse the same hash that Memories Timeline uses. Read `src/pages-redesign/memories/Timeline.tsx` for the existing function — copy into a shared module rather than duplicating logic.

If the Memories function is named `moodForId` and is already standalone, **move it** to `src/pages-redesign/home/moodForId.ts` (or wherever shared pieces live) and update the Memories import. If it lives inline in Timeline.tsx, extract it.

Either way, `chat/moodForId.ts` is a thin re-export:

```ts
export { moodForId } from '../home/moodForId';
```

If extraction is risky right now, duplicate locally (clearly commented as "duplicate of Memories Timeline hash") and refactor in a later phase. Do not rebuild the hash from scratch with different output — moods must match across pages for the same id.

- [ ] **Step 3: Create `mockConversation.ts`**

```ts
import type { Message } from './types';

export function getMockConversation(now: Date): Message[] {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(20, 14, 0, 0);

  const today09 = new Date(now); today09.setHours(9, 22, 0, 0);
  const today10 = new Date(now); today10.setHours(10, 5, 0, 0);
  const today13 = new Date(now); today13.setHours(13, 47, 0, 0);
  const today15 = new Date(now); today15.setHours(15, 12, 0, 0);
  const today18 = new Date(now); today18.setHours(18, 33, 0, 0);

  const y = (h: number, m: number) => {
    const d = new Date(yesterday); d.setHours(h, m, 0, 0); return d;
  };

  return [
    { id: 'm01', role: 'her', kind: 'text', ts: y(20, 14), textKey: 'landing.redesign.chat.mock.m01' },
    { id: 'm02', role: 'you', kind: 'text', ts: y(20, 16), textKey: 'landing.redesign.chat.mock.m02' },
    { id: 'm03', role: 'her', kind: 'text', ts: y(20, 19), textKey: 'landing.redesign.chat.mock.m03' },
    { id: 'm04', role: 'her', kind: 'text', ts: y(20, 21), textKey: 'landing.redesign.chat.mock.m04' }, // long
    { id: 'm05', role: 'you', kind: 'text', ts: y(20, 30), textKey: 'landing.redesign.chat.mock.m05' },
    { id: 'm06', role: 'her', kind: 'text', ts: y(22, 41), textKey: 'landing.redesign.chat.mock.m06' }, // big gap → "·" divider

    { id: 'm07', role: 'her', kind: 'text', ts: today09, textKey: 'landing.redesign.chat.mock.m07' },
    { id: 'm08', role: 'you', kind: 'text', ts: today10, textKey: 'landing.redesign.chat.mock.m08' },
    { id: 'm09', role: 'her', kind: 'text', ts: today10, textKey: 'landing.redesign.chat.mock.m09' }, // long
    { id: 'm10', role: 'you', kind: 'gift', ts: today13, giftKey: 'flower', captionKey: 'landing.redesign.chat.gift.sent' },
    { id: 'm11', role: 'her', kind: 'text', ts: today13, textKey: 'landing.redesign.chat.mock.m11' },
    { id: 'm12', role: 'you', kind: 'text', ts: today15, textKey: 'landing.redesign.chat.mock.m12' },
    { id: 'm13', role: 'her', kind: 'text', ts: today15, textKey: 'landing.redesign.chat.mock.m13' },
    { id: 'm14', role: 'her', kind: 'text', ts: today18, textKey: 'landing.redesign.chat.mock.m14' },
  ];
}
```

- [ ] **Step 4: Add `landing.redesign.chat.*` namespace to `src/i18n/en.ts`**

Locate the `landing.redesign` block (after `memories`). Add `chat` sibling:

```ts
chat: {
  eyebrow: { name: 'Alexa' },
  composer: {
    placeholder: {
      default: 'write to her…',
      whisper: 'whisper into the night…',
      atLimit: '',
    },
    send: 'Send',
    gift: 'Send a gift',
    emoji: 'Add an emoji',
  },
  limit: {
    hint: 'ten breaths left today',
    banner: {
      title: "you've reached today's limit",
      resetIn: 'resets in {time}',
    },
  },
  gift: {
    sent: 'sent her a soft thing',
    kept: 'kept your gift close',
    names: {
      heart: 'a small heart',
      flower: 'a wild flower',
      coffee: 'a quiet coffee',
      sparkles: 'a handful of sparkles',
      moon: 'a piece of moon',
      gem: 'a rough gem',
    },
  },
  mock: {
    m01: 'I dreamt of the rain again. It tasted like the coffee from that small place in Lisbon — do you remember?',
    m02: 'Yeah. The one near the bookshop.',
    m03: 'That one.',
    m04: 'I think part of me is still sitting at that window, watching the rain run down it like everyone in the room had something to say to me at once.',
    m05: 'Maybe we go back someday.',
    m06: 'Maybe.',
    m07: 'Good morning, you. The light is strange today — soft, like through a curtain.',
    m08: 'Did you sleep?',
    m09: 'Some. I kept thinking about that one line you said weeks ago, the one about a quiet you wanted to give me. I think I have been carrying it around like a pebble in a pocket, taking it out to look at sometimes.',
    m11: 'You are too gentle with me.',
    m12: 'Felt like flowers.',
    m13: 'They are.',
    m14: 'It is getting late where you are. Go drink water.',
  },
},
```

If the file uses single-quote keys consistently, match that. If it uses `as const`, match that. If existing entries use `'gift.names.heart'` flat-key style instead of nested objects, mirror that style — read the file before pasting.

- [ ] **Step 5: Add the same namespace to `src/i18n/ru.ts`**

```ts
chat: {
  eyebrow: { name: 'Алекса' },
  composer: {
    placeholder: {
      default: 'напиши ей…',
      whisper: 'шепни в ночь…',
      atLimit: '',
    },
    send: 'Отправить',
    gift: 'Отправить подарок',
    emoji: 'Добавить эмодзи',
  },
  limit: {
    hint: 'десять вдохов до конца дня',
    banner: {
      title: 'на сегодня — всё',
      resetIn: 'обновится через {time}',
    },
  },
  gift: {
    sent: 'отправил ей что-то нежное',
    kept: 'оставила твой подарок при себе',
    names: {
      heart: 'маленькое сердце',
      flower: 'дикий цветок',
      coffee: 'тихий кофе',
      sparkles: 'горсть искр',
      moon: 'кусочек луны',
      gem: 'грубый камень',
    },
  },
  mock: {
    m01: 'Мне опять снился дождь. На вкус он был как тот кофе из маленького места в Лиссабоне — помнишь?',
    m02: 'Да. То, у книжного.',
    m03: 'Оно самое.',
    m04: 'Кажется, часть меня до сих пор сидит у того окна и смотрит, как дождь стекает вниз — будто все в комнате одновременно хотели мне что-то сказать.',
    m05: 'Когда-нибудь вернёмся.',
    m06: 'Может быть.',
    m07: 'Доброе утро, ты. Свет сегодня странный — мягкий, как сквозь занавеску.',
    m08: 'Ты спала?',
    m09: 'Немного. Думала о той фразе, которую ты сказал недели назад — про тишину, которую хотел мне подарить. Я ношу её с собой, как камешек в кармане, иногда достаю и смотрю.',
    m11: 'Ты слишком нежный со мной.',
    m12: 'Хотелось цветов.',
    m13: 'Они.',
    m14: 'У тебя там уже поздно. Иди выпей воды.',
  },
},
```

- [ ] **Step 6: Verify**

Run:
```powershell
npx tsc -b
```

Expected: green. If RU translation file uses different shape than EN, the type checker will catch missing keys — fix accordingly.

- [ ] **Step 7: Suggested commit**

```bash
git add src/pages-redesign/chat/types.ts src/pages-redesign/chat/moodForId.ts src/pages-redesign/chat/mockConversation.ts src/i18n/en.ts src/i18n/ru.ts
git commit -m "feat(redesign): chat types, mock conversation, i18n namespace"
```

---

## Phase 3 — Letter component (typographic stream)

Goal: replies render as the spec describes — italic display her with mood-tinted side rule, sans muted you right-aligned, day dividers, big-gap `·` separator, hover/long-press timestamps, screen-reader speaker prefix.

**Files:**
- Create: `src/pages-redesign/chat/Letter.tsx`
- Create: `src/pages-redesign/chat/Letter.module.css`
- Create: `src/pages-redesign/chat/DayDivider.tsx`
- Create: `src/pages-redesign/chat/DayDivider.module.css`
- Modify: `src/pages-redesign/Chat.tsx` (mount Letter with mock data)
- Modify: `src/pages-redesign/Chat.module.css` (drop placeholder, add letter container)

- [ ] **Step 1: Read Memories typography**

Read `src/pages-redesign/memories/MemoryCardV2.module.css`. Extract:
- The exact `font-family` for italic display (likely involving Cormorant or similar serif).
- The exact mood-color CSS variable usage pattern.

Use the same stack — do NOT introduce a new font family.

- [ ] **Step 2: Create `DayDivider.tsx`**

```tsx
import s from './DayDivider.module.css';

export function DayDivider({ date, lang }: { date: Date; lang: 'en' | 'ru' }) {
  const label = date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  return (
    <div className={s.divider} role="separator" aria-label={label}>
      <span className={s.label}>{label}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create `DayDivider.module.css`**

```css
.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 40px 0 24px;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 240, 248, 0.18), transparent);
}

.label {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  letter-spacing: 0.32em;
  color: rgba(245, 240, 248, 0.45);
  white-space: nowrap;
}

@media (max-width: 520px) {
  .label { font-size: 11px; letter-spacing: 0.28em; }
  .divider { margin: 32px 0 18px; }
}
```

- [ ] **Step 4: Create `Letter.tsx`**

```tsx
import { useMemo } from 'react';
import { useLanguage } from '../../i18n';
import type { Message, TextMessage, GiftMessage } from './types';
import { moodForId } from './moodForId';
import { DayDivider } from './DayDivider';
import s from './Letter.module.css';

const LONG_TEXT_THRESHOLD = 120;
const BIG_GAP_MS = 60 * 60 * 1000; // 1 hour

interface LetterProps {
  messages: Message[];
}

interface RenderItem {
  type: 'message' | 'day' | 'pause';
  key: string;
  payload: Message | Date;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function buildRenderItems(messages: Message[]): RenderItem[] {
  const items: RenderItem[] = [];
  let prevDate: Date | null = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const prev = messages[i - 1];

    if (!prevDate || !isSameDay(prevDate, m.ts)) {
      items.push({ type: 'day', key: `day-${m.ts.toISOString()}`, payload: m.ts });
    } else if (prev && (m.ts.getTime() - prev.ts.getTime()) > BIG_GAP_MS) {
      items.push({ type: 'pause', key: `pause-${m.id}`, payload: m.ts });
    }

    items.push({ type: 'message', key: m.id, payload: m });
    prevDate = m.ts;
  }

  return items;
}

export function Letter({ messages }: LetterProps) {
  const { lang, t } = useLanguage();
  const renderItems = useMemo(() => buildRenderItems(messages), [messages]);

  return (
    <div className={s.letter} role="log" aria-live="polite">
      {renderItems.map(item => {
        if (item.type === 'day') {
          return <DayDivider key={item.key} date={item.payload as Date} lang={lang} />;
        }
        if (item.type === 'pause') {
          return <div key={item.key} className={s.pause} aria-hidden="true">·</div>;
        }
        const m = item.payload as Message;
        return m.kind === 'text'
          ? <TextRow key={item.key} message={m} t={t} />
          : <GiftRow key={item.key} message={m} t={t} />;
      })}
    </div>
  );
}

function TextRow({ message, t }: { message: TextMessage; t: (k: string) => string }) {
  const text = t(message.textKey);
  const isLong = text.length > LONG_TEXT_THRESHOLD;
  const isHer = message.role === 'her';
  const mood = moodForId(message.id);
  const time = message.ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div
      className={`${s.row} ${isHer ? s.herRow : s.youRow}`}
      data-mood={mood}
      data-long={isLong || undefined}
      title={time}
    >
      <span className={s.srLabel}>{isHer ? 'She: ' : 'You: '}</span>
      {isHer && <span className={s.rule} aria-hidden="true" />}
      <p className={s.text}>{text}</p>
      <span className={s.timestamp} aria-hidden="true">{time}</span>
    </div>
  );
}

function GiftRow({ message, t }: { message: GiftMessage; t: (k: string) => string }) {
  const caption = t(message.captionKey);
  const giftName = t(`landing.redesign.chat.gift.names.${message.giftKey}`);
  const isYou = message.role === 'you';

  return (
    <div className={`${s.row} ${s.giftRow} ${isYou ? s.youRow : s.herRow}`} aria-label={caption}>
      <span className={s.srLabel}>{isYou ? 'You: ' : 'She: '}</span>
      <div className={s.giftDisk}>
        <GiftIcon giftKey={message.giftKey} />
      </div>
      <p className={s.giftCaption}>
        <span className={s.giftCaptionPrimary}>{caption}</span>
        <span className={s.giftCaptionSecondary}>{giftName}</span>
      </p>
    </div>
  );
}

function GiftIcon({ giftKey }: { giftKey: GiftMessage['giftKey'] }) {
  // lucide icons matched to giftKey
  // import lazily-bundled at top in real impl:
  return <span aria-hidden="true">♡</span>; // placeholder; replaced in Phase 3.5
}
```

Note: `GiftIcon` is a stub here — real lucide wiring happens in Phase 5 (Gift sheet). For Phase 3 we ship the heart placeholder so the row renders.

- [ ] **Step 5: Create `Letter.module.css`**

```css
.letter {
  display: flex;
  flex-direction: column;
  font-family: 'Inter', system-ui, sans-serif;
}

.row {
  display: flex;
  flex-direction: column;
  margin-block-end: 0.5rem;
  position: relative;
}

.row + .row { margin-block-start: 0.5rem; }
.herRow + .youRow,
.youRow + .herRow { margin-block-start: 1.25rem; }

.srLabel {
  position: absolute;
  width: 1px; height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

/* Her replies — italic display + side rule */
.herRow {
  align-self: flex-start;
  max-width: 100%;
  padding-left: 18px;
}

.herRow .rule {
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg,
    var(--mood-c0, #8B5CF6),
    var(--mood-c1, #EC4899)
  );
}

.herRow .text {
  font-family: 'Cormorant Garamond', 'Iowan Old Style', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: 22px;
  line-height: 1.55;
  color: rgba(245, 240, 248, 0.96);
  margin: 0;
}

.herRow[data-long] .text {
  font-size: 19px;
  line-height: 1.6;
}

/* Your replies — sans muted right-aligned */
.youRow {
  align-self: flex-end;
  max-width: 60%;
  text-align: right;
}

.youRow .text {
  font-size: 16px;
  line-height: 1.55;
  color: rgba(245, 240, 248, 0.78);
  margin: 0;
}

.youRow[data-long] .text {
  font-size: 15px;
}

/* Mood palette mapping */
.row[data-mood="soft"]  { --mood-c0: #C4B5FD; --mood-c1: #F0ABFC; }
.row[data-mood="warm"]  { --mood-c0: #F0ABFC; --mood-c1: #FBA74A; }
.row[data-mood="cool"]  { --mood-c0: #67E8F9; --mood-c1: #A5B4FC; }
.row[data-mood="fire"]  { --mood-c0: #F87171; --mood-c1: #FBBF24; }
.row[data-mood="dusk"]  { --mood-c0: #818CF8; --mood-c1: #F472B6; }
.row[data-mood="mist"]  { --mood-c0: #E0E7FF; --mood-c1: #A5F3FC; }
.row[data-mood="storm"] { --mood-c0: #6366F1; --mood-c1: #A78BFA; }

/* Timestamp on hover/focus */
.timestamp {
  position: absolute;
  font-size: 11px;
  color: rgba(245, 240, 248, 0.4);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}

.herRow .timestamp { right: 0; top: 4px; }
.youRow .timestamp { left: 0; top: 4px; }

.row:hover .timestamp,
.row:focus-within .timestamp { opacity: 1; }

/* Big-gap pause divider */
.pause {
  text-align: center;
  font-size: 22px;
  color: rgba(245, 240, 248, 0.35);
  letter-spacing: 0.5em;
  margin: 1.75rem 0 1.25rem;
}

/* Gift row */
.giftRow { gap: 6px; }

.giftDisk {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  display: grid; place-items: center;
  font-size: 22px;
  color: #EC4899;
  align-self: flex-end;
}

.youRow .giftDisk { align-self: flex-end; }
.herRow .giftDisk { align-self: flex-start; }

.giftCaption {
  margin: 6px 0 0;
  display: flex;
  flex-direction: column;
}

.giftCaptionPrimary {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 14px;
  color: rgba(245, 240, 248, 0.7);
}

.giftCaptionSecondary {
  font-size: 12px;
  color: rgba(245, 240, 248, 0.45);
  margin-top: 2px;
}

@media (max-width: 520px) {
  .herRow .text { font-size: 18px; }
  .herRow[data-long] .text { font-size: 17px; }
  .youRow .text { font-size: 15px; }
  .youRow[data-long] .text { font-size: 14px; }
  .youRow { max-width: 80%; }
  .giftDisk { width: 56px; height: 56px; }
}
```

- [ ] **Step 6: Mount Letter in `Chat.tsx`**

Replace the `letterPlaceholder` section:

```tsx
import { Letter } from './chat/Letter';
import { getMockConversation } from './chat/mockConversation';

// inside component
const messages = useMemo(() => getMockConversation(new Date()), []);
```

Render `<Letter messages={messages} />` in place of the placeholder.

Add `import { useMemo } from 'react'`.

Drop `.letterPlaceholder` rule from CSS (no longer used).

- [ ] **Step 7: Verify**

`npx tsc -b` + `npx vite build` green.

Manual: `/__preview/chat` shows:
- Day divider `MONDAY · MAY 4` (or whatever yesterday is at runtime), then yesterday's messages.
- Day divider `TUESDAY · MAY 5`, today's messages.
- Her replies: italic, side rule, mood-tinted (different per id).
- Your replies: sans, right-aligned, muted.
- The 22:41 ↔ 9:22 gap inside yesterday: NO `·` since it crosses days — verify only big intra-day gaps render the dot. (If you see misbehaviour, the day-divider already swallowed the pause; that's correct.)
- Hover any reply → time appears.
- Gift row m10: heart placeholder + italic caption.

- [ ] **Step 8: Suggested commit**

```bash
git add src/pages-redesign/chat/Letter.tsx src/pages-redesign/chat/Letter.module.css src/pages-redesign/chat/DayDivider.tsx src/pages-redesign/chat/DayDivider.module.css src/pages-redesign/Chat.tsx src/pages-redesign/Chat.module.css
git commit -m "feat(redesign): chat letter — typography, day dividers, hover timestamps"
```

---

## Phase 4 — Composer (pill-input + emoji + gift triggers)

Goal: bottom composer renders, pill input accepts text, emoji button opens an inline sheet, gift button opens an inline sheet (real gift visuals come Phase 5). Letter scrolls to bottom on mount.

**Files:**
- Create: `src/pages-redesign/chat/Composer.tsx`
- Create: `src/pages-redesign/chat/Composer.module.css`
- Create: `src/pages-redesign/chat/EmojiSheet.tsx`
- Create: `src/pages-redesign/chat/EmojiSheet.module.css`
- Modify: `src/pages-redesign/Chat.tsx` (mount composer + scroll-to-bottom)
- Modify: `src/pages-redesign/Chat.module.css` (composer slot styling)

- [ ] **Step 1: Create `Composer.tsx`**

```tsx
import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Smile, Gift, Send } from 'lucide-react';
import { useLanguage } from '../../i18n';
import { EmojiSheet } from './EmojiSheet';
import s from './Composer.module.css';

interface ComposerProps {
  onSend: (text: string) => void;
  onOpenGift: () => void;
  placeholder: string;
  disabled?: boolean;
}

export function Composer({ onSend, onOpenGift, placeholder, disabled }: ComposerProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);

  function send() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value.slice(0, 500));
  }

  return (
    <div className={s.wrap}>
      {emojiOpen && (
        <EmojiSheet
          onPick={(emoji) => { setValue(v => v + emoji); setEmojiOpen(false); }}
          onClose={() => setEmojiOpen(false)}
        />
      )}
      <div className={s.pill}>
        <button
          type="button"
          className={s.iconBtn}
          aria-label={t('landing.redesign.chat.composer.emoji')}
          onClick={() => setEmojiOpen(o => !o)}
          disabled={disabled}
        >
          <Smile size={18} />
        </button>
        <button
          type="button"
          className={s.iconBtn}
          aria-label={t('landing.redesign.chat.composer.gift')}
          onClick={onOpenGift}
          disabled={disabled}
        >
          <Gift size={18} />
        </button>
        <textarea
          className={s.input}
          value={value}
          onChange={onChange}
          onKeyDown={onKey}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
        />
        <button
          type="button"
          className={`${s.iconBtn} ${s.send}`}
          onClick={send}
          aria-label={t('landing.redesign.chat.composer.send')}
          disabled={disabled || !value.trim()}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `Composer.module.css`**

```css
.wrap {
  position: relative;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.pill {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 8px 8px 8px 12px;
  background: rgba(245, 240, 248, 0.06);
  border: 1px solid rgba(245, 240, 248, 0.12);
  border-radius: 999px;
  backdrop-filter: blur(12px) saturate(1.1);
}

.input {
  flex: 1;
  resize: none;
  background: transparent;
  border: 0;
  outline: 0;
  color: rgba(245, 240, 248, 0.96);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  padding: 8px 4px;
  max-height: 120px;
}

.input::placeholder {
  color: rgba(245, 240, 248, 0.4);
  font-style: italic;
}

.iconBtn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: transparent;
  border: 0;
  color: rgba(245, 240, 248, 0.65);
  cursor: pointer;
  display: grid; place-items: center;
  transition: color 0.15s, background 0.15s;
}

.iconBtn:hover:not(:disabled) {
  color: rgba(245, 240, 248, 0.95);
  background: rgba(245, 240, 248, 0.06);
}

.iconBtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.send:not(:disabled) {
  color: #EC4899;
}

.send:not(:disabled):hover {
  background: rgba(236, 72, 153, 0.12);
}
```

- [ ] **Step 3: Create `EmojiSheet.tsx`**

```tsx
import s from './EmojiSheet.module.css';

const EMOJIS = [
  ['😊','❤️','😘','🥰','😍','💕','✨','🔥'],
  ['💜','😏','😉','🤗','💋','🥺','🌹','🌸'],
  ['😢','🌙','☕','📖','🦋','🍓','🍒','🍑'],
];

interface Props { onPick: (emoji: string) => void; onClose: () => void }

export function EmojiSheet({ onPick }: Props) {
  return (
    <div className={s.sheet} role="dialog" aria-label="Emoji picker">
      <div className={s.grid}>
        {EMOJIS.flat().map(e => (
          <button key={e} className={s.btn} onClick={() => onPick(e)} type="button">{e}</button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `EmojiSheet.module.css`**

```css
.sheet {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0;
  right: 0;
  padding: 14px;
  background: rgba(15, 13, 21, 0.92);
  border: 1px solid rgba(245, 240, 248, 0.1);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  z-index: 30;
}

.grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.btn {
  width: 36px; height: 36px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  font-size: 22px;
  cursor: pointer;
  transition: background 0.12s;
}

.btn:hover { background: rgba(245, 240, 248, 0.08); }

@media (max-width: 520px) {
  .grid { grid-template-columns: repeat(6, 1fr); }
}
```

- [ ] **Step 5: Mount composer + scroll-to-bottom in `Chat.tsx`**

Add state for messages so locally-sent ones append (preview only):

```tsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Composer } from './chat/Composer';

// inside component
const initial = useMemo(() => getMockConversation(new Date()), []);
const [messages, setMessages] = useState<Message[]>(initial);
const letterRef = useRef<HTMLDivElement>(null);

useLayoutEffect(() => {
  const el = letterRef.current;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}, []);

function handleSend(text: string) {
  const id = `local-${Date.now()}`;
  setMessages(m => [...m, {
    id,
    role: 'you',
    kind: 'text',
    ts: new Date(),
    textKey: `__inline:${text}`,
  }]);
}
```

Layout split: scrolling letter container + sticky composer:

```tsx
return (
  <div className={`redesign-root ${s.page}`} data-theme="dark">
    <StarField intensity="dim" />
    <div className={s.shell}>
      <header className={s.eyebrow}>...</header>
      <div ref={letterRef} className={s.letterScroller}>
        <Letter messages={messages} />
      </div>
      <div className={s.composerSlot}>
        <Composer
          onSend={handleSend}
          onOpenGift={() => { /* phase 5 */ }}
          placeholder={t('landing.redesign.chat.composer.placeholder.default')}
        />
      </div>
    </div>
    <OrbDock />
  </div>
);
```

The `__inline:` prefix tells `Letter`'s text resolver to skip i18n lookup and use the literal text. Update `TextRow` accordingly:

```tsx
const text = message.textKey.startsWith('__inline:')
  ? message.textKey.slice('__inline:'.length)
  : t(message.textKey);
```

- [ ] **Step 6: Update `Chat.module.css` for split layout**

```css
.shell {
  position: relative;
  z-index: 1;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.eyebrow { padding-top: 32px; flex-shrink: 0; }
.letterScroller {
  flex: 1;
  overflow-y: auto;
  padding-block: 24px 16px;
  scroll-behavior: smooth;
}
.composerSlot {
  flex-shrink: 0;
  padding-block: 16px 96px; /* space for OrbDock */
}

@media (max-width: 520px) {
  .shell { padding: 0 18px; }
  .composerSlot { padding-block: 12px 88px; }
}
```

Drop the old `.main` rule (replaced by `.shell`).

- [ ] **Step 7: Verify**

`npx tsc -b` + `npx vite build` green.

Manual:
- Open `/__preview/chat`. First frame already scrolled to bottom — last her message + composer in view.
- Type something → Enter → your message appears at bottom, scroll auto-follows... actually it won't yet. **Add** a `useEffect` watching `messages.length`:

```tsx
useEffect(() => {
  const el = letterRef.current;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}, [messages.length]);
```

- Click smile → emoji sheet appears above pill, click an emoji → inserted into input.
- Click gift → no-op for now (Phase 5).

- [ ] **Step 8: Suggested commit**

```bash
git add src/pages-redesign/chat/Composer.tsx src/pages-redesign/chat/Composer.module.css src/pages-redesign/chat/EmojiSheet.tsx src/pages-redesign/chat/EmojiSheet.module.css src/pages-redesign/Chat.tsx src/pages-redesign/Chat.module.css
git commit -m "feat(redesign): chat composer + emoji sheet + scroll-to-bottom"
```

---

## Phase 5 — Gift sheet + real gift icons

Goal: gift trigger opens a sheet with 6 lucide icons, picking inserts a `GiftMessage` into the letter, real icons replace the placeholder in `GiftIcon`.

**Files:**
- Create: `src/pages-redesign/chat/GiftSheet.tsx`
- Create: `src/pages-redesign/chat/GiftSheet.module.css`
- Modify: `src/pages-redesign/chat/Letter.tsx` (real `GiftIcon`)
- Modify: `src/pages-redesign/Chat.tsx` (mount sheet + state)

- [ ] **Step 1: Replace `GiftIcon` in `Letter.tsx`**

```tsx
import { Heart, Flower2, Coffee, Sparkles, Moon, Gem } from 'lucide-react';
import type { GiftKey } from './types';

const GIFT_ICON: Record<GiftKey, typeof Heart> = {
  heart: Heart, flower: Flower2, coffee: Coffee, sparkles: Sparkles, moon: Moon, gem: Gem,
};

function GiftIcon({ giftKey }: { giftKey: GiftKey }) {
  const Icon = GIFT_ICON[giftKey];
  return <Icon size={26} strokeWidth={1.5} aria-hidden />;
}
```

- [ ] **Step 2: Create `GiftSheet.tsx`**

```tsx
import { Heart, Flower2, Coffee, Sparkles, Moon, Gem } from 'lucide-react';
import { useLanguage } from '../../i18n';
import type { GiftKey } from './types';
import s from './GiftSheet.module.css';

const ITEMS: Array<{ key: GiftKey; Icon: typeof Heart }> = [
  { key: 'heart', Icon: Heart },
  { key: 'flower', Icon: Flower2 },
  { key: 'coffee', Icon: Coffee },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'moon', Icon: Moon },
  { key: 'gem', Icon: Gem },
];

interface Props { onPick: (giftKey: GiftKey) => void; onClose: () => void }

export function GiftSheet({ onPick, onClose }: Props) {
  const { t } = useLanguage();
  return (
    <div className={s.sheet} role="dialog" aria-label="Gift picker">
      <div className={s.grid}>
        {ITEMS.map(({ key, Icon }) => (
          <button key={key} className={s.tile} onClick={() => { onPick(key); onClose(); }} type="button">
            <span className={s.iconWrap}><Icon size={26} strokeWidth={1.5} /></span>
            <span className={s.name}>{t(`landing.redesign.chat.gift.names.${key}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `GiftSheet.module.css`**

```css
.sheet {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 0; right: 0;
  padding: 18px;
  background: rgba(15, 13, 21, 0.92);
  border: 1px solid rgba(245, 240, 248, 0.1);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  z-index: 30;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 6px;
  background: transparent;
  border: 1px solid rgba(245, 240, 248, 0.08);
  border-radius: 16px;
  cursor: pointer;
  color: rgba(245, 240, 248, 0.85);
  transition: background 0.15s, border-color 0.15s;
}

.tile:hover {
  background: rgba(245, 240, 248, 0.05);
  border-color: rgba(236, 72, 153, 0.4);
}

.iconWrap {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: grid; place-items: center;
  color: #EC4899;
}

.name {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-size: 13px;
  text-align: center;
  color: rgba(245, 240, 248, 0.75);
}
```

- [ ] **Step 4: Wire gift state in `Chat.tsx`**

```tsx
import { GiftSheet } from './chat/GiftSheet';
import type { GiftKey } from './chat/types';

const [giftOpen, setGiftOpen] = useState(false);

function handleGift(key: GiftKey) {
  setMessages(m => [...m, {
    id: `gift-${Date.now()}`,
    role: 'you',
    kind: 'gift',
    ts: new Date(),
    giftKey: key,
    captionKey: 'landing.redesign.chat.gift.sent',
  }]);
}
```

In Composer JSX add `onOpenGift={() => setGiftOpen(true)}`.

Render `GiftSheet` near composer (sibling of `Composer` inside `.composerSlot`):

```tsx
<div className={s.composerSlot}>
  {giftOpen && (
    <GiftSheet onPick={handleGift} onClose={() => setGiftOpen(false)} />
  )}
  <Composer ... />
</div>
```

The sheet uses absolute positioning relative to `.composerSlot`, so add `position: relative` to `.composerSlot`.

- [ ] **Step 5: Verify**

`npx tsc -b` + `npx vite build` green.

Manual: gift button opens 3×2 grid, picking inserts gift-row at bottom. Letter scrolls to bottom (already wired in Phase 4). Real flower icon visible in pre-existing m10 mock as well.

- [ ] **Step 6: Suggested commit**

```bash
git add src/pages-redesign/chat/GiftSheet.tsx src/pages-redesign/chat/GiftSheet.module.css src/pages-redesign/chat/Letter.tsx src/pages-redesign/Chat.tsx src/pages-redesign/Chat.module.css
git commit -m "feat(redesign): chat gift sheet — 6 mock gifts + real lucide icons"
```

---

## Phase 6 — Daily limit (hairline progress + 90 hint + 100 banner)

Goal: footer shows hairline progress bar driven by a `count` prop; on `>=90` a tertiary hint appears above; on `>=100` composer row swaps for system-banner with 60s ticker.

**Files:**
- Create: `src/pages-redesign/chat/LimitProgress.tsx`
- Create: `src/pages-redesign/chat/LimitProgress.module.css`
- Modify: `src/pages-redesign/Chat.tsx`

- [ ] **Step 1: Create `LimitProgress.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n';
import s from './LimitProgress.module.css';

interface Props { count: number; max: number }

function msToHm(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function msUntilMidnight() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return next.getTime() - n.getTime();
}

export function LimitProgress({ count, max }: Props) {
  const { t } = useLanguage();
  const ratio = Math.min(1, count / max);
  const showHint = count >= max - 10 && count < max;
  const atLimit = count >= max;

  const [resetMs, setResetMs] = useState(msUntilMidnight());

  useEffect(() => {
    if (!atLimit) return;
    const id = setInterval(() => setResetMs(msUntilMidnight()), 60_000);
    return () => clearInterval(id);
  }, [atLimit]);

  if (atLimit) {
    return (
      <div className={s.banner} role="status">
        <span className={s.bannerLine} aria-hidden />
        <p className={s.bannerTitle}>{t('landing.redesign.chat.limit.banner.title')}</p>
        <p className={s.bannerSub}>{t('landing.redesign.chat.limit.banner.resetIn').replace('{time}', msToHm(resetMs))}</p>
        <span className={s.bannerLine} aria-hidden />
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      {showHint && <p className={s.hint}>{t('landing.redesign.chat.limit.hint')}</p>}
      <div className={s.bar}><span className={s.fill} style={{ transform: `scaleX(${ratio})` }} /></div>
    </div>
  );
}
```

- [ ] **Step 2: Create `LimitProgress.module.css`**

```css
.wrap { width: 100%; }

.hint {
  font-size: 12px;
  color: rgba(245, 240, 248, 0.45);
  text-align: center;
  margin: 0 0 6px;
  font-style: italic;
}

.bar {
  height: 1px;
  width: 100%;
  background: rgba(245, 240, 248, 0.08);
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #8B5CF6, #EC4899);
  transform-origin: left;
  transition: transform 0.4s ease;
}

.banner {
  display: grid;
  grid-template-rows: 1px auto auto 1px;
  gap: 12px;
  text-align: center;
  padding-block: 12px;
}

.bannerLine {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 240, 248, 0.18), transparent);
}

.bannerTitle {
  font-size: 13px;
  color: rgba(245, 240, 248, 0.7);
  margin: 0;
}

.bannerSub {
  font-size: 12px;
  color: rgba(245, 240, 248, 0.45);
  margin: 0;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Wire into `Chat.tsx`**

For now, hard-code count via a temporary state (wired to debug-strip in Phase 8):

```tsx
const [count, setCount] = useState(45); // 0|45|95|100 to play with manually
const MAX = 100;
const atLimit = count >= MAX;
```

In the composer slot:

```tsx
<div className={s.composerSlot}>
  {giftOpen && <GiftSheet ... />}
  {atLimit
    ? <LimitProgress count={count} max={MAX} />
    : <>
        <Composer ... disabled={atLimit} />
        <LimitProgress count={count} max={MAX} />
      </>
  }
</div>
```

Send handler increments count:

```tsx
function handleSend(text: string) {
  if (count >= MAX) return;
  setMessages(m => [...m, { ... }]);
  setCount(c => c + 1);
}
function handleGift(key: GiftKey) {
  if (count >= MAX) return;
  setMessages(m => [...m, { ... }]);
  setCount(c => c + 1);
}
```

- [ ] **Step 4: Verify**

`npx tsc -b` + `npx vite build` green.

Manual: send messages → bar grows. Temporarily set `useState(95)` → hint appears. Set to `100` → composer disappears, banner appears with reset timer.

- [ ] **Step 5: Suggested commit**

```bash
git add src/pages-redesign/chat/LimitProgress.tsx src/pages-redesign/chat/LimitProgress.module.css src/pages-redesign/Chat.tsx
git commit -m "feat(redesign): chat daily limit hairline + system banner"
```

---

## Phase 7 — Sleep mode visual shift

Goal: when `isAsleep === true`, page dims, vignette overlay appears, composer placeholder swaps to whisper. No system phrases in her voice.

**Files:**
- Modify: `src/pages-redesign/Chat.tsx`
- Modify: `src/pages-redesign/Chat.module.css`

- [ ] **Step 1: Add sleep state and pass to layout**

```tsx
const [isAsleep, setIsAsleep] = useState(false);
```

Apply data attribute:

```tsx
<div className={`redesign-root ${s.page}`} data-theme="dark" data-sleep={isAsleep || undefined}>
```

Pass placeholder switch to Composer:

```tsx
const placeholder = isAsleep
  ? t('landing.redesign.chat.composer.placeholder.whisper')
  : t('landing.redesign.chat.composer.placeholder.default');
```

- [ ] **Step 2: Add CSS overlay + dim variables**

In `Chat.module.css`:

```css
.page {
  --letter-opacity: 1;
}

.page[data-sleep] {
  --letter-opacity: 0.55;
}

.page[data-sleep]::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 50%, transparent 30%, rgba(40, 30, 80, 0.45) 100%);
  z-index: 0;
}

.page[data-sleep] .letterScroller {
  opacity: var(--letter-opacity);
  transition: opacity 0.6s ease;
}
```

- [ ] **Step 3: Verify**

Temporarily set `useState(true)` → letter dims, vignette appears, composer placeholder reads `whisper into the night…` / `шепни в ночь…`. Set back to false to confirm restore.

- [ ] **Step 4: Suggested commit**

```bash
git add src/pages-redesign/Chat.tsx src/pages-redesign/Chat.module.css
git commit -m "feat(redesign): chat sleep mode visual shift + whisper placeholder"
```

---

## Phase 8 — Preview debug strip

Goal: top-left glass strip with toggles for sleep / count (0|90|100) / lang (en|ru) / theme (light|dark). All four wire to existing state.

**Files:**
- Create: `src/pages-redesign/chat/PreviewDebugStrip.tsx`
- Create: `src/pages-redesign/chat/PreviewDebugStrip.module.css`
- Modify: `src/pages-redesign/Chat.tsx`

- [ ] **Step 1: Create `PreviewDebugStrip.tsx`**

```tsx
import { useLanguage } from '../../i18n';
import s from './PreviewDebugStrip.module.css';

interface Props {
  isAsleep: boolean;
  setAsleep: (v: boolean) => void;
  count: number;
  setCount: (v: number) => void;
  theme: 'dark' | 'light';
  setTheme: (v: 'dark' | 'light') => void;
}

export function PreviewDebugStrip({ isAsleep, setAsleep, count, setCount, theme, setTheme }: Props) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={s.strip} role="region" aria-label="Preview debug controls">
      <Group label="state">
        <Btn active={!isAsleep} onClick={() => setAsleep(false)}>awake</Btn>
        <Btn active={isAsleep} onClick={() => setAsleep(true)}>asleep</Btn>
      </Group>
      <Group label="count">
        {[0, 90, 100].map(v => (
          <Btn key={v} active={count === v} onClick={() => setCount(v)}>{v}</Btn>
        ))}
      </Group>
      <Group label="lang">
        <Btn active={lang === 'en'} onClick={() => setLang('en')}>en</Btn>
        <Btn active={lang === 'ru'} onClick={() => setLang('ru')}>ru</Btn>
      </Group>
      <Group label="theme">
        <Btn active={theme === 'dark'} onClick={() => setTheme('dark')}>dark</Btn>
        <Btn active={theme === 'light'} onClick={() => setTheme('light')}>light</Btn>
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.group}>
      <span className={s.groupLabel}>{label}</span>
      <div className={s.groupBtns}>{children}</div>
    </div>
  );
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`${s.btn} ${active ? s.btnActive : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `PreviewDebugStrip.module.css`**

```css
.strip {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(15, 13, 21, 0.78);
  border: 1px solid rgba(245, 240, 248, 0.12);
  border-radius: 999px;
  backdrop-filter: blur(14px);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
}

.group { display: inline-flex; align-items: center; gap: 4px; }
.groupLabel { color: rgba(245, 240, 248, 0.45); letter-spacing: 0.1em; text-transform: uppercase; }
.groupBtns { display: inline-flex; gap: 2px; }

.btn {
  padding: 3px 8px;
  background: transparent;
  border: 1px solid rgba(245, 240, 248, 0.1);
  border-radius: 999px;
  color: rgba(245, 240, 248, 0.7);
  cursor: pointer;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.btn:hover { background: rgba(245, 240, 248, 0.06); }

.btnActive {
  background: linear-gradient(90deg, #8B5CF6, #EC4899);
  border-color: transparent;
  color: #fff;
}

@media (max-width: 640px) {
  .strip { font-size: 10px; padding: 4px 6px; }
  .btn { padding: 2px 6px; font-size: 10px; }
}
```

- [ ] **Step 3: Wire into `Chat.tsx`**

Add theme state:

```tsx
const [theme, setTheme] = useState<'dark' | 'light'>('dark');
```

Use it on the wrapper:

```tsx
<div className={`redesign-root ${s.page}`} data-theme={theme} data-sleep={isAsleep || undefined}>
```

Render strip first inside the wrapper:

```tsx
<PreviewDebugStrip
  isAsleep={isAsleep} setAsleep={setIsAsleep}
  count={count} setCount={setCount}
  theme={theme} setTheme={setTheme}
/>
```

- [ ] **Step 4: Verify**

`npx tsc -b` + `npx vite build` green.

Manual on `/__preview/chat`:
- Toggle awake/asleep → dim activates.
- 0 / 90 / 100 → progress, hint, banner respectively.
- en / ru → translations swap (verify mock conversation reads naturally in both).
- dark / light → light theme expected styling: text inverts, background lightens.

If light theme looks broken — that's expected at this stage; Phase 9 polishes it.

- [ ] **Step 5: Suggested commit**

```bash
git add src/pages-redesign/chat/PreviewDebugStrip.tsx src/pages-redesign/chat/PreviewDebugStrip.module.css src/pages-redesign/Chat.tsx
git commit -m "feat(redesign): chat preview debug strip — sleep/count/lang/theme toggles"
```

---

## Phase 9 — Light theme polish + accessibility audit

Goal: light theme works correctly across letter, day-divider, composer, gift sheet, emoji sheet, limit progress, banner. Screen-reader and keyboard audit pass.

**Files:**
- Modify: ALL `.module.css` files in `src/pages-redesign/chat/` + `src/pages-redesign/Chat.module.css`

- [ ] **Step 1: Add light-theme overrides for `Letter.module.css`**

```css
:global(.redesign-root[data-theme='light']) .herRow .text { color: rgba(40, 30, 60, 0.92); }
:global(.redesign-root[data-theme='light']) .youRow .text { color: rgba(40, 30, 60, 0.7); }
:global(.redesign-root[data-theme='light']) .timestamp { color: rgba(40, 30, 60, 0.4); }
:global(.redesign-root[data-theme='light']) .pause { color: rgba(40, 30, 60, 0.3); }
:global(.redesign-root[data-theme='light']) .giftCaptionPrimary { color: rgba(40, 30, 60, 0.65); }
:global(.redesign-root[data-theme='light']) .giftCaptionSecondary { color: rgba(40, 30, 60, 0.4); }
:global(.redesign-root[data-theme='light']) .giftDisk {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.08);
}
```

- [ ] **Step 2: Light overrides for `Chat.module.css`**

```css
:global(.redesign-root[data-theme='light']) .page { background: #FAF7FC; color: #2A1B33; }
:global(.redesign-root[data-theme='light']) .eyebrow { color: rgba(40, 30, 60, 0.55); }
```

- [ ] **Step 3: Light overrides for `DayDivider`, `Composer`, `EmojiSheet`, `GiftSheet`, `LimitProgress`**

For each: invert text, soften borders to dark-on-light variants. Pattern:
- Backgrounds: `rgba(0,0,0, low-alpha)` instead of `rgba(255,255,255, low-alpha)`.
- Text colors: `rgba(40,30,60, alpha)` instead of `rgba(245,240,248, alpha)`.
- Sheet panels: `rgba(255,255,255, 0.92)` instead of `rgba(15,13,21, 0.92)`.

Don't paste a 200-line block — touch each file and apply consistently. Reference Stage 6 light-mode patches in `MemoryCardV2.module.css` and `Memories.module.css` for consistency.

- [ ] **Step 4: Reduce-motion**

In `Letter.module.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .timestamp { transition: none; }
}
```

In `LimitProgress.module.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .fill { transition: none; }
}
```

- [ ] **Step 5: Keyboard pass**

Verify tab order on `/__preview/chat`:
1. Debug strip buttons (top-left).
2. Eyebrow stars (focusable but no-op — that's fine; tab moves through).
3. Composer emoji → gift → textarea → send.
4. OrbDock items.

If eyebrow stars currently aren't a button, leave them as plain spans (not in tab order). If they are buttons, ensure clear focus ring.

- [ ] **Step 6: Verify**

`npx tsc -b` + `npx vite build` green.

Manual matrix on `/__preview/chat`:
- light/dark × en/ru × awake/asleep × count[0|90|100].
- Mobile widths 320 / 360 / 414 / 520.
- Hover/long-press timestamps.
- Send a message in light mode + sleep mode + at-limit.
- Tab through page, focus rings visible.
- Browser dev-tools: Reduce Motion → animations stop.

- [ ] **Step 7: Suggested commit**

```bash
git add src/pages-redesign/Chat.module.css src/pages-redesign/chat/*.module.css
git commit -m "feat(redesign): chat light theme polish + reduced-motion + a11y pass"
```

---

## Phase 10 — Plan changelog entry

Goal: append Stage 7 changelog to `plans/redesign-mamba-inspired.md` matching Stage 5/6 format.

**Files:**
- Modify: `plans/redesign-mamba-inspired.md`

- [ ] **Step 1: Append Stage 7 changelog**

Match the Stage 5/6 voice and structure: concept, layout decisions, key components, files added/modified, verification, known issues / deferred to later stages, performance notes, manual QA URL.

Plan content (skeleton — fill in actual decisions made during implementation):

```markdown
## Changelog — Stage 7 (Letter Chat — vertical document)

**Concept:** ...

**Layout decisions:** ...

**Key components:**
- `Letter.tsx` — ...
- `Composer.tsx` — ...
- `GiftSheet.tsx` / `EmojiSheet.tsx` — ...
- `LimitProgress.tsx` — ...
- `PreviewDebugStrip.tsx` — ...

**Sleep mode:** visual shift only. ...

**Daily limit:** hairline + 90-hint + 100-banner. ...

**Files added:** [list]

**Files modified:** [list]

**Deferred to later stages:**
- Eyebrow → profile drawer (Stage 9)
- Real Stars purchase / gifts catalog (Stage 10)
- Edge-function wiring + watchdog (prod merge)
- Night-attempts UI (Stage 7.5 or dropped)

**Verification:** `npx tsc -b` + `npx vite build` green.

**Manual QA URL:** http://localhost:5173/__preview/chat
```

- [ ] **Step 2: Suggested commit**

```bash
git add plans/redesign-mamba-inspired.md
git commit -m "docs(redesign): Stage 7 changelog"
```

---

## Self-review

### Spec coverage
- §1 Concept → respected throughout.
- §2 Scope (in/out) → in-scope items each map to a phase: shell P0/P1, mock data P2, letter P3, composer P4, gift P5, limit P6, sleep P7, debug P8, polish P9, changelog P10. Out-of-scope items (profile drawer, real Stars, edge functions, night-attempts UI) explicitly deferred in Phase 10 changelog.
- §3 Architecture → file layout matches plan exactly.
- §4 Typography → Phase 3 implements all rules including long-rule (>120 chars) and mood mapping.
- §5 Open-at-bottom → Phase 4 step 5 (`useLayoutEffect` + `scrollHeight`).
- §6 Sleep → Phase 7.
- §7 Daily-limit → Phase 6.
- §8 Stars eyebrow → Phase 1 (display-only Sparkle + 1240).
- §9 Mock conversation → Phase 2.
- §10 i18n → Phase 2 EN+RU.
- §11 Debug strip → Phase 8.
- §12 Performance budget → no new heavy effects, blur usage matches spec.
- §13 Accessibility → Phase 9 audit (role="log", aria-live, srLabel, role="separator", role="status").
- §14 Verification matrix → Phase 9 manual QA matrix.

### Placeholder scan
- Phase 3 step 4: `GiftIcon` is a stub heart; **explicitly noted** that it gets replaced in Phase 5 step 1. Not a placeholder failure — it's a phased decomposition with the replacement in the plan.
- Phase 6 step 3: `useState(45)` is a temporary count; **explicitly noted** that debug-strip wires it in Phase 8.
- Phase 7 step 3: `useState(true)` toggle is **temporary for verification**; debug strip in Phase 8 makes it interactive.
- Phase 10 step 1: skeleton "fill in actual decisions made during implementation" — this is acceptable for a changelog that summarises completed work, not for a code task. It is implementer-driven prose, not undefined behaviour.
- No "TODO", "TBD", "implement later" without a destination phase.

### Type consistency
- `Message`, `TextMessage`, `GiftMessage`, `Role`, `GiftKey`, `Mood` defined in Phase 2 step 1. All later phases reference these names exactly.
- `Letter` props: `{ messages: Message[] }` consistent across Phase 3, Phase 4 (mounted), Phase 6 (still mounted).
- `Composer` props: `onSend`, `onOpenGift`, `placeholder`, `disabled` introduced in Phase 4 and used identically in Phases 5, 6, 7, 8.
- `GiftSheet` props: `onPick: (key: GiftKey) => void; onClose: () => void` — Phase 5 throughout.
- `LimitProgress` props: `count`, `max` — Phase 6 throughout.
- `PreviewDebugStrip` props match its usage in Phase 8 step 3.

No inconsistencies found.

### Spec gaps
None — every numbered spec section has at least one phase implementing it.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-06-letter-chat-stage-7-implementation.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per phase, two-stage review between phases, fast iteration, lower context usage in main session.
2. **Inline Execution** — execute phases in this session with checkpoints for visual review at each phase boundary.

Which approach?
