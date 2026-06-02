'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';

export interface InfoTooltipProps {
  title: string;
  body: string;
  learnMoreHref?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function InfoTooltip({
  title,
  body,
  learnMoreHref,
  size = 'sm',
  className,
}: InfoTooltipProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <span className={clsx('relative inline-flex items-center', className)}>
      <button
        type="button"
        className={clsx(
          'inline-flex items-center justify-center rounded-full text-white/20 transition-colors hover:text-primary/60 focus:outline-none',
          size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Learn more about ${title}`}
      >
        <Info className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 z-50 mb-2.5 w-56 max-w-[calc(100vw-2rem)] lg:left-1/2 lg:-translate-x-1/2"
          >
            <div className="rounded-xl border border-white/10 bg-[#0d1017]/95 backdrop-blur-xl p-3.5 shadow-2xl space-y-2">
              <p className="text-[11px] font-semibold text-[#e8e4df]">{title}</p>
              <p className="text-[10px] text-white/40 leading-relaxed">{body}</p>
              {learnMoreHref && (
                <a
                  href={learnMoreHref}
                  className="inline-flex text-[9px] font-mono uppercase tracking-[0.15em] text-primary/60 hover:text-primary transition-colors"
                >
                  Learn more →
                </a>
              )}
            </div>
            <div className="mx-auto h-1.5 w-1.5 -mt-[3px] rotate-45 border-b border-r border-white/10 bg-[#0d1017]/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
