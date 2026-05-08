import s from './StarField.module.css';

type StarFieldProps = {
  /**
   * `full` — same atmosphere as Home.
   * `dim` — quieter: stars + nebulae faded, used on screens where text reads on top.
   */
  intensity?: 'full' | 'dim';
};

/**
 * Pure-CSS starfield with three parallax layers + nebula clouds.
 * No canvas, no JS animation — all transform/opacity keyframes.
 * Light theme: stars become soft dawn particles.
 */
export function StarField({ intensity = 'full' }: StarFieldProps) {
  return (
    <div
      className={`${s.field} ${intensity === 'dim' ? s.dim : ''}`}
      aria-hidden="true"
    >
      <div className={s.nebulaA} />
      <div className={s.nebulaB} />
      <div className={s.nebulaC} />
      <div className={`${s.stars} ${s.starsFar}`} />
      <div className={`${s.stars} ${s.starsMid}`} />
      <div className={`${s.stars} ${s.starsNear}`} />
      <div className={s.vignette} />
    </div>
  );
}
