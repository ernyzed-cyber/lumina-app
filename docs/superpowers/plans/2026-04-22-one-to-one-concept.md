# Lumina 1:1 Concept — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать концепцию "1 пользователь = 1 девушка" — пользователь выбирает одну девушку через свайп, она исчезает из общего пула, при молчании 7 дней — уходит и пул пополняется.

**Architecture:** Новая таблица `assignments` с unique constraint на `girl_id WHERE released_at IS NULL` физически гарантирует эксклюзивность. Хук `useAssignment` читает/создаёт запись и является единственным источником истины о том, есть ли у юзера девушка. Feed показывает свайпы только незанятых девушек и при лайке создаёт assignment + редиректит на /chat. Chat перестаёт быть multi-dialog, показывает только одну девушку.

**Tech Stack:** React 19 + TypeScript, Supabase (PostgreSQL + Edge Functions), Deno (Edge Runtime), Framer Motion, React Router v7

---

## Файловая карта изменений

| Файл | Действие | Суть |
|---|---|---|
| `supabase/migrations/20260422_assignments.sql` | Создать | Таблицы assignments + waitlist, политики RLS, индексы |
| `supabase/migrations/20260422_reaper_cron.sql` | Создать | pg_cron для reaper каждые 6 часов |
| `supabase/functions/reaper/index.ts` | Создать | Edge Function: освобождает пары старше 7 дней |
| `src/hooks/useAssignment.tsx` | Создать | Хук: текущий assignment юзера, waitlist-статус |
| `src/pages/Feed.tsx` | Изменить | Показывает только свободных девушек; лайк = создать assignment |
| `src/pages/Chat.tsx` | Изменить | Убрать мульти-диалог; показывать только assigned girl |
| `src/pages/Waitlist.tsx` | Создать | Экран ожидания когда пул пуст |
| `src/pages/Released.tsx` | Создать | Экран "она ушла" когда assignment освобождён |
| `src/components/layout/Navbar.tsx` | Изменить | Скрыть Feed/Search при активном assignment |
| `src/App.tsx` | Изменить | Добавить маршруты /waitlist и /released |

---

## Task 1: SQL миграция — таблицы assignments + waitlist

**Files:**
- Create: `supabase/migrations/20260422_assignments.sql`

- [ ] **Шаг 1: Создать файл миграции**

```sql
-- supabase/migrations/20260422_assignments.sql
-- Таблица 1:1 назначений "юзер <-> девушка"
CREATE TABLE IF NOT EXISTS public.assignments (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id       text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  released_at   timestamptz,              -- NULL = активна
  release_reason text,                   -- 'reaper_7d' | 'user_released' | 'user_new'
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Ключевое ограничение: одна девушка не может быть у двух юзеров одновременно.
-- Partial unique index — работает только для активных (released_at IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS assignments_girl_active_uniq
  ON public.assignments (girl_id)
  WHERE released_at IS NULL;

-- Один активный assignment на юзера.
CREATE UNIQUE INDEX IF NOT EXISTS assignments_user_active_uniq
  ON public.assignments (user_id)
  WHERE released_at IS NULL;

-- Индекс для быстрого поиска активного assignment юзера.
CREATE INDEX IF NOT EXISTS assignments_user_id_idx ON public.assignments (user_id);

-- Таблица ожидания (когда пул пуст).
CREATE TABLE IF NOT EXISTS public.waitlist (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz              -- когда отправили уведомление
);

-- RLS: включаем на обеих таблицах.
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist   ENABLE ROW LEVEL SECURITY;

-- assignments: юзер видит только свои строки.
CREATE POLICY "assignments_select_own" ON public.assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "assignments_insert_own" ON public.assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Обновление (release) делает только сервис-роль (reaper) или сам юзер.
CREATE POLICY "assignments_update_own" ON public.assignments
  FOR UPDATE USING (auth.uid() = user_id);

-- waitlist: юзер видит только свою строку.
CREATE POLICY "waitlist_select_own" ON public.waitlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "waitlist_insert_own" ON public.waitlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "waitlist_delete_own" ON public.waitlist
  FOR DELETE USING (auth.uid() = user_id);
```

