// Supabase Edge Function: describe-avatar
// Generates a short text description of the user's avatar using xAI's vision
// capability and saves it to profiles.avatar_description.
//
// Why: the chat persona must be able to honestly comment on the user's
// appearance (when asked "how do I look?") instead of inventing details.
// We pre-compute the description ONCE per avatar (cheap, ~one xAI call) and
// inject the text into every chat-ai system prompt via buildUserContextBlock.
//
// Called by the frontend after a new avatar_url is set on the profile.
// Idempotent: if the current avatar_url already matches avatar_described_url,
// returns the cached description without hitting xAI.
//
// Auth: requires user JWT — the user can only (re)describe their own avatar.
//
// Secrets:
//   GROK_API_KEY                -- xAI key (xai-...)
//   SUPABASE_URL                -- auto
//   SUPABASE_SERVICE_ROLE_KEY   -- auto

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GROK_API_KEY = Deno.env.get('GROK_API_KEY')!;

const GROK_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-4-1-fast-non-reasoning';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, apikey, x-client-info, x-supabase-api-version, content-type',
  'Access-Control-Max-Age': '0',
  'Content-Type': 'application/json',
};

const VISION_PROMPT = `Кратко опиши что изображено на фото. 1-2 предложения, максимум 300 символов. Только факты: кто/что на фото, обстановка, внешний вид если есть человек. Без оценок и лишних слов.`;

interface DescribeBody {
  avatar_url?: string;
}

/**
 * Download image from Supabase Storage via admin client (bypasses any public-
 * bucket access issues) and return it as a base64 data-URL so xAI never needs
 * to fetch the image from an external host.
 */
async function fetchImageAsDataUrl(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.45.0').createClient>,
  publicUrl: string,
): Promise<string> {
  // Extract the storage path from the public URL.
  // URL format: .../storage/v1/object/public/avatars/<userId>/<filename>
  const marker = '/object/public/avatars/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) throw new Error(`Cannot parse storage path from URL: ${publicUrl}`);
  const storagePath = publicUrl.slice(idx + marker.length);

  const { data, error } = await admin.storage.from('avatars').download(storagePath);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);

  const buffer = await data.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // btoa works on latin1 strings; build one char per byte.
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);

  const mimeType = data.type || 'image/jpeg';
  return `data:${mimeType};base64,${base64}`;
}

async function describeWithGrok(
  admin: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.45.0').createClient>,
  imageUrl: string,
): Promise<string> {
  const dataUrl = await fetchImageAsDataUrl(admin, imageUrl);
  console.log('[describe-avatar] image fetched, size ~', Math.round(dataUrl.length / 1024), 'KB (base64)');

  const res = await fetch(GROK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'auto' } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`grok ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const out = (data?.choices?.[0]?.message?.content ?? '').trim();
  if (!out) throw new Error('grok empty reply');
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: CORS });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: ur } = await admin.auth.getUser(auth.replace('Bearer ', ''));
  if (!ur?.user) {
    return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  }
  const userId = ur.user.id;

  let body: DescribeBody = {};
  try {
    body = (await req.json()) as DescribeBody;
  } catch {
    /* allow empty body — we'll read avatar_url from DB */
  }

  // Load the current profile (source of truth: DB, not request body).
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('avatar_url, avatar_description, avatar_described_url')
    .eq('id', userId)
    .maybeSingle();

  if (profErr) {
    return new Response(JSON.stringify({ error: 'profile_load_failed', detail: profErr.message }), {
      status: 500,
      headers: CORS,
    });
  }

  const avatarUrl = (profile?.avatar_url as string | null) ?? body.avatar_url ?? null;

  // No avatar → clear description (in case it was set previously).
  if (!avatarUrl) {
    if (profile?.avatar_description || profile?.avatar_described_url) {
      await admin
        .from('profiles')
        .update({ avatar_description: null, avatar_described_url: null })
        .eq('id', userId);
    }
    return new Response(JSON.stringify({ ok: true, status: 'no_avatar' }), { headers: CORS });
  }

  // Already processed this exact URL (either got a description or NO_PERSON) → no-op.
  // We check only avatar_described_url — if it matches we already paid for this call.
  // description can be null if NO_PERSON was returned; that's intentional.
  if (profile?.avatar_described_url === avatarUrl) {
    return new Response(
      JSON.stringify({ ok: true, status: 'cached', description: profile?.avatar_description ?? null }),
      { headers: CORS },
    );
  }

  let description: string;
  try {
    description = await describeWithGrok(admin, avatarUrl);
    // Log raw output so we can diagnose NO_PERSON / unexpected responses in Supabase logs.
    console.log('[describe-avatar] vision raw output:', JSON.stringify(description.slice(0, 300)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Don't poison the column on failure — leave whatever was there.
    return new Response(JSON.stringify({ error: 'vision_failed', detail: msg }), {
      status: 502,
      headers: CORS,
    });
  }

  // Trim to a hard ceiling so prompts stay bounded even if model ignores limit.
  if (description.length > 600) description = description.slice(0, 600);

  const { error: updErr } = await admin
    .from('profiles')
    .update({
      avatar_description: description,
      avatar_described_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updErr) {
    return new Response(JSON.stringify({ error: 'profile_update_failed', detail: updErr.message }), {
      status: 500,
      headers: CORS,
    });
  }

  return new Response(
    JSON.stringify({ ok: true, status: 'described', description }),
    { headers: CORS },
  );
});
