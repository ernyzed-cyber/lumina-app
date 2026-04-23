CREATE TABLE IF NOT EXISTS stars_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INT NOT NULL,             -- positive = credit, negative = spend
  reason TEXT NOT NULL,           -- e.g. 'purchase:pack_500', 'spend:gift:ring'
  ref_id TEXT,                    -- telegram payment id or gifts_sent.id etc.
  balance_after INT NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stars_ledger_user ON stars_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_stars_ledger_ref ON stars_ledger(reason, ref_id) WHERE ref_id IS NOT NULL;

ALTER TABLE stars_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own ledger" ON stars_ledger;
CREATE POLICY "read own ledger" ON stars_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- Only service_role writes (via edge functions)
DROP POLICY IF EXISTS "service writes ledger" ON stars_ledger;
CREATE POLICY "service writes ledger" ON stars_ledger
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
