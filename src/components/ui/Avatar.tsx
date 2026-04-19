import styles from './Avatar.module.css';

interface AvatarProps {
  src: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  ring?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Avatar({
  src,
  alt = '',
  size = 'md',
  online,
  ring = false,
  className = '',
  onClick,
}: AvatarProps) {
  return (
    <div
      className={`${styles.avatar} ${styles[size]} ${ring ? styles.ring : ''} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
    >
      <img src={src} alt={alt} className={styles.img} />
      {online !== undefined && (
        <span className={`${styles.status} ${online ? styles.online : styles.offline}`} />
      )}
    </div>
  );
}
