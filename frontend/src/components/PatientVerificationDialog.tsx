import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, UserCheck, X, Send, ArrowRight
} from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export interface PatientVerificationRecord {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string;
  is_unidentified?: boolean;
  temporary_mrn?: string;
  profile_photo_updated_at?: string;
  encounter?: {
    id?: number;
    encounter_number?: string;
    status?: string;
    priority?: string;
    department_name?: string;
  } | null;
}

interface PatientVerificationDialogProps {
  isOpen: boolean;
  patient: PatientVerificationRecord | null;
  department?: string;
  onConfirm: (patient: PatientVerificationRecord) => void;
  onMismatchReported?: () => void;
  onCancel: () => void;
}

const PatientVerificationDialog: React.FC<PatientVerificationDialogProps> = ({
  isOpen,
  patient,
  department = 'Clinical',
  onConfirm,
  onMismatchReported,
  onCancel
}) => {
  const { language } = useLanguage();
  const [confirmedName, setConfirmedName] = useState(false);
  const [confirmedDob, setConfirmedDob] = useState(false);
  const [confirmedPhoto, setConfirmedPhoto] = useState(false);
  const [reportingMismatch, setReportingMismatch] = useState(false);
  const [mismatchReason, setMismatchReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !patient) return null;

  const fullName = `${patient.first_name} ${patient.last_name}`;
  const initials = `${patient.first_name?.[0] || 'P'}${patient.last_name?.[0] || ''}`.toUpperCase();

  const isAllergic = Boolean(
    patient.allergies &&
    patient.allergies.trim() &&
    !/none|n\/a|no known/i.test(patient.allergies)
  );

  const canProceed = (confirmedName && confirmedDob) || (confirmedName && confirmedPhoto);

  const handleConfirmVerification = async () => {
    if (!canProceed) return;
    setSubmitting(true);
    setErrorMsg('');

    try {
      const confirmedList: string[] = [];
      if (confirmedName) confirmedList.push('full_name');
      if (confirmedDob) confirmedList.push('dob');
      if (confirmedPhoto) confirmedList.push('photo_match');

      await api.post('/patients/qr/confirm-verification', {
        patient_id: patient.id,
        encounter_id: patient.encounter?.id || null,
        department,
        verification_method: 'two_identifier_verbal',
        identifiers_confirmed: confirmedList,
        status: 'confirmed'
      });

      onConfirm(patient);
    } catch (err: any) {
      console.warn('Verification log warning:', err);
      // Even if network audit log experiences slight delay, allow confirmed clinical flow to proceed
      onConfirm(patient);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMismatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mismatchReason.trim()) {
      setErrorMsg('Please describe the discrepancy observed.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post('/patients/qr/report-mismatch', {
        scanned_patient_id: patient.id,
        department,
        mismatch_details: mismatchReason.trim()
      });

      if (onMismatchReported) {
        onMismatchReported();
      }
      onCancel();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit mismatch report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {language === 'am' ? 'ባለ 2-ደረጃ የታካሚ ማንነት ማረጋገጫ' : 'Two-Identifier Patient Verification'}
              </h3>
              <p className="text-xs text-teal-200/80">
                {language === 'am' ? 'ህክምና ከመጀመሩ በፊት የታካሚውን ማንነት ያረጋግጡ' : 'Confirm patient matches physical person before clinical actions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close verification dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mismatch Reporting Sub-View */}
        {reportingMismatch ? (
          <form onSubmit={handleSubmitMismatch} className="p-5 sm:p-6 space-y-4">
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black uppercase text-rose-900 dark:text-rose-200">
                  {language === 'am' ? 'የታካሚ ማንነት አለመጣጣም ሪፖርት' : 'Patient Identity Mismatch Alert'}
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  {language === 'am'
                    ? 'የስካን የተደረገው የእጅ አምባር ከተቀመጠው ሰው ጋር አይዛመድም። ይህ ክስተት በአስተዳደራዊ መዝገብ ላይ ይመዘገባል።'
                    : 'The scanned wristband does not match the physical patient. Clinical workflow is stopped immediately and logged for registration review.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {language === 'am' ? 'የአለመጣጣሙ ዝርዝር መግለጫ *' : 'Describe the Identity Discrepancy *'}
              </label>
              <textarea
                value={mismatchReason}
                onChange={e => setMismatchReason(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Patient states their name is Daniel Bekele, but wristband scanned as Abebe Kebede. Wristband appears to be on wrong patient."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-600">{errorMsg}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReportingMismatch(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
              >
                {language === 'am' ? 'ተመለስ' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={submitting || !mismatchReason.trim()}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'ሪፖርቱን አስገባ እና አቁም' : 'Submit Mismatch Alert'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Standard Two-Identifier Verification Checklist */
          <div className="p-5 sm:p-6 space-y-4">
            {/* Scanned Patient Identity Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-4">
              <ProfileAvatar
                userId={patient.id}
                hasPhoto={!!patient.profile_photo_updated_at}
                photoVersion={patient.profile_photo_updated_at}
                initials={initials}
                className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md border-2 border-teal-300 dark:border-teal-700"
              />

              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400 tracking-wider">
                  Scanned Patient Record
                </span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">
                  {fullName}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap font-medium">
                  <span className="font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/70 px-2 py-0.5 rounded-md">
                    {patient.mrn}
                  </span>
                  {patient.gender && <span className="capitalize">{patient.gender}</span>}
                  {patient.date_of_birth && (
                    <span>• DOB: {new Date(patient.date_of_birth).toLocaleDateString('en-GB')}</span>
                  )}
                  {patient.blood_type && (
                    <span className="text-rose-600 font-bold">🩸 {patient.blood_type}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Critical Allergy Warning in Verification Card */}
            {isAllergic && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {language === 'am' ? 'የታወቀ አለርጂ:' : 'Known Allergies:'} <strong>{patient.allergies}</strong>
                </span>
              </div>
            )}

            {/* Hospital-Approved Two-Identifier Checklist */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                {language === 'am'
                  ? 'የሆስፒታል ደንብ: ቢያንስ 2 ነጥቦችን ያረጋግጡ (የክፍል/አልጋ ቁጥር መጠቀም አይቻልም)'
                  : 'Hospital Policy: Confirm 2 independent identifiers (Room/Bed # not allowed)'}
              </span>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={confirmedName}
                  onChange={e => setConfirmedName(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 dark:border-slate-700 focus:ring-teal-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    1. {language === 'am' ? 'ሙሉ ስም ማረጋገጫ' : 'Full Name Verbally Confirmed'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Patient verbally stated full name matching &quot;{fullName}&quot;
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={confirmedDob}
                  onChange={e => setConfirmedDob(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 dark:border-slate-700 focus:ring-teal-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    2. {language === 'am' ? 'የትውልድ ቀን ወይም MRN ማረጋገጫ' : 'Date of Birth or MRN Confirmed'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Patient stated birth date or national ID matching hospital records
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={confirmedPhoto}
                  onChange={e => setConfirmedPhoto(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 dark:border-slate-700 focus:ring-teal-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    3. {language === 'am' ? 'ፎቶ እና አካላዊ ገጽታ ማረጋገጫ' : 'Photo / Physical Presence Confirmed'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Staff verified physical appearance matches hospital ID photo or wristband
                  </span>
                </div>
              </label>
            </div>

            {/* Warning if 2 identifiers not yet selected */}
            {!canProceed && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                ⚠️ Please check at least 2 verification boxes to confirm patient identity.
              </p>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setReportingMismatch(true)}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{language === 'am' ? 'ማንነቱ አይዛመድም' : 'Identity Mismatch'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>

                <button
                  type="button"
                  disabled={!canProceed || submitting}
                  onClick={handleConfirmVerification}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{language === 'am' ? 'አረጋግጥ እና ቀጥል' : 'Confirm & Open Workflow'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientVerificationDialog;
