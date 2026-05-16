'use client';

import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const POSITIONS = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW_POSITIONS = {
  top: 'top-full left-1/2 -translate-x-1/2 -mt-[3px] rotate-45 border-b border-r',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[3px] rotate-45 border-t border-l',
  left: 'left-full top-1/2 -translate-y-1/2 -ml-[3px] rotate-45 border-r border-t',
  right: 'right-full top-1/2 -translate-y-1/2 -mr-[3px] rotate-45 border-l border-b',
};

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
}: TooltipProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (): void => {
    const t = setTimeout(() => setOpen(true), delay);
    setTimer(t);
  };

  const handleLeave = (): void => {
    if (timer) clearTimeout(timer);
    setOpen(false);
  };

  return (
    <span
      className={clsx('relative inline-flex', className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className={clsx('absolute z-50 pointer-events-none', POSITIONS[position])}
          >
            <div className="rounded-lg border border-white/10 bg-[#0d1017]/95 backdrop-blur-xl px-3 py-2 text-[11px] text-white/60 shadow-2xl whitespace-nowrap">
              {content}
            </div>
            <div
              className={clsx(
                'absolute h-1.5 w-1.5 border-white/10 bg-[#0d1017]/95',
                ARROW_POSITIONS[position],
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
