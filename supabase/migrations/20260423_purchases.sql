CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                 -- 'telegram_stars'
  provider_payment_id TEXT UNIQUE,        -- telegram's payment_charge_id
  provider_invoice_payload TEXT,          -- custom payload we attached to invoice
  pack_id TEXT NOT NULL,                  -- 'stars_100' | 'stars_500' | 'stars_2000' | 'stars_10000'
  stars_amount INT NOT NULL CHECK (stars_amount > 0),
  fiat_amount NUMERIC(10,2),
  fiat_currency TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status) WHERE status = 'pending';

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own purchases" ON purchases;
CREATE POLICY "read own purchases" ON purchases
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service writes purchases" ON purchases;
CREATE POLICY "service writes purchases" ON purchases
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
