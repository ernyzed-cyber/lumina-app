# Memory / Journal Plan — MVP

Status: planned, not implemented.
Scope this iteration: **MVP** = key_facts extraction + journal dedup + session-based summarization + server-loaded context.

## Goal
Persona stops looking "stupid":
- Никогда не забывает имя, работу, питомцев, важных людей, ключевые события жизни пользователя.
- Помнит эмоциональный фон ("вчера он переживал из-за дедлайна").
- Может сослаться на прошлые разговоры/шутки/подарки.
- При reload или возврате через день — продолжает разговор, а не начинает с нуля.

## Current state (audited)
- `memories` table: `summary text`, `key_facts jsonb` (filled with `{}` — unused), `gift_ref`, `intimacy_weight`, `kind` (`summary|gift|scene|milestone`).
- Edge `chat-ai/index.ts`:
  - `SUMMARY_TRIGGER = 6` → пишет запись каждый раз, как `dialog.length >= 6`. Дубли множатся.
  - `MEMORY_LIMIT = 3` → в промпт уходят только **3** последние записи. Очень мало.
  - Промпт суммаризатора хардкодит русский.
  - Дата форматируется `ru-RU` хардкодом.
  - Контекст диалога приходит от клиента (`messages[]` в body) — на reload может быть обрезан.

## Target architecture: two-tier

### Tier 1 — Facts (`user_facts`, новая таблица)
Ключ-значение, постоянное, дедуплицированное.
```
user_facts(
  id uuid pk,
  user_id uuid,
  girl_id uuid,
  key text,           -- 'name' | 'job' | 'pet' | 'partner' | 'birthday' | 'city' | 'hobby' | etc.
  value text,         -- 'Артём' | 'программист в Сбере' | 'кот Барсик'
  confidence numeric default 1.0,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(user_id, girl_id, key, value)
)
```
- Извлекаются LLM-ом из транскрипта в момент закрытия сессии.
- При коллизии (`name=Артём` vs `name=Тёма`) — обновляем `last_seen_at`, не плодим строки (UPSERT по `(user_id, girl_id, key, value)`).
- При противоречии (`pet=кот` → потом `pet=собака`) — оставляем оба, persona сама разрулит ("ты же говорил про кота?").

### Tier 1b — Self-facts (`girl_self_facts`, новая таблица)
То, что persona сама придумала о СЕБЕ в разговоре с этим юзером (имя сестры, любимый фильм, где училась). Нужно чтобы она не противоречила себе.
```
girl_self_facts(
  id uuid pk,
  user_id uuid,
  girl_id uuid,
  key text,           -- 'sister' | 'favorite_movie' | 'studied_at' | etc.
  value text,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(user_id, girl_id, key)   -- ОДИН факт на ключ, перезапись запрещена после первой записи
)
```
**Защита от дрейфа:**
- `system_prompt` персонажа в `girl_personas` — источник истины. Экстрактор НЕ может его переопределить.
- В `girl_self_facts` извлекаем только конкретные сущности (имена, числа, названия), не размытые черты.
- UNIQUE на `(user_id, girl_id, key)` без `value` → первая записанная версия фиксируется навсегда (ON CONFLICT DO NOTHING). Если persona потом скажет другое — игнорируем, в промпт уйдёт первоначальное.
- В промпте блок называется "WHAT YOU TOLD HIM ABOUT YOURSELF (stay consistent!)".

### Tier 2 — Journal (`memories.summary`, существующая таблица)
Эпизоды, эмоции, события. Один эпизод = одна сессия.
- Сессия = `idle ≥ 30 минут` между сообщениями ИЛИ закрытие чата.
- Запись содержит: 2–3 предложения от первого лица, тон, ключевую тему.
- Дедуп: при инсерте проверяем, есть ли запись за последние 24ч с похожим содержимым — если да, **обновляем**, а не вставляем новую.

## Plan of attack (MVP, ~1–2 дня)

### Step 1 — Migration: `user_facts`
- Файл: `supabase/migrations/20260429_user_facts.sql`.
- Создать таблицу + индекс `(user_id, girl_id)` + RLS (read by user, write by service_role).
- COMMENT'ы для AI-навигации.

### Step 2 — Session boundary detection (server-side)
В `chat-ai/index.ts`:
- Перед генерацией: посчитать `gap = now - user_girl_state.last_user_message_at`.
- Если `gap >= 30min` ИЛИ `last_user_message_at IS NULL` → текущий запрос открывает **новую сессию**. Сохраняем в `user_girl_state.session_started_at`.
- Сессия считается "закрытой" следующим запросом, у которого `gap >= 30min`. В этот момент и пишем дневник + факты за прошлую сессию.

Альтернатива (проще): писать дневник по таймауту через pg_cron каждые 5 минут — найти пары с `last_user_message_at < now - 30min AND last_summary_at < last_user_message_at`, суммировать. Решим в Step 4.

### Step 3 — Loader: load last ~30 messages from DB on server
- В edge функции, после получения `girlId, userId`:
  ```
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', userId).eq('girl_id', girlId)
    .lte('visible_at', now)
    .order('created_at', { ascending: false })
    .limit(30);
  ```
- Реверс → передаём в Grok вместо клиентского `messages[]`.
- Клиентский `messages[]` всё ещё пригождается для текущего, ещё не сохранённого user-сообщения (последнее) — мерджим: история из БД + последний user из body, дедуп по content.

