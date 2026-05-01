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

const VISION_PROMPT = `You are an honest visual describer. Look at the photo of a man (the user of a dating-style chat app) and produce ONE compact paragraph in Russian, 2-3 sentences, max 350 characters.

Describe:
- Appearance: approximate age range, hair (color, length, style), facial features, build (slim / average / athletic / heavy), skin tone, beard/clean-shaven, glasses, distinctive marks if obvious.
- Context: where the photo seems to be taken (indoor/outdoor, location type if recognisable), what he is wearing, mood/expression, overall vibe of the shot.

Rules:
- Be neutral and factual. No flattery, no insults, no judgement of attractiveness.
- If something is unclear or hidden, say "не видно" rather than guessing.
- Russian language, plain prose, no bullet points, no headings, no quotes.
- If the image does not show a person at all (logo, landscape, animal), reply with exactly: NO_PERSON

Return only the description text (or NO_PERSON). No prefix, no suffix.`;

interface DescribeBody {
  avatar_url?: string;
}

async function describeWithGrok(imageUrl: string): Promise<string> {
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
            { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
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
      JSON.stringify({
        ok: true,
        status: profile?.avatar_description ? 'cached' : 'cached_no_person',
        description: profile?.avatar_description ?? null,
      }),
      { headers: CORS },
    );
  }

  let description: string;
  try {
    description = await describeWithGrok(avatarUrl);
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

  // NO_PERSON sentinel: store NULL description but remember which URL we
  // examined, so we don't re-pay to describe the same non-person image again.
  const isNoPerson = /^NO_PERSON\b/i.test(description.trim());
  const finalDescription = isNoPerson ? null : description;

  const { error: updErr } = await admin
    .from('profiles')
    .update({
      avatar_description: finalDescription,
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
    JSON.stringify({
      ok: true,
      status: isNoPerson ? 'no_person' : 'described',
      description: finalDescription,
    }),
    { headers: CORS },
  );
});