- [ ] **Шаг 2: Применить в Supabase Dashboard → SQL Editor**

Скопировать содержимое файла и выполнить. Убедиться что нет ошибок.

- [ ] **Шаг 3: Проверить что таблицы появились**

В Supabase Dashboard → Table Editor должны быть таблицы `assignments` и `waitlist`.

---

## Task 2: SQL миграция — reaper cron

**Files:**
- Create: `supabase/migrations/20260422_reaper_cron.sql`

- [ ] **Шаг 1: Создать файл миграции**

```sql
-- supabase/migrations/20260422_reaper_cron.sql
-- pg_cron каждые 6 часов вызывает reaper Edge Function.
-- Замени URL на реальный URL твоего Edge Function после деплоя.

SELECT cron.schedule(
  'lumina-reaper',
  '0 */6 * * *',  -- каждые 6 часов
  $$
    SELECT net.http_post(
      url     := 'https://rfmcpnpdqbhecwtodyaz.supabase.co/functions/v1/reaper',
      headers := '{"Content-Type":"application/json","x-reaper-secret":"' ||
                 current_setting('app.reaper_secret', true) || '"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);
```

- [ ] **Шаг 2: Установить секрет в Supabase Dashboard → Settings → Vault**

Добавить: `REAPER_SECRET` = случайная строка (например `openssl rand -hex 32`).

- [ ] **Шаг 3: Добавить секрет в Edge Function secrets**

В Supabase Dashboard → Edge Functions → Secrets добавить `REAPER_SECRET`.

---

## Task 3: Edge Function — reaper

**Files:**
- Create: `supabase/functions/reaper/index.ts`

- [ ] **Шаг 1: Создать файл**

```typescript
// supabase/functions/reaper/index.ts
// Освобождает assignments где юзер молчал > 7 дней.
// Запускается pg_cron каждые 6 часов.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-reaper-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INACTIVITY_DAYS = 7;

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // Защита секретом
  const expected = Deno.env.get('REAPER_SECRET');
  if (expected) {
    const got = req.headers.get('x-reaper-secret');
    if (got !== expected) return json(401, { error: 'unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase    = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 3600 * 1000).toISOString();

  // Находим активные assignments где юзер не писал > 7 дней.
  // Смотрим last_user_message_at из user_girl_state.
  // Если записи в user_girl_state нет — смотрим started_at в assignments.
  const { data: stale, error: staleErr } = await supabase
    .from('assignments')
    .select(`
      id, user_id, girl_id, started_at,
      user_girl_state!left(last_user_message_at)
    `)
    .is('released_at', null);

  if (staleErr) {
    console.error('[reaper] query error:', staleErr);
    return json(500, { error: staleErr.message });
  }

  const toRelease: { id: number; user_id: string; girl_id: string }[] = [];

  for (const row of (stale ?? [])) {
    // Последнее сообщение юзера — из user_girl_state или started_at.
    const state = Array.isArray(row.user_girl_state)
      ? row.user_girl_state[0]
      : row.user_girl_state;
    const lastActivity: string = state?.last_user_message_at ?? row.started_at;

    if (lastActivity < cutoff) {
      toRelease.push({ id: row.id, user_id: row.user_id, girl_id: row.girl_id });
    }
  }

  if (toRelease.length === 0) {
    console.log('[reaper] no stale assignments');
    return json(200, { released: 0 });
  }

  // Освобождаем assignments.
  const ids = toRelease.map(r => r.id);
  const { error: updateErr } = await supabase
    .from('assignments')
    .update({ released_at: new Date().toISOString(), release_reason: 'reaper_7d' })
    .in('id', ids);

  if (updateErr) {
    console.error('[reaper] update error:', updateErr);
    return json(500, { error: updateErr.message });
  }

  // Отправляем уведомления юзерам что девушка ушла.
  for (const r of toRelease) {
    try {
      await supabase.from('notifications').insert({
        user_id: r.user_id,
        type: 'girl_left',
        data: { girl_id: r.girl_id, reason: 'inactivity_7d' },
        is_read: false,
      });
    } catch (e) {
      console.warn('[reaper] notification failed for user', r.user_id, e);
    }
  }

  // Если у кого-то в waitlist теперь есть свободные девушки — уведомляем первых в очереди.
  // (Простая версия: просто notified_at пишем, фронт сам проверит при входе.)
  const freedGirlIds = toRelease.map(r => r.girl_id);
  console.log('[reaper] freed girls:', freedGirlIds);

  // Notify top of waitlist (up to freedGirlIds.length users)
  const { data: waiters } = await supabase
    .from('waitlist')
    .select('user_id')
    .is('notified_at', null)
    .order('joined_at', { ascending: true })
    .limit(toRelease.length);

  for (const waiter of (waiters ?? [])) {
    await supabase.from('waitlist').update({ notified_at: new Date().toISOString() }).eq('user_id', waiter.user_id);
    await supabase.from('notifications').insert({
      user_id: waiter.user_id,
      type: 'waitlist_ready',
      data: { message: 'Девушка ждёт тебя!' },
      is_read: false,
    }).catch(() => {});
  }

  console.log(`[reaper] released ${toRelease.length} assignments`);
  return json(200, { released: toRelease.length, girls: freedGirlIds });
});
```

