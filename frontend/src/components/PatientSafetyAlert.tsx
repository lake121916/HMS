import React, { useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export interface PatientSafetyAlertProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  mrn: string;
  allergyName: string;
  medicationName: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
  onDocumentOverride: (reason: string) => void;
}

const PatientSafetyAlert: React.FC<PatientSafetyAlertProps> = ({
  isOpen,
  onClose,
  patientName,
  mrn,
  allergyName,
  medicationName,
  severity = 'severe',
  onDocumentOverride
}) => {
  const { language } = useLanguage();
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !acknowledged) return;
    onDocumentOverride(reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-700 to-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
                {language === 'am' ? 'ከፍተኛ ክሊኒካዊ ማስጠንቀቂያ' : `High-Priority Clinical Warning (${severity})`}
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {language === 'am' ? 'የመድኃኒት-አለርጂ ተቃርኖ' : 'Drug-Allergy Contraindication'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-xl bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300">Patient: {patientName}</span>
              <span className="font-mono text-slate-500">{mrn}</span>
            </div>
            <div className="pt-2 border-t border-red-100 dark:border-red-900/60 flex items-center justify-between text-sm">
              <span className="font-black text-rose-700 dark:text-rose-400">Allergen: {allergyName}</span>
              <span className="font-black text-red-800 dark:text-red-300">Prescribed: {medicationName}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The patient has a documented allergy to <strong>{allergyName}</strong>. Prescribing or dispensing <strong>{medicationName}</strong> carries a high risk of adverse reactions or cross-reactivity anaphylaxis.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Authorized Clinical Justification / Override *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              required
              placeholder="e.g. Desensitization protocol in place; alternative medication unavailable; monitored in ICU."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={e => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              I acknowledge the allergy contraindication and accept clinical responsibility for this override.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Cancel Order
            </button>
            <button
              type="submit"
              disabled={!acknowledged || !reason.trim()}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition disabled:opacity-40"
            >
              Document Override & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientSafetyAlert;
