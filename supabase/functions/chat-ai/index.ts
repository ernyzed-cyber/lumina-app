// Supabase Edge Function: chat-ai
// "Р–РёРІР°СЏ" РґРµРІСѓС€РєР°: Р·Р°РіСЂСѓР¶Р°РµС‚ РїРµСЂСЃРѕРЅР°Р¶Р° РёР· girl_personas, РїСЂРѕС„РёР»СЊ СЃРѕР±РµСЃРµРґРЅРёРєР°
// РёР· profiles, РїРѕСЃР»РµРґРЅРёРµ РІРѕСЃРїРѕРјРёРЅР°РЅРёСЏ РёР· memories, СЃРѕР±РёСЂР°РµС‚ РјРµРіР°РїСЂРѕРјРїС‚,
// РІС‹Р·С‹РІР°РµС‚ OpenRouter, РІРѕР·РІСЂР°С‰Р°РµС‚ РѕС‚РІРµС‚. РђСЃРёРЅС…СЂРѕРЅРЅРѕ СЃРѕС…СЂР°РЅСЏРµС‚ РЅРѕРІРѕРµ РІРѕСЃРїРѕРјРёРЅР°РЅРёРµ.
//
// Secrets (РЅР°СЃС‚СЂР°РёРІР°СЋС‚СЃСЏ РІ Supabase Dashboard в†’ Edge Functions в†’ Secrets):
//   OPENROUTER_API_KEY     вЂ” РєР»СЋС‡ OpenRouter (sk-or-...)
// РђРІС‚РѕРјР°С‚РёС‡РµСЃРєРё РґРѕСЃС‚СѓРїРЅС‹:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

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

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Р‘РµСЃРїР»Р°С‚РЅР°СЏ РјРѕС‰РЅР°СЏ РјРѕРґРµР»СЊ РЅР° OpenRouter Р±РµР· TPM Р»РёРјРёС‚РѕРІ
const MODEL = 'google/gemma-4-31b-it:free';
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

async function callLLM(
  apiKey: string,
  messages: ChatMessage[],
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lumina-app-eight-sable.vercel.app',
      'X-Title': 'Lumina',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.85,
      max_tokens: opts.max_tokens ?? 150,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

function buildUserContextBlock(profile: Record<string, unknown> | null): string {
  if (!profile) return 'You are talking to a new person, you know nothing about him yet. Get to know him naturally.';
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

function buildMemoryBlock(memories: Array<{ summary: string; created_at: string }>): string {
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
  return 'YOUR PAST CONVERSATIONS (oldest to newest, use naturally):\n' + lines.join('\n');
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
      .map((m) => `${m.role === 'user' ? 'РћРќ' : 'РЇ'}: ${m.content}`)
      .join('\n');
    const summaryPrompt: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You read a chat transcript and write a brief diary entry summary in Russian (2-3 sentences, first person "РјС‹ РіРѕРІРѕСЂРёР»Рё Рѕ..."). Only capture important facts about the interlocutor and emotional tone. No fluff. No emoji.',
      },
      { role: 'user', content: `Transcript:\n${transcript}\n\nWrite a 2-3 sentence summary in Russian.` },
    ];
    const summary = await callLLM(apiKey, summaryPrompt, {
      temperature: 0.4,
      max_tokens: 120,
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
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) return json(500, { error: 'OPENROUTER_API_KEY is not configured' });

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
          'в”Ѓв”Ѓв”Ѓ CONTEXT ABOUT INTERLOCUTOR в”Ѓв”Ѓв”Ѓ',
          buildUserContextBlock(profile),
          '',
          'в”Ѓв”Ѓв”Ѓ MEMORY в”Ѓв”Ѓв”Ѓ',
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
    if (systemPrompt) finalMessages.push({ role: 'system', content: systemPrompt });
    finalMessages.push(...messages);

    const reply = await callLLM(apiKey, finalMessages, {
      temperature: 0.9,
      max_tokens: 150,
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

    return json(200, { reply, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat-ai] fatal:', message);
    return json(500, { error: message });
  }
});
