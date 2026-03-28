'use client';

import { Menu } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import WalletButton from '@/components/layout/WalletButton';

export interface TopBarProps {
  title: string;
  eyebrow: string;
}

export default function TopBar({ eyebrow, title }: TopBarProps): JSX.Element {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/60 px-4 py-4 backdrop-blur-xl lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50 text-muted-foreground transition-all hover:bg-card hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              {eyebrow}
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-9 items-center gap-2 rounded-full border border-border bg-card/30 px-4 text-xs font-medium text-muted-foreground md:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Gas: 12 Gwei
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