- [ ] **Шаг 2: Задеплоить**

```bash
npx supabase@latest functions deploy reaper --project-ref rfmcpnpdqbhecwtodyaz
```

- [ ] **Шаг 3: Проверить в логах что функция стартует без ошибок**

---

## Task 4: Хук useAssignment

**Files:**
- Create: `src/hooks/useAssignment.tsx`

- [ ] **Шаг 1: Создать файл**

```typescript
// src/hooks/useAssignment.tsx
// Единственный источник истины о текущем assignment юзера.
// Возвращает: activeGirlId | null, isOnWaitlist, loading, createAssignment, releaseAssignment

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface AssignmentRow {
  id: number;
  girl_id: string;
  started_at: string;
}

interface AssignmentContext {
  activeGirlId: string | null;       // ID назначенной девушки или null
  assignmentId: number | null;        // PK assignments
  startedAt: string | null;           // когда началось
  isOnWaitlist: boolean;              // юзер в очереди ожидания
  loading: boolean;
  /** Создать assignment (вызвать после лайка на Feed) */
  createAssignment: (girlId: string) => Promise<{ error: string | null }>;
  /** Освободить assignment самостоятельно (кнопка "расстаться") */
  releaseAssignment: () => Promise<void>;
  /** Встать в очередь (вызвать если пул пуст) */
  joinWaitlist: () => Promise<void>;
  /** Покинуть очередь */
  leaveWaitlist: () => Promise<void>;
}

const AssignmentCtx = createContext<AssignmentContext | null>(null);

export function AssignmentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [isOnWaitlist, setIsOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(true);

  // Загрузить текущий статус при монтировании и при смене юзера.
  useEffect(() => {
    if (!user) {
      setAssignment(null);
      setIsOnWaitlist(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Активный assignment?
        const { data: asgn } = await supabase
          .from('assignments')
          .select('id, girl_id, started_at')
          .eq('user_id', user.id)
          .is('released_at', null)
          .maybeSingle();

        if (!cancelled) setAssignment(asgn ?? null);

        // В очереди?
        if (!asgn) {
          const { data: wl } = await supabase
            .from('waitlist')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!cancelled) setIsOnWaitlist(!!wl);
        } else {
          if (!cancelled) setIsOnWaitlist(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const createAssignment = useCallback(async (girlId: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'not_authenticated' };

    const { error } = await supabase.from('assignments').insert({
      user_id: user.id,
      girl_id: girlId,
    });

    if (error) {
      // Код 23505 = unique violation (девушку уже забрали)
      if (error.code === '23505') return { error: 'girl_taken' };
      return { error: error.message };
    }

    // Перезагрузить assignment
    const { data: asgn } = await supabase
      .from('assignments')
      .select('id, girl_id, started_at')
      .eq('user_id', user.id)
      .is('released_at', null)
      .maybeSingle();

    setAssignment(asgn ?? null);
    setIsOnWaitlist(false);
    return { error: null };
  }, [user]);

  const releaseAssignment = useCallback(async () => {
    if (!assignment || !user) return;

    await supabase.from('assignments')
      .update({ released_at: new Date().toISOString(), release_reason: 'user_released' })
      .eq('id', assignment.id);

    setAssignment(null);
  }, [assignment, user]);

  const joinWaitlist = useCallback(async () => {
    if (!user || isOnWaitlist) return;
    await supabase.from('waitlist').upsert({ user_id: user.id });
    setIsOnWaitlist(true);
  }, [user, isOnWaitlist]);

  const leaveWaitlist = useCallback(async () => {
    if (!user) return;
    await supabase.from('waitlist').delete().eq('user_id', user.id);
    setIsOnWaitlist(false);
  }, [user]);

  return (
    <AssignmentCtx.Provider value={{
      activeGirlId: assignment?.girl_id ?? null,
      assignmentId: assignment?.id ?? null,
      startedAt: assignment?.started_at ?? null,
      isOnWaitlist,
      loading,
      createAssignment,
      releaseAssignment,
      joinWaitlist,
      leaveWaitlist,
    }}>
      {children}
    </AssignmentCtx.Provider>
  );
}

export function useAssignment() {
  const ctx = useContext(AssignmentCtx);
  if (!ctx) throw new Error('useAssignment must be used within AssignmentProvider');
  return ctx;
}
```

