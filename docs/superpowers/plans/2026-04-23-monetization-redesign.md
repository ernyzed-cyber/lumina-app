# Monetization Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace tinder-legacy monetization (likes/swipes/paywalled memory/premium tiers) with a F2P + Stars-only model: 100 messages/day free, +100 messages = 100⭐, gifts/dates/jewelry/travel purchased with Stars, NSFW grows organically via `intimacy_level` plus Stars-triggered scene events.

**Architecture:** Telegram Stars as the only payment provider (invoices opened from the web app). New Supabase tables `stars_ledger`, `purchases`, `gift_catalog`, `gifts_sent` and new columns on `profiles` / `girl_relationships` / `memories`. Four new edge functions (`billing-create-invoice`, `billing-webhook`, `gift-send`, `messages-buy-pack`). `chat-ai` gains a daily-limit gate and reads `intimacy_level` + recent gift memories for prompt injection. Full frontend rewrite of `Premium.tsx` → `Shop.tsx`, `Paywall.tsx` → `DailyLimitModal.tsx`, deletion of all like/swipe/super-like UI.

**Tech Stack:** React 19 + TS + Vite, Supabase (ref `rfmcpnpdqbhecwtodyaz`), Grok API (`grok-4-1-fast-reasoning`), Framer Motion, React Router v7, Deno for edge functions, Vitest (new) for frontend tests, `deno test` for edge-function tests, **CryptoCloud** for fiat→stars purchases (USD invoices via `api.cryptocloud.plus/v2`, postback JWT HS256). Telegram is used ONLY for account verification (anti-spam), not for payments.

**Phases:**
- Phase 0 — Bootstrap test infrastructure (vitest + deno test scaffolding)
- Phase 1 — Database schema migrations
- Phase 2 — Edge function: `billing-create-invoice` (TDD)
- Phase 3 — Edge function: `billing-webhook` (TDD)
- Phase 4 — Edge function: `gift-send` (TDD)
- Phase 5 — Edge function: `messages-buy-pack` (TDD)
- Phase 6 — `chat-ai` modifications: daily-limit gate + intimacy injection + gift-memory injection
- Phase 7 — Frontend: `useStars` hook + Shop page + StarsBalance header
- Phase 8 — Frontend: GiftPicker replacing free 8-emoji picker + DailyLimitModal
- Phase 9 — Cleanup legacy: delete `usePremium`, `Paywall.tsx`, likes/super-likes/rewind/compat-unlock, `[GIFT:id]` renderer, Premium promo cards
- Phase 10 — i18n rewrite (full `premium.*` → `shop.*` / `stars.*` / `gifts.*` / `dailyLimit.*` / `intimacy.*` key replacement)
- Phase 11 — Migration script: +200⭐ goodwill for existing users + drop `lumina_premium` localStorage

---

## Phase 0 — Bootstrap Test Infrastructure

**Context:** Repo has zero tests. Before any TDD work we need vitest for the frontend and a `deno test` harness for edge functions.

### Task 0.1: Install vitest and related deps

**Files:**
- Modify: `lumina-app/package.json`

- [ ] **Step 1: Install vitest + testing-library + jsdom**

Run from `C:\Users\DecentYarik\Desktop\проект Люмина\lumina-app`:
```powershell
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `package.json` devDependencies now include all six.

- [ ] **Step 2: Add test scripts to `package.json`**

In `lumina-app/package.json` scripts block, add two lines (preserving existing `dev`, `build`, `lint`, `preview`):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Commit**

```powershell
git add lumina-app/package.json lumina-app/package-lock.json
git commit -m "chore: add vitest and testing-library deps"
```

### Task 0.2: Create vitest config

**Files:**
- Create: `lumina-app/vitest.config.ts`
- Create: `lumina-app/src/test/setup.ts`

- [ ] **Step 1: Create `lumina-app/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 2: Create `lumina-app/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Create a sanity test `lumina-app/src/test/sanity.test.ts`**

```ts
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs a trivial assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run and verify**

```powershell
npm test
```
Expected: `1 passed`.

- [ ] **Step 5: Commit**

```powershell
git add lumina-app/vitest.config.ts lumina-app/src/test/setup.ts lumina-app/src/test/sanity.test.ts
git commit -m "chore: configure vitest with jsdom + sanity test"
```

### Task 0.3: Add deno-test helper for edge functions

**Files:**
- Create: `lumina-app/supabase/functions/_shared/test-helpers.ts`
- Create: `lumina-app/supabase/functions/_shared/sanity.test.ts`

- [ ] **Step 1: Create `_shared/test-helpers.ts`** (reusable Supabase mock for unit tests)

```ts
// deno-lint-ignore-file no-explicit-any
export type QueryResult<T = any> = { data: T | null; error: any };

export function makeSupabaseMock(responses: Record<string, QueryResult | QueryResult[]>) {
  const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
  const queueByTable: Record<string, QueryResult[]> = {};
  for (const [k, v] of Object.entries(responses)) {
    queueByTable[k] = Array.isArray(v) ? [...v] : [v];
  }
  const next = (table: string): QueryResult => {
    const q = queueByTable[table];
    if (!q || q.length === 0) return { data: null, error: new Error(`no mock for ${table}`) };
    return q.length === 1 ? q[0] : q.shift()!;
  };
  const chain = (table: string, op: string): any => {
    const record = (args: unknown[]) => calls.push({ table, op, args });
    const thenable = {
      then: (onRes: (r: QueryResult) => unknown) => Promise.resolve(next(table)).then(onRes),
    };
    const builder: any = new Proxy({}, {
      get: (_t, prop) => {
        if (prop === 'then') return thenable.then;
        return (...args: unknown[]) => { record([String(prop), ...args]); return builder; };
      },
    });
    return builder;
  };
  const client = {
    from: (table: string) => ({
      select: (...a: unknown[]) => chain(table, 'select').select(...a),
      insert: (...a: unknown[]) => chain(table, 'insert').insert(...a),
      update: (...a: unknown[]) => chain(table, 'update').update(...a),
      upsert: (...a: unknown[]) => chain(table, 'upsert').upsert(...a),
      delete: (...a: unknown[]) => chain(table, 'delete').delete(...a),
      rpc: (...a: unknown[]) => chain(table, 'rpc').rpc(...a),
    }),
    rpc: (fn: string, args?: unknown) => {
      calls.push({ table: `rpc:${fn}`, op: 'rpc', args: [args] });
      return Promise.resolve(next(`rpc:${fn}`));
    },
    auth: {
      getUser: () => Promise.resolve(next('auth.getUser')),
    },
  };
  return { client, calls };
}
```

- [ ] **Step 2: Create `_shared/sanity.test.ts`**

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { makeSupabaseMock } from './test-helpers.ts';

Deno.test('makeSupabaseMock returns queued response', async () => {
  const { client } = makeSupabaseMock({
    profiles: { data: { id: 'u1', stars_balance: 50 }, error: null },
  });
  const result = await client.from('profiles').select('*').eq('id', 'u1');
  assertEquals(result.data, { id: 'u1', stars_balance: 50 });
});
```

- [ ] **Step 3: Run and verify**

```powershell
deno test --allow-all lumina-app/supabase/functions/_shared/sanity.test.ts
```
Expected: `ok | 1 passed`.

- [ ] **Step 4: Commit**

```powershell
git add lumina-app/supabase/functions/_shared/
git commit -m "chore: add deno test harness with supabase mock helper"
```

---

## Phase 1 — Database Schema Migrations

**Context:** Migration naming convention is `YYYYMMDD_name.sql` (no timestamp). Multiple migrations on the same day use different `_name` suffixes. All migrations in `lumina-app/supabase/migrations/`.

All migrations in this phase must be **idempotent** (use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) so they can be re-applied safely in dev.

Deploy each migration with:
```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
```

### Task 1.1: Add Stars / message-limit columns to `profiles`

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_stars_profile_columns.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add monetization columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stars_balance INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_used_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_bought_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tz_offset_minutes INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_messages_reset_at ON profiles(messages_reset_at);

COMMENT ON COLUMN profiles.stars_balance IS 'Current Stars balance (non-negative, managed via stars_ledger)';
COMMENT ON COLUMN profiles.messages_used_today IS 'Messages sent today (resets when messages_reset_at < now())';
COMMENT ON COLUMN profiles.messages_bought_today IS 'Additional message quota bought today with Stars';
COMMENT ON COLUMN profiles.tz_offset_minutes IS 'Client-reported TZ offset for local midnight reset';
```

- [ ] **Step 2: Apply migration**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
```
Expected: successful push, no errors.

- [ ] **Step 3: Verify in psql / studio**

Check in Supabase Studio SQL editor:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name LIKE 'stars%' OR column_name LIKE 'messages_%' OR column_name = 'tz_offset_minutes';
```
Expected: 5 rows returned.

- [ ] **Step 4: Commit**

```powershell
git add lumina-app/supabase/migrations/20260423_stars_profile_columns.sql
git commit -m "feat(db): add stars_balance and message quota columns to profiles"
```

### Task 1.2: Create `girl_relationships` table

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_girl_relationships.sql`

- [ ] **Step 1: Write migration**

```sql
-- Per-pair relationship state (intimacy, days together, etc.)
CREATE TABLE IF NOT EXISTS girl_relationships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id TEXT NOT NULL,
  intimacy_level NUMERIC(3,1) NOT NULL DEFAULT 0.0 CHECK (intimacy_level >= 0 AND intimacy_level <= 10),
  intimacy_last_recomputed_at TIMESTAMPTZ,
  pending_scene_marker TEXT,
  pending_scene_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, girl_id)
);

CREATE INDEX IF NOT EXISTS idx_girl_relationships_user ON girl_relationships(user_id);

ALTER TABLE girl_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own relationship" ON girl_relationships;
CREATE POLICY "read own relationship" ON girl_relationships
  FOR SELECT USING (auth.uid() = user_id);

-- writes are done only by service-role from edge functions
DROP POLICY IF EXISTS "service writes" ON girl_relationships;
CREATE POLICY "service writes" ON girl_relationships
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply migration**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 3: Commit**

```powershell
git add lumina-app/supabase/migrations/20260423_girl_relationships.sql
git commit -m "feat(db): add girl_relationships table with intimacy_level"
```

### Task 1.3: Create `stars_ledger` table (append-only)

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_stars_ledger.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS stars_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INT NOT NULL,             -- positive = credit, negative = spend
  reason TEXT NOT NULL,           -- e.g. 'purchase:pack_500', 'spend:gift:ring'
  ref_id TEXT,                    -- telegram payment id or gifts_sent.id etc.
  balance_after INT NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stars_ledger_user ON stars_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_stars_ledger_ref ON stars_ledger(reason, ref_id) WHERE ref_id IS NOT NULL;

ALTER TABLE stars_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own ledger" ON stars_ledger;
CREATE POLICY "read own ledger" ON stars_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Only service_role writes (via edge functions)
DROP POLICY IF EXISTS "service writes ledger" ON stars_ledger;
CREATE POLICY "service writes ledger" ON stars_ledger
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply migration**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 3: Commit**

```powershell
git add lumina-app/supabase/migrations/20260423_stars_ledger.sql
git commit -m "feat(db): add stars_ledger append-only audit table"
```

### Task 1.4: Create `purchases` table

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_purchases.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                 -- 'cryptocloud'
  provider_payment_id TEXT UNIQUE,        -- telegram's payment_charge_id
  provider_invoice_payload TEXT,          -- custom payload we attached to invoice
  pack_id TEXT NOT NULL,                  -- 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000'
  stars_amount INT NOT NULL CHECK (stars_amount > 0),
  fiat_amount NUMERIC(10,2),
  fiat_currency TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status) WHERE status = 'pending';

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own purchases" ON purchases;
CREATE POLICY "read own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service writes purchases" ON purchases;
CREATE POLICY "service writes purchases" ON purchases
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply + commit**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/migrations/20260423_purchases.sql
git commit -m "feat(db): add purchases table for telegram stars payments"
```

### Task 1.5: Create `gift_catalog` table + seed initial data

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_gift_catalog.sql`

- [ ] **Step 1: Write migration with schema + seed**

