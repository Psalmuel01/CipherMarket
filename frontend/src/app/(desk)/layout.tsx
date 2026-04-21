import type { ReactNode } from 'react';
import LayoutWrapper from '@/components/layout/LayoutWrapper';

export default function DeskLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <LayoutWrapper>{children}</LayoutWrapper>
  );
}
