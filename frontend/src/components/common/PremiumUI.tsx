import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Search
} from 'lucide-react';

/* ─── 1. DashboardHeader ─────────────────────────────────────────────────── */
interface DashboardHeaderProps {
  title: string;
  amharicTitle?: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ElementType;
  actions?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  amharicTitle,
  subtitle,
  badge,
  icon: Icon,
  actions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200 dark:border-navy-800/80 transition-colors">
      <div className="flex items-start sm:items-center gap-3 sm:gap-3.5 min-w-0">
        {Icon && (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-xs mt-0.5 sm:mt-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight break-words">
              {title}
            </h1>
            {amharicTitle && (
              <span className="text-xs sm:text-sm font-amharic font-semibold text-slate-700 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20 break-words">
                {amharicTitle}
              </span>
            )}
            {badge && (
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-2xs shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-normal break-words">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 pt-1 sm:pt-0 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

/* ─── 2. WelcomeBanner ───────────────────────────────────────────────────── */
interface WelcomeBannerProps {
  userName: string;
  roleName: string;
  departmentName?: string;
  dutyLabel?: string;
  isOnDuty?: boolean;
  onDutyToggle?: () => void;
  metrics?: Array<{ label: string; value: string | number }>;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  userName,
  roleName,
  departmentName,
  dutyLabel,
  isOnDuty,
  onDutyToggle,
  metrics,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-navy-900 via-navy-850 to-[#071329] p-4 sm:p-6 lg:p-7 text-white border border-cyan-500/25 shadow-xl">
      {/* Decorative background glow accents */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 break-words">
              Alem Ketema Enat General Hospital
            </span>
            {departmentName && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-300 font-semibold break-words">{departmentName}</span>
              </>
            )}
          </div>
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-white break-words">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-teal-200">{userName}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-2xl break-words">
            Active workspace assigned as <span className="text-cyan-300 font-bold capitalize">{roleName}</span>. Real-time clinical telemetry and synchronized queues active.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {dutyLabel && onDutyToggle && (
            <button
              type="button"
              onClick={onDutyToggle}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isOnDuty
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-navy-800 text-slate-300 border-navy-700 hover:bg-navy-750'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnDuty ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
              <span>{dutyLabel}</span>
            </button>
          )}

          {metrics && metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-4 sm:divide-x sm:divide-white/10 bg-black/35 backdrop-blur-md p-2.5 sm:px-3.5 sm:py-2 rounded-xl border border-white/10">
              {metrics.map((m, idx) => (
                <div key={idx} className={`text-center sm:text-left ${idx > 0 ? 'sm:pl-4 border-l border-white/10 sm:border-l-0' : ''}`}>
                  <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">{m.label}</div>
                  <div className="text-xs sm:text-base font-extrabold text-cyan-300 font-mono">{m.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── 3. StatisticCard ───────────────────────────────────────────────────── */
export type StatVariant = 'cyan' | 'teal' | 'blue' | 'purple' | 'amber' | 'rose';

interface StatisticCardProps {
  title: string;
  amharicTitle?: string;
  value: string | number;
  icon: React.ElementType;
  change?: string | number;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  variant?: StatVariant;
  onClick?: () => void;
  className?: string;
}

const variantStyles: Record<StatVariant, {
  cardBg: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  glowHover: string;
}> = {
  cyan: {
    cardBg: 'from-cyan-500/15 via-navy-900/80 to-navy-950/95',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    glowHover: 'hover:shadow-[0_12px_28px_-8px_rgba(6,182,212,0.3)] hover:border-cyan-500/50',
  },
  teal: {
    cardBg: 'from-teal-500/15 via-navy-900/80 to-navy-950/95',
    iconBg: 'bg-teal-500/15 border-teal-500/30',
    iconColor: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    glowHover: 'hover:shadow-[0_12px_28px_-8px_rgba(20,184,166,0.3)] hover:border-teal-500/50',
  },
  blue: {
    cardBg: 'from-blue-500/15 via-navy-900/80 to-navy-950/95',
    iconBg: 'bg-blue-500/15 border-blue-500/30',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    glowHover: 'hover:shadow-[0_12px_28px_-8px_rgba(59,130,246,0.3)] hover:border-blue-500/50',
  },
  purple: {
    cardBg: 'from-purple-500/15 via-navy-900/80 to-navy-950/95',
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    glowHover: 'hover:shadow-[0_12px_28px_-8px_rgba(168,85,247,0.3)] hover:border-purple-500/50',
  },
  amber: {
    cardBg: 'from-amber-500/15 via-navy-900/80 to-navy-950/95',
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    glowHover: 'hover:shadow-[0_12px_28px_-8px_rgba(245,158,11,0.3)] hover:border-amber-500/50',
  },
  rose: {
    cardBg: 'from-rose-500/15 via-navy-900/80 to-navy-950/95',
    iconBg: 'bg-rose-500/15 border-rose-500/30',
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    glowHover: 'hover:shadow-[0_12px_28px_-8px_rgba(244,63,94,0.3)] hover:border-rose-500/50',
  },
};

export const StatisticCard: React.FC<StatisticCardProps> = ({
  title,
  amharicTitle,
  value,
  icon: Icon,
  change,
  changeType = 'neutral',
  subtitle,
  variant = 'cyan',
  onClick,
  className = '',
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white dark:bg-navy-900 dark:bg-gradient-to-br ${styles.cardBg} p-3.5 sm:p-5 border border-slate-200 dark:${styles.borderColor} shadow-xs min-h-[128px] sm:min-h-[144px] transition-all duration-200 ${styles.glowHover} ${
        onClick ? 'cursor-pointer active:scale-[0.99] hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5 sm:mb-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 block break-words" title={title}>
              {title}
            </span>
            {amharicTitle && (
              <span className="text-[10px] sm:text-[11px] font-amharic text-slate-500 dark:text-slate-400 leading-tight block mt-0.5 break-words" title={amharicTitle}>
                {amharicTitle}
              </span>
            )}
          </div>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 ${styles.iconBg} ${styles.iconColor} shadow-xs`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none mt-1 break-words">
          {value}
        </div>
      </div>

      {(change !== undefined || subtitle) && (
        <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between text-xs gap-1 sm:gap-2">
          {change !== undefined && (
            <div
              className={`inline-flex items-center gap-1 font-bold shrink-0 text-[10px] sm:text-xs ${
                changeType === 'positive'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : changeType === 'negative'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {changeType === 'positive' && <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              {changeType === 'negative' && <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              <span>{change}</span>
            </div>
          )}
          {subtitle && (
            <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight text-right ml-auto break-words">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── 4. PriorityBadge ───────────────────────────────────────────────────── */
export type PriorityLevel = 'emergency' | 'critical' | 'urgent' | 'normal' | 'routine';

interface PriorityBadgeProps {
  priority?: PriorityLevel | string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority = 'normal', size = 'sm' }) => {
  const norm = priority.toLowerCase();
  const isEmergency = norm === 'emergency' || norm === 'critical';
  const isUrgent = norm === 'urgent';

  const py = size === 'sm' ? 'py-0.5' : 'py-1';
  const px = size === 'sm' ? 'px-2' : 'px-2.5';
  const txt = size === 'sm' ? 'text-[11px]' : 'text-xs';

  if (isEmergency) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold ${txt} ${px} ${py} rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-2xs`}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        <span>P1 Emergency</span>
      </span>
    );
  }

  if (isUrgent) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold ${txt} ${px} ${py} rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span>P2 Urgent</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${txt} ${px} ${py} rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25`}>
      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
      <span>P3 Routine</span>
    </span>
  );
};

/* ─── 5. WorkflowTabs ────────────────────────────────────────────────────── */
export interface WorkflowTabItem {
  id: string;
  label: string;
  amharic?: string;
  count?: number;
  icon?: React.ElementType;
}

interface WorkflowTabsProps {
  tabs: WorkflowTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const WorkflowTabs: React.FC<WorkflowTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`bg-slate-100/90 dark:bg-navy-950/90 p-1.5 rounded-2xl flex gap-1.5 overflow-x-auto text-xs font-semibold border border-slate-200 dark:border-navy-800/80 ${className}`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
              isActive
                ? 'bg-white dark:bg-navy-900 text-cyan-600 dark:text-cyan-300 shadow-xs font-extrabold border border-slate-200/80 dark:border-cyan-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-navy-800/50'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono leading-tight ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25'
                    : 'bg-slate-200/80 dark:bg-navy-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ─── 6. PatientCard (Mobile-Friendly Responsive Patient Component) ─────── */
interface PatientCardProps {
  id: string | number;
  mrn: string;
  name: string;
  age?: number | null;
  gender?: string;
  encounterNumber?: string;
  departmentName?: string;
  chiefComplaint?: string;
  currentStage?: string;
  priority?: PriorityLevel | string;
  elapsedMinutes?: number;
  assignedDoctor?: string;
  room?: string;
  safetyFlags?: {
    allergies?: string;
    bloodType?: string;
  };
  actions?: React.ReactNode;
}

export const PatientCard: React.FC<PatientCardProps> = ({
  id: _id,
  mrn,
  name,
  age,
  gender,
  encounterNumber,
  departmentName,
  chiefComplaint,
  currentStage,
  priority = 'normal',
  elapsedMinutes,
  assignedDoctor,
  room,
  safetyFlags,
  actions,
}) => {
  const [expanded, setExpanded] = useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || 'P';

  const hasAllergy = safetyFlags?.allergies && safetyFlags.allergies.toLowerCase() !== 'none';

  return (
    <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 p-4 sm:p-5 shadow-xs transition-all space-y-3 hover:border-cyan-500/30">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-500 dark:text-cyan-300 font-black text-sm flex items-center justify-center shrink-0 border border-cyan-500/30">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {name}
            </h3>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{mrn}</span>
              {gender && <span>• {gender}</span>}
              {age !== undefined && age !== null && <span>• {age}y</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <PriorityBadge priority={priority} />
          {elapsedMinutes !== undefined && (
            <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold ${
              elapsedMinutes > 30 ? 'text-rose-500 animate-pulse' : 'text-slate-400'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{elapsedMinutes}m wait</span>
            </span>
          )}
        </div>
      </div>

      {chiefComplaint && (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-navy-950/70 border border-slate-100 dark:border-navy-800 text-xs space-y-0.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider">
            Chief Concern / Complaint
          </div>
          <div className="text-slate-900 dark:text-slate-100 font-semibold">{chiefComplaint}</div>
          {departmentName && (
            <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">{departmentName}</div>
          )}
        </div>
      )}

      {/* Safety alert chips */}
      {(hasAllergy || safetyFlags?.bloodType) && (
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {hasAllergy && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Allergy: {safetyFlags.allergies}
            </span>
          )}
          {safetyFlags?.bloodType && (
            <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25 font-semibold">
              Blood {safetyFlags.bloodType}
            </span>
          )}
        </div>
      )}

      {/* Expandable Meta details */}
      {expanded && (
        <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-navy-950/90 border border-slate-200/60 dark:border-navy-800 text-xs grid grid-cols-2 gap-2 animate-fadeIn">
          {encounterNumber && (
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Encounter</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{encounterNumber}</span>
            </div>
          )}
          {currentStage && (
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Stage</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{currentStage}</span>
            </div>
          )}
          {assignedDoctor && (
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Doctor</span>
              <span className="text-slate-800 dark:text-slate-200">{assignedDoctor}</span>
            </div>
          )}
          {room && (
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Room</span>
              <span className="text-slate-800 dark:text-slate-200">{room}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-navy-800">
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Less info
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> More info
            </>
          )}
        </button>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

/* ─── 7. ChartCard ───────────────────────────────────────────────────────── */
interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 p-4 sm:p-5 shadow-xs transition-colors ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-navy-800/80">
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
};

/* ─── 8. EmptyState ──────────────────────────────────────────────────────── */
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Search,
  action,
}) => {
  return (
    <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 p-8 sm:p-12 text-center shadow-xs">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-navy-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
