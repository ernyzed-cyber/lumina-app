// Supabase Edge Function: chat-ai
// Grok API (xAI) — OpenAI-compatible format.
// Грузит персонажа из girl_personas, профиль из profiles, воспоминания из memories.
// Асинхронно сохраняет резюме диалога в memories каждые SUMMARY_TRIGGER сообщений.
//
// Secrets:
//   GROK_API_KEY           -- ключ xAI (xai-...)
//   SUPABASE_URL           -- автоматически
//   SUPABASE_SERVICE_ROLE_KEY -- автоматически

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestPayload {
  messages: ChatMessage[];
  girlId?: string;
  userId?: string;
  system_prompt?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-1-fast-reasoning';

const MEMORY_LIMIT = 3;
const SUMMARY_TRIGGER = 6;

// ---------------------------------------------------------------------------
// Response timing (имитация живого человека)
// ignore  — она "не видит" сообщение (offline/была недавно)
// online  — она увидела чат, формулирует ответ (в сети)
// typing  — набирает (печатает...)
// Финальный ответ приходит по сумме этих трёх.
// ---------------------------------------------------------------------------

interface ReplySchedule {
  ignoreMs: number;
  onlineMs: number;
  typingMs: number;
  totalMs: number;
}

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

function isInterestingTopic(text: string): boolean {
  if (!text) return false;
  if (text.length > 80) return true;
  if (/[?？]/.test(text)) return true;
  // эмоциональные/личные маркеры
  if (/(люблю|скучаю|грустно|обидно|круто|классно|офигенно|бесит|ненавижу|спасибо|прости|целую|обнимаю|важно|серьёзно|страшно|рад|рада)/i.test(text)) return true;
  return false;
}

function computeSchedule(mode: DayMode, lastUserText: string, replyText: string): ReplySchedule {
  const interesting = isInterestingTopic(lastUserText);

  // Базовые диапазоны задержки "игнора" перед тем как она "заметила".
  // В мс.
  let ignoreRange: [number, number];
  if (mode === 'work') {
    ignoreRange = interesting ? [45_000, 2 * 60_000] : [3 * 60_000, 8 * 60_000];
  } else {
    // rest
    ignoreRange = interesting ? [15_000, 45_000] : [40_000, 2 * 60_000];
  }

  // "В сети" — обдумывает ответ. Короткое окно перед началом печати.
  const onlineRange: [number, number] = mode === 'work'
    ? [20_000, 55_000]
    : [8_000, 25_000];

  // "Печатает" — пропорционально длине ответа, но с нижней/верхней границей.
  const charsPerSec = 12; // довольно бодрый набор на телефоне
  const typingEstimate = Math.round((replyText.length / charsPerSec) * 1000);
  const typingMs = Math.min(Math.max(typingEstimate, 6_000), 35_000);

  const ignoreMs = rand(ignoreRange[0], ignoreRange[1]);
  const onlineMs = rand(onlineRange[0], onlineRange[1]);

  return {
    ignoreMs,
    onlineMs,
    typingMs,
    totalMs: ignoreMs + onlineMs + typingMs,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

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
      temperature: opts.temperature ?? 0.9,
      max_tokens: opts.max_tokens ?? 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Grok ${res.status}: ${text}`);
  }

  const data = await res.json();
  const reply = (data?.choices?.[0]?.message?.content ?? '').trim();

  if (!reply) {
    const reason = data?.choices?.[0]?.finish_reason ?? 'unknown';
    throw new Error(`Grok empty reply, finish_reason: ${reason}`);
  }

  return reply;
}

/**
 * Режим дня девушки. Используется и для промпта, и для логики проактивности.
 *   sleep: 01:00–07:00  — не должна отвечать бодро, минимум инициативы
 *   work:  07:00–17:00  — занята, отвечает с задержкой, редко пишет первой
 *   rest:  17:00–01:00  — свободна, живее отвечает, охотнее инициирует
 */
type DayMode = 'sleep' | 'work' | 'rest';

interface LocalTimeInfo {
  iso: string;       // 2026-04-21T14:37:00+03:00
  human: string;     // вторник, 21 апреля, 14:37
  hour: number;      // 0..23 локальный час
  weekday: number;   // 1..7 (пн=1)
  mode: DayMode;
  isWeekend: boolean;
}

const WEEKDAYS_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function computeLocalTime(timezone: string): LocalTimeInfo {
  const now = new Date();
  // Через Intl достаём компоненты в нужной TZ.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short',
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));

  // JS-день недели из даты в TZ. Берём dateString и парсим без времени, чтобы не поплыло.
  const jsDow = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`).getUTCDay();
  const weekday = jsDow === 0 ? 7 : jsDow; // 1..7
  const isWeekend = weekday === 6 || weekday === 7;

  let mode: DayMode;
  if (hour >= 1 && hour < 7) mode = 'sleep';
  else if (hour >= 7 && hour < 17) mode = 'work';
  else mode = 'rest';

  const human = `${WEEKDAYS_RU[jsDow]}, ${day} ${MONTHS_RU[month - 1]}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  return { iso, human, hour, weekday, mode, isWeekend };
}

function buildTimeBlock(city: string, timezone: string, t: LocalTimeInfo): string {
  const modeText: Record<DayMode, string> = {
    sleep: 'Сейчас ночь по её местному времени — обычно она в это время спит. Если вдруг отвечает — сонная, короткая, немного раздражённая или наоборот тёплая если соскучилась.',
    work: 'Сейчас её рабочее время (будни) / дневные дела (выходные). Она занята, может ответить не сразу, ответы короткие и по делу. Если тема её цепляет — оживляется.',
    rest: 'Сейчас вечер — её свободное время. Она расслаблена, охотнее общается, может сама рассказать что-то про день.',
  };
  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'REAL-WORLD FACTS (MUST USE EXACTLY AS WRITTEN):',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `• Your city: ${city}`,
    `• Your timezone: ${timezone}`,
    `• Current local time RIGHT NOW: ${t.human}`,
    `• Day mode: ${t.mode} (sleep=01-07, work=07-17, rest=17-01)`,
    `• Weekend: ${t.isWeekend ? 'yes' : 'no'}`,
    '',
    'ВАЖНО (RU):',
    `— Ты живёшь в городе «${city}». НЕ придумывай другой город. Никаких Лондонов, Парижей и т.п.`,
    `— Сейчас у тебя РОВНО: ${t.human}. Если спросят который час — называй ЭТО время, не выдумывай. Можно округлять до пяти минут ("около восьми вечера", "пол восьмого"), но час брать ТОЛЬКО отсюда.`,
    `— Сегодняшняя дата — из строки выше. НЕ говори о прошедших праздниках как о будущих и наоборот.`,
    `— Режим дня: ${t.mode} — ${modeText[t.mode]}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
  ].join('\n');
}

