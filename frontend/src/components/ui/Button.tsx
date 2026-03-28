import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        // Variants
        variant === 'primary' && 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'outline' && 'border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:text-accent-foreground',
        variant === 'ghost' && 'hover:bg-white/5 hover:text-accent-foreground',
        variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // Sizes
        size === 'sm' && 'h-9 px-3 text-xs',
        size === 'md' && 'h-11 px-5',
        size === 'lg' && 'h-14 px-8 text-base',
        size === 'icon' && 'h-10 w-10',
        className
      )}
      {...props}
    />
  );
}

