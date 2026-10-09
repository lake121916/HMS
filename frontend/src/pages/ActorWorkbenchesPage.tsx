import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Stethoscope, HeartPulse, Receipt, DollarSign, FlaskConical, Pill,
  Shield, User, ArrowRight, Zap, CheckCircle2
} from 'lucide-react';

const actorDesks = [
  {
    role: 'receptionist',
    title: 'Receptionist Desk',
    subtitle: 'Walk-in Intake & Appointments',
    email: 'reception@hospital.com',
    targetRoute: '/reception',
    secondaryRoute: '/reception-workflow',
    icon: Receipt,
    color: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    features: ['Walk-In Patient Registration', 'Triage Queue Handoff', 'Doctor Appointment Booking', 'Registration Invoicing']
  },
  {
    role: 'nurse',
    title: 'Triage Nurse Station',
    subtitle: 'Vitals Capture & Priority Sorting',
    email: 'nurse@gmail.com',
    targetRoute: '/nurse',
    secondaryRoute: '/triage',
    icon: HeartPulse,
    color: 'from-rose-600 to-pink-700',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300',
    features: ['Vitals Measurement (BP, Temp, SpO2)', '3-Tier Triage Priority Sorting', 'Emergency Alert Trigger', 'Nurse Handoff Notes']
  },
  {
    role: 'doctor',
    title: 'Doctor Consultation Desk',
    subtitle: 'ICD-10 Clinical Diagnostics',
    email: 'doctor@hospital.com',
    targetRoute: '/doctor',
    secondaryRoute: '/consultation',
    icon: Stethoscope,
    color: 'from-emerald-600 to-teal-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    features: ['ICD-10 Disease Coding', 'Pathology Lab Ordering', 'e-Prescription Generation', 'Radiology Procedure Ordering']
  },
  {
    role: 'lab_technician',
    title: 'Pathology Lab Station',
    subtitle: 'Diagnostic Testing & Results',
    email: 'labtech@hospital.com',
    targetRoute: '/lab-dashboard',
    secondaryRoute: '/lab-tests',
    icon: FlaskConical,
    color: 'from-cyan-600 to-blue-700',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300',
    features: ['Test Specimen Queue', 'Laboratory Result Entry', 'Abnormal Result Flagging', 'Doctor Notification']
  },
  {
    role: 'pharmacist',
    title: 'Pharmacy Dispensing Desk',
    subtitle: 'Medication Fulfillment',
    email: 'pharmacist@hospital.com',
    targetRoute: '/pharmacy',
    secondaryRoute: '/medicines',
    icon: Pill,
    color: 'from-teal-600 to-emerald-700',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300',
    features: ['e-Prescription Verification', 'Drug Dispensing Queue', 'Stock Quantity Tracking', 'Dosage Instructions']
  },
  {
    role: 'cashier',
    title: 'Cashier Station & POS',
    subtitle: 'Billing & Receipt Generation',
    email: 'cashier@hospital.com',
    targetRoute: '/cashier-workflow',
    secondaryRoute: '/cashier',
    icon: DollarSign,
    color: 'from-amber-600 to-orange-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    features: ['Invoice Collection', 'Telebirr Dynamic QR Payment', 'CBE Birr Bank Transfer', 'Thermal Receipt printing (RCP-XXXXXX)']
  },
  {
    role: 'patient',
    title: 'Patient Health Portal',
    subtitle: 'Personal Records & Invoices',
    email: 'azie@gmail.com',
    targetRoute: '/patient-portal',
    secondaryRoute: '/appointments',
    icon: User,
    color: 'from-violet-600 to-purple-700',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
    features: ['Personal Health File', 'Lab Test Results View', 'Prescription History', 'Download Payment Receipts']
  },
  {
    role: 'admin',
    title: 'Hospital Admin Workbench',
    subtitle: 'System Analytics & User Control',
    email: 'admin@hospital.et',
    targetRoute: '/dashboard',
    secondaryRoute: '/admin',
    icon: Shield,
    color: 'from-slate-800 to-slate-900',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
    features: ['Role User Management', 'Hospital Department Setup', 'Financial & Revenue Reports', 'System Audit Trails']
  },
];

const ActorWorkbenchesPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [switchingRole, setSwitchingRole] = React.useState<string | null>(null);

  const handleLaunch = async (desk: typeof actorDesks[0]) => {
    if (user?.role === desk.role || user?.role === 'super_admin' || user?.role === 'admin') {
      navigate(desk.targetRoute);
      return;
    }

    setSwitchingRole(desk.role);
    try {
      await login(desk.email, 'Hospital@2024');
      navigate(desk.targetRoute);
    } catch (_) {
      navigate(desk.targetRoute);
    } finally {
      setSwitchingRole(null);
    }
  };

  return (
    <div className="space-y-8 p-2">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
              All Actors & Clinical Workbenches Directory
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Hospital Actors Workbench Launcher
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Explore and launch all role-specific hospital workstations: Receptionist Desk, Triage Nurse, Doctor Consultation, Pathology Lab, Pharmacy Dispensing, Cashier POS, and Patient Portal.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[200px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Active User Role</p>
            <p className="text-lg font-extrabold text-white uppercase mt-0.5">{user?.role?.replace('_', ' ') || 'Guest'}</p>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">{user?.email || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Grid of All Actor Workbenches */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {actorDesks.map((desk) => {
          const Icon = desk.icon;
          const isActiveUserDesk = user?.role === desk.role;
          const isCurrentLoading = switchingRole === desk.role;

          return (
            <div
              key={desk.role}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 group"
            >
              <div>
                {/* Header Icon & Role Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${desk.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${desk.badgeBg}`}>
                    {desk.role.replace('_', ' ')}
                  </span>
                </div>

                {/* Desk Title */}
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {desk.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  {desk.subtitle}
                </p>

                {/* Feature Bullet points */}
                <ul className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  {desk.features.map((ft, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>{ft}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  disabled={isCurrentLoading}
                  onClick={() => handleLaunch(desk)}
                  className={`w-full py-3 px-4 rounded-2xl font-extrabold text-xs text-white shadow-lg bg-gradient-to-r ${desk.color} hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {isCurrentLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Switching Role & Launching...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current text-white" />
                      {isActiveUserDesk ? 'Open My Station' : 'Launch Station'}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActorWorkbenchesPage;
