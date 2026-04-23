// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleCreateInvoice } from './handler.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const TG_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function tgCreateInvoiceLink(args: { payload: string; stars: number; title: string; description: string }): Promise<string> {
  const body = {
    title: args.title,
    description: args.description,
    payload: args.payload,
    provider_token: '',              // empty for Telegram Stars (XTR)
    currency: 'XTR',
    prices: [{ label: args.title, amount: args.stars }],
  };
  const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`telegram createInvoiceLink failed: ${json.description}`);
  return json.result as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: CORS_HEADERS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: CORS_HEADERS });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes, error: userErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userErr || !userRes?.user) return new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401, headers: CORS_HEADERS });
  const userId = userRes.user.id;

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers: CORS_HEADERS }); }

  try {
    const result = await handleCreateInvoice(
      { userId, packId: body.pack_id },
      {
        createInvoiceLink: tgCreateInvoiceLink,
        insertPurchase: async (args) => {
          const { data, error } = await admin
            .from('purchases')
            .insert({
              user_id: args.userId,
              provider: 'telegram_stars',
              pack_id: args.packId,
              stars_amount: args.stars,
              status: 'pending',
            })
            .select('id')
            .single();
          if (error) throw error;
          return { id: data.id as string };
        },
      },
    );
    return new Response(JSON.stringify(result), { status: 200, headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400, headers: CORS_HEADERS });
  }
});
