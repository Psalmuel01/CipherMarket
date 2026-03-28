import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import '@/app/globals.css';

const Providers = dynamic(() => import('@/app/providers'), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'CipherMarket',
  description: 'Private prediction markets powered by Fhenix CoFHE.',
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
      <body className="bg-bg font-[family-name:var(--font-geist-sans)] text-text antialiased">
        <Providers>
          <div className="min-h-screen lg:pl-72">
            <Sidebar />
            <div className="relative min-h-screen">
              {children}
            </div>
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
          </div>
        </Providers>
      </body>
    </html>
  );
}
