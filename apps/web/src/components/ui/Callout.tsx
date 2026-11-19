import React from 'react';
import { cn } from '@/lib/utils/cn';
import type { BadgeTone } from './Badge';

/* Warm callouts/alerts — replace Chakra Alert/AlertIcon. Soft tinted
   surface with a colored left accent rail. */

const calloutTone: Record<BadgeTone, { wrap: string; rail: string; icon: string }> = {
  neutral: { wrap: 'bg-stone-100/70 border-stone-200', rail: 'bg-stone-400', icon: 'text-stone-600' },
  ink: { wrap: 'bg-ink/5 border-ink/10', rail: 'bg-ink', icon: 'text-ink' },
  accent: { wrap: 'bg-accent/8 border-accent/20', rail: 'bg-accent', icon: 'text-accent' },
  success: { wrap: 'bg-success/8 border-success/20', rail: 'bg-success', icon: 'text-success' },
  warning: { wrap: 'bg-warning/10 border-warning/25', rail: 'bg-warning', icon: 'text-warning' },
  danger: { wrap: 'bg-danger/8 border-danger/20', rail: 'bg-danger', icon: 'text-danger' },
  info: { wrap: 'bg-info/8 border-info/20', rail: 'bg-info', icon: 'text-info' },
  violet: { wrap: 'bg-violet/8 border-violet/20', rail: 'bg-violet', icon: 'text-violet' },
};

export const Callout: React.FC<{
  tone?: BadgeTone;
  icon?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}> = ({ tone = 'info', icon, title, children, className }) => {
  const t = calloutTone[tone];
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border pl-4 pr-4 py-3.5',
        t.wrap,
        className,
      )}
    >
      <span className={cn('absolute left-0 top-0 h-full w-1', t.rail)} />
      <div className="flex items-start gap-2.5">
        {icon && <div className={cn('mt-0.5 shrink-0', t.icon)}>{icon}</div>}
        <div className="min-w-0">
          {title && <p className="text-sm font-bold text-ink">{title}</p>}
          {children && <div className="text-sm text-muted">{children}</div>}
        </div>
      </div>
    </div>
  );
};
