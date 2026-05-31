'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Fingerprint } from 'lucide-react';
import WalletButton from '@/components/layout/WalletButton';

export default function LandingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Markets', href: '/dashboard' },
    { label: 'Docs', href: '/docs' },
    { label: 'SDK', href: '/docs/sdk' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled
      ? 'bg-black/90 backdrop-blur-md border-b border-white/10 py-4'
      : 'bg-transparent py-8'
      }`}>
      <div className="mx-auto max-w-[1400px] px-8 lg:px-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 transition-all group-hover:scale-110">
             <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <path
                d="M8 14h4m4 0h4M14 8v4m0 4v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-primary"
              />
              <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <p className="font-serif italic text-xl text-white leading-none tracking-tight">CipherMarket</p>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              <p className="font-mono text-[9px] uppercase font-bold tracking-[0.3em] text-white/30">Protocol v1.0</p>
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-12">
          <div className="flex items-center gap-10">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-[12px] font-mono uppercase tracking-[0.2em] font-bold transition-all ${pathname === item.href
                  ? 'text-primary'
                  : 'text-white/40 hover:text-white'
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="h-4 w-px bg-white/10" />
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
