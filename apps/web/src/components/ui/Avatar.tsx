import React from 'react';
import { cn } from '@/lib/utils/cn';

/* Warm initials avatar — derives a stable tone from the name. */

const tones = [
  'bg-accent/15 text-accent',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-violet/15 text-violet',
  'bg-info/15 text-info',
  'bg-danger/15 text-danger',
];

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const Avatar: React.FC<{
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ name, size = 'sm', className }) => {
  const dim =
    size === 'xs' ? 'h-6 w-6 text-[10px]' : size === 'md' ? 'h-10 w-10 text-sm' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        dim,
        tones[hash(name) % tones.length],
        className,
      )}
    >
      {initials(name) || 'U'}
    </span>
  );
};
