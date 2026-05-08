/**
 * Primitives — /__preview/primitives
 *
 * Живая витрина всех redesign-примитивов: Button, Input, Avatar,
 * GlassCard, BottomSheet + typography & color tokens.
 */

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Star, ArrowRight, Mail, Lock, User, Search, Sparkles, X,
  Trash2, Bell, Filter,
} from 'lucide-react';
import Button from '../components-redesign/Button';
import Input from '../components-redesign/Input';
import Avatar, { type AvatarRingTone } from '../components-redesign/Avatar';
import GlassCard from '../components-redesign/GlassCard';
import BottomSheet from '../components-redesign/BottomSheet';
import { mockGirls } from '../preview/mocks';
import s from './Primitives.module.css';

// ────────────────────────────────────────────────────────────────────────────
// Section / Row helpers
// ────────────────────────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={s.section}
    >
      <header className={s['section-head']}>
        <h2 className={s['section-title']}>{title}</h2>
        {subtitle && <p className={s['section-subtitle']}>{subtitle}</p>}
      </header>
      {children}
    </motion.section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <div className={s['row-label']}>{label}</div>
      <div className={s['row-content']}>{children}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
const RING_TONES: { tone: AvatarRingTone; label: string }[] = [
  { tone: 'brand', label: 'brand' },
  { tone: 'success', label: 'success' },
  { tone: 'warm', label: 'warm' },
  { tone: 'cool', label: 'cool' },
];

const COLOR_TOKENS = [
  '--rd-bg-page',
  '--rd-bg-surface',
  '--rd-bg-surface-soft',
  '--rd-bg-elevated',
  '--rd-fill-brand',
  '--rd-fill-brand-hover',
  '--rd-fill-destructive',
  '--rd-text-primary',
  '--rd-text-secondary',
  '--rd-text-accent',
  '--rd-border-default',
  '--rd-border-brand',
  '--rd-status-online',
  '--rd-status-error',
  '--rd-status-success',
  '--rd-status-warning',
  '--rd-status-info',
];

