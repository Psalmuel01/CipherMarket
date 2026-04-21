'use client';

import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.07] py-6 bg-[#000000]">
      <div className="mx-auto max-w-6xl px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">
            CipherMarket · v1.0.0-beta · Built on Fhenix CoFHE · Ethereum Sepolia
          </p>
        </div>
        <div className="flex items-center gap-5">
          {[
            { label: 'GitHub', href: '#' },
            { label: 'Docs', href: '/docs' },
            { label: 'Telegram', href: '#' },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
