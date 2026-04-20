-- Per-pair (user, girl) runtime state: online/typing, last timestamps, mood.
-- Использовать в паре с Edge Function chat-ai + клиентским realtime.

create table if not exists public.user_girl_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  girl_id text not null,
  -- Временные метки активности.
  last_user_message_at timestamptz,
  last_assistant_message_at timestamptz,
  last_proactive_at timestamptz,
  -- Отложенный проактивный тик (когда следующий раз кидать кубик).
  proactive_roll_at timestamptz,
  -- Настроение 0..100, влияет на длину/тон/готовность писать первой.
  mood smallint not null default 50,
  -- Визуальный статус: offline | online | typing. Клиент показывает его над чатом.
  status text not null default 'offline' check (status in ('offline','online','typing')),
  -- До какого момента держать текущий статус. По истечении — offline.
  status_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, girl_id)
);

create index if not exists user_girl_state_status_until_idx
  on public.user_girl_state (status_until)
  where status <> 'offline';

create index if not exists user_girl_state_proactive_idx
  on public.user_girl_state (proactive_roll_at)
  where proactive_roll_at is not null;

alter table public.user_girl_state enable row level security;

-- Юзер читает только свои пары. Писать — только сервер (service_role).
drop policy if exists "user_girl_state_select_own" on public.user_girl_state;
create policy "user_girl_state_select_own"
  on public.user_girl_state
  for select
  using (auth.uid() = user_id);

-- Realtime: публикуем таблицу, чтобы клиент подписывался на изменения статуса.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_girl_state'
  ) then
    execute 'alter publication supabase_realtime add table public.user_girl_state';
  end if;
end $$;
