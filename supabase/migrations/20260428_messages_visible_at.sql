-- visible_at: момент, когда сообщение становится видимым клиенту.
-- Используется для иллюзии "она печатает / отвечает позже":
-- assistant-сообщения пишутся в БД сразу, но visible_at = now() + ignoreMs+onlineMs+typingMs.
-- loadMessages фильтрует по visible_at <= now(), поэтому reload не спойлерит ответ.
--
-- DEFAULT now() гарантирует, что:
--   1. Все существующие строки получат visible_at = now() и останутся видимыми.
--   2. Любая запись без явного visible_at (юзерские сообщения, proactive-tick) видна сразу.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS visible_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Индекс для быстрого фильтра при loadMessages (user_id + girl_id + visible_at).
CREATE INDEX IF NOT EXISTS messages_user_girl_visible_idx
  ON public.messages (user_id, girl_id, visible_at);

-- Backfill (на всякий случай, если у кого-то NULL'ы остались — DEFAULT не применился).
UPDATE public.messages SET visible_at = created_at WHERE visible_at IS NULL;
