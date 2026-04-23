import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleSuccessfulPayment, type WebhookDeps, type TelegramSuccessfulPayment } from './handler.ts';

function baseDeps(over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    findPurchase: async () => ({ id: 'pur-1', user_id: 'u1', stars_amount: 500, status: 'pending' }),
    markCompleted: async () => {},
    creditStars: async () => 500,
    ...over,
  };
}

function payment(over: Partial<TelegramSuccessfulPayment> = {}): TelegramSuccessfulPayment {
  return {
    currency: 'XTR',
    total_amount: 500,
    invoice_payload: 'purchase:123e4567-e89b-12d3-a456-426614174000',
    telegram_payment_charge_id: 'tg-charge-1',
    provider_payment_charge_id: 'prov-1',
    ...over,
  };
}

Deno.test('rejects non-XTR currency', async () => {
  await assertRejects(
    () => handleSuccessfulPayment(payment({ currency: 'USD' }), baseDeps()),
    Error,
    'currency',
  );
});

Deno.test('rejects malformed payload', async () => {
  await assertRejects(
    () => handleSuccessfulPayment(payment({ invoice_payload: 'garbage' }), baseDeps()),
    Error,
    'payload',
  );
});

Deno.test('returns ignored when purchase not found', async () => {
  const res = await handleSuccessfulPayment(payment(), baseDeps({ findPurchase: async () => null }));
  assertEquals(res, { status: 'ignored' });
});

Deno.test('returns duplicate when purchase already completed', async () => {
  const res = await handleSuccessfulPayment(
    payment(),
    baseDeps({ findPurchase: async () => ({ id: 'pur-1', user_id: 'u1', stars_amount: 500, status: 'completed' }) }),
  );
  assertEquals(res.status, 'duplicate');
});

Deno.test('rejects when amount mismatches', async () => {
  await assertRejects(
    () => handleSuccessfulPayment(payment({ total_amount: 499 }), baseDeps()),
    Error,
    'amount',
  );
});

Deno.test('credits stars and marks completed on happy path', async () => {
  const called: Record<string, unknown> = {};
  const res = await handleSuccessfulPayment(payment(), baseDeps({
    markCompleted: async (args) => { called.markCompleted = args; },
    creditStars: async (args) => { called.creditStars = args; return 1500; },
  }));
  assertEquals(res, { status: 'ok', balance: 1500 });
  assertEquals((called.markCompleted as { purchaseId: string }).purchaseId, '123e4567-e89b-12d3-a456-426614174000');
  assertEquals((called.markCompleted as { providerPaymentId: string }).providerPaymentId, 'tg-charge-1');
  assertEquals(called.creditStars, { userId: 'u1', amount: 500, refId: 'tg-charge-1' });
});
