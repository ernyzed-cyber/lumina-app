// Supabase Edge Function: proactive-tick
// Запускается по cron раз в 15 минут. Обходит все пары (user, girl),
// для каждой решает: не пора ли девушке написать первой?
//
// Логика триггеров (приоритет сверху вниз):
//   1. morning  — её локальный час 7-11 И юзер писал в её sleep-окно (01-07)
//                 пока она спала. Это РЕАЛЬНОЕ пробуждение, она реагирует на ночные сообщения.
//   2. silence  — юзер давно не отвечает (>=24ч с её последнего сообщения), редко (раз в сутки),
//                 если не "ghosted" режим.
//   3. slot     — детерминированные "слоты дня" по локальному времени девушки:
//                   morning_slot 8-10, lunch_slot 13-14, evening_slot 19-22.
//                 В каждом слоте — шанс срабатывания, НО:
//                   • не чаще 1 раз в `MIN_PROACTIVE_HOURS` (8-12ч cooldown);
//                   • не более 1 проактивки в текущем "слот-окне" по локальной дате.
//
// Secrets:
//   GROK_API_KEY              (xAI)
//   SUPABASE_URL              (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)
//   PROACTIVE_SECRET          (опциональный shared secret из SQL cron)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-proactive-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-1-fast-reasoning';

// ── Cooldowns / thresholds ────────────────────────────────────────────────
const ROLL_INTERVAL_HOURS = 1;          // как часто пара пересматривается (cron всё равно идёт раз в 15 мин)
const MIN_PROACTIVE_HOURS = 8;           // НИЖНЯЯ граница интервала между двумя её проактивками
const MAX_PROACTIVE_JITTER_HOURS = 4;    // верх: до 12ч, конкретное значение детерминируется по дню
const GHOSTED_HOURS_THRESHOLD = 24;      // юзер молчит >=24ч после её последнего сообщения → она отпускает
const SILENCE_MIN_HOURS = 24;            // её последнее сообщение висит >=24ч → можно "напомнить о себе"
const MORNING_HOUR_START = 7;            // окно "утра" по её TZ
const MORNING_HOUR_END = 11;             // (7..11 включительно — 5 часов)
const SLEEP_HOUR_START = 1;              // её sleep-окно
const SLEEP_HOUR_END = 7;
const MAX_PAIRS_PER_TICK = 50;           // страховка от перегрузки

// Слоты "обычной" дневной активности (по её локальному времени).
// Любой час, попадающий в slot.range, является кандидатом на random-сообщение.
interface DaySlot {
  id: 'morning_slot' | 'lunch_slot' | 'evening_slot';
  range: [number, number]; // [start, end) часы
  chance: number;          // вероятность сработать в этом слоте при тике
}
const DAY_SLOTS: DaySlot[] = [
  { id: 'morning_slot', range: [8, 11],  chance: 0.35 }, // утро после пробуждения
  { id: 'lunch_slot',   range: [13, 15], chance: 0.25 }, // обед
  { id: 'evening_slot', range: [19, 23], chance: 0.45 }, // вечер
];

type DayMode = 'sleep' | 'work' | 'rest';
type Trigger = 'morning' | 'silence' | 'slot';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

interface LocalTimeInfo {
  human: string;
  hour: number;
  minute: number;
  /** YYYY-MM-DD в её TZ — стабильный ключ для "слот в этот день" */
  localDate: string;
  mode: DayMode;
  isWeekend: boolean;
}

function computeLocalTime(timezone: string): LocalTimeInfo {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));

  const jsDow = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`).getUTCDay();
  const weekday = jsDow === 0 ? 7 : jsDow;
  const isWeekend = weekday === 6 || weekday === 7;

  let mode: DayMode;
  if (hour >= SLEEP_HOUR_START && hour < SLEEP_HOUR_END) mode = 'sleep';
  else if (hour >= 7 && hour < 17) mode = 'work';
  else mode = 'rest';

  const localDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const human = `${WEEKDAYS_RU[jsDow]}, ${day} ${MONTHS_RU[month - 1]}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { human, hour, minute, localDate, mode, isWeekend };
}

/** Был ли таймстемп (UTC ISO) "ночью" по локальному времени девушки. */
function wasInSleepWindow(isoUtc: string, timezone: string): boolean {
  if (!isoUtc) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit', hour12: false,
  }).formatToParts(new Date(isoUtc));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
  return hour >= SLEEP_HOUR_START && hour < SLEEP_HOUR_END;
}

