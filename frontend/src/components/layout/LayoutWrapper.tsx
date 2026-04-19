'use client';

import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';

export default function LayoutWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen transition-all duration-300 lg:pl-72">
      <Sidebar />
      <div className="relative min-h-screen">
        {children}
      </div>
    </div>
  );
}
