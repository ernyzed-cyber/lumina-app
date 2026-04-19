/**
 * Форматирование даты в русской локали
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60000) return 'только что';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Форматирование времени HH:MM
 */
export function getTime(date?: Date): string {
  const d = date || new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * XSS-safe HTML escaping
 */
export function escHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Promise-based delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Генерация ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Валидация email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Проверка силы пароля
 */
export function getPasswordStrength(password: string): {
  score: number;
  pct: string;
  color: string;
  text: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { score: 0, pct: '0%', color: 'transparent', text: '' },
    { score: 1, pct: '30%', color: '#F87171', text: 'Weak' },
    { score: 2, pct: '55%', color: '#FBBF24', text: 'Fair' },
    { score: 3, pct: '80%', color: '#A78BFA', text: 'Good' },
    { score: 4, pct: '100%', color: '#34D399', text: 'Strong' },
  ];

  return levels[score];
}

/**
 * localStorage с префиксом lumina_
 */
export const storage = {
  save(key: string, value: unknown): void {
    try {
      localStorage.setItem(`lumina_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage error:', e);
    }
  },
  load<T>(key: string, fallback: T | null = null): T | null {
    try {
      const data = localStorage.getItem(`lumina_${key}`);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(`lumina_${key}`);
    } catch { /* ignore */ }
  },
};

/**
 * Fetch с retry и таймаутом
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      if (!navigator.onLine) throw new Error('Нет подключения к интернету');
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
