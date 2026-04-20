-- Proactive messaging: pg_cron тик раз в 15 минут дёргает Edge Function proactive-tick.
--
-- Требует расширений pg_cron и pg_net (оба есть в Supabase по умолчанию).
-- Их нужно включить руками в Dashboard → Database → Extensions, если ещё не включены.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- -- Бэкфилл: для всех существующих пар (user, girl) из messages/memories создаём строку
-- -- в user_girl_state, чтобы cron их увидел. Иначе ролл будет идти только на пары,
-- -- которые переписывались ПОСЛЕ шага 2.
insert into public.user_girl_state (user_id, girl_id, last_user_message_at, last_assistant_message_at)
select
  m.user_id,
  m.girl_id,
  max(case when m.role = 'user' then m.created_at end) as last_user,
  max(case when m.role = 'assistant' then m.created_at end) as last_assistant
from public.messages m
where m.user_id is not null and m.girl_id is not null
group by m.user_id, m.girl_id
on conflict (user_id, girl_id) do update set
  last_user_message_at = coalesce(public.user_girl_state.last_user_message_at, excluded.last_user_message_at),
  last_assistant_message_at = coalesce(public.user_girl_state.last_assistant_message_at, excluded.last_assistant_message_at);

-- -- Таблица для хранения конфигурации cron: URL Edge Function и опциональный секрет.
-- -- Использовать так: вставить одну строку с project-специфичными значениями,
-- -- задать supabase_url (https://<project>.supabase.co/functions/v1/proactive-tick)
-- -- и service_role_key (из Project Settings → API).
-- --
-- -- Хранить ключ в публичной таблице не очень, но альтернатива — Vault, где нужна
-- -- отдельная настройка. Таблица создаётся без RLS доступа для обычных пользователей.
create table if not exists public.cron_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

revoke all on public.cron_config from anon, authenticated;

-- -- Функция-обёртка: читает конфиг и вызывает Edge Function через pg_net.
create or replace function public.tick_proactive()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_service_key text;
  v_proactive_secret text;
  v_headers jsonb;
begin
  select value into v_url from public.cron_config where key = 'proactive_tick_url';
  select value into v_service_key from public.cron_config where key = 'service_role_key';
  select value into v_proactive_secret from public.cron_config where key = 'proactive_secret';

  if v_url is null or v_service_key is null then
    raise notice 'tick_proactive: proactive_tick_url or service_role_key not configured';
    return;
  end if;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_key
  );
  if v_proactive_secret is not null then
    v_headers := v_headers || jsonb_build_object('x-proactive-secret', v_proactive_secret);
  end if;

  perform net.http_post(
    url := v_url,
    headers := v_headers,
    body := '{}'::jsonb
  );
end;
$$;

-- -- Планируем cron: каждые 15 минут.
-- -- Если job с таким именем уже есть — обновляем, иначе создаём.
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'lumina_proactive_tick';
  if v_jobid is not null then
    perform cron.unschedule(v_jobid);
  end if;
  perform cron.schedule(
    'lumina_proactive_tick',
    '*/15 * * * *',
    $cron$ select public.tick_proactive(); $cron$
  );
end $$;
