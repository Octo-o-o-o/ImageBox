'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PlusSquare, Settings, Library, Box, Activity, Sun, Moon, Monitor, Languages, ChevronDown, Github } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';

import { useLanguage } from './LanguageProvider';
import { languages as availableLanguages } from '@/lib/i18n';

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };

    if (isThemeOpen || isLangOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isThemeOpen, isLangOpen]);

  const navItems = [
    { name: t('sidebar.library'), icon: LayoutGrid, href: '/library' },
    { name: t('sidebar.create'), icon: PlusSquare, href: '/create' },
    { name: t('sidebar.templates'), icon: Library, href: '/templates' },
    { name: t('sidebar.logs'), icon: Activity, href: '/run_log' },
    { name: t('sidebar.models'), icon: Settings, href: '/models' },
  ];

  const themeOptions = [
    { value: 'auto', label: t('theme.system'), icon: Monitor },
    { value: 'light', label: t('theme.light'), icon: Sun },
    { value: 'dark', label: t('theme.dark'), icon: Moon },
  ];

  const langOptions = availableLanguages.map(l => ({
    value: l.code,
    label: l.label,
    icon: Languages
  }));

  const currentTheme = themeOptions.find(t => t.value === theme) || themeOptions[0];
  const currentLang = langOptions.find(l => l.value === language) || langOptions[0];

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r border-border bg-background/50 backdrop-blur-xl flex flex-col p-4 z-50">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
          <Box className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-white dark:to-white/70">
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
                  ? 'text-indigo-600 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-indigo-50/50 dark:bg-white/10 rounded-lg border border-indigo-100/50 dark:border-white/5"
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

      <div className="mt-auto p-4 flex flex-col gap-2">
        
        {/* Theme Switcher */}
        <div className="relative" ref={themeDropdownRef}>
            <button
                onClick={() => { setIsThemeOpen(!isThemeOpen); setIsLangOpen(false); }}
                className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border border-transparent",
                    isThemeOpen ? "bg-secondary text-foreground border-border" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
            >
                <currentTheme.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{currentTheme.label}</span>
                <ChevronDown className={clsx("w-4 h-4 ml-auto transition-transform", isThemeOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
                {isThemeOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-2 pt-1 pb-2 space-y-1">
                            {themeOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setTheme(opt.value as any); setIsThemeOpen(false); }}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                        theme === opt.value 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    )}
                                >
                                    <opt.icon className="w-4 h-4" />
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Language Switcher */}
        <div className="relative" ref={langDropdownRef}>
            <button
                onClick={() => { setIsLangOpen(!isLangOpen); setIsThemeOpen(false); }}
                className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border border-transparent",
                    isLangOpen ? "bg-secondary text-foreground border-border" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
            >
                <currentLang.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{currentLang.label}</span>
                <ChevronDown className={clsx("w-4 h-4 ml-auto transition-transform", isLangOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
                {isLangOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10, height: 0 }} // Starts from bottom if using 'auto' height but expanding upwards? No, it's bellow.
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="overflow-hidden"
                        style={{ maxHeight: '300px', overflowY: 'auto' }} // Add scrolling
                    >
                        <div className="pl-2 pt-1 pb-2 space-y-1">
                            {langOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setLanguage(opt.value as any); setIsLangOpen(false); }}
                                    className={clsx(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                        language === opt.value 
                                            ? "bg-primary/10 text-primary" 
                                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <div className="h-[1px] bg-border/50 my-1" />

        {/* GitHub Link */}
        <a 
            href="https://github.com/Octo-o-o-o/ImageBox" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-all group"
        >
            <Github className="w-5 h-5" />
            <span className="font-medium text-sm group-hover:underline decoration-border underline-offset-4">{t('common.github')}</span>
        </a>

        <div className="text-xs text-muted-foreground/40 text-center mt-2 font-mono">
          v1.0.0 {t('common.opensource')}
        </div>
      </div>
    </div>
  );
}


