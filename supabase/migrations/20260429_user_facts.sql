-- Two-tier memory: user_facts + girl_self_facts.
--
-- user_facts: структурированные факты, которые ЮЗЕР сказал о себе
-- (имя, работа, питомцы, важные люди, события). UPSERT по (user_id, girl_id, key, value):
-- если факт уже есть — обновляем last_seen_at, не плодим строки. Противоречия
-- (pet=кот → pet=собака) сохраняются обе строки — persona сама разрулит.
--
-- girl_self_facts: то, что persona сама придумала о СЕБЕ в разговоре с этим юзером
-- (имя сестры, любимый фильм, где училась). UNIQUE по (user_id, girl_id, key)
-- БЕЗ value — первая записанная версия фиксируется навсегда (ON CONFLICT DO NOTHING).
-- Защищает от дрейфа: если LLM позже скажет другое — игнорируем, в промпт уйдёт
-- первоначальная версия. Источник истины для биографии — system_prompt в girl_personas,
-- self_facts только дополняют конкретными сущностями.

CREATE TABLE IF NOT EXISTS public.user_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  confidence numeric(3,2) NOT NULL DEFAULT 1.0,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_facts_unique UNIQUE (user_id, girl_id, key, value)
);

CREATE INDEX IF NOT EXISTS user_facts_lookup_idx
  ON public.user_facts (user_id, girl_id, last_seen_at DESC);

COMMENT ON TABLE public.user_facts IS 'Structured facts the USER told about himself. Loaded into chat-ai prompt as "WHAT YOU KNOW ABOUT HIM".';
COMMENT ON COLUMN public.user_facts.key IS 'name | job | pet | partner | birthday | city | hobby | event | etc.';
COMMENT ON COLUMN public.user_facts.confidence IS 'Future TTL/decay support; not used in MVP.';

ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_facts_select_own ON public.user_facts
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS; no INSERT/UPDATE policy for users (only edge writes).

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.girl_self_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT girl_self_facts_unique UNIQUE (user_id, girl_id, key)
);

CREATE INDEX IF NOT EXISTS girl_self_facts_lookup_idx
  ON public.girl_self_facts (user_id, girl_id);

COMMENT ON TABLE public.girl_self_facts IS 'Facts the PERSONA invented about herself when chatting with this user. Loaded as "WHAT YOU TOLD HIM ABOUT YOURSELF (stay consistent!)". UNIQUE on (user,girl,key) so first version is locked — protects against LLM drift across sessions.';
COMMENT ON COLUMN public.girl_self_facts.key IS 'sister | favorite_movie | studied_at | childhood_pet | etc. Concrete entities only, not personality traits.';

ALTER TABLE public.girl_self_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY girl_self_facts_select_own ON public.girl_self_facts
  FOR SELECT USING (auth.uid() = user_id);