// ────────────────────────────────────────────────────────────────────────────
export default function Primitives() {
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [snapSheetOpen, setSnapSheetOpen] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState(false);

  function simulateLoad() {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2200);
  }

  return (
    <div className={s.page}>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={s.hero}
      >
        <div className="rd-eyebrow">Stage 1 · Design primitives</div>
        <h1 className={`rd-display ${s['hero-title']}`}>
          Component <span className="rd-gradient-text">Showcase</span>
        </h1>
        <p className={s['hero-lede']}>
          Все базовые primitives: Button, Input, Avatar, GlassCard, BottomSheet.
          Переключи тему в toolbar чтобы проверить dark/light/auto.
        </p>
      </motion.div>

      {/* ── BUTTON ─────────────────────────────────────────────────── */}
      <Section
        title="Button"
        subtitle="5 вариантов × 3 размера · loading без прыжка размера · iconOnly · href"
      >
        <Row label="Варианты (md)">
          <Button variant="gradient">Gradient</Button>
          <Button variant="glass">Glass</Button>
          <Button variant="solid">Solid</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive" iconLeft={<Trash2 size={16} />}>Удалить</Button>
        </Row>

        <Row label="Размеры — gradient">
          <Button variant="gradient" size="sm">Small</Button>
          <Button variant="gradient" size="md">Medium</Button>
          <Button variant="gradient" size="lg">Large</Button>
        </Row>

        <Row label="С иконками">
          <Button variant="gradient" iconLeft={<Heart size={16} />}>Нравится</Button>
          <Button variant="ghost" iconRight={<ArrowRight size={16} />}>Далее</Button>
          <Button variant="glass" iconLeft={<Star size={16} />} iconRight={<Sparkles size={14} />}>
            Premium
          </Button>
        </Row>

        <Row label="Icon-only (круглые)">
          <Button variant="gradient" iconOnly size="sm" aria-label="Лайк">
            <Heart size={15} />
          </Button>
          <Button variant="glass" iconOnly size="md" aria-label="В избранное">
            <Star size={17} />
          </Button>
          <Button variant="ghost" iconOnly size="lg" aria-label="Закрыть">
            <X size={20} />
          </Button>
          <Button variant="destructive" iconOnly size="md" aria-label="Удалить">
            <Trash2 size={17} />
          </Button>
        </Row>

        <Row label="Состояния">
          <Button variant="gradient" loading={loadingBtn} onClick={simulateLoad}>
            {loadingBtn ? 'Загрузка…' : 'Нажми меня'}
          </Button>
          <Button variant="solid" disabled>Disabled</Button>
          <Button href="#" variant="ghost" iconRight={<ArrowRight size={16} />}>
            Как ссылка (a href)
          </Button>
        </Row>

        <Row label="Full width">
          <div style={{ width: '100%', maxWidth: 360 }}>
            <Button variant="gradient" size="lg" fullWidth iconLeft={<Sparkles size={18} />}>
              Начать знакомство
            </Button>
          </div>
        </Row>
      </Section>

      {/* ── INPUT ──────────────────────────────────────────────────── */}
      <Section
        title="Input"
        subtitle="Floating label · password toggle · clearable · autofill-safe · error/success"
      >
        <div className={s['grid-280']}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            iconLeft={<Mail size={16} />}
            autoComplete="email"
          />

          <Input
            label="Пароль"
            password
            iconLeft={<Lock size={16} />}
            autoComplete="current-password"
          />

          <Input
            label="Поиск"
            iconLeft={<Search size={16} />}
            clearable
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />

          <Input
            label="Имя пользователя"
            status="error"
            hint="Имя уже занято"
            iconLeft={<User size={16} />}
            defaultValue="sofia123"
          />

          <Input
            label="Ник"
            status="success"
            hint="Имя свободно"
            iconLeft={<User size={16} />}
            defaultValue="lumina_user"
          />

          <Input
            label="Заблокировано"
            disabled
            defaultValue="нельзя изменить"
          />

          <Input
            label="Маленький размер"
            inputSize="sm"
            iconLeft={<Filter size={14} />}
          />

          <Input
            label="С кнопкой-действием"
            iconRight={<Bell size={16} />}
            onIconRightClick={() => alert('Уведомления!')}
            iconRightLabel="Уведомления"
          />

          <div className={s['span-full']}>
            <Input
              as="textarea"
              label="О себе"
              rows={4}
              hint="До 300 символов"
            />
          </div>
        </div>
      </Section>

      {/* ── AVATAR ─────────────────────────────────────────────────── */}
      <Section
        title="Avatar"
        subtitle="6 размеров · online + verified одновременно · 4 ring-тона · skeleton · group"
      >
        <Row label="Размеры (с фото)">
          {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((sz) => (
            <Avatar
              key={sz}
              src={mockGirls[0].photo}
              name={mockGirls[0].name}
              size={sz}
            />
          ))}
        </Row>

        <Row label="Online + Verified одновременно">
          {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
            <Avatar
              key={sz}
              src={mockGirls[1].photo}
              name={mockGirls[1].name}
              size={sz}
              online
              verified
            />
          ))}
        </Row>

        <Row label="Ring tones">
          {RING_TONES.map(({ tone, label }, i) => (
            <div key={tone} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <Avatar
                src={mockGirls[i % mockGirls.length].photo}
                name={mockGirls[i % mockGirls.length].name}
                size="lg"
                ring
                ringTone={tone}
              />
              <span style={{ fontSize: 11, color: 'var(--rd-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {label}
              </span>
            </div>
          ))}
        </Row>

        <Row label="Initials fallback">
          {['Алина Ветрова', 'M', 'Аня Б', '🎨 Артист', '', undefined as unknown as string].map((n, i) => (
            <Avatar key={i} name={n} size="md" />
          ))}
        </Row>

        <Row label="Skeleton (loading)">
          {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
            <Avatar key={sz} loading size={sz} />
          ))}
        </Row>

        <Row label="Avatar.Group (max=3)">
          <Avatar.Group max={3}>
            {mockGirls.slice(0, 5).map((g) => (
              <Avatar key={g.id} src={g.photo} name={g.name} size="md" />
            ))}
          </Avatar.Group>
        </Row>
      </Section>

      {/* ── GLASS CARD ─────────────────────────────────────────────── */}
      <Section
        title="GlassCard"
        subtitle="glass · solid · hover lift · gradient accent · polymorphic as=button|a"
      >
        <div className={s['glass-sandbox']}>
          <GlassCard>
            <p className={s['card-eyebrow']}>Glass (default)</p>
            <p className={s['card-text']}>
              Blur + полупрозрачный фон. Работает поверх цветных поверхностей.
            </p>
          </GlassCard>

          <GlassCard hoverable>
            <p className={s['card-eyebrow']}>Hoverable</p>
            <p className={s['card-text']}>Наведи мышь — карточка поднимается.</p>
          </GlassCard>

          <GlassCard variant="solid" hoverable>
            <p className={s['card-eyebrow']}>Solid</p>
            <p className={s['card-text']}>Без blur — для контекстов без фото под ним.</p>
          </GlassCard>

          <GlassCard accent hoverable>
            <p className={s['card-eyebrow']}>Accent border</p>
            <p className={s['card-text']}>
              Градиентная рамка через CSS mask (без z-index хака).
            </p>
          </GlassCard>

          <GlassCard
            as="button"
            hoverable
            onClick={() => alert('Card clicked')}
          >
            <p className={s['card-eyebrow']}>as="button"</p>
            <p className={s['card-text']}>Кликни — это настоящая &lt;button&gt;.</p>
          </GlassCard>

          <GlassCard as="a" href="#" hoverable accent>
            <p className={s['card-eyebrow']}>as="a"</p>
            <p className={s['card-text']}>Это &lt;a href&gt; — ведёт куда нужно.</p>
          </GlassCard>
        </div>
      </Section>

      {/* ── BOTTOM SHEET ───────────────────────────────────────────── */}
      <Section
        title="BottomSheet"
        subtitle="Drag header · focus trap · return focus · snap points · scroll lock"
      >
        <Row label="Открыть шторку">
          <Button variant="gradient" onClick={() => setSheetOpen(true)}>
            Открыть BottomSheet
          </Button>
          <Button variant="glass" onClick={() => setSnapSheetOpen(true)}>
            Со snap-points
          </Button>
        </Row>

        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Пример шторки"
          footer={
            <Button variant="gradient" fullWidth onClick={() => setSheetOpen(false)}>
              Готово
            </Button>
          }
        >
          <div className={s['sheet-body']}>
            <p className={s['card-text']}>
              Тяни весь header (а не только handle), смахивай вниз чтобы закрыть.
              Также закрывается по клику на оверлей или Escape. Tab/Shift+Tab —
              фокус циркулирует внутри. После закрытия фокус возвращается.
            </p>
            <Input label="Поиск внутри шторки" iconLeft={<Search size={16} />} clearable />
            <div className={s['sheet-cta-row']}>
              <Button variant="ghost" size="sm" onClick={() => setSheetOpen(false)}>
                Отмена
              </Button>
              <Button variant="glass" size="sm">Опция 2</Button>
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <GlassCard key={i} variant="solid" padding="sm">
                <p className={s['card-text-sm']}>Элемент списка #{i + 1} — скролл внутри</p>
              </GlassCard>
            ))}
          </div>
        </BottomSheet>

        <BottomSheet
          open={snapSheetOpen}
          onClose={() => setSnapSheetOpen(false)}
          title="Snap points: 50% / 90%"
          snapPoints={[0.5, 0.9]}
          initialSnap={0}
        >
          <div className={s['sheet-body']}>
            <p className={s['card-text']}>
              Тяни вверх до 90% или вниз — поймает 50%. Если потянуть ещё ниже
              50% или быстро смахнуть — закроется.
            </p>
            {Array.from({ length: 20 }, (_, i) => (
              <GlassCard key={i} variant="solid" padding="sm">
                <p className={s['card-text-sm']}>Контент #{i + 1}</p>
              </GlassCard>
            ))}
          </div>
        </BottomSheet>
      </Section>

      {/* ── TYPOGRAPHY ─────────────────────────────────────────────── */}
      <Section title="Typography" subtitle="rd-display · rd-eyebrow · rd-body · rd-gradient-text">
        <GlassCard variant="solid" padding="lg">
          <div className={s['type-stack']}>
            <h1 className={`rd-display ${s['type-display-xl']}`}>
              Display / Hero — <span className="rd-gradient-text">Lumina</span>
            </h1>
            <h2 className={`rd-display ${s['type-display-md']}`}>Display medium</h2>
            <div className="rd-eyebrow">Eyebrow label · Stage 1</div>
            <p className="rd-body" style={{ margin: 0, maxWidth: 480, lineHeight: 1.55 }}>
              Body text — Inter 15px / 1.55. Цвет:{' '}
              <code className={s['type-mono']}>--rd-text-primary</code>.
            </p>
            <p className={s['type-secondary']}>
              Secondary text — немного тише, для вспомогательного контента.
            </p>
            <p className={s['type-muted']}>
              Muted text — хинты, метаданные, timestamps.
            </p>
          </div>
        </GlassCard>
      </Section>

      {/* ── COLOR TOKENS ───────────────────────────────────────────── */}
      <Section title="Color tokens" subtitle="Все ключевые --rd-* переменные активной темы">
        <div className={s['grid-130']}>
          {COLOR_TOKENS.map((v) => (
            <div key={v} className={s.swatch}>
              <div
                className={s['swatch-chip']}
                style={{ background: `var(${v})` }}
              />
              <span className={s['swatch-label']}>{v.replace('--rd-', '')}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