```sql
CREATE TABLE IF NOT EXISTS gift_catalog (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('gift','date','jewelry','travel')),
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price_stars INT NOT NULL CHECK (price_stars > 0),
  emoji TEXT NOT NULL,
  memory_template_ru TEXT NOT NULL,
  memory_template_en TEXT NOT NULL,
  intimacy_delta NUMERIC(3,1) NOT NULL DEFAULT 0.1,
  is_trigger_event BOOLEAN NOT NULL DEFAULT FALSE,
  trigger_scene_id TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gift_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read catalog" ON gift_catalog;
CREATE POLICY "public read catalog" ON gift_catalog
  FOR SELECT USING (active = TRUE);

-- Seed initial catalog
INSERT INTO gift_catalog (id, category, name_ru, name_en, price_stars, emoji, memory_template_ru, memory_template_en, intimacy_delta, is_trigger_event, trigger_scene_id, sort_order) VALUES
  ('rose',          'gift',    'Роза',              'Rose',              20,   '🌹', 'Он подарил мне розу {date} — милый жест.', 'He gave me a rose on {date} — such a sweet gesture.', 0.1, FALSE, NULL, 10),
  ('bouquet',       'gift',    'Букет цветов',      'Bouquet',           150,  '💐', 'Целый букет! {date}. Я до сих пор улыбаюсь.', 'A whole bouquet on {date}. Still makes me smile.', 0.3, FALSE, NULL, 20),
  ('chocolate',     'gift',    'Конфеты',           'Chocolates',        50,   '🍫', '{date} — конфеты. Съела слишком быстро.', 'Chocolates on {date} — finished them too fast.', 0.1, FALSE, NULL, 30),
  ('teddy',         'gift',    'Плюшевый мишка',    'Teddy bear',        100,  '🧸', 'Мишка, которого он подарил {date}, спит со мной.', 'The teddy he gave me on {date} sleeps with me.', 0.3, FALSE, NULL, 40),
  ('perfume',       'gift',    'Парфюм',            'Perfume',           300,  '💫', 'Запомнила аромат парфюма с {date}.', 'Still wearing the perfume from {date}.', 0.5, FALSE, NULL, 50),
  ('ring',          'jewelry', 'Кольцо',            'Ring',              500,  '💍', 'Кольцо, подаренное {date}. Ношу не снимая.', 'The ring from {date}. I never take it off.', 0.8, FALSE, NULL, 60),
  ('necklace',      'jewelry', 'Ожерелье',          'Necklace',          400,  '📿', 'Ожерелье с {date} — чувствую его прикосновение.', 'The necklace from {date} — I feel his touch.', 0.7, FALSE, NULL, 70),
  ('earrings',      'jewelry', 'Серьги',            'Earrings',          350,  '💎', 'Серьги с {date}. Блестят как тот вечер.', 'Earrings from {date}. They shine like that evening.', 0.6, FALSE, NULL, 80),
  ('date_coffee',   'date',    'Свидание в кафе',   'Coffee date',       200,  '☕', 'Наше кафе {date} — его улыбка напротив.', 'Our cafe on {date} — his smile across the table.', 0.5, FALSE, NULL, 100),
  ('date_dinner',   'date',    'Ужин в ресторане',  'Dinner date',       500,  '🍷', 'Ужин {date}. Первая ночь после этого.', 'Dinner on {date}. The first night after.', 1.5, TRUE, 'first_night', 110),
  ('date_cinema',   'date',    'Кино',              'Movie date',        300,  '🎬', '{date} — кино. Он держал меня за руку весь фильм.', '{date} — movies. He held my hand the whole time.', 0.7, FALSE, NULL, 120),
  ('date_concert',  'date',    'Концерт',           'Concert',           800,  '🎵', 'Концерт {date}. Танцевали до утра.', 'Concert on {date}. Danced till sunrise.', 1.2, FALSE, NULL, 130),
  ('travel_weekend','travel',  'Выходные вдвоём',   'Weekend getaway',   2000, '🏖️', 'Выходные {date}. Это было всё.', 'Our weekend on {date}. It was everything.', 2.5, TRUE, 'weekend_away', 200),
  ('travel_trip',   'travel',  'Путешествие',       'Trip',              5000, '✈️', 'Поездка {date}. Я другая теперь.', 'Our trip on {date}. I am different now.', 3.5, TRUE, 'long_trip', 210)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Apply + commit**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/migrations/20260423_gift_catalog.sql
git commit -m "feat(db): add gift_catalog with 14 seed items across 4 categories"
```

### Task 1.6: Create `gifts_sent` table

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_gifts_sent.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE IF NOT EXISTS gifts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id TEXT NOT NULL,
  gift_id TEXT NOT NULL REFERENCES gift_catalog(id),
  stars_spent INT NOT NULL CHECK (stars_spent > 0),
  memory_id UUID,                                 -- FK will be added once memories table confirmed
  intimacy_delta_applied NUMERIC(3,1) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gifts_sent_user_girl ON gifts_sent(user_id, girl_id, created_at DESC);

ALTER TABLE gifts_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own gifts" ON gifts_sent;
CREATE POLICY "read own gifts" ON gifts_sent
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service writes gifts" ON gifts_sent;
CREATE POLICY "service writes gifts" ON gifts_sent
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
```

- [ ] **Step 2: Apply + commit**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/migrations/20260423_gifts_sent.sql
git commit -m "feat(db): add gifts_sent event log table"
```

### Task 1.7: Extend `memories` with gift_ref and intimacy_weight

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_memories_gift_ref.sql`

- [ ] **Step 1: Write migration**

```sql
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS gift_ref TEXT,
  ADD COLUMN IF NOT EXISTS intimacy_weight NUMERIC(3,1) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'summary';

CREATE INDEX IF NOT EXISTS idx_memories_gift_lookup
  ON memories(user_id, girl_id, intimacy_weight DESC)
  WHERE gift_ref IS NOT NULL;

COMMENT ON COLUMN memories.gift_ref IS 'gift_catalog.id if this memory was created from a gift';
COMMENT ON COLUMN memories.intimacy_weight IS 'Higher = more likely to be referenced in chat-ai prompt';
COMMENT ON COLUMN memories.kind IS 'summary | gift | scene | milestone';
```

- [ ] **Step 2: Apply + commit**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/migrations/20260423_memories_gift_ref.sql
git commit -m "feat(db): extend memories with gift_ref, intimacy_weight, kind"
```

