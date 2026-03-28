'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import clsx from 'clsx';

export default function LayoutWrapper({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';

  return (
    <div className={clsx("min-h-screen transition-all duration-300", !isLandingPage && "lg:pl-72")}>
      {!isLandingPage && <Sidebar />}
      <div className="relative min-h-screen">
        {children}
      </div>
    </div>
  );
}