- [ ] **Шаг 2: Подключить провайдер в main.tsx**

Открыть `src/main.tsx`, найти дерево провайдеров и добавить `AssignmentProvider` внутри `AuthProvider`:

```tsx
// src/main.tsx — добавить импорт
import { AssignmentProvider } from './hooks/useAssignment';

// В JSX обернуть так:
<AuthProvider>
  <AssignmentProvider>
    {/* остальные провайдеры */}
  </AssignmentProvider>
</AuthProvider>
```

---

## Task 5: Feed.tsx — новая логика

**Files:**
- Modify: `src/pages/Feed.tsx`

Сейчас Feed показывает всех девушек и не знает про assignments. Нужно:
1. Если у юзера есть активный assignment → redirect на `/chat` (он уже "занят").
2. Загружать только **свободных** девушек (чьи girl_id не в активных assignments).
3. При лайке (свайп вправо или кнопка) → `createAssignment(girl.id)` → если успешно → redirect `/chat`.
4. Если свободных девушек нет → показать waitlist CTA.

- [ ] **Шаг 1: Добавить импорт useAssignment и логику redirect**

Найти в `Feed.tsx` начало компонента Feed (строка 289) и добавить:

```tsx
// Добавить импорт в самый верх файла (после существующих)
import { useAssignment } from '../hooks/useAssignment';

// Внутри компонента Feed, сразу после существующих хуков (строка ~293):
const { activeGirlId, loading: assignmentLoading, createAssignment, isOnWaitlist, joinWaitlist } = useAssignment();

// Redirect если уже есть девушка — добавить useEffect после существующих auth-guard:
useEffect(() => {
  if (!assignmentLoading && activeGirlId) {
    navigate('/chat', { replace: true });
  }
}, [activeGirlId, assignmentLoading, navigate]);
```

- [ ] **Шаг 2: Загрузить занятые girl_id из Supabase и отфильтровать girls**

Добавить state и useEffect для получения занятых девушек:

```tsx
// Добавить state
const [takenGirlIds, setTakenGirlIds] = useState<Set<string>>(new Set());
const [takenLoading, setTakenLoading] = useState(true);

// Добавить useEffect (после существующих)
useEffect(() => {
  (async () => {
    const { data } = await supabase
      .from('assignments')
      .select('girl_id')
      .is('released_at', null);
    setTakenGirlIds(new Set((data ?? []).map((r: { girl_id: string }) => r.girl_id)));
    setTakenLoading(false);
  })();
}, []);

// Изменить useMemo для girls (строка ~305): добавить фильтрацию занятых
const girls = useMemo(
  () => allGirls.filter(g => matchesFilters(g, filters) && !takenGirlIds.has(g.id)),
  [allGirls, filters, takenGirlIds],
);
```

