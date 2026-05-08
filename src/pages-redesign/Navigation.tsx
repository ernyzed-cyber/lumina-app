/**
 * Navigation preview — витрина Stage 2.
 *
 * Содержит:
 *  • Hero с описанием
 *  • Mobile frame 390×720 с BottomTabBar (controlled state)
 *  • Demo рядов PageHeader (compact / large title / centered / with actions)
 *  • Desktop frame 100% width с SidebarNav (collapsed/pinned toggle)
 *  • Полный NavShell live demo (forceLayout toggle: mobile/desktop)
 *  • Notes блок с инвариантами (assigned-mode скрывает Feed/Search и т.д.)
 *
 * Все компоненты используют `staticPosition` чтобы fixed-позиционирование
 * не вылезало за preview-фреймы.
 */

import { useState, type ReactNode } from 'react';
import {
  Home,
  MessageCircle,
  Search,
  Sparkles,
  User,
  Bell,
  Settings,
  Filter,
  Heart,
  ShoppingBag,
  Compass,
} from 'lucide-react';
import BottomTabBar, { type TabItem } from '../components-redesign/BottomTabBar';
import SidebarNav, { type SidebarUser } from '../components-redesign/SidebarNav';
import PageHeader from '../components-redesign/PageHeader';
import NavShell from '../components-redesign/NavShell';
import s from './Navigation.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Demo data
// ────────────────────────────────────────────────────────────────────────────

const TABS_BROWSE: TabItem[] = [
  { id: 'feed', label: 'Лента', icon: <Home size={22} /> },
  { id: 'search', label: 'Поиск', icon: <Search size={22} /> },
  { id: 'chat', label: 'Чат', icon: <MessageCircle size={22} />, badge: 3 },
  { id: 'shop', label: 'Магазин', icon: <ShoppingBag size={22} />, premium: true },
  { id: 'profile', label: 'Профиль', icon: <User size={22} />, dot: true },
];

const TABS_ASSIGNED: TabItem[] = [
  { id: 'chat', label: 'Чат', icon: <MessageCircle size={22} />, badge: 12 },
  { id: 'shop', label: 'Подарки', icon: <Sparkles size={22} />, premium: true },
  { id: 'profile', label: 'Профиль', icon: <User size={22} /> },
];

