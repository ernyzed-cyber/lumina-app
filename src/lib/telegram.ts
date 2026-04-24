/* ──────────────────────────────────────────────
   Thin Telegram WebApp helper
   Only wraps haptic feedback — payment is handled
   via CryptoCloud (window.open), not Telegram Stars.
   ────────────────────────────────────────────── */

type HapticType = 'success' | 'error' | 'warning';

export const tg = {
  haptic(type: HapticType = 'success') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    } catch {
      // Not running inside Telegram WebApp — silently ignore
    }
  },
};
