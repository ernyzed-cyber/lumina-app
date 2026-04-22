-- supabase/migrations/20260424_reaper_cron.sql
-- pg_cron каждые 6 часов вызывает reaper Edge Function.

SELECT cron.schedule(
  'lumina-reaper',
  '0 */6 * * *',  -- каждые 6 часов
  $$
    SELECT net.http_post(
      url     := 'https://rfmcpnpdqbhecwtodyaz.supabase.co/functions/v1/reaper',
      headers := '{"Content-Type":"application/json","x-reaper-secret":"' ||
                 current_setting('app.reaper_secret', true) || '"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);
