import type { ReactNode } from 'react';

export interface TooltipProps {
  label: string;
  children: ReactNode;
}

export default function Tooltip({ label, children }: TooltipProps): JSX.Element {
  return (
    <span
      className="inline-flex cursor-help items-center"
      title={label}
      aria-label={label}
    >
      {children}
    </span>
  );
}