- [ ] **Шаг 3: Заменить логику handleSwipe — при лайке создавать assignment**

Найти функцию `handleSwipe` (~строка 411) и изменить блок `if (dir === 'right')`:

```tsx
if (dir === 'right') {
  if (likesLeft <= 0) {
    setPaywallType('likes');
    return;
  }
  setLimits((prev) => ({ ...prev, likes: prev.likes + 1 }));

  // Создаём assignment вместо syncLike
  const { error: aError } = await createAssignment(girl.id);
  if (aError === 'girl_taken') {
    // Девушку только что забрал другой юзер — просто убираем карточку
    setCurrentIndex((prev) => prev + 1);
    return;
  }
  if (!aError) {
    // Успешно! Показываем match-анимацию, потом редиректим
    const delay = MATCH_DELAY_MIN + Math.random() * (MATCH_DELAY_MAX - MATCH_DELAY_MIN);
    setTimeout(() => {
      setMatchGirl(girl);
    }, delay);
  }
}
```

Также изменить `if (dir === 'up')` аналогично (superlike тоже создаёт assignment).

- [ ] **Шаг 4: Изменить closeMatch — редиректить на /chat без параметра girl**

```tsx
function closeMatch() {
  setMatchGirl(null);
  navigate('/chat', { replace: true });
}
```

- [ ] **Шаг 5: Добавить пустой экран "все заняты" с кнопкой Waitlist**

В JSX секции `{isOutOfCards ? (` добавить проверку: если `!takenLoading && girls.length === 0 && takenGirlIds.size > 0` — показывать специальный экран:

```tsx
{!takenLoading && allGirls.filter(g => !takenGirlIds.has(g.id)).length === 0 ? (
  <div className={s.emptyStack}>
    <div className={s.emptyIcon}>
      <Heart size={48} strokeWidth={1.5} />
    </div>
    <h3 className={s.emptyTitle}>Все девушки заняты</h3>
    <p className={s.emptyText}>
      Как только кто-то освободится — мы тебе сообщим.
    </p>
    <button className={s.resetBtn} onClick={joinWaitlist}>
      Встать в очередь
    </button>
  </div>
) : isOutOfCards ? (
  /* ... существующий emptyStack ... */
) : (
  /* ... существующий AnimatePresence ... */
)}
```

- [ ] **Шаг 6: Добавить loading guard для assignmentLoading + takenLoading**

В секции loading (строка ~611) добавить:

```tsx
if (authLoading || assignmentLoading || takenLoading) {
  return (
    <div className={s.page}>
      <Navbar />
      <main className={s.main}>
        <div className={s.loading}><div className={s.loadingSpinner} /></div>
      </main>
    </div>
  );
}
```

---

## Task 6: Chat.tsx — убрать мультидиалог, показывать только assigned girl

**Files:**
- Modify: `src/pages/Chat.tsx`

Сейчас Chat.tsx имеет левую панель со списком всех девушек. По новой концепции:
- У юзера одна девушка → никакого списка.
- `currentGirl` берётся из `useAssignment().activeGirlId`, не из URL параметра.
- Если assignment нет → redirect на `/feed`.
- Левая колонка с dialogs — убирается полностью из UI (или прячется).

- [ ] **Шаг 1: Добавить импорт useAssignment в Chat.tsx**

```tsx
// Добавить к существующим импортам
import { useAssignment } from '../hooks/useAssignment';
import { getLocalizedGirlById } from '../data/girls';
```

- [ ] **Шаг 2: Заменить логику выбора currentGirl**

Найти в Chat.tsx блок `/* ── Select girl from URL ── */` (~строка 251) и заменить:

