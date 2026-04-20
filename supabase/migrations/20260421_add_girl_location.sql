-- Step 1: Humanization — add timezone and city to girl_personas
-- Применить в Supabase Dashboard → SQL Editor.

ALTER TABLE public.girl_personas
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Moscow',
  ADD COLUMN IF NOT EXISTS city     text NOT NULL DEFAULT 'Москва';

-- Алина — Москва (значения по умолчанию и так её накрывают, но явно для ясности).
UPDATE public.girl_personas
SET timezone = 'Europe/Moscow',
    city     = 'Москва'
WHERE id = 'alina';
