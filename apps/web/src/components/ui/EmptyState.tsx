import React from 'react';
import { cn } from '@/lib/utils/cn';

/* Clean tactile empty-state card with a clear CTA. */

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, icon, action, className }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/80 bg-surface px-8 py-12 text-center shadow-tactile-sm',
      className,
    )}
  >
    {icon && (
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-inset-2 text-muted-2">
        {icon}
      </div>
    )}
    <h3 className="text-base font-bold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);