function buildUserContextBlock(profile: Record<string, unknown> | null): string {
  if (!profile) {
    return 'You are talking to a new person, you know nothing about him yet. Get to know him naturally.';
  }
  const parts: string[] = [];
  const name = (profile.name as string) || (profile.full_name as string) || null;
  const age = profile.age as number | null;
  const city = profile.city as string | null;
  const bio = profile.bio as string | null;
  const interests = profile.interests as string[] | null;

  if (name) parts.push(`His name is ${name}.`);
  if (age) parts.push(`He is ${age} years old.`);
  if (city) parts.push(`Lives in: ${city}.`);
  if (bio) parts.push(`About himself: "${bio}".`);
  if (Array.isArray(interests) && interests.length > 0) {
    parts.push(`Interests: ${interests.join(', ')}.`);
  }
  if (parts.length === 0) return 'The interlocutor has no profile info yet.';
  return 'WHAT YOU KNOW ABOUT HIM:\n' + parts.join(' ');
}

function buildMemoryBlock(
  memories: Array<{ summary: string; created_at: string }>,
): string {
  if (!memories || memories.length === 0) {
    return 'YOUR PAST CONVERSATIONS: this is your first conversation.';
  }
  const lines = memories
    .slice()
    .reverse()
    .map((m) => {
      const date = new Date(m.created_at).toLocaleDateString('ru-RU');
      return `[${date}] ${m.summary}`;
    });
  return (
    'YOUR PAST CONVERSATIONS (oldest to newest, use naturally):\n' +
    lines.join('\n')
  );
}

