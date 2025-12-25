'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'auto';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'auto',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'auto',
  storageKey = 'imagebox-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(storageKey) as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'auto') {
      let systemTheme: 'dark' | 'light' = 'light';
      try {
        systemTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        systemTheme = 'light';
      }

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Listen for system theme changes if in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;
    
    if (!window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    try {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch {
      // ignore
      return;
    }
  }, [theme]);

  // Avoid hydration mismatch logic is simplified here; strict mode might complain but functionally ok.
  // Ideally we use a script in head or suppressHydrationWarning on html.

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem(storageKey, theme);
      } catch (e) {
        console.warn('Failed to save theme to localStorage:', e);
      }
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
