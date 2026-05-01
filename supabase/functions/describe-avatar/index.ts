// Supabase Edge Function: describe-avatar
//
// TWO MODES:
//
// 1. USER MODE (default)
//    Auth: user JWT in Authorization header.
//    Describes the user's own avatar from Supabase Storage and saves the
//    result to profiles.avatar_description + profiles.avatar_described_url.
//    Called by the frontend after a new avatar_url is set.
//    Idempotent: skips if avatar_described_url already matches current avatar_url.
//
// 2. ADMIN MODE (for AI girl personas)
//    Auth: service role key in Authorization header.
//    Body: { "girl_id": "alina", "photo_url": "https://..." }
//    Describes a girl's photo (public URL, e.g. Vercel-hosted static file)
//    and saves the result to girl_personas.avatar_description.
//    Run once per girl. Re-run to overwrite (no idempotency — photos are static).
//
// Why: the chat persona uses buildUserContextBlock (user appearance) and a
// YOUR APPEARANCE block (girl appearance) so the model can honestly answer
// "how do I look?" / "what do you look like?" without inventing details.
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
  // Admin mode fields:
  girl_id?: string;
  photo_url?: string;
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

/** Converts an ArrayBuffer to base64 in chunks to avoid call stack overflow. */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Download user avatar from Supabase Storage via admin client.
 * This bypasses any public-bucket access issues from external hosts.
 */
async function fetchFromStorage(
  admin: ReturnType<typeof createClient>,
  publicUrl: string,
): Promise<string> {
  const marker = '/object/public/avatars/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) throw new Error(`Cannot parse storage path from URL: ${publicUrl}`);
  const storagePath = publicUrl.slice(idx + marker.length);

  const { data, error } = await admin.storage.from('avatars').download(storagePath);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);

  const mimeType = data.type || 'image/jpeg';
  const base64 = bufferToBase64(await data.arrayBuffer());
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Download a publicly accessible image via HTTP (e.g. Vercel-hosted girl photos).
 */
async function fetchFromPublicUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching image: ${url}`);
  const mimeType = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
  const base64 = bufferToBase64(await res.arrayBuffer());
  return `data:${mimeType};base64,${base64}`;
}

/** Run vision model on a base64 data-URL and return description text. */
async function describeWithGrok(dataUrl: string): Promise<string> {
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

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: CORS });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let body: DescribeBody = {};
  try {
    body = (await req.json()) as DescribeBody;
  } catch { /* empty body is fine for user mode */ }

  // ── ADMIN MODE ──────────────────────────────────────────────────────────
  // Activated when body contains girl_id + photo_url AND the caller sends
  // the service role key as the Bearer token.
  // Use: Supabase Dashboard → describe-avatar → Test  (sends service role by default)
  //   Body: { "girl_id": "alina", "photo_url": "https://yourapp.vercel.app/photos/xxx.jpg" }
  if (body.girl_id) {
    if (token !== SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: 'admin_unauth', hint: 'Send service role key as Bearer token' }),
        { status: 401, headers: CORS },
      );
    }

    const { girl_id, photo_url } = body;
    if (!photo_url) {
      return new Response(
        JSON.stringify({ error: 'missing_photo_url' }),
        { status: 400, headers: CORS },
      );
    }

    let dataUrl: string;
    try {
      dataUrl = await fetchFromPublicUrl(photo_url);
      console.log('[describe-avatar] girl photo fetched, size ~', Math.round(dataUrl.length / 1024), 'KB');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: 'fetch_failed', detail: msg }), {
        status: 502,
        headers: CORS,
      });
    }

    let description: string;
    try {
      description = await describeWithGrok(dataUrl);
      console.log('[describe-avatar] girl vision output:', JSON.stringify(description.slice(0, 300)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: 'vision_failed', detail: msg }), {
        status: 502,
        headers: CORS,
      });
    }

    if (description.length > 600) description = description.slice(0, 600);

    const { error: updErr } = await admin
      .from('girl_personas')
      .update({ avatar_description: description })
      .eq('id', girl_id);

    if (updErr) {
      return new Response(
        JSON.stringify({ error: 'db_update_failed', detail: updErr.message }),
        { status: 500, headers: CORS },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, girl_id, description }),
      { headers: CORS },
    );
  }

  // ── USER MODE ────────────────────────────────────────────────────────────
  const { data: ur } = await admin.auth.getUser(token);
  if (!ur?.user) {
    return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  }
  const userId = ur.user.id;

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('avatar_url, avatar_description, avatar_described_url')
    .eq('id', userId)
    .maybeSingle();

  if (profErr) {
    return new Response(
      JSON.stringify({ error: 'profile_load_failed', detail: profErr.message }),
      { status: 500, headers: CORS },
    );
  }

  const avatarUrl = (profile?.avatar_url as string | null) ?? body.avatar_url ?? null;

  if (!avatarUrl) {
    if (profile?.avatar_description || profile?.avatar_described_url) {
      await admin
        .from('profiles')
        .update({ avatar_description: null, avatar_described_url: null })
        .eq('id', userId);
    }
    return new Response(JSON.stringify({ ok: true, status: 'no_avatar' }), { headers: CORS });
  }

  // Idempotent: already described this exact URL → return cached.
  if (profile?.avatar_described_url === avatarUrl) {
    return new Response(
      JSON.stringify({ ok: true, status: 'cached', description: profile?.avatar_description ?? null }),
      { headers: CORS },
    );
  }

  let dataUrl: string;
  try {
    dataUrl = await fetchFromStorage(admin, avatarUrl);
    console.log('[describe-avatar] user avatar fetched, size ~', Math.round(dataUrl.length / 1024), 'KB');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'fetch_failed', detail: msg }), {
      status: 502,
      headers: CORS,
    });
  }

  let description: string;
  try {
    description = await describeWithGrok(dataUrl);
    console.log('[describe-avatar] user vision output:', JSON.stringify(description.slice(0, 300)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'vision_failed', detail: msg }), {
      status: 502,
      headers: CORS,
    });
  }

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
    return new Response(
      JSON.stringify({ error: 'profile_update_failed', detail: updErr.message }),
      { status: 500, headers: CORS },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, status: 'described', description }),
    { headers: CORS },
  );
});
