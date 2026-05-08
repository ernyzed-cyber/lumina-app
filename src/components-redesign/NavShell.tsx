/**
 * NavShell — responsive layout wrapper.
 *
 * Mobile (<768px): content + fixed BottomTabBar внизу.
 * Desktop (≥768px): SidebarNav (collapsible) слева + scrollable content справа.
 *
 * Принимает items + user, рендерит правильный nav-компонент в зависимости
 * от breakpoint'а (через useMediaQuery).
 *
 * forceLayout='mobile'|'desktop' — для preview-фреймов где media query
 * вычисляется по window.innerWidth, а не размеру фрейма.
 */

import { type ReactNode } from 'react';
import BottomTabBar from './BottomTabBar';
import SidebarNav, { type SidebarUser } from './SidebarNav';
import type { TabItem } from './BottomTabBar';
import { useMediaQuery, RD_BREAKPOINTS } from './useMediaQuery';
import s from './NavShell.module.css';

type NavShellProps = {
  items: TabItem[];
  useRouter?: boolean;
  activeId?: string;
  onSelect?: (id: string) => void;
  user?: SidebarUser;
  brandName?: string;
  /** Принудительный layout (для preview-фреймов и тестов). */
  forceLayout?: 'mobile' | 'desktop';
  /** Принудительно "pinned" sidebar (всегда expanded). */
  sidebarPinned?: boolean;
  /** Static positioning (для preview): nav без position fixed/sticky. */
  staticPosition?: boolean;
  className?: string;
  children: ReactNode;
};

export default function NavShell({
  items,
  useRouter = false,
  activeId,
  onSelect,
  user,
  brandName,
  forceLayout,
  sidebarPinned = false,
  staticPosition = false,
  className = '',
  children,
}: NavShellProps) {
  const detectedMobile = useMediaQuery(RD_BREAKPOINTS.mobile);
  const isMobile = forceLayout ? forceLayout === 'mobile' : detectedMobile;

  const cls = [
    s['rd-nav-shell'],
    isMobile ? s['rd-nav-shell-mobile'] : s['rd-nav-shell-desktop'],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      {!isMobile && (
        <SidebarNav
          items={items}
          useRouter={useRouter}
          activeId={activeId}
          onSelect={onSelect}
          user={user}
          brandName={brandName}
          pinned={sidebarPinned}
          staticPosition={staticPosition}
        />
      )}

      <main className={s['rd-nav-shell-content']}>{children}</main>

      {isMobile && (
        <BottomTabBar
          items={items}
          useRouter={useRouter}
          activeId={activeId}
          onSelect={onSelect}
          staticPosition={staticPosition}
        />
      )}
    </div>
  );
}
