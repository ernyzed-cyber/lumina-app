/**
 * PreviewIndex — главная страница /__preview.
 *
 * Каталог всех redesign-страниц. На старте этапа 0 страниц нет —
 * показываем заглушку «Coming soon» с описанием этапов.
 *
 * Когда добавляются новые pages-redesign/* — сюда добавляется новая
 * запись в массиве previewPages, и она автоматически появляется в каталоге.
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Home, Search, MessageSquareDashed, User, Settings,
  Bell, ShoppingBag, Clock, HeartCrack, FileText, LayoutGrid,
  BookHeart,
  type LucideIcon,
} from 'lucide-react';

type PreviewEntry = {
  /** относительный path внутри /__preview */
  slug: string;
  /** имя страницы */
  title: string;
  /** короткое описание */
  description: string;
  /** иконка lucide */
  icon: LucideIcon;
  /** статус разработки */
  status: 'planned' | 'in-progress' | 'ready';
  /** этап из плана */
  stage: number;
};

const previewPages: PreviewEntry[] = [
  {
    slug: 'primitives',
    title: 'Design primitives',
    description: 'Каталог Button / Input / Avatar / GlassCard со всеми вариантами и размерами.',
    icon: LayoutGrid,
    status: 'ready',
    stage: 1,
  },
  {
    slug: 'nav',
    title: 'Navigation',
    description: 'BottomTabBar (mobile) + sidebar (desktop) + PageHeader. Состояния assigned/no-assigned.',
    icon: LayoutGrid,
    status: 'ready',
    stage: 2,
  },
  {
    slug: 'landing',
    title: 'Landing',
    description: 'Главная маркетинговая страница: Hero + How it works + Mockups + Social proof + FAQ + CTA.',
    icon: Sparkles,
    status: 'ready',
    stage: 3,
  },
  {
    slug: 'auth',
    title: 'Auth & Onboarding',
    description: 'Split-screen вход + 5-шаговый онбординг с прогресс-баром.',
    icon: User,
    status: 'ready',
    stage: 4,
  },
  {
    slug: 'home',
    title: 'Companion Home',
    description: 'Post-assignment hero portrait + sticky collapse + memory stream.',
    icon: Home,
    status: 'ready',
    stage: 5,
  },
  {
    slug: 'memories',
    title: 'Memories',
    description: 'Vertical timeline of every quote and milestone she kept — sticky month headers, mood-tinted nodes, accordion context.',
    icon: BookHeart,
    status: 'ready',
    stage: 6,
  },
  {
    slug: 'feed',
    title: 'Feed (discovery)',
    description: 'Tinder-like: full-bleed photos + glass action bar + swipe actions NOPE/LIKE/SUPER.',
    icon: Home,
    status: 'ready',
    stage: 5,
  },
  {
    slug: 'search',
    title: 'Search',
    description: 'Sticky search-bar + лента «Online сейчас» + сетка карточек 2/3/4 колонки.',
    icon: Search,
    status: 'in-progress',
    stage: 6,
  },
  {
    slug: 'girl-drawer',
    title: 'Girl profile drawer',
    description: 'Photo gallery 3–5 swipeable + compatibility ring + lifestyle-секции.',
    icon: User,
    status: 'planned',
    stage: 6,
  },
  {
    slug: 'chat',
    title: 'Chat',
    description: 'Bubble layout, mood-tinted side rule, sleep-mode visual shift, hairline daily-limit progress.',
    icon: MessageSquareDashed,
    status: 'ready',
    stage: 7,
  },
  {
    slug: 'profile',
    title: 'My profile',
    description: 'Self-profile editor. Cosmic hero + percentage sheet bottom-sheets.',
    icon: User,
    stage: 8,
    status: 'ready',
  },
  {
    slug: 'settings',
    title: 'Settings',
    description: 'Карточки-секции + theme switcher с превью.',
    icon: Settings,
    status: 'planned',
    stage: 8,
  },
  {
    slug: 'notifications',
    title: 'Notifications',
    description: 'Группировки по дате + swipe-to-delete + tabs.',
    icon: Bell,
    status: 'planned',
    stage: 8,
  },
  {
    slug: 'shop',
    title: 'Shop',
    description: 'Pack cards 2×2 / 4×1 + animated balance count-up.',
    icon: ShoppingBag,
    status: 'planned',
    stage: 9,
  },
  {
    slug: 'waitlist',
    title: 'Waitlist',
    description: 'Hero illustration + queue position + soft animation.',
    icon: Clock,
    status: 'planned',
    stage: 9,
  },
  {
    slug: 'released',
    title: 'Released',
    description: 'Эмоциональная сцена «Она ушла» + CTA «Найти новую». БЕЗ countdown.',
    icon: HeartCrack,
    status: 'planned',
    stage: 9,
  },
  {
    slug: 'legal',
    title: 'Legal pages',
    description: 'Terms / Privacy / Community Guidelines.',
    icon: FileText,
    status: 'planned',
    stage: 9,
  },
];