```tsx
// УБРАТЬ старый useEffect с searchParams
// ДОБАВИТЬ:
const { activeGirlId, loading: assignmentLoading } = useAssignment();

// Redirect если нет девушки
useEffect(() => {
  if (!assignmentLoading && !activeGirlId) {
    navigate('/feed', { replace: true });
  }
}, [activeGirlId, assignmentLoading, navigate]);

// Установить currentGirl из activeGirlId
useEffect(() => {
  if (activeGirlId) {
    const found = getLocalizedGirlById(lang, activeGirlId);
    if (found) setCurrentGirl(found);
  }
}, [activeGirlId, lang]);
```

- [ ] **Шаг 3: Убрать загрузку dialogs для всех девушек**

Найти `/* ── Load real dialog previews from Supabase ── */` (~строка 267) и удалить весь этот useEffect (он грузит данные по всем девушкам — нам это больше не нужно).

Также удалить state `dialogs` и `setDialogs`.

- [ ] **Шаг 4: Скрыть левую панель (dialogs sidebar)**

В JSX найти `{dialogsOpen && (` или секцию с `s.sidebar` / `s.dialogs` — заменить на:

```tsx
{/* Левая панель удалена — в концепции 1:1 нет списка чатов */}
```

Кнопку открытия sidebar (иконка Menu / бургер) также убрать или скрыть.

- [ ] **Шаг 5: Убрать searchParams из URL навигации**

Убрать `const [searchParams, setSearchParams] = useSearchParams();` если он больше не используется.

Почистить `useEffect` зависящие от `searchParams`.

- [ ] **Шаг 6: Добавить loading guard для assignmentLoading**

```tsx
if (authLoading || assignmentLoading) {
  return (
    <div /* existing loading JSX */ />
  );
}
```

---

## Task 7: Страница Waitlist

**Files:**
- Create: `src/pages/Waitlist.tsx`
- Create: `src/pages/Waitlist.module.css`

- [ ] **Шаг 1: Создать Waitlist.tsx**

```tsx
// src/pages/Waitlist.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Heart, Bell } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import Navbar from '../components/layout/Navbar';
import { useAssignment } from '../hooks/useAssignment';
import s from './Waitlist.module.css';

export default function Waitlist() {
  const navigate = useNavigate();
  const { activeGirlId, isOnWaitlist, loading, joinWaitlist, leaveWaitlist } = useAssignment();

  // Если вдруг появилась девушка (уведомление от reaper) — редирект на /feed
  useEffect(() => {
    if (!loading && activeGirlId) {
      navigate('/chat', { replace: true });
    }
  }, [activeGirlId, loading, navigate]);

  // Если не в очереди и нет девушки → встаём в очередь автоматически
  useEffect(() => {
    if (!loading && !activeGirlId && !isOnWaitlist) {
      joinWaitlist();
    }
  }, [loading, activeGirlId, isOnWaitlist, joinWaitlist]);

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />
        <main className={s.main} id="main-content">
          <motion.div
            className={s.card}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={s.iconWrap}>
              <Clock size={48} strokeWidth={1.5} />
            </div>
            <h1 className={s.title}>Все девушки сейчас заняты</h1>
            <p className={s.subtitle}>
              Ты в очереди. Как только кто-то освободится — мы пришлём уведомление.
            </p>
            <div className={s.statusRow}>
              <Bell size={16} />
              <span>{isOnWaitlist ? 'Ты в очереди' : 'Встаём в очередь...'}</span>
            </div>
            <div className={s.divider} />
            <p className={s.hint}>
              <Heart size={14} />
              Обычно ожидание занимает не более нескольких дней
            </p>
            <button
              className={s.leaveBtn}
              onClick={async () => {
                await leaveWaitlist();
                navigate('/', { replace: true });
              }}
            >
              Покинуть очередь
            </button>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Шаг 2: Создать Waitlist.module.css**

```css
/* src/pages/Waitlist.module.css */
.page {
  display: flex;
  min-height: 100dvh;
  background: var(--bg-primary);
}
.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  margin-left: var(--navbar-width, 72px);
}
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  padding: 3rem 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.iconWrap {
  color: var(--accent);
  margin-bottom: 0.5rem;
}
.title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}
.subtitle {
  color: var(--text-secondary);
  line-height: 1.6;
}
.statusRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent);
  font-weight: 600;
}
.divider {
  width: 100%;
  height: 1px;
  background: var(--border-color);
}
.hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.leaveBtn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 0.625rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  transition: border-color 0.2s, color 0.2s;
}
.leaveBtn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}
```

---

## Task 8: Страница Released ("она ушла")

**Files:**
- Create: `src/pages/Released.tsx`
- Create: `src/pages/Released.module.css`

- [ ] **Шаг 1: Создать Released.tsx**

```tsx
// src/pages/Released.tsx
// Показывается когда reaper освободил assignment.
// Юзер видит сообщение и кнопку вернуться в ленту.
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartCrack, RotateCcw } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import Navbar from '../components/layout/Navbar';
import s from './Released.module.css';

