// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleGiftSend } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, x-supabase-api-version, content-type',
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

  const body: any = await req.json();
  const { girl_id, gift_id, lang } = body ?? {};
  if (!girl_id || !gift_id) return new Response(JSON.stringify({ error: 'bad params' }), { status: 400, headers: CORS });

  try {
    const result = await handleGiftSend(
      { userId, girlId: girl_id, giftId: gift_id, lang: lang === 'en' ? 'en' : 'ru' },
      {
        loadGift: async (id) => {
          const { data } = await admin.from('gift_catalog').select('*').eq('id', id).maybeSingle();
          return data as any;
        },
        spendStars: async ({ userId, amount, reason, refId }) => {
          const { data, error } = await admin.rpc('spend_stars', {
            p_user_id: userId, p_amount: amount, p_reason: reason, p_ref_id: refId,
          });
          if (error) throw error;
          return data as number;
        },
        insertGiftSent: async (args) => {
          const { error } = await admin.from('gifts_sent').insert({
            id: args.id,
            user_id: args.userId,
            girl_id: args.girlId,
            gift_id: args.giftId,
            stars_spent: args.stars,
            intimacy_delta_applied: args.delta,
          });
          if (error) throw error;
        },
        insertMemory: async (args) => {
          const { data, error } = await admin.from('memories').insert({
            user_id: args.userId,
            girl_id: args.girlId,
            summary: args.summary,
            gift_ref: args.giftRef,
            intimacy_weight: args.intimacyWeight,
            kind: args.kind,
          }).select('id').single();
          if (error) throw error;
          return { id: data.id as string };
        },
        bumpIntimacy: async ({ userId, girlId, delta, sceneMarker }) => {
          const { data, error } = await admin.rpc('bump_intimacy', {
            p_user_id: userId, p_girl_id: girlId, p_delta: delta, p_scene_marker: sceneMarker,
          });
          if (error) throw error;
          return data as number;
        },
        newUuid: () => crypto.randomUUID(),
        todayLocal: async (userId) => {
          const { data } = await admin.from('profiles').select('tz_offset_minutes').eq('id', userId).maybeSingle();
          const offset = (data?.tz_offset_minutes as number) ?? 0;
          const d = new Date(Date.now() + offset * 60_000);
          return d.toISOString().slice(0, 10);
        },
      },
    );
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes('insufficient') ? 402 : msg.includes('unknown') || msg.includes('unavailable') ? 404 : 400;
    return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
  }
});
