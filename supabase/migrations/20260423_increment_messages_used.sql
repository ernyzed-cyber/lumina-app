-- Atomically increments messages_used_today for a user.
-- Called by chat-ai edge function on every successful message (after limit gate).
-- SECURITY DEFINER: runs as owner, bypasses RLS.
CREATE OR REPLACE FUNCTION increment_messages_used(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE profiles
  SET messages_used_today = messages_used_today + 1
  WHERE id = p_user_id
  RETURNING messages_used_today INTO v_new;
  RETURN COALESCE(v_new, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_messages_used(UUID) TO service_role;
