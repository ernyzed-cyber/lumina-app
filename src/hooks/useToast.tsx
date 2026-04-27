import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastId = 0;

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <AlertCircle size={18} />,
};

const colors: Record<ToastType, string> = {
  success: 'var(--success)',
  error: 'var(--error)',
  warning: 'var(--warning)',
  info: 'var(--accent-lavender)',
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = String(++toastId);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ToastContainer = () =>
    createPortal(
      <div style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-toast)' as unknown as number,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 20px',
                maxWidth: 'min(560px, calc(100vw - 32px))',
                background: 'rgba(30,26,46,0.95)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${colors[toast.type]}33`,
                borderRadius: 'var(--radius-lg)',
                color: colors[toast.type],
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                lineHeight: 1.4,
                boxShadow: 'var(--shadow-lg)',
                pointerEvents: 'auto',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => dismissToast(toast.id)}
            >
              {<span style={{ flexShrink: 0, display: 'inline-flex' }}>{icons[toast.type]}</span>}
              <span style={{ flex: 1, minWidth: 0 }}>{toast.message}</span>
              <X size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>,
      document.body
    );

  return { showToast, ToastContainer };
}
