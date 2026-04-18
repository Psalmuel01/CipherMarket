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
        'inline-flex items-center justify-center whitespace-nowrap rounded-xl border text-sm font-semibold tracking-[0.01em] ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        // Variants
        variant === 'primary' &&
          'border-primary/30 bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(141,37,31,0.28)] hover:bg-primary/92 hover:shadow-[0_18px_36px_rgba(141,37,31,0.34)]',
        variant === 'secondary' &&
          'border-white/6 bg-secondary text-secondary-foreground hover:bg-secondary/85',
        variant === 'outline' &&
          'border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:text-foreground',
        variant === 'ghost' && 'border-transparent hover:bg-white/5 hover:text-foreground',
        variant === 'danger' &&
          'border-destructive/30 bg-destructive text-destructive-foreground hover:bg-destructive/92',
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
