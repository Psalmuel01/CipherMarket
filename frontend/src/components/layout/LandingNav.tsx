'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import WalletButton from '@/components/layout/WalletButton';

export default function LandingNav() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Documentation', href: '/docs' },
  ];

  return (
    <nav className={`relative z-50 sticky top-0 transition-all duration-500 ${
      scrolled 
        ? 'border-b border-white/[0.08] bg-[#000000]/80 backdrop-blur-xl py-0' 
        : 'border-b border-white/0 bg-transparent py-2'
    }`}>
      <div className="mx-auto max-w-6xl px-6 lg:px-10 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
            <p className="font-serif italic text-[15px] text-[#e8e4df] leading-none">CipherMarket</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/30 mt-0.5">Private Prediction Market</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-[13px] transition-colors tracking-[-0.01em] ${
                pathname === item.href 
                  ? 'text-white font-medium' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
