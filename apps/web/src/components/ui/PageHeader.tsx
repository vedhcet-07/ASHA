import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

/* Page / section headers. The page-level header opens every screen with
   a deep-ink title, warm taupe subtitle and a right-aligned action slot. */

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, description, eyebrow, icon, action, className }) => {
  const reduce = useReducedMotion();

  const content = (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-2">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-ink">
              {icon}
            </span>
          )}
          <h1 className="truncate text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
            {title}
          </h1>
        </div>
        {(subtitle || description) && (
          <p className="mt-1.5 text-sm text-muted">{subtitle || description}</p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
      )}
    </div>
  );

  if (reduce) return content;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, action, className }) => (
  <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
    <div className="flex items-center gap-2.5">
      {icon && (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink/5 text-ink">
          {icon}
        </span>
      )}
      <div>
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="flex items-center gap-2">{action}</div>}
  </div>
);
