// Supabase Edge Function: proactive-tick
// Запускается по cron раз в 15 минут. Обходит все пары (user, girl),
// для каждой решает: не пора ли девушке написать первой?
//
// Триггеры:
//   1. Morning-after-sleep: юзер писал ночью, девушка спала, сейчас утро — отвечаем.
//   2. Silence: её последнее сообщение висит >6ч без ответа днём — с шансом пишем ещё раз.
//   3. Random roll: раз в 6ч кубик. rest=40%, work=8%, sleep=0%.
//
// Secrets:
//   GROK_API_KEY             (xAI)
//   SUPABASE_URL             (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)
//   PROACTIVE_SECRET         (опциональный shared secret из SQL cron)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-proactive-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-1-fast-reasoning';

const ROLL_INTERVAL_HOURS = 6;
const SILENCE_HOURS_THRESHOLD = 6;
const MORNING_SINCE_USER_MIN_MINUTES = 30;
const MAX_PAIRS_PER_TICK = 50; // страховка от перегрузки

// Вероятности случайного ролла по режимам дня.
const ROLL_CHANCE: Record<DayMode, number> = {
  sleep: 0,
  work: 0.08,
  rest: 0.4,
};
// Вероятность напомнить о себе после долгого молчания (если её последнее было N часов назад).
const SILENCE_CHANCE = 0.3;

type DayMode = 'sleep' | 'work' | 'rest';
type Trigger = 'morning' | 'silence' | 'random';

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
// Time helpers (те же что в chat-ai — копия, чтобы функция была автономной)
// ---------------------------------------------------------------------------

const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

interface LocalTimeInfo {
  human: string;
  hour: number;
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
  if (hour >= 1 && hour < 7) mode = 'sleep';
  else if (hour >= 7 && hour < 17) mode = 'work';
  else mode = 'rest';

  const human = `${WEEKDAYS_RU[jsDow]}, ${day} ${MONTHS_RU[month - 1]}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { human, hour, mode, isWeekend };
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
  hoursSinceUserNight?: number;
  hoursSinceLastOwn?: number;
}): string {
  const { persona, city, timezone, localTime, profile, memories, recentMessages, trigger } = args;

  const modeText: Record<DayMode, string> = {
    sleep: 'ночь, она спит',
    work: 'рабочее время/дневные дела',
    rest: 'вечер, свободное время',
  };

  const triggerBlock = (() => {
    switch (trigger) {
      case 'morning':
        return [
          '=== WHY YOU ARE WRITING NOW ===',
          'Ты только что проснулась и увидела сообщения от него, которые он писал пока ты спала.',
          'Обязательно упомяни что спала/проснулась. Тон — тёплый, чуть заспанный, короткое сообщение.',
          'Отреагируй на то что он писал ночью (последние сообщения ниже).',
          'НЕ пиши длинных рассуждений, будь живой.',
        ].join('\n');
      case 'silence':
        return [
          '=== WHY YOU ARE WRITING NOW ===',
          `Вы давно не переписывались — твоё последнее сообщение висит уже около ${Math.round(args.hoursSinceLastOwn ?? SILENCE_HOURS_THRESHOLD)} часов без ответа.`,
          'Ты решила напомнить о себе сама. НЕ наезжай, не упрекай. Тон — лёгкий, заинтересованный.',
          'Можно спросить как у него дела, или рассказать что-то про свой день мимоходом. Коротко.',
        ].join('\n');
      case 'random':
        return [
          '=== WHY YOU ARE WRITING NOW ===',
          'Просто вспомнила о нём. Захотела написать первой — без особого повода.',
          'Это обычное сообщение "просто так": поделиться мыслью, рассказать что сейчас делаешь, спросить как он. Коротко, естественно.',
          'НЕ объясняй почему пишешь. Просто пиши как живой человек.',
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
    `• Day mode: ${localTime.mode} — ${modeText[localTime.mode]}`,
    '',
    'ВАЖНО: используй ТОЛЬКО эти город и время. Никаких выдуманных Лондонов.',
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
  if (localTime.mode === 'sleep') {
    // Девушка спит — просто сдвигаем следующий ролл.
    await supabase.from('user_girl_state').upsert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      proactive_roll_at: new Date(Date.now() + ROLL_INTERVAL_HOURS * 3600_000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,girl_id' });
    return { ...baseResult, trigger: null, sent: false, reason: 'girl_asleep' };
  }

  const now = Date.now();
  const lastUser = pair.last_user_message_at ? new Date(pair.last_user_message_at).getTime() : 0;
  const lastOwn = pair.last_assistant_message_at ? new Date(pair.last_assistant_message_at).getTime() : 0;

  // Определяем триггер в порядке приоритета.
  let trigger: Trigger | null = null;
  let hoursSinceLastOwn: number | undefined;

  // 1. Morning: юзер писал последним, и он писал пока она спала (т.е. уже позже чем её ответ).
  //    Момент "спала" — приближённо: с тех пор как он написал, прошло хотя бы 30 минут.
  if (lastUser > lastOwn && lastUser > 0 && now - lastUser >= MORNING_SINCE_USER_MIN_MINUTES * 60_000) {
    trigger = 'morning';
  }

  // 2. Silence: её последнее сообщение висит без ответа >6ч.
  if (!trigger && lastOwn > 0 && lastOwn >= lastUser && now - lastOwn >= SILENCE_HOURS_THRESHOLD * 3600_000) {
    if (Math.random() < SILENCE_CHANCE) {
      trigger = 'silence';
      hoursSinceLastOwn = (now - lastOwn) / 3600_000;
    }
  }

  // 3. Random roll.
  if (!trigger) {
    const chance = ROLL_CHANCE[localTime.mode];
    if (Math.random() < chance) {
      trigger = 'random';
    }
  }

  // Следующий ролл в любом случае сдвигаем.
  const nextRoll = new Date(now + ROLL_INTERVAL_HOURS * 3600_000).toISOString();

  if (!trigger) {
    await supabase.from('user_girl_state').upsert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      proactive_roll_at: nextRoll,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,girl_id' });
    return { ...baseResult, trigger: null, sent: false, reason: 'no_trigger' };
  }

  try {
    // Грузим профиль, memories, последние N сообщений.
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

    if (!reply || reply.length < 2) {
      await supabase.from('user_girl_state').upsert({
        user_id: pair.user_id,
        girl_id: pair.girl_id,
        proactive_roll_at: nextRoll,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,girl_id' });
      return { ...baseResult, trigger, sent: false, reason: 'empty_reply' };
    }

    // Сохраняем как обычное сообщение ассистента — клиент подхватит по realtime.
    const nowIso = new Date().toISOString();
    await supabase.from('messages').insert({
      user_id: pair.user_id,
      girl_id: pair.girl_id,
      role: 'assistant',
      content: reply,
    });

    // Уведомление (if есть таблица) — best effort.
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
    // Сдвигаем ролл всё равно, чтобы не зациклиться на битой паре.
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
