'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PlusSquare, Settings, Library, Box, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const navItems = [
  { name: '资料库', icon: LayoutGrid, href: '/library' },
  { name: '生成图片', icon: PlusSquare, href: '/create' },
  { name: '模板', icon: Library, href: '/templates' },
  { name: '日志', icon: Activity, href: '/run_log' },
  { name: '设置', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r border-border bg-background/50 backdrop-blur-xl flex flex-col p-4 z-50">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
          <Box className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          ImageBox
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-white/10 rounded-lg border border-white/5"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="font-medium relative z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 py-4 text-xs text-zinc-600 text-center">
        v1.0.0 本地版
      </div>
    </div>
  );
}
