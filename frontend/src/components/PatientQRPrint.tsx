import React from 'react';
import { Printer } from 'lucide-react';

const PatientQRPrint: React.FC = () => (
  <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800"
  >
    <Printer className="h-4 w-4" />
    Print Patient Card
  </button>
);

export default PatientQRPrint;
