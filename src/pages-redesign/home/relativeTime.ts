type Translator = (key: string, params?: Record<string, string | number>) => string;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(timestamp: number, now: number, t: Translator): string {
  const diff = Math.max(0, now - timestamp);

  if (diff < MINUTE) {
    return t('landing.redesign.home.relativeTime.justNow');
  }

  if (diff < HOUR) {
    return t('landing.redesign.home.relativeTime.minutesAgo', {
      n: Math.max(1, Math.round(diff / MINUTE)),
    });
  }

  if (diff < DAY) {
    return t('landing.redesign.home.relativeTime.hoursAgo', {
      n: Math.max(1, Math.round(diff / HOUR)),
    });
  }

  if (diff < WEEK) {
    return t('landing.redesign.home.relativeTime.daysAgo', {
      n: Math.max(1, Math.round(diff / DAY)),
    });
  }

  return t('landing.redesign.home.relativeTime.weeksAgo', {
    n: Math.max(1, Math.round(diff / WEEK)),
  });
}