### Task 1.8: Atomic `spend_stars` RPC function

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_spend_stars_fn.sql`

- [ ] **Step 1: Write migration**

```sql
-- Atomically deduct stars and insert ledger row. Returns new balance or -1 if insufficient.
CREATE OR REPLACE FUNCTION spend_stars(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_id TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE profiles
     SET stars_balance = stars_balance - p_amount
   WHERE id = p_user_id AND stars_balance >= p_amount
  RETURNING stars_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1;  -- insufficient funds
  END IF;

  INSERT INTO stars_ledger (user_id, delta, reason, ref_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;

-- Atomically credit stars from a completed purchase.
CREATE OR REPLACE FUNCTION credit_stars(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_id TEXT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Idempotency: if ledger row with same (reason, ref_id) exists, return current balance.
  IF EXISTS (
    SELECT 1 FROM stars_ledger WHERE reason = p_reason AND ref_id = p_ref_id
  ) THEN
    SELECT stars_balance INTO v_new_balance FROM profiles WHERE id = p_user_id;
    RETURN v_new_balance;
  END IF;

  UPDATE profiles
     SET stars_balance = stars_balance + p_amount
   WHERE id = p_user_id
  RETURNING stars_balance INTO v_new_balance;

  INSERT INTO stars_ledger (user_id, delta, reason, ref_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION spend_stars(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION credit_stars(UUID, INT, TEXT, TEXT) TO service_role;
```

- [ ] **Step 2: Apply + commit**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/migrations/20260423_spend_stars_fn.sql
git commit -m "feat(db): add spend_stars and credit_stars RPC functions"
```

---

## Phase 2 — Edge Function: `billing-create-invoice`

> **⚠️ PIVOT NOTICE (2026-04-23):** Этот раздел исторический. Phase 2 был полностью переписан под **CryptoCloud** (крипто-эквайринг, USD). Telegram Stars / XTR / `createInvoiceLink` / `WebApp.openInvoice` отменены — Telegram остаётся ТОЛЬКО для верификации аккаунта (anti-spam). Финальный код: `supabase/functions/billing-create-invoice/{packs.ts,handler.ts,handler.test.ts,index.ts}`. Реальная реализация:
> - `POST https://api.cryptocloud.plus/v2/invoice/create` с header `Authorization: Token <CRYPTOCLOUD_API_KEY>` и body `{shop_id, amount, currency:"USD", order_id: purchase.id}`
> - Response `{status:"success", result:{uuid:"INV-XXXX", link:"https://pay.cryptocloud.plus/XXXX"}}` парсится с зачисткой `INV-` префикса
> - Возвращает `{ pay_url, invoice_id, purchase_id, pack: { id, stars, amount_usd } }` — фронт делает `window.location = pay_url`
> - Pack pricing — см. spec (`stars_100/$5`, `stars_550/$25 +10%`, `stars_2400/$100 +20%`, `stars_13000/$500 +30%`)
> - Env: `CRYPTOCLOUD_API_KEY`, `CRYPTOCLOUD_SHOP_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
>
> Tests passing: 5/5. Текст ниже сохранён для истории дизайн-решений (handler shape, pack-IDs, deps-injection pattern остались валидными).

**Context (HISTORICAL — Telegram Stars version):** Frontend POSTs `{ pack_id }`, we verify the user, create a `purchases` row (status=`pending`), call Telegram Bot API `createInvoiceLink` with a payload containing the purchase id, return `{ invoice_url, purchase_id }`. The client opens it via `WebApp.openInvoice(url)` inside Telegram or a standard `<a>` in browsers.

**Env vars required on edge runtime:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_STARS_CURRENCY` (always `XTR`)

### Task 2.1: Define pack catalog constants

**Files:**
- Create: `lumina-app/supabase/functions/billing-create-invoice/packs.ts`

- [ ] **Step 1: Write packs catalog**

```ts
export type PackId = 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000';

export interface Pack {
  id: PackId;
  stars: number;
  title: string;
  description: string;
}

export const PACKS: Record<PackId, Pack> = {
  stars_100:   { id: 'stars_100',   stars: 100,   title: '100 ⭐',    description: 'Starter pack — 100 Stars' },
  stars_550:   { id: 'stars_550',   stars: 550,   title: '550 ⭐',    description: 'Popular — 500 + 50 bonus' },
  stars_2400:  { id: 'stars_2400',  stars: 2400,  title: '2 400 ⭐',  description: 'Best value — 2000 + 400 bonus' },
  stars_13000: { id: 'stars_13000', stars: 13000, title: '13 000 ⭐', description: 'Whale pack — 10000 + 3000 bonus' },
};

export function isPackId(v: unknown): v is PackId {
  return typeof v === 'string' && v in PACKS;
}
```

### Task 2.2: TDD — write failing test for pack validation

**Files:**
- Create: `lumina-app/supabase/functions/billing-create-invoice/handler.ts` (stub)
- Create: `lumina-app/supabase/functions/billing-create-invoice/handler.test.ts`

- [ ] **Step 1: Create stub handler**

```ts
import type { PackId } from './packs.ts';

export interface CreateInvoiceDeps {
  createInvoiceLink: (args: { payload: string; stars: number; title: string; description: string }) => Promise<string>;
  insertPurchase: (args: { userId: string; packId: PackId; stars: number }) => Promise<{ id: string }>;
}

export interface CreateInvoiceRequest {
  userId: string;
  packId: string;
}

export interface CreateInvoiceResponse {
  invoice_url: string;
  purchase_id: string;
}

export async function handleCreateInvoice(
  _req: CreateInvoiceRequest,
  _deps: CreateInvoiceDeps,
): Promise<CreateInvoiceResponse> {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing test for "rejects unknown pack"**

```ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleCreateInvoice, type CreateInvoiceDeps } from './handler.ts';

function makeDeps(overrides: Partial<CreateInvoiceDeps> = {}): CreateInvoiceDeps {
  return {
    createInvoiceLink: async () => 'https://t.me/invoice/fake',
    insertPurchase: async () => ({ id: 'pur-1' }),
    ...overrides,
  };
}

Deno.test('rejects unknown pack id', async () => {
  await assertRejects(
    () => handleCreateInvoice({ userId: 'u1', packId: 'stars_9999' }, makeDeps()),
    Error,
    'invalid pack',
  );
});

Deno.test('creates purchase and returns invoice url for valid pack', async () => {
  const calls: Record<string, unknown> = {};
  const deps = makeDeps({
    insertPurchase: async (args) => { calls.insertPurchase = args; return { id: 'pur-42' }; },
    createInvoiceLink: async (args) => { calls.createInvoiceLink = args; return 'https://t.me/x'; },
  });
  const res = await handleCreateInvoice({ userId: 'u1', packId: 'stars_550' }, deps);
  assertEquals(res, { invoice_url: 'https://t.me/x', purchase_id: 'pur-42' });
  assertEquals((calls.insertPurchase as any).stars, 500);
  assertEquals((calls.createInvoiceLink as any).stars, 500);
  assertEquals((calls.createInvoiceLink as any).payload, 'purchase:pur-42');
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```powershell
deno test --allow-all lumina-app/supabase/functions/billing-create-invoice/handler.test.ts
```
Expected: both tests fail with `not implemented`.

### Task 2.3: Implement handler logic to make tests pass

**Files:**
- Modify: `lumina-app/supabase/functions/billing-create-invoice/handler.ts`

- [ ] **Step 1: Implement**

```ts
import { PACKS, isPackId, type PackId } from './packs.ts';

export interface CreateInvoiceDeps {
  createInvoiceLink: (args: { payload: string; stars: number; title: string; description: string }) => Promise<string>;
  insertPurchase: (args: { userId: string; packId: PackId; stars: number }) => Promise<{ id: string }>;
}

export interface CreateInvoiceRequest {
  userId: string;
  packId: string;
}

export interface CreateInvoiceResponse {
  invoice_url: string;
  purchase_id: string;
}

export async function handleCreateInvoice(
  req: CreateInvoiceRequest,
  deps: CreateInvoiceDeps,
): Promise<CreateInvoiceResponse> {
  if (!isPackId(req.packId)) {
    throw new Error(`invalid pack: ${req.packId}`);
  }
  const pack = PACKS[req.packId];
  const purchase = await deps.insertPurchase({
    userId: req.userId,
    packId: pack.id,
    stars: pack.stars,
  });
  const url = await deps.createInvoiceLink({
    payload: `purchase:${purchase.id}`,
    stars: pack.stars,
    title: pack.title,
    description: pack.description,
  });
  return { invoice_url: url, purchase_id: purchase.id };
}
```

- [ ] **Step 2: Run tests — expect PASS**

```powershell
deno test --allow-all lumina-app/supabase/functions/billing-create-invoice/handler.test.ts
```
Expected: 2 passed.

### Task 2.4: Write Deno.serve wrapper with CORS + auth

**Files:**
- Create: `lumina-app/supabase/functions/billing-create-invoice/index.ts`

- [ ] **Step 1: Write wrapper**

```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCreateInvoice } from './handler.ts';
import type { PackId } from './packs.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const TG_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function tgCreateInvoiceLink(args: { payload: string; stars: number; title: string; description: string }): Promise<string> {
  const body = {
    title: args.title,
    description: args.description,
    payload: args.payload,
    provider_token: '',              // empty for Telegram Stars (XTR)
    currency: 'XTR',
    prices: [{ label: args.title, amount: args.stars }],
  };
  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`telegram createInvoiceLink failed: ${json.description}`);
  return json.result as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: CORS_HEADERS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes, error: userErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userErr || !userRes?.user) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: CORS_HEADERS });
  const userId = userRes.user.id;

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: CORS_HEADERS }); }

  try {
    const result = await handleCreateInvoice(
      { userId, packId: body.pack_id },
      {
        createInvoiceLink: tgCreateInvoiceLink,
        insertPurchase: async (args) => {
          const { data, error } = await admin
            .from('purchases')
            .insert({
              user_id: args.userId,
              provider: 'telegram_stars',
              pack_id: args.packId,
              stars_amount: args.stars,
              status: 'pending',
            })
            .select('id')
            .single();
          if (error) throw error;
          return { id: data.id as string };
        },
      },
    );
    return new Response(JSON.stringify(result), { status: 200, headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: CORS_HEADERS });
  }
});
```

- [ ] **Step 2: Deploy**

```powershell
npx supabase@latest functions deploy billing-create-invoice --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 3: Set env secrets (if not already)**

```powershell
npx supabase@latest secrets set TELEGRAM_BOT_TOKEN=<token> --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 4: Commit**

```powershell
git add lumina-app/supabase/functions/billing-create-invoice/
git commit -m "feat(edge): billing-create-invoice with telegram stars"
```

---

## Phase 3 — Edge Function: `billing-webhook`

> **⚠️ PIVOT NOTICE (2026-04-23):** Phase 3 был переписан под **CryptoCloud postback**. Telegram Bot API (`pre_checkout_query`/`successful_payment`) больше не используется. Финальный код: `supabase/functions/billing-webhook/{handler.ts,handler.test.ts,index.ts}`. Реальная реализация:
> - CryptoCloud шлёт `POST` (JSON или form-encoded) с полями `{status, invoice_id, amount_crypto, currency, order_id, token, invoice_info:{invoice_status, amount_paid_usd}}`
> - `token` — JWT HS256, подписанный `CRYPTOCLOUD_SECRET_KEY` — верифицируется через Web Crypto (`crypto.subtle.importKey` + `sign` + timing-safe compare)
> - Success states: `paid` | `success` | `overpaid`. Остальные — игнор с `200 OK` (никаких ретраев)
> - Идемпотентность: `credit_stars(p_reason='purchase:cryptocloud', p_ref_id=invoice_id)` через UNIQUE `(reason, ref_id)` на `stars_ledger`
> - Amount tolerance: ≥99% от `purchase.fiat_amount` (защита от крипто-курсовых колебаний)
> - Deploy с `--no-verify-jwt` (CryptoCloud не шлёт Supabase JWT)
> - Env: `CRYPTOCLOUD_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
>
> Tests passing: 7/7. Текст ниже сохранён для истории (idempotency pattern, error policy "always 200" остались валидными).

**Context (HISTORICAL — Telegram Stars version):** Telegram sends `pre_checkout_query` + successful payment updates to a webhook. We verify the payment is ours (via payload = `purchase:<purchase_id>`), mark `purchases.status='completed'`, call `credit_stars` RPC (idempotent by `(reason, ref_id)`), and answer Telegram.

This is **security-critical** and **money-critical**. TDD is mandatory.

### Task 3.1: TDD — webhook payload validation

**Files:**
- Create: `lumina-app/supabase/functions/billing-webhook/handler.ts`
- Create: `lumina-app/supabase/functions/billing-webhook/handler.test.ts`

- [ ] **Step 1: Create stub**

```ts
export interface WebhookDeps {
  findPurchase: (purchaseId: string) => Promise<{ id: string; user_id: string; stars_amount: number; status: string } | null>;
  markCompleted: (args: { purchaseId: string; providerPaymentId: string }) => Promise<void>;
  creditStars: (args: { userId: string; amount: number; refId: string }) => Promise<number>;
}

export interface TelegramSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface WebhookOutcome {
  status: 'ok' | 'ignored' | 'duplicate';
  balance?: number;
}

export async function handleSuccessfulPayment(
  _payment: TelegramSuccessfulPayment,
  _deps: WebhookDeps,
): Promise<WebhookOutcome> {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleSuccessfulPayment, type WebhookDeps, type TelegramSuccessfulPayment } from './handler.ts';

function baseDeps(over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    findPurchase: async () => ({ id: 'pur-1', user_id: 'u1', stars_amount: 500, status: 'pending' }),
    markCompleted: async () => {},
    creditStars: async () => 500,
    ...over,
  };
}

function payment(over: Partial<TelegramSuccessfulPayment> = {}): TelegramSuccessfulPayment {
  return {
    currency: 'XTR',
    total_amount: 500,
    invoice_payload: 'purchase:pur-1',
    telegram_payment_charge_id: 'tg-charge-1',
    provider_payment_charge_id: 'prov-1',
    ...over,
  };
}

Deno.test('rejects non-XTR currency', async () => {
  await assertRejects(
    () => handleSuccessfulPayment(payment({ currency: 'USD' }), baseDeps()),
    Error,
    'currency',
  );
});

Deno.test('rejects malformed payload', async () => {
  await assertRejects(
    () => handleSuccessfulPayment(payment({ invoice_payload: 'garbage' }), baseDeps()),
    Error,
    'payload',
  );
});

Deno.test('returns ignored when purchase not found', async () => {
  const res = await handleSuccessfulPayment(payment(), baseDeps({ findPurchase: async () => null }));
  assertEquals(res, { status: 'ignored' });
});

Deno.test('returns duplicate when purchase already completed', async () => {
  const res = await handleSuccessfulPayment(
    payment(),
    baseDeps({ findPurchase: async () => ({ id: 'pur-1', user_id: 'u1', stars_amount: 500, status: 'completed' }) }),
  );
  assertEquals(res.status, 'duplicate');
});

Deno.test('rejects when amount mismatches', async () => {
  await assertRejects(
    () => handleSuccessfulPayment(payment({ total_amount: 499 }), baseDeps()),
    Error,
    'amount',
  );
});

Deno.test('credits stars and marks completed on happy path', async () => {
  const called: Record<string, unknown> = {};
  const res = await handleSuccessfulPayment(payment(), baseDeps({
    markCompleted: async (args) => { called.markCompleted = args; },
    creditStars: async (args) => { called.creditStars = args; return 1500; },
  }));
  assertEquals(res, { status: 'ok', balance: 1500 });
  assertEquals((called.markCompleted as any).purchaseId, 'pur-1');
  assertEquals((called.markCompleted as any).providerPaymentId, 'tg-charge-1');
  assertEquals((called.creditStars as any), { userId: 'u1', amount: 500, refId: 'tg-charge-1' });
});
```

- [ ] **Step 3: Run — expect FAIL on all 6**

```powershell
deno test --allow-all lumina-app/supabase/functions/billing-webhook/handler.test.ts
```

### Task 3.2: Implement handler

**Files:**
- Modify: `lumina-app/supabase/functions/billing-webhook/handler.ts`

- [ ] **Step 1: Implement**

```ts
export interface WebhookDeps {
  findPurchase: (purchaseId: string) => Promise<{ id: string; user_id: string; stars_amount: number; status: string } | null>;
  markCompleted: (args: { purchaseId: string; providerPaymentId: string }) => Promise<void>;
  creditStars: (args: { userId: string; amount: number; refId: string }) => Promise<number>;
}

export interface TelegramSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface WebhookOutcome {
  status: 'ok' | 'ignored' | 'duplicate';
  balance?: number;
}

const PAYLOAD_RE = /^purchase:([0-9a-f-]{36})$/i;

export async function handleSuccessfulPayment(
  payment: TelegramSuccessfulPayment,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  if (payment.currency !== 'XTR') {
    throw new Error(`unexpected currency: ${payment.currency}`);
  }
  const m = PAYLOAD_RE.exec(payment.invoice_payload);
  if (!m) throw new Error(`bad payload: ${payment.invoice_payload}`);
  const purchaseId = m[1];

  const purchase = await deps.findPurchase(purchaseId);
  if (!purchase) return { status: 'ignored' };
  if (purchase.status === 'completed') return { status: 'duplicate' };

  if (payment.total_amount !== purchase.stars_amount) {
    throw new Error(`amount mismatch: expected ${purchase.stars_amount}, got ${payment.total_amount}`);
  }

  await deps.markCompleted({ purchaseId, providerPaymentId: payment.telegram_payment_charge_id });
  const balance = await deps.creditStars({
    userId: purchase.user_id,
    amount: purchase.stars_amount,
    refId: payment.telegram_payment_charge_id,
  });
  return { status: 'ok', balance };
}
```

- [ ] **Step 2: Run — expect PASS on all 6**

```powershell
deno test --allow-all lumina-app/supabase/functions/billing-webhook/handler.test.ts
```

### Task 3.3: Telegram webhook wrapper (pre_checkout_query + successful_payment)

**Files:**
- Create: `lumina-app/supabase/functions/billing-webhook/index.ts`

- [ ] **Step 1: Write wrapper**

```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleSuccessfulPayment } from './handler.ts';

const TG_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function answerPreCheckout(id: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: id, ok, error_message: errorMessage }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // Telegram includes this header when secret_token is configured via setWebhook.
  const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });

  const update: any = await req.json();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  if (update.pre_checkout_query) {
    // Always approve; real validation happens on successful_payment.
    await answerPreCheckout(update.pre_checkout_query.id, true);
    return new Response('ok');
  }

  const msg = update.message;
  if (msg?.successful_payment) {
    try {
      await handleSuccessfulPayment(msg.successful_payment, {
        findPurchase: async (id) => {
          const { data } = await admin.from('purchases').select('id,user_id,stars_amount,status').eq('id', id).maybeSingle();
          return data as any;
        },
        markCompleted: async ({ purchaseId, providerPaymentId }) => {
          await admin.from('purchases').update({
            status: 'completed',
            provider_payment_id: providerPaymentId,
            completed_at: new Date().toISOString(),
          }).eq('id', purchaseId);
        },
        creditStars: async ({ userId, amount, refId }) => {
          const { data, error } = await admin.rpc('credit_stars', {
            p_user_id: userId,
            p_amount: amount,
            p_reason: `purchase:telegram_stars`,
            p_ref_id: refId,
          });
          if (error) throw error;
          return data as number;
        },
      });
    } catch (e) {
      console.error('webhook error', e);
      // Still return 200 to Telegram to avoid retry storms; we've logged + will reconcile manually.
    }
  }

  return new Response('ok');
});
```

- [ ] **Step 2: Deploy**

```powershell
npx supabase@latest functions deploy billing-webhook --project-ref rfmcpnpdqbhecwtodyaz --no-verify-jwt
npx supabase@latest secrets set TELEGRAM_WEBHOOK_SECRET=<random 32 chars> --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 3: Register webhook with Telegram**

```powershell
curl.exe -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -H "Content-Type: application/json" -d '{"url":"https://rfmcpnpdqbhecwtodyaz.functions.supabase.co/billing-webhook","secret_token":"<SECRET>","allowed_updates":["pre_checkout_query","message"]}'
```
Expected: `{"ok":true, "result":true}`.

- [ ] **Step 4: Commit**

```powershell
git add lumina-app/supabase/functions/billing-webhook/
git commit -m "feat(edge): billing-webhook with telegram stars verification"
```

---

## Phase 4 — Edge Function: `gift-send`

**Context:** User picks a gift from catalog and sends it to their girl. We must atomically: (1) validate gift exists and is active; (2) spend_stars (RPC — rejects if insufficient); (3) insert `gifts_sent`; (4) insert `memories` row with rendered template + `intimacy_weight`; (5) upsert `girl_relationships` with `intimacy_level += delta`; (6) if `is_trigger_event`, set `pending_scene_marker`.

Pure handler is TDD-tested. Wrapper is DB-integration-tested manually.

### Task 4.1: TDD — gift handler validations

**Files:**
- Create: `lumina-app/supabase/functions/gift-send/handler.ts`
- Create: `lumina-app/supabase/functions/gift-send/handler.test.ts`

- [ ] **Step 1: Stub handler**

