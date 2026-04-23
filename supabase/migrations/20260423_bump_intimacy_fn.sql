CREATE OR REPLACE FUNCTION bump_intimacy(
  p_user_id UUID,
  p_girl_id TEXT,
  p_delta NUMERIC,
  p_scene_marker TEXT DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new NUMERIC;
  v_expires TIMESTAMPTZ;
BEGIN
  v_expires := CASE WHEN p_scene_marker IS NULL THEN NULL ELSE now() + interval '1 day' END;

  INSERT INTO girl_relationships (user_id, girl_id, intimacy_level, intimacy_last_recomputed_at, pending_scene_marker, pending_scene_expires_at)
  VALUES (p_user_id, p_girl_id, LEAST(10, GREATEST(0, p_delta)), now(), p_scene_marker, v_expires)
  ON CONFLICT (user_id, girl_id)
  DO UPDATE SET
    intimacy_level = LEAST(10, GREATEST(0, girl_relationships.intimacy_level + EXCLUDED.intimacy_level)),
    intimacy_last_recomputed_at = now(),
    pending_scene_marker = COALESCE(EXCLUDED.pending_scene_marker, girl_relationships.pending_scene_marker),
    pending_scene_expires_at = COALESCE(EXCLUDED.pending_scene_expires_at, girl_relationships.pending_scene_expires_at),
    updated_at = now()
  RETURNING intimacy_level INTO v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION bump_intimacy(UUID, TEXT, NUMERIC, TEXT) TO service_role;
