import React from 'react';
import { ShieldAlert, ShieldCheck, HelpCircle, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface AllergyItem {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
  verified?: boolean;
}

interface AllergyAlertBannerProps {
  allergies?: string | AllergyItem[];
  compact?: boolean;
  onOpenOverride?: () => void;
  className?: string;
}

const AllergyAlertBanner: React.FC<AllergyAlertBannerProps> = ({
  allergies,
  compact = false,
  onOpenOverride,
  className = ''
}) => {
  const { language } = useLanguage();

  // Parse allergies string or list
  const rawAllergies = typeof allergies === 'string' ? allergies.trim() : '';
  const isUnknown = !allergies || /unknown/i.test(rawAllergies);
  const isNone = Boolean(allergies && /none|n\/a|no known/i.test(rawAllergies));

  if (isNone) {
    return (
      <div className={`p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 ${className}`}>
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{language === 'am' ? 'የተመዘገበ አለርጂ የለም (NKA)' : 'No Known Allergies (NKA verified)'}</span>
      </div>
    );
  }

  if (isUnknown) {
    return (
      <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{language === 'am' ? 'የአለርጂ ሁኔታ አልተረጋገጠም — እባክዎ ታካሚውን ይጠይቁ' : 'Allergy Status Unknown — verify with patient before administering medication'}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50/90 dark:bg-amber-950/60 ${compact ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'} text-amber-950 dark:text-amber-100 shadow-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/80 px-2 py-0.5 rounded-md">
                {language === 'am' ? 'ከፍተኛ የአለርጂ ማስጠንቀቂያ' : 'CRITICAL ALLERGY ALERT'}
              </span>
              <span className="text-xs font-black text-rose-700 dark:text-rose-400">
                ⚠️ {rawAllergies}
              </span>
            </div>
            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-1 leading-relaxed">
              {language === 'am'
                ? 'ይህ ታካሚ የተመዘገበ አለርጂ አለበት። መድኃኒት ወይም ሕክምና ከመታዘዙ በፊት የመድኃኒት አለርጂ ክትትል ያድርጉ።'
                : 'Patient has documented allergies. Review active medication orders and contraindications before prescribing, dispensing, or administering drugs.'}
            </p>
          </div>
        </div>

        {onOpenOverride && (
          <button
            type="button"
            onClick={onOpenOverride}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-sm transition shrink-0 cursor-pointer flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Clinical Review</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AllergyAlertBanner;
