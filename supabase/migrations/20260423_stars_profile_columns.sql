-- Add monetization columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stars_balance INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_used_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_bought_today INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tz_offset_minutes INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_messages_reset_at ON profiles(messages_reset_at);

COMMENT ON COLUMN profiles.stars_balance IS 'Current Stars balance (non-negative, managed via stars_ledger)';
COMMENT ON COLUMN profiles.messages_used_today IS 'Messages sent today (resets when messages_reset_at < now())';
COMMENT ON COLUMN profiles.messages_bought_today IS 'Additional message quota bought today with Stars';
COMMENT ON COLUMN profiles.tz_offset_minutes IS 'Client-reported TZ offset for local midnight reset';
