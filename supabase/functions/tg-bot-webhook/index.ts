// deno-lint-ignore-file no-explicit-any
//
// tg-bot-webhook — receives all updates from @LuminaPayBot.
// Deploy with --no-verify-jwt; we authenticate via TG's
// X-Telegram-Bot-Api-Secret-Token header instead.
//
// Always returns HTTP 200 (Telegram retries on non-2xx → duplicate updates).
//
// Handled update types:
//   • message with text "/start inv_<uuid>"   — sendInvoice for that purchase
//   • pre_checkout_query                       — answerPreCheckoutQuery
//   • message.successful_payment               — credit Lumina-stars
//   • message.refunded_payment                 — refund Lumina-stars
//
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { findPack } from '../billing-create-invoice/packs.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TG_BOT_TOKEN = Deno.env.get('TG_BOT_TOKEN')!;
const TG_WEBHOOK_SECRET = Deno.env.get('TG_WEBHOOK_SECRET')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://lumina-app-eight-sable.vercel.app';

const TG_API = `https://api.telegram.org/bot${TG_BOT_TOKEN}`;

/** Always-200 response so Telegram doesn't retry. */
function ok(extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, ...extra }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callTG(method: string, body: Record<string, unknown>): Promise<any> {
  try {
    const res = await fetch(`${TG_API}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error('callTG failed', method, e);
    return null;
  }
}

Deno.serve(async (req) => {
  // Authenticate Telegram-issued requests via secret_token header set in setWebhook.
  const headerSecret = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (headerSecret !== TG_WEBHOOK_SECRET) {
    console.warn('webhook: bad secret');
    return new Response('forbidden', { status: 403 });
  }

  let update: any;
  try {
    update = await req.json();
  } catch {
    return ok({ ignored: 'bad-json' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // --- /start inv_<uuid> ----------------------------------------------
    if (update.message?.text && typeof update.message.text === 'string') {
      const text: string = update.message.text;
      const chatId: number = update.message.chat.id;

      const startMatch = text.match(/^\/start\s+inv_([0-9a-f-]{36})$/i);
      if (startMatch) {
        const invoiceId = startMatch[1];
        await handleStart(admin, chatId, invoiceId);
        return ok();
      }

      // Plain /start without payload — friendly hello.
      if (text === '/start') {
        await callTG('sendMessage', {
          chat_id: chatId,
          text: 'Это платёжный бот Lumina. Чтобы оплатить, вернитесь в приложение и выберите способ оплаты «Telegram Stars».',
        });
        return ok();
      }
    }

    // --- pre_checkout_query ---------------------------------------------
    if (update.pre_checkout_query) {
      await handlePreCheckout(admin, update.pre_checkout_query);
      return ok();
    }

    // --- successful_payment ---------------------------------------------
    if (update.message?.successful_payment) {
      await handleSuccessfulPayment(
        admin,
        update.message.chat.id,
        update.message.successful_payment,
      );
      return ok();
    }

    // --- refunded_payment -----------------------------------------------
    // Telegram delivers refunds as a separate message with .refunded_payment
    if (update.message?.refunded_payment) {
      await handleRefundedPayment(
        admin,
        update.message.chat.id,
        update.message.refunded_payment,
      );
      return ok();
    }
  } catch (e) {
    console.error('webhook handler error', e);
    // Still return 200 so Telegram doesn't loop.
  }

  return ok({ ignored: 'unhandled' });
});

// ─────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────

async function handleStart(admin: any, chatId: number, invoiceId: string) {
  const { data: purchase, error } = await admin
    .from('purchases')
    .select('id, user_id, pack_id, stars_amount, status, provider')
    .eq('id', invoiceId)
    .eq('provider', 'telegram')
    .maybeSingle();

  if (error || !purchase) {
    await callTG('sendMessage', {
      chat_id: chatId,
      text: 'Счёт не найден. Вернитесь в Lumina и попробуйте ещё раз.',
    });
    return;
  }

  if (purchase.status !== 'pending') {
    await callTG('sendMessage', {
      chat_id: chatId,
      text: `Этот счёт уже ${purchase.status === 'completed' ? 'оплачен' : 'недействителен'}. Создайте новый в Lumina.`,
    });
    return;
  }

  const pack = findPack(purchase.pack_id);
  if (!pack) {
    await callTG('sendMessage', {
      chat_id: chatId,
      text: 'Внутренняя ошибка пакета. Сообщите поддержке.',
    });
    return;
  }

  // Remember chat_id so we can DM the "back to Lumina" button later.
  await admin
    .from('purchases')
    .update({ tg_chat_id: chatId })
    .eq('id', invoiceId);

  await callTG('sendInvoice', {
    chat_id: chatId,
    title: `${pack.stars} ⭐ Lumina`,
    description: `Пополнение баланса Lumina на ${pack.stars} звёзд.`,
    payload: invoiceId, // returned in successful_payment.invoice_payload
    currency: 'XTR',
    prices: [{ label: `${pack.stars} ⭐`, amount: pack.tg_stars }],
  });
}

async function handlePreCheckout(admin: any, q: any) {
  const invoiceId: string = q.invoice_payload;
  const totalAmount: number = q.total_amount;

  const { data: purchase } = await admin
    .from('purchases')
    .select('id, pack_id, status')
    .eq('id', invoiceId)
    .eq('provider', 'telegram')
    .maybeSingle();

  let okFlag = false;
  let errorMsg = 'Счёт недействителен';

  if (purchase && purchase.status === 'pending') {
    const pack = findPack(purchase.pack_id);
    if (pack && pack.tg_stars === totalAmount) {
      okFlag = true;
    } else {
      errorMsg = 'Сумма счёта не совпадает';
    }
  } else if (purchase) {
    errorMsg = 'Счёт уже использован';
  }

  await callTG('answerPreCheckoutQuery', {
    pre_checkout_query_id: q.id,
    ok: okFlag,
    ...(okFlag ? {} : { error_message: errorMsg }),
  });
}

async function handleSuccessfulPayment(admin: any, chatId: number, sp: any) {
  const invoiceId: string = sp.invoice_payload;
  const tgChargeId: string = sp.telegram_payment_charge_id;
  const providerChargeId: string = sp.provider_payment_charge_id;

  // Atomically transition pending → completed and grab the row we owe stars on.
  const { data: updated, error: updErr } = await admin
    .from('purchases')
    .update({
      status: 'completed',
      provider_payment_id: tgChargeId,
      provider_invoice_payload: providerChargeId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('status', 'pending')
    .select('user_id, stars_amount')
    .maybeSingle();

  if (updErr) {
    console.error('purchase update failed', updErr);
    return;
  }

  if (!updated) {
    // Already processed (TG retry) or status drifted — credit_stars idempotency
    // would also catch it, but no need to call.
    console.log('successful_payment: no pending purchase, skipping credit', invoiceId);
  } else {
    const { error: rpcErr } = await admin.rpc('credit_stars', {
      p_user_id: updated.user_id,
      p_amount: updated.stars_amount,
      p_reason: 'purchase:telegram',
      p_ref_id: tgChargeId,
    });
    if (rpcErr) console.error('credit_stars failed', rpcErr);
  }

  await callTG('sendMessage', {
    chat_id: chatId,
    text: `Оплачено! Ваши ⭐ зачислены в Lumina.`,
    reply_markup: {
      inline_keyboard: [[
        { text: '← Вернуться в Lumina', url: `${SITE_URL}/shop?paid=${invoiceId}` },
      ]],
    },
  });
}

async function handleRefundedPayment(admin: any, chatId: number, rp: any) {
  const tgChargeId: string = rp.telegram_payment_charge_id;

  const { data: purchase } = await admin
    .from('purchases')
    .select('id, user_id, stars_amount, status')
    .eq('provider_payment_id', tgChargeId)
    .eq('provider', 'telegram')
    .maybeSingle();

  if (!purchase) {
    console.warn('refunded_payment: purchase not found', tgChargeId);
    return;
  }

  if (purchase.status === 'refunded') {
    // Already handled.
    return;
  }

  const { error: updErr } = await admin
    .from('purchases')
    .update({ status: 'refunded' })
    .eq('id', purchase.id);
  if (updErr) console.error('refund status update failed', updErr);

  const { error: rpcErr } = await admin.rpc('refund_stars', {
    p_user_id: purchase.user_id,
    p_amount: purchase.stars_amount,
    p_reason: 'refund:telegram',
    p_ref_id: tgChargeId,
  });
  if (rpcErr) console.error('refund_stars failed', rpcErr);

  await callTG('sendMessage', {
    chat_id: chatId,
    text: 'Возврат оплаты произведён. Звёзды списаны с баланса Lumina.',
  });
}
