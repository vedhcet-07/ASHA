import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* Loading states. LoadingSpinner centers a tactile spinner; Skeleton
 * blocks match the inset-surface rhythm for progressive loading. */

export const LoadingSpinner: React.FC<{ className?: string; label?: string }> = ({
  className,
  label,
}) => (
  <div className={cn('flex min-h-[240px] flex-col items-center justify-center gap-3', className)}>
    <Loader2 className="h-7 w-7 animate-spin text-accent" />
    {label && <p className="text-sm text-muted">{label}</p>}
  </div>
);

const shimmer =
  'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-xl bg-inset-2',
      shimmer,
      className,
    )}
    {...rest}
  />
);

/** A full KPI/card skeleton block. */
export const CardSkeleton: React.FC = () => (
  <div className="rounded-3xl border border-stone-200/80 bg-surface p-5 shadow-tactile">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="mt-3 h-7 w-20" />
    <Skeleton className="mt-3 h-3 w-32" />
  </div>
);

/** Grid of skeleton cards for list/dashboard loading. */
export const SkeletonGrid: React.FC<{ count?: number; cols?: string }> = ({
  count = 4,
  cols = 'sm:grid-cols-2 lg:grid-cols-4',
}) => (
  <div className={cn('grid grid-cols-1 gap-4', cols)}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);