```ts
export interface GiftCatalogEntry {
  id: string;
  category: string;
  name_ru: string;
  name_en: string;
  price_stars: number;
  emoji: string;
  memory_template_ru: string;
  memory_template_en: string;
  intimacy_delta: number;
  is_trigger_event: boolean;
  trigger_scene_id: string | null;
  active: boolean;
}

export interface GiftSendDeps {
  loadGift: (giftId: string) => Promise<GiftCatalogEntry | null>;
  spendStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  insertGiftSent: (args: { id: string; userId: string; girlId: string; giftId: string; stars: number; delta: number }) => Promise<void>;
  insertMemory: (args: { userId: string; girlId: string; summary: string; giftRef: string; intimacyWeight: number; kind: 'gift' }) => Promise<{ id: string }>;
  bumpIntimacy: (args: { userId: string; girlId: string; delta: number; sceneMarker: string | null }) => Promise<number>;
  newUuid: () => string;
  todayLocal: (userId: string) => Promise<string>; // 'YYYY-MM-DD' for memory template
}

export interface GiftSendResult {
  new_balance: number;
  memory_id: string;
  intimacy_level: number;
  gift_id: string;
}

export async function handleGiftSend(
  _req: { userId: string; girlId: string; giftId: string; lang: 'ru' | 'en' },
  _deps: GiftSendDeps,
): Promise<GiftSendResult> {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleGiftSend, type GiftSendDeps, type GiftCatalogEntry } from './handler.ts';

function gift(over: Partial<GiftCatalogEntry> = {}): GiftCatalogEntry {
  return {
    id: 'rose',
    category: 'gift',
    name_ru: 'Роза', name_en: 'Rose',
    price_stars: 20,
    emoji: '🌹',
    memory_template_ru: 'Он подарил мне розу {date}.',
    memory_template_en: 'He gave me a rose on {date}.',
    intimacy_delta: 0.1,
    is_trigger_event: false,
    trigger_scene_id: null,
    active: true,
    ...over,
  };
}

function makeDeps(over: Partial<GiftSendDeps> = {}): GiftSendDeps {
  return {
    loadGift: async () => gift(),
    spendStars: async () => 480,
    insertGiftSent: async () => {},
    insertMemory: async () => ({ id: 'mem-1' }),
    bumpIntimacy: async () => 1.1,
    newUuid: () => 'gift-uuid-1',
    todayLocal: async () => '2026-04-23',
    ...over,
  };
}

Deno.test('rejects unknown gift', async () => {
  await assertRejects(
    () => handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'xxx', lang: 'ru' }, makeDeps({ loadGift: async () => null })),
    Error,
    'unknown',
  );
});

Deno.test('rejects inactive gift', async () => {
  await assertRejects(
    () => handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({ loadGift: async () => gift({ active: false }) })),
    Error,
    'unavailable',
  );
});

Deno.test('rejects when insufficient funds (spendStars returns -1)', async () => {
  await assertRejects(
    () => handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({ spendStars: async () => -1 })),
    Error,
    'insufficient',
  );
});

Deno.test('renders RU memory template with date', async () => {
  let capturedSummary = '';
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({
    insertMemory: async (args) => { capturedSummary = args.summary; return { id: 'mem-1' }; },
  }));
  assertEquals(capturedSummary, 'Он подарил мне розу 2026-04-23.');
});

Deno.test('renders EN memory template with date', async () => {
  let capturedSummary = '';
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'en' }, makeDeps({
    insertMemory: async (args) => { capturedSummary = args.summary; return { id: 'mem-1' }; },
  }));
  assertEquals(capturedSummary, 'He gave me a rose on 2026-04-23.');
});

Deno.test('trigger event sets scene marker on intimacy bump', async () => {
  let capturedMarker: string | null = 'unset';
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'date_dinner', lang: 'ru' }, makeDeps({
    loadGift: async () => gift({ id: 'date_dinner', is_trigger_event: true, trigger_scene_id: 'first_night', intimacy_delta: 1.5 }),
    bumpIntimacy: async (args) => { capturedMarker = args.sceneMarker; return 2.6; },
  }));
  assertEquals(capturedMarker, 'first_night');
});

Deno.test('happy path returns new balance, memory id, intimacy', async () => {
  const res = await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'rose', lang: 'ru' }, makeDeps({
    spendStars: async () => 480,
    insertMemory: async () => ({ id: 'mem-42' }),
    bumpIntimacy: async () => 1.2,
  }));
  assertEquals(res, { new_balance: 480, memory_id: 'mem-42', intimacy_level: 1.2, gift_id: 'rose' });
});

Deno.test('sets intimacy_weight = intimacy_delta * 3 (clamped to 3.0)', async () => {
  let weight = -1;
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'ring', lang: 'ru' }, makeDeps({
    loadGift: async () => gift({ id: 'ring', intimacy_delta: 0.8, price_stars: 500 }),
    insertMemory: async (args) => { weight = args.intimacyWeight; return { id: 'm' }; },
  }));
  assertEquals(weight, 2.4); // 0.8 * 3 = 2.4, under cap
});

Deno.test('clamps intimacy_weight at 3.0 for very expensive gifts', async () => {
  let weight = -1;
  await handleGiftSend({ userId: 'u', girlId: 'g', giftId: 'trip', lang: 'ru' }, makeDeps({
    loadGift: async () => gift({ id: 'trip', intimacy_delta: 3.5, price_stars: 5000 }),
    insertMemory: async (args) => { weight = args.intimacyWeight; return { id: 'm' }; },
  }));
  assertEquals(weight, 3.0);
});
```

- [ ] **Step 3: Run — expect 9 fails**

```powershell
deno test --allow-all lumina-app/supabase/functions/gift-send/handler.test.ts
```

### Task 4.2: Implement gift-send handler

**Files:**
- Modify: `lumina-app/supabase/functions/gift-send/handler.ts`

- [ ] **Step 1: Implement**

```ts
export interface GiftCatalogEntry {
  id: string;
  category: string;
  name_ru: string;
  name_en: string;
  price_stars: number;
  emoji: string;
  memory_template_ru: string;
  memory_template_en: string;
  intimacy_delta: number;
  is_trigger_event: boolean;
  trigger_scene_id: string | null;
  active: boolean;
}

export interface GiftSendDeps {
  loadGift: (giftId: string) => Promise<GiftCatalogEntry | null>;
  spendStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  insertGiftSent: (args: { id: string; userId: string; girlId: string; giftId: string; stars: number; delta: number }) => Promise<void>;
  insertMemory: (args: { userId: string; girlId: string; summary: string; giftRef: string; intimacyWeight: number; kind: 'gift' }) => Promise<{ id: string }>;
  bumpIntimacy: (args: { userId: string; girlId: string; delta: number; sceneMarker: string | null }) => Promise<number>;
  newUuid: () => string;
  todayLocal: (userId: string) => Promise<string>;
}

export interface GiftSendResult {
  new_balance: number;
  memory_id: string;
  intimacy_level: number;
  gift_id: string;
}

const INTIMACY_WEIGHT_CAP = 3.0;

export async function handleGiftSend(
  req: { userId: string; girlId: string; giftId: string; lang: 'ru' | 'en' },
  deps: GiftSendDeps,
): Promise<GiftSendResult> {
  const gift = await deps.loadGift(req.giftId);
  if (!gift) throw new Error(`unknown gift: ${req.giftId}`);
  if (!gift.active) throw new Error(`gift unavailable: ${req.giftId}`);

  const giftSentId = deps.newUuid();
  const newBalance = await deps.spendStars({
    userId: req.userId,
    amount: gift.price_stars,
    reason: `spend:gift:${gift.id}`,
    refId: giftSentId,
  });
  if (newBalance < 0) throw new Error('insufficient stars');

  await deps.insertGiftSent({
    id: giftSentId,
    userId: req.userId,
    girlId: req.girlId,
    giftId: gift.id,
    stars: gift.price_stars,
    delta: gift.intimacy_delta,
  });

  const date = await deps.todayLocal(req.userId);
  const template = req.lang === 'en' ? gift.memory_template_en : gift.memory_template_ru;
  const summary = template.replace('{date}', date);
  const weight = Math.min(gift.intimacy_delta * 3, INTIMACY_WEIGHT_CAP);

  const memory = await deps.insertMemory({
    userId: req.userId,
    girlId: req.girlId,
    summary,
    giftRef: gift.id,
    intimacyWeight: weight,
    kind: 'gift',
  });

  const newIntimacy = await deps.bumpIntimacy({
    userId: req.userId,
    girlId: req.girlId,
    delta: gift.intimacy_delta,
    sceneMarker: gift.is_trigger_event ? gift.trigger_scene_id : null,
  });

  return {
    new_balance: newBalance,
    memory_id: memory.id,
    intimacy_level: newIntimacy,
    gift_id: gift.id,
  };
}
```

- [ ] **Step 2: Run — expect 9 pass**

```powershell
deno test --allow-all lumina-app/supabase/functions/gift-send/handler.test.ts
```

### Task 4.3: `bump_intimacy` RPC helper

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_bump_intimacy_fn.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION bump_intimacy(
  p_user_id UUID,
  p_girl_id TEXT,
  p_delta NUMERIC,
  p_scene_marker TEXT DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new NUMERIC;
  v_expires TIMESTAMPTZ;
BEGIN
  v_expires := CASE WHEN p_scene_marker IS NULL THEN NULL ELSE now() + interval '1 day' END;

  INSERT INTO girl_relationships (user_id, girl_id, intimacy_level, intimacy_last_recomputed_at, pending_scene_marker, pending_scene_expires_at)
  VALUES (p_user_id, p_girl_id, LEAST(10, GREATEST(0, p_delta)), now(), p_scene_marker, v_expires)
  ON CONFLICT (user_id, girl_id)
  DO UPDATE SET
    intimacy_level = LEAST(10, GREATEST(0, girl_relationships.intimacy_level + EXCLUDED.intimacy_level)),
    intimacy_last_recomputed_at = now(),
    pending_scene_marker = COALESCE(EXCLUDED.pending_scene_marker, girl_relationships.pending_scene_marker),
    pending_scene_expires_at = COALESCE(EXCLUDED.pending_scene_expires_at, girl_relationships.pending_scene_expires_at),
    updated_at = now()
  RETURNING intimacy_level INTO v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION bump_intimacy(UUID, TEXT, NUMERIC, TEXT) TO service_role;
```

- [ ] **Step 2: Apply + commit**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/migrations/20260423_bump_intimacy_fn.sql
git commit -m "feat(db): add bump_intimacy RPC"
```

### Task 4.4: Gift-send Deno.serve wrapper

**Files:**
- Create: `lumina-app/supabase/functions/gift-send/index.ts`

- [ ] **Step 1: Write wrapper**

```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleGiftSend } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: ur } = await admin.auth.getUser(auth.replace('Bearer ', ''));
  if (!ur?.user) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  const userId = ur.user.id;

  const body: any = await req.json();
  const { girl_id, gift_id, lang } = body ?? {};
  if (!girl_id || !gift_id) return new Response(JSON.stringify({ error: 'bad params' }), { status: 400, headers: CORS });

  try {
    const result = await handleGiftSend(
      { userId, girlId: girl_id, giftId: gift_id, lang: lang === 'en' ? 'en' : 'ru' },
      {
        loadGift: async (id) => {
          const { data } = await admin.from('gift_catalog').select('*').eq('id', id).maybeSingle();
          return data as any;
        },
        spendStars: async ({ userId, amount, reason, refId }) => {
          const { data, error } = await admin.rpc('spend_stars', {
            p_user_id: userId, p_amount: amount, p_reason: reason, p_ref_id: refId,
          });
          if (error) throw error;
          return data as number;
        },
        insertGiftSent: async (args) => {
          const { error } = await admin.from('gifts_sent').insert({
            id: args.id,
            user_id: args.userId,
            girl_id: args.girlId,
            gift_id: args.giftId,
            stars_spent: args.stars,
            intimacy_delta_applied: args.delta,
          });
          if (error) throw error;
        },
        insertMemory: async (args) => {
          const { data, error } = await admin.from('memories').insert({
            user_id: args.userId,
            girl_id: args.girlId,
            summary: args.summary,
            gift_ref: args.giftRef,
            intimacy_weight: args.intimacyWeight,
            kind: args.kind,
          }).select('id').single();
          if (error) throw error;
          return { id: data.id as string };
        },
        bumpIntimacy: async ({ userId, girlId, delta, sceneMarker }) => {
          const { data, error } = await admin.rpc('bump_intimacy', {
            p_user_id: userId, p_girl_id: girlId, p_delta: delta, p_scene_marker: sceneMarker,
          });
          if (error) throw error;
          return data as number;
        },
        newUuid: () => crypto.randomUUID(),
        todayLocal: async (userId) => {
          const { data } = await admin.from('profiles').select('tz_offset_minutes').eq('id', userId).maybeSingle();
          const offset = (data?.tz_offset_minutes as number) ?? 0;
          const d = new Date(Date.now() + offset * 60_000);
          return d.toISOString().slice(0, 10);
        },
      },
    );
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes('insufficient') ? 402 : msg.includes('unknown') || msg.includes('unavailable') ? 404 : 400;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
});
```

- [ ] **Step 2: Deploy + commit**

```powershell
npx supabase@latest functions deploy gift-send --project-ref rfmcpnpdqbhecwtodyaz
git add lumina-app/supabase/functions/gift-send/
git commit -m "feat(edge): gift-send with atomic spend+memory+intimacy"
```

---

## Phase 5 — Edge Function: `messages-buy-pack`

**Context:** Frontend calls this when user hits `daily_limit` in chat and chooses "+100 messages = 100⭐". It's a simple wrapper over `spend_stars` + increment `messages_bought_today`. Single pack (100⭐ for +100 messages) at v1.

### Task 5.1: TDD — buy-pack handler

**Files:**
- Create: `lumina-app/supabase/functions/messages-buy-pack/handler.ts`
- Create: `lumina-app/supabase/functions/messages-buy-pack/handler.test.ts`

- [ ] **Step 1: Stub**

```ts
export const MSG_PACK_STARS = 100;
export const MSG_PACK_MESSAGES = 100;

export interface BuyPackDeps {
  spendStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  bumpBoughtToday: (args: { userId: string; addMessages: number }) => Promise<number>;
  newUuid: () => string;
}

export interface BuyPackResult {
  new_balance: number;
  bought_today: number;
  added: number;
}

export async function handleBuyMessagePack(
  _req: { userId: string },
  _deps: BuyPackDeps,
): Promise<BuyPackResult> {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```ts
import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleBuyMessagePack, type BuyPackDeps, MSG_PACK_STARS, MSG_PACK_MESSAGES } from './handler.ts';

function deps(over: Partial<BuyPackDeps> = {}): BuyPackDeps {
  return {
    spendStars: async () => 0,
    bumpBoughtToday: async () => MSG_PACK_MESSAGES,
    newUuid: () => 'pack-uuid-1',
    ...over,
  };
}

Deno.test('spends exactly MSG_PACK_STARS', async () => {
  let spent = 0;
  await handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async (args) => { spent = args.amount; return 0; } }));
  assertEquals(spent, MSG_PACK_STARS);
});

Deno.test('uses reason=spend:messages:pack and unique ref_id', async () => {
  let reason = '';
  let refId = '';
  await handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async (args) => { reason = args.reason; refId = args.refId; return 0; } }));
  assertEquals(reason, 'spend:messages:pack');
  assertEquals(refId, 'pack-uuid-1');
});

Deno.test('rejects on insufficient stars (spend returns -1)', async () => {
  await assertRejects(
    () => handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async () => -1 })),
    Error,
    'insufficient',
  );
});

Deno.test('bumps bought_today by MSG_PACK_MESSAGES', async () => {
  let added = 0;
  await handleBuyMessagePack({ userId: 'u' }, deps({ bumpBoughtToday: async (args) => { added = args.addMessages; return 200; } }));
  assertEquals(added, MSG_PACK_MESSAGES);
});

