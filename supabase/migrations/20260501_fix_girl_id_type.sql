-- Fix: girl_id columns in user_facts and girl_self_facts were created as uuid
-- but girl_personas.id is text (e.g. "alina", "lera").
-- Cast both columns to text so closeSession upserts stop failing.

ALTER TABLE public.user_facts
  ALTER COLUMN girl_id TYPE text USING girl_id::text;

ALTER TABLE public.girl_self_facts
  ALTER COLUMN girl_id TYPE text USING girl_id::text;
