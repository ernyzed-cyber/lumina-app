// Supabase Edge Function: chat-ai
// "Живая" девушка: загружает персонажа из girl_personas, профиль собеседника
// из profiles, последние воспоминания из memories, собирает мегапромпт,
// вызывает Groq, возвращает ответ. Асинхронно сохраняет новое воспоминание.
//
// Secrets (настраиваются в Supabase Dashboard → Edge Functions → Secrets):
//   GROQ_API_KEY           — ключ Groq
// Автоматически доступны:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestPayload {
  messages: ChatMessage[];
  girlId?: string;
  userId?: string;
  // Legacy fallback — если клиент ещё шлёт старый формат
  system_prompt?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MEMORY_LIMIT = 3; // сколько прошлых резюме подтягивать
const SUMMARY_TRIGGER = 6; // каждые N сообщений создавать новое воспоминание

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function callGroq(
  apiKey: string,
  messages: ChatMessage[],
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.max_tokens ?? 300,
      top_p: 1,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

// Собираем блок "что Алина знает о собеседнике"
function buildUserContextBlock(profile: Record<string, unknown> | null): string {
  if (!profile) return 'Ты общаешься с новым человеком, о котором пока ничего не знаешь. Знакомься естественно.';
  const parts: string[] = [];
  const name = (profile.name as string) || (profile.full_name as string) || null;
  const age = profile.age as number | null;
  const city = profile.city as string | null;
  const bio = profile.bio as string | null;
  const gender = profile.gender as string | null;
  const interests = profile.interests as string[] | null;

  if (name) parts.push(`Его зовут ${name}.`);
  if (age) parts.push(`Ему ${age}.`);
  if (city) parts.push(`Живёт в городе: ${city}.`);
  if (gender) parts.push(`Пол: ${gender}.`);
  if (bio) parts.push(`О себе пишет: "${bio}".`);
  if (Array.isArray(interests) && interests.length > 0) {
    parts.push(`Интересы: ${interests.join(', ')}.`);
  }

  if (parts.length === 0) {
    return 'Ты знаешь о собеседнике только то, что он зарегистрирован в приложении — имени и подробностей пока нет.';
  }
  return 'ЧТО ТЫ ЗНАЕШЬ О НЁМ (из его анкеты):\n' + parts.join(' ');
}

function buildMemoryBlock(memories: Array<{ summary: string; created_at: string }>): string {
  if (!memories || memories.length === 0) {
    return 'ВАШИ ПРОШЛЫЕ РАЗГОВОРЫ: это ваш первый разговор.';
  }
  const lines = memories
    .slice()
    .reverse() // от старых к новым
    .map((m, i) => {
      const date = new Date(m.created_at).toLocaleDateString('ru-RU');
      return `[${date}] ${m.summary}`;
    });
  return 'ВАШИ ПРОШЛЫЕ РАЗГОВОРЫ (от старых к свежим, используй естественно):\n' + lines.join('\n');
}

// Асинхронно создать резюме последней сессии и сохранить в memories
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
      .map((m) => `${m.role === 'user' ? 'ОН' : 'Я'}: ${m.content}`)
      .join('\n');
    const summaryPrompt: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Ты помощник который читает переписку и пишет краткое резюме для дневника девушки (от первого лица "мы говорили о...", 2-3 предложения, по-русски). Фиксируй только важные факты о собеседнике и эмоциональный тон. Без воды. Без эмодзи.',
      },
      { role: 'user', content: `Переписка:\n${transcript}\n\nНапиши резюме в 2-3 предложениях.` },
    ];
    const summary = await callGroq(apiKey, summaryPrompt, {
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
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) return json(500, { error: 'GROQ_API_KEY is not configured' });

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

    // -----------------------------------------------------------------------
    // Собираем system prompt
    // -----------------------------------------------------------------------
    let systemPrompt = '';

    if (girlId && userId) {
      // Новая схема: подтягиваем персонажа, профиль, воспоминания
      const [personaRes, profileRes, memoriesRes] = await Promise.all([
        supabase
          .from('girl_personas')
          .select('system_prompt, name')
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
      const profile = profileRes.data ?? null;
      const memories = memoriesRes.data ?? [];

      if (personaPrompt) {
        systemPrompt = [
          personaPrompt,
          '',
          '━━━ CONTEXT ABOUT INTERLOCUTOR ━━━',
          buildUserContextBlock(profile),
          '',
          '━━━ MEMORY ━━━',
          buildMemoryBlock(memories),
        ].join('\n');
      } else if (legacyPrompt) {
        systemPrompt = legacyPrompt;
      } else {
        return json(404, { error: `Persona not found: ${girlId}` });
      }
    } else if (legacyPrompt) {
      // Старый клиент — просто прокси
      systemPrompt = legacyPrompt;
    }

    // -----------------------------------------------------------------------
    // Формируем запрос к Groq
    // -----------------------------------------------------------------------
    const finalMessages: ChatMessage[] = [];
    if (systemPrompt) finalMessages.push({ role: 'system', content: systemPrompt });
    finalMessages.push(...messages);

    const reply = await callGroq(apiKey, finalMessages, {
      temperature: 0.9,
      max_tokens: 150,
    });

    // -----------------------------------------------------------------------
    // Async: сохраняем свежее воспоминание (fire-and-forget)
    // -----------------------------------------------------------------------
    if (girlId && userId) {
      const fullDialog: ChatMessage[] = [
        ...messages,
        { role: 'assistant', content: reply },
      ];
      // @ts-ignore — EdgeRuntime доступен в Supabase Edge Functions
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(
          saveMemoryAsync(supabase, apiKey, girlId, userId, fullDialog),
        );
      } else {
        // Fallback — не ждём, но и не теряем ошибку
        saveMemoryAsync(supabase, apiKey, girlId, userId, fullDialog).catch(
          (e) => console.error('[chat-ai] memory save error:', e),
        );
      }
    }

    return json(200, { reply, model: GROQ_MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat-ai] fatal:', message);
    return json(500, { error: message });
  }
});
