import { PACKS, isPackId, type PackId } from './packs.ts';

export interface CreateInvoiceDeps {
  createInvoiceLink: (args: { payload: string; stars: number; title: string; description: string }) => Promise<string>;
  insertPurchase: (args: { userId: string; packId: PackId; stars: number }) => Promise<{ id: string }>;
}

export interface CreateInvoiceRequest {
  userId: string;
  packId: string;
}

export interface CreateInvoiceResponse {
  invoice_url: string;
  purchase_id: string;
}

export async function handleCreateInvoice(
  req: CreateInvoiceRequest,
  deps: CreateInvoiceDeps,
): Promise<CreateInvoiceResponse> {
  if (!isPackId(req.packId)) {
    throw new Error(`invalid pack: ${req.packId}`);
  }
  const pack = PACKS[req.packId];
  const purchase = await deps.insertPurchase({
    userId: req.userId,
    packId: pack.id,
    stars: pack.stars,
  });
  const url = await deps.createInvoiceLink({
    payload: `purchase:${purchase.id}`,
    stars: pack.stars,
    title: pack.title,
    description: pack.description,
  });
  return { invoice_url: url, purchase_id: purchase.id };
}