Deno.test('returns balance, bought_today, added', async () => {
  const res = await handleBuyMessagePack({ userId: 'u' }, deps({ spendStars: async () => 400, bumpBoughtToday: async () => 100 }));
  assertEquals(res, { new_balance: 400, bought_today: 100, added: MSG_PACK_MESSAGES });
});
```

- [ ] **Step 3: Run — expect 5 fails**

```powershell
deno test --allow-all lumina-app/supabase/functions/messages-buy-pack/handler.test.ts
```

### Task 5.2: Implement handler

**Files:**
- Modify: `lumina-app/supabase/functions/messages-buy-pack/handler.ts`

- [ ] **Step 1: Implement**

```ts
export const MSG_PACK_STARS = 100;
export const MSG_PACK_MESSAGES = 100;

export interface BuyPackDeps {
  spendStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  bumpBoughtToday: (args: { userId: string; addMessages: number }) => Promise<number>;
  newUuid: () => string;
}

export interface BuyPackResult {
  new_balance: number;
  bought_today: number;
  added: number;
}

export async function handleBuyMessagePack(
  req: { userId: string },
  deps: BuyPackDeps,
): Promise<BuyPackResult> {
  const refId = deps.newUuid();
  const newBalance = await deps.spendStars({
    userId: req.userId,
    amount: MSG_PACK_STARS,
    reason: 'spend:messages:pack',
    refId,
  });
  if (newBalance < 0) throw new Error('insufficient stars');
  const boughtToday = await deps.bumpBoughtToday({ userId: req.userId, addMessages: MSG_PACK_MESSAGES });
  return { new_balance: newBalance, bought_today: boughtToday, added: MSG_PACK_MESSAGES };
}
```

- [ ] **Step 2: Run tests — expect 5 pass**

```powershell
deno test --allow-all lumina-app/supabase/functions/messages-buy-pack/handler.test.ts
```

### Task 5.3: Wrapper + deploy

**Files:**
- Create: `lumina-app/supabase/functions/messages-buy-pack/index.ts`

- [ ] **Step 1: Write wrapper**

```ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleBuyMessagePack } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: ur } = await admin.auth.getUser(auth.replace('Bearer ', ''));
  if (!ur?.user) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  const userId = ur.user.id;

  try {
    const result = await handleBuyMessagePack({ userId }, {
      spendStars: async ({ userId, amount, reason, refId }) => {
        const { data, error } = await admin.rpc('spend_stars', {
          p_user_id: userId, p_amount: amount, p_reason: reason, p_ref_id: refId,
        });
        if (error) throw error;
        return data as number;
      },
      bumpBoughtToday: async ({ userId, addMessages }) => {
        // Atomic increment via RPC
        const { data, error } = await admin.rpc('bump_messages_bought', {
          p_user_id: userId, p_amount: addMessages,
        });
        if (error) throw error;
        return data as number;
      },
      newUuid: () => crypto.randomUUID(),
    });
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes('insufficient') ? 402 : 400;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
});
```

- [ ] **Step 2: Add `bump_messages_bought` RPC migration**

Create `lumina-app/supabase/migrations/20260423_bump_messages_bought.sql`:

```sql
CREATE OR REPLACE FUNCTION bump_messages_bought(
  p_user_id UUID,
  p_amount INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE profiles
     SET messages_bought_today = messages_bought_today + p_amount
   WHERE id = p_user_id
  RETURNING messages_bought_today INTO v_new;
  RETURN COALESCE(v_new, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION bump_messages_bought(UUID, INT) TO service_role;
```

- [ ] **Step 3: Apply migration + deploy edge function**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
npx supabase@latest functions deploy messages-buy-pack --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 4: Commit**

```powershell
git add lumina-app/supabase/functions/messages-buy-pack/ lumina-app/supabase/migrations/20260423_bump_messages_bought.sql
git commit -m "feat(edge): messages-buy-pack for +100 messages per 100 stars"
```

---

## Phase 6 — `chat-ai` Modifications

**Context:** `chat-ai` must now:
1. **Gate on daily limit** — check `messages_used_today < 100 + messages_bought_today`. If not, return 429 with in-character message.
2. **Atomically increment** `messages_used_today` on successful user message.
3. **Reset counter** when local midnight has passed (based on `tz_offset_minutes`).
4. **Read intimacy_level** from `girl_relationships` and inject as `[INTIMACY LEVEL: X.X — <guidance>]` into system prompt.
5. **Read top 5 gift memories** (`memories.gift_ref IS NOT NULL ORDER BY intimacy_weight DESC`) and inject as `[SHE REMEMBERS GIFTS: ...]`.
6. **Consume pending scene marker** if set — inject one-turn scene directive, then clear the marker.

### Task 6.1: TDD — daily-limit gate logic (pure)

**Files:**
- Create: `lumina-app/supabase/functions/chat-ai/limit.ts`
- Create: `lumina-app/supabase/functions/chat-ai/limit.test.ts`

- [ ] **Step 1: Stub pure limit helpers**

```ts
export interface LimitSnapshot {
  messages_used_today: number;
  messages_bought_today: number;
  messages_reset_at: string | null;
  tz_offset_minutes: number;
}

export const BASE_DAILY_LIMIT = 100;

export interface LimitDecision {
  allowed: boolean;
  reset_needed: boolean;
  remaining: number;
  quota: number;
}

export function decideLimit(_snap: LimitSnapshot, _now: Date): LimitDecision {
  throw new Error('not implemented');
}

export function nextResetAt(_tzOffsetMinutes: number, _now: Date): string {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { decideLimit, nextResetAt, BASE_DAILY_LIMIT } from './limit.ts';

Deno.test('allows when under base limit and no reset needed', () => {
  const snap = { messages_used_today: 50, messages_bought_today: 0, messages_reset_at: '2099-01-01T00:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r, { allowed: true, reset_needed: false, remaining: 50, quota: 100 });
});

Deno.test('blocks when at base limit and no bought quota', () => {
  const snap = { messages_used_today: 100, messages_bought_today: 0, messages_reset_at: '2099-01-01T00:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.allowed, false);
  assertEquals(r.remaining, 0);
  assertEquals(r.quota, 100);
});

Deno.test('allows when at base but bought quota present', () => {
  const snap = { messages_used_today: 100, messages_bought_today: 100, messages_reset_at: '2099-01-01T00:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.allowed, true);
  assertEquals(r.quota, 200);
  assertEquals(r.remaining, 100);
});

Deno.test('signals reset when messages_reset_at is in the past', () => {
  const snap = { messages_used_today: 100, messages_bought_today: 0, messages_reset_at: '2026-04-22T23:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.reset_needed, true);
  assertEquals(r.allowed, true);
});

Deno.test('signals reset when messages_reset_at is null (first-ever call)', () => {
  const snap = { messages_used_today: 0, messages_bought_today: 0, messages_reset_at: null, tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.reset_needed, true);
});

Deno.test('nextResetAt computes next local midnight in UTC', () => {
  // user in UTC+180 (GMT+3). 2026-04-23T12:00Z = 2026-04-23T15:00 local. Next local midnight = 2026-04-24T00:00 local = 2026-04-23T21:00Z.
  const r = nextResetAt(180, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r, '2026-04-23T21:00:00.000Z');
});

Deno.test('nextResetAt when already past local midnight same UTC day', () => {
  // user in UTC+180. UTC 21:05 = local 00:05 (next day). Next local midnight = local day+1 00:00 = UTC 21:00 next day.
  const r = nextResetAt(180, new Date('2026-04-23T21:05:00Z'));
  assertEquals(r, '2026-04-24T21:00:00.000Z');
});
```

- [ ] **Step 3: Run — expect 7 fails**

```powershell
deno test --allow-all lumina-app/supabase/functions/chat-ai/limit.test.ts
```

### Task 6.2: Implement limit helpers

**Files:**
- Modify: `lumina-app/supabase/functions/chat-ai/limit.ts`

- [ ] **Step 1: Implement**

```ts
export interface LimitSnapshot {
  messages_used_today: number;
  messages_bought_today: number;
  messages_reset_at: string | null;
  tz_offset_minutes: number;
}

export const BASE_DAILY_LIMIT = 100;

export interface LimitDecision {
  allowed: boolean;
  reset_needed: boolean;
  remaining: number;
  quota: number;
}

export function decideLimit(snap: LimitSnapshot, now: Date): LimitDecision {
  const reset_needed = !snap.messages_reset_at || new Date(snap.messages_reset_at).getTime() <= now.getTime();
  const used = reset_needed ? 0 : snap.messages_used_today;
  const bought = reset_needed ? 0 : snap.messages_bought_today;
  const quota = BASE_DAILY_LIMIT + bought;
  const remaining = Math.max(0, quota - used);
  return { allowed: used < quota, reset_needed, remaining, quota };
}

export function nextResetAt(tzOffsetMinutes: number, now: Date): string {
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const nextLocalMidnightMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 0, 0, 0, 0);
  const utcMs = nextLocalMidnightMs - tzOffsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}
```

- [ ] **Step 2: Run — expect 7 pass**

```powershell
deno test --allow-all lumina-app/supabase/functions/chat-ai/limit.test.ts
```

### Task 6.3: TDD — prompt-injection builders (intimacy + gift memories)

**Files:**
- Create: `lumina-app/supabase/functions/chat-ai/prompt-injections.ts`
- Create: `lumina-app/supabase/functions/chat-ai/prompt-injections.test.ts`

- [ ] **Step 1: Stub builders**

```ts
export interface GiftMemoryRow {
  summary: string;
  gift_ref: string;
  intimacy_weight: number;
  created_at: string;
}

export function buildIntimacyBlock(_level: number, _lang: 'ru' | 'en'): string {
  throw new Error('not implemented');
}

export function buildGiftMemoriesBlock(_rows: GiftMemoryRow[], _lang: 'ru' | 'en'): string {
  throw new Error('not implemented');
}

export function buildSceneDirectiveBlock(_sceneId: string | null, _lang: 'ru' | 'en'): string {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```ts
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildIntimacyBlock, buildGiftMemoriesBlock, buildSceneDirectiveBlock } from './prompt-injections.ts';

Deno.test('intimacy block at level <5 ru: regular relationship', () => {
  const s = buildIntimacyBlock(3.0, 'ru');
  assertStringIncludes(s, 'INTIMACY');
  assertStringIncludes(s, '3.0');
  assertStringIncludes(s, 'дружелюбно');
});

Deno.test('intimacy block at level 5-7 ru: flirt hints', () => {
  const s = buildIntimacyBlock(6.0, 'ru');
  assertStringIncludes(s, 'флиртовать');
});

Deno.test('intimacy block at level 8+ ru: explicit allowed', () => {
  const s = buildIntimacyBlock(8.5, 'ru');
  assertStringIncludes(s, 'откровенн');
});

Deno.test('intimacy block at level 8+ en: explicit allowed', () => {
  const s = buildIntimacyBlock(8.5, 'en');
  assertStringIncludes(s, 'explicit');
});

Deno.test('gift memories empty returns empty string', () => {
  assertEquals(buildGiftMemoriesBlock([], 'ru'), '');
});

Deno.test('gift memories formats top rows with summary', () => {
  const rows = [
    { summary: 'Он подарил мне розу 2026-04-20.', gift_ref: 'rose', intimacy_weight: 0.3, created_at: '2026-04-20T00:00:00Z' },
    { summary: 'Кольцо 2026-04-22.', gift_ref: 'ring', intimacy_weight: 2.4, created_at: '2026-04-22T00:00:00Z' },
  ];
  const s = buildGiftMemoriesBlock(rows, 'ru');
  assertStringIncludes(s, 'SHE REMEMBERS GIFTS');
  assertStringIncludes(s, 'розу');
  assertStringIncludes(s, 'Кольцо');
});

Deno.test('scene directive null returns empty string', () => {
  assertEquals(buildSceneDirectiveBlock(null, 'ru'), '');
});

Deno.test('scene directive first_night ru contains scene cue', () => {
  const s = buildSceneDirectiveBlock('first_night', 'ru');
  assertStringIncludes(s, 'SCENE');
  assertStringIncludes(s, 'первая ночь');
});

Deno.test('scene directive weekend_away en contains scene cue', () => {
  const s = buildSceneDirectiveBlock('weekend_away', 'en');
  assertStringIncludes(s, 'weekend');
});
```

- [ ] **Step 3: Run — expect 9 fails**

```powershell
deno test --allow-all lumina-app/supabase/functions/chat-ai/prompt-injections.test.ts
```

### Task 6.4: Implement prompt-injection builders

**Files:**
- Modify: `lumina-app/supabase/functions/chat-ai/prompt-injections.ts`

- [ ] **Step 1: Implement**

```ts
export interface GiftMemoryRow {
  summary: string;
  gift_ref: string;
  intimacy_weight: number;
  created_at: string;
}

export function buildIntimacyBlock(level: number, lang: 'ru' | 'en'): string {
  const rounded = Math.round(level * 10) / 10;
  if (lang === 'en') {
    if (level >= 8) return `[INTIMACY LEVEL: ${rounded} — you may be explicit, intimate, sexual when context invites]`;
    if (level >= 5) return `[INTIMACY LEVEL: ${rounded} — flirty, teasing, suggestive hints allowed]`;
    return `[INTIMACY LEVEL: ${rounded} — warm and friendly; no sexual content]`;
  }
  if (level >= 8) return `[INTIMACY LEVEL: ${rounded} — можешь быть откровенной, интимной, сексуальной когда контекст уместен]`;
  if (level >= 5) return `[INTIMACY LEVEL: ${rounded} — можешь флиртовать, дразнить, делать намёки]`;
  return `[INTIMACY LEVEL: ${rounded} — дружелюбно и тепло, без сексуального контекста]`;
}

export function buildGiftMemoriesBlock(rows: GiftMemoryRow[], lang: 'ru' | 'en'): string {
  if (rows.length === 0) return '';
  const header = lang === 'en' ? '[SHE REMEMBERS GIFTS FROM HIM, reference them naturally over days]' : '[SHE REMEMBERS GIFTS FROM HIM, ссылайся органически через дни]';
  const bullets = rows.slice(0, 5).map((r) => `- ${r.summary}`).join('\n');
  return `${header}\n${bullets}`;
}

const SCENE_CUES: Record<string, { ru: string; en: string }> = {
  first_night: {
    ru: '[SCENE: после ужина первая ночь вместе — будь тёплой, близкой, не описывай технически]',
    en: '[SCENE: first night together after dinner — be warm, intimate, not clinical]',
  },
  weekend_away: {
    ru: '[SCENE: выходные вдвоём на море/в отеле — расслабленность, близость]',
    en: '[SCENE: weekend getaway together — relaxed, close]',
  },
  long_trip: {
    ru: '[SCENE: большое путешествие вдвоём — преображающий опыт]',
    en: '[SCENE: a long trip together — transformative]',
  },
};

export function buildSceneDirectiveBlock(sceneId: string | null, lang: 'ru' | 'en'): string {
  if (!sceneId) return '';
  const cue = SCENE_CUES[sceneId];
  if (!cue) return '';
  return lang === 'en' ? cue.en : cue.ru;
}
```

- [ ] **Step 2: Run — expect 9 pass**

```powershell
deno test --allow-all lumina-app/supabase/functions/chat-ai/prompt-injections.test.ts
```

### Task 6.5: Wire gate + injections into `chat-ai/index.ts`

**Files:**
- Modify: `lumina-app/supabase/functions/chat-ai/index.ts`

- [ ] **Step 1: Import new helpers at top of file**

At line ~10 (after the supabase import), add:

```ts
import { decideLimit, nextResetAt, BASE_DAILY_LIMIT } from './limit.ts';
import { buildIntimacyBlock, buildGiftMemoriesBlock, buildSceneDirectiveBlock } from './prompt-injections.ts';
```

- [ ] **Step 2: Inside `Deno.serve` handler after user authentication but before Grok call, add limit-gate block**

Find the block at ~line 446 where it does parallel queries for `girl_personas` + `profiles` + `memories`. Before it, add:

```ts
// Load limit snapshot for gate
const { data: limitProfile } = await supabase
  .from('profiles')
  .select('messages_used_today, messages_bought_today, messages_reset_at, tz_offset_minutes')
  .eq('id', userId)
  .single();

const snap = {
  messages_used_today: limitProfile?.messages_used_today ?? 0,
  messages_bought_today: limitProfile?.messages_bought_today ?? 0,
  messages_reset_at: limitProfile?.messages_reset_at ?? null,
  tz_offset_minutes: limitProfile?.tz_offset_minutes ?? 0,
};
const now = new Date();
const decision = decideLimit(snap, now);

if (decision.reset_needed) {
  await supabase.from('profiles').update({
    messages_used_today: 0,
    messages_bought_today: 0,
    messages_reset_at: nextResetAt(snap.tz_offset_minutes, now),
  }).eq('id', userId);
  snap.messages_used_today = 0;
  snap.messages_bought_today = 0;
}

if (!decision.allowed) {
  const limitMessages = {
    ru: 'бли-ин, убегаю… столько всего сегодня. напишу завтра утром, окей? ❤️',
    en: "argh, gotta run… so much going on today. i'll text tomorrow morning, okay? ❤️",
  };
  const lang = (body?.lang === 'en') ? 'en' : 'ru';
  return new Response(JSON.stringify({
    error: 'daily_limit',
    in_character_message: limitMessages[lang],
    remaining: 0,
    quota: decision.quota,
  }), { status: 429, headers: CORS_HEADERS });
}

// Increment usage atomically
await supabase.rpc('increment_messages_used', { p_user_id: userId });
```

- [ ] **Step 3: After loading memories, split into summary + gift rows**

Replace the memories select at ~line 455 with two queries:

```ts
const [memRes, giftMemRes, relRes] = await Promise.all([
  supabase.from('memories')
    .select('summary, created_at')
    .eq('user_id', userId).eq('girl_id', girlId)
    .is('gift_ref', null)
    .order('created_at', { ascending: false })
    .limit(MEMORY_LIMIT),
  supabase.from('memories')
    .select('summary, gift_ref, intimacy_weight, created_at')
    .eq('user_id', userId).eq('girl_id', girlId)
    .not('gift_ref', 'is', null)
    .order('intimacy_weight', { ascending: false })
    .limit(5),
  supabase.from('girl_relationships')
    .select('intimacy_level, pending_scene_marker')
    .eq('user_id', userId).eq('girl_id', girlId)
    .maybeSingle(),
]);
```

- [ ] **Step 4: Inject blocks into system prompt**

At the spot where `system_prompt` is assembled (search for `systemPrompt =` or the Grok request body), append:

```ts
const lang = body?.lang === 'en' ? 'en' : 'ru';
const intimacyLevel = (relRes.data?.intimacy_level as number) ?? 0;
const sceneMarker = (relRes.data?.pending_scene_marker as string | null) ?? null;

const injections = [
  buildIntimacyBlock(intimacyLevel, lang),
  buildGiftMemoriesBlock((giftMemRes.data ?? []) as any, lang),
  buildSceneDirectiveBlock(sceneMarker, lang),
].filter(Boolean).join('\n\n');

// Append injections to the existing system prompt string
const finalSystemPrompt = `${systemPrompt}\n\n${injections}`;
// ... use finalSystemPrompt in Grok messages instead of systemPrompt
```

- [ ] **Step 5: Clear pending scene marker after consumption**

Right after the block is injected (and before Grok is called), add:

```ts
if (sceneMarker) {
  await supabase.from('girl_relationships').update({
    pending_scene_marker: null,
    pending_scene_expires_at: null,
  }).eq('user_id', userId).eq('girl_id', girlId);
}
```

- [ ] **Step 6: Create `increment_messages_used` RPC**

Create `lumina-app/supabase/migrations/20260423_increment_messages_used.sql`:

```sql
CREATE OR REPLACE FUNCTION increment_messages_used(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE profiles SET messages_used_today = messages_used_today + 1 WHERE id = p_user_id
    RETURNING messages_used_today INTO v_new;
  RETURN COALESCE(v_new, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_messages_used(UUID) TO service_role;
```

- [ ] **Step 7: Apply migration + deploy chat-ai**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
npx supabase@latest functions deploy chat-ai --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 8: Smoke test in dev**

In the browser: open chat, send a message, verify it still works. Then in Supabase Studio:

```sql
SELECT id, messages_used_today, messages_reset_at FROM profiles WHERE id = '<your-user-id>';
```
Expected: `messages_used_today` is 1+, `messages_reset_at` is set.

- [ ] **Step 9: Commit**

```powershell
git add lumina-app/supabase/functions/chat-ai/ lumina-app/supabase/migrations/20260423_increment_messages_used.sql
git commit -m "feat(edge): chat-ai daily limit gate + intimacy/gift-memory/scene injections"
```

---

## Phase 7 — `useStars` Hook + Shop Page + StarsBalance + Invoice Flow

**Context:** Frontend now needs its Stars-centric state. Replace `usePremium` with `useStars`, route `/shop` to a new `Shop` page (Premium.tsx is deleted), add `StarsBalance` in Chat header, and implement `openInvoice` → polling → refetch flow.

### Task 7.1: TDD — `useStars` hook

**Files:**
- Create: `lumina-app/src/hooks/useStars.ts`
- Create: `lumina-app/src/hooks/useStars.test.ts`

- [ ] **Step 1: Stub hook**

```ts
// useStars.ts
export interface StarsState {
  balance: number;
  messagesUsedToday: number;
  messagesBoughtToday: number;
  messagesQuota: number;
  messagesRemaining: number;
  loading: boolean;
  error: string | null;
}

export interface UseStarsReturn extends StarsState {
  refetch: () => Promise<void>;
  buyPack: (pack: 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000') => Promise<void>;
  buyMessagesPack: () => Promise<void>;
}

export function useStars(): UseStarsReturn {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Write failing tests**

```ts
// useStars.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStars } from './useStars';

const mockSingle = vi.fn();
const mockInvoke = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: mockSingle }) }) }),
    functions: { invoke: mockInvoke },
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
  },
}));

