'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import WalletButton from '@/components/layout/WalletButton';

export interface TopBarProps {
  title: string;
  eyebrow: string;
}

export default function TopBar({ eyebrow, title }: TopBarProps): JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl flex h-20 items-center justify-between px-6 lg:px-10">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="rgba(199,80,72,0.12)" />
              <path
                d="M8 14h4m4 0h4M14 8v4m0 4v4"
                stroke="#D66A61"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect x="11" y="11" width="6" height="6" rx="1" stroke="#D66A61" strokeWidth="1" />
            </svg>
          </Link>
          <div className="flex flex-col">
            {eyebrow ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary/80">
                {eyebrow}
              </span>
            ) : null}
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden h-10 items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 text-[11px] text-muted-foreground transition-all hover:bg-white/[0.05] md:flex">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono uppercase tracking-[0.2em]">FHE Protected</span>
            </div>
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
