import React from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  User, 
  Activity, 
  Stethoscope, 
  FlaskConical, 
  Receipt,
  Droplet
} from 'lucide-react';

export type JourneyStage = 'register' | 'triage' | 'consultation' | 'orders' | 'billing' | 'completed';

export interface JourneyPatient {
  id: number;
  mrn?: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  priority?: string;
  encounter_number?: string;
  phone?: string;
}

interface PatientJourneyHandoffProps {
  currentStage: JourneyStage;
  patient: JourneyPatient;
  nextActionLabel?: string;
  nextActionDescription?: string;
  onNextAction?: () => void;
  nextActionDisabled?: boolean;
  nextActionLoading?: boolean;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
  className?: string;
}

const STAGES: { id: JourneyStage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'register', label: '1. Intake', icon: User },
  { id: 'triage', label: '2. Triage', icon: Activity },
  { id: 'consultation', label: '3. Clinician & AI', icon: Stethoscope },
  { id: 'orders', label: '4. Lab & Rx', icon: FlaskConical },
  { id: 'billing', label: '5. Billing & Exit', icon: Receipt },
];

export const PatientJourneyHandoff: React.FC<PatientJourneyHandoffProps> = ({
  currentStage,
  patient,
  nextActionLabel,
  nextActionDescription,
  onNextAction,
  nextActionDisabled = false,
  nextActionLoading = false,
  secondaryAction,
  className = ''
}) => {
  const stageOrder: Record<JourneyStage, number> = {
    register: 1,
    triage: 2,
    consultation: 3,
    orders: 4,
    billing: 5,
    completed: 6
  };

  const currentStepNumber = stageOrder[currentStage] || 1;

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  const age = calculateAge(patient.date_of_birth);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
      {/* ── Top Patient Identity & Acuity Strip ───────────────────────────── */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center font-black text-teal-300 text-lg shadow-sm shrink-0">
            {patient.first_name?.[0] || 'P'}{patient.last_name?.[0] || ''}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/10 text-teal-200 border border-white/10">
                {patient.mrn || `ETH-PAT-${patient.id}`}
              </span>
              {patient.priority && (
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  patient.priority === 'emergency' ? 'bg-red-500 text-white animate-pulse' :
                  patient.priority === 'urgent' ? 'bg-amber-400 text-slate-950' :
                  'bg-teal-500 text-white'
                }`}>
                  {patient.priority}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap font-medium">
              {patient.gender && <span>{patient.gender}</span>}
              {age !== null && <span>• {age} yrs</span>}
              {patient.blood_type && (
                <span className="flex items-center gap-1 text-red-300 font-bold">
                  <Droplet className="w-3 h-3 text-red-400" /> {patient.blood_type}
                </span>
              )}
              {patient.phone && <span className="font-mono text-slate-400">• {patient.phone}</span>}
              {patient.encounter_number && (
                <span className="text-teal-300 font-mono text-[11px]">
                  • Enc: {patient.encounter_number}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button on Top Bar */}
        {nextActionLabel && onNextAction && (
          <button
            type="button"
            onClick={onNextAction}
            disabled={nextActionDisabled || nextActionLoading}
            className="self-stretch md:self-auto min-h-[44px] px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-md active:scale-95 shrink-0"
          >
            {nextActionLoading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{nextActionLabel}</span>
          </button>
        )}
      </div>

      {/* ── Allergy Warning Bar if Present ────────────────────────────── */}
      {patient.allergies && patient.allergies.trim() && patient.allergies.toLowerCase() !== 'none' && (
        <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 animate-pulse" />
          <span>Clinical Allergy Warning: <strong>{patient.allergies}</strong></span>
        </div>
      )}

      {/* ── Visual 5-Stage Journey Stepper ─────────────────────────────── */}
      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
          <span>Active Patient Lifecycle Progress</span>
          <span className="text-teal-600 dark:text-teal-400 font-mono">
            Step {Math.min(currentStepNumber, 5)} of 5
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {STAGES.map((stg, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStepNumber > stepNum || currentStage === 'completed';
            const isCurrent = currentStepNumber === stepNum && currentStage !== 'completed';
            const Icon = stg.icon;

            return (
              <div
                key={stg.id}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-white dark:bg-slate-800 border-teal-500 shadow-sm ring-2 ring-teal-500/20'
                    : isCompleted
                      ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/60 text-teal-800 dark:text-teal-300'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-70'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isCurrent
                    ? 'bg-teal-600 text-white shadow-sm'
                    : isCompleted
                      ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0">
                  <span className={`block text-xs font-extrabold truncate ${
                    isCurrent ? 'text-teal-700 dark:text-teal-300' :
                    isCompleted ? 'text-slate-800 dark:text-slate-200' :
                    'text-slate-400 dark:text-slate-600'
                  }`}>
                    {stg.label}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    {isCurrent ? 'In Progress' : isCompleted ? 'Completed' : 'Queued'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Clear Handoff Prompt & Secondary Action ────────────────────── */}
      {nextActionDescription && (
        <div className="px-5 py-3.5 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping shrink-0" />
            <span className="font-semibold">{nextActionDescription}</span>
          </div>

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1.5 self-start sm:self-auto"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-3.5 h-3.5" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientJourneyHandoff;
