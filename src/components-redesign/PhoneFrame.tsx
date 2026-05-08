/**
 * PhoneFrame — iPhone 14/15 Pro-style mockup chrome.
 *
 * Отображает скруглённый bezel + Dynamic Island + status bar + home indicator,
 * внутрь рендерит произвольный контент (UI mockup).
 *
 * Размер контролируется через CSS-переменную `--rd-phone-w` (ширина).
 * Высота автоматически 2.06× ширины (близко к 19.5:9).
 *
 * Slots:
 *   • children — содержимое экрана.
 *   • statusBarTime — время в углу (default '9:41').
 *   • showIsland — показать Dynamic Island (default true).
 *   • showStatusBar — показать строку статуса (default true).
 *   • tilt — преднастроенный 3D-наклон ('left' | 'right' | 'center' | 'none').
 *
 * Все размеры внутри (statusbar, island, indicator) масштабируются от ширины
 * через `calc(var(--rd-phone-w) * N)` — поэтому фрейм одинаково красив на
 * любом size'е.
 */

import { type CSSProperties, type ReactNode } from 'react';
import { Wifi, Signal } from 'lucide-react';
import s from './PhoneFrame.module.css';

type TiltVariant = 'left' | 'right' | 'center' | 'none';

type PhoneFrameProps = {
  /** Ширина в px (default 280). Высота автоматически 2.06×. */
  width?: number;
  /** Контент экрана. */
  children?: ReactNode;
  /** Время в status bar (default '9:41'). */
  statusBarTime?: string;
  /** Показывать Dynamic Island (default true). */
  showIsland?: boolean;
  /** Показывать status bar (default true). */
  showStatusBar?: boolean;
  /** Показывать home indicator (default true). */
  showIndicator?: boolean;
  /** 3D tilt preset для параллакса. */
  tilt?: TiltVariant;
  /** Inline-стиль контейнера (для motion-обёрток). */
  style?: CSSProperties;
  className?: string;
  /** ARIA-метка фрейма. */
  ariaLabel?: string;
};

export default function PhoneFrame({
  width = 280,
  children,
  statusBarTime = '9:41',
  showIsland = true,
  showStatusBar = true,
  showIndicator = true,
  tilt = 'none',
  style,
  className = '',
  ariaLabel = 'Превью экрана приложения',
}: PhoneFrameProps) {
  const tiltClass =
    tilt === 'left'
      ? s['rd-phone-tilt-left']
      : tilt === 'right'
        ? s['rd-phone-tilt-right']
        : tilt === 'center'
          ? s['rd-phone-tilt-center']
          : '';

  const cls = [s['rd-phone'], tiltClass, className].filter(Boolean).join(' ');

  // size icons proportionally to phone width
  const iconSize = Math.max(8, Math.round(width * 0.04));

  return (
    <div
      className={cls}
      role="img"
      aria-label={ariaLabel}
      style={
        {
          '--rd-phone-w': `${width}px`,
          ...style,
        } as CSSProperties
      }
    >
      <div className={s['rd-phone-screen']}>
        {showIsland && <div className={s['rd-phone-island']} aria-hidden="true" />}

        {showStatusBar && (
          <div className={s['rd-phone-statusbar']}>
            <span className={s['rd-phone-statusbar-time']}>{statusBarTime}</span>
            <div className={s['rd-phone-statusbar-icons']}>
              <span className={s['rd-phone-statusbar-icon']}>
                <Signal size={iconSize} strokeWidth={2.5} />
              </span>
              <span className={s['rd-phone-statusbar-icon']}>
                <Wifi size={iconSize} strokeWidth={2.5} />
              </span>
              <span className={s['rd-phone-battery']} aria-hidden="true">
                <span className={s['rd-phone-battery-fill']} />
              </span>
            </div>
          </div>
        )}

        <div className={s['rd-phone-content']}>{children}</div>

        {showIndicator && <div className={s['rd-phone-indicator']} aria-hidden="true" />}
      </div>
    </div>
  );
}
