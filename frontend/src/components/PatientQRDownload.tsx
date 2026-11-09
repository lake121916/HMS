import React from 'react';
import { Download } from 'lucide-react';

interface PatientQRDownloadProps {
  qrCodeDataUrl: string;
  patientId: number;
}

const PatientQRDownload: React.FC<PatientQRDownloadProps> = ({ qrCodeDataUrl, patientId }) => (
  <a
    href={qrCodeDataUrl}
    download={`PAT-${String(patientId).padStart(4, '0')}-qr.png`}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
  >
    <Download className="h-4 w-4" />
    Download QR
  </a>
);

export default PatientQRDownload;
