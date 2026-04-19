import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Eye, Star, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Avatar } from './ui/Avatar';
import styles from './NotificationBanner.module.css';

const ICONS = {
  like: <Heart size={14} />,
  message: <MessageCircle size={14} />,
  view: <Eye size={14} />,
  favorite: <Star size={14} />,
} as const;

export default function NotificationBanner() {
  const { currentBanner, clearBanner } = useNotifications();
  const navigate = useNavigate();

  const handleClick = () => {
    if (!currentBanner) return;
    if (currentBanner.type === 'message' && currentBanner.girl_id) {
      navigate(`/chat?girl=${currentBanner.girl_id}`);
    } else {
      navigate('/notifications');
    }
    clearBanner();
  };

  return (
    <AnimatePresence>
      {currentBanner && (
        <motion.div
          className={styles.banner}
          role="alert"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <button type="button" className={styles.content} onClick={handleClick}>
            <div className={styles.avatarWrap}>
              <Avatar src={currentBanner.avatar} alt={currentBanner.name} size="sm" />
              <span className={styles.typeIcon}>{ICONS[currentBanner.type]}</span>
            </div>
            <div className={styles.text}>
              <p className={styles.title}>
                <strong>{currentBanner.name}</strong> {currentBanner.text}
              </p>
            </div>
          </button>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={(e) => {
              e.stopPropagation();
              clearBanner();
            }}
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
