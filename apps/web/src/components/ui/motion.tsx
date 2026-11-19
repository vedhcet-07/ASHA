import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';

/* ============================================================
   Motion primitives — staggered section/card entrances with
   subtle opacity + gentle vertical rise. Respects
   prefers-reduced-motion by short-circuiting to instant renders.
   ============================================================ */

const EASE = [0.22, 1, 0.36, 1] as const;

export const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

interface MotionContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  amount?: number;
  once?: boolean;
}

/** Wraps a grid/list of cards and staggers their entrance when scrolled in. */
export const MotionContainer: React.FC<MotionContainerProps> = ({
  children,
  className,
  amount = 0.15,
  once = true,
  ...rest
}) => {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  );
};

interface MotionItemProps extends React.HTMLAttributes<HTMLDivElement> {}

/** A single staggered child inside a MotionContainer. */
export const MotionItem: React.FC<MotionItemProps> = ({
  children,
  className,
  ...rest
}) => {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div className={className} variants={itemVariants} {...(rest as any)}>
      {children}
    </motion.div>
  );
};

/** Single element fade-up entrance (use outside a container). */
export const FadeUp: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { delay?: number; amount?: number }
> = ({ children, className, delay = 0, amount = 0.2, ...rest }) => {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      initial="hidden"
      animate="show"
      transition={{ delay }}
      viewport={{ once: true, amount }}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  );
};
