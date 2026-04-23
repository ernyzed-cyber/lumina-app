// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleBuyMessagePack } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: CORS });

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: ur } = await admin.auth.getUser(auth.replace('Bearer ', ''));
  if (!ur?.user) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: CORS });
  const userId = ur.user.id;

  try {
    const result = await handleBuyMessagePack({ userId }, {
      spendStars: async ({ userId, amount, reason, refId }) => {
        const { data, error } = await admin.rpc('spend_stars', {
          p_user_id: userId, p_amount: amount, p_reason: reason, p_ref_id: refId,
        });
        if (error) throw error;
        return data as number;
      },
      bumpBoughtToday: async ({ userId, addMessages }) => {
        const { data, error } = await admin.rpc('bump_messages_bought', {
          p_user_id: userId, p_amount: addMessages,
        });
        if (error) throw error;
        return data as number;
      },
      newUuid: () => crypto.randomUUID(),
    });
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes('insufficient') ? 402 : 400;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
});
