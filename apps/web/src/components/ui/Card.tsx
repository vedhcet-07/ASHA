import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

/* Tactile elevated surfaces — alabaster cards with soft borders,
   rounded-2xl/3xl and multi-layered tactile shadows. */

type Tone = 'default' | 'inset' | 'tint';
type Hover = 'none' | 'lift';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  hover?: Hover;
  interactive?: boolean;
}

const toneClass: Record<Tone, string> = {
  default: 'bg-surface border-stone-200/80 shadow-tactile',
  inset: 'bg-inset border-stone-200/60 shadow-tactile-sm',
  tint: 'bg-inset-2 border-stone-200/60',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  tone = 'default',
  hover = 'none',
  interactive = false,
  ...rest
}) => {
  const reduce = useReducedMotion();
  const base = cn(
    'rounded-3xl border',
    toneClass[tone],
    (hover === 'lift' || interactive) && 'transition-all duration-300',
    hover === 'lift' && !reduce && 'hover:-translate-y-0.5 hover:shadow-tactile-lg',
    interactive && 'cursor-pointer',
    className,
  );

  if ((hover === 'lift' || interactive) && !reduce) {
    return (
      <motion.div
        className={base}
        whileTap={interactive ? { scale: 0.985 } : undefined}
        {...(rest as any)}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <div className={base} {...rest}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => (
  <div className={cn('p-5 sm:p-6', className)} {...rest}>
    {children}
  </div>
);

/** Compact padded section header used inside cards (e.g. table titles). */
export const CardSectionHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => (
  <div
    className={cn(
      'flex items-center gap-2 border-b border-stone-200/70 bg-inset/60 px-5 py-3.5 sm:px-6',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
