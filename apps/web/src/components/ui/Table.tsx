import React from 'react';
import { cn } from '@/lib/utils/cn';

/* Tactile tables — wrapped in a card with overflow-hidden, warm inset
   header rows, and soft row dividers. Use within a <Card>. */

export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...rest
}) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full border-collapse text-left text-sm', className)} {...rest}>
      {children}
    </table>
  </div>
);

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...rest
}) => <thead className={cn('bg-inset/70', className)} {...rest} />;

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...rest
}) => <tbody className={cn('divide-y divide-stone-200/70', className)} {...rest} />;

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...rest
}) => <tr className={cn('transition-colors hover:bg-inset/40', className)} {...rest} />;

export const Th: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }
> = ({ className, isNumeric, children, ...rest }) => (
  <th
    className={cn(
      'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted',
      isNumeric ? 'text-right' : 'text-left',
      className,
    )}
    {...rest}
  >
    {children}
  </th>
);

export const Td: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }
> = ({ className, isNumeric, children, ...rest }) => (
  <td
    className={cn(
      'px-4 py-3.5 align-middle text-ink',
      isNumeric ? 'text-right tabular-nums' : 'text-left',
      className,
    )}
    {...rest}
  >
    {children}
  </td>
);
