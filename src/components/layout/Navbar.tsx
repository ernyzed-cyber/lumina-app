import { NavLink } from 'react-router-dom';
import {
  Heart,
  Search,
  MessageCircle,
  Bell,
  User,
  Settings,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { useMyProfile } from '../../hooks/useMyProfile';
import { useLanguage } from '../../i18n';
import { useAssignment } from '../../hooks/useAssignment';
import styles from './Navbar.module.css';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  labelKey: string;
  badge?: number;
  premium?: boolean;
}

interface NavbarProps {
  unreadMessages?: number;
  unreadNotifications?: number;
}

export default function Navbar({
  unreadMessages,
  unreadNotifications,
}: NavbarProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { avatarUrl: profileAvatar, displayName: profileName } = useMyProfile();
  const {
    unreadMessages: ctxMessages,
    unreadNotifications: ctxNotifications,
  } = useNotifications();

  const messagesBadge = unreadMessages ?? ctxMessages;
  const notificationsBadge = unreadNotifications ?? ctxNotifications;

  const { activeGirlId } = useAssignment();

  const navItems: NavItem[] = [
    // Feed и Search показываем ТОЛЬКО если нет активного assignment
    ...(!activeGirlId ? [
      { to: '/search', icon: <Search size={22} />, labelKey: 'navbar.search' },
      { to: '/feed',   icon: <Heart size={22} />,  labelKey: 'navbar.feed' },
    ] : []),
    {
      to: '/chat',
      icon: <MessageCircle size={22} />,
      labelKey: 'navbar.messages',
      badge: messagesBadge,
    },
    {
      to: '/notifications',
      icon: <Bell size={22} />,
      labelKey: 'navbar.notifications',
      badge: notificationsBadge,
    },
    { to: '/shop', icon: <Crown size={22} />, labelKey: 'navbar.premium', premium: true },
    { to: '/profile', icon: <User size={22} />, labelKey: 'navbar.profile' },
    { to: '/settings', icon: <Settings size={22} />, labelKey: 'navbar.settings' },
  ];

  const avatarUrl =
    profileAvatar ?? (user?.user_metadata?.avatar_url as string | undefined);
  const displayName =
    profileName ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    'U';

  return (
    <nav className={styles.navbar} role="navigation" aria-label={t('navbar.ariaLabel')}>
      {/* Логотип */}
      <div className={styles.logo}>
        <span className={styles.logoText}>L</span>
      </div>

      {/* Навигация */}
      <ul className={styles.navList}>
        {navItems.map((item) => {
          const label = t(item.labelKey);
          return (
            <li key={item.to} className={styles.navItem}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''} ${item.premium ? styles.premiumLink : ''}`
                }
                aria-label={
                  item.badge && item.badge > 0
                    ? `${label} (${item.badge > 99 ? '99+' : item.badge} ${t('navbar.unreadSuffix')})`
                    : label
                }
              >
                <span className={styles.iconWrap} aria-hidden="true">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={styles.badge} aria-hidden="true">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className={styles.tooltip}>{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      {/* Аватар пользователя */}
      <div className={styles.userSection}>
        <NavLink to="/profile" className={styles.avatarLink}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className={styles.avatar}
            />
          ) : (
            <div className={styles.avatarFallback}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
