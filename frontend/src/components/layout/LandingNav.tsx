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
    <nav className={`relative z-50 sticky top-0 transition-all duration-500 mt-5 ${scrolled
      ? 'border-b border-white/[0.08] bg-[#000000]/80 backdrop-blur-xl py-0'
      : 'border-b border-white/0 bg-transparent py-2'
      }`}>
      <div className="mx-auto max-w-[80%] px-8 lg:px-16 flex items-center justify-between h-16">
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
            <p className="font-mono text-[10px] uppercase font-medium tracking-[0.25em] text-white/45 mt-1">Private Prediction Market</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-[14px] transition-colors tracking-tight font-medium ${pathname === item.href
                ? 'text-white/70'
                : 'text-white/55 hover:text-white/90'
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
