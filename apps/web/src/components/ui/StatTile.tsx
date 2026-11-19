import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import type { BadgeTone } from './Badge';

/* KPI / stat tile — the dominant surface on dashboards and sheets.
   Warm alabaster card, large ink value, taupe label, tinted icon chip. */

const chipTone: Record<BadgeTone, string> = {
  neutral: 'bg-stone-200/70 text-stone-600',
  ink: 'bg-ink/8 text-ink',
  accent: 'bg-accent/12 text-accent',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/14 text-warning',
  danger: 'bg-danger/12 text-danger',
  info: 'bg-info/12 text-info',
  violet: 'bg-violet/12 text-violet',
};

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: BadgeTone;
  emphasis?: boolean;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  hint,
  icon,
  tone = 'accent',
  emphasis = false,
  className,
}) => {
  const reduce = useReducedMotion();
  const base = cn(
    'rounded-3xl border border-stone-200/80 bg-surface p-5 shadow-tactile transition-all duration-300',
    !reduce && 'hover:-translate-y-0.5 hover:shadow-tactile-lg',
    emphasis && 'bg-inset border-stone-200/60',
    className,
  );

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-2">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-ink">{value}</p>
        </div>
        {icon && (
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', chipTone[tone])}>
            {icon}
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </>
  );

  if (reduce) return <div className={base}>{inner}</div>;
  return (
    <motion.div className={base} whileTap={{ scale: 0.99 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      {inner}
    </motion.div>
  );
};
