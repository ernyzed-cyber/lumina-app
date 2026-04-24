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
      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/25 active:scale-95 transition"
    >
      ⭐ {balance.toLocaleString()}
    </button>
  );
}
