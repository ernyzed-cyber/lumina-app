// src/pages/Waitlist.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Heart, Bell } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import Navbar from '../components/layout/Navbar';
import { useAssignment } from '../hooks/useAssignment';
import s from './Waitlist.module.css';

export default function Waitlist() {
  const navigate = useNavigate();
  const { activeGirlId, isOnWaitlist, loading, joinWaitlist, leaveWaitlist } = useAssignment();

  // Если вдруг появилась девушка (уведомление от reaper) — редирект на /chat
  useEffect(() => {
    if (!loading && activeGirlId) {
      navigate('/chat', { replace: true });
    }
  }, [activeGirlId, loading, navigate]);

  // Если не в очереди и нет девушки → встаём в очередь автоматически
  useEffect(() => {
    if (!loading && !activeGirlId && !isOnWaitlist) {
      joinWaitlist();
    }
  }, [loading, activeGirlId, isOnWaitlist, joinWaitlist]);

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />
        <main className={s.main} id="main-content">
          <motion.div
            className={s.card}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={s.iconWrap}>
              <Clock size={48} strokeWidth={1.5} />
            </div>
            <h1 className={s.title}>Все девушки сейчас заняты</h1>
            <p className={s.subtitle}>
              Ты в очереди. Как только кто-то освободится — мы пришлём уведомление.
            </p>
            <div className={s.statusRow}>
              <Bell size={16} />
              <span>{isOnWaitlist ? 'Ты в очереди' : 'Встаём в очередь...'}</span>
            </div>
            <div className={s.divider} />
            <p className={s.hint}>
              <Heart size={14} />
              Обычно ожидание занимает не более нескольких дней
            </p>
            <button
              className={s.leaveBtn}
              onClick={async () => {
                await leaveWaitlist();
                navigate('/', { replace: true });
              }}
            >
              Покинуть очередь
            </button>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
