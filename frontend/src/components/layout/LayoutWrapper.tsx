'use client';

import type { ReactNode } from 'react';

export default function LayoutWrapper({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="min-h-screen transition-all duration-300">
      <div className="relative mx-auto max-w-6xl px-6 lg:px-10">
        <div className="relative min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