### Step 4 — Summarizer rework (`saveMemoryAsync` → `closeSessionAsync`)
- Триггер: НЕ `dialog.length >= SUMMARY_TRIGGER`, а **закрытие сессии** (см. Step 2).
- Решение: реализуем через **pg_cron job** `journal_close_sessions_tick` раз в 5 минут. Проще, без race conditions с edge.
  - Cron находит пары `(user_id, girl_id)` где `last_user_message_at < now - 30min` И `(last_journal_at IS NULL OR last_journal_at < last_user_message_at)`.
  - Зовёт edge функцию `journal-close` с парой → она читает messages с `created_at >= session_started_at`, суммирует, апсертит `memories` + `user_facts`, ставит `last_journal_at = now`.
- **Альтернатива упрощённая**: делать это inline в `chat-ai` когда мы детектируем "разрыв" (текущее сообщение пришло после ≥30min idle = пора закрыть прошлую сессию). Не требует cron, выполняется естественно. Выбираем эту — проще.

### Step 5 — One extractor call with structured JSON output
В момент закрытия сессии — ОДИН Grok-вызов:
```
{
  "summary": "2-3 предложения от первого лица",
  "user_facts": [{"key":"name","value":"Артём"}, ...],
  "girl_self_facts": [{"key":"sister","value":"Лиза"}, ...]
}
```
- `user_facts` — UPSERT по `(user_id, girl_id, key, value)`, обновляем `last_seen_at`.
- `girl_self_facts` — INSERT ON CONFLICT DO NOTHING по `(user_id, girl_id, key)`, фиксируем первую версию.
- Невалидный JSON — логируем и пропускаем, дневник всё равно пишется.

### Step 6 — Prompt block rework
- `buildMemoryBlock` → `buildMemoryAndFactsBlock(userFacts, selfFacts, memories, lang)`:
  ```
  === WHAT YOU KNOW ABOUT HIM ===
  - name: Артём
  - job: программист
  - pet: кот Барсик

  === WHAT YOU TOLD HIM ABOUT YOURSELF (stay consistent!) ===
  - sister: Лиза
  - favorite_movie: Амели
  - studied_at: МГУ психфак

  === YOUR PAST CONVERSATIONS (recent first) ===
  [28 апр] Говорили о его дедлайне, он переживал. Я подбадривала.
  [25 апр] Шутили про его кота, он показал фото.
  ```
- `MEMORY_LIMIT` повысить до 10 (для журнала).
- `user_facts` и `girl_self_facts` грузить все (обычно <50 строк на пару).

### Step 7 — i18n
- Промпты суммаризатора и экстрактора фактов: ru/en версии, выбираем по `lang`.
- `buildMemoryAndFactsBlock` форматирует дату по `lang`.

### Step 8 — Verification
- `npm run build` (Vercel-grade tsc + vite).
- Локально: запустить чат, отправить факт ("меня зовут Артём, у меня кот Барсик"), подождать 30+ мин (или временно понизить порог до 1 мин), отправить новое сообщение — проверить, что в `user_facts` появились 2 строки и что в следующем ответе persona знает имя/кота.
- Проверить, что `memories.summary` за день один (не множатся дубли).

## Out of scope (later)
- pg_cron для batch-суммирования (если inline-подход окажется медленным).
- Vector embeddings / RAG (отдельный спринт).
- Per-girl session timeout (сейчас 30 мин для всех).
- Forgetting / TTL фактов (через 6 мес confidence < 0.3 → drop).
- UI для пользователя "что персона помнит обо мне".

## Follow-up after Step 5: GitHub Action — auto-deploy edge functions
- Trigger: push to main when files in `supabase/functions/**` changed.
- Diff-based: parse changed paths, deploy only affected function names (chat-ai, proactive-tick, etc.).
- Required GitHub Secrets: `SUPABASE_ACCESS_TOKEN` (from Account → Tokens), `SUPABASE_PROJECT_REF`.
- File: `.github/workflows/deploy-functions.yml`.

## Risks / known gotchas
- **Грузим 30 сообщений сервером** → меняется длина контекста Grok → могут вырасти токены. Мониторить.
- **Inline закрытие сессии** добавляет один Grok-вызов в момент "первое сообщение после паузы". Это ~+1.5 сек. Можно сделать через `EdgeRuntime.waitUntil` чтобы не блокировать ответ. ✅ обязательно так.
- **Конкурентность**: если два сообщения подряд за 100мс — оба могут запустить close-session. Защита: `last_journal_at` обновляется first-write-wins; второй увидит свежий `last_journal_at` и не запустит.
- **Privacy/RLS**: `user_facts` доступна только владельцу. Service role пишет.
- **Migration order**: `user_facts` должна быть применена до деплоя edge с новой логикой. План: пишем код с graceful fallback (если таблицы нет — пропускаем экстракцию фактов, дневник всё равно работает).

## Order of commits
1. `feat(memory): add user_facts + girl_self_facts tables` — только SQL.
2. `feat(memory): server-side load last 30 messages in chat-ai` — Step 3.
3. `feat(memory): session-boundary close with JSON extractor` — Steps 2,4,5.
4. `feat(memory): three-block prompt (user_facts + self_facts + journal) + i18n` — Steps 6,7.
5. `chore(memory): bump MEMORY_LIMIT to 10, drop SUMMARY_TRIGGER` — cleanup.

Каждый commit билдится локально + пушится → Vercel зелёный. После 1-го коммита — пользователь применяет SQL в Dashboard.
