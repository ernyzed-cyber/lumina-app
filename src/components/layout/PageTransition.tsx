import { type ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

interface Props {
  children: ReactNode;
  className?: string;
}

const variants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 25, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

const reducedVariants: Variants = {
  initial: { opacity: 1 },
  enter: { opacity: 1, transition: { duration: 0 } },
  exit: { opacity: 0, transition: { duration: 0 } },
};

export default function PageTransition({ children, className }: Props) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? reducedVariants : variants}
      initial="initial"
      animate="enter"
      exit="exit"
      className={className}
      style={{ minHeight: '100dvh' }}
    >
      {children}
    </motion.div>
  );
}
