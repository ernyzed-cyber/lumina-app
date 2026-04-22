// supabase/functions/reaper/index.ts
// Освобождает assignments где юзер молчал > 7 дней.
// Запускается pg_cron каждые 6 часов.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-reaper-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INACTIVITY_DAYS = 7;

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // Защита секретом
  const expected = Deno.env.get('REAPER_SECRET');
  if (expected) {
    const got = req.headers.get('x-reaper-secret');
    if (got !== expected) return json(401, { error: 'unauthorized' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase    = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 3600 * 1000).toISOString();

  // Находим активные assignments где юзер не писал > 7 дней.
  // Смотрим last_user_message_at из user_girl_state.
  // Если записи в user_girl_state нет — смотрим started_at в assignments.
  const { data: stale, error: staleErr } = await supabase
    .from('assignments')
    .select(`
      id, user_id, girl_id, started_at,
      user_girl_state!left(last_user_message_at)
    `)
    .is('released_at', null);

  if (staleErr) {
    console.error('[reaper] query error:', staleErr);
    return json(500, { error: staleErr.message });
  }

  const toRelease: { id: number; user_id: string; girl_id: string }[] = [];

  for (const row of (stale ?? [])) {
    // Последнее сообщение юзера — из user_girl_state или started_at.
    const state = Array.isArray(row.user_girl_state)
      ? row.user_girl_state[0]
      : row.user_girl_state;
    const lastActivity: string = state?.last_user_message_at ?? row.started_at;

    if (lastActivity < cutoff) {
      toRelease.push({ id: row.id, user_id: row.user_id, girl_id: row.girl_id });
    }
  }

  if (toRelease.length === 0) {
    console.log('[reaper] no stale assignments');
    return json(200, { released: 0 });
  }

  // Освобождаем assignments.
  const ids = toRelease.map(r => r.id);
  const { error: updateErr } = await supabase
    .from('assignments')
    .update({ released_at: new Date().toISOString(), release_reason: 'reaper_7d' })
    .in('id', ids);

  if (updateErr) {
    console.error('[reaper] update error:', updateErr);
    return json(500, { error: updateErr.message });
  }

  // Отправляем уведомления юзерам что девушка ушла.
  for (const r of toRelease) {
    try {
      await supabase.from('notifications').insert({
        user_id: r.user_id,
        type: 'girl_left',
        data: { girl_id: r.girl_id, reason: 'inactivity_7d' },
        is_read: false,
      });
    } catch (e) {
      console.warn('[reaper] notification failed for user', r.user_id, e);
    }
  }

  // Если у кого-то в waitlist теперь есть свободные девушки — уведомляем первых в очереди.
  const freedGirlIds = toRelease.map(r => r.girl_id);
  console.log('[reaper] freed girls:', freedGirlIds);

  // Notify top of waitlist (up to freedGirlIds.length users)
  const { data: waiters } = await supabase
    .from('waitlist')
    .select('user_id')
    .is('notified_at', null)
    .order('joined_at', { ascending: true })
    .limit(toRelease.length);

  for (const waiter of (waiters ?? [])) {
    await supabase.from('waitlist').update({ notified_at: new Date().toISOString() }).eq('user_id', waiter.user_id);
    await supabase.from('notifications').insert({
      user_id: waiter.user_id,
      type: 'waitlist_ready',
      data: { message: 'Девушка ждёт тебя!' },
      is_read: false,
    }).catch(() => {});
  }

  console.log(`[reaper] released ${toRelease.length} assignments`);
  return json(200, { released: toRelease.length, girls: freedGirlIds });
});
