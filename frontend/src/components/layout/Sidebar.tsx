'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import useAppStore from '@/store/useAppStore';

const NAV_ITEMS = [
  { href: '/', label: 'Markets' },
  { href: '/markets/create', label: 'Create Market' },
  { href: '/oracle', label: 'Oracle Desk' },
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
        'fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-line bg-panel/80 px-6 py-8 backdrop-blur-terminal lg:block',
        isSidebarOpen && 'block',
        className,
      )}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="space-y-8">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-teal">
              CipherMarket
            </span>
            <p className="text-sm text-muted">
              Private prediction execution on confidential rails.
            </p>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                className={clsx(
                  'flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors',
                  pathname === item.href
                    ? 'border-teal/30 bg-teal/10 text-text'
                    : 'border-transparent bg-white/[0.02] text-muted hover:border-line hover:text-text',
                )}
                href={item.href}
              >
                <span>{item.label}</span>
                <span className="font-mono text-xs text-muted">0x</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="rounded-2xl border border-line bg-surface/60 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Network</p>
          <p className="mt-2 text-sm text-text">Sepolia + Local Cofhe ready</p>
          <p className="mt-3 text-xs text-muted">
            FHE encryption is client-side. Positions remain hidden while aggregate liquidity stays
            visible.
          </p>
        </div>
      </div>
    </aside>
  );
}

