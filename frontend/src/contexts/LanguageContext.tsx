import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../locales/en';
import { am } from '../locales/am';

export type Language = 'en' | 'am';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
  formatCurrency: (amount: number | string) => string;
  formatTriagePriority: (priority: string) => { label: string; amharic: string; full: string };
  formatDate: (date: string | Date) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en,
  am,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'hms_language_preference';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'am' || saved === 'en') return saved;
      // Auto-detect browser language if Amharic is preferred
      if (navigator.language && navigator.language.startsWith('am')) return 'am';
    } catch (_) {}
    return 'en';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
      if (language === 'am') {
        document.body.classList.add('font-amharic');
      } else {
        document.body.classList.remove('font-amharic');
      }
    } catch (_) {}
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, defaultText?: string): string => {
    const currentDict = translations[language] || translations.en;
    if (currentDict[key]) return currentDict[key];
    // Fallback to English if missing in Amharic
    if (translations.en[key]) return translations.en[key];
    return defaultText || key;
  };

  const formatCurrency = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return language === 'am' ? `${formatted} ብር` : `ETB ${formatted}`;
  };

  const formatTriagePriority = (priority: string) => {
    const clean = String(priority || '').toLowerCase();
    switch (clean) {
      case 'emergency':
        return {
          label: language === 'am' ? 'ድንገተኛ' : 'Emergency',
          amharic: 'ድንገተኛ',
          full: 'Emergency (ድንገተኛ)'
        };
      case 'urgent':
        return {
          label: language === 'am' ? 'አስቸኳይ' : 'Urgent',
          amharic: 'አስቸኳይ',
          full: 'Urgent (አስቸኳይ)'
        };
      case 'routine':
      case 'normal':
      default:
        return {
          label: language === 'am' ? 'መደበኛ' : 'Routine',
          amharic: 'መደበኛ',
          full: 'Routine (መደበኛ)'
        };
    }
  };

  const formatDate = (date: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatCurrency,
        formatTriagePriority,
        formatDate
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
