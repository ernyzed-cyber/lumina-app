/**
 * Button — redesign primitive.
 *
 * Variants: gradient | glass | solid | ghost | destructive
 * Sizes:    sm | md | lg
 *
 * Особенности:
 * • При loading=true текст НЕ исчезает — spinner накладывается поверх,
 *   а контент становится visibility:hidden. Размер кнопки не прыгает.
 * • Если передан `href` — рендерится как <a> (типобезопасно).
 * • iconLeft/iconRight выравниваются по центру через flex + line-height:0.
 * • Все hover-transform отключаются через CSS prefers-reduced-motion.
 *
 * Usage:
 *   <Button variant="gradient" size="lg" fullWidth>Начать</Button>
 *   <Button variant="ghost" size="sm" iconOnly aria-label="Лайк"><Heart /></Button>
 *   <Button variant="destructive" loading>Удаление…</Button>
 *   <Button href="/auth" variant="solid">Войти</Button>
 */

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import s from './Button.module.css';

export type ButtonVariant = 'gradient' | 'glass' | 'solid' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Показывает spinner поверх контента, блокирует клики, сохраняет ширину. */
  loading?: boolean;
  /** Растянуть на всю ширину контейнера. */
  fullWidth?: boolean;
  /** Иконка слева от текста. */
  iconLeft?: ReactNode;
  /** Иконка справа от текста. */
  iconRight?: ReactNode;
  /** Кнопка-иконка: квадратная/круглая, без текста. Требует aria-label. */
  iconOnly?: boolean;
  children?: ReactNode;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

type Props = ButtonAsButton | ButtonAsAnchor;

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(function Button(
  {
    variant = 'gradient',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    iconOnly = false,
    children,
    className = '',
    ...rest
  },
  ref,
) {
  const cls = [
    s['rd-btn'],
    s[`rd-btn-${variant}`],
    s[`rd-btn-${size}`],
    iconOnly ? s['rd-btn-icon'] : '',
    fullWidth ? s['rd-btn-full'] : '',
    loading ? s['rd-btn-loading'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Контент: иконки + текст. При loading прячем visibility, чтобы не прыгал layout.
  const content = (
    <span className={s['rd-btn-content']} aria-hidden={loading || undefined}>
      {iconLeft && (
        <span className={s['rd-btn-icon-slot']} aria-hidden="true">
          {iconLeft}
        </span>
      )}
      {children && <span className={s['rd-btn-label']}>{children}</span>}
      {iconRight && (
        <span className={s['rd-btn-icon-slot']} aria-hidden="true">
          {iconRight}
        </span>
      )}
    </span>
  );

  const spinner = loading ? (
    <span className={s['rd-btn-spinner-wrap']} aria-hidden="true">
      <span className={s['rd-btn-spinner']} />
    </span>
  ) : null;

  // Anchor branch
  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as ButtonAsAnchor;
    const isDisabled = loading; // <a> не имеет disabled, но aria-disabled и tabIndex эмулируют
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={isDisabled ? undefined : href}
        className={cls}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          anchorRest.onClick?.(e);
        }}
        {...anchorRest}
      >
        {content}
        {spinner}
      </a>
    );
  }

  // Button branch
  const { disabled, type, ...btnRest } = rest as ButtonAsButton;
  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type={type ?? 'button'}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...btnRest}
    >
      {content}
      {spinner}
    </button>
  );
});

export default Button;
