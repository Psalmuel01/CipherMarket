import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import LandingNav from '@/components/layout/LandingNav';
import LandingFooter from '@/components/layout/LandingFooter';
import FloatingNav from '@/components/layout/FloatingNav';
import '@/app/globals.css';

const Providers = dynamic(() => import('@/app/providers'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'CipherMarket',
  description: 'Confidential prediction markets on Ethereum Sepolia powered by FHE.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="overflow-x-hidden bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased min-h-screen">
        {/* Noise overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
          }}
        />

        {/* Top hairline */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />

        {/* Accent glow */}
        <div
          className="pointer-events-none fixed -top-40 -left-20 w-[600px] h-[600px] rounded-full z-0"
          style={{ background: 'radial-gradient(circle, rgba(232,83,58,0.07) 0%, transparent 70%)' }}
        />

        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <LandingNav />
            <main className="flex-1">
              {children}
            </main>
            <LandingFooter />
            <FloatingNav />
          </div>
        </Providers>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#11151d',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#EAECEF',
            },
          }}
        />
      </body>
    </html>
  );
}
