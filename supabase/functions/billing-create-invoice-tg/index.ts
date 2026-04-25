// deno-lint-ignore-file no-explicit-any
//
// billing-create-invoice-tg — creates a `pending` purchase row for the
// Telegram Stars provider and returns a deep-link the client opens to
// hand the user off to @LuminaPayBot. The bot picks the purchase up by
// its UUID (passed as the `inv_<id>` /start payload) and calls TG
// sendInvoice with currency=XTR and prices=[pack.tg_stars].
//
// The actual stars credit happens in tg-bot-webhook on `successful_payment`.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { findPack } from '../billing-create-invoice/packs.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TG_BOT_USERNAME = Deno.env.get('TG_BOT_USERNAME')!; // without "@"

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, x-supabase-api-version, content-type',
  'Access-Control-Max-Age': '0',
  'Content-Type': 'application/json',
};

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

  const body: any = await req.json().catch(() => ({}));
  const packId = body?.pack_id;
  if (!packId || typeof packId !== 'string') {
    return new Response(JSON.stringify({ error: 'missing pack_id' }), { status: 400, headers: CORS });
  }

  const pack = findPack(packId);
  if (!pack) {
    return new Response(JSON.stringify({ error: `unknown pack: ${packId}` }), { status: 400, headers: CORS });
  }

  const purchaseId = crypto.randomUUID();

  const { error: insertErr } = await admin.from('purchases').insert({
    id: purchaseId,
    user_id: userId,
    provider: 'telegram',
    pack_id: pack.id,
    stars_amount: pack.stars, // Lumina-stars to credit on success
    fiat_amount: pack.amount_usd,
    fiat_currency: 'USD',
    status: 'pending',
  });

  if (insertErr) {
    return new Response(
      JSON.stringify({ error: `insert failed: ${insertErr.message}` }),
      { status: 500, headers: CORS },
    );
  }

  const deep_link = `https://t.me/${TG_BOT_USERNAME}?start=inv_${purchaseId}`;

  return new Response(
    JSON.stringify({
      deep_link,
      invoice_id: purchaseId,
      pack: {
        id: pack.id,
        lumina_stars: pack.stars,
        tg_stars: pack.tg_stars,
      },
    }),
    { status: 200, headers: CORS },
  );
});
