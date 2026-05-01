-- Adds AI-generated appearance description for each AI girl persona.
-- Filled once per girl by calling describe-avatar in admin mode.
-- Used by chat-ai to inject a YOUR APPEARANCE block so the persona
-- can honestly answer questions about what she looks like.

ALTER TABLE public.girl_personas
  ADD COLUMN IF NOT EXISTS avatar_description TEXT;

COMMENT ON COLUMN public.girl_personas.avatar_description IS
  'Short AI-generated description of the girl''s appearance based on her main photo. Set once via describe-avatar (admin mode).';
