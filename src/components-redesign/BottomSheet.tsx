/**
 * BottomSheet — redesign primitive.
 *
 * Особенности:
 * • Drag-to-dismiss + framer-motion spring (snap-points поддерживаются опционально).
 * • Focus trap: при открытии фокусируется первый focusable элемент (или sheet),
 *   при закрытии возвращается к элементу, который был активен до открытия.
 * • Tab/Shift+Tab циклически переключаются ВНУТРИ sheet.
 * • Header полностью draggable (а не только handle), как у Apple/Mamba.
 * • snapPoints: массив [0, 0.5, 0.9] относительно высоты экрана. По умолчанию [1] (full).
 * • closeOnBackdrop: клик по overlay закрывает (default: true).
 * • Escape закрывает.
 * • Body scroll lock.
 *
 * Usage:
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="Настройки">
 *     <p>Content</p>
 *   </BottomSheet>
 *
 *   <BottomSheet open={open} onClose={close} snapPoints={[0.5, 0.9]} initialSnap={0}>
 *     ...
 *   </BottomSheet>
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  AnimatePresence,
  useDragControls,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion';
import s from './BottomSheet.module.css';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Sticky footer area (e.g. action buttons) */
  footer?: ReactNode;
  children: ReactNode;
  /** Allow closing by clicking the backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /**
   * Optional snap points as fractions of viewport height (0..1].
   * Example: [0.5, 0.9] — половина и почти весь экран.
   * При drag вниз с последнего snap → закрывается.
   */
  snapPoints?: number[];
  /** Index в snapPoints на старте (default: последний). */
  initialSnap?: number;
  /** Auto-focus первый focusable элемент при открытии (default: true). */
  autoFocus?: boolean;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('inert') && el.offsetParent !== null,
  );
}

export default function BottomSheet({
  open,
  onClose,
  title,
  footer,
  children,
  closeOnBackdrop = true,
  snapPoints,
  initialSnap,
  autoFocus = true,
}: Props) {
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Snap state — храним index текущего snap (от 0 до snapPoints.length - 1)
  const effectiveSnaps = useMemo(() => snapPoints ?? [1], [snapPoints]);
  const [snapIndex, setSnapIndex] = useState(
    initialSnap ?? effectiveSnaps.length - 1,
  );

  // Сохраняем фокус ДО открытия
  useLayoutEffect(() => {
    if (open) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    // Компенсируем исчезновение скроллбара чтобы layout не прыгал
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // Escape close
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap + initial focus + return focus
  useEffect(() => {
    if (!open || !sheetRef.current) return;
    const sheet = sheetRef.current;

    if (autoFocus) {
      // Ждём пока motion.div отрендерится и анимация стартует
      requestAnimationFrame(() => {
        const focusables = getFocusables(sheet);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          sheet.focus();
        }
      });
    }

    return () => {
      // Возвращаем фокус к тому элементу что был до открытия
      const prev = previousActiveElementRef.current;
      if (prev && document.body.contains(prev)) {
        prev.focus();
      }
    };
  }, [open, autoFocus]);

  // Tab key handler — circular focus inside sheet
  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !sheetRef.current) return;
    const focusables = getFocusables(sheetRef.current);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Overlay opacity tied to drag offset — зарезервировано для будущего drag-fade.
  // Сейчас не используем чтобы избежать конфликта с AnimatePresence variants.
  void useTransform(y, [0, 300], [1, 0.4]);

  // Drag end → решаем: закрыть, snap к ближайшей точке, или вернуть в текущую
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;
      const vh = window.innerHeight;

      // Single-snap режим (default): обычная dismiss-логика
      if (effectiveSnaps.length === 1) {
        if (velocity > 500 || offset > 160) {
          onClose();
        } else {
          y.set(0);
        }
        return;
      }

      // Multi-snap: ищем ближайший snap к новой позиции
      const currentSnapPx = vh * effectiveSnaps[snapIndex];
      const newPositionPx = currentSnapPx - offset; // offset вниз = меньше высота

      // Если упало ниже самого маленького snap И drag быстрый/далекий → закрыть
      const minSnapPx = vh * effectiveSnaps[0];
      if (newPositionPx < minSnapPx * 0.5 || velocity > 700) {
        onClose();
        return;
      }

      // Найти ближайший snap (по высоте sheet, не по offset)
      let nearestIdx = 0;
      let minDist = Infinity;
      effectiveSnaps.forEach((snap, idx) => {
        const dist = Math.abs(vh * snap - newPositionPx);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });
      setSnapIndex(nearestIdx);
      y.set(0);
    },
    [effectiveSnaps, snapIndex, onClose, y],
  );

  // Высота sheet для текущего snap
  const sheetMaxHeight =
    effectiveSnaps.length > 1
      ? `${effectiveSnaps[snapIndex] * 100}dvh`
      : '92dvh';

  const sheetVariants = reducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { y: '100%' },
        visible: {
          y: 0,
          transition: {
            type: 'spring' as const,
            stiffness: 380,
            damping: 38,
            mass: 0.8,
          },
        },
        exit: {
          y: '100%',
          transition: { type: 'spring' as const, stiffness: 400, damping: 40 },
        },
      };

  // Проверка SSR safety
  if (typeof document === 'undefined') return null;

  // Drag start от header или handle
  const startDrag = (e: ReactPointerEvent) => {
    dragControls.start(e);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={s['rd-sheet-overlay']}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />

          <motion.div
            ref={sheetRef}
            className={s['rd-sheet']}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'rd-sheet-title' : undefined}
            aria-label={title ? undefined : 'Sheet'}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.3 }}
            onDragEnd={handleDragEnd}
            style={{ y, maxHeight: sheetMaxHeight }}
          >
            {/* Drag region: handle + header. Pointer events начинают drag. */}
            <div
              className={s['rd-sheet-drag-region']}
              onPointerDown={startDrag}
              aria-hidden="true"
            >
              <div className={s['rd-sheet-handle']} />
              {title && (
                <div className={s['rd-sheet-header']}>
                  <h2 id="rd-sheet-title" className={s['rd-sheet-title']}>
                    {title}
                  </h2>
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className={s['rd-sheet-content']}>{children}</div>

            {footer && <div className={s['rd-sheet-footer']}>{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
