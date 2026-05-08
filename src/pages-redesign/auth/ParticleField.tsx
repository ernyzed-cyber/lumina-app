/**
 * ParticleField — Canvas-based "constellation" живой фон.
 *
 * 60 частиц медленно плавают в пределах контейнера, рисуют тонкие линии
 * когда их расстояние < threshold. Mouse-интеракция: частицы около курсора
 * слегка отталкиваются + ярче.
 *
 * Step-reactive: цвет частиц интерполируется по currentStep (1..5)
 * от violet (#8b5cf6) → hot pink (#ec4899). При смене step — burst pulse:
 * все частицы получают небольшой radial impulse на 600ms.
 *
 * Performance:
 *   • requestAnimationFrame loop
 *   • dpr-aware (sharp on retina)
 *   • pause при document.hidden (visibilitychange)
 *   • prefers-reduced-motion: reduce → static snapshot, no rAF
 *
 * Self-contained — никаких deps кроме React.
 */
import { useEffect, useRef } from 'react';
import s from './ParticleField.module.css';

interface Props {
  /** 1..N — определяет цвет частиц (interpolation) */
  currentStep?: number;
  /** Общее число шагов для нормализации */
  totalSteps?: number;
  /** Сколько частиц рисуем */
  count?: number;
  /** Расстояние, на котором две частицы соединяются линией (px) */
  linkDistance?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Multiplier для temporary burst при step change */
  energy: number;
}

/** Палитра по шагам (5 цветов, интерполируем через t∈[0..1]) */
const PALETTE = [
  { r: 139, g: 92, b: 246 },   // step 1: violet
  { r: 167, g: 85, b: 221 },   // step 2: amethyst
  { r: 197, g: 79, b: 196 },   // step 3: orchid
  { r: 226, g: 75, b: 170 },   // step 4: rose-pink
  { r: 236, g: 72, b: 153 },   // step 5: hot pink
];

function lerpColor(t: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (PALETTE.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  const a = PALETTE[i];
  const b = PALETTE[Math.min(i + 1, PALETTE.length - 1)];
  return {
    r: Math.round(a.r + (b.r - a.r) * frac),
    g: Math.round(a.g + (b.g - a.g) * frac),
    b: Math.round(a.b + (b.b - a.b) * frac),
  };
}

export function ParticleField({
  currentStep = 1,
  totalSteps = 5,
  count = 48,
  linkDistance = 120,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });
  const stepRef = useRef({ current: currentStep, target: currentStep, t: 1 });
  const rafRef = useRef<number | null>(null);

  /* ── Sync step changes → trigger burst ── */
  useEffect(() => {
    const prev = stepRef.current.target;
    if (prev !== currentStep) {
      stepRef.current.current = prev;
      stepRef.current.target = currentStep;
      stepRef.current.t = 0;
      // Burst: всем частицам подкинуть energy
      for (const p of particlesRef.current) {
        p.energy = 1;
      }
    }
  }, [currentStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    const dpr = window.devicePixelRatio || 1;

    /* ── Init particles ── */
    const initParticles = () => {
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 2.2,
        energy: 0,
      }));
    };

    /* ── Resize handler ── */
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particlesRef.current.length === 0) {
        initParticles();
      }
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── Mouse tracking ── */
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };
    const onLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);

    /* ── Animation loop ── */
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      /* Step interpolation (0..1 in 600ms) */
      if (stepRef.current.t < 1) {
        stepRef.current.t = Math.min(1, stepRef.current.t + 1 / 36);
      }
      const stepNorm = ((stepRef.current.target - 1) / Math.max(1, totalSteps - 1));
      const color = lerpColor(stepNorm);
      const colorStr = `rgba(${color.r}, ${color.g}, ${color.b}`;

      const ps = particlesRef.current;
      const m = mouseRef.current;

      /* Update positions */
      for (const p of ps) {
        p.x += p.vx * (1 + p.energy * 1.5);
        p.y += p.vy * (1 + p.energy * 1.5);

        /* Wrap edges */
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        /* Mouse repulsion */
        if (m.active) {
          const dx = p.x - m.x;
          const dy = p.y - m.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 14400) {
            const dist = Math.sqrt(dist2) || 1;
            const force = (120 - dist) / 120;
            p.vx += (dx / dist) * force * 0.08;
            p.vy += (dy / dist) * force * 0.08;
          }
        }

        /* Velocity damping */
        p.vx *= 0.985;
        p.vy *= 0.985;

        /* Re-energize если speed упал слишком низко */
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 0.15) {
          p.vx += (Math.random() - 0.5) * 0.15;
          p.vy += (Math.random() - 0.5) * 0.15;
        }

        /* Decay energy */
        if (p.energy > 0) p.energy = Math.max(0, p.energy - 0.018);
      }

      /* Draw links */
      ctx.lineWidth = 0.5;
      for (let i = 0; i < ps.length; i++) {
        const a = ps[i];
        for (let j = i + 1; j < ps.length; j++) {
          const b = ps[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < linkDistance * linkDistance) {
            const dist = Math.sqrt(dist2);
            const alpha = (1 - dist / linkDistance) * 0.18;
            ctx.strokeStyle = `${colorStr}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      /* Draw particles */
      for (const p of ps) {
        const glow = 1 + p.energy * 1.5;
        ctx.fillStyle = `${colorStr}, ${0.42 + p.energy * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * glow * 0.85, 0, Math.PI * 2);
        ctx.fill();

        /* Soft halo — гораздо тише */
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5 * glow);
        grad.addColorStop(0, `${colorStr}, ${0.12 + p.energy * 0.18})`);
        grad.addColorStop(1, `${colorStr}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5 * glow, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    /* Pause when tab hidden */
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
      draw(); // single static frame
    } else {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [count, linkDistance, totalSteps]);

  return <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />;
}