export default function Released() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />
        <main className={s.main} id="main-content">
          <motion.div
            className={s.card}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, type: 'spring' }}
          >
            <div className={s.iconWrap}>
              <HeartCrack size={52} strokeWidth={1.5} />
            </div>
            <h1 className={s.title}>Она ушла</h1>
            <p className={s.subtitle}>
              Ты не писал слишком долго, и она решила двигаться дальше.
              Это нормально — иногда так бывает.
            </p>
            <p className={s.hint}>
              Но где-то там ждёт другая девушка, которая сможет стать
              важной частью твоей жизни.
            </p>
            <button
              className={s.btn}
              onClick={() => navigate('/feed', { replace: true })}
            >
              <RotateCcw size={18} />
              Найти новую
            </button>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
```

- [ ] **Шаг 2: Создать Released.module.css**

```css
/* src/pages/Released.module.css */
.page {
  display: flex;
  min-height: 100dvh;
  background: var(--bg-primary);
}
.main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  margin-left: var(--navbar-width, 72px);
}
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  padding: 3rem 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}
.iconWrap {
  color: #EC4899;
}
.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
}
.subtitle {
  color: var(--text-secondary);
  line-height: 1.6;
}
.hint {
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.6;
}
.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent);
  color: white;
  border: none;
  padding: 0.875rem 2rem;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 0.5rem;
}
.btn:hover { opacity: 0.85; }
```

---

## Task 9: Обновить Navbar — скрыть Feed/Search при активном assignment

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Шаг 1: Добавить импорт useAssignment в Navbar**

```tsx
// Добавить к существующим импортам
import { useAssignment } from '../../hooks/useAssignment';
```

- [ ] **Шаг 2: Использовать activeGirlId в компоненте Navbar**

Внутри компонента `Navbar` (после существующих хуков):

```tsx
const { activeGirlId } = useAssignment();
```

- [ ] **Шаг 3: Изменить navItems — скрывать Feed и Search**

Найти массив `navItems` (~строка 45) и заменить:

```tsx
const navItems: NavItem[] = [
  // Feed и Search показываем ТОЛЬКО если нет активного assignment
  ...(!activeGirlId ? [
    { to: '/search', icon: <Search size={22} />, labelKey: 'navbar.search' },
    { to: '/feed',   icon: <Heart size={22} />,  labelKey: 'navbar.feed' },
  ] : []),
  {
    to: '/chat',
    icon: <MessageCircle size={22} />,
    labelKey: 'navbar.messages',
    badge: messagesBadge,
  },
  {
    to: '/notifications',
    icon: <Bell size={22} />,
    labelKey: 'navbar.notifications',
    badge: notificationsBadge,
  },
  { to: '/premium',  icon: <Crown size={22} />,    labelKey: 'navbar.premium', premium: true },
  { to: '/profile',  icon: <User size={22} />,     labelKey: 'navbar.profile' },
  { to: '/settings', icon: <Settings size={22} />, labelKey: 'navbar.settings' },
];
```

---

## Task 10: Обновить App.tsx — добавить новые маршруты

**Files:**
- Modify: `src/App.tsx`

- [ ] **Шаг 1: Добавить lazy imports для Waitlist и Released**

```tsx
const Waitlist  = lazy(() => import('./pages/Waitlist'));
const Released  = lazy(() => import('./pages/Released'));
```

- [ ] **Шаг 2: Добавить маршруты внутри ProtectedRoute**

```tsx
<Route element={<ProtectedRoute />}>
  {/* ... существующие маршруты ... */}
  <Route path="/waitlist" element={<Waitlist />} />
  <Route path="/released" element={<Released />} />
