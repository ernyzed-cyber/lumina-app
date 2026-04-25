// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCreateInvoice } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CC_API_KEY = Deno.env.get('CRYPTOCLOUD_API_KEY')!;
const CC_SHOP_ID = Deno.env.get('CRYPTOCLOUD_SHOP_ID')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, x-supabase-api-version, content-type',
  'Content-Type': 'application/json',
};

async function ccCreateInvoice(amountUsd: number, orderId: string): Promise<{ invoice_id: string; pay_url: string }> {
  const res = await fetch('https://api.cryptocloud.plus/v2/invoice/create', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${CC_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shop_id: CC_SHOP_ID,
      amount: amountUsd,
      currency: 'USD',
      order_id: orderId,
    }),
  });
  const json = await res.json();
  if (json.status !== 'success' || !json.result) {
    throw new Error(`cryptocloud createInvoice failed: ${JSON.stringify(json)}`);
  }
  // result.uuid like "INV-89UX09KA"; strip "INV-" prefix to match postback's invoice_id
  const uuid = String(json.result.uuid);
  const invoice_id = uuid.startsWith('INV-') ? uuid.slice(4) : uuid;
  return { invoice_id, pay_url: String(json.result.link) };
}

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
  const packId = body?.pack_id;
  if (!packId || typeof packId !== 'string') {
    return new Response(JSON.stringify({ error: 'missing pack_id' }), { status: 400, headers: CORS });
  }

  try {
    const result = await handleCreateInvoice({ userId, packId }, {
      insertPurchase: async ({ id, userId, packId, stars, amountUsd }) => {
        const { error } = await admin.from('purchases').insert({
          id,
          user_id: userId,
          provider: 'cryptocloud',
          pack_id: packId,
          stars_amount: stars,
          fiat_amount: amountUsd,
          fiat_currency: 'USD',
          status: 'pending',
        });
        if (error) throw error;
      },
      createCryptoCloudInvoice: async ({ amountUsd, orderId }) => ccCreateInvoice(amountUsd, orderId),
      attachInvoiceToPurchase: async ({ purchaseId, invoiceId, payUrl }) => {
        const { error } = await admin.from('purchases')
          .update({
            provider_payment_id: invoiceId,
            provider_invoice_payload: payUrl,
          })
          .eq('id', purchaseId);
        if (error) throw error;
      },
      newUuid: () => crypto.randomUUID(),
    });
    return new Response(JSON.stringify(result), { status: 200, headers: CORS });
  } catch (e) {
    const msg = (e as Error).message;
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: CORS });
  }
});
