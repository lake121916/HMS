import React from 'react';
import { HeartPulse } from 'lucide-react';
import ProfileAvatar from './ProfileAvatar';

export interface PatientCardData {
  patientId: number;
  patientUserId?: number | null;
  fullName: string;
  mrn: string;
  issuedAt?: string | null;
  qrCodeDataUrl: string;
}

const PatientIDCard: React.FC<{ patient: PatientCardData }> = ({ patient }) => (
  <>
    <style>{`
      @media print {
        @page { size: 85.6mm 54mm; margin: 0; }
        body * { visibility: hidden !important; }
        #patient-id-card, #patient-id-card * { visibility: visible !important; }
        #patient-id-card {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 85.6mm !important;
          height: 54mm !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    `}</style>
    <article
      id="patient-id-card"
      className="mx-auto flex aspect-[1.586/1] w-full max-w-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div className="flex items-center gap-2 border-b border-teal-100 pb-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white">
            <HeartPulse className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-wide">Alem Ketema Enat Hospital</p>
            <p className="text-[9px] text-slate-500">Patient Identification Card</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 py-2">
          <ProfileAvatar
            userId={patient.patientUserId || 0}
            hasPhoto={!!patient.patientUserId}
            initials={patient.fullName.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()}
            className="h-16 w-16 shrink-0 rounded-xl bg-teal-100 text-lg font-bold text-teal-800"
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-extrabold leading-tight">{patient.fullName}</p>
            <p className="mt-1 font-mono text-xs font-bold text-teal-800">{patient.mrn}</p>
          </div>
        </div>
        <div className="flex items-end justify-between border-t border-slate-100 pt-2">
          <div className="text-[8px] leading-relaxed text-slate-500">
            <p>Reception: +251 11 123 4567</p>
            <p>Issued: {patient.issuedAt ? new Date(patient.issuedAt).toLocaleDateString() : new Date().toLocaleDateString()}</p>
          </div>
          <p className="text-[8px] font-bold text-slate-500">Scan for secure identification</p>
        </div>
      </div>
      <div className="flex w-[30%] shrink-0 flex-col items-center justify-center bg-teal-50 p-2">
        <img src={patient.qrCodeDataUrl} alt={`Secure patient QR code for ${patient.mrn}`} className="aspect-square w-full max-w-28" />
        <p className="mt-1 text-center font-mono text-[8px] font-bold text-teal-900">{patient.mrn}</p>
      </div>
    </article>
  </>
);

export default PatientIDCard;
