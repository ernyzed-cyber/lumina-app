/**
 * Avatar — redesign primitive.
 *
 * Особенности:
 * • online И verified могут отображаться одновременно (online слева/снизу, verified справа/снизу).
 * • ring имеет 4 пресета: brand (default) | success | warm | cool — через ringTone проп.
 * • initials: безопасная генерация для пустых/мусорных строк (никогда не падает).
 * • loading=true показывает skeleton-shimmer вместо контента.
 * • Avatar.Group: stacked overlap; max ограничивает количество, остаток показывает как +N.
 *
 * Usage:
 *   <Avatar src="/photo.jpg" name="Алина" size="md" online verified />
 *   <Avatar name="София" size="xl" ring ringTone="warm" />
 *   <Avatar loading size="lg" />
 *   <Avatar.Group max={3}>
 *     <Avatar src="..." name="A" />
 *     <Avatar src="..." name="B" />
 *     <Avatar src="..." name="C" />
 *     <Avatar src="..." name="D" />
 *   </Avatar.Group>
 */

import { Children, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import s from './Avatar.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarRingTone = 'brand' | 'success' | 'warm' | 'cool';

type Props = {
  /** Photo URL. Falls back to initials if omitted or fails to load. */
  src?: string;
  /** Alt text and initials source. Required for a11y. */
  name?: string;
  size?: AvatarSize;
  /** Show green online dot (нижний-левый угол). */
  online?: boolean;
  /** Show gradient verified checkmark (нижний-правый угол). */
  verified?: boolean;
  /** Gradient ring around avatar. */
  ring?: boolean;
  /** Tone of the ring (only applies when ring=true). */
  ringTone?: AvatarRingTone;
  /** Render skeleton-shimmer instead of content. */
  loading?: boolean;
  className?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height' | 'loading'>;

function getInitials(name: string | undefined): string {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).slice(0, 2);
  const initials = parts
    .map((w) => {
      // безопасно для emoji / surrogate-pairs
      const code = w.codePointAt(0);
      return code ? String.fromCodePoint(code).toUpperCase() : '';
    })
    .join('');
  return initials || '?';
}

const verifiedIconSize: Record<AvatarSize, number> = {
  xs: 7,
  sm: 8,
  md: 11,
  lg: 13,
  xl: 16,
  '2xl': 20,
};

function Avatar({
  src,
  name,
  size = 'md',
  online = false,
  verified = false,
  ring = false,
  ringTone = 'brand',
  loading = false,
  className = '',
  ...imgProps
}: Props) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !src || imgError;

  const cls = [
    s['rd-avatar'],
    s[`rd-avatar-${size}`],
    ring ? s['rd-avatar-ring'] : '',
    ring ? s[`rd-avatar-ring-${ringTone}`] : '',
    loading ? s['rd-avatar-loading'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return <div className={cls} aria-busy="true" aria-label="Загрузка аватара" />;
  }

  return (
    <div className={cls} role="img" aria-label={name ?? 'Аватар'}>
      {showFallback ? (
        <div className={s['rd-avatar-fallback']} aria-hidden="true">
          {getInitials(name)}
        </div>
      ) : (
        <img
          src={src}
          alt={name ?? ''}
          className={s['rd-avatar-img']}
          onError={() => setImgError(true)}
          loading="lazy"
          {...imgProps}
        />
      )}

      {online && (
        <span className={s['rd-avatar-online']} aria-label="Онлайн" role="status" />
      )}

      {verified && (
        <span className={s['rd-avatar-verified']} aria-label="Верифицирован" role="img">
          <Check size={verifiedIconSize[size]} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

// ── Avatar.Group ──────────────────────────────────────────────────
type GroupProps = {
  children: ReactNode;
  /** Максимум аватаров в стэке; остальные сворачиваются в +N. */
  max?: number;
  /** Размер для +N бейджа (по умолчанию совпадает с детьми). */
  size?: AvatarSize;
  className?: string;
};

function AvatarGroup({ children, max, size = 'md', className = '' }: GroupProps) {
  const items = Children.toArray(children);
  const visible = max ? items.slice(0, max) : items;
  const overflow = max ? items.length - max : 0;

  return (
    <div className={`${s['rd-avatar-group']} ${className}`}>
      {visible}
      {overflow > 0 && (
        <div
          className={`${s['rd-avatar']} ${s[`rd-avatar-${size}`]} ${s['rd-avatar-overflow']}`}
          role="img"
          aria-label={`Ещё ${overflow}`}
        >
          <span aria-hidden="true">+{overflow}</span>
        </div>
      )}
    </div>
  );
}

Avatar.Group = AvatarGroup;

export default Avatar;
