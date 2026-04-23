export interface WebhookDeps {
  findPurchase: (purchaseId: string) => Promise<{ id: string; user_id: string; stars_amount: number; status: string } | null>;
  markCompleted: (args: { purchaseId: string; providerPaymentId: string }) => Promise<void>;
  creditStars: (args: { userId: string; amount: number; refId: string }) => Promise<number>;
}

export interface TelegramSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface WebhookOutcome {
  status: 'ok' | 'ignored' | 'duplicate';
  balance?: number;
}

const PAYLOAD_RE = /^purchase:([0-9a-f-]{36})$/i;

export async function handleSuccessfulPayment(
  payment: TelegramSuccessfulPayment,
  deps: WebhookDeps,
): Promise<WebhookOutcome> {
  if (payment.currency !== 'XTR') {
    throw new Error(`unexpected currency: ${payment.currency}`);
  }
  const m = PAYLOAD_RE.exec(payment.invoice_payload);
  if (!m) throw new Error(`bad payload: ${payment.invoice_payload}`);
  const purchaseId = m[1];

  const purchase = await deps.findPurchase(purchaseId);
  if (!purchase) return { status: 'ignored' };
  if (purchase.status === 'completed') return { status: 'duplicate' };

  if (payment.total_amount !== purchase.stars_amount) {
    throw new Error(`amount mismatch: expected ${purchase.stars_amount}, got ${payment.total_amount}`);
  }

  await deps.markCompleted({ purchaseId, providerPaymentId: payment.telegram_payment_charge_id });
  const balance = await deps.creditStars({
    userId: purchase.user_id,
    amount: purchase.stars_amount,
    refId: payment.telegram_payment_charge_id,
  });
  return { status: 'ok', balance };
}
