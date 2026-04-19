import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Toaster } from 'sonner';
import '@/app/globals.css';

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
      <body className="overflow-x-hidden bg-background font-[family-name:var(--font-geist-sans)] text-foreground antialiased">
        {children}
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
