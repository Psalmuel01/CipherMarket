import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

const Providers = dynamic(() => import('@/app/providers'), {
  ssr: false,
});

export default function DeskLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <Providers>
      <LayoutWrapper>{children}</LayoutWrapper>
    </Providers>
  );
}
