import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2, XCircle, ShieldAlert,
  Building2, ArrowLeft
} from 'lucide-react';

interface VerificationData {
  status: 'valid' | 'revoked' | 'expired';
  document_number: string;
  document_type: string;
  patient_name_masked: string;
  patient_mrn: string;
  issued_at: string;
  issued_by: string;
  hospital: string;
  region: string;
  verified: boolean;
}

export const DocumentVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/documents/verify/${token}`);
        if (res.data?.success) {
          setData(res.data.data);
        } else {
          setError(res.data?.message || 'Verification record not found.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or unverifiable document security token.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const documentTypeLabels: Record<string, { en: string; am: string }> = {
    prescription: { en: 'Official Medical Prescription', am: 'የህክምና ማዘዣ ወረቀት' },
    lab_result: { en: 'Laboratory Diagnostic Certificate', am: 'የላብራቶሪ ምርመራ የምስክር ወረቀት' },
    discharge_summary: { en: 'Inpatient Clinical Discharge Summary', am: 'የታካሚ ሆስፒታል መልቀቂያ ማጠቃለያ' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Hospital Branding Header */}
        <div className="bg-blue-900 text-white p-6 text-center">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-wide">ዓለም ከተማ እናት ሆስፒታል</h1>
          <h2 className="text-sm font-bold text-blue-200 uppercase tracking-wider">Alem Ketema Enat Hospital</h2>
          <p className="text-[11px] text-blue-300 mt-1">North Shewa, Amhara Region, Ethiopia</p>
        </div>

        {/* Verification Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-semibold">Validating cryptographic document security token...</p>
            </div>
          ) : error || !data ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-red-600 bg-red-100 px-3 py-1 rounded-full">
                VERIFICATION FAILED
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-3">
                Unverified Document
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                {error || 'This digital security token is not associated with any authentic medical record from Alem Ketema Enat Hospital.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
                data.status === 'valid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
              }`}>
                {data.status === 'valid' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">
                    {data.status === 'valid' ? '✓ Verified Authentic Document' : `Status: ${data.status.toUpperCase()}`}
                  </h3>
                  <p className="text-[11px] opacity-90">
                    Digitally validated by Alem Ketema Enat Hospital Health Records Authority.
                  </p>
                </div>
              </div>

              {/* Record Summary */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Document Type</span>
                  <strong className="text-slate-900 dark:text-white text-sm">
                    {documentTypeLabels[data.document_type]?.en || data.document_type}
                  </strong>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    {documentTypeLabels[data.document_type]?.am}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Document Number</span>
                    <strong className="text-blue-700 dark:text-blue-400 font-mono text-xs">{data.document_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Date Issued</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-xs">
                      {new Date(data.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Patient Identifier</span>
                  <div className="flex items-center justify-between text-xs mt-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{data.patient_name_masked}</span>
                    <span className="font-mono text-slate-500 text-[11px]">MRN: {data.patient_mrn}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Authorized Clinician</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Dr. / Staff {data.issued_by}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-[10px] text-blue-800 dark:text-blue-300 text-center leading-relaxed">
                🛡️ Patient diagnostic and clinical details are privacy-protected under Ethiopian Health Data Protection standards.
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Hospital Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DocumentVerificationPage;
