CREATE OR REPLACE FUNCTION bump_messages_bought(
  p_user_id UUID,
  p_amount INT
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new INT;
BEGIN
  UPDATE profiles
     SET messages_bought_today = messages_bought_today + p_amount
   WHERE id = p_user_id
  RETURNING messages_bought_today INTO v_new;
  RETURN COALESCE(v_new, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION bump_messages_bought(UUID, INT) TO service_role;
