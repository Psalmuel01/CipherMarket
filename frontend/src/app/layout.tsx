import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import LandingNav from '@/components/layout/LandingNav';
import LandingFooter from '@/components/layout/LandingFooter';
import FloatingNav from '@/components/layout/FloatingNav';
import PendingTransactionPanel from '@/components/layout/PendingTransactionPanel';
import MouseFollowGlow from '@/components/ui/MouseFollowGlow';
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
        {/* Deep Space Background System */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black" />

        <MouseFollowGlow />

        {/* Top hairline glow */}
        <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent z-10" />

        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <LandingNav />
            <main className="flex-1 relative z-10">
              {children}
            </main>
            <LandingFooter />
            <FloatingNav />
            <PendingTransactionPanel />
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
