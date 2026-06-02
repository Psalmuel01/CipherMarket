'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({
  children,
  description,
  onClose,
  open,
  size = 'lg',
  title,
}: ModalProps): JSX.Element {
  const maxWidthClass = size === 'md' ? 'max-w-xl' : 'max-w-2xl';

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#05070b]/70 px-3 py-3 sm:items-center sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={`max-h-[calc(100dvh-1.5rem)] w-full ${maxWidthClass} overflow-y-auto rounded-2xl border border-line bg-panel p-4 shadow-panel backdrop-blur-[12px] sm:max-h-[calc(100dvh-3rem)] sm:p-6`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-text">{title}</h2>
                {description ? <p className="text-sm text-gray-400">{description}</p> : null}
              </div>
              <button
                aria-label="Close modal"
                className="min-h-11 rounded-md border border-white/25 bg-white/[0.07] px-3 text-xs font-semibold text-white/75 shadow-sm transition-colors hover:border-white/40 hover:bg-white/[0.12] hover:text-white"
                onClick={onClose}
                type="button"
              >
                ESC
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
