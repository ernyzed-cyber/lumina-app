// src/pages/Released.tsx
// Показывается когда reaper освободил assignment.
// Юзер видит сообщение и кнопку вернуться в ленту.
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartCrack, RotateCcw } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import Navbar from '../components/layout/Navbar';
import s from './Released.module.css';

export default function Released() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className={s.page}>
        <Navbar />
        <main className={s.main} id="main-content">
          <motion.div
            className={s.card}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, type: 'spring' }}
          >
            <div className={s.iconWrap}>
              <HeartCrack size={52} strokeWidth={1.5} />
            </div>
            <h1 className={s.title}>Она ушла</h1>
            <p className={s.subtitle}>
              Ты не писал слишком долго, и она решила двигаться дальше.
              Это нормально — иногда так бывает.
            </p>
            <p className={s.hint}>
              Но где-то там ждёт другая девушка, которая сможет стать
              важной частью твоей жизни.
            </p>
            <button
              className={s.btn}
              onClick={() => navigate('/feed', { replace: true })}
            >
              <RotateCcw size={18} />
              Найти новую
            </button>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
