'use client';

import type { ReactNode } from 'react';

export default function LayoutWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen overflow-x-hidden transition-all duration-300">
      <div className="relative mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="relative min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
