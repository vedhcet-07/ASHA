import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* Tactile pill buttons. Primary CTAs use deep charcoal ink; semantic
   intents map to the warm accent palette. All get whileTap feedback. */

export type ButtonTone =
  | 'ink'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet';
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const sizeClass: Record<ButtonSize, string> = {
  xs: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-2xl',
};

const solidTone: Record<ButtonTone, string> = {
  ink: 'bg-ink text-surface hover:bg-ink/90 shadow-tactile-sm',
  accent: 'bg-accent text-white hover:bg-accent/90 shadow-tactile-sm',
  success: 'bg-success text-white hover:bg-success/90 shadow-tactile-sm',
  warning: 'bg-warning text-white hover:bg-warning/90 shadow-tactile-sm',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-tactile-sm',
  info: 'bg-info text-white hover:bg-info/90 shadow-tactile-sm',
  violet: 'bg-violet text-white hover:bg-violet/90 shadow-tactile-sm',
};

const outlineTone: Record<ButtonTone, string> = {
  ink: 'border border-ink/20 text-ink hover:bg-ink/5 bg-transparent',
  accent: 'border border-accent/30 text-accent hover:bg-accent/8 bg-transparent',
  success: 'border border-success/30 text-success hover:bg-success/8 bg-transparent',
  warning: 'border border-warning/30 text-warning hover:bg-warning/8 bg-transparent',
  danger: 'border border-danger/30 text-danger hover:bg-danger/8 bg-transparent',
  info: 'border border-info/30 text-info hover:bg-info/8 bg-transparent',
  violet: 'border border-violet/30 text-violet hover:bg-violet/8 bg-transparent',
};

const softTone: Record<ButtonTone, string> = {
  ink: 'bg-ink/8 text-ink hover:bg-ink/12',
  accent: 'bg-accent/10 text-accent hover:bg-accent/15',
  success: 'bg-success/10 text-success hover:bg-success/15',
  warning: 'bg-warning/10 text-warning hover:bg-warning/15',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
  info: 'bg-info/10 text-info hover:bg-info/15',
  violet: 'bg-violet/10 text-violet hover:bg-violet/15',
};

const ghostClass = 'text-muted hover:bg-ink/5 hover:text-ink bg-transparent';

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'solid',
  tone = 'ink',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  onClick,
  ...rest
}) => {
  const reduce = useReducedMotion();

  const variantClass =
    variant === 'outline'
      ? outlineTone[tone]
      : variant === 'soft'
        ? softTone[tone]
        : variant === 'ghost'
          ? ghostClass
          : solidTone[tone];

  const cls = cn(
    'inline-flex select-none items-center justify-center font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-surface focus-visible:ring-ink/30',
    sizeClass[size],
    variantClass,
    fullWidth && 'w-full',
    (disabled || isLoading) && 'cursor-not-allowed opacity-60',
    className,
  );

  const content = (
    <>
      {isLoading && <Loader2 size={size === 'lg' ? 18 : 16} className="animate-spin" />}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </>
  );

  if (reduce) {
    return (
      <button
        type={type}
        className={cls}
        disabled={disabled || isLoading}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    );
  }

  return (
    <motion.button
      type={type}
      className={cls}
      disabled={disabled || isLoading}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      {...(rest as any)}
    >
      {content}
    </motion.button>
  );
};

/** Icon-only button for compact rails / row actions. */
export const IconButton: React.FC<
  ButtonProps & { label: string }
> = ({ label, className, size = 'md', variant = 'ghost', tone = 'ink', ...rest }) => {
  const sizes: Record<ButtonSize, string> = {
    xs: 'h-8 w-8 rounded-lg',
    sm: 'h-9 w-9 rounded-xl',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
  };
  return (
    <Button
      aria-label={label}
      variant={variant}
      tone={tone}
      className={cn(sizes[size], '!px-0', className)}
      {...rest}
    />
  );
};
