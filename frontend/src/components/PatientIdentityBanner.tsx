import React from 'react';
import { ShieldCheck, AlertTriangle, X } from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';
import { useLanguage } from '../contexts/LanguageContext';

export interface PatientBannerData {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  is_unidentified?: boolean;
  profile_photo_updated_at?: string;
  encounter?: {
    id?: number;
    encounter_number?: string;
    status?: string;
    priority?: string;
    department_name?: string;
  } | null;
  verifiedAt?: string;
  verifiedMethod?: string;
}

interface PatientIdentityBannerProps {
  patient: PatientBannerData | null;
  onClearContext?: () => void;
  onOpenVerifyDialog?: () => void;
  className?: string;
  compact?: boolean;
}

const PatientIdentityBanner: React.FC<PatientIdentityBannerProps> = ({
  patient,
  onClearContext,
  onOpenVerifyDialog,
  className = '',
  compact = false
}) => {
  const { language } = useLanguage();

  if (!patient) return null;

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const initials = `${patient.first_name?.[0] || 'P'}${patient.last_name?.[0] || ''}`.toUpperCase();

  const calcAge = (dobString?: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const age = calcAge(patient.date_of_birth);
  const isAllergic = Boolean(
    patient.allergies &&
    patient.allergies.trim() &&
    !/none|n\/a|no known/i.test(patient.allergies)
  );

  return (
    <div
      className={`bg-white dark:bg-slate-900 border-2 rounded-2xl shadow-md transition-all overflow-hidden ${
        isAllergic
          ? 'border-amber-400/80 dark:border-amber-600/70'
          : 'border-teal-500/40 dark:border-teal-600/40'
      } ${className}`}
      role="region"
      aria-label="Active Patient Identity Banner"
    >
      {/* Top Clinical Safety Bar */}
      <div
        className={`px-3 sm:px-4 ${compact ? 'py-1' : 'py-1.5'} flex items-center justify-between text-xs font-black tracking-wide ${
          patient.is_unidentified
            ? 'bg-rose-600 text-white'
            : isAllergic
            ? 'bg-amber-500 text-slate-950'
            : 'bg-teal-700 text-white'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="truncate uppercase text-[11px]">
            {patient.is_unidentified
              ? (language === 'am' ? 'ያልታወቀ የአደጋ ታካሚ (ጊዜያዊ መለያ)' : 'EMERGENCY UNIDENTIFIED PATIENT')
              : (language === 'am' ? 'የታካሚ ማረጋገጫ ተረጋግጧል' : 'PATIENT IDENTITY CONFIRMED')}
          </span>
          {patient.verifiedAt && (
            <span className="hidden md:inline font-mono opacity-85 text-[10px]">
              • {new Date(patient.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenVerifyDialog && (
            <button
              type="button"
              onClick={onOpenVerifyDialog}
              className="text-[10px] px-2 py-0.5 rounded-md bg-black/15 hover:bg-black/25 dark:bg-white/15 dark:hover:bg-white/25 transition cursor-pointer font-bold"
              title="Review two-identifier verification checklist"
            >
              {language === 'am' ? 'እንደገና አረጋግጥ' : 'Re-verify 2-ID'}
            </button>
          )}

          {onClearContext && (
            <button
              type="button"
              onClick={onClearContext}
              className="text-[10px] px-2 py-0.5 rounded-md bg-black/15 hover:bg-black/30 dark:bg-white/15 dark:hover:bg-white/30 transition flex items-center gap-1 cursor-pointer font-bold"
              title="Clear patient context and switch patient"
            >
              <span>{language === 'am' ? 'ቀይር' : 'Switch Patient'}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Demographics & Clinical Context Bar */}
      <div className={`${compact ? 'p-2 sm:p-3' : 'p-3 sm:p-4'} flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900`}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar / Photo */}
          <ProfileAvatar
            userId={patient.id}
            hasPhoto={!!patient.profile_photo_updated_at}
            photoVersion={patient.profile_photo_updated_at}
            initials={initials}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-teal-200 dark:border-teal-700"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {fullName}
              </h2>
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 shrink-0">
                {patient.mrn}
              </span>
              {patient.blood_type && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 shrink-0">
                  🩸 {patient.blood_type}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-0.5 font-medium">
              {patient.gender && (
                <span className="capitalize">{patient.gender}</span>
              )}
              {age !== null && (
                <>
                  <span>•</span>
                  <span>{age} {language === 'am' ? 'ዓመት' : 'yrs'}</span>
                </>
              )}
              {patient.date_of_birth && (
                <>
                  <span>•</span>
                  <span className="hidden sm:inline">
                    DOB: {new Date(patient.date_of_birth).toLocaleDateString('en-GB')}
                  </span>
                </>
              )}
              {patient.encounter?.encounter_number && (
                <>
                  <span>•</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                    ENC: {patient.encounter.encounter_number}
                  </span>
                </>
              )}
              {patient.encounter?.department_name && (
                <span className="text-teal-700 dark:text-teal-300 font-semibold">
                  ({patient.encounter.department_name})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Allergy Alert Indicator */}
        <div className="shrink-0 flex items-center gap-2">
          {isAllergic ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="leading-tight">
                <span className="block text-[10px] uppercase font-black tracking-wider text-amber-700 dark:text-amber-400">
                  {language === 'am' ? 'የአለርጂ ማስጠንቀቂያ' : 'ALLERGY ALERT'}
                </span>
                <span className="truncate max-w-[200px] block font-extrabold">
                  {patient.allergies}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'am' ? 'የተመዘገበ አለርጂ የለም' : 'No Known Allergies'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientIdentityBanner;
