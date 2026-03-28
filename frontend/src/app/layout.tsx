import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
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
      <body className="bg-bg font-[family-name:var(--font-geist-sans)] text-text antialiased overflow-x-hidden">
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: '#101722',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#E7EEF7',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
