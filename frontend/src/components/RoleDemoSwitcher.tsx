import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldAlert, Shield, Users, Stethoscope, Activity,
  ClipboardList, CreditCard, FlaskConical, Pill, User,
  Sparkles, Check, ChevronDown, Loader2
} from 'lucide-react';

interface RoleOption {
  role: string;
  title: string;
  amharicTitle: string;
  email: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  route: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'super_admin',
    title: 'Super Admin',
    amharicTitle: 'ዋና አስተዳዳሪ',
    email: 'superadmin@hospital.com',
    desc: 'System governance, database security, audit logs',
    icon: ShieldAlert,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
    route: '/dashboard'
  },
  {
    role: 'hospital_manager',
    title: 'Hospital Manager',
    amharicTitle: 'የሆስፒታል ስራ አስኪያጅ',
    email: 'manager@hospital.com',
    desc: 'Clinical KPIs, department censuses, financial summaries',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300',
    route: '/dashboard'
  },
  {
    role: 'admin',
    title: 'IT Administrator',
    amharicTitle: 'የሲስተም አስተዳዳሪ',
    email: 'admin@hospital.com',
    desc: 'Staff account management, service catalog setup',
    icon: Shield,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
    route: '/dashboard'
  },
  {
    role: 'doctor',
    title: 'Physician / Doctor',
    amharicTitle: 'ሐኪም',
    email: 'doctor@hospital.com',
    desc: 'Consultations, allergy guardrails, concurrent orders',
    icon: Stethoscope,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300',
    route: '/consultation'
  },
  {
    role: 'nurse',
    title: 'Triage Nurse',
    amharicTitle: 'ትሪያጅ ነርስ',
    email: 'nurse@hospital.com',
    desc: 'Vitals assessment, Manchester triage classification',
    icon: Activity,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
    route: '/nurse'
  },
  {
    role: 'receptionist',
    title: 'Receptionist',
    amharicTitle: 'የመቀበያ ሰራተኛ',
    email: 'receptionist@hospital.com',
    desc: '3 intake pathways, MRN generation, wristband QR',
    icon: ClipboardList,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300',
    route: '/reception-workflow'
  },
  {
    role: 'cashier',
    title: 'Cashier / POS',
    amharicTitle: 'ገንዘብ ተቀባይ',
    email: 'cashier@hospital.com',
    desc: 'Unified billing settlement, thermal receipts, shifts',
    icon: CreditCard,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
    route: '/cashier-workflow'
  },
  {
    role: 'lab_technician',
    title: 'Lab Technician',
    amharicTitle: 'የላቦራቶሪ ባለሙያ',
    email: 'lab@hospital.com',
    desc: 'Specimen processing, critical lab result alerts',
    icon: FlaskConical,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300',
    route: '/lab-dashboard'
  },
  {
    role: 'pharmacist',
    title: 'Pharmacist',
    amharicTitle: 'ፋርማሲስት',
    email: 'pharmacist@hospital.com',
    desc: 'First-Expiry-First-Out (FEFO) atomic stock deduction',
    icon: Pill,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300',
    route: '/pharmacy'
  },
  {
    role: 'patient',
    title: 'Patient Portal',
    amharicTitle: 'የታካሚ ፖርታል',
    email: 'patient@hospital.com',
    desc: 'Patient digital QR card, invoices, clinical history',
    icon: User,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-300',
    route: '/patient-portal'
  }
];

export const RoleDemoSwitcher: React.FC = () => {
  const { user, demoSwitchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectRole = async (target: RoleOption) => {
    if (user?.role === target.role) {
      setIsOpen(false);
      return;
    }
    try {
      setSwitching(target.role);
      await demoSwitchRole(target.role);
      setIsOpen(false);
      navigate(target.route);
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setSwitching(null);
    }
  };

  const currentRoleConfig = ROLES.find(r => r.role === user?.role) || ROLES[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-50/70 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-bold transition-all shadow-xs"
        title="Switch between all 10 hospital roles instantly for defense demo"
      >
        <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-spin" style={{ animationDuration: '4s' }} />
        <span className="hidden sm:inline">Demo Switcher:</span>
        <span className="underline decoration-teal-500/50 underline-offset-2 capitalize">{currentRoleConfig.title}</span>
        <ChevronDown className="w-3 h-3 text-teal-600 dark:text-teal-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>1-Click Role Switcher (Academic Defense)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Switch instantly between 10 hospital roles with authentic pre-seeded accounts.
              </p>
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1">
            {ROLES.map(r => {
              const Icon = r.icon;
              const isActive = user?.role === r.role;
              const isLoading = switching === r.role;

              return (
                <button
                  key={r.role}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSelectRole(r)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg border ${r.color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {r.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">({r.amharicTitle})</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{r.desc}</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    ) : isActive ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-100/70 dark:bg-teal-900/50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium hover:text-teal-600">Switch →</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400">
              Alem Ketema Enat Hospital · Full RBAC Workflow Simulation
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleDemoSwitcher;
