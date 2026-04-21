'use client';

import type { ReactNode } from 'react';

export default function LayoutWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen transition-all duration-300">
      <div className="relative mx-auto max-w-[80%] px-8 lg:px-16">
        <div className="relative min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
