import React from 'react';
import { cn } from '@/lib/utils/cn';

/* Warm tactile form controls matching the surface/border/focus style. */

const fieldBase =
  'w-full rounded-xl border border-stone-200/80 bg-surface px-3.5 text-sm text-ink placeholder:text-muted-2/60 transition-colors duration-200 outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60 shadow-tactile-sm';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input: React.FC<InputProps> = ({ className, ...rest }) => (
  <input className={cn(fieldBase, 'h-10', className)} {...rest} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  rows = 3,
  ...rest
}) => (
  <textarea className={cn(fieldBase, 'py-2.5 leading-relaxed', className)} rows={rows} {...rest} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className,
  children,
  ...rest
}) => (
  <select
    className={cn(fieldBase, 'h-10 cursor-pointer appearance-none bg-no-repeat pr-9', className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
      backgroundPosition: 'right 0.75rem center',
    }}
    {...rest}
  >
    {children}
  </select>
);

/* FormControl / FormLabel mirror the Chakra pairing used across pages,
   keeping the refactor tidy. */
export const FormControl: React.FC<
  React.HTMLAttributes<HTMLDivElement> & { isRequired?: boolean }
> = ({ children, className, isRequired, ...rest }) => (
  <div className={cn('flex flex-col gap-1.5', className)} {...rest}>
    {children}
  </div>
);

export const FormLabel: React.FC<
  React.LabelHTMLAttributes<HTMLLabelElement> & { isRequired?: boolean }
> = ({ children, className, isRequired, ...rest }) => (
  <label
    className={cn('text-sm font-medium text-ink', className)}
    {...rest}
  >
    {children}
    {isRequired && <span className="ml-0.5 text-danger">*</span>}
  </label>
);
