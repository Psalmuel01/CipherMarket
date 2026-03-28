'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PlusSquare, ShieldAlert, Cpu, Activity, Ticket } from 'lucide-react';
import clsx from 'clsx';
import useAppStore from '@/store/useAppStore';

const NAV_ITEMS = [
  { href: '/', label: 'Markets', icon: LayoutGrid },
  { href: '/my-bets', label: 'My Bets', icon: Ticket },
  { href: '/markets/create', label: 'Create Market', icon: PlusSquare },
  { href: '/oracle', label: 'Oracle Desk', icon: ShieldAlert },
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <Link href="/" className="text-lg font-bold tracking-tight text-foreground">CipherMarket</Link>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/80">
                Confidential Rails
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
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(79,255,212,0.15)]'
                      : 'text-muted-foreground hover:bg-white/[0.03] hover:text-foreground',
                  )}
                  href={item.href}
                >
                  <Icon
                    className={clsx(
                      'h-5 w-5 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Network Status
              </p>
            </div>
            <p className="text-sm font-medium text-foreground">Sepolia + Fhenix L2</p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/80 leading-relaxed">
              <Activity className="h-3 w-3 shrink-0" />
              <span>Real-time FHE encryption enabled for all positions.</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

