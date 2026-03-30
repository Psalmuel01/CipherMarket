'use client';

import { Menu, ShieldCheck, Activity } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import WalletButton from '@/components/layout/WalletButton';
import { useChainId } from 'wagmi';

export interface TopBarProps {
  title: string;
  eyebrow: string;
}

export default function TopBar({ eyebrow, title }: TopBarProps): JSX.Element {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const chainId = useChainId();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="flex h-20 items-center justify-between px-4 lg:px-10">
        <div className="flex items-center gap-6">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50 text-muted-foreground transition-all hover:bg-card hover:text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            {eyebrow && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                {eyebrow}
              </span>
            )}
            <h1 className="text-xl font-black tracking-tighter text-foreground">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden h-10 items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 text-[11px] font-bold text-muted-foreground transition-all hover:bg-white/[0.05] md:flex">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Fhenix Encryption</span>
            </div>
            {/* <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Chain {chainId}</span>
            </div> */}
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
