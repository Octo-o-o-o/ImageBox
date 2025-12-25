'use client';

import { useSidebar } from './SidebarProvider';
import clsx from 'clsx';

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main className={clsx(
      "min-h-screen transition-all duration-300",
      isCollapsed ? "pl-16" : "pl-64"
    )}>
      <div className="w-full max-w-7xl px-8 pb-8 pt-14">
        {children}
      </div>
    </main>
  );
}
