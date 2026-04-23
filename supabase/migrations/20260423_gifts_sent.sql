CREATE TABLE IF NOT EXISTS gifts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id TEXT NOT NULL,
  gift_id TEXT NOT NULL REFERENCES gift_catalog(id),
  stars_spent INT NOT NULL CHECK (stars_spent > 0),
  memory_id UUID,                                 -- FK will be added once memories table confirmed
  intimacy_delta_applied NUMERIC(3,1) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gifts_sent_user_girl ON gifts_sent(user_id, girl_id, created_at DESC);

ALTER TABLE gifts_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own gifts" ON gifts_sent;
CREATE POLICY "read own gifts" ON gifts_sent
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service writes gifts" ON gifts_sent;
CREATE POLICY "service writes gifts" ON gifts_sent
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
