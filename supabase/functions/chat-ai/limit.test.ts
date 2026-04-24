import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { decideLimit, nextResetAt, BASE_DAILY_LIMIT } from './limit.ts';

Deno.test('allows when under base limit and no reset needed', () => {
  const snap = { messages_used_today: 50, messages_bought_today: 0, messages_reset_at: '2099-01-01T00:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r, { allowed: true, reset_needed: false, remaining: 50, quota: 100 });
});

Deno.test('blocks when at base limit and no bought quota', () => {
  const snap = { messages_used_today: 100, messages_bought_today: 0, messages_reset_at: '2099-01-01T00:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.allowed, false);
  assertEquals(r.remaining, 0);
  assertEquals(r.quota, 100);
});

Deno.test('allows when at base but bought quota present', () => {
  const snap = { messages_used_today: 100, messages_bought_today: 100, messages_reset_at: '2099-01-01T00:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.allowed, true);
  assertEquals(r.quota, 200);
  assertEquals(r.remaining, 100);
});

Deno.test('signals reset when messages_reset_at is in the past', () => {
  const snap = { messages_used_today: 100, messages_bought_today: 0, messages_reset_at: '2026-04-22T23:00:00Z', tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.reset_needed, true);
  assertEquals(r.allowed, true); // after reset used=0, quota=100, 0<100 → allowed
});

Deno.test('signals reset when messages_reset_at is null (first-ever call)', () => {
  const snap = { messages_used_today: 0, messages_bought_today: 0, messages_reset_at: null, tz_offset_minutes: 0 };
  const r = decideLimit(snap, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r.reset_needed, true);
});

Deno.test('nextResetAt computes next local midnight in UTC', () => {
  // UTC+3 (180 min). UTC 12:00 = local 15:00. Next local midnight = local 2026-04-24T00:00 = UTC 2026-04-23T21:00.
  const r = nextResetAt(180, new Date('2026-04-23T12:00:00Z'));
  assertEquals(r, '2026-04-23T21:00:00.000Z');
});

Deno.test('nextResetAt when already past local midnight same UTC day', () => {
  // UTC+3. UTC 21:05 = local 00:05 (2026-04-24). Next local midnight = 2026-04-25T00:00 local = 2026-04-24T21:00 UTC.
  const r = nextResetAt(180, new Date('2026-04-23T21:05:00Z'));
  assertEquals(r, '2026-04-24T21:00:00.000Z');
});

// Confirm BASE_DAILY_LIMIT is exported correctly
Deno.test('BASE_DAILY_LIMIT is 100', () => {
  assertEquals(BASE_DAILY_LIMIT, 100);
});