const DEMO_USER: SidebarUser = {
  name: 'Ярослав',
  meta: 'Premium · ∞',
};

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export default function NavigationPreview() {
  const [mobileTab, setMobileTab] = useState('chat');
  const [shellTab, setShellTab] = useState('feed');
  const [shellLayout, setShellLayout] = useState<'mobile' | 'desktop'>('desktop');
  const [assignedMode, setAssignedMode] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);

  const tabs = assignedMode ? TABS_ASSIGNED : TABS_BROWSE;
  const shellActiveId = tabs.some((t) => t.id === shellTab) ? shellTab : tabs[0]!.id;

  return (
    <div className={s.page}>
      {/* ── Hero ───────────────────────────────────────── */}
      <header className={s.hero}>
        <h1 className={s['hero-title']}>Navigation</h1>
        <p className={s['hero-lede']}>
          Bottom tabbar (mobile), sidebar (desktop) и адаптивный PageHeader.
          Все компоненты polymorphic: работают с react-router NavLink или
          в controlled-режиме через <code>activeId</code> + <code>onSelect</code>.
        </p>
      </header>

      {/* ── Toolbar: assignment mode toggle ───────────── */}
      <div className={s.section}>
        <div className={s.toolbar}>
          <span className={s['toolbar-label']}>Режим</span>
          <button
            type="button"
            className={`${s['toolbar-toggle']} ${!assignedMode ? s['toolbar-toggle-active'] : ''}`}
            onClick={() => setAssignedMode(false)}
          >
            <Compass size={14} /> Browse (5 tabs)
          </button>
          <button
            type="button"
            className={`${s['toolbar-toggle']} ${assignedMode ? s['toolbar-toggle-active'] : ''}`}
            onClick={() => setAssignedMode(true)}
          >
            <Heart size={14} /> Assigned (3 tabs)
          </button>
          <span style={{ flex: 1 }} />
          <span className={s['toolbar-label']}>Sidebar</span>
          <button
            type="button"
            className={`${s['toolbar-toggle']} ${sidebarPinned ? s['toolbar-toggle-active'] : ''}`}
            onClick={() => setSidebarPinned((v) => !v)}
          >
            {sidebarPinned ? 'Pinned (260px)' : 'Hover-expand'}
          </button>
        </div>
        <div className={s.note}>
          <strong>Инвариант:</strong> в assigned-mode (есть active companion)
          скрываем <code>Feed</code> и <code>Search</code> — оставляем только
          Chat / Shop / Profile. Реализовано через <code>useAssignment()</code>
          в production NavShell.
        </div>
      </div>

      {/* ── Mobile frame ───────────────────────────────── */}
      <section className={s.section}>
        <div className={s['section-head']}>
          <h2 className={s['section-title']}>Mobile · BottomTabBar</h2>
          <p className={s['section-subtitle']}>
            390×720 frame · safe-area · morphing pill через framer-motion layoutId.
            Бейджи: число (3, 12), 99+, dot, premium glow.
          </p>
        </div>

        <div className={s['mobile-frame-wrap']}>
          <div className={s['mobile-frame']}>
            <PageHeader
              title="Чат"
              subtitle={assignedMode ? 'с Соней' : '5 диалогов'}
              actions={[
                {
                  id: 'filter',
                  icon: <Filter size={18} />,
                  label: 'Фильтр',
                },
                {
                  id: 'bell',
                  icon: <Bell size={18} />,
                  label: 'Уведомления',
                  badge: 2,
                },
              ]}
              staticPosition
            />

            <div className={s['mobile-frame-content']}>
              <div className={s['mobile-frame-screen-padding']}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <CardStub key={i} index={i} />
                ))}
              </div>
            </div>

            <BottomTabBar
              items={tabs}
              activeId={mobileTab}
              onSelect={setMobileTab}
              staticPosition
              layoutId="rd-preview-mobile-pill"
            />
          </div>
        </div>
      </section>

      {/* ── PageHeader variants ────────────────────────── */}
      <section className={s.section}>
        <div className={s['section-head']}>
          <h2 className={s['section-title']}>PageHeader · варианты</h2>
          <p className={s['section-subtitle']}>
            Compact (default), large title (Apple-style collapsing),
            centered title, with actions + badge.
          </p>
        </div>

        <div className={s['header-demos']}>
          <HeaderDemo label="Compact + back + actions">
            <PageHeader
              title="Настройки"
              back={{ onClick: () => {}, label: 'Назад' }}
              actions={[
                { id: 'save', icon: <Settings size={18} />, label: 'Опции' },
              ]}
              staticPosition
            />
          </HeaderDemo>

          <HeaderDemo label="Centered + subtitle">
            <PageHeader
              title="Магазин"
              subtitle="142 предмета"
              centered
              back
              actions={[
                { id: 'cart', icon: <ShoppingBag size={18} />, label: 'Корзина', badge: 3 },
              ]}
              staticPosition
            />
          </HeaderDemo>

          <HeaderDemo label="Large title (Apple-style)">
            <PageHeader
              largeTitle
              eyebrow="Сегодня"
              title="Лента"
              largeSubtitle="3 новых события у вашего компаньона"
              actions={[
                { id: 'bell', icon: <Bell size={18} />, label: 'Уведомления', badge: 99 },
              ]}
              staticPosition
            />
          </HeaderDemo>

          <HeaderDemo label="Minimal · только title">
            <PageHeader title="Профиль" staticPosition />
          </HeaderDemo>
        </div>
      </section>

      {/* ── Desktop SidebarNav ─────────────────────────── */}
      <section className={s.section}>
        <div className={s['section-head']}>
          <h2 className={s['section-title']}>Desktop · SidebarNav</h2>
          <p className={s['section-subtitle']}>
            Collapsed 76px → expanded 260px на hover/focus или при{' '}
            <code>pinned</code>. Active gradient bar анимируется через layoutId.
          </p>
        </div>

        <div className={s['desktop-frame']}>
          <SidebarNav
            items={tabs}
            activeId={shellActiveId}
            onSelect={setShellTab}
            user={DEMO_USER}
            brandName="Lumina"
            pinned={sidebarPinned}
            staticPosition
          />
          <div className={s['desktop-frame-content']}>
            <PageHeader
              largeTitle
              title={tabs.find((t) => t.id === shellActiveId)?.label ?? 'Lumina'}
              largeSubtitle="Hover-expand sidebar — наведи курсор на левую панель"
              actions={[
                { id: 'bell', icon: <Bell size={18} />, label: 'Уведомления', badge: 5 },
                { id: 'settings', icon: <Settings size={18} />, label: 'Настройки' },
              ]}
              staticPosition
            />
            {Array.from({ length: 8 }).map((_, i) => (
              <CardStub key={i} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Full NavShell ──────────────────────────────── */}
      <section className={s.section}>
        <div className={s['section-head']}>
          <h2 className={s['section-title']}>NavShell · полный layout</h2>
          <p className={s['section-subtitle']}>
            Wrapper решает mobile vs desktop через <code>useMediaQuery</code>.
            Здесь — через <code>forceLayout</code> для preview-фрейма.
          </p>
        </div>

        <div className={s.toolbar}>
          <span className={s['toolbar-label']}>Layout</span>
          <button
            type="button"
            className={`${s['toolbar-toggle']} ${shellLayout === 'mobile' ? s['toolbar-toggle-active'] : ''}`}
            onClick={() => setShellLayout('mobile')}
          >
            Mobile
          </button>
          <button
            type="button"
            className={`${s['toolbar-toggle']} ${shellLayout === 'desktop' ? s['toolbar-toggle-active'] : ''}`}
            onClick={() => setShellLayout('desktop')}
          >
            Desktop
          </button>
        </div>

        <div
          className={s['desktop-frame']}
          style={shellLayout === 'mobile' ? { height: 720, maxWidth: 420, margin: '0 auto' } : undefined}
        >
          <NavShell
            items={tabs}
            activeId={shellActiveId}
            onSelect={setShellTab}
            user={DEMO_USER}
            brandName="Lumina"
            forceLayout={shellLayout}
            sidebarPinned={sidebarPinned}
            staticPosition
          >
            <PageHeader
              title={tabs.find((t) => t.id === shellActiveId)?.label ?? 'Lumina'}
              subtitle={assignedMode ? 'Соня · онлайн' : 'Browse mode'}
              back={shellLayout === 'mobile' ? { onClick: () => {} } : undefined}
              actions={[
                { id: 'bell', icon: <Bell size={18} />, label: 'Уведомления', badge: 7 },
              ]}
              staticPosition
            />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <CardStub key={i} index={i} />
              ))}
            </div>
          </NavShell>
        </div>
      </section>

      {/* ── Notes ──────────────────────────────────────── */}
      <section className={s.section}>
        <div className={s['section-head']}>
          <h2 className={s['section-title']}>API заметки</h2>
        </div>
        <div className={s.note}>
          <strong>Polymorphic режимы:</strong> оба <code>BottomTabBar</code> и{' '}
          <code>SidebarNav</code> работают в двух режимах —{' '}
          <code>useRouter</code> (NavLink + автоматическая активность по матчу
          роута) или controlled через <code>activeId</code> + <code>onSelect</code>.
        </div>
        <div className={s.note}>
          <strong>PageHeader</strong> детектит scroll через{' '}
          <code>IntersectionObserver</code> на sentinel-элементе — работает в
          любом scroll-контейнере без листенеров на window.
        </div>
        <div className={s.note}>
          <strong>NavShell.forceLayout</strong> предусмотрен для preview-фреймов
          и тестов: media query вычисляется по <code>window.innerWidth</code>,
          а не по размеру фрейма, поэтому без override layout всегда был бы
          desktop в этой витрине.
        </div>
        <div className={s.note}>
          <strong>staticPosition</strong> — общий prop для всех nav-компонентов.
          Превращает <code>position: fixed/sticky</code> в{' '}
          <code>absolute/relative</code> чтобы не вылезать из preview-фрейма.
          В production эту проп не используем.
        </div>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function HeaderDemo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s['header-demo-frame']}>
      <div className={s['demo-label']}>{label}</div>
      {children}
      <div className={s['header-demo-body']}>
        <p>Scroll этого блока активирует glass-blur состояние header'а.</p>
        <div className={s['header-demo-fill']}>scroll me</div>
      </div>
    </div>
  );
}

function CardStub({ index }: { index: number }) {
  const titles = [
    'Соня заметила фото',
    'Новое настроение',
    'Запланирована встреча',
    'Подарок отправлен',
    'Сообщение от компаньона',
    'Игра завершена',
  ];
  const texts = [
    'Поделилась мыслью о вчерашнем дне. Открой чат, чтобы ответить.',
    'Сегодня настроение: вдохновлённое. Подарок повысит intimacy.',
    'Через 2 часа созвон. Соня готовится — выбирает наряд.',
    'Букет роз доставлен. Соня в восторге. Проверь чат.',
    'Доброе утро · Как спал?',
    'Викторина на знание любимых фильмов · +120 XP.',
  ];
  return (
    <div className={s['card-stub']}>
      <p className={s['card-stub-title']}>{titles[index % titles.length]}</p>
      <p className={s['card-stub-text']}>{texts[index % texts.length]}</p>
    </div>
  );
}
