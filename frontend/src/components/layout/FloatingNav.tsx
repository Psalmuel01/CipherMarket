'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, PlusSquare, ShieldAlert, Ticket } from 'lucide-react';
import { useAccount } from 'wagmi';
import clsx from 'clsx';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Markets', icon: LayoutGrid },
  { href: '/my-bets', label: 'Portfolio', icon: Ticket },
  { href: '/markets/create', label: 'Create', icon: PlusSquare },
  { href: '/oracle', label: 'Oracle', icon: ShieldAlert },
];

export default function FloatingNav() {
  const { isConnected } = useAccount();
  const pathname = usePathname();

  // Show dock globally if connected
  const showDock = isConnected;

  if (!isConnected) return null;

  return (
    <AnimatePresence>
      {showDock && (
        <motion.div
          initial={{ y: 100, x: '-50%', opacity: 0 }}
          animate={{ y: 0, x: '-50%', opacity: 1 }}
          exit={{ y: 100, x: '-50%', opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0d1017]/90 p-1.5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] scrollbar-hide sm:bottom-8"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'group relative flex h-11 shrink-0 items-center gap-2 rounded-[14px] px-3 transition-all duration-300 sm:px-4',
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="dock-active-pill"
                    className="absolute inset-0 rounded-[14px] bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                <Icon
                  className={clsx(
                    'relative z-10 h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110',
                    isActive ? 'text-[#e8533a]' : 'text-white/40 group-hover:text-white/70',
                  )}
                />
                
                <span className="relative z-10 hidden text-[13px] font-medium tracking-tight min-[380px]:inline">
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="dock-active-dot"
                    className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#e8533a] shadow-[0_0_8px_#e8533a]"
                  />
                )}
              </Link>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
