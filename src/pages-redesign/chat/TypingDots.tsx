import s from './TypingDots.module.css';

export function TypingDots() {
  return (
    <div className={s.dots}>
      <span className={s.dot} />
      <span className={s.dot} />
      <span className={s.dot} />
    </div>
  );
}
