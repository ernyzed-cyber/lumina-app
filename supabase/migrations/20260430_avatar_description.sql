-- Adds an AI-generated description of the user's avatar so personas can
-- accurately reference what the user looks like without hallucinating.
-- Filled by the `describe-avatar` edge function once after a new avatar is set
-- (and cleared when the avatar changes / is removed).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_description TEXT,
  ADD COLUMN IF NOT EXISTS avatar_described_url TEXT;

COMMENT ON COLUMN profiles.avatar_description IS
  'Short AI-generated description of the user''s current avatar (appearance + context). Set by describe-avatar edge function.';
COMMENT ON COLUMN profiles.avatar_described_url IS
  'The avatar_url that was described. If avatar_url changes and this differs, the description is stale and must be regenerated.';
