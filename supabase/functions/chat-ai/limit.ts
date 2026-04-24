export interface LimitSnapshot {
  messages_used_today: number;
  messages_bought_today: number;
  messages_reset_at: string | null;
  tz_offset_minutes: number;
}

export const BASE_DAILY_LIMIT = 100;

export interface LimitDecision {
  allowed: boolean;
  reset_needed: boolean;
  remaining: number;
  quota: number;
}

export function decideLimit(snap: LimitSnapshot, now: Date): LimitDecision {
  const reset_needed =
    !snap.messages_reset_at ||
    new Date(snap.messages_reset_at).getTime() <= now.getTime();
  const used = reset_needed ? 0 : snap.messages_used_today;
  const bought = reset_needed ? 0 : snap.messages_bought_today;
  const quota = BASE_DAILY_LIMIT + bought;
  const remaining = Math.max(0, quota - used);
  return { allowed: used < quota, reset_needed, remaining, quota };
}

export function nextResetAt(tzOffsetMinutes: number, now: Date): string {
  // Shift 'now' into local time, find next local midnight, shift back to UTC.
  const localMs = now.getTime() + tzOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const nextLocalMidnightMs = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  const utcMs = nextLocalMidnightMs - tzOffsetMinutes * 60_000;
  return new Date(utcMs).toISOString();
}
