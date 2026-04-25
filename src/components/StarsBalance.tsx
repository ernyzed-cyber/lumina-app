import s from './StarsBalance.module.css';

interface Props {
  balance: number;
  onClick?: () => void;
}

/** Compact star-balance chip shown in Chat header and Shop page. */
export function StarsBalance({ balance, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={s.chip}
      aria-label={`${balance} stars`}
    >
      <span className={s.star} aria-hidden="true">⭐</span>
      <span className={s.value}>{balance.toLocaleString()}</span>
    </button>
  );
}
