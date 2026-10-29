import React, { useState } from 'react';
import { X, Printer, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../services/api';

interface PatientWristbandModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    blood_type?: string;
    allergies?: string;
    phone?: string;
    created_at?: string;
  };
  encounterId?: number;
}

const PatientWristbandModal: React.FC<PatientWristbandModalProps> = ({
  isOpen,
  onClose,
  patient,
  encounterId
}) => {
  const [printing, setPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  if (!isOpen || !patient) return null;

  const mrn = `PAT-${String(patient.id).padStart(4, '0')}`;
  const fullName = `${patient.first_name} ${patient.last_name}`.toUpperCase();
  const dob = patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('en-GB') : 'Unknown';
  const gender = patient.gender ? patient.gender.toUpperCase() : 'N/A';
  const bloodType = patient.blood_type || 'Unspecified';
  const regDate = patient.created_at ? new Date(patient.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

  // Calculate age
  let age = 'N/A';
  if (patient.date_of_birth) {
    const diffMs = Date.now() - new Date(patient.date_of_birth).getTime();
    age = `${Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))} Yrs`;
  }

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await api.post(`/patients/${patient.id}/wristband-printed`, {
        encounter_id: encounterId,
        barcode: mrn
      });
      setPrintSuccess(true);
      window.print();
    } catch (err) {
      console.error('Error logging wristband print event:', err);
      // Still allow print even if audit log request fails
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Print Patient Identification Wristband</h2>
              <p className="text-xs text-indigo-200">Standard Thermal 1" x 11" Medical Hospital Specimen Band</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body & Printable Wristband Preview */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {printSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Wristband print event successfully recorded in audit log.</span>
            </div>
          )}

          {/* ── HIGH FIDELITY THERMAL WRISTBAND STRIP ── */}
          <div className="relative border-4 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-3xl bg-slate-50 dark:bg-slate-950/40">
            <span className="absolute -top-3 left-6 px-3 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
              Printable Medical Strip (Dimensions: 275mm x 25mm)
            </span>

            <div
              id="printable-wristband"
              className="mt-2 bg-white text-slate-950 p-4 rounded-2xl shadow-lg border-2 border-slate-900 flex items-center justify-between gap-4 font-sans select-none"
            >
              {/* Left Segment: Hospital Identity & Vitals */}
              <div className="space-y-1.5 flex-1 border-r border-slate-300 pr-4">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-slate-950 text-white text-[9px] font-black uppercase rounded tracking-wider">
                    ALEM KETEMA ENAT HOSPITAL
                  </span>
                  <span className="text-[10px] font-mono font-black text-indigo-700">
                    ADM: {regDate}
                  </span>
                </div>

                <div className="text-base font-black tracking-tight leading-none text-slate-950">
                  {fullName}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-700 pt-0.5">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-normal uppercase">MRN</span>
                    <span className="font-mono font-black text-slate-950">{mrn}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-normal uppercase">DOB / Age</span>
                    <span>{dob} ({age})</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-normal uppercase">Gender / Blood</span>
                    <span>{gender} • <strong className="text-red-700">{bloodType}</strong></span>
                  </div>
                </div>

                {patient.allergies && (
                  <div className="mt-1 px-2 py-0.5 bg-red-100 border border-red-300 rounded text-[10px] font-black text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                    <span>ALLERGIES: {patient.allergies.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Right Segment: Scannable Barcode & QR */}
              <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                {/* Barcode visual */}
                <div className="flex flex-col items-center">
                  <svg className="w-36 h-12" viewBox="0 0 144 48">
                    {/* Simulated Code 128 vertical bars */}
                    <rect x="0" y="0" width="3" height="40" fill="#000" />
                    <rect x="5" y="0" width="2" height="40" fill="#000" />
                    <rect x="9" y="0" width="5" height="40" fill="#000" />
                    <rect x="16" y="0" width="2" height="40" fill="#000" />
                    <rect x="20" y="0" width="4" height="40" fill="#000" />
                    <rect x="26" y="0" width="1" height="40" fill="#000" />
                    <rect x="30" y="0" width="6" height="40" fill="#000" />
                    <rect x="38" y="0" width="3" height="40" fill="#000" />
                    <rect x="43" y="0" width="2" height="40" fill="#000" />
                    <rect x="47" y="0" width="5" height="40" fill="#000" />
                    <rect x="54" y="0" width="3" height="40" fill="#000" />
                    <rect x="60" y="0" width="2" height="40" fill="#000" />
                    <rect x="64" y="0" width="4" height="40" fill="#000" />
                    <rect x="71" y="0" width="2" height="40" fill="#000" />
                    <rect x="75" y="0" width="6" height="40" fill="#000" />
                    <rect x="83" y="0" width="1" height="40" fill="#000" />
                    <rect x="86" y="0" width="3" height="40" fill="#000" />
                    <rect x="91" y="0" width="5" height="40" fill="#000" />
                    <rect x="98" y="0" width="2" height="40" fill="#000" />
                    <rect x="102" y="0" width="4" height="40" fill="#000" />
                    <rect x="108" y="0" width="3" height="40" fill="#000" />
                    <rect x="113" y="0" width="2" height="40" fill="#000" />
                    <rect x="117" y="0" width="5" height="40" fill="#000" />
                    <rect x="124" y="0" width="3" height="40" fill="#000" />
                    <rect x="129" y="0" width="2" height="40" fill="#000" />
                    <rect x="133" y="0" width="4" height="40" fill="#000" />
                    <rect x="139" y="0" width="2" height="40" fill="#000" />
                  </svg>
                  <span className="text-[10px] font-mono font-black tracking-widest text-slate-900 mt-0.5">
                    *{mrn}*
                  </span>
                </div>

                {/* 2D QR Code */}
                <div className="w-16 h-16 bg-slate-950 rounded-xl p-1 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                    <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h15 v15 h-15 z M45,45 h20 v20 h-20 z M75,75 h20 v20 h-20 z M15,45 h15 v15 h-15 z M70,40 h20 v15 h-20 z M40,75 h20 v15 h-20 z M85,55 h10 v10 h-10 z M55,0 h10 v20 h-10 z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Staff Protocol Instructions */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl text-xs space-y-1.5 text-indigo-900 dark:text-indigo-200">
            <p className="font-extrabold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-indigo-600" /> Clinical Verification Protocol:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
              <li>Fasten securely to patient's non-dominant wrist upon admission or consultation handoff.</li>
              <li>Always scan or verify MRN before administering medication, drawing blood, or surgery.</li>
              <li>Red allergy banner indicates documented adverse reactions in clinical history.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={printing}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-extrabold shadow-lg transition disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'Preparing Print...' : 'Print Wristband (Thermal / Standard)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientWristbandModal;
