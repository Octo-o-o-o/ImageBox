'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SidebarContextType = {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved state from localStorage
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {
      console.warn('Failed to read sidebarCollapsed from localStorage:', e);
    }

    // Auto-collapse on narrow screens
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true);
      }
    };

    handleResize(); // Check initial width
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      if (mounted) {
        try {
          localStorage.setItem('sidebarCollapsed', String(newValue));
        } catch (e) {
          console.warn('Failed to save sidebarCollapsed to localStorage:', e);
        }
      }
      return newValue;
    });
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    if (mounted) {
      try {
        localStorage.setItem('sidebarCollapsed', String(collapsed));
      } catch (e) {
        console.warn('Failed to save sidebarCollapsed to localStorage:', e);
      }
    }
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setSidebarCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
