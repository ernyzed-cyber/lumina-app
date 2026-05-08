/**
 * BottomTabBar — mobile bottom navigation primitive.
 *
 * Features:
 * • 5 tabs (configurable via `items` prop)
 * • Morphing active "pill" background animated via framer-motion `layoutId`
 * • Icon scale + gradient label on active
 * • Badge: number, "99+" overflow, or dot mode
 * • Premium glow (shop tab)
 * • Safe-area-inset-bottom padding
 * • Polymorphic: каждый item — либо `to` (NavLink), либо `onClick` (button)
 * • Не зависит от router — если `to` отсутствует, рендерит <button>
 *
 * Usage:
 *   <BottomTabBar items={tabs} activeId="chat" onSelect={setActive} />
 *
 * Или с react-router:
 *   <BottomTabBar items={tabs} useRouter />
 */

import { type ReactNode, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import s from './BottomTabBar.module.css';

export type TabItem = {
  id: string;
  label: string;
  icon: ReactNode;
  /** Если задан — рендерится <NavLink to={to}>, активность определяется matched route. */
  to?: string;
  /** Если задан — рендерится <button> с onClick. Игнорируется при `useRouter`. */
  onClick?: () => void;
  /** Численный или строковый badge ("99+", "12"). Для dot — `dot: true`. */
  badge?: number | string;
  /** Точечный индикатор без числа. */
  dot?: boolean;
  /** Premium-tab — добавляет тёплый glow вокруг иконки. */
  premium?: boolean;
  /** Доп. ARIA-описание (например, "5 непрочитанных"). */
  ariaLabel?: string;
};

type BottomTabBarProps = {
  items: TabItem[];
  /** Контролируемый режим — id активного таба (для onSelect). Игнорируется при `useRouter`. */
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Использовать react-router NavLink + matchedActive вместо contolled state. */
  useRouter?: boolean;
  /** Static positioning (для preview-фрейма) — `position: absolute` вместо `fixed`. */
  staticPosition?: boolean;
  className?: string;
  /** Уникальный layoutId для нескольких tabbar'ов на одной странице (preview). */
  layoutId?: string;
};

const PILL_ID_DEFAULT = 'rd-tabbar-pill';

export default function BottomTabBar({
  items,
  activeId,
  onSelect,
  useRouter = false,
  staticPosition = false,
  className = '',
  layoutId = PILL_ID_DEFAULT,
}: BottomTabBarProps) {
  const cls = [
    s['rd-tabbar'],
    staticPosition ? s['rd-tabbar-static'] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <nav className={cls} role="navigation" aria-label="Bottom navigation">
      {items.map((item) => {
        if (useRouter && item.to) {
          return (
            <RouterTab key={item.id} item={item} layoutId={layoutId} />
          );
        }
        const isActive = activeId === item.id;
        return (
          <ButtonTab
            key={item.id}
            item={item}
            active={isActive}
            layoutId={layoutId}
            onClick={() => {
              item.onClick?.();
              onSelect?.(item.id);
            }}
          />
        );
      })}
    </nav>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Variants
// ────────────────────────────────────────────────────────────────────────────

function RouterTab({ item, layoutId }: { item: TabItem; layoutId: string }) {
  const location = useLocation();
  // Активна, если pathname начинается с item.to (для вложенных роутов).
  // Точное равенство для корня "/".
  const isActive =
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to ?? '___never___');

  return (
    <NavLink
      to={item.to!}
      className={({ isActive: navActive }) =>
        tabClass(item, navActive || isActive)
      }
      aria-label={item.ariaLabel ?? item.label}
      end={item.to === '/'}
    >
      <TabContent item={item} active={isActive} layoutId={layoutId} />
    </NavLink>
  );
}

function ButtonTab({
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
      className={tabClass(item, active)}
      onClick={onClick}
      aria-label={item.ariaLabel ?? item.label}
      aria-current={active ? 'page' : undefined}
    >
      <TabContent item={item} active={active} layoutId={layoutId} />
    </button>
  );
}

function TabContent({
  item,
  active,
  layoutId,
}: {
  item: TabItem;
  active: boolean;
  layoutId: string;
}) {
  return (
    <>
      {active && (
        <motion.span
          layoutId={layoutId}
          className={s['rd-tab-pill']}
          aria-hidden="true"
          transition={{ type: 'spring' as const, stiffness: 380, damping: 32 }}
        />
      )}
      <span className={s['rd-tab-icon']} aria-hidden="true">
        {item.icon}
        {item.dot && <span className={`${s['rd-tab-badge']} ${s['rd-tab-badge-dot']}`} />}
        {!item.dot && item.badge !== undefined && Number(item.badge) !== 0 && (
          <span className={s['rd-tab-badge']}>
            {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </span>
      <span className={s['rd-tab-label']}>{item.label}</span>
    </>
  );
}

function tabClass(item: TabItem, active: boolean): string {
  return [
    s['rd-tab'],
    active ? s['rd-tab-active'] : '',
    item.premium ? s['rd-tab-premium'] : '',
  ].filter(Boolean).join(' ');
}

// ────────────────────────────────────────────────────────────────────────────
// Convenience: типобезопасный helper для построения items с lucide-icons
// ────────────────────────────────────────────────────────────────────────────
export function makeTab(
  id: string,
  label: string,
  Icon: ComponentType<{ size?: number }>,
  rest: Omit<TabItem, 'id' | 'label' | 'icon'> = {},
): TabItem {
  return {
    id,
    label,
    icon: <Icon size={22} />,
    ...rest,
  };
}
