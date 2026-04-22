import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCta?: () => void;
}

/**
 * Универсальная заглушка для пустых экранов (пустой чат, пустые уведомления и т.д.).
 * Используется ВЕЗДЕ где нужно мягко подтолкнуть юзера к действию в концепции 1:1.
 */
export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaTo,
  onCta,
}: EmptyStateProps) {
  const navigate = useNavigate();

  const handleCta = () => {
    if (onCta) onCta();
    else if (ctaTo) navigate(ctaTo);
  };

  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.iconWrap} aria-hidden="true">{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {ctaLabel && (ctaTo || onCta) && (
        <button type="button" className={styles.cta} onClick={handleCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
