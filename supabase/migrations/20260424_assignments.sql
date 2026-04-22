-- supabase/migrations/20260424_assignments.sql
-- Таблица 1:1 назначений "юзер <-> девушка"
CREATE TABLE IF NOT EXISTS public.assignments (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  girl_id       text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  released_at   timestamptz,              -- NULL = активна
  release_reason text,                   -- 'reaper_7d' | 'user_released' | 'user_new'
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Ключевое ограничение: одна девушка не может быть у двух юзеров одновременно.
-- Partial unique index — работает только для активных (released_at IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS assignments_girl_active_uniq
  ON public.assignments (girl_id)
  WHERE released_at IS NULL;

-- Один активный assignment на юзера.
CREATE UNIQUE INDEX IF NOT EXISTS assignments_user_active_uniq
  ON public.assignments (user_id)
  WHERE released_at IS NULL;

-- Индекс для быстрого поиска активного assignment юзера.
CREATE INDEX IF NOT EXISTS assignments_user_id_idx ON public.assignments (user_id);

-- Таблица ожидания (когда пул пуст).
CREATE TABLE IF NOT EXISTS public.waitlist (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz              -- когда отправили уведомление
);

-- RLS: включаем на обеих таблицах.
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist   ENABLE ROW LEVEL SECURITY;

-- assignments: юзер видит только свои строки.
CREATE POLICY "assignments_select_own" ON public.assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "assignments_insert_own" ON public.assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Обновление (release) делает только сервис-роль (reaper) или сам юзер.
CREATE POLICY "assignments_update_own" ON public.assignments
  FOR UPDATE USING (auth.uid() = user_id);

-- waitlist: юзер видит только свою строку.
CREATE POLICY "waitlist_select_own" ON public.waitlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "waitlist_insert_own" ON public.waitlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "waitlist_delete_own" ON public.waitlist
  FOR DELETE USING (auth.uid() = user_id);
