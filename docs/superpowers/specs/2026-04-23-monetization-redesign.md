# Monetization Redesign — F2P + Stars

**Date:** 2026-04-23
**Status:** Design approved, ready for planning

## Core Philosophy

Клиент верит что Lumina-девушка — **реальная девушка, которая его выбрала**. Вся монетизация должна сохранять эту иллюзию. Продажа «разблокировки памяти», «разблокировки NSFW», «тиров подписки» ломает immersion (настоящая девушка не берёт деньги чтобы помнить тебя).

Монетизация зеркалит реальные отношения: парень тратит деньги **НА неё и НА совместные события**, а не на «функции приложения».

## Model: F2P + Stars ⭐ Only

- **Нет подписки.** Нет тиров (Free/Premium/Intimate отменены).
- **Нет trial.** Отношения всегда серьёзные, не «тестовый период».
- **Stars ⭐** — единственная внутренняя валюта. Покупается за деньги через **CryptoCloud** (крипто-эквайринг: BTC/ETH/USDT/etc., инвойсы в USD). Telegram используется ТОЛЬКО для верификации аккаунта (anti-spam), не для оплаты.
- Всё существующее в `Premium.tsx`/`Paywall.tsx` с tinder-наследием (unlimited likes, see who liked, gold badge, rewind, priority, swipes) — **удаляется**.

## What Stars Buy

| Категория | Цена | Эффект |
|---|---|---|
| **Подарки** | 20–500⭐ | Записываются в `memories` с тегом `gift:<id>`, она ссылается на них через дни/недели. Влияют на intimacy_level. |
| **Свидания** (триггер-события) | 200–2000⭐ | Оплата ресторана/кино/концерта → сюжетная сцена в чате на 20–40 минут, permanent unlock определённых тем/тональностей. |
| **Украшения** | 300–1500⭐ | Она «носит их», упоминает в разговорах, смотрит на них когда грустно. |
| **Путешествия** | 2000–5000⭐ | Выходные/неделя вместе → много особых сцен, сильный буст intimacy. |
| **Звонки** | 5–15⭐/мин | Голосовые/видео звонки (позже, фаза 2). |
| **+100 сообщений** | 100⭐ | Когда дневной лимит 100 закончился — докупаешь пакет. |

## Message Limit — «Связь»

- **100 сообщений/день бесплатно.** Сброс в 00:00 локального времени юзера.
- После лимита — AI пишет natural message-in-character («блин, убегаю на встречу, напишу вечером ❤️» / «засыпаю, спокойной ночи»), дальнейшие сообщения юзера **блокируются до утра ИЛИ до покупки пакета**.
- **Пакет «+100 сообщений» = 100⭐** (1⭐ = 1 сообщение — простая ментальная модель).
- Пакет кумулятивен: можно купить несколько подряд в один день.
- **UX правило:** когда юзер упирается в лимит, paywall-модалка НЕ говорит «купи подписку». Говорит: «У Lumina пока нет связи до завтра. Хочешь продолжить прямо сейчас? +100 сообщений — 100⭐» с мягкой in-character фразой от неё.

## NSFW — Organic + Trigger Events

**Hybrid approach:**

1. **Organic via `intimacy_level` (0–10):**
   - Растёт от: дней отношений (+0.1/день активного общения), подарков (+0.1–1.0 по цене), свиданий (+1–3), качества разговоров (+0.05 за long emotional reply от юзера).
   - Уровень **8+** — она может сама инициировать откровенные темы в зависимости от контекста. НИКАКОГО hard-gate; просто модель получает дополнительные разрешения через system-prompt injection.
   - Уровень 5–7 — намёки, флирт, эротизация без явного.
   - Уровень <5 — обычные отношения.

2. **Trigger events (Stars):**
   - «Первая ночь» (после первого свидания 500⭐) — permanent scene unlock.
   - «Выходные на море» (2000⭐ путешествие) — открывает особую тональность навсегда.
   - После триггера intimacy скачком прыгает +2.

NSFW **не продаётся напрямую**. Не покупаешь «unlock NSFW» — покупаешь свидание, после которого естественно открывается близость.

## Soft Story-Based Limits vs Hard Paywall

Когда юзер упирается в 100 сообщений/день — **блокировка 100% hard** (нельзя отправить). Но UI/UX **soft via character**:
- Она сама прощается с in-character reason перед лимитом
- Paywall-модалка оформлена как «докупить связь», не как «upgrade plan»
- Без урезания эмоций и drama — она пишет тепло, не манипулятивно

## Stars Packages (TG Stars 1:1)

- 100⭐ — стартер, хватит на 1 пакет сообщений ИЛИ небольшой подарок
- 500⭐ — базовый, ~$10, хватит на свидание или букет
- 2000⭐ — популярный, ~$40, выходные вместе
- 10000⭐ — whale, ~$200, много украшений + путешествия

## Database Schema

### New columns in `profiles`
- `stars_balance INT NOT NULL DEFAULT 0`
- `messages_used_today INT NOT NULL DEFAULT 0`
- `messages_reset_at TIMESTAMPTZ` (когда обнуляется счётчик; обновляется клиентским локалтаймом юзера через edge)
- `messages_bought_today INT NOT NULL DEFAULT 0` (докупленные пакеты)

