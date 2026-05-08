import { Link } from 'react-router-dom';
import s from './OrbDock.module.css';

type DockItem = {
  id: 'home' | 'chat' | 'memories';
  label: string;
  to: string;
};

const items: DockItem[] = [
  { id: 'home', label: 'Now', to: '/__preview/home' },
  { id: 'chat', label: 'Chat', to: '/chat' },
  { id: 'memories', label: 'Memory', to: '/__preview/memories' },
];

export function OrbDock({ active }: { active: DockItem['id'] }) {
  return (
    <nav className={s.dock} aria-label="Companion navigation">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          className={`${s.item} ${item.id === active ? s.active : ''}`}
          aria-current={item.id === active ? 'page' : undefined}
        >
          <span className={s.label}>{item.label}</span>
          <span className={s.underline} aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
