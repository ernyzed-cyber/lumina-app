ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS gift_ref TEXT,
  ADD COLUMN IF NOT EXISTS intimacy_weight NUMERIC(3,1) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'summary';

CREATE INDEX IF NOT EXISTS idx_memories_gift_lookup
  ON memories(user_id, girl_id, intimacy_weight DESC)
  WHERE gift_ref IS NOT NULL;

COMMENT ON COLUMN memories.gift_ref IS 'gift_catalog.id if this memory was created from a gift';
COMMENT ON COLUMN memories.intimacy_weight IS 'Higher = more likely to be referenced in chat-ai prompt';
COMMENT ON COLUMN memories.kind IS 'summary | gift | scene | milestone';
