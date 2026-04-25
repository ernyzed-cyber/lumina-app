-- Telegram Stars payments support.
-- Apply via Supabase Studio SQL editor (CLI db-push is blocked by history mismatch).
--
-- Changes:
--   1. purchases: add tg_chat_id (used by tg-bot-webhook to send "back to Lumina"
--      deep-link button after successful payment).
--   2. purchases: composite index on (provider, status) for the bot's pending lookups.
--   3. stars_ledger.balance_after CHECK is relaxed: allow negative balance ONLY
--      when reason starts with 'refund:' so honest refund-after-spend is recorded
--      faithfully without letting normal flows go below zero.

------------------------------------------------------------------------
-- 1. purchases: tg_chat_id column for "return to Lumina" button
------------------------------------------------------------------------
ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS tg_chat_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_purchases_provider_status
  ON purchases (provider, status);

------------------------------------------------------------------------
-- 2. stars_ledger.balance_after — relax CHECK for refunds only
------------------------------------------------------------------------
-- Original migration created an unnamed inline CHECK from
-- "balance_after INT NOT NULL CHECK (balance_after >= 0)". Postgres assigns
-- the system name "stars_ledger_balance_after_check". Drop and re-add.
ALTER TABLE stars_ledger
  DROP CONSTRAINT IF EXISTS stars_ledger_balance_after_check;

ALTER TABLE stars_ledger
  ADD CONSTRAINT stars_ledger_balance_after_check
  CHECK (
    balance_after >= 0
    OR reason LIKE 'refund:%'
  );

------------------------------------------------------------------------
-- 3. refund_stars RPC — used by tg-bot-webhook on refunded_payment.
--    credit_stars rejects non-positive amount; spend_stars refuses to go
--    below zero. Refunds need to deduct from `profiles.stars_balance`
--    even when balance < amount (resulting in a negative balance), and
--    write a ledger row with delta < 0 and reason starting with 'refund:'.
--    Idempotent on (reason, ref_id) like credit_stars.
------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refund_stars(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_id TEXT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'refund amount must be positive (will be deducted)';
  END IF;
  IF p_reason NOT LIKE 'refund:%' THEN
    RAISE EXCEPTION 'refund reason must start with "refund:"';
  END IF;

  -- Idempotency: same (reason, ref_id) → no-op.
  IF EXISTS (
    SELECT 1 FROM stars_ledger WHERE reason = p_reason AND ref_id = p_ref_id
  ) THEN
    SELECT stars_balance INTO v_new_balance FROM profiles WHERE id = p_user_id;
    RETURN v_new_balance;
  END IF;

  UPDATE profiles
     SET stars_balance = stars_balance - p_amount
   WHERE id = p_user_id
  RETURNING stars_balance INTO v_new_balance;

  INSERT INTO stars_ledger (user_id, delta, reason, ref_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION refund_stars(UUID, INT, TEXT, TEXT) TO service_role;
