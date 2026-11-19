import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import type { ButtonTone } from './Button';

/* Tactile progress bar — inset track, rounded, animated fill. */

const toneFill: Record<string, string> = {
  ink: 'bg-ink',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  violet: 'bg-violet',
};

export const ProgressBar: React.FC<{
  value: number;
  tone?: ButtonTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ value, tone = 'accent', size = 'md', className }) => {
  const pct = Math.max(0, Math.min(100, value));
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-inset-2 shadow-tactile-inset', h, className)}
    >
      <motion.div
        className={cn('h-full rounded-full', toneFill[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
};
