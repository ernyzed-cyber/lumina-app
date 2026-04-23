// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handlePostback, type Postback } from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CC_SECRET_KEY = Deno.env.get('CRYPTOCLOUD_SECRET_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
};

/* ───────── HS256 JWT verification (Web Crypto, no deps) ───────── */
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

async function verifyHS256(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [h, p, sig] = parts;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`)),
    );
    const got = b64urlToBytes(sig);
    if (!timingSafeEq(expected, got)) return false;

    // Optional: enforce exp if present
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    if (typeof payload.exp === 'number' && Date.now() / 1000 >= payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/* ───────── Body parser (JSON or x-www-form-urlencoded) ───────── */
async function readPostback(req: Request): Promise<Postback> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j: any = await req.json();
    return j as Postback;
  }
  const text = await req.text();
  const p = new URLSearchParams(text);
  return {
    status: p.get('status') ?? '',
    invoice_id: p.get('invoice_id') ?? '',
    order_id: p.get('order_id'),
    token: p.get('token') ?? '',
    invoice_info: null, // form-encoded postbacks omit nested invoice_info
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('ok', { status: 200, headers: CORS });

  let pb: Postback;
  try {
    pb = await readPostback(req);
  } catch (e) {
    console.error('cryptocloud postback parse error', e);
    return new Response(JSON.stringify({ ok: true, ignored: 'parse' }), { status: 200, headers: CORS });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const result = await handlePostback(pb, {
      verifyToken: (token) => verifyHS256(token, CC_SECRET_KEY),
      loadPurchase: async (purchaseId) => {
        const { data } = await admin
          .from('purchases')
          .select('id, user_id, pack_id, stars_amount, fiat_amount, fiat_currency, status')
          .eq('id', purchaseId)
          .maybeSingle();
        return (data as any) ?? null;
      },
      creditStars: async ({ userId, amount, reason, refId }) => {
        const { data, error } = await admin.rpc('credit_stars', {
          p_user_id: userId, p_amount: amount, p_reason: reason, p_ref_id: refId,
        });
        if (error) throw error;
        return data as number;
      },
      markCompleted: async ({ purchaseId, providerPaymentId }) => {
        const { error } = await admin
          .from('purchases')
          .update({
            status: 'completed',
            provider_payment_id: providerPaymentId,
            completed_at: new Date().toISOString(),
          })
          .eq('id', purchaseId);
        if (error) throw error;
      },
    });

    if (!result.handled) {
      console.warn('cryptocloud postback not handled', result.reason, pb.invoice_id);
    }
    // Always return 200 to prevent CryptoCloud retries on logical no-ops.
    return new Response(JSON.stringify({ ok: true, ...result }), { status: 200, headers: CORS });
  } catch (e) {
    console.error('cryptocloud postback handler error', e, pb.invoice_id);
    return new Response(JSON.stringify({ ok: true, error: (e as Error).message }), { status: 200, headers: CORS });
  }
});
