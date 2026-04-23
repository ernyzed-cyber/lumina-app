// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { handleSuccessfulPayment } from './handler.ts';

const TG_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function answerPreCheckout(id: string, ok: boolean, errorMessage?: string) {
  await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: id, ok, error_message: errorMessage }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // Telegram includes this header when secret_token is configured via setWebhook.
  const secret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secret !== WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });

  const update: any = await req.json();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  if (update.pre_checkout_query) {
    // Always approve; real validation happens on successful_payment.
    await answerPreCheckout(update.pre_checkout_query.id, true);
    return new Response('ok');
  }

  const msg = update.message;
  if (msg?.successful_payment) {
    try {
      await handleSuccessfulPayment(msg.successful_payment, {
        findPurchase: async (id) => {
          const { data } = await admin.from('purchases').select('id,user_id,stars_amount,status').eq('id', id).maybeSingle();
          return data as any;
        },
        markCompleted: async ({ purchaseId, providerPaymentId }) => {
          await admin.from('purchases').update({
            status: 'completed',
            provider_payment_id: providerPaymentId,
            completed_at: new Date().toISOString(),
          }).eq('id', purchaseId);
        },
        creditStars: async ({ userId, amount, refId }) => {
          const { data, error } = await admin.rpc('credit_stars', {
            p_user_id: userId,
            p_amount: amount,
            p_reason: `purchase:telegram_stars`,
            p_ref_id: refId,
          });
          if (error) throw error;
          return data as number;
        },
      });
    } catch (e) {
      console.error('webhook error', e);
      // Still return 200 to Telegram to avoid retry storms; we've logged + will reconcile manually.
    }
  }

  return new Response('ok');
});
