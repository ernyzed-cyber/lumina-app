/**
 * CryptoCloud postback handler.
 *
 * Postback shape (JSON):
 *   {
 *     status: "success",
 *     invoice_id: "89UX09KA",          // without "INV-" prefix
 *     amount_crypto: 0.000113,
 *     currency: "BNB",
 *     order_id: "<our purchase uuid>",
 *     token: "<JWT HS256 signed by SECRET_KEY>",
 *     invoice_info: {
 *       invoice_status: "success" | "paid" | "overpaid" | ...,
 *       amount_paid_usd: number,
 *       ...
 *     }
 *   }
 *
 * Successful states we credit on: "paid", "success", "overpaid".
 * Idempotency via UNIQUE(reason, ref_id) on stars_ledger
 * (refId = invoice_id, reason = "purchase:cryptocloud").
 */
export interface Postback {
  status: string;
  invoice_id: string;
  order_id: string | null;
  token: string;
  invoice_info?: {
    invoice_status?: string;
    amount_paid_usd?: number;
  } | null;
}

export interface WebhookDeps {
  verifyToken: (token: string) => Promise<boolean>;
  loadPurchase: (purchaseId: string) => Promise<{
    id: string;
    user_id: string;
    pack_id: string;
    stars_amount: number;
    fiat_amount: number;
    fiat_currency: string;
    status: string;
  } | null>;
  creditStars: (args: { userId: string; amount: number; reason: string; refId: string }) => Promise<number>;
  markCompleted: (args: { purchaseId: string; providerPaymentId: string }) => Promise<void>;
}

const SUCCESS_STATES = new Set(['paid', 'success', 'overpaid']);
const PURCHASE_REASON = 'purchase:cryptocloud';
// Allow 1% tolerance on underpayment (crypto exchange rate fluctuations);
// "overpaid" status implies amount_paid_usd >= fiat_amount, but be defensive.
const AMOUNT_TOLERANCE_RATIO = 0.99;

export async function handlePostback(pb: Postback, deps: WebhookDeps): Promise<{
  handled: boolean;
  reason?: string;
}> {
  if (!pb.token) return { handled: false, reason: 'missing token' };
  const ok = await deps.verifyToken(pb.token);
  if (!ok) return { handled: false, reason: 'invalid token' };

  if (!pb.order_id || !/^[0-9a-f-]{36}$/i.test(pb.order_id)) {
    return { handled: false, reason: 'malformed order_id' };
  }

  const invStatus = pb.invoice_info?.invoice_status ?? pb.status;
  if (!SUCCESS_STATES.has(String(invStatus).toLowerCase())) {
    return { handled: false, reason: `ignored status ${invStatus}` };
  }

  const purchase = await deps.loadPurchase(pb.order_id);
  if (!purchase) return { handled: false, reason: 'purchase not found' };

  if (purchase.status === 'completed') {
    return { handled: true, reason: 'already completed' };
  }

  const paidUsd = Number(pb.invoice_info?.amount_paid_usd ?? 0);
  if (paidUsd < purchase.fiat_amount * AMOUNT_TOLERANCE_RATIO) {
    return { handled: false, reason: `amount mismatch: paid=${paidUsd} expected=${purchase.fiat_amount}` };
  }

  await deps.creditStars({
    userId: purchase.user_id,
    amount: purchase.stars_amount,
    reason: PURCHASE_REASON,
    refId: pb.invoice_id,
  });

  await deps.markCompleted({ purchaseId: purchase.id, providerPaymentId: pb.invoice_id });

  return { handled: true, reason: 'credited' };
}
