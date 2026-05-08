/**
 * SidebarNav — desktop vertical navigation primitive.
 *
 * Features:
 * • Collapsed by default (76px) → expanded on hover/focus-within (260px)
 * • Or pinned via `pinned` prop (always expanded)
 * • Logo at top, scrollable items в середине, user block внизу
 * • Active indicator: gradient background + animated left bar (layoutId)
 * • Badges (число/dot), premium glow, polymorphic items (NavLink или button)
 *
 * Usage:
 *   <SidebarNav items={tabs} useRouter user={{ name, avatar, meta }} />
 */

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import Avatar from './Avatar';
import s from './SidebarNav.module.css';
import type { TabItem } from './BottomTabBar';

export type SidebarUser = {
  name: string;
  avatar?: string;
  meta?: string; // e.g. "Premium · 5 stars"
  to?: string;
  onClick?: () => void;
};

type SidebarNavProps = {
  items: TabItem[];
  useRouter?: boolean;
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Принудительно развёрнутая форма. */
  pinned?: boolean;
  /** Static positioning (preview-frame). */
  staticPosition?: boolean;
  user?: SidebarUser;
  logo?: ReactNode;
  brandName?: string;
  className?: string;
  layoutId?: string;
};

const BAR_ID_DEFAULT = 'rd-sidebar-bar';

export default function SidebarNav({
  items,
  useRouter = false,
  activeId,
  onSelect,
  pinned = false,
  staticPosition = false,
  user,
  logo,
  brandName = 'Lumina',
  className = '',
  layoutId = BAR_ID_DEFAULT,
}: SidebarNavProps) {
  const cls = [
    s['rd-sidebar'],
    pinned ? s['rd-sidebar-pinned'] : '',
    staticPosition ? s['rd-sidebar-static'] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <aside className={cls}>
      {/* Logo */}
      <a href="#" className={s['rd-sidebar-logo']} aria-label={brandName}>
        <span className={s['rd-sidebar-logo-mark']} aria-hidden="true">
          {logo ?? 'L'}
        </span>
        <span className={s['rd-sidebar-logo-text']}>{brandName}</span>
      </a>

      {/* Items */}
      <ul className={s['rd-sidebar-list']}>
        {items.map((item) => {
          if (useRouter && item.to) {
            return (
              <li key={item.id}>
                <RouterItem item={item} layoutId={layoutId} />
              </li>
            );
          }
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <ButtonItem
                item={item}
                active={isActive}
                layoutId={layoutId}
                onClick={() => {
                  item.onClick?.();
                  onSelect?.(item.id);
                }}
              />
            </li>
          );
        })}
      </ul>

      {/* User footer */}
      {user && (
        <a
          className={s['rd-sidebar-user']}
          href={user.to ?? '#'}
          onClick={(e) => {
            if (user.onClick) {
              e.preventDefault();
              user.onClick();
            }
          }}
          aria-label={user.name}
        >
          <Avatar src={user.avatar} name={user.name} size="md" />
          <div className={s['rd-sidebar-user-info']}>
            <span className={s['rd-sidebar-user-name']}>{user.name}</span>
            {user.meta && <span className={s['rd-sidebar-user-meta']}>{user.meta}</span>}
          </div>
        </a>
      )}
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function RouterItem({ item, layoutId }: { item: TabItem; layoutId: string }) {
  const location = useLocation();
  const isActive =
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to ?? '___never___');

  return (
    <NavLink
      to={item.to!}
      end={item.to === '/'}
      className={({ isActive: navActive }) => itemClass(item, navActive || isActive)}
      aria-label={item.ariaLabel ?? item.label}
    >
      <ItemContent item={item} active={isActive} layoutId={layoutId} />
    </NavLink>
  );
}

function ButtonItem({
  item,
  active,
  layoutId,
  onClick,
}: {
  item: TabItem;
  active: boolean;
  layoutId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={itemClass(item, active)}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={item.ariaLabel ?? item.label}
    >
      <ItemContent item={item} active={active} layoutId={layoutId} />
    </button>
  );
}

function ItemContent({
  item,
  active,
  layoutId,
}: {
  item: TabItem;
  active: boolean;
  layoutId: string;
}) {
  const showBadge =
    !item.dot && item.badge !== undefined && Number(item.badge) !== 0;
  return (
    <>
      {active && (
        <motion.span
          layoutId={layoutId}
          className={s['rd-sidebar-item-bar']}
          aria-hidden="true"
          transition={{ type: 'spring' as const, stiffness: 380, damping: 32 }}
        />
      )}
      <span className={s['rd-sidebar-item-icon']} aria-hidden="true">
        {item.icon}
      </span>
      <span className={s['rd-sidebar-item-label']}>{item.label}</span>
      {item.dot && (
        <span
          className={s['rd-sidebar-item-badge']}
          style={{ width: 9, height: 9, minWidth: 9, padding: 0 }}
          aria-hidden="true"
        />
      )}
      {showBadge && (
        <span className={s['rd-sidebar-item-badge']}>
          {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </>
  );
}

function itemClass(item: TabItem, active: boolean): string {
  return [
    s['rd-sidebar-item'],
    active ? s['rd-sidebar-item-active'] : '',
    item.premium ? s['rd-sidebar-item-premium'] : '',
  ].filter(Boolean).join(' ');
}
