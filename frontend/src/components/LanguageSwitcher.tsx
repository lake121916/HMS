import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Globe, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'pill' | 'select' | 'compact';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', variant = 'pill' }) => {
  const { language, setLanguage } = useLanguage();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
          language === 'am'
            ? 'bg-amber-500/20 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
            : 'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700'
        } ${className}`}
        title="Toggle Language / ቋንቋ ቀይር"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{language === 'en' ? 'EN' : 'አማ'}</span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
          language === 'en'
            ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-extrabold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span>🇬🇧</span>
        <span>English</span>
        {language === 'en' && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
      </button>

      <button
        type="button"
        onClick={() => setLanguage('am')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
          language === 'am'
            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span>🇪🇹</span>
        <span>አማርኛ</span>
        {language === 'am' && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
