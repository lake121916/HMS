import React from 'react';
import { X, QrCode } from 'lucide-react';
import PatientQRScanner, { VerifiedPatient } from './PatientQRScanner';

export interface WristbandScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientVerified?: (patientData: any) => void;
  qrOnly?: boolean;
  continueLabel?: string;
}

const WristbandScannerModal: React.FC<WristbandScannerModalProps> = ({
  isOpen,
  onClose,
  onPatientVerified,
  qrOnly = false,
  continueLabel
}) => {
  if (!isOpen) return null;

  const handleVerified = (result: { patient: VerifiedPatient; verified_at?: string }) => {
    if (onPatientVerified) {
      onPatientVerified(result);
    }
  };

  const handleContinue = (result: { patient: VerifiedPatient; verified_at?: string }) => {
    if (onPatientVerified) {
      onPatientVerified(result);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col my-auto max-h-[96dvh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Scan Patient QR Code
              </h2>
              <p className="text-xs text-teal-200/80">
                Identify patient using webcam, laptop, Android or iPhone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner modal"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with PatientQRScanner */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          <PatientQRScanner
            autoStart={true}
            compact={true}
            showHeader={false}
            continueLabel={continueLabel}
            allowManualInput={!qrOnly}
            onPatientVerified={handleVerified}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  );
};

export default WristbandScannerModal;
