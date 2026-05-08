/**
 * AuroraField — full-screen "northern lights" backdrop.
 *
 * 4 крупных размытых градиентных blob'а (violet / amethyst / pink / magenta)
 * медленно дрейфуют по экрану, деформируясь и пересекаясь. Это даёт
 * ощущение "света её" — кинематографичный, тёплый, не отвлекающий фон.
 *
 * Реализация: Canvas + radial gradients. Каждый blob описывается:
 *   - центр (cx, cy) с медленной траекторией (sum нескольких синусоид)
 *   - radius (пульсирует)
 *   - color (берётся из палитры по step 1..N с интерполяцией)
 *
 * Step-reactive: при смене currentStep палитра плавно мигрирует
 * от violet (step 1) к hot pink (step N).
 *
 * Performance:
 *   • requestAnimationFrame loop
 *   • dpr-aware
 *   • pause на document.hidden
 *   • prefers-reduced-motion → static frame
 *   • blur в Canvas через layered radial-gradients (без filter:blur, чтобы не тормозило)
 */
import { useEffect, useRef } from 'react';
import s from './AuroraField.module.css';

export type AuroraPalette = [string, string, string, string];

interface Props {
  currentStep?: number;
  totalSteps?: number;
  palette?: AuroraPalette;
}

interface Blob {
  /** базовый центр в нормализованных координатах (0..1) */
  baseX: number;
  baseY: number;
  /** амплитуды дрейфа */
  ampX: number;
  ampY: number;
  /** скорости (rad/sec) */
  freqX: number;
  freqY: number;
  /** фазы */
  phaseX: number;
  phaseY: number;
  /** базовый радиус в долях min(width,height) */
  baseRadius: number;
  /** пульсация радиуса */
  pulseAmp: number;
  pulseFreq: number;
  pulsePhase: number;
  /** цвет — индекс пары [primary,accent] из STEP_PALETTES */
  colorIdx: 0 | 1 | 2 | 3;
}

const STEP_PALETTES = [
  // Каждая палитра — 4 цвета для 4 blob'ов
  // Step 1 (violet)
  [
    'rgba(139, 92, 246, 0.55)',   // violet
    'rgba(167, 139, 250, 0.45)',  // light violet
    'rgba(124, 58, 237, 0.5)',    // deep violet
    'rgba(196, 181, 253, 0.4)',   // soft lavender
  ],
  // Step 2 (amethyst → pink)
  [
    'rgba(168, 85, 247, 0.55)',
    'rgba(192, 132, 252, 0.45)',
    'rgba(217, 70, 239, 0.5)',
    'rgba(232, 121, 249, 0.4)',
  ],
  // Step 3 (orchid)
  [
    'rgba(217, 70, 239, 0.55)',
    'rgba(232, 121, 249, 0.45)',
    'rgba(236, 72, 153, 0.5)',
    'rgba(244, 114, 182, 0.4)',
  ],
  // Step 4 (rose-pink)
  [
    'rgba(236, 72, 153, 0.55)',
    'rgba(244, 114, 182, 0.45)',
    'rgba(219, 39, 119, 0.5)',
    'rgba(251, 113, 133, 0.4)',
  ],
  // Step 5 (hot pink + warm magenta)
  [
    'rgba(236, 72, 153, 0.6)',
    'rgba(251, 113, 133, 0.5)',
    'rgba(219, 39, 119, 0.55)',
    'rgba(244, 114, 182, 0.45)',
  ],
];

function parseRgba(s: string): [number, number, number, number] {
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!m) return [255, 255, 255, 1];
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] !== undefined ? Number(m[4]) : 1];
}

