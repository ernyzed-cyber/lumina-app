/**
 * Confetti — CSS-only celebration burst.
 *
 * 32 частицы с randomized колорами/positions/durations.
 * Активируется через prop `active`. Сам себя НЕ скрывает — родитель
 * управляет mount/unmount.
 *
 * Не зависит от framer-motion (pure CSS keyframes), легче.
 */
import { useMemo } from 'react';
import s from './Confetti.module.css';

interface Props {
  active: boolean;
  count?: number;
}

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e'];

export function Confetti({ active, count = 32 }: Props) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.6 + Math.random() * 1.4,
      color: COLORS[i % COLORS.length],
      rot: Math.random() * 360,
      drift: (Math.random() - 0.5) * 200,
      size: 6 + Math.random() * 8,
    }));
  }, [count]);

  if (!active) return null;

  return (
    <div className={s.root} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={s.particle}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            ['--rot' as string]: `${p.rot}deg`,
            ['--drift' as string]: `${p.drift}px`,
            ['--duration' as string]: `${p.duration}s`,
            ['--delay' as string]: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