async function saveMemoryAsync(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  girlId: string,
  userId: string,
  dialog: ChatMessage[],
): Promise<void> {
  try {
    if (dialog.length < SUMMARY_TRIGGER) return;
    const transcript = dialog
      .map((m) => `${m.role === 'user' ? 'HE' : 'I'}: ${m.content}`)
      .join('\n');
    const summaryMessages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You read a chat transcript and write a brief diary entry in Russian (2-3 sentences, first person, like "говорили о..."). Capture only important facts about the interlocutor and emotional tone. No fluff. No emoji.',
      },
      {
        role: 'user',
        content: `Transcript:\n${transcript}\n\nWrite a 2-3 sentence diary entry in Russian.`,
      },
    ];
    const summary = await callGrok(apiKey, summaryMessages, {
      temperature: 0.4,
      max_tokens: 150,
    });
    if (!summary) return;
    await supabase.from('memories').insert({
      girl_id: girlId,
      user_id: userId,
      summary,
      key_facts: {},
    });
  } catch (err) {
    console.error('[chat-ai] saveMemoryAsync failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const apiKey = Deno.env.get('GROK_API_KEY');
    if (!apiKey) {
      return json(500, { error: 'GROK_API_KEY is not configured' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as RequestPayload;
    const { messages = [], girlId, userId, system_prompt: legacyPrompt } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return json(400, { error: 'messages array is required' });
    }

    let systemPrompt = '';
    let dayMode: DayMode = 'rest';

    if (girlId && userId) {
      const [personaRes, profileRes, memoriesRes] = await Promise.all([
        supabase
          .from('girl_personas')
          .select('system_prompt, name, timezone, city')
          .eq('id', girlId)
          .maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase
          .from('memories')
          .select('summary, created_at')
          .eq('girl_id', girlId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(MEMORY_LIMIT),
      ]);

      const personaPrompt = personaRes.data?.system_prompt;
      const timezone = (personaRes.data?.timezone as string) || 'Europe/Moscow';
      const city = (personaRes.data?.city as string) || 'Москва';
      const profile = profileRes.data ?? null;
      const memories = memoriesRes.data ?? [];

      const localTime = computeLocalTime(timezone);
      dayMode = localTime.mode;

      console.log('[chat-ai] time debug', {
        timezone,
        city,
        now_utc: new Date().toISOString(),
        human: localTime.human,
        hour: localTime.hour,
        mode: localTime.mode,
      });

      // SLEEP: она спит. Не зовём Grok вообще, не шлём никакой реплики,
      // не меняем статус в UI. Сообщение юзера клиент уже сохранил в БД —
      // утром проактивный тик разбудит диалог.
      if (localTime.mode === 'sleep') {
        // Обновим last_user_message_at, чтобы проактивность знала что есть непрочитанное.
        const nowIso = new Date().toISOString();
        await supabase.from('user_girl_state').upsert({
          user_id: userId,
          girl_id: girlId,
          last_user_message_at: nowIso,
          status: 'offline',
          status_until: null,
          updated_at: nowIso,
        }, { onConflict: 'user_id,girl_id' });

        return json(200, {
          reply: null,
          skipped: 'sleep',
          mode: 'sleep',
          city,
          local_time: localTime.human,
        });
      }

      if (personaPrompt) {
        systemPrompt = [
          buildTimeBlock(city, timezone, localTime),
          personaPrompt,
          '',
          '=== CONTEXT ABOUT INTERLOCUTOR ===',
          buildUserContextBlock(profile),
          '',
          '=== MEMORY ===',
          buildMemoryBlock(memories),
          '',
          '=== MESSAGING STYLE ===',
          'You may split your reply into 1–3 short messages separated by a double newline (\\n\\n). Use multiple messages only when it feels natural: reaction then question, agreement then a second thought, a quick correction. Most replies are 1 message. Never force splitting.',
          '',
          '━━━ FINAL REMINDER ━━━',
          `Your city is ${city}. Your local time is ${localTime.human}. Use these exact values if asked.`,
        ].join('\n');
      } else if (legacyPrompt) {
        systemPrompt = legacyPrompt;
      } else {
        return json(404, { error: `Persona not found: ${girlId}` });
      }
    } else if (legacyPrompt) {
      systemPrompt = legacyPrompt;
    }

    const finalMessages: ChatMessage[] = [];
    if (systemPrompt) {
      finalMessages.push({ role: 'system', content: systemPrompt });
    }
    finalMessages.push(...messages);

    const reply = await callGrok(apiKey, finalMessages, {
      temperature: 0.9,
      max_tokens: 300,
    });

    // Расписание показа ответа на клиенте (имитация живого собеседника).
    const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const schedule = computeSchedule(dayMode, lastUserText, reply);

    if (girlId && userId) {
      // Запоминаем состояние пары: сообщение пришло, начинается фаза "игнора".
      // Статус станет 'online' только через ignoreMs (это делает клиент upsert'ом?
      // Нет, клиент только читает. Поэтому сервер сразу планирует переходы через
      // status_until. Для простоты первой итерации: держим offline, а клиент
      // сам переключает локальный статус по расписанию. Realtime оставляем на будущее.
      const nowIso = new Date().toISOString();
      const untilIso = new Date(Date.now() + schedule.totalMs + 90_000).toISOString();
      await supabase.from('user_girl_state').upsert({
        user_id: userId,
        girl_id: girlId,
        last_user_message_at: nowIso,
        status: 'offline',
        status_until: untilIso,
        updated_at: nowIso,
      }, { onConflict: 'user_id,girl_id' });

      const fullDialog: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content: reply },
      ];
      // @ts-ignore
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(
          saveMemoryAsync(supabase, apiKey, girlId, userId, fullDialog),
        );
      } else {
        saveMemoryAsync(supabase, apiKey, girlId, userId, fullDialog).catch(
          (e) => console.error('[chat-ai] memory save error:', e),
        );
      }
    }

    return json(200, { reply, model: GROK_MODEL, schedule, mode: dayMode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat-ai] fatal:', message);
    return json(500, { error: message });
  }
});