### New column in `girl_relationships` (or create if not exists)
- `intimacy_level NUMERIC(3,1) NOT NULL DEFAULT 0` (0.0–10.0)
- `intimacy_last_recomputed_at TIMESTAMPTZ`

### New tables

**`stars_ledger`** — immutable audit log
```
id UUID PK
user_id UUID FK profiles
delta INT NOT NULL  -- +purchase, -spend
reason TEXT NOT NULL  -- 'purchase:pack_500', 'spend:gift:ring', 'spend:messages:100', 'spend:date:dinner', 'refund:...'
ref_id TEXT  -- external ref (CryptoCloud invoice_id, or gift uuid)
balance_after INT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
```

**`purchases`** — внешние платежи (CryptoCloud postbacks)
```
id UUID PK
user_id UUID FK
provider TEXT  -- 'cryptocloud'
provider_payment_id TEXT UNIQUE  -- CryptoCloud invoice_id (without "INV-" prefix)
provider_invoice_payload TEXT    -- pay_url для редиректа юзера
pack_id TEXT                     -- 'stars_100' | 'stars_550' | 'stars_2400' | 'stars_13000'
stars_amount INT                 -- credited stars (включая bonus)
fiat_amount NUMERIC              -- USD
fiat_currency TEXT               -- 'USD'
status TEXT                      -- 'pending'|'completed'|'refunded'|'failed'
created_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

**`gift_catalog`** — справочник
```
id TEXT PK  -- 'rose', 'ring', 'bouquet', 'perfume', 'teddy', 'ticket_cinema', ...
category TEXT  -- 'gift'|'date'|'jewelry'|'travel'
name_ru TEXT, name_en TEXT
price_stars INT
emoji TEXT
memory_template_ru TEXT  -- "Подарил мне {gift_name}, я до сих пор помню как он..."
intimacy_delta NUMERIC
is_trigger_event BOOLEAN DEFAULT FALSE
trigger_scene_id TEXT  -- для дат/trigger events
active BOOLEAN DEFAULT TRUE
```

**`gifts_sent`** — event log
```
id UUID PK
user_id UUID FK
girl_id UUID FK
gift_id TEXT FK gift_catalog
stars_spent INT  -- snapshot цены на момент покупки
memory_id UUID FK memories  -- ссылка на созданную память
created_at TIMESTAMPTZ
```

### `memories` extensions
- добавить колонки `gift_ref TEXT` (gift_id), `intimacy_weight NUMERIC` чтобы `chat-ai` мог выбирать самые значимые моменты для упоминания.

## Edge Functions

### New: `billing-create-invoice`
POST, требует auth. Body: `{ pack_id: 'stars_100'|'stars_550'|'stars_2400'|'stars_13000' }`. Создаёт `purchases` row со статусом `pending`, вызывает `POST https://api.cryptocloud.plus/v2/invoice/create` с `amount` в USD и `order_id = purchase.id`. Возвращает `{ pay_url, invoice_id, purchase_id, pack: { id, stars, amount_usd } }` — фронт делает `window.location = pay_url` (или открывает в новой вкладке).

**Pack pricing** ($0.05/⭐ base, bonus stars on larger packs to incentivize whales):
| Pack ID | Stars (base + bonus) | Price USD |
|---|---|---|
| `stars_100` | 100 | $5 |
| `stars_550` | 500 + 50 (10%) | $25 |
| `stars_2400` | 2000 + 400 (20%) | $100 |
| `stars_13000` | 10000 + 3000 (30%) | $500 |

### New: `billing-webhook`
Публичный endpoint (secret verification). Принимает TG Stars payment confirmation → marks `purchases.status='completed'` → appends `stars_ledger` (+delta) → updates `profiles.stars_balance`. Идемпотентен по `provider_payment_id`.

### New: `gift-send`
POST auth. Body: `{ girl_id, gift_id }`. Transaction:
1. Validate `gift_catalog` active + price
2. Check `stars_balance >= price` else 402
3. Deduct balance + append ledger (`spend:gift:<id>`)
4. Insert `gifts_sent`
5. Insert `memories` с template из catalog (интерполировать `{gift_name}`, дата)
6. Update `girl_relationships.intimacy_level += gift.intimacy_delta` (clamp 0–10)
7. Если `is_trigger_event`: insert special memory + pending scene marker для `chat-ai`
8. Return `{ new_balance, memory_id, intimacy_level }`

### New: `messages-buy-pack`
POST auth. Body: `{ pack: 'msg_100' }`. Deducts 100⭐, increments `messages_bought_today += 100`.

