-- supabase/migrations/20260424_taken_girls_fn.sql
--
-- Проблема: VIEW taken_girls не работает — PostgreSQL по умолчанию применяет
-- RLS нижележащей таблицы assignments (SECURITY INVOKER).
-- User B запрашивает view → RLS ограничивает до его строк (пусто) → Алина видна всем.
--
-- Решение: SECURITY DEFINER функция выполняется от имени postgres (bypasses RLS).
-- Возвращает ТОЛЬКО girl_id занятых девушек — user_id не раскрывается.

DROP VIEW IF EXISTS public.taken_girls;

CREATE OR REPLACE FUNCTION public.get_taken_girl_ids()
RETURNS TABLE(girl_id text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.girl_id
  FROM public.assignments a
  WHERE a.released_at IS NULL;
$$;

-- Разрешить вызов любому авторизованному пользователю
GRANT EXECUTE ON FUNCTION public.get_taken_girl_ids() TO authenticated;
