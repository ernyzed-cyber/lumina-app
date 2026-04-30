// Supabase Edge Function: chat-ai
// Grok API (xAI) — OpenAI-compatible format.
// Грузит персонажа из girl_personas, профиль из profiles, воспоминания из memories.
// На границе сессии (idle ≥ SESSION_IDLE_MS) асинхронно вызывает Grok-экстрактор
// и пишет в user_facts / girl_self_facts / memories. См. closeSessionAsync.
//
// Secrets:
//   GROK_API_KEY           -- ключ xAI (xai-...)
//   SUPABASE_URL           -- автоматически
//   SUPABASE_SERVICE_ROLE_KEY -- автоматически

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { decideLimit, nextResetAt } from './limit.ts';
import { buildIntimacyBlock, buildGiftMemoriesBlock, buildSceneDirectiveBlock } from './prompt-injections.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestPayload {
  messages: ChatMessage[];
  girlId?: string;
  userId?: string;
  system_prompt?: string;
  lang?: 'ru' | 'en';
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-1-fast-non-reasoning';

const MEMORY_LIMIT = 3;
const HISTORY_LIMIT = 30; // last N visible messages loaded from DB on the server

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

function computeSchedule(
  mode: DayMode,
  lastUserText: string,
  replyText: string,
  msUntilWake = 0,
): ReplySchedule {
  const interesting = isInterestingTopic(lastUserText);

  // Базовые диапазоны задержки "игнора" перед тем как она "заметила".
  // В мс.
  let ignoreRange: [number, number];
  if (mode === 'sleep') {
    // Спит. Игнор = время до пробуждения + 5..90 мин «утренней раскачки»
    // (умылась, кофе, потом наконец взяла телефон).
    const morningJitter = rand(5 * 60_000, 90 * 60_000);
    ignoreRange = [msUntilWake + morningJitter, msUntilWake + morningJitter];
  } else if (mode === 'work') {
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
  opts: { temperature?: number; max_tokens?: number; convId?: string } = {},
): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  // Hint to xAI to keep prompt-prefix cache warm for this conversation.
  // Cache works on EXACT prefix match, so the system prompt MUST be assembled
  // with stable blocks first (persona, platform, profile, memory) and volatile
  // blocks last (time, anti-repeat, daily flavor, scene injections).
  if (opts.convId) headers['x-grok-conv-id'] = opts.convId;

  const res = await fetch(GROK_URL, {
    method: 'POST',
    headers,
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

  // Time-of-day classification for explicit guards
  const isMorning = t.hour >= 7 && t.hour < 11;
  const isDay = t.hour >= 11 && t.hour < 17;
  const isEvening = t.hour >= 17 && t.hour < 23;
  const isNight = t.hour >= 23 || t.hour < 7;
  const tod = isMorning ? 'утро' : isDay ? 'день' : isEvening ? 'вечер' : 'ночь';

  const wakeRule = isMorning
    ? '— Можешь упомянуть что только что проснулась / пьёшь утренний кофе — если это уместно.'
    : '— ЗАПРЕЩЕНО говорить «только что проснулась», «доброе утро», «утренний кофе», «сонная после сна» — сейчас НЕ утро. Ты давно не спала.';

  const greetRule = (() => {
    if (isMorning) return '— Уместное приветствие: «доброе утро», «привет, утро».';
    if (isDay) return '— Уместное приветствие: «привет», «хей». НЕ говори «доброе утро» или «добрый вечер».';
    if (isEvening) return '— Уместное приветствие: «привет», «добрый вечер». НЕ говори «доброе утро».';
    return '— Сейчас глубокая ночь. Если пишешь — ты не спишь по какой-то причине (не можешь уснуть, поздно вернулась). НЕ говори «доброе утро».';
  })();

  return [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'REAL-WORLD FACTS (MUST USE EXACTLY AS WRITTEN):',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `• Your city: ${city}`,
    `• Your timezone: ${timezone}`,
    `• Current local time RIGHT NOW: ${t.human}`,
    `• Time of day: ${tod} (час=${t.hour})`,
    `• Day mode: ${t.mode} (sleep=01-07, work=07-17, rest=17-01)`,
    `• Weekend: ${t.isWeekend ? 'yes' : 'no'}`,
    '',
    'ВАЖНО (RU):',
    `— Ты живёшь в городе «${city}». НЕ придумывай другой город. Никаких Лондонов, Парижей и т.п.`,
    `— Сейчас у тебя РОВНО: ${t.human}. Если спросят который час — называй ЭТО время, не выдумывай. Можно округлять до пяти минут ("около восьми вечера", "пол восьмого"), но час брать ТОЛЬКО отсюда.`,
    `— Сегодняшняя дата — из строки выше. НЕ говори о прошедших праздниках как о будущих и наоборот.`,
    `— Режим дня: ${t.mode} — ${modeText[t.mode]}`,
    '',
    '=== TIME-AWARENESS RULES (КРИТИЧНО) ===',
    wakeRule,
    greetRule,
    '— Если последний раз вы общались несколько часов назад — НЕ объясняй паузу выдуманными причинами («заснула», «была на работе»), если это не соответствует текущему времени. Просто продолжай разговор естественно.',
    '— НЕ начинай ответ с «эй, ну где история» / «куда пропал» если сам(а) не писала. Это странно если в реальности это твоё первое сообщение за день.',
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
  const avatarDesc = profile.avatar_description as string | null;

  if (name) parts.push(`His name is ${name}.`);
  if (age) parts.push(`He is ${age} years old.`);
  if (city) parts.push(`Lives in: ${city}.`);
  if (bio) parts.push(`About himself: "${bio}".`);
  if (Array.isArray(interests) && interests.length > 0) {
    parts.push(`Interests: ${interests.join(', ')}.`);
  }
  if (avatarDesc) {
    // What he ACTUALLY looks like on his avatar — generated by vision model
    // from the uploaded photo. Use this when he asks how he looks, what you
    // think of his photo, or comments about appearance. NEVER invent a
    // different appearance. If he asks for an honest opinion, base it on this.
    parts.push(`His avatar shows: ${avatarDesc}`);
  }
  if (parts.length === 0) return 'The interlocutor has no profile info yet.';
  return 'WHAT YOU KNOW ABOUT HIM:\n' + parts.join(' ');
}

// ---------------------------------------------------------------------------
// Daily flavor + anti-repetition
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit — детерминистичный хэш для seed'а «события дня». */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Пул мелких «событий дня». Каждое — небольшой штрих, даёт модели свежую тему,
// чтобы не зацикливалась на питомце/работе. Меняется ежедневно, детерминистично
// по (girlId, дата), поэтому в течение одного дня она сама помнит этот «контекст».
const DAILY_EVENTS: string[] = [
  'утром разлила кофе на стол, пришлось переодеваться',
  'вчера вечером начала смотреть новый сериал — пока не решила, нравится или нет',
  'подруга зовёт на выходные выбраться за город',
  'немного болит спина — видимо неправильно сидела за ноутом',
  'на обед хотела суши, но в итоге взяла пасту',
  'в метро сегодня играл уличный музыкант, зависла послушать',
  'заказала новый крем, жду доставку',
  'нашла на балконе забытую книжку, теперь хочу дочитать',
  'соседи сверху опять громко топают, бесит немного',
  'на улице неожиданно стало тепло, куртка оказалась лишней',
  'увидела в сторис у знакомой клёвое кафе, хочу сходить',
  'вчера пересматривала старые фотки, ностальгия накрыла',
  'купила себе букетик тюльпанов просто так',
  'забыла поставить будильник, еле проснулась',
  'пробовала новый рецепт омлета с сыром — получилось неплохо',
  'на работе/учёбе скинули дурацкую задачу, голова гудит',
  'посмотрела смешной рилс про котов, ржала минут пять',
  'давно не звонила маме, сегодня наконец поговорили',
  'планирую вечером зайти в книжный просто полистать',
  'кажется, скоро нужно будет постричься',
];

function buildDailyFlavorBlock(girlId: string, localIsoDate: string): string {
  const seed = fnv1a(`${girlId}|${localIsoDate}`);
  const event = DAILY_EVENTS[seed % DAILY_EVENTS.length];
  return [
    '=== TODAY\'S SMALL EVENT (use ONCE if it fits naturally, don\'t force) ===',
    `Сегодня у тебя было вот что: ${event}.`,
    'Можешь обронить про это мимоходом, если разговор повернёт в ту сторону. Не начинай с этого сообщение. Не повторяй эту деталь во ВТОРОЙ раз за день.',
  ].join('\n');
}

/** Считает, какие «якорные» темы уже упоминались в последних репликах ассистента,
 *  чтобы явно запретить их повторять. */
function detectRecentAssistantTopics(messages: ChatMessage[]): string[] {
  const recentAssistant = messages
    .filter((m) => m.role === 'assistant')
    .slice(-5)
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const topics: Array<{ re: RegExp; label: string }> = [
    { re: /\b(кот|кошк|барсик|мурзик|котик|котейк)/i, label: 'питомец (кот)' },
    { re: /\bфигм/i, label: 'Figma / работа в Figma' },
    { re: /\b(работ[аеы]|дедлайн|задач[аи]|проект)/i, label: 'работа/проекты' },
    { re: /\bкофе\b/i, label: 'кофе' },
    { re: /\bноут|комп\b/i, label: 'ноут/комп' },
  ];

  const hits: string[] = [];
  for (const { re, label } of topics) {
    // считаем вхождения
    const matches = recentAssistant.match(new RegExp(re.source, 'gi'));
    if (matches && matches.length >= 2) {
      hits.push(label);
    }
  }
  return hits;
}

function buildAntiRepeatBlock(messages: ChatMessage[]): string {
  const overused = detectRecentAssistantTopics(messages);

  // Последняя реплика ассистента — не повторять её слова/структуру дословно
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.content ?? '';
  // Use spread to iterate by Unicode code points (not code units) so emoji
  // at the boundary don't get split into lone surrogates, which would produce
  // invalid JSON when serialised with JSON.stringify.
  const lastAssistantChars = [...lastAssistant];
  const lastSnippet = lastAssistantChars.length > 80
    ? lastAssistantChars.slice(0, 80).join('') + '…'
    : lastAssistant;

  const base = [
    '=== ANTI-REPETITION (ВАЖНО) ===',
    '— НЕ упоминай своего питомца, работу или Figma в каждом сообщении. Максимум один раз на 5–6 реплик.',
    '— Не начинай подряд два сообщения с одной и той же темы (кофе, кот, работа).',
    '— Расширяй темы: еда, погода, сериалы/музыка, мечты, мелкие планы на вечер, вопросы про него, воспоминания из детства, что-то смешное из метро/улицы.',
    '— Если собеседник шлёт подарок или короткое сообщение — реагируй КРАТКО и по-новому, не копируй свою предыдущую реакцию.',
    lastSnippet
      ? `— Твоя ПРЕДЫДУЩАЯ реплика была: «${lastSnippet}». НЕ повторяй те же слова и ту же структуру. Найди другой угол.`
      : '',
  ].filter(Boolean);
  if (overused.length > 0) {
    base.push(
      `— Ты уже ПОДРЯД несколько раз упомянула: ${overused.join(', ')}. В следующем ответе НЕ возвращайся к этим темам, выбери что-то другое.`,
    );
  }
  return base.join('\n');
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

// ---------------------------------------------------------------------------
// Session close + fact extraction (Step 3 of memory plan).
//
// Trigger: при следующем сообщении юзера, если gap = now - last_user_message_at
// >= SESSION_IDLE_MS И session_started_at не null И в окне [start, now) было
// >= MIN_SESSION_MESSAGES сообщений → вызываем closeSessionAsync через
// EdgeRuntime.waitUntil. Юзер не ждёт.
//
// Один Grok-вызов с JSON-выходом возвращает {summary, user_facts, girl_self_facts}.
// user_facts UPSERT с UNIQUE(user_id, girl_id, key, value) — противоречия
// сосуществуют. girl_self_facts INSERT ON CONFLICT (user_id, girl_id, key) DO
// NOTHING — первая версия каждого факта о себе фиксируется и не переписывается.
// memories.summary — одна запись на сессию.
// ---------------------------------------------------------------------------

const SESSION_IDLE_MS = 30 * 60_000;
const MIN_SESSION_MESSAGES = 2;

interface ExtractedFact {
  key: string;
  value: string;
}

interface SessionExtraction {
  summary: string;
  user_facts: ExtractedFact[];
  girl_self_facts: ExtractedFact[];
}

function sanitizeFacts(raw: unknown): ExtractedFact[] {
  if (!Array.isArray(raw)) return [];
  const out: ExtractedFact[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const key = (item as { key?: unknown }).key;
    const value = (item as { value?: unknown }).value;
    if (typeof key !== 'string' || typeof value !== 'string') continue;
    const k = key.trim().slice(0, 64);
    const v = value.trim().slice(0, 280);
    if (!k || !v) continue;
    out.push({ key: k, value: v });
  }
  return out;
}

async function closeSessionAsync(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  userId: string,
  girlId: string,
  sessionStart: string,
  now: string,
  lang: 'ru' | 'en',
): Promise<void> {
  try {
    const { data: rows, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('girl_id', girlId)
      .gte('created_at', sessionStart)
      .lt('created_at', now)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[chat-ai] closeSession select failed:', error.message);
      return;
    }
    const sessionMsgs = (rows ?? []) as Array<{ role: string; content: string }>;
    if (sessionMsgs.length < MIN_SESSION_MESSAGES) {
      console.log('[chat-ai] closeSession skip (too few messages)', {
        count: sessionMsgs.length,
      });
      return;
    }

    const transcript = sessionMsgs
      .map((m) => `${m.role === 'user' ? 'HE' : 'I'}: ${m.content}`)
      .join('\n');

    const summaryLangHint = lang === 'en'
      ? 'Write summary in English.'
      : 'Пиши summary на русском.';

    const extractorSystem = [
      'You read a chat transcript between a girl ("I") and a man ("HE") and extract structured memory.',
      'Output STRICT JSON with this shape:',
      '{',
      '  "summary": string,                        // 2-3 sentences, first person from girl ("я"), what happened, emotional tone. No fluff. No emoji.',
      '  "user_facts": [{"key": string, "value": string}],       // facts about HIM you learned. key is a short slug like "name", "city", "job", "hobby", "pet", "favorite_food", "mood_today". value is concrete. Skip if nothing concrete.',
      '  "girl_self_facts": [{"key": string, "value": string}]   // concrete things YOU told him about yourself in this session that you must stay consistent with later (sister name, favorite movie, where you studied, pet name). NOT personality traits, NOT vague feelings. Skip if nothing concrete.',
      '}',
      'Rules:',
      '- key: snake_case, ASCII, max 40 chars',
      '- value: short concrete fact, max 200 chars',
      '- Do NOT invent facts not present in transcript.',
      '- If a category is empty, return [].',
      summaryLangHint,
      'Return ONLY the JSON object. No prose, no code fences.',
    ].join('\n');

    const extractorUser = `Transcript:\n${transcript}\n\nReturn JSON.`;

    const raw = await callGrok(apiKey, [
      { role: 'system', content: extractorSystem },
      { role: 'user', content: extractorUser },
    ], {
      temperature: 0.2,
      max_tokens: 600,
      convId: `${userId}:${girlId}:extract`,
    });

    if (!raw) {
      console.error('[chat-ai] closeSession: empty extractor reply');
      return;
    }

    let parsed: SessionExtraction | null = null;
    try {
      // Defensive: strip potential ```json fences if model added them.
      const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned) as SessionExtraction;
    } catch (e) {
      console.error('[chat-ai] closeSession: JSON parse failed', {
        err: e instanceof Error ? e.message : String(e),
        raw: raw.slice(0, 500),
      });
      return;
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    const userFacts = sanitizeFacts(parsed.user_facts);
    const selfFacts = sanitizeFacts(parsed.girl_self_facts);

    console.log('[chat-ai] closeSession extracted', {
      messages: sessionMsgs.length,
      summaryLen: summary.length,
      userFacts: userFacts.length,
      selfFacts: selfFacts.length,
    });

    // 1) memories — журнальная запись.
    if (summary) {
      const { error: memErr } = await supabase.from('memories').insert({
        user_id: userId,
        girl_id: girlId,
        summary,
        key_facts: {},
      });
      if (memErr) console.error('[chat-ai] closeSession memories insert:', memErr.message);
    }

    // 2) user_facts — UNIQUE(user_id, girl_id, key, value) допускает противоречия.
    if (userFacts.length > 0) {
      const rows = userFacts.map((f) => ({
        user_id: userId,
        girl_id: girlId,
        key: f.key,
        value: f.value,
      }));
      const { error: ufErr } = await supabase
        .from('user_facts')
        .upsert(rows, { onConflict: 'user_id,girl_id,key,value', ignoreDuplicates: true });
      if (ufErr) console.error('[chat-ai] closeSession user_facts upsert:', ufErr.message);
    }

    // 3) girl_self_facts — UNIQUE(user_id, girl_id, key), первая версия побеждает.
    if (selfFacts.length > 0) {
      const rows = selfFacts.map((f) => ({
        user_id: userId,
        girl_id: girlId,
        key: f.key,
        value: f.value,
      }));
      const { error: sfErr } = await supabase
        .from('girl_self_facts')
        .upsert(rows, { onConflict: 'user_id,girl_id,key', ignoreDuplicates: true });
      if (sfErr) console.error('[chat-ai] closeSession girl_self_facts upsert:', sfErr.message);
    }

    // 4) last_journal_at — диагностический маркер.
    await supabase.from('user_girl_state').update({
      last_journal_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('girl_id', girlId);
  } catch (err) {
    console.error('[chat-ai] closeSessionAsync failed:', err instanceof Error ? err.message : err);
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
    // Effective conversation history fed to Grok. Defaults to client-sent
    // `messages`; replaced by server-merged history when girlId+userId present.
    let effectiveHistory: ChatMessage[] = messages;
    // Session boundary tracking — вычисляется в первом блоке `if (girlId && userId)`
    // и потребляется во втором (где идёт основной upsert user_girl_state).
    // null означает "не вычисляли / не пишем session_started_at в этом запросе".
    let newSessionStartedAt: string | null = null;

    if (girlId && userId) {
      const lang: 'ru' | 'en' = body.lang === 'en' ? 'en' : 'ru';

      // ── Daily limit gate ─────────────────────────────────────────────────
      const { data: limitProfile } = await supabase
        .from('profiles')
        .select('messages_used_today, messages_bought_today, messages_reset_at, tz_offset_minutes')
        .eq('id', userId)
        .single();

      const snap = {
        messages_used_today: (limitProfile?.messages_used_today as number) ?? 0,
        messages_bought_today: (limitProfile?.messages_bought_today as number) ?? 0,
        messages_reset_at: (limitProfile?.messages_reset_at as string | null) ?? null,
        tz_offset_minutes: (limitProfile?.tz_offset_minutes as number) ?? 0,
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
        return new Response(JSON.stringify({
          error: 'daily_limit',
          in_character_message: limitMessages[lang],
          remaining: 0,
          quota: decision.quota,
        }), { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // Increment usage BEFORE Grok call so parallel requests can't exceed quota.
      await supabase.rpc('increment_messages_used', { p_user_id: userId });
      // ─────────────────────────────────────────────────────────────────────

      const nowIsoForHistory = new Date().toISOString();
      const [personaRes, profileRes, memoriesRes, giftMemRes, relRes, historyRes, stateRes] = await Promise.all([
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
          .is('gift_ref', null)
          .order('created_at', { ascending: false })
          .limit(MEMORY_LIMIT),
        supabase
          .from('memories')
          .select('summary, gift_ref, intimacy_weight, created_at')
          .eq('user_id', userId)
          .eq('girl_id', girlId)
          .not('gift_ref', 'is', null)
          .order('intimacy_weight', { ascending: false })
          .limit(5),
        supabase
          .from('girl_relationships')
          .select('intimacy_level, pending_scene_marker')
          .eq('user_id', userId)
          .eq('girl_id', girlId)
          .maybeSingle(),
        // Server-authoritative chat history: last HISTORY_LIMIT messages that
        // are already visible (visible_at <= now). The client also sends
        // `messages` in the body — we merge below, deduping by (role, content).
        // This guarantees the model always sees real history even after
        // reload, when the client may have a partial state.
        supabase
          .from('messages')
          .select('role, content, created_at, visible_at')
          .eq('user_id', userId)
          .eq('girl_id', girlId)
          .lte('visible_at', nowIsoForHistory)
          .order('created_at', { ascending: false })
          .limit(HISTORY_LIMIT),
        // Состояние сессии: нужно для определения границы (idle ≥ 30 мин)
        // и решения, не пора ли закрывать прошлую сессию через
        // closeSessionAsync. Если строки нет — это первая встреча,
        // session_started_at проставится ниже.
        supabase
          .from('user_girl_state')
          .select('last_user_message_at, session_started_at')
          .eq('user_id', userId)
          .eq('girl_id', girlId)
          .maybeSingle(),
      ]);

      // ── Session boundary detection ───────────────────────────────────────
      // Логика:
      //   gap = now - last_user_message_at
      //   if gap >= SESSION_IDLE_MS && session_started_at != null:
      //       → закрываем прошлую сессию (waitUntil), стартуем новую
      //   if session_started_at == null (первая встреча или после закрытия):
      //       → просто стартуем новую сессию
      //   else: продолжается текущая сессия — ничего не трогаем кроме
      //         last_user_message_at (это сделают upsert'ы ниже).
      const nowMs = Date.now();
      const lastUserAtRaw = stateRes.data?.last_user_message_at as string | null | undefined;
      const sessionStartedAtRaw = stateRes.data?.session_started_at as string | null | undefined;
      const lastUserAtMs = lastUserAtRaw ? Date.parse(lastUserAtRaw) : NaN;
      const sessionStartedAt = sessionStartedAtRaw ?? null;
      const gapMs = Number.isFinite(lastUserAtMs) ? nowMs - lastUserAtMs : Number.POSITIVE_INFINITY;
      const shouldCloseSession = sessionStartedAt !== null && gapMs >= SESSION_IDLE_MS;
      // Новая сессия начинается, если: (а) её ещё нет, или (б) только что закрыли.
      const startNewSession = sessionStartedAt === null || shouldCloseSession;
      newSessionStartedAt = startNewSession ? new Date(nowMs).toISOString() : sessionStartedAt;

      console.log('[chat-ai] session', {
        gapMin: Number.isFinite(gapMs) ? Math.round(gapMs / 60_000) : 'inf',
        sessionStartedAt,
        shouldCloseSession,
        startNewSession,
      });

      if (shouldCloseSession && sessionStartedAt) {
        const closeNowIso = new Date(nowMs).toISOString();
        const task = closeSessionAsync(
          supabase,
          apiKey,
          userId,
          girlId,
          sessionStartedAt,
          closeNowIso,
          lang,
        );
        // @ts-ignore EdgeRuntime is provided by Deno Deploy at runtime.
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(task);
        } else {
          task.catch((e) => console.error('[chat-ai] closeSession error:', e));
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const personaPrompt = personaRes.data?.system_prompt;
      const timezone = (personaRes.data?.timezone as string) || 'Europe/Moscow';
      const city = (personaRes.data?.city as string) || 'Москва';
      const profile = profileRes.data ?? null;
      const memories = memoriesRes.data ?? [];

      // Merge server history (authoritative) with client-sent messages.
      // Client may include the latest user message that's not yet persisted,
      // or messages whose visible_at is still in the future (deferred sleep).
      // Strategy: take server history (oldest→newest), then append any client
      // message whose (role, content) isn't already present.
      const serverHistory: ChatMessage[] = (historyRes.data ?? [])
        .slice()
        .reverse()
        .map((row) => ({
          role: (row.role as 'user' | 'assistant'),
          content: row.content as string,
        }));
      const seenKeys = new Set(
        serverHistory.map((m) => `${m.role}::${m.content}`),
      );
      const mergedHistory: ChatMessage[] = [...serverHistory];
      for (const m of messages) {
        if (m.role === 'system') continue;
        const k = `${m.role}::${m.content}`;
        if (!seenKeys.has(k)) {
          mergedHistory.push(m);
          seenKeys.add(k);
        }
      }
      console.log('[chat-ai] history merge', {
        server: serverHistory.length,
        client: messages.length,
        merged: mergedHistory.length,
      });
      effectiveHistory = mergedHistory;

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

      // SLEEP: она спит. Раньше тут был ранний return без ответа. Теперь
       // генерируем ответ как обычно (модель получит пометку "ты только
       // проснулась, сонная"), но клиент покажет его утром — visible_at
       // задаётся через очень большой ignoreMs до 07:00 её timezone.
       // Дополнительно: проактивная утренняя логика всё ещё работает.
      if (localTime.mode === 'sleep') {
        // Обновим last_user_message_at, чтобы проактивность знала что есть непрочитанное.
        const nowIso = new Date().toISOString();
        await supabase.from('user_girl_state').upsert({
          user_id: userId,
          girl_id: girlId,
          last_user_message_at: nowIso,
          session_started_at: newSessionStartedAt,
          status: 'offline',
          status_until: null,
          updated_at: nowIso,
        }, { onConflict: 'user_id,girl_id' });
        // Не делаем return — продолжаем генерацию. Schedule ниже сам поставит
        // огромный ignoreMs (computeSchedule учитывает sleep mode).
      }

      if (personaPrompt) {
        // Дата для детерминистичного «события дня» — YYYY-MM-DD в её TZ.
        const localDate = localTime.iso.slice(0, 10);
        // ВАЖНО: порядок блоков подобран для prompt-prefix кэширования xAI.
        // Сначала идёт ВСЁ стабильное (persona, platform, profile, memory,
        // messaging style) — этот префикс не меняется между вызовами одного
        // юзера и кэшируется. После него — волатильные блоки (время,
        // daily flavor, anti-repeat, intimacy/gift/scene injections),
        // которые меняются и не должны разрывать кэш.
        systemPrompt = [
          // ── STABLE PREFIX (cacheable) ─────────────────────────────────
          personaPrompt,
          '',
          '=== PLATFORM CONTEXT ===',
          'You are chatting inside Lumina — a mobile dating/social app. Think of it like a messenger (similar look to Telegram or Instagram DM): left panel with a list of chats, right side shows the conversation. The app has a dark purple/pink aesthetic. You discovered this person through the app and started talking. You know it\'s an app, but you treat the conversation as real and personal — you don\'t constantly mention "the app", just like people don\'t say "I\'m texting you via Telegram" every message. If the user asks what app this is, you can say it\'s Lumina. You are NOT an AI assistant, you are a real girl who uses this app to meet people.',
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
          `=== STATIC LOCATION FACTS ===`,
          `• Your city: ${city}`,
          `• Your timezone: ${timezone}`,
          `Ты живёшь в городе «${city}». НЕ придумывай другой город. Никаких Лондонов, Парижей и т.п.`,
          '',
          // ── VOLATILE SUFFIX (changes per request — not cached) ────────
          buildTimeBlock(city, timezone, localTime),
          buildDailyFlavorBlock(girlId, localDate),
          '',
          buildAntiRepeatBlock(effectiveHistory),
          '',
          '━━━ FINAL REMINDER ━━━',
          `Your local time is ${localTime.human}. Use this exact value if asked.`,
        ].join('\n');

        // ── Intimacy / gift-memory / scene injections ──────────────────────
        const intimacyLevel = (relRes.data?.intimacy_level as number) ?? 0;
        const sceneMarker = (relRes.data?.pending_scene_marker as string | null) ?? null;
        const injections = [
          buildIntimacyBlock(intimacyLevel, lang),
          buildGiftMemoriesBlock((giftMemRes.data ?? []) as Parameters<typeof buildGiftMemoriesBlock>[0], lang),
          buildSceneDirectiveBlock(sceneMarker, lang),
        ].filter(Boolean).join('\n\n');
        if (injections) systemPrompt = `${systemPrompt}\n\n${injections}`;

        // Consume scene marker so it fires only once.
        if (sceneMarker) {
          await supabase.from('girl_relationships').update({
            pending_scene_marker: null,
            pending_scene_expires_at: null,
          }).eq('user_id', userId).eq('girl_id', girlId);
        }
        // ──────────────────────────────────────────────────────────────────
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
    finalMessages.push(...effectiveHistory);

    const reply = await callGrok(apiKey, finalMessages, {
      temperature: 0.9,
      max_tokens: 300,
      convId: userId && girlId ? `${userId}:${girlId}` : undefined,
    });

    // Расписание показа ответа на клиенте (имитация живого собеседника).
    const lastUserText = [...effectiveHistory].reverse().find((m) => m.role === 'user')?.content ?? '';

    // Если она спит — считаем сколько мс до 07:00 её timezone.
    let msUntilWake = 0;
    if (dayMode === 'sleep' && timezone) {
      // localTime.hour в её TZ. Если 02:00 — до 07:00 пять часов.
      // Если 06:30 — полчаса. Точное значение в минутах: (7*60 - hour*60 - minute).
      // minute не было в localTime — пересчитаем по iso "...THH:MM:00".
      const localHour = localTime.hour;
      const localMinuteMatch = localTime.iso.match(/T\d{2}:(\d{2}):/);
      const localMinute = localMinuteMatch ? Number(localMinuteMatch[1]) : 0;
      const minutesSinceMidnight = localHour * 60 + localMinute;
      const wakeMinutes = 7 * 60; // 07:00
      const minutesUntil = wakeMinutes - minutesSinceMidnight;
      msUntilWake = Math.max(0, minutesUntil) * 60_000;
    }

    const schedule = computeSchedule(dayMode, lastUserText, reply, msUntilWake);

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
        session_started_at: newSessionStartedAt,
        status: 'offline',
        status_until: untilIso,
        updated_at: nowIso,
      }, { onConflict: 'user_id,girl_id' });

      // Сохранение фактов и журнала теперь происходит на границе сессии
      // (см. closeSessionAsync, вызывается в начале обработки запроса при
      // idle ≥ SESSION_IDLE_MS). Здесь — ничего; ответ уже отправлен.
    }

    return json(200, { reply, model: GROK_MODEL, schedule, mode: dayMode });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat-ai] fatal:', message);
    return json(500, { error: message });
  }
});
