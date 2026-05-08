/**
 * PageHeader — sticky page header primitive.
 *
 * Modes:
 *   1. Compact (default) — ряд "back · title · actions" высотой 56px.
 *   2. Large title — большой заголовок ниже compact-row, скрывается на scroll
 *      (Apple-style); compact title fade-in одновременно. Включается через
 *      `largeTitle` prop.
 *
 * Behaviors:
 *   • При scroll > scrollThreshold (default 8px) включается «scrolled» state:
 *     glass-blur background, тонкая граница, тень.
 *   • Использует IntersectionObserver на sentinel-элементе перед хедером —
 *     надёжнее чем `scrollY` (работает в любом scroll-контейнере, без
 *     attached listener'ов).
 *   • Если largeTitle — compact title fade-in при scrolled, fade-out обратно.
 *
 * Slots:
 *   • back: ReactNode | { onClick?: () => void; href?: string } — кастом или
 *     встроенная кнопка ChevronLeft.
 *   • actions: ActionItem[] — справа, иконки 40×40 с опциональным badge.
 *   • title / subtitle / eyebrow: текстовые элементы.
 */

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChevronLeft } from 'lucide-react';
import s from './PageHeader.module.css';

export type HeaderAction = {
  id: string;
  icon: ReactNode;
  label: string; // aria-label / tooltip
  onClick?: () => void;
  href?: string;
  badge?: number;
};

type BackProp =
  | ReactNode
  | { onClick?: () => void; href?: string; label?: string };

type PageHeaderProps = {
  /** Текст компактного заголовка (в bar-ряду). */
  title?: ReactNode;
  /** Подзаголовок под title в баре. */
  subtitle?: ReactNode;
  /** Если true → рендерит большой заголовок ниже бара (collapsing on scroll). */
  largeTitle?: boolean;
  /** Eyebrow над large title (мелкий капс). */
  eyebrow?: ReactNode;
  /** Большой подзаголовок (под large title). */
  largeSubtitle?: ReactNode;
  /** Back-кнопка. Поддерживает 3 варианта: true (default ChevronLeft + history.back),
   *  объект с onClick/href, или собственный ReactNode. */
  back?: BackProp | true;
  /** Actions справа. */
  actions?: HeaderAction[];
  /** Центрированный title (iOS-style). По умолчанию left-align. */
  centered?: boolean;
  /** Threshold в px после которого включается scrolled state (default 8). */
  scrollThreshold?: number;
  /** Для preview в фрейме — `position: relative` вместо `sticky`. */
  staticPosition?: boolean;
  className?: string;
  children?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  largeTitle = false,
  eyebrow,
  largeSubtitle,
  back,
  actions = [],
  centered = false,
  scrollThreshold = 8,
  staticPosition = false,
  className = '',
  children,
}: PageHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver на sentinel выше хедера — детект "scrolled" без listener'ов.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || staticPosition) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      {
        rootMargin: `-${scrollThreshold}px 0px 0px 0px`,
        threshold: 0,
      },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [scrollThreshold, staticPosition]);

  const cls = [
    s['rd-page-header'],
    scrolled ? s['rd-page-header-scrolled'] : '',
    largeTitle ? s['rd-page-header-title-fades'] : '',
    staticPosition ? s['rd-page-header-static'] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <>
      {/* sentinel — невидимый, нужен только для IO */}
      {!staticPosition && (
        <div ref={sentinelRef} aria-hidden="true" style={{ height: 1, marginBottom: -1 }} />
      )}

      <header className={cls}>
        <div className={s['rd-page-header-bar']}>
          <div className={s['rd-page-header-bar-left']}>
            {renderBack(back)}
          </div>

          <div
            className={`${s['rd-page-header-bar-center']} ${
              centered ? s['rd-page-header-bar-center-aligned'] : ''
            }`}
          >
            {title && <h1 className={s['rd-page-header-title']}>{title}</h1>}
            {subtitle && <p className={s['rd-page-header-subtitle']}>{subtitle}</p>}
          </div>

          <div className={s['rd-page-header-bar-right']}>
            {actions.map((a) => renderAction(a))}
          </div>
        </div>

        {/* Large title block */}
        {largeTitle && (
          <div className={s['rd-page-header-large']}>
            {eyebrow && <p className={s['rd-page-header-large-eyebrow']}>{eyebrow}</p>}
            {title && <h1 className={s['rd-page-header-large-title']}>{title}</h1>}
            {largeSubtitle && (
              <p className={s['rd-page-header-large-subtitle']}>{largeSubtitle}</p>
            )}
          </div>
        )}

        {children}
      </header>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────────────

function renderBack(back: BackProp | true | undefined): ReactNode {
  if (!back) return null;

  // true → дефолтный back с history.back()
  if (back === true) {
    return (
      <button
        type="button"
        className={s['rd-page-header-back']}
        onClick={() => window.history.back()}
        aria-label="Назад"
      >
        <ChevronLeft size={22} />
      </button>
    );
  }

  // Объект {onClick, href, label}
  if (
    typeof back === 'object' &&
    back !== null &&
    !('type' in back) && // не ReactElement
    ('onClick' in back || 'href' in back || 'label' in back)
  ) {
    const config = back as { onClick?: () => void; href?: string; label?: string };
    if (config.href) {
      return (
        <a
          href={config.href}
          className={s['rd-page-header-back']}
          aria-label={config.label ?? 'Назад'}
        >
          <ChevronLeft size={22} />
        </a>
      );
    }
    return (
      <button
        type="button"
        className={s['rd-page-header-back']}
        onClick={config.onClick}
        aria-label={config.label ?? 'Назад'}
      >
        <ChevronLeft size={22} />
      </button>
    );
  }

  // Кастомный ReactNode
  return back as ReactNode;
}

function renderAction(action: HeaderAction): ReactNode {
  const showBadge = action.badge !== undefined && action.badge > 0;
  const badgeContent = showBadge ? (
    <span className={s['rd-page-header-action-badge']}>
      {action.badge! > 99 ? '99+' : action.badge}
    </span>
  ) : null;

  if (action.href) {
    return (
      <a
        key={action.id}
        href={action.href}
        className={s['rd-page-header-action']}
        aria-label={action.label}
        title={action.label}
      >
        {action.icon}
        {badgeContent}
      </a>
    );
  }
  return (
    <button
      key={action.id}
      type="button"
      className={s['rd-page-header-action']}
      onClick={action.onClick}
      aria-label={action.label}
      title={action.label}
    >
      {action.icon}
      {badgeContent}
    </button>
  );
}
