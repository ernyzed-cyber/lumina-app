import { findPack, type StarsPack } from './packs.ts';

export interface CreateInvoiceDeps {
  insertPurchase: (args: {
    id: string;
    userId: string;
    packId: string;
    stars: number;
    amountUsd: number;
  }) => Promise<void>;
  createCryptoCloudInvoice: (args: {
    amountUsd: number;
    orderId: string;
  }) => Promise<{ invoice_id: string; pay_url: string }>;
  attachInvoiceToPurchase: (args: {
    purchaseId: string;
    invoiceId: string;
    payUrl: string;
  }) => Promise<void>;
  newUuid: () => string;
}

export interface CreateInvoiceResult {
  pay_url: string;
  invoice_id: string;
  purchase_id: string;
  pack: { id: string; stars: number; amount_usd: number };
}

export async function handleCreateInvoice(
  req: { userId: string; packId: string },
  deps: CreateInvoiceDeps,
): Promise<CreateInvoiceResult> {
  const pack: StarsPack | undefined = findPack(req.packId);
  if (!pack) throw new Error(`unknown pack: ${req.packId}`);

  const purchaseId = deps.newUuid();

  await deps.insertPurchase({
    id: purchaseId,
    userId: req.userId,
    packId: pack.id,
    stars: pack.stars, // includes bonus
    amountUsd: pack.amount_usd,
  });

  const cc = await deps.createCryptoCloudInvoice({
    amountUsd: pack.amount_usd,
    orderId: purchaseId,
  });

  await deps.attachInvoiceToPurchase({
    purchaseId,
    invoiceId: cc.invoice_id,
    payUrl: cc.pay_url,
  });

  return {
    pay_url: cc.pay_url,
    invoice_id: cc.invoice_id,
    purchase_id: purchaseId,
    pack: { id: pack.id, stars: pack.stars, amount_usd: pack.amount_usd },
  };
}
