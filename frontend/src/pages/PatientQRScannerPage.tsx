import React, { useState } from 'react';
import {
  ShieldCheck, History, User,
  ArrowRight, Smartphone, Laptop, Clock,
  FileText, Activity, Stethoscope, Pill, Receipt, FlaskConical
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PatientQRScanner, { VerifiedPatient } from '../components/PatientQRScanner';
import { useAuth } from '../contexts/AuthContext';

interface ScanHistoryItem {
  patient: VerifiedPatient;
  scannedAt: Date;
}

const PatientQRScannerPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  const handlePatientVerified = (result: { patient: VerifiedPatient; verified_at?: string }) => {
    setScanHistory(prev => {
      // Prevent duplicates in recent history
      const filtered = prev.filter(item => item.patient.id !== result.patient.id);
      return [{ patient: result.patient, scannedAt: new Date() }, ...filtered].slice(0, 10);
    });
  };

  const getRoleQuickLinks = () => {
    switch (user?.role) {
      case 'receptionist':
        return [
          { label: 'Reception Workflow', path: '/reception-workflow', icon: FileText },
          { label: 'Patient Directory', path: '/patients', icon: User },
        ];
      case 'doctor':
        return [
          { label: 'Consultation Room', path: '/consultation', icon: Stethoscope },
          { label: 'Doctor Dashboard', path: '/doctor', icon: Activity },
        ];
      case 'nurse':
        return [
          { label: 'Triage Dashboard', path: '/triage', icon: Activity },
          { label: 'Vitals Management', path: '/vitals', icon: Stethoscope },
        ];
      case 'lab_technician':
        return [
          { label: 'Laboratory Dashboard', path: '/lab-dashboard', icon: FlaskConical },
          { label: 'Lab Tests Catalog', path: '/lab-tests', icon: FileText },
        ];
      case 'pharmacist':
        return [
          { label: 'Pharmacy Dashboard', path: '/pharmacy', icon: Pill },
          { label: 'Prescriptions Queue', path: '/prescriptions', icon: FileText },
        ];
      case 'cashier':
        return [
          { label: 'Cashier Dashboard', path: '/cashier', icon: Receipt },
          { label: 'Invoices & Billing', path: '/invoices', icon: FileText },
        ];
      default:
        return [
          { label: 'Patient Management', path: '/patients', icon: User },
          { label: 'General Dashboard', path: '/dashboard', icon: Activity },
        ];
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-teal-800/40">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-teal-400 text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Alem Ketema Enat Hospital Patient Identification
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Dual-Device QR Scanner
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            High-speed optical QR code verification using built-in webcams, desktop USB cameras, Android rear/front cameras, and iPhone Safari/Chrome mobile browsers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-semibold flex items-center gap-2">
            <Laptop className="w-4 h-4 text-teal-300" />
            <span>Desktop & Laptop</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-semibold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-300" />
            <span>Android & iOS</span>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <PatientQRScanner
        autoStart={true}
        onPatientVerified={handlePatientVerified}
        showHeader={true}
      />

      {/* Bottom Grid: Recent Scans & Security Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Session Scans (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
              <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Recent Patient Scans in this Session</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {scanHistory.length} identified
            </span>
          </div>

          {scanHistory.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="font-semibold">No patients scanned yet in this session.</p>
              <p>Position a patient QR code in front of the camera above to scan.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {scanHistory.map(({ patient, scannedAt }) => (
                <div key={`${patient.id}-${scannedAt.getTime()}`} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {patient.first_name[0]}{patient.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {patient.first_name} {patient.last_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {patient.mrn} • {scannedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <span>View Record</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Quick Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Department Links */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Authorized Department Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {getRoleQuickLinks().map(link => {
                const IconComponent = link.icon;
                return (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => navigate(link.path)}
                    className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 rounded-2xl text-left transition flex flex-col gap-2 group"
                  >
                    <IconComponent className="w-5 h-5 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {link.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Guarantee Box */}
          <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-teal-50/60 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-3xl p-6 border border-indigo-100 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Security Architecture
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Hospital QR codes contain <strong>zero medical data</strong> or personally identifiable information on paper. They carry an opaque, single-use cryptographically random token that requires authenticated server verification and is audited on every scan.
            </p>
            <div className="pt-2 border-t border-indigo-100/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
              <span>MoH Audit Standard: Compliant</span>
              <span>TLS / HTTPS Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientQRScannerPage;