function lerpRgba(a: string, b: string, t: number): string {
  const [r1, g1, b1, a1] = parseRgba(a);
  const [r2, g2, b2, a2] = parseRgba(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  const al = a1 + (a2 - a1) * t;
  return `rgba(${r}, ${g}, ${bl}, ${al})`;
}

export function AuroraField({ currentStep = 1, totalSteps = 5, palette }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blobsRef = useRef<Blob[]>([]);
  const stepRef = useRef({ from: currentStep, to: currentStep, t: 1 });
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());

  /* ── Step transition ── */
  useEffect(() => {
    if (stepRef.current.to !== currentStep) {
      stepRef.current.from = stepRef.current.to;
      stepRef.current.to = currentStep;
      stepRef.current.t = 0;
    }
  }, [currentStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = window.devicePixelRatio || 1;

    let width = 0;
    let height = 0;

    /* ── Init blobs (4 шт., рассыпаны по экрану) ── */
    if (blobsRef.current.length === 0) {
      blobsRef.current = [
        {
          baseX: 0.22, baseY: 0.28,
          ampX: 0.12, ampY: 0.10,
          freqX: 0.00018, freqY: 0.00022,
          phaseX: 0, phaseY: Math.PI / 3,
          baseRadius: 0.55, pulseAmp: 0.08, pulseFreq: 0.0004, pulsePhase: 0,
          colorIdx: 0,
        },
        {
          baseX: 0.78, baseY: 0.32,
          ampX: 0.10, ampY: 0.14,
          freqX: 0.00025, freqY: 0.00017,
          phaseX: Math.PI / 2, phaseY: Math.PI,
          baseRadius: 0.50, pulseAmp: 0.07, pulseFreq: 0.00045, pulsePhase: Math.PI / 2,
          colorIdx: 1,
        },
        {
          baseX: 0.30, baseY: 0.76,
          ampX: 0.14, ampY: 0.10,
          freqX: 0.00021, freqY: 0.00028,
          phaseX: Math.PI, phaseY: Math.PI / 4,
          baseRadius: 0.48, pulseAmp: 0.09, pulseFreq: 0.00038, pulsePhase: Math.PI,
          colorIdx: 2,
        },
        {
          baseX: 0.74, baseY: 0.74,
          ampX: 0.11, ampY: 0.13,
          freqX: 0.00023, freqY: 0.00019,
          phaseX: Math.PI * 1.5, phaseY: Math.PI * 1.7,
          baseRadius: 0.52, pulseAmp: 0.08, pulseFreq: 0.00042, pulsePhase: Math.PI * 1.5,
          colorIdx: 3,
        },
      ];
    }

    /* ── Resize ── */
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── Draw loop ── */
    const draw = (now: number) => {
      const elapsed = now - startRef.current;

      /* step transition (~600ms) */
      if (stepRef.current.t < 1) {
        stepRef.current.t = Math.min(1, stepRef.current.t + 1 / 36);
      }

      let activePalette: AuroraPalette;
      let nextPalette: AuroraPalette;
      let palFrac = 0;

      if (palette) {
        activePalette = palette;
        nextPalette = palette;
      } else {
        // Дополнительная нормализация по totalSteps (если шагов меньше 5,
        // равномерно растягиваем палитру по [0..STEP_PALETTES.length-1])
        const normFrom = ((stepRef.current.from - 1) / Math.max(1, totalSteps - 1)) * (STEP_PALETTES.length - 1);
        const normTo = ((stepRef.current.to - 1) / Math.max(1, totalSteps - 1)) * (STEP_PALETTES.length - 1);
        const stepNorm = normFrom + (normTo - normFrom) * stepRef.current.t;
        const palIdx = Math.floor(stepNorm);
        palFrac = stepNorm - palIdx;
        activePalette = STEP_PALETTES[Math.max(0, Math.min(STEP_PALETTES.length - 1, palIdx))] as AuroraPalette;
        nextPalette = STEP_PALETTES[Math.max(0, Math.min(STEP_PALETTES.length - 1, palIdx + 1))] as AuroraPalette;
      }

      ctx.clearRect(0, 0, width, height);

      /* Композитим в screen-режиме — цвета аддитивно складываются,
         даёт "сияющий" эффект как у северного сияния */
      ctx.globalCompositeOperation = 'lighter';

      const minDim = Math.min(width, height);

      for (const b of blobsRef.current) {
        const cx = (b.baseX + Math.sin(elapsed * b.freqX + b.phaseX) * b.ampX) * width;
        const cy = (b.baseY + Math.cos(elapsed * b.freqY + b.phaseY) * b.ampY) * height;
        const radius = (b.baseRadius + Math.sin(elapsed * b.pulseFreq + b.pulsePhase) * b.pulseAmp) * minDim;

        const colorA = activePalette[b.colorIdx];
        const colorB = nextPalette[b.colorIdx];
        const color = lerpRgba(colorA, colorB, palFrac);

        // Преобразуем в transparent для outer stop
        const transparent = color.replace(/rgba?\(([^)]+)\)/, (_, inside) => {
          const parts = inside.split(',').map((x: string) => x.trim());
          return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0)`;
        });

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(0.45, lerpRgba(color, transparent, 0.6));
        grad.addColorStop(1, transparent);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      if (!reduced) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    /* Pause when hidden */
    const onVis = () => {
      if (document.hidden && rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!document.hidden && rafRef.current === null && !reduced) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', onVis);

    if (reduced) {
      draw(performance.now());
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [palette, totalSteps]);

  return <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />;
}