### Modify: `chat-ai`
- В начале: проверить лимит `messages_used_today < 100 + messages_bought_today`. Если нет — вернуть 429 с payload `{ error: 'daily_limit', in_character_message: '...' }` для клиента.
- Инкрементить `messages_used_today` атомарно при отправке юзера.
- Читать `intimacy_level` и инъектить в system prompt: `[INTIMACY LEVEL: 7.2 — можешь быть игривее и флиртовать, намёки допустимы]`.
- Читать последние 5 `memories` where `gift_ref IS NOT NULL ORDER BY intimacy_weight DESC` и инъектить как `[SHE REMEMBERS GIFTS: роза (3 дня назад), кольцо (вчера)...]` — она будет ссылаться органически.
- Читать `pending_scene_marker` из триггер-события → инъектить scene directive на 1 turn.

### Modify: `proactive-tick`
- Не трогать лимит сообщений (proactive-сообщения не счётаются в лимит юзера, это она пишет).
- Опционально: ссылаться на недавние подарки («всё ещё нюхаю парфюм который ты подарил»).

## Frontend Changes

### Delete/rewrite
- `src/pages/Premium.tsx` — **полный rewrite**. Убрать unlimited likes / see who liked / gold badge / rewind / priority / swipes целиком. Новый контент: «Stars Shop» + «Подарки» + «Свидания» + «Покупка Stars».
- `src/components/Paywall.tsx` — **rewrite**. Все типы (`memory`/`voice`/`nsfw`/`persona_edit`/`reroll`) удалить. Оставить только `type: 'daily_limit'` и `type: 'gift'` (недостаточно ⭐).
- `src/hooks/usePremium.ts` — **удалить**. Вся логика уходит в `useStars()` (новый хук с балансом и методами `buyPack`, `spend`, `refresh`).

### Cleanup tinder-legacy
- `src/pages/Feed.tsx`, `src/pages/Search.tsx`, `src/components/GirlProfile/GirlProfileDrawer.tsx` — убрать likes/swipes/compat-unlock/super-like/rewind.

### New components
- `src/components/Stars/StarsBalance.tsx` — маленькая плашка в шапке Chat с балансом ⭐ и кнопкой «+».
- `src/components/Stars/StarsShop.tsx` — модалка покупки пакетов ⭐.
- `src/components/Gifts/GiftPicker.tsx` — grid подарков с ценами, при клике отправляет через `gift-send`. Есть вкладки: Подарки / Свидания / Украшения / Путешествия.
- `src/components/Stars/DailyLimitModal.tsx` — когда 429 от chat-ai: показывает in-character message + кнопку «+100 сообщений за 100⭐».

### Chat.tsx changes
- Читать `intimacy_level` и `messages_used_today` из context.
- При 429 на sendMessage → открывать `DailyLimitModal`.
- Gift-кнопка открывает `GiftPicker` вместо текущих 8 бесплатных эмодзи.
- Gift-сообщения в чате: показывать с реальной ценой, анимация.

### Routing
- `/premium` → rename to `/shop` (Stars Shop как главная страница магазина).

## i18n

Полностью переписать блоки `premium.*` в `src/i18n/ru.ts` и `en.ts`:
- Удалить: `unlimitedLikes`, `seeWhoLiked`, `goldBadge`, `rewind`, `priority`, `subscribe`, `upgrade`, `freeTier`, `premiumTier`, `intimateTier`
- Добавить: `stars.*` (balance, shop, packs, buy), `gifts.*` (catalog names), `dailyLimit.*` (in-character messages), `date.*` (scenes), `intimacy.*` (UI feedback)

## Migration Path for Existing Users

- `lumina_premium` localStorage — игнорировать/удалить на первом логине.
- Всем существующим юзерам выдать **bonus 200⭐** на старте (goodwill за переход модели) через миграцию.
- Существующие gift-события в `messages.content` как `[GIFT:id]` — оставить как есть, новые писать через `gifts_sent` + memories.

## Out of Scope (Phase 2+)

- Голосовые/видео звонки (требуют realtime infra, спланировать отдельно)
- Stripe fallback для web (TG Stars достаточно для MVP)
- Annual packs со скидкой
- Referral bonuses («пригласи друга → 100⭐»)
- Seasonal sales

## Success Metrics

- **Whale rate** (юзеры которые хотя бы раз купили Stars pack / MAU) — цель ≥5% через 3 месяца
- **ARPPU** (revenue / paying users) — цель ≥$20
- **Retention D7 paying users** — цель ≥60%
- **Avg daily messages paying** — ожидаем >100 (т.е. активно докупают пакеты)
- **Grok cost coverage**: (free msg cost per user) / (ARPU across all) должно оставаться <30%

## Open Questions (decided)

- ✅ **Тиры**: нет, F2P only
- ✅ **Stars**: фаза 1, сразу
- ✅ **Trial**: нет, удаляется
- ✅ **Лимит сообщений**: 100/день + 100⭐ за +100 docupable
- ✅ **NSFW**: hybrid intimacy + trigger events
- ✅ **Re-roll**: нет, только `/leave` = полный reset аккаунта (метафорически разрыв)
- ✅ **Provider**: CryptoCloud (крипто-эквайринг, USD invoices). Telegram = только верификация аккаунта.

## Next Step

Переход в `writing-plans` — разбить на фазы (DB migration → edge functions → frontend shop → gift picker → chat integration → cleanup legacy → i18n → migration).
