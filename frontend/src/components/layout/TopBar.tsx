'use client';

import useAppStore from '@/store/useAppStore';
import WalletButton from '@/components/layout/WalletButton';

export interface TopBarProps {
  title: string;
  eyebrow: string;
}

export default function TopBar({ eyebrow, title }: TopBarProps): JSX.Element {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 px-4 py-4 backdrop-blur-terminal lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line text-muted transition-colors hover:text-text lg:hidden"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            ≡
          </button>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-teal">{eyebrow}</p>
            <h1 className="mt-1 text-xl font-medium text-text">{title}</h1>
          </div>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
