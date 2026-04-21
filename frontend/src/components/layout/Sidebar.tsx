'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PlusSquare, ShieldAlert, Activity, Ticket, BookOpenText } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '@/store/useAppStore';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Markets', icon: LayoutGrid },
  { href: '/my-bets', label: 'My Positions', icon: Ticket },
  { href: '/markets/create', label: 'Create Market', icon: PlusSquare },
  { href: '/oracle', label: 'Oracle', icon: ShieldAlert },
];

export interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps): JSX.Element {
  const pathname = usePathname();
  const isSidebarOpen = useAppStore((state) => state.isSidebarOpen);

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-card/40 backdrop-blur-xl lg:block',
        isSidebarOpen && 'block',
        className,
      )}
    >
      <div className="flex h-full flex-col justify-between p-6">
        <div className="space-y-10">
          <div className="flex items-center gap-3 px-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="rgba(199,80,72,0.12)" />
              <path
                d="M8 14h4m4 0h4M14 8v4m0 4v4"
                stroke="#D66A61"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect x="11" y="11" width="6" height="6" rx="1" stroke="#D66A61" strokeWidth="1" />
            </svg>
            <div>
              <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
                CipherMarket
              </Link>
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                Private Market
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  className={clsx(
                    'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
                  )}
                  href={item.href}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-item"
                      className="absolute inset-0 rounded-xl bg-primary/10 shadow-[0_0_24px_rgba(170,58,49,0.12)] border border-primary/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon
                    className={clsx(
                      'relative z-10 h-5 w-5 transition-colors duration-300',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Network Status
              </p>
            </div>
            <p className="font-mono text-sm text-foreground">Sepolia / FHE active</p>
            <div className="mt-4 flex items-center gap-2 text-[11px] leading-relaxed text-muted-foreground/80">
              <Activity className="h-3 w-3 shrink-0" />
              <span>Encrypted execution with on-chain resolution discipline.</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
