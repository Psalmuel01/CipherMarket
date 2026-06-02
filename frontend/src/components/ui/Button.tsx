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
        'inline-flex items-center justify-center rounded-xl text-center font-bold uppercase leading-tight tracking-widest transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-30 active:scale-[0.96]',
        // Variants
        variant === 'primary' &&
          'bg-primary text-white border border-primary/20 shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)]',
        variant === 'secondary' &&
          'bg-[#0a0c10] text-white border border-white/5 hover:bg-[#101218] hover:border-white/10',
        variant === 'outline' &&
          'bg-transparent border border-white/10 text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.02]',
        variant === 'ghost' && 
          'border-transparent text-white/40 hover:text-white hover:bg-white/[0.02]',
        variant === 'danger' &&
          'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20',
        // Sizes
        size === 'sm' && 'min-h-11 px-4 text-[10px]',
        size === 'md' && 'h-12 px-6 text-[11px]',
        size === 'lg' && 'h-16 px-10 text-[12px]',
        size === 'icon' && 'h-12 w-12',
        className
      )}
      {...props}
    />
  );
}
