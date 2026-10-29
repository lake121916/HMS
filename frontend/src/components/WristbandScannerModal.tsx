import React, { useState, useRef, useEffect } from 'react';
import {
  X, QrCode, Search, AlertTriangle, ShieldCheck,
  ArrowRight, RefreshCw
} from 'lucide-react';
import api from '../services/api';

interface WristbandScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientVerified?: (patientData: any) => void;
}

const WristbandScannerModal: React.FC<WristbandScannerModalProps> = ({
  isOpen,
  onClose,
  onPatientVerified
}) => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedResult, setVerifiedResult] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setIdentifier('');
      setError('');
      setVerifiedResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please scan or enter a patient MRN / barcode identifier.');
      return;
    }

    setLoading(true);
    setError('');
    setVerifiedResult(null);

    try {
      const res = await api.post('/patients/lookup-by-identifier', {
        identifier: identifier.trim()
      });

      if (res.data.success && res.data.data) {
        setVerifiedResult(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || `No patient found matching "${identifier}"`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndProceed = () => {
    if (verifiedResult && onPatientVerified) {
      onPatientVerified(verifiedResult);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Scan Patient Wristband / Barcode</h2>
              <p className="text-xs text-indigo-200">Point USB handheld scanner or enter Medical Record Number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Barcode Input Form */}
          <form onSubmit={handleLookup} className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Patient Identification Barcode / MRN
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. PAT-0004, #4, or scan physical wristband..."
                  disabled={loading}
                  className="w-full px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700 rounded-2xl font-mono font-bold text-sm text-slate-900 dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Scan / Lookup
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verified Patient Profile Card */}
          {verifiedResult && (
            <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-850 dark:to-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                      Authoritatively Verified Identity
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {verifiedResult.patient.first_name} {verifiedResult.patient.last_name}
                    </h3>
                  </div>
                </div>

                <span className="font-mono text-xs font-black px-2.5 py-1 bg-indigo-600 text-white rounded-xl shadow-sm">
                  {verifiedResult.patient.mrn}
                </span>
              </div>

              {/* Patient Key Vitals Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Gender</span>
                  <span className="font-black capitalize">{verifiedResult.patient.gender || 'N/A'}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Type</span>
                  <span className="font-black text-red-600 dark:text-red-400">{verifiedResult.patient.blood_type || 'Unspecified'}</span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">DOB</span>
                  <span className="font-black">
                    {verifiedResult.patient.date_of_birth 
                      ? new Date(verifiedResult.patient.date_of_birth).toLocaleDateString('en-GB')
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Allergy Banner */}
              {verifiedResult.patient.allergies && (
                <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>Documented Adverse Allergies: {verifiedResult.patient.allergies}</span>
                </div>
              )}

              {/* Active Encounters / Department */}
              {verifiedResult.activeEncounters && verifiedResult.activeEncounters.length > 0 && (
                <div className="text-xs bg-slate-100 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Current Clinical Encounter
                  </span>
                  <p className="font-extrabold text-slate-800 dark:text-slate-200">
                    Department: {verifiedResult.activeEncounters[0].department_name || 'General Outpatient'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Encounter Started: {new Date(verifiedResult.activeEncounters[0].started_at).toLocaleString('en-GB')}
                  </p>
                </div>
              )}

              {/* Confirm / Continue Button */}
              <button
                type="button"
                onClick={handleConfirmAndProceed}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <span>Confirm Patient & Open Chart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WristbandScannerModal;