const statusMeta: Record<PreviewEntry['status'], { label: string; color: string; bg: string }> = {
  planned: { label: 'Planned', color: 'var(--rd-text-muted)', bg: 'var(--rd-bg-surface-muted)' },
  'in-progress': { label: 'In progress', color: '#B45309', bg: 'rgba(251, 191, 36, 0.15)' },
  ready: { label: 'Ready ✓', color: '#047857', bg: 'rgba(52, 211, 153, 0.15)' },
};

export default function PreviewIndex() {
  return (
    <div style={{ padding: '32px 20px 80px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 40 }}
      >
        <h1
          className="rd-display"
          style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: 12 }}
        >
          Lumina — <span className="rd-gradient-text">Mamba-inspired</span> redesign
        </h1>
        <p
          className="rd-body"
          style={{
            color: 'var(--rd-text-secondary)',
            fontSize: 16,
            maxWidth: 720,
            lineHeight: 1.6,
          }}
        >
          Staging-каталог редизайна. Каждая страница ниже разрабатывается изолированно
          в <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>src/pages-redesign/</code>{' '}
          и попадёт в production только после твоего «ок». Бизнес-логика проекта
          (моногамия, reaper, waitlist, edge functions) НЕ затрагивается.
        </p>
      </motion.section>

      {/* Token sample — показывает что CSS работает */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          padding: 20,
          borderRadius: 'var(--rd-radius-card)',
          background: 'var(--rd-bg-surface)',
          border: '1px solid var(--rd-border-subtle)',
          boxShadow: 'var(--rd-shadow-sm)',
          marginBottom: 32,
        }}
      >
        <div className="rd-eyebrow" style={{ marginBottom: 8 }}>
          Stage 0 — Foundation ✓
        </div>
        <p style={{ fontSize: 14, color: 'var(--rd-text-secondary)', margin: 0 }}>
          Дизайн-токены загружены. Тема переключается из toolbar сверху. Если ты видишь
          мягкий лавандовый фон, шрифт Inter и градиент в логотипе — значит CSS-scope{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>.redesign-root</code>{' '}
          работает корректно.
        </p>
      </motion.section>

      {/* Pages grid */}
      <h2
        className="rd-eyebrow"
        style={{ marginBottom: 16 }}
      >
        Страницы редизайна
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {previewPages.map((page, i) => (
          <PageCard key={page.slug} page={page} index={i} />
        ))}
      </div>

      {/* Footer hint */}
      <p
        style={{
          marginTop: 40,
          fontSize: 12,
          color: 'var(--rd-text-muted)',
          textAlign: 'center',
        }}
      >
        Этот каталог доступен только в dev-режиме (<code>import.meta.env.DEV</code>) и не
        попадает в production-билд.
      </p>
    </div>
  );
}

function PageCard({ page, index }: { page: PreviewEntry; index: number }) {
  const meta = statusMeta[page.status];
  const Icon = page.icon;
  const isPlanned = page.status === 'planned';

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      whileHover={isPlanned ? undefined : { y: -4, boxShadow: 'var(--rd-shadow-lg)' }}
      style={{
        padding: 18,
        borderRadius: 'var(--rd-radius-card)',
        background: 'var(--rd-bg-surface)',
        border: '1px solid var(--rd-border-subtle)',
        boxShadow: 'var(--rd-shadow-xs)',
        height: '100%',
        opacity: isPlanned ? 0.65 : 1,
        cursor: isPlanned ? 'not-allowed' : 'pointer',
        transition: 'box-shadow var(--rd-duration-default) var(--ease-smooth)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--rd-fill-brand-soft)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--rd-text-accent)',
          }}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 'var(--rd-radius-pill)',
            background: meta.bg,
            color: meta.color,
          }}
        >
          {meta.label}
        </span>
      </div>

      <h3
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 6,
          color: 'var(--rd-text-primary)',
        }}
      >
        {page.title}
      </h3>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--rd-text-secondary)',
          margin: 0,
        }}
      >
        {page.description}
      </p>
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--rd-text-muted)',
          letterSpacing: '0.04em',
        }}
      >
        Stage {page.stage}
      </div>
    </motion.div>
  );

  if (isPlanned) return card;

  return <Link to={`/__preview/${page.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>{card}</Link>;
}
