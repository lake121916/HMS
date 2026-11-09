import React from 'react';
import { RefreshCw, QrCode } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PatientIDCard, { type PatientCardData } from './PatientIDCard';
import PatientQRDownload from './PatientQRDownload';
import PatientQRPrint from './PatientQRPrint';

interface PatientQRCodeProps {
  patientId: number;
  initialQr?: PatientCardData | null;
}

const PatientQRCode: React.FC<PatientQRCodeProps> = ({ patientId, initialQr }) => {
  const { user } = useAuth();
  const [qr, setQr] = React.useState<PatientCardData | null>(initialQr || null);
  const [loading, setLoading] = React.useState(!initialQr);
  const [error, setError] = React.useState('');

  const loadQr = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/patients/${patientId}/qr`);
      setQr(response.data.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to load patient QR code.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => {
    if (!initialQr) void loadQr();
  }, [initialQr, loadQr]);

  const regenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post(`/patients/${patientId}/qr/regenerate`);
      setQr(response.data.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to regenerate patient QR code.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="py-4 text-center text-xs text-slate-500">Preparing secure patient QR code…</p>;
  }
  if (!qr) {
    return (
      <div role="alert" className="space-y-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
        <p>{error || 'Patient QR code is unavailable.'}</p>
        <button type="button" onClick={() => void loadQr()} className="font-bold underline">Try again</button>
      </div>
    );
  }

  const isAdministrator = user?.role === 'admin' || user?.role === 'super_admin';

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
        <QrCode className="h-4 w-4 text-teal-700" />
        Patient identification card
      </div>
      <PatientIDCard patient={qr} />
      <div className="flex flex-wrap gap-2">
        <PatientQRDownload qrCodeDataUrl={qr.qrCodeDataUrl} patientId={qr.patientId} />
        <PatientQRPrint />
        {isAdministrator && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void regenerate()}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate QR
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
};

export default PatientQRCode;
