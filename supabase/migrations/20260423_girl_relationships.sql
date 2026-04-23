-- Per-pair relationship state (intimacy, days together, etc.)
CREATE TABLE IF NOT EXISTS girl_relationships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id TEXT NOT NULL,
  intimacy_level NUMERIC(3,1) NOT NULL DEFAULT 0.0 CHECK (intimacy_level >= 0 AND intimacy_level <= 10),
  intimacy_last_recomputed_at TIMESTAMPTZ,
  pending_scene_marker TEXT,
  pending_scene_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, girl_id)
);

CREATE INDEX IF NOT EXISTS idx_girl_relationships_user ON girl_relationships(user_id);

ALTER TABLE girl_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own relationship" ON girl_relationships;
CREATE POLICY "read own relationship" ON girl_relationships
  FOR SELECT USING (auth.uid() = user_id);

-- writes are done only by service-role from edge functions
DROP POLICY IF EXISTS "service writes" ON girl_relationships;
CREATE POLICY "service writes" ON girl_relationships
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
