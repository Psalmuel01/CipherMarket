'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import WalletButton from '@/components/layout/WalletButton';

export default function LandingNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Markets', href: '/dashboard' },
    { label: 'Docs', href: '/docs' },
    { label: 'SDK', href: '/docs/sdk' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled || mobileOpen
      ? 'bg-black/90 backdrop-blur-md border-b border-white/10 py-4'
      : 'bg-transparent py-5 md:py-8'
      }`}>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-16">
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
        <button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.06] md:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen ? (
        <div className="mx-auto mt-4 flex w-full max-w-[1400px] flex-col gap-3 px-4 pb-2 sm:px-6 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] transition-all ${pathname === item.href
                ? 'text-primary'
                : 'text-white/55 hover:text-white'
                }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-1">
            <WalletButton />
          </div>
        </div>
      ) : null}
    </nav>
  );
}
