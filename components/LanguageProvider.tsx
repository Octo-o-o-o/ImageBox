'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language, languages } from '@/lib/i18n';

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
  storageKey?: string;
}

interface LanguageProviderState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const initialState: LanguageProviderState = {
  language: 'en',
  setLanguage: () => null,
  t: (key: string) => key,
};

const LanguageContext = createContext<LanguageProviderState>(initialState);

// Helper function to detect system language
const detectSystemLanguage = (): Language => {
  // Try to get language from Electron API first (for desktop app)
  if (typeof window !== 'undefined' && window.electronAPI?.getSystemLanguage) {
    try {
      const electronLang = window.electronAPI.getSystemLanguage();
      if (electronLang && languages.some(l => l.code === electronLang)) {
        return electronLang as Language;
      }
    } catch (e) {
      console.warn('Failed to get Electron system language:', e);
    }
  }

  // Fallback to browser language detection
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      // Normalize language codes (e.g., "en-US" -> "en", "zh-CN" -> "zh")
      const lower = browserLang.toLowerCase();

      // Special handling for Chinese variants
      if (lower === 'zh-tw' || lower === 'zh-hant' || lower === 'zh-hk') {
        return 'zh-TW';
      }
      if (lower.startsWith('zh')) {
        return 'zh';
      }

      // Try exact match first
      const exactMatch = languages.find(l => l.code.toLowerCase() === lower);
      if (exactMatch) return exactMatch.code;

      // Try base language code (e.g., "en-US" -> "en")
      const base = lower.split('-')[0];
      const baseMatch = languages.find(l => l.code === base);
      if (baseMatch) return baseMatch.code;
    }
  }

  // Fallback to English
  return 'en';
};

export function LanguageProvider({
  children,
  defaultLanguage = 'en',
  storageKey = 'imagebox-language',
  ...props
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Priority: 1. Saved language > 2. System language > 3. Default (en)
    const savedLanguage = localStorage.getItem(storageKey) as Language;
    if (savedLanguage && languages.some(l => l.code === savedLanguage)) {
      setLanguageState(savedLanguage);
    } else {
      // No saved preference, detect system language
      const systemLang = detectSystemLanguage();
      setLanguageState(systemLang);
      // Save detected language to localStorage for next time
      localStorage.setItem(storageKey, systemLang);
    }
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('lang', language);
    if (language === 'ar') {
      root.setAttribute('dir', 'rtl');
    } else {
      root.setAttribute('dir', 'ltr');
    }
  }, [language]);

  // Sync language to Electron main process so tray menu can follow app language.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.electronAPI?.setLanguage?.(language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    localStorage.setItem(storageKey, lang);
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    // Prefer current language, then fallback to English, finally return key
    return translations[language]?.[key] ?? translations.en[key] ?? key;
  };

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider {...props} value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (context === undefined)
    throw new Error('useLanguage must be used within a LanguageProvider');

  return context;
};
