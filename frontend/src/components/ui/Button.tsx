import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export default function Button({
  children,
  className,
  size = 'md',
  variant = 'primary',
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md border transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-11 px-4 text-sm' : 'h-9 px-3 text-xs uppercase tracking-[0.16em]',
        variant === 'primary' &&
          'border-teal/30 bg-teal/12 font-medium text-teal hover:bg-teal/18',
        variant === 'ghost' &&
          'border-white/10 bg-white/[0.02] text-text hover:border-white/20 hover:bg-white/[0.05]',
        variant === 'danger' &&
          'border-danger/30 bg-danger/10 text-danger hover:bg-danger/16',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