vi.mock('../lib/telegram', () => ({
  tg: { openInvoice: vi.fn((_url, cb) => cb('paid')) },
}));

beforeEach(() => { mockSingle.mockReset(); mockInvoke.mockReset(); });

describe('useStars', () => {
  it('fetches balance on mount', async () => {
    mockSingle.mockResolvedValue({ data: { stars_balance: 200, messages_used_today: 10, messages_bought_today: 0 }, error: null });
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.balance).toBe(200);
    expect(result.current.messagesQuota).toBe(100);
    expect(result.current.messagesRemaining).toBe(90);
  });

  it('quota grows with messages_bought_today', async () => {
    mockSingle.mockResolvedValue({ data: { stars_balance: 0, messages_used_today: 50, messages_bought_today: 100 }, error: null });
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messagesQuota).toBe(200);
    expect(result.current.messagesRemaining).toBe(150);
  });

  it('buyPack invokes billing-create-invoice + opens invoice + refetches', async () => {
    mockSingle.mockResolvedValue({ data: { stars_balance: 0, messages_used_today: 0, messages_bought_today: 0 }, error: null });
    mockInvoke.mockResolvedValue({ data: { invoice_url: 'https://t.me/invoice/abc' }, error: null });
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.buyPack('stars_100'); });
    expect(mockInvoke).toHaveBeenCalledWith('billing-create-invoice', { body: { kind: 'pack', pack: 'stars_100' } });
  });

  it('error state set when fetch fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'oops' } });
    const { result } = renderHook(() => useStars());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('oops');
  });
});
```

- [ ] **Step 3: Run — expect 4 fails**

```powershell
npm --prefix lumina-app exec vitest run src/hooks/useStars.test.ts
```

### Task 7.2: Implement `useStars`

**Files:**
- Modify: `lumina-app/src/hooks/useStars.ts`
- Create: `lumina-app/src/lib/telegram.ts` (if missing — wraps `window.Telegram.WebApp`)

- [ ] **Step 1: Create `lib/telegram.ts` thin wrapper**

```ts
type TgWebApp = {
  openInvoice: (url: string, callback: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  showPopup?: (params: { title?: string; message: string; buttons?: { type: string }[] }) => void;
  HapticFeedback?: { notificationOccurred: (t: 'success' | 'error' | 'warning') => void };
};

function getWebApp(): TgWebApp | null {
  if (typeof window === 'undefined') return null;
  // @ts-expect-error Telegram global
  return (window.Telegram?.WebApp as TgWebApp) ?? null;
}

export const tg = {
  openInvoice(url: string, cb: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) {
    const wa = getWebApp();
    if (!wa) { console.warn('[tg] no WebApp, simulating cancel'); cb('cancelled'); return; }
    wa.openInvoice(url, cb);
  },
  haptic(kind: 'success' | 'error' | 'warning') {
    getWebApp()?.HapticFeedback?.notificationOccurred(kind);
  },
};
```

- [ ] **Step 2: Implement hook**

```ts
// useStars.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { tg } from '../lib/telegram';

const BASE_DAILY_LIMIT = 100;

export interface StarsState {
  balance: number;
  messagesUsedToday: number;
  messagesBoughtToday: number;
  messagesQuota: number;
  messagesRemaining: number;
  loading: boolean;
  error: string | null;
}

export interface UseStarsReturn extends StarsState {
  refetch: () => Promise<void>;
  buyPack: (pack: 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000') => Promise<void>;
  buyMessagesPack: () => Promise<void>;
}

export function useStars(): UseStarsReturn {
  const [state, setState] = useState<StarsState>({
    balance: 0,
    messagesUsedToday: 0,
    messagesBoughtToday: 0,
    messagesQuota: BASE_DAILY_LIMIT,
    messagesRemaining: BASE_DAILY_LIMIT,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setState((s) => ({ ...s, loading: false })); return; }
    const { data, error } = await supabase.from('profiles')
      .select('stars_balance, messages_used_today, messages_bought_today')
      .eq('id', user.id)
      .single();
    if (error || !data) {
      setState((s) => ({ ...s, loading: false, error: error?.message ?? 'fetch failed' }));
      return;
    }
    const quota = BASE_DAILY_LIMIT + (data.messages_bought_today ?? 0);
    const remaining = Math.max(0, quota - (data.messages_used_today ?? 0));
    setState({
      balance: data.stars_balance ?? 0,
      messagesUsedToday: data.messages_used_today ?? 0,
      messagesBoughtToday: data.messages_bought_today ?? 0,
      messagesQuota: quota,
      messagesRemaining: remaining,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => { void refetch(); }, [refetch]);

  const buyPack = useCallback(async (pack: 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000') => {
    const { data, error } = await supabase.functions.invoke('billing-create-invoice', { body: { kind: 'pack', pack } });
    if (error || !data?.invoice_url) { tg.haptic('error'); throw error ?? new Error('no invoice_url'); }
    tg.openInvoice(data.invoice_url, async (status) => {
      if (status === 'paid') {
        tg.haptic('success');
        // poll for ledger to update (webhook is async)
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          await refetch();
          // balance check handled by caller via state
        }
      } else if (status === 'failed') { tg.haptic('error'); }
    });
  }, [refetch]);

  const buyMessagesPack = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('billing-create-invoice', { body: { kind: 'messages_pack' } });
    if (error || !data?.invoice_url) { tg.haptic('error'); throw error ?? new Error('no invoice_url'); }
    tg.openInvoice(data.invoice_url, async (status) => {
      if (status === 'paid') {
        tg.haptic('success');
        for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 1000)); await refetch(); }
      }
    });
  }, [refetch]);

  return { ...state, refetch, buyPack, buyMessagesPack };
}
```

- [ ] **Step 3: Run — expect 4 pass**

```powershell
npm --prefix lumina-app exec vitest run src/hooks/useStars.test.ts
```

### Task 7.3: `StarsBalance` component

**Files:**
- Create: `lumina-app/src/components/StarsBalance.tsx`

```tsx
import { memo } from 'react';