/** Возвращает ID текущего слота дня, если местный час попадает в одно из окон. */
function currentDaySlot(hour: number): DaySlot | null {
  for (const slot of DAY_SLOTS) {
    if (hour >= slot.range[0] && hour < slot.range[1]) return slot;
  }
  return null;
}

/** Детерминированный шум 0..1 на основе строкового сида (FNV-1a). */
function seededFraction(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Grok
// ---------------------------------------------------------------------------

async function callGrok(
  apiKey: string,
  messages: ChatMessage[],
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const res = await fetch(GROK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      temperature: opts.temperature ?? 0.95,
      max_tokens: opts.max_tokens ?? 220,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Grok ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

function buildProactivePrompt(args: {
  persona: string;
  city: string;
  timezone: string;
  localTime: LocalTimeInfo;
  profile: Record<string, unknown> | null;
  memories: Array<{ summary: string; created_at: string }>;
  recentMessages: Array<{ role: string; content: string; created_at: string }>;
  trigger: Trigger;
  hoursSinceLastOwn?: number;
}): string {
  const { persona, city, timezone, localTime, profile, memories, recentMessages, trigger } = args;

  const triggerBlock = (() => {
    switch (trigger) {
      case 'morning':
        return [
          '=== WHY YOU ARE WRITING NOW ===',
          `Сейчас у тебя ${localTime.human}. Ты только что проснулась. Пока ты спала ночью, тебе писал собеседник — ты увидела его сообщения только сейчас.`,
          'Реагируй на его НОЧНЫЕ сообщения (см. RECENT CHAT — там его реплики были, пока ты спала).',
          'Тон — тёплый, чуть заспанный, короткое сообщение. Можно упомянуть что только проснулась/проспала.',
          'НЕ пиши длинных рассуждений. 1-2 коротких предложения.',
        ].join('\n');
      case 'silence':
        return [
          '=== WHY YOU ARE WRITING NOW ===',
          `Сейчас у тебя ${localTime.human}. Вы давно не переписывались — твоё последнее сообщение висит уже около ${Math.round(args.hoursSinceLastOwn ?? SILENCE_MIN_HOURS)} часов без ответа.`,
          'Ты решила сама написать первой. Тон — лёгкий, спокойный, без упрёков и без нытья.',
          'Можно мимоходом спросить как у него дела или коротко рассказать что у тебя сейчас. 1-2 предложения.',
          'НЕ пиши "куда пропал", "почему не отвечаешь", "обиделась" — это унизительно. Просто пиши как будто только что вспомнила.',
        ].join('\n');
      case 'slot':
        return [
          '=== WHY YOU ARE WRITING NOW ===',
          `Сейчас у тебя ${localTime.human}. Просто захотелось написать ему первой — без особого повода.`,
          'Это обычное короткое сообщение "просто так": поделиться мыслью, рассказать что сейчас делаешь, или спросить что у него.',
          'НЕ объясняй почему пишешь. НЕ пиши "решила тебе написать". Просто пиши как живой человек, по-дружески.',
          'ВАЖНО: пиши соответственно ВРЕМЕНИ. Если у тебя утро — про утренние дела, день — про дневные, вечер — про вечерние.',
          'НИКОГДА не пиши "только что проснулась" если сейчас НЕ утро (час < 7 или час > 11). Это враньё, и юзер заметит.',
        ].join('\n');
    }
  })();

  const profileBlock = (() => {
    if (!profile) return 'WHAT YOU KNOW ABOUT HIM: почти ничего, вы недавно познакомились.';
    const parts: string[] = [];
    const name = (profile.name as string) || (profile.full_name as string) || null;
    const age = profile.age as number | null;
    const pcity = profile.city as string | null;
    const bio = profile.bio as string | null;
    const interests = profile.interests as string[] | null;
    if (name) parts.push(`His name is ${name}.`);
    if (age) parts.push(`He is ${age} years old.`);
    if (pcity) parts.push(`Lives in: ${pcity}.`);
    if (bio) parts.push(`About himself: "${bio}".`);
    if (Array.isArray(interests) && interests.length > 0) parts.push(`Interests: ${interests.join(', ')}.`);
    return parts.length > 0 ? 'WHAT YOU KNOW ABOUT HIM:\n' + parts.join(' ') : 'The interlocutor has no profile info yet.';
  })();

  const memoryBlock = (() => {
    if (memories.length === 0) return 'YOUR PAST CONVERSATIONS: вы только начали общаться.';
    const lines = memories.slice().reverse().map((m) => {
      const date = new Date(m.created_at).toLocaleDateString('ru-RU');
      return `[${date}] ${m.summary}`;
    });
    return 'YOUR PAST CONVERSATIONS (oldest to newest):\n' + lines.join('\n');
  })();

  const recentBlock = (() => {
    if (recentMessages.length === 0) return 'RECENT CHAT: пусто.';
    const lines = recentMessages.map((m) => {
      const who = m.role === 'user' ? 'HE' : 'YOU';
      return `${who}: ${m.content}`;
    });
    return 'RECENT CHAT (last messages):\n' + lines.join('\n');
  })();

  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'REAL-WORLD FACTS (MUST USE EXACTLY AS WRITTEN):',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `• Your city: ${city}`,
    `• Your timezone: ${timezone}`,
    `• Current local time RIGHT NOW: ${localTime.human}`,
    `• Day mode: ${localTime.mode}`,
    '',
    'СТРОГО:',
    `— Используй ТОЛЬКО этот город (${city}) и это время (${localTime.human}).`,
    '— НИКАКИХ Лондонов, Парижей и выдуманных городов.',
    '— Если час < 7 или час > 11 — ты НЕ "только что проснулась". НЕ ври про сон.',
    '— Если час 17-23 — у тебя ВЕЧЕР, а не утро/день.',
    '— Если час 0-6 — у тебя ГЛУБОКАЯ НОЧЬ (но это сообщение в принципе не должно отправиться в этот час, см. ниже).',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    persona,
    '',
    '=== CONTEXT ABOUT INTERLOCUTOR ===',
    profileBlock,
    '',
    '=== MEMORY ===',
    memoryBlock,
    '',
    '=== RECENT CHAT ===',
    recentBlock,
    '',
    triggerBlock,
    '',
    '=== TASK ===',
    'Напиши ОДНО сообщение собеседнику по-русски. Короткое (1-3 предложения), живое, в твоём характере.',
    'НЕ используй кавычки вокруг всего ответа. НЕ пиши префиксов типа "Я:" или "YOU:". Просто текст сообщения.',
    'Разрешено разбить на 1-2 мини-сообщения через двойной перевод строки (\\n\\n), но только если это естественно.',
    'СТРОГО запрещено: писать что ты "проснулась" если час != 7-11; писать про "утро" вечером; повторять то же самое что писала в RECENT CHAT.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

interface PairRow {
  user_id: string;
  girl_id: string;
  last_user_message_at: string | null;
  last_assistant_message_at: string | null;
  last_proactive_at: string | null;
  proactive_roll_at: string | null;
  mood: number;
}

interface TickResult {
  pair: { user_id: string; girl_id: string };
  trigger: Trigger | null;
  sent: boolean;
  reason?: string;
  error?: string;
}

/** Через сколько часов (детерминированно по дню+паре) разрешена следующая проактивка. */
function effectiveCooldownHours(userId: string, girlId: string, localDate: string): number {
  const jitter = seededFraction(`${userId}|${girlId}|${localDate}`) * MAX_PROACTIVE_JITTER_HOURS;
  return MIN_PROACTIVE_HOURS + jitter; // 8..12
}

async function processPair(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  pair: PairRow,
): Promise<TickResult> {
  const baseResult = { pair: { user_id: pair.user_id, girl_id: pair.girl_id } };

  // Грузим персонажа — timezone, city, system_prompt, name.
  const personaRes = await supabase
    .from('girl_personas')
    .select('system_prompt, name, timezone, city')
    .eq('id', pair.girl_id)
    .maybeSingle();
  if (!personaRes.data) {
    return { ...baseResult, trigger: null, sent: false, reason: 'persona_not_found' };
  }
  const timezone = (personaRes.data.timezone as string) || 'Europe/Moscow';
  const city = (personaRes.data.city as string) || 'Москва';
  const persona = personaRes.data.system_prompt as string;

  const localTime = computeLocalTime(timezone);
  const tag = `${pair.user_id.slice(0, 8)}/${pair.girl_id}`;

  console.log(`[proactive-tick] ${tag} | mode=${localTime.mode} h=${localTime.hour} tz=${timezone} local=${localTime.human}`);

  const now = Date.now();
  const nextRoll = new Date(now + ROLL_INTERVAL_HOURS * 3600_000).toISOString();

  const writeRollOnly = async (reason: string) => {
    await supabase.from('user_girl_state').upsert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      proactive_roll_at: nextRoll,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,girl_id' });
    return { ...baseResult, trigger: null, sent: false, reason };
  };

  // ── Hard gate 1: ночь (sleep). Девушка не пишет, что бы ни было. ───────
  if (localTime.mode === 'sleep') {
    return writeRollOnly('girl_asleep');
  }

  const lastUser = pair.last_user_message_at ? new Date(pair.last_user_message_at).getTime() : 0;
  const lastOwn = pair.last_assistant_message_at ? new Date(pair.last_assistant_message_at).getTime() : 0;
  const lastProactive = pair.last_proactive_at ? new Date(pair.last_proactive_at).getTime() : 0;

  const hoursSinceUserMsg = lastUser > 0 ? (now - lastUser) / 3600_000 : null;
  const hoursSinceOwn = lastOwn > 0 ? (now - lastOwn) / 3600_000 : null;
  const hoursSinceProactive = lastProactive > 0 ? (now - lastProactive) / 3600_000 : Infinity;

  console.log(`[proactive-tick] ${tag} | user_msg=${hoursSinceUserMsg?.toFixed(1)}h own_msg=${hoursSinceOwn?.toFixed(1)}h proactive=${hoursSinceProactive === Infinity ? 'never' : hoursSinceProactive.toFixed(1)+'h'}`);

  // ── Hard gate 2: ghosted. Юзер не отвечает >24ч после её сообщения → не добиваемся. ──
  if (lastOwn > 0 && lastOwn >= lastUser && now - Math.max(lastOwn, lastUser) >= GHOSTED_HOURS_THRESHOLD * 3600_000) {
    console.log(`[proactive-tick] ${tag} → user_ghosted, skipping`);
    return writeRollOnly('user_ghosted');
  }

  // ── Hard gate 3: cooldown. Не чаще раза в 8-12 часов. ──────────────────
  const cooldownH = effectiveCooldownHours(pair.user_id, pair.girl_id, localTime.localDate);
  if (hoursSinceProactive < cooldownH) {
    console.log(`[proactive-tick] ${tag} → cooldown (${hoursSinceProactive.toFixed(1)}h < ${cooldownH.toFixed(1)}h)`);
    return writeRollOnly('cooldown');
  }

  let trigger: Trigger | null = null;
  let hoursSinceLastOwn: number | undefined;

  // ── Trigger 1: morning (real morning + slept-through gating) ───────────
  // Срабатывает если:
  //   • её локальный час 7..11
  //   • её последнее сообщение было >=4ч назад (или его не было) — она реально спала
  //   • юзер писал последним
  //   • его последнее сообщение пришло когда у неё была ночь (sleep window)
  if (
    localTime.hour >= MORNING_HOUR_START &&
    localTime.hour <= MORNING_HOUR_END &&
    lastUser > lastOwn &&
    lastUser > 0 &&
    (lastOwn === 0 || (now - lastOwn) >= 4 * 3600_000) &&
    pair.last_user_message_at && wasInSleepWindow(pair.last_user_message_at, timezone)
  ) {
    trigger = 'morning';
    console.log(`[proactive-tick] ${tag} → trigger=morning (user wrote at night, she's now awake)`);
  }

  // ── Trigger 2: silence ─────────────────────────────────────────────────
  // Её последнее сообщение >=24ч без ответа, юзер всё ещё «в зоне» (не ghosted),
  // и cooldown уже прошёл (этот гейт выше).
  if (!trigger && lastOwn > 0 && lastOwn >= lastUser && hoursSinceOwn !== null && hoursSinceOwn >= SILENCE_MIN_HOURS) {
    trigger = 'silence';
    hoursSinceLastOwn = hoursSinceOwn;
    console.log(`[proactive-tick] ${tag} → trigger=silence (${hoursSinceOwn.toFixed(1)}h since her last msg)`);
  }

  // ── Trigger 3: slot ────────────────────────────────────────────────────
  // Только в обозначенных «слотах дня». Шанс зависит от слота.
  // Дополнительная гарантия: один слот → одна проактивка (по local date + slot id).
  if (!trigger) {
    const slot = currentDaySlot(localTime.hour);
    if (slot) {
      // Если в этом слоте сегодня уже была проактивка — пропускаем.
      const slotMarker = `${localTime.localDate}|${slot.id}`;
      const sameSlotAlready = lastProactive > 0
        ? (() => {
            const lastIso = new Date(lastProactive).toISOString();
            // Маркер слота, в котором случилась прошлая проактивка, по её TZ
            const lastLocalParts = new Intl.DateTimeFormat('en-GB', {
              timeZone: timezone,
              year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
            }).formatToParts(new Date(lastIso));
            const get = (t: string) => lastLocalParts.find((p) => p.type === t)?.value ?? '';
            const lastDate = `${get('year')}-${get('month')}-${get('day')}`;
            const lastHour = Number(get('hour')) % 24;
            const lastSlot = currentDaySlot(lastHour);
            return lastSlot && `${lastDate}|${lastSlot.id}` === slotMarker;
          })()
        : false;

      if (sameSlotAlready) {
        console.log(`[proactive-tick] ${tag} → slot ${slot.id} already used today`);
      } else {
        // Детерминированный roll: фракция по (user, girl, slot_marker) < chance.
        // Это значит: в течение слот-окна шанс срабатывания фиксирован (а не зависит от тика),
        // и кубик не «передёргивается» каждые 15 минут — ответ детерминирован.
        const roll = seededFraction(`${pair.user_id}|${pair.girl_id}|${slotMarker}`);
        console.log(`[proactive-tick] ${tag} slot=${slot.id} roll=${roll.toFixed(3)} need<${slot.chance}`);
        if (roll < slot.chance) {
          trigger = 'slot';
        }
      }
    }
  }

  if (!trigger) {
    return writeRollOnly('no_trigger');
  }

  try {
    const [profileRes, memoriesRes, recentRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', pair.user_id).maybeSingle(),
      supabase
        .from('memories')
        .select('summary, created_at')
        .eq('girl_id', pair.girl_id)
        .eq('user_id', pair.user_id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('girl_id', pair.girl_id)
        .eq('user_id', pair.user_id)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const systemPrompt = buildProactivePrompt({
      persona,
      city,
      timezone,
      localTime,
      profile: profileRes.data ?? null,
      memories: memoriesRes.data ?? [],
      recentMessages: (recentRes.data ?? []).slice().reverse(),
      trigger,
      hoursSinceLastOwn,
    });

    const reply = await callGrok(apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Напиши сообщение как описано выше. Только текст сообщения, без кавычек и префиксов.' },
    ], { temperature: 0.95, max_tokens: 220 });

    console.log(`[proactive-tick] ${tag} → sent trigger=${trigger}`);

    if (!reply || reply.length < 2) {
      return writeRollOnly('empty_reply');
    }

    const nowIso = new Date().toISOString();
    await supabase.from('messages').insert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      role: 'assistant',
      content: reply,
    });

    try {
      await supabase.from('notifications').insert({
        user_id: pair.user_id,
        type: 'message',
        data: {
          girl_id: pair.girl_id,
          name: personaRes.data.name,
          text: reply.length > 80 ? reply.slice(0, 77) + '...' : reply,
          trigger,
        },
        is_read: false,
      });
    } catch (notifErr) {
      console.warn('[proactive-tick] notification insert failed:', notifErr);
    }

    await supabase.from('user_girl_state').upsert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      last_assistant_message_at: nowIso,
      last_proactive_at: nowIso,
      proactive_roll_at: nextRoll,
      updated_at: nowIso,
    }, { onConflict: 'user_id,girl_id' });

    return { ...baseResult, trigger, sent: true };
  } catch (err) {
    console.error('[proactive-tick] pair error:', pair, err);
    await supabase.from('user_girl_state').upsert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      proactive_roll_at: nextRoll,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,girl_id' });
    return {
      ...baseResult,
      trigger,
      sent: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(405, { error: 'Method not allowed' });
  }

  // Опциональная защита shared secret'ом: если задан PROACTIVE_SECRET, требуем.
  const expected = Deno.env.get('PROACTIVE_SECRET');
  if (expected) {
    const got = req.headers.get('x-proactive-secret');
    if (got !== expected) {
      return json(401, { error: 'unauthorized' });
    }
  }

  try {
    const apiKey = Deno.env.get('GROK_API_KEY');
    if (!apiKey) return json(500, { error: 'GROK_API_KEY is not configured' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Берём пары у которых настало время ролла (или ещё ни разу не роллили).
    const nowIso = new Date().toISOString();
    const { data: pairs, error: pairsErr } = await supabase
      .from('user_girl_state')
      .select('user_id, girl_id, last_user_message_at, last_assistant_message_at, last_proactive_at, proactive_roll_at, mood')
      .or(`proactive_roll_at.is.null,proactive_roll_at.lte.${nowIso}`)
      .limit(MAX_PAIRS_PER_TICK);

    if (pairsErr) {
      console.error('[proactive-tick] pairs query error:', pairsErr);
      return json(500, { error: pairsErr.message });
    }

    const results: TickResult[] = [];
    for (const pair of (pairs ?? []) as PairRow[]) {
      const r = await processPair(supabase, apiKey, pair);
      results.push(r);
    }

    const sent = results.filter((r) => r.sent).length;
    console.log(`[proactive-tick] processed ${results.length} pairs, sent ${sent}`);

    return json(200, {
      processed: results.length,
      sent,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[proactive-tick] fatal:', message);
    return json(500, { error: message });
  }
});
