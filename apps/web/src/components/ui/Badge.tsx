import React from 'react';
import { cn } from '@/lib/utils/cn';

/* Tactile badges & status pills. Statuses map to the warm semantic
   palette so every state across the SHG domain reads consistently. */

export type BadgeTone =
  | 'neutral'
  | 'ink'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: 'soft' | 'solid' | 'outline';
}

const softTone: Record<BadgeTone, string> = {
  neutral: 'bg-stone-200/70 text-stone-700',
  ink: 'bg-ink/8 text-ink',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  violet: 'bg-violet/10 text-violet',
};

const solidTone: Record<BadgeTone, string> = {
  neutral: 'bg-stone-400 text-white',
  ink: 'bg-ink text-surface',
  accent: 'bg-accent text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  info: 'bg-info text-white',
  violet: 'bg-violet text-white',
};

const outlineTone: Record<BadgeTone, string> = {
  neutral: 'border border-stone-300 text-stone-700',
  ink: 'border border-ink/25 text-ink',
  accent: 'border border-accent/30 text-accent',
  success: 'border border-success/30 text-success',
  warning: 'border border-warning/30 text-warning',
  danger: 'border border-danger/30 text-danger',
  info: 'border border-info/30 text-info',
  violet: 'border border-violet/30 text-violet',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  tone = 'neutral',
  variant = 'soft',
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5',
      variant === 'soft' && softTone[tone],
      variant === 'solid' && solidTone[tone],
      variant === 'outline' && outlineTone[tone],
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);

const statusToneMap: Record<string, BadgeTone> = {
  REQUESTED: 'violet',
  REVIEWED: 'info',
  PLANNING: 'info',
  ALLOCATION_PENDING: 'warning',
  IN_PROGRESS: 'warning',
  QUALITY_REVIEW: 'accent',
  REWORK: 'danger',
  READY: 'success',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
  COMPLETED: 'success',
  APPROVED: 'success',
  CHANGES_REQUESTED: 'warning',
  ASSIGNED: 'info',
  ACCEPTED: 'success',
  PENDING: 'warning',
  available: 'success',
  partially_available: 'warning',
  unavailable: 'danger',
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({
  status,
  className,
}) => {
  const tone = statusToneMap[status] ?? 'neutral';
  return (
    <Badge tone={tone} className={className}>
      {status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || '—'}
    </Badge>
  );
};
