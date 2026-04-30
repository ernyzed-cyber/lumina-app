-- Per-session memory bookkeeping for chat-ai.
--
-- session_started_at — момент, когда юзер написал первое сообщение в текущей
--   "встрече". Используется как нижняя граница окна при закрытии сессии:
--   chat-ai читает messages с created_at >= session_started_at, скармливает
--   Grok-экстрактору и пишет user_facts / girl_self_facts / memories.
--
-- last_journal_at — когда последний раз закрывали сессию и писали в memories.
--   Нужно, чтобы можно было увидеть/диагностировать, что journal реально
--   обновляется. Не участвует в логике решений (та смотрит на last_user_message_at).
--
-- Триггер закрытия сессии: gap = now - last_user_message_at >= 30 минут И
-- session_started_at IS NOT NULL И в окне [session_started_at, now) есть >= 2
-- сообщений. Срабатывает inline в chat-ai через EdgeRuntime.waitUntil.

alter table public.user_girl_state
  add column if not exists session_started_at timestamptz,
  add column if not exists last_journal_at timestamptz;
