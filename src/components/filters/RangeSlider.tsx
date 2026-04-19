/* ═══════════════════════════════════════════
   LUMINA — Dual-thumb range slider
   ═══════════════════════════════════════════ */

import { useCallback, useRef, useEffect, useState } from 'react';
import styles from './RangeSlider.module.css';

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (v: number) => string;
}

export default function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = String,
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);

  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const leftPct = pct(value[0]);
  const rightPct = pct(value[1]);

  const valueFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return min;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = min + ratio * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step],
  );

  const handlePointerDown = useCallback(
    (thumb: 'min' | 'max') => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(thumb);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      const v = valueFromX(e.clientX);
      if (dragging === 'min') {
        onChange([Math.min(v, value[1] - step), value[1]]);
      } else {
        onChange([value[0], Math.max(v, value[0] + step)]);
      }
    },
    [dragging, value, onChange, valueFromX, step],
  );

  const handlePointerUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.values}>
          {formatValue(value[0])} — {formatValue(value[1])}
        </span>
      </div>
      <div className={styles.track} ref={trackRef}>
        <div className={styles.trackBg} />
        <div
          className={styles.trackFill}
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
        <div
          className={`${styles.thumb} ${dragging === 'min' ? styles.active : ''}`}
          style={{ left: `${leftPct}%` }}
          onPointerDown={handlePointerDown('min')}
          role="slider"
          aria-label={`${label} minimum`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value[0]}
          tabIndex={0}
        />
        <div
          className={`${styles.thumb} ${dragging === 'max' ? styles.active : ''}`}
          style={{ left: `${rightPct}%` }}
          onPointerDown={handlePointerDown('max')}
          role="slider"
          aria-label={`${label} maximum`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value[1]}
          tabIndex={0}
        />
      </div>
    </div>
  );
}

/* ── Single-value slider (for distance) ── */

interface SingleSliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (v: number) => string;
}

export function SingleSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = String,
}: SingleSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.values}>{formatValue(value)}</span>
      </div>
      <input
        type="range"
        className={styles.nativeSlider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        aria-label={label}
      />
    </div>
  );
}
