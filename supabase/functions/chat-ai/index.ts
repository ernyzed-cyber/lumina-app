// Supabase Edge Function: chat-ai
// Gemini 2.0 Flash (Google AI Studio) — бесплатно, 15 RPM, 1M токенов/день.
// Грузит персонажа из girl_personas, профиль из profiles, воспоминания из memories.
// Асинхронно сохраняет резюме диалога в memories каждые SUMMARY_TRIGGER сообщений.
//
// Secrets:
//   GOOGLE_AI_KEY          -- ключ Google AI Studio (AIza...)
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

// Gemini 2.0 Flash — бесплатно, быстро, отлично понимает русский
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

const MEMORY_LIMIT = 3;
const SUMMARY_TRIGGER = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Gemini использует другой формат: system отдельно, history как contents[]
// role: 'model' вместо 'assistant'
async function callGemini(
  apiKey: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxOutputTokens?: number } = {},
): Promise<string> {
  // Вытащим system prompt если есть
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMessages = messages.filter((m) => m.role !== 'system');

  // Конвертируем в формат Gemini
  const contents = chatMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.9,
      maxOutputTokens: opts.maxOutputTokens ?? 300,
    },
  };

  if (systemMsg) {
    body.systemInstruction = {
      parts: [{ text: systemMsg.content }],
    };
  }

  const res = await fetch(GEMINI_URL(GEMINI_MODEL, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${text}`);
  }

  const data = await res.json();
  const reply = (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  ).trim();

  if (!reply) {
    const reason = data?.candidates?.[0]?.finishReason ?? 'unknown';
    throw new Error(`Gemini empty reply, finishReason: ${reason}`);
  }

  return reply;
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
    const summary = await callGemini(apiKey, summaryMessages, {
      temperature: 0.4,
      maxOutputTokens: 150,
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
    const apiKey = Deno.env.get('GOOGLE_AI_KEY');
    if (!apiKey) {
      return json(500, { error: 'GOOGLE_AI_KEY is not configured' });
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

    if (girlId && userId) {
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
          '=== CONTEXT ABOUT INTERLOCUTOR ===',
          buildUserContextBlock(profile),
          '',
          '=== MEMORY ===',
          buildMemoryBlock(memories),
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

    const reply = await callGemini(apiKey, finalMessages, {
      temperature: 0.9,
      maxOutputTokens: 300,
    });

    if (girlId && userId) {
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

    return json(200, { reply, model: GEMINI_MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat-ai] fatal:', message);
    return json(500, { error: message });
  }
});