interface Props {
  balance: number;
  onClick?: () => void;
}

export const StarsBalance = memo(function StarsBalance({ balance, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors text-amber-300 text-sm font-medium"
      aria-label={`${balance} stars`}
    >
      <span className="text-base leading-none">⭐</span>
      <span className="tabular-nums">{balance.toLocaleString()}</span>
    </button>
  );
});
```

### Task 7.4: `Shop` page (replaces `Premium.tsx`)

**Files:**
- Create: `lumina-app/src/pages/Shop.tsx`
- Delete: `lumina-app/src/pages/Premium.tsx`
- Modify: `lumina-app/src/App.tsx` — replace route `/premium` with `/shop`

- [ ] **Step 1: Create `Shop.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { useStars } from '../hooks/useStars';
import { StarsBalance } from '../components/StarsBalance';
import { useT } from '../i18n';

const PACKS = [
  { id: 'stars_100' as const, stars: 100, price: 100, bonus: 0 },
  { id: 'stars_550' as const, stars: 550, price: 500, bonus: 50 },
  { id: 'stars_2400' as const, stars: 2400, price: 2000, bonus: 400 },
  { id: 'stars_13000' as const, stars: 13000, price: 10000, bonus: 3000 },
];

export default function Shop() {
  const nav = useNavigate();
  const t = useT();
  const { balance, loading, buyPack } = useStars();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-neutral-950 to-neutral-900 text-white">
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-neutral-950/80 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-white/70 hover:text-white">← {t('common.back')}</button>
        <h1 className="text-lg font-semibold">{t('shop.title')}</h1>
        <StarsBalance balance={balance} />
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        <p className="text-white/60 text-sm">{t('shop.subtitle')}</p>

        <div className="grid grid-cols-1 gap-3">
          {PACKS.map((p) => (
            <button
              key={p.id}
              disabled={loading}
              onClick={() => void buyPack(p.id)}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-fuchsia-500/10 border border-white/10 hover:border-amber-400/40 transition disabled:opacity-50"
            >
              <div className="text-left">
                <div className="text-xl font-bold">⭐ {p.stars.toLocaleString()}</div>
                {p.bonus > 0 && <div className="text-xs text-amber-300">+{p.bonus} {t('shop.bonus')}</div>}
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{p.price}⭐</div>
                <div className="text-xs text-white/50">{t('shop.buy')}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-white/40 text-center pt-4">{t('shop.footnote')}</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Update `App.tsx` routes**

Find:
```tsx
const Premium = lazy(() => import('./pages/Premium'));
```
Replace with:
```tsx
const Shop = lazy(() => import('./pages/Shop'));
```

Find route `<Route path="/premium" ...>` and replace with `<Route path="/shop" element={<Shop />} />`.

- [ ] **Step 3: Delete `Premium.tsx`**

```powershell
Remove-Item "lumina-app/src/pages/Premium.tsx"
```

- [ ] **Step 4: Update all navigations** pointing to `/premium`

```powershell
npm --prefix lumina-app exec tsc --noEmit 2>&1 | Select-String "premium|Premium"
```

Replace each match: `/premium` → `/shop`. Likely sites: `Settings.tsx`, `Paywall.tsx` (will be rewritten), navigation buttons in various screens.

### Task 7.5: Add StarsBalance to Chat header

**Files:**
- Modify: `lumina-app/src/pages/Chat.tsx`

- [ ] **Step 1: Import hook + component** near existing Chat imports:

```tsx
import { useStars } from '../hooks/useStars';
import { StarsBalance } from '../components/StarsBalance';
```

- [ ] **Step 2: In Chat component body**

```tsx
const { balance } = useStars();
```

- [ ] **Step 3: In the Chat header JSX** (next to the girl's avatar/name), add:

```tsx
<StarsBalance balance={balance} onClick={() => nav('/shop')} />
```

### Task 7.6: Verify + commit

- [ ] **Step 1: Typecheck + run all tests**

```powershell
npm --prefix lumina-app exec tsc --noEmit
npm --prefix lumina-app exec vitest run
```

- [ ] **Step 2: Commit**

```powershell
git add lumina-app/src/hooks/useStars.ts lumina-app/src/hooks/useStars.test.ts lumina-app/src/lib/telegram.ts lumina-app/src/components/StarsBalance.tsx lumina-app/src/pages/Shop.tsx lumina-app/src/pages/Chat.tsx lumina-app/src/App.tsx
git rm lumina-app/src/pages/Premium.tsx
git commit -m "feat(ui): useStars hook, Shop page, StarsBalance in Chat header; remove Premium"
```

---

## Phase 8 — `GiftPicker` + `DailyLimitModal` + Chat integration

**Context:** Replace old free emoji gift row (8 hardcoded items) with paid `GiftPicker` bottom-sheet sourcing from `gift_catalog`. Rewrite `Paywall.tsx` as `DailyLimitModal.tsx` (only two states: daily_limit reached / insufficient_stars). Wire Chat to 429 response.

### Task 8.1: `useGiftCatalog` hook

**Files:**
- Create: `lumina-app/src/hooks/useGiftCatalog.ts`

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface GiftCatalogItem {
  id: string;
  category: 'gift' | 'jewelry' | 'date' | 'travel';
  name_ru: string;
  name_en: string;
  emoji: string;
  price_stars: number;
  intimacy_delta: number;
  trigger_event: string | null;
  sort_order: number;
}

export function useGiftCatalog() {
  const [items, setItems] = useState<GiftCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('gift_catalog').select('*').order('sort_order').then(({ data }) => {
      setItems((data ?? []) as GiftCatalogItem[]);
      setLoading(false);
    });
  }, []);

  return { items, loading };
}
```

### Task 8.2: `GiftPicker` bottom sheet

**Files:**
- Create: `lumina-app/src/components/GiftPicker.tsx`

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useGiftCatalog, type GiftCatalogItem } from '../hooks/useGiftCatalog';
import { useT, useLang } from '../i18n';
import { supabase } from '../lib/supabase';
import { tg } from '../lib/telegram';

interface Props {
  open: boolean;
  onClose: () => void;
  girlId: string;
  starsBalance: number;
  onInsufficientStars: (needed: number) => void;
  onSent: () => void;
}

const CATEGORIES: Array<GiftCatalogItem['category']> = ['gift', 'jewelry', 'date', 'travel'];

export function GiftPicker({ open, onClose, girlId, starsBalance, onInsufficientStars, onSent }: Props) {
  const t = useT();
  const lang = useLang();
  const { items, loading } = useGiftCatalog();
  const [tab, setTab] = useState<GiftCatalogItem['category']>('gift');
  const [sending, setSending] = useState<string | null>(null);

  const byCat = useMemo(() => items.filter((i) => i.category === tab), [items, tab]);

  const send = async (item: GiftCatalogItem) => {
    if (starsBalance < item.price_stars) { onInsufficientStars(item.price_stars); return; }
    setSending(item.id);
    try {
      const { error } = await supabase.functions.invoke('gift-send', { body: { girl_id: girlId, gift_id: item.id } });
      if (error) { tg.haptic('error'); throw error; }
      tg.haptic('success');
      onSent();
      onClose();
    } finally { setSending(null); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30 }}
            className="w-full max-w-md mx-auto bg-neutral-900 rounded-t-3xl p-4 max-h-[80dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setTab(c)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${tab === c ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/70'}`}>
                  {t(`gifts.category.${c}`)}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-8 text-center text-white/50">…</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {byCat.map((item) => {
                  const affordable = starsBalance >= item.price_stars;
                  return (
                    <button key={item.id} disabled={!!sending} onClick={() => void send(item)}
                      className={`flex flex-col items-center p-3 rounded-2xl border ${affordable ? 'border-white/10 hover:border-amber-400/50' : 'border-white/5 opacity-60'} bg-white/5 transition`}>
                      <div className="text-3xl mb-1">{item.emoji}</div>
                      <div className="text-xs text-center text-white/80">{lang === 'en' ? item.name_en : item.name_ru}</div>
                      <div className="text-sm font-semibold text-amber-300 mt-1">⭐ {item.price_stars}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Task 8.3: `DailyLimitModal` (replaces `Paywall.tsx`)

**Files:**
- Create: `lumina-app/src/components/DailyLimitModal.tsx`
- Delete: `lumina-app/src/components/Paywall.tsx`

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../i18n';
import { useStars } from '../hooks/useStars';

interface Props {
  open: boolean;
  variant: 'daily_limit' | 'insufficient_stars';
  neededStars?: number;
  inCharacterMessage?: string;
  onClose: () => void;
}

export function DailyLimitModal({ open, variant, neededStars, inCharacterMessage, onClose }: Props) {
  const t = useT();
  const { balance, buyPack, buyMessagesPack } = useStars();

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="w-full max-w-sm bg-neutral-900 rounded-3xl p-6 border border-white/10" onClick={(e) => e.stopPropagation()}>
            {variant === 'daily_limit' ? (
              <>
                <div className="text-4xl text-center mb-3">💤</div>
                <h2 className="text-xl font-semibold text-center mb-2">{t('dailyLimit.title')}</h2>
                {inCharacterMessage && <p className="text-white/70 text-center italic mb-4">"{inCharacterMessage}"</p>}
                <p className="text-white/60 text-sm text-center mb-5">{t('dailyLimit.subtitle')}</p>
                <button onClick={() => void buyMessagesPack()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-fuchsia-500 text-black font-semibold mb-2">
                  {t('dailyLimit.buyMessages')} · ⭐ 100
                </button>
                {balance < 100 && (
                  <button onClick={() => void buyPack('stars_100')} className="w-full py-2 rounded-2xl bg-white/5 text-white/80 text-sm">
                    {t('dailyLimit.topUpFirst')}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-4xl text-center mb-3">⭐</div>
                <h2 className="text-xl font-semibold text-center mb-2">{t('dailyLimit.notEnough')}</h2>
                <p className="text-white/60 text-center mb-5">{t('dailyLimit.need', { n: neededStars ?? 0 })}</p>
                <button onClick={() => void buyPack('stars_550')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-fuchsia-500 text-black font-semibold">
                  {t('dailyLimit.topUp')}
                </button>
              </>
            )}
            <button onClick={onClose} className="w-full py-2 mt-2 text-white/50 text-sm">{t('common.cancel')}</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Delete old Paywall**

```powershell
Remove-Item "lumina-app/src/components/Paywall.tsx"
```

### Task 8.4: Chat.tsx integration

**Files:**
- Modify: `lumina-app/src/pages/Chat.tsx`

- [ ] **Step 1: Add state + handlers** near existing Chat state:

```tsx
const [giftPickerOpen, setGiftPickerOpen] = useState(false);
const [limitModal, setLimitModal] = useState<{ open: boolean; variant: 'daily_limit' | 'insufficient_stars'; needed?: number; msg?: string }>({ open: false, variant: 'daily_limit' });
const { balance, refetch: refetchStars } = useStars();
```

- [ ] **Step 2: In the `sendMessage` flow**, after `fetch`/`supabase.functions.invoke('chat-ai', ...)` call, handle 429:

```tsx
const { data, error } = await supabase.functions.invoke('chat-ai', { body: payload });
if (error) {
  // check if it's a 429 daily_limit
  const statusMatch = (error.context as any)?.status;
  const bodyErr = (error as any)?.context?.body;
  if (statusMatch === 429 || bodyErr?.error === 'daily_limit') {
    setLimitModal({ open: true, variant: 'daily_limit', msg: bodyErr?.in_character_message });
    return;
  }
  // ... existing error handling
}
```

- [ ] **Step 3: Replace old gift row with GiftPicker button**

Find the old free-emoji gift code (likely `['🎁','💐','🍫',...]` array). Remove it. Add a single gift button that opens `GiftPicker`:

```tsx
<button onClick={() => setGiftPickerOpen(true)} className="p-2 rounded-full hover:bg-white/10" aria-label={t('gifts.open')}>
  🎁
</button>
```

- [ ] **Step 4: Render modals** at bottom of Chat JSX:

```tsx
<GiftPicker
  open={giftPickerOpen}
  onClose={() => setGiftPickerOpen(false)}
  girlId={activeGirlId!}
  starsBalance={balance}
  onInsufficientStars={(n) => { setGiftPickerOpen(false); setLimitModal({ open: true, variant: 'insufficient_stars', needed: n }); }}
  onSent={() => { void refetchStars(); /* optionally push a system msg "you sent X" */ }}
/>
<DailyLimitModal
  open={limitModal.open}
  variant={limitModal.variant}
  neededStars={limitModal.needed}
  inCharacterMessage={limitModal.msg}
  onClose={() => setLimitModal((s) => ({ ...s, open: false }))}
/>
```

### Task 8.5: Verify + commit

- [ ] **Step 1: Typecheck + tests**

```powershell
npm --prefix lumina-app exec tsc --noEmit
npm --prefix lumina-app exec vitest run
```

- [ ] **Step 2: Manual smoke test** — chat, open gift picker, attempt to send (will fail without stars), trigger limit modal by mocking a 429 in devtools network tab.

- [ ] **Step 3: Commit**

```powershell
git add lumina-app/src/hooks/useGiftCatalog.ts lumina-app/src/components/GiftPicker.tsx lumina-app/src/components/DailyLimitModal.tsx lumina-app/src/pages/Chat.tsx
git rm lumina-app/src/components/Paywall.tsx
git commit -m "feat(ui): GiftPicker + DailyLimitModal, Chat 429 handling; remove Paywall"
```

---

## Phase 9 — Cleanup Legacy (tinder-era mechanics)

**Context:** Remove all remnants of likes/super-likes/rewind/compat-unlock/`[GIFT:id]` placeholders / payment-method badges / DEV premium activator / FAQ about tiers.

**IMPORTANT:** Each substep must keep the app type-checking. If a removal breaks compilation, fix call-sites in the same step before moving on.

### Task 9.1: Delete `usePremium` hook + all imports

- [ ] **Step 1: Find all imports**

```powershell
npm --prefix lumina-app exec tsc --noEmit 2>&1 | Select-String "usePremium"
```

- [ ] **Step 2: Delete file + replace each import**

```powershell
Remove-Item "lumina-app/src/hooks/usePremium.ts"
```

For each file that imported it (likely `Feed.tsx`, `Search.tsx`, `GirlProfileDrawer.tsx`, `Settings.tsx`, `Chat.tsx`): remove the import line and delete every reference to `isPremium`, `limits.dailyLikes`, `limits.dailyMessages`, `activatePremium`, `deactivatePremium`. For messages limit, use `useStars().messagesRemaining` if needed.

- [ ] **Step 3: Remove localStorage key on app boot** (one-time cleanup for existing users)

In `lumina-app/src/App.tsx` or a bootstrap module, add at the top-level:

```ts
if (typeof window !== 'undefined') {
  try { localStorage.removeItem('lumina_premium'); } catch { /* noop */ }
}
```

### Task 9.2: Strip likes/super-likes/rewind from Feed, Search, Drawer

**Files:**
- Modify: `lumina-app/src/pages/Feed.tsx`
- Modify: `lumina-app/src/pages/Search.tsx`
- Modify: `lumina-app/src/components/GirlProfile/GirlProfileDrawer.tsx`

- [ ] **Step 1: Feed.tsx**

Locate any swipe/like/super-like buttons (❤️ / ⭐ / ↩️ rewind). Feed should now be pure discovery: tap a girl → open drawer → `/leave` current + start relationship OR just view. Remove daily-like counter, remove rewind button, remove super-like button, remove any "out of likes" Paywall gate.

Keep: scroll/grid of girls, filter/sort, tap-to-open detail.

- [ ] **Step 2: Search.tsx** — same philosophy. Keep search input + result grid. Remove any `likesRemaining` display or like-gate.

- [ ] **Step 3: GirlProfileDrawer.tsx**
  - Remove "compatibility locked — upgrade to see" overlay if any; show compat freely or compute on open.
  - Remove Super-Like button.
  - Keep only: stats, bio, photos, "Start relationship" / "Leave" action.

- [ ] **Step 4: Typecheck**

```powershell
npm --prefix lumina-app exec tsc --noEmit
```

### Task 9.3: Remove `[GIFT:id]` renderer in Chat

**Files:**
- Modify: `lumina-app/src/pages/Chat.tsx` (or wherever messages render)

- [ ] **Step 1: Grep for the pattern**

```powershell
npm --prefix lumina-app exec grep -- "GIFT:" src 2>$null
```

- [ ] **Step 2: Remove the block** that detects `/\[GIFT:([a-z_]+)\]/` in messages and renders a bubble. Users will see only the raw AI text; legacy messages may contain `[GIFT:flower]` literals — acceptable (will age out).

- [ ] **Optional — scrub legacy placeholders on render**: replace `[GIFT:*]` in message text with empty string:

```ts
const cleanContent = msg.content.replace(/\s*\[GIFT:[a-z_]+\]\s*/g, ' ').trim();
```

### Task 9.4: Remove DEV premium activator + payment-method badges + tier FAQ

- [ ] **Step 1: Grep for `DEV` / `premium` / "payment method" remnants**

```powershell
npm --prefix lumina-app exec grep -rn -- "activatePremium\|PaymentMethod\|tier\|subscription" lumina-app/src 2>$null
```

- [ ] **Step 2: Delete each matching UI block.** Expected sites:
  - Settings page: "Dev: activate premium" button — remove.
  - Any "Payment methods" section — remove.
  - FAQ entries mentioning tiers/subscription — remove (or rewrite to describe Stars + gifts model).

### Task 9.5: Verify + commit

```powershell
npm --prefix lumina-app exec tsc --noEmit
npm --prefix lumina-app exec vitest run
git add -A lumina-app/src
git commit -m "chore(cleanup): remove usePremium, likes/super-likes/rewind, [GIFT:id] renderer, DEV activator, tier FAQ"
```

---

## Phase 10 — i18n Rewrite

**Context:** Purge every `premium.*` key. Introduce fresh namespaces: `shop.*`, `stars.*`, `gifts.*`, `dailyLimit.*`, `intimacy.*`, `leave.*`.

**Files:**
- Modify: `lumina-app/src/i18n/ru.ts`
- Modify: `lumina-app/src/i18n/en.ts`

### Task 10.1: Remove legacy keys

- [ ] **Step 1: Grep current usage**

```powershell
npm --prefix lumina-app exec grep -rn -- "premium\." lumina-app/src 2>$null
```

- [ ] **Step 2: In both `ru.ts` and `en.ts`, delete the entire `premium` object** (includes `unlimitedLikes`, `seeWhoLiked`, `goldBadge`, `rewind`, `priority`, `subscribe`, `upgrade`, `freeTier`, `premiumTier`, `intimateTier`, etc.)

### Task 10.2: Add new key blocks

- [ ] **Step 1: Add to `ru.ts`** (merge into root translations object):

```ts
shop: {
  title: 'Магазин звёзд',
  subtitle: 'Звёзды нужны для подарков, свиданий и продления разговоров.',
  buy: 'Купить',
  bonus: 'бонусных ⭐',
  footnote: 'Все покупки через Telegram Stars. Возврат по правилам Telegram.',
},
stars: {
  balance: '{{n}} ⭐',
  insufficient: 'Не хватает звёзд',
},
gifts: {
  open: 'Подарить',
  category: {
    gift: 'Подарки',
    jewelry: 'Украшения',
    date: 'Свидания',
    travel: 'Путешествия',
  },
  sent: 'Отправлено!',
},
dailyLimit: {
  title: 'Она занята',
  subtitle: 'Она написала уже 100 сообщений сегодня. Можешь купить ещё 100.',
  buyMessages: 'Ещё 100 сообщений',
  topUpFirst: 'Сначала пополни звёзды',
  notEnough: 'Не хватает звёзд',
  need: 'Нужно ещё {{n}} ⭐',
  topUp: 'Пополнить',
},
intimacy: {
  level: 'Близость {{n}}/10',
  hint: {
    low: 'Вы только знакомитесь',
    mid: 'Между вами искра',
    high: 'Вы очень близки',
  },
},
leave: {
  title: 'Расстаться?',
  warning: 'Это полный разрыв. Её воспоминания, ваш диалог, подарки — всё уйдёт навсегда. Купленные звёзды останутся у тебя.',
  confirm: 'Да, отпустить',
  cancel: 'Остаться',
},
common: {
  back: 'Назад',
  cancel: 'Отмена',
},
```

- [ ] **Step 2: Add to `en.ts`**:

```ts
shop: {
  title: 'Stars shop',
  subtitle: 'Stars are for gifts, dates, and continuing conversations.',
  buy: 'Buy',
  bonus: 'bonus ⭐',
  footnote: 'All purchases via Telegram Stars. Refunds per Telegram policy.',
},
stars: {
  balance: '{{n}} ⭐',
  insufficient: 'Not enough stars',
},
gifts: {
  open: 'Gift',
  category: {
    gift: 'Gifts',
    jewelry: 'Jewelry',
    date: 'Dates',
    travel: 'Travel',
  },
  sent: 'Sent!',
},
dailyLimit: {
  title: "She's busy",
  subtitle: "She's already sent 100 messages today. You can unlock another 100.",
  buyMessages: 'Another 100 messages',
  topUpFirst: 'Top up stars first',
  notEnough: 'Not enough stars',
  need: 'You need {{n}} more ⭐',
  topUp: 'Top up',
},
intimacy: {
  level: 'Intimacy {{n}}/10',
  hint: {
    low: 'Just getting to know each other',
    mid: "There's a spark",
    high: 'You're very close',
  },
},
leave: {
  title: 'Break up?',
  warning: "This is permanent. Her memories, your chat, gifts — gone forever. Your stars stay yours.",
  confirm: 'Let her go',
  cancel: 'Stay',
},
common: {
  back: 'Back',
  cancel: 'Cancel',
},
```

### Task 10.3: Verify no missing keys

- [ ] **Step 1: Grep for translation calls**

```powershell
npm --prefix lumina-app exec grep -rn -- "t(['\"]premium\\." lumina-app/src 2>$null
```

Expected: empty. If any match — delete or replace.

- [ ] **Step 2: Typecheck + tests**

```powershell
npm --prefix lumina-app exec tsc --noEmit
npm --prefix lumina-app exec vitest run
```

- [ ] **Step 3: Commit**

```powershell
git add lumina-app/src/i18n/ru.ts lumina-app/src/i18n/en.ts
git commit -m "i18n: purge premium.* keys; add shop/stars/gifts/dailyLimit/intimacy/leave namespaces"
```

---

## Phase 11 — Migration Goodwill (+200⭐ for existing users)

**Context:** Every user who has a `profiles` row as of deploy time gets a one-time +200⭐ migration bonus via `credit_stars` (idempotent through `ref_id = profiles.id`).

### Task 11.1: Create migration SQL

**Files:**
- Create: `lumina-app/supabase/migrations/20260423_goodwill_200_stars.sql`

```sql
-- Goodwill bonus: +200 stars for every pre-existing user.
-- Idempotent: credit_stars uses (reason, ref_id) UNIQUE, so re-running is safe.
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM profiles LOOP
    PERFORM credit_stars(u.id, 200, 'bonus:migration_goodwill', u.id::text);
  END LOOP;
END $$;
```

### Task 11.2: Apply + verify

- [ ] **Step 1: Push migration**

```powershell
npx supabase@latest db push --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Step 2: Verify balance bumped in Supabase Studio**

```sql
SELECT COUNT(*) FROM profiles WHERE stars_balance >= 200;
SELECT COUNT(*) FROM stars_ledger WHERE reason = 'bonus:migration_goodwill';
-- Counts should match.
```

- [ ] **Step 3: Verify idempotency** — re-run `db push` or manually rerun the DO block; ledger count must NOT double.

- [ ] **Step 4: Commit**

```powershell
git add lumina-app/supabase/migrations/20260423_goodwill_200_stars.sql
git commit -m "feat(migration): +200 stars goodwill bonus for existing users (idempotent)"
```

---

## Phase 12 — Final QA & Release

### Task 12.1: Full typecheck + test suite

```powershell
npm --prefix lumina-app exec tsc --noEmit
npm --prefix lumina-app exec vitest run
deno test --allow-all lumina-app/supabase/functions
```

Expected: zero TS errors, all vitest green, all deno tests green.

### Task 12.2: E2E smoke in dev (Telegram Test Env)

1. Log in as fresh user → verify 200⭐ NOT present (goodwill only targets existing).
2. Log in as pre-migration user → verify 200⭐ visible in StarsBalance.
3. Open Shop → buy smallest pack (100⭐) via Test Stars → watch webhook fire → balance refetches.
4. Send 3 gifts of escalating price → verify `intimacy_level` climbs in `girl_relationships` via Studio.
5. Buy a dinner-date item → check `pending_scene_marker='first_night'` set.
6. Send a chat message → verify prompt includes `[SCENE: ...]` via edge function logs → scene cleared after.
7. Spam 100 messages → 101st returns 429 → `DailyLimitModal` opens with in-character line.
8. Buy `messages_pack` (100⭐) → verify `messages_bought_today=100`, limit extended.
9. `/leave` → confirm cascade: stars preserved, girl_relationships/gifts_sent/memories wiped for that girl.

### Task 12.3: Deploy production

- [ ] Update Telegram webhook if URL changed.
- [ ] Push to `main` → Vercel auto-deploys frontend.
- [ ] Re-deploy all edge functions with final env vars set:

```powershell
npx supabase@latest functions deploy billing-create-invoice --project-ref rfmcpnpdqbhecwtodyaz
npx supabase@latest functions deploy billing-webhook --no-verify-jwt --project-ref rfmcpnpdqbhecwtodyaz
npx supabase@latest functions deploy gift-send --project-ref rfmcpnpdqbhecwtodyaz
npx supabase@latest functions deploy messages-buy-pack --project-ref rfmcpnpdqbhecwtodyaz
npx supabase@latest functions deploy chat-ai --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] Post-deploy: send real 1⭐ test invoice to yourself, verify end-to-end.

### Task 12.4: Announcement message

Craft a short Telegram broadcast (optional): "Lumina больше не работает по подписке. Бесплатно — 100 сообщений в день. Звёзды — для подарков и свиданий. Вам уже начислено 200⭐ в благодарность за то, что вы с нами."

---

## Summary of Phases

| # | Scope | TDD? |
|---|-------|------|
| 0 | vitest + deno test bootstrap | — |
| 1 | DB migrations (profiles cols, girl_relationships, stars_ledger, purchases, gift_catalog, gifts_sent, memories.gift_ref) + seed | — |
| 2 | RPC functions (spend_stars, credit_stars, bump_intimacy, bump_messages_bought, increment_messages_used) | ✅ (pgTAP optional) |
| 3 | `billing-create-invoice` edge fn | ✅ |
| 4 | `billing-webhook` edge fn (idempotent + secret header) | ✅ |
| 5 | `gift-send` edge fn (atomic spend+bump+memory+scene) | ✅ |
| 6 | `messages-buy-pack` + `chat-ai` gate + prompt injections | ✅ |
| 7 | `useStars` hook + `Shop` page + `StarsBalance` + invoice flow | ✅ (hook) |
| 8 | `GiftPicker` + `DailyLimitModal` + Chat 429 handling | — |
| 9 | Cleanup: usePremium/likes/super-likes/rewind/GIFT-renderer/DEV/FAQ | — |
| 10 | i18n rewrite | — |
| 11 | +200⭐ goodwill migration | — |
| 12 | Full QA + production deploy | — |



