/**
 * GlassCard — redesign surface primitive (polymorphic).
 *
 * Особенности:
 * • Полностью типизированный polymorphic: `as="button"` подтянет ButtonHTMLAttributes,
 *   `as="a"` подтянет AnchorHTMLAttributes (включая href и onClick с правильным event).
 * • Variants: glass (blur) | solid (без blur).
 * • Padding tokens: none | sm | md | lg.
 * • hoverable: translateY-lift + усиленная тень.
 * • accent: gradient border через CSS mask (без z-index хака).
 * • Inner highlight (::before) и accent (::after) не перехватывают клики.
 *
 * Usage:
 *   <GlassCard>content</GlassCard>
 *   <GlassCard hoverable padding="lg">card with hover lift</GlassCard>
 *   <GlassCard variant="solid" accent>gradient border</GlassCard>
 *   <GlassCard as="button" onClick={(e) => ...}>clickable card</GlassCard>
 *   <GlassCard as="a" href="/profile">link card</GlassCard>
 */

import {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react';
import s from './GlassCard.module.css';

export type GlassCardPadding = 'none' | 'sm' | 'md' | 'lg';
export type GlassCardVariant = 'glass' | 'solid';

type OwnProps = {
  variant?: GlassCardVariant;
  padding?: GlassCardPadding;
  /** Hover lift + усиленная тень. */
  hoverable?: boolean;
  /** Gradient border accent. */
  accent?: boolean;
  children?: ReactNode;
  className?: string;
};

type GlassCardProps<T extends ElementType> = OwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof OwnProps | 'as'>;

export default function GlassCard<T extends ElementType = 'div'>({
  as,
  variant = 'glass',
  padding = 'md',
  hoverable = false,
  accent = false,
  children,
  className = '',
  ...rest
}: GlassCardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;

  const cls = [
    s['rd-glass-card'],
    variant === 'solid' ? s['rd-glass-card-solid'] : '',
    s[`rd-glass-card-pad-${padding}`],
    hoverable ? s['rd-glass-card-hoverable'] : '',
    accent ? s['rd-glass-card-accent'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