</Route>
```

---

## Task 11: Обновить proactive-tick — градация при молчании

**Files:**
- Modify: `supabase/functions/proactive-tick/index.ts`

При молчании 48ч–7дней девушка "грустит" — другое поведение вместо random/silence триггеров.

- [ ] **Шаг 1: Добавить константы**

```typescript
// Добавить после существующих констант (строка ~33)
const MISSING_HIM_HOURS = 48;     // через 48ч без ответа — она начинает скучать
const REAPER_WARNING_DAYS = 5;    // через 5 дней — предупреждение (реализуется через уведомление)
```

- [ ] **Шаг 2: Добавить проверку режима "скучает"**

В функции `processPair` (~строка 308), после ghosted gate, перед триггерами:

```typescript
// Режим "скучает": юзер молчит 48ч–7дней.
// В этом режиме силиарный random off, только специальные "скучающие" сообщения.
const hoursSinceUserMsg = lastUser > 0 ? (now - lastUser) / 3600_000 : null;
const isMissingHim = hoursSinceUserMsg !== null && hoursSinceUserMsg >= MISSING_HIM_HOURS;

// Если она "скучает" — используем специальный missing_trigger вместо обычных
if (isMissingHim && !trigger) {
  // 1 раз в 24ч писать "скучаю"
  const lastProactive = pair.last_proactive_at ? new Date(pair.last_proactive_at).getTime() : 0;
  const hoursSinceLastProactive = (now - lastProactive) / 3600_000;
  if (hoursSinceLastProactive >= 24) {
    trigger = 'silence';
    hoursSinceLastOwn = hoursSinceUserMsg;
  }
}
```

- [ ] **Шаг 3: Задеплоить обновлённый proactive-tick**

```bash
npx supabase@latest functions deploy proactive-tick --project-ref rfmcpnpdqbhecwtodyaz
```

---

## Task 12: Финальная проверка

- [ ] **Шаг 1: Собрать проект без ошибок TypeScript**

```bash
npm run build
```

Ожидаемый результат: `dist/` создан, 0 ошибок.

- [ ] **Шаг 2: Запустить dev и проверить основные сценарии вручную**

```bash
npm run dev
```

Проверить:
1. Новый юзер → `/feed` → видит девушек → свайп вправо → assignment создан → редирект `/chat` → видит только одну девушку
2. У юзера с assignment → `/feed` → мгновенный редирект на `/chat`
3. В Navbar Feed/Search исчезают когда assignment активен
4. Все девушки заняты → `/feed` → экран waitlist

- [ ] **Шаг 3: Задеплоить фронт**

```bash
git add -A
git commit -m "feat: implement 1:1 assignment concept"
git push
```

Vercel задеплоит автоматически.

---

## Примечания

### Про persona девушек
После этого рефактора **каждой** из 10 девушек нужно заполнить `system_prompt` в таблице `girl_personas`. Сейчас только Алина заполнена. Это отдельная задача (написать промпты для 9 оставшихся).

### Про сжатие промптов
Оптимизации токенов (prompt caching, компактный system prompt, гибридные модели) — отдельный план. Делать после того как 1:1 концепт будет стабильно работать.

### Совместимость со старыми данными
Существующие `messages` и `memories` юзеров-тестеров остаются. Для них нужно вручную создать запись в `assignments` через SQL Editor:
```sql
INSERT INTO assignments (user_id, girl_id)
VALUES ('<ваш_user_id>', 'alina');
```
