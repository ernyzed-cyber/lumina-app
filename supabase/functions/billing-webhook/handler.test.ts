import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handlePostback, type WebhookDeps, type Postback } from './handler.ts';

function pb(over: Partial<Postback> = {}): Postback {
  return {
    status: 'success',
    invoice_id: '89UX09KA',
    order_id: '00000000-0000-0000-0000-000000000001',
    token: 'jwt.token.sig',
    invoice_info: { invoice_status: 'paid', amount_paid_usd: 5.0 },
    ...over,
  };
}

function deps(over: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    verifyToken: async () => true,
    loadPurchase: async () => ({
      id: '00000000-0000-0000-0000-000000000001',
      user_id: 'u1',
      pack_id: 'stars_100',
      stars_amount: 100,
      fiat_amount: 5.0,
      fiat_currency: 'USD',
      status: 'pending',
    }),
    creditStars: async () => 100,
    markCompleted: async () => {},
    ...over,
  };
}

Deno.test('rejects when JWT token invalid', async () => {
  const res = await handlePostback(pb(), deps({ verifyToken: async () => false }));
  assertEquals(res, { handled: false, reason: 'invalid token' });
});

Deno.test('rejects malformed order_id', async () => {
  const res = await handlePostback(pb({ order_id: 'not-a-uuid' }), deps());
  assertEquals(res.handled, false);
  assertEquals(res.reason, 'malformed order_id');
});

Deno.test('ignores non-success invoice_status', async () => {
  const res = await handlePostback(pb({ invoice_info: { invoice_status: 'canceled', amount_paid_usd: 0 } }), deps());
  assertEquals(res.handled, false);
  assertEquals(res.reason, 'ignored status canceled');
});

Deno.test('returns already-completed when purchase already paid', async () => {
  const res = await handlePostback(pb(), deps({
    loadPurchase: async () => ({
      id: '00000000-0000-0000-0000-000000000001',
      user_id: 'u1', pack_id: 'stars_100', stars_amount: 100,
      fiat_amount: 5.0, fiat_currency: 'USD', status: 'completed',
    }),
  }));
  assertEquals(res, { handled: true, reason: 'already completed' });
});

Deno.test('rejects when amount_paid_usd is short of expected (>1%)', async () => {
  const res = await handlePostback(pb({ invoice_info: { invoice_status: 'paid', amount_paid_usd: 4.0 } }), deps());
  assertEquals(res.handled, false);
  assertEquals(res.reason?.startsWith('amount mismatch'), true);
});

Deno.test('accepts overpaid status', async () => {
  let credited = 0;
  const res = await handlePostback(
    pb({ invoice_info: { invoice_status: 'overpaid', amount_paid_usd: 6.0 } }),
    deps({ creditStars: async (a) => { credited = a.amount; return 100; } }),
  );
  assertEquals(res, { handled: true, reason: 'credited' });
  assertEquals(credited, 100);
});

Deno.test('happy path credits stars and marks completed', async () => {
  let credit: any = null;
  let mark: any = null;
  const res = await handlePostback(pb(), deps({
    creditStars: async (a) => { credit = a; return 100; },
    markCompleted: async (a) => { mark = a; },
  }));
  assertEquals(res, { handled: true, reason: 'credited' });
  assertEquals(credit, {
    userId: 'u1', amount: 100, reason: 'purchase:cryptocloud', refId: '89UX09KA',
  });
  assertEquals(mark, { purchaseId: '00000000-0000-0000-0000-000000000001', providerPaymentId: '89UX09KA' });
});
