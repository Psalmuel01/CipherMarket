'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({
  children,
  description,
  onClose,
  open,
  title,
}: ModalProps): JSX.Element {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070b]/70 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-2xl border border-line bg-panel/90 p-6 shadow-panel backdrop-blur-terminal"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-text">{title}</h2>
                {description ? <p className="text-sm text-muted">{description}</p> : null}
              </div>
              <button
                aria-label="Close modal"
                className="rounded-md border border-white/10 px-2 py-1 text-xs text-muted transition-colors hover:border-white/20 hover:text-text"
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

