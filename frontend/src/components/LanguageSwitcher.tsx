import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'select' | 'compact' | 'pill';
}

const languages: Array<{ code: Language; label: string; nativeName: string; flag: string }> = [
  { code: 'en', label: 'English', nativeName: 'English (US)', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', nativeName: 'Amharic (Ethiopia)', flag: '🇪🇹' },
];

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', variant = 'dropdown' }) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Native select dropdown variant if explicitly requested
  if (variant === 'select') {
    return (
      <div className={`relative inline-block ${className}`}>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent border-none text-xs font-bold focus:ring-0 focus:outline-none cursor-pointer pr-1"
            aria-label="Select language"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code} className="dark:bg-slate-800 dark:text-white">
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Interactive Popup Dropdown Menu
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
          isOpen
            ? 'bg-blue-50 dark:bg-slate-700 border-blue-400 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <span className="text-sm leading-none">{currentLang.flag}</span>
        <span className="font-semibold">{currentLang.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-[100]"
          style={{ minWidth: '13rem' }}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            Language / ቋንቋ ምረጥ
          </div>
          {languages.map((l) => {
            const isSelected = language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLanguage(l.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-colors text-left my-0.5 ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{l.flag}</span>
                  <div>
                    <span className="block font-bold">{l.label}</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-400">{l.nativeName}</span>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
