-- Atomically deduct stars and insert ledger row. Returns new balance or -1 if insufficient.
CREATE OR REPLACE FUNCTION spend_stars(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_id TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE profiles
     SET stars_balance = stars_balance - p_amount
   WHERE id = p_user_id AND stars_balance >= p_amount
  RETURNING stars_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN -1;  -- insufficient funds
  END IF;

  INSERT INTO stars_ledger (user_id, delta, reason, ref_id, balance_after)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;

-- Atomically credit stars from a completed purchase.
CREATE OR REPLACE FUNCTION credit_stars(
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
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Idempotency: if ledger row with same (reason, ref_id) exists, return current balance.
  IF EXISTS (
    SELECT 1 FROM stars_ledger WHERE reason = p_reason AND ref_id = p_ref_id
  ) THEN
    SELECT stars_balance INTO v_new_balance FROM profiles WHERE id = p_user_id;
    RETURN v_new_balance;
  END IF;

  UPDATE profiles
     SET stars_balance = stars_balance + p_amount
   WHERE id = p_user_id
  RETURNING stars_balance INTO v_new_balance;

  INSERT INTO stars_ledger (user_id, delta, reason, ref_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id, v_new_balance);

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION spend_stars(UUID, INT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION credit_stars(UUID, INT, TEXT, TEXT) TO service_role;
