'use client';

import { Menu, ShieldCheck, Wallet, Activity, FlaskConical, Gavel } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { useDemoFlow } from '@/hooks/useDemoFlow';
import WalletButton from '@/components/layout/WalletButton';
import clsx from 'clsx';

export interface TopBarProps {
  title: string;
  eyebrow: string;
}

export default function TopBar({ eyebrow, title }: TopBarProps): JSX.Element {
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const { 
    hasResolved, setResolved, 
    isWalletConnected, setWalletConnected,
  } = useDemoFlow();

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

          {/* Demo Controls - SaaS Utility Style */}
          <div className="hidden items-center gap-1 rounded-2xl bg-white/[0.03] p-1.5 lg:flex">
            <div className="flex items-center gap-2 border-r border-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <FlaskConical className="h-3 w-3 text-primary" />
              <span>Demo Mode</span>
            </div>
            <button
              onClick={() => setWalletConnected(!isWalletConnected)}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                isWalletConnected ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <Wallet className="h-3 w-3" />
              Account: {isWalletConnected ? '0x8f2d...' : 'Disconnected'}
            </button>
            <button
              onClick={() => setResolved(!hasResolved)}
              className={clsx(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all",
                hasResolved ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"
              )}
            >
              <Gavel className="h-3 w-3" />
              State: {hasResolved ? 'Market Resolved' : 'Market Active'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden h-10 items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 text-[11px] font-bold text-muted-foreground transition-all hover:bg-white/[0.05] md:flex">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Fhenix Network</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>42 ms</span>
            </div>
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
