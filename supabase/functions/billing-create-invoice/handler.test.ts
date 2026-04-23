import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { handleCreateInvoice, type CreateInvoiceDeps } from './handler.ts';

function makeDeps(over: Partial<CreateInvoiceDeps> = {}): CreateInvoiceDeps {
  return {
    insertPurchase: async () => {},
    createCryptoCloudInvoice: async () => ({
      invoice_id: 'INV-89UX09KA',
      pay_url: 'https://pay.cryptocloud.plus/89UX09KA',
    }),
    attachInvoiceToPurchase: async () => {},
    newUuid: () => 'purchase-uuid-1',
    ...over,
  };
}

Deno.test('rejects unknown pack', async () => {
  await assertRejects(
    () => handleCreateInvoice({ userId: 'u', packId: 'nonexistent' }, makeDeps()),
    Error,
    'unknown pack',
  );
});

Deno.test('inserts pending purchase with pack stars (incl bonus) and amount_usd before invoicing', async () => {
  let captured: any = null;
  await handleCreateInvoice({ userId: 'u', packId: 'stars_550' }, makeDeps({
    insertPurchase: async (a) => { captured = a; },
  }));
  assertEquals(captured, {
    id: 'purchase-uuid-1',
    userId: 'u',
    packId: 'stars_550',
    stars: 550, // 500 base + 50 bonus
    amountUsd: 25.0,
  });
});

Deno.test('passes amount_usd and orderId=purchaseId to CryptoCloud', async () => {
  let captured: any = null;
  await handleCreateInvoice({ userId: 'u', packId: 'stars_100' }, makeDeps({
    createCryptoCloudInvoice: async (a) => {
      captured = a;
      return { invoice_id: 'INV-X', pay_url: 'https://pay.cryptocloud.plus/X' };
    },
  }));
  assertEquals(captured, { amountUsd: 5.0, orderId: 'purchase-uuid-1' });
});

Deno.test('attaches invoice_id and pay_url back to purchase row', async () => {
  let captured: any = null;
  await handleCreateInvoice({ userId: 'u', packId: 'stars_100' }, makeDeps({
    attachInvoiceToPurchase: async (a) => { captured = a; },
  }));
  assertEquals(captured, {
    purchaseId: 'purchase-uuid-1',
    invoiceId: 'INV-89UX09KA',
    payUrl: 'https://pay.cryptocloud.plus/89UX09KA',
  });
});

Deno.test('returns pay_url, invoice_id, purchase_id and pack info', async () => {
  const res = await handleCreateInvoice({ userId: 'u', packId: 'stars_2400' }, makeDeps());
  assertEquals(res, {
    pay_url: 'https://pay.cryptocloud.plus/89UX09KA',
    invoice_id: 'INV-89UX09KA',
    purchase_id: 'purchase-uuid-1',
    pack: { id: 'stars_2400', stars: 2400, amount_usd: 100.0 },
  });
});
