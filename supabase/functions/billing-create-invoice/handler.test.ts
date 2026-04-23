import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleCreateInvoice, type CreateInvoiceDeps } from './handler.ts';

function makeDeps(overrides: Partial<CreateInvoiceDeps> = {}): CreateInvoiceDeps {
  return {
    createInvoiceLink: async () => 'https://t.me/invoice/fake',
    insertPurchase: async () => ({ id: 'pur-1' }),
    ...overrides,
  };
}

Deno.test('rejects unknown pack id', async () => {
  await assertRejects(
    () => handleCreateInvoice({ userId: 'u1', packId: 'stars_9999' }, makeDeps()),
    Error,
    'invalid pack',
  );
});

Deno.test('creates purchase and returns invoice url for valid pack', async () => {
  const calls: Record<string, unknown> = {};
  const deps = makeDeps({
    insertPurchase: async (args) => { calls.insertPurchase = args; return { id: 'pur-42' }; },
    createInvoiceLink: async (args) => { calls.createInvoiceLink = args; return 'https://t.me/x'; },
  });
  const res = await handleCreateInvoice({ userId: 'u1', packId: 'stars_500' }, deps);
  assertEquals(res, { invoice_url: 'https://t.me/x', purchase_id: 'pur-42' });
  assertEquals((calls.insertPurchase as { stars: number }).stars, 500);
  assertEquals((calls.createInvoiceLink as { stars: number }).stars, 500);
  assertEquals((calls.createInvoiceLink as { payload: string }).payload, 'purchase:pur-42');
});
