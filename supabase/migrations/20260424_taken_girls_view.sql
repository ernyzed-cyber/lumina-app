-- supabase/migrations/20260424_taken_girls_view.sql
--
-- Проблема: RLS на таблице assignments разрешает читать ТОЛЬКО свои строки.
-- Из-за этого второй аккаунт не видит занятых девушек → они показываются в ленте.
--
-- Решение: публичный view taken_girls — возвращает только girl_id без user_id.
-- Не нарушает приватность: никто не знает, кто именно занял девушку.

CREATE OR REPLACE VIEW public.taken_girls AS
  SELECT girl_id
  FROM public.assignments
  WHERE released_at IS NULL;

-- Разрешить любому авторизованному пользователю читать view
GRANT SELECT ON public.taken_girls TO authenticated;
