'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, PlusSquare, Settings, Library, Box, Activity, Sun, Moon, Monitor, Languages, ChevronDown, Github, Cog, Sparkles, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { hasImageGenerationModel } from '@/app/actions';
import { useTheme } from './ThemeProvider';
import { useSidebar } from './SidebarProvider';
import { useGeneration } from './GenerationProvider';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useLanguage } from './LanguageProvider';
import { languages as availableLanguages } from '@/lib/i18n';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { isGenerating } = useGeneration();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.platform) {
      setPlatform(window.electronAPI.platform);
    }
  }, []);

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

  const [hasModel, setHasModel] = useState<boolean>(true);

  useEffect(() => {
    hasImageGenerationModel().then(setHasModel);
  }, []);

  const navItems = [
    // Removed deprecated setup wizard route (kept SetupWizard modal as the only setup flow)
    { name: t('sidebar.create'), icon: PlusSquare, href: '/create' },
    { name: t('sidebar.library'), icon: LayoutGrid, href: '/library' },
    { name: t('sidebar.templates'), icon: Library, href: '/templates' },
    { name: t('sidebar.logs'), icon: Activity, href: '/run_log' },
    { name: t('sidebar.models'), icon: Settings, href: '/models' },
    { name: t('sidebar.settings'), icon: Cog, href: '/settings' },
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

  // Handle navigation with generation check
  const handleNavigation = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // If currently on create page and generating, show confirmation
    if (pathname === '/create' && isGenerating && href !== '/create') {
      setPendingNavigation(href);
    } else {
      router.push(href);
    }
  };

  // Confirm navigation and proceed
  const confirmNavigation = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  // Cancel navigation
  const cancelNavigation = () => {
    setPendingNavigation(null);
  };

  return (
    <div className={clsx(
      "h-screen fixed left-0 top-0 bg-background/50 backdrop-blur-xl flex flex-col z-50 transition-[width] duration-300",
      isCollapsed ? "w-16" : "w-64",
      platform === 'darwin' ? "pt-12 pb-4 px-4" : "p-4 border-r border-border"
    )}>
      {/* Drag Region */}
      <div className="absolute top-0 left-0 w-full h-10 titlebar-drag-region z-0" />

      {/* Right border - starts below traffic lights on macOS */}
      {platform === 'darwin' && (
        <div className="absolute right-0 top-10 bottom-0 w-px bg-border" />
      )}

      {/* Header */}
      <div className={clsx(
        "flex items-center gap-2 mb-8 relative z-10 titlebar-no-drag",
        isCollapsed ? "px-0 justify-center" : "px-2"
      )}>
        {!isCollapsed && (
          <>
            <img src="/app_icon.png" alt="ImageBox" className="w-10 h-10 rounded-lg shadow-lg shrink-0" />
            <div className="flex flex-col justify-center gap-0.5">
              <span className="text-xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-orange-600 dark:from-white dark:to-white/70">
                ImageBox
              </span>
              <span className="text-xs text-muted-foreground/40 font-mono leading-tight">
                v0.1.0
              </span>
            </div>
          </>
        )}
        {isCollapsed && (
          <img src="/app_icon.png" alt="ImageBox" className="w-8 h-8 rounded-lg shadow-lg" />
        )}
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavigation(item.href, e)}
              className={clsx(
                'relative flex items-center gap-3 rounded-lg transition-colors duration-200 group cursor-pointer',
                isCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
                isActive
                  ? 'text-orange-600 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/5'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-orange-50 dark:bg-white/10 rounded-lg border border-orange-100 dark:border-white/5"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10 shrink-0" />
              {!isCollapsed && <span className="font-medium relative z-10 whitespace-nowrap">{item.name}</span>}
            </a>
          );
        })}
      </nav>

      <div className={clsx("mt-auto flex flex-col gap-2", isCollapsed && "items-center")}>

        {/* Theme Switcher */}
        {!isCollapsed && (
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => { setIsThemeOpen(!isThemeOpen); setIsLangOpen(false); }}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border border-transparent",
                isThemeOpen ? "bg-secondary text-foreground border-border" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <currentTheme.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">{currentTheme.label}</span>
              <ChevronDown className={clsx("w-4 h-4 ml-auto transition-transform shrink-0", isThemeOpen && "rotate-180")} />
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
                        <opt.icon className="w-4 h-4 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Collapsed theme button */}
        {isCollapsed && (
          <button
            onClick={() => {
              const themes = ['auto', 'light', 'dark'];
              const currentIndex = themes.indexOf(theme);
              const nextTheme = themes[(currentIndex + 1) % themes.length];
              setTheme(nextTheme as any);
            }}
            className="flex items-center justify-center px-2 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
            title={currentTheme.label}
          >
            <currentTheme.icon className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/* Collapsed language button */}
        {isCollapsed && (
          <button
            onClick={() => {
              const currentIndex = langOptions.findIndex(l => l.value === language);
              const nextLang = langOptions[(currentIndex + 1) % langOptions.length];
              setLanguage(nextLang.value as any);
            }}
            className="flex items-center justify-center px-2 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
            title={currentLang.label}
          >
            <Languages className="w-5 h-5 shrink-0" />
          </button>
        )}

        {/* Language Switcher */}
        {!isCollapsed && (
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => { setIsLangOpen(!isLangOpen); setIsThemeOpen(false); }}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors border border-transparent",
                isLangOpen ? "bg-secondary text-foreground border-border" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <currentLang.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">{currentLang.label}</span>
              <ChevronDown className={clsx("w-4 h-4 ml-auto transition-transform shrink-0", isLangOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="overflow-hidden"
                  style={{ maxHeight: '300px', overflowY: 'auto' }}
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
        )}

        {!isCollapsed && <div className="h-[1px] bg-border/50 my-1" />}

        {/* GitHub Link */}
        <button
          onClick={() => {
            const url = 'https://github.com/Octo-o-o-o/ImageBox';
            if (window.electronAPI?.openExternal) {
              try {
                void window.electronAPI.openExternal(url);
              } catch (e) {
                console.warn('Failed to open external url via Electron:', e);
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            } else {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
          className={clsx(
            "flex items-center gap-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors group cursor-pointer",
            isCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
          )}
          title={isCollapsed ? t('common.github') : undefined}
        >
          <Github className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="font-medium text-sm group-hover:underline decoration-border underline-offset-4 whitespace-nowrap">{t('common.github')}</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className={clsx(
            "flex items-center gap-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors",
            isCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
          )}
          title={isCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronsLeft className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm whitespace-nowrap">{t('sidebar.collapse')}</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Confirmation Dialog */}
      <AnimatePresence>
        {pendingNavigation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={cancelNavigation}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-md w-full bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 pb-4 border-b border-border">
                <h3 className="text-lg font-bold text-foreground">{t('navigation.confirmLeave.title')}</h3>
              </div>

              <div className="p-6">
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {t('navigation.confirmLeave.message')}
                </p>
              </div>

              <div className="p-6 pt-4 flex gap-3">
                <button
                  onClick={confirmNavigation}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
                >
                  {t('navigation.confirmLeave.confirm')}
                </button>
                <button
                  onClick={cancelNavigation}
                  className="flex-1 py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors"
                >
                  {t('navigation.confirmLeave.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

