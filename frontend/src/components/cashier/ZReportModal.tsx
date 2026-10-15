import React, { useState } from 'react';
import {
  Printer, X, CheckCircle2, ShieldCheck, Send
} from 'lucide-react';
import { fmt } from '../../utils/format';

export interface ZReportData {
  hospital: {
    name_en: string;
    name_am: string;
    address_en: string;
    address_am: string;
    telephone: string;
    tin: string;
    telebirrTill: string;
    cbeAccount: string;
  };
  shift: {
    id: number;
    shift_number: string;
    register_id: string;
    cashier_id: number;
    cashier_name: string;
    opened_at: string;
    closed_at: string;
    status: string;
    closing_notes?: string;
    variance_reason?: string;
  };
  openingCashFloat: number;
  paymentBreakdown: {
    cash: number;
    telebirr: number;
    cbeBirr: number;
    card: number;
    bankTransfer: number;
    insurance: number;
    other: number;
    totalConfirmed: number;
  };
  cashReconciliation: {
    openingCash: number;
    cashCollections: number;
    cashRefunds: number;
    expectedClosingCash: number;
    actualCashCounted: number | null;
    variance: number | null;
  };
  digitalPaymentStatus: {
    verified: number;
    pending: number;
    pendingCount: number;
    rejected: number;
  };
  metrics: {
    totalTransactions: number;
    payments?: any[];
  };
}

interface ZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  zReport: ZReportData;
  onHandover?: (shiftId: number, notes: string) => Promise<void>;
}

export const ZReportModal: React.FC<ZReportModalProps> = ({
  isOpen,
  onClose,
  zReport,
  onHandover
}) => {
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submittingHandover, setSubmittingHandover] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | 'standard'>('80mm');

  if (!isOpen || !zReport) return null;

  const { hospital, shift, openingCashFloat, paymentBreakdown, cashReconciliation, digitalPaymentStatus } = zReport;
  const variance = cashReconciliation.variance || 0;
  const isVarianceNegative = variance < -0.01;
  const isVariancePositive = variance > 0.01;

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitHandover = async () => {
    if (!onHandover) return;
    try {
      setSubmittingHandover(true);
      await onHandover(shift.id, handoverNotes);
      setHandoverSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingHandover(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        
        {/* Header Bar (No print) */}
        <div className="no-print flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                End-of-Shift Financial Reconciliation
              </span>
              <span className="text-xs text-slate-300">Shift #{shift.shift_number}</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight mt-1">Official Z-Report / የፈረቃ ማጠቃለያ</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  paperWidth === '80mm' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('standard')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  paperWidth === 'standard' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                Standard
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" /> Print Z-Report
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Printable Z-Report Container */}
          <div className="receipt-print-wrapper flex justify-center">
            <div
              className={`thermal-receipt-container bg-white text-slate-950 p-6 rounded-2xl border border-slate-300 shadow-sm ${
                paperWidth === '80mm' ? 'paper-80mm' : 'paper-standard'
              }`}
            >
              {/* Header */}
              <div className="receipt-header">
                <div className="hospital-title-am font-amharic font-bold text-base">{hospital.name_am}</div>
                <div className="hospital-title-en font-bold text-sm">{hospital.name_en}</div>
                <div className="hospital-contact text-xs">
                  <div>{hospital.address_am} | {hospital.address_en}</div>
                  <div>TIN: {hospital.tin} | Tel: {hospital.telephone}</div>
                </div>
                <div className="receipt-type-badge font-bold text-xs" style={{ margin: '6px 0' }}>
                  CASHIER SHIFT CLOSING REPORT (Z-REPORT) — የገንዘብ ተቀባይ ፈረቃ ማጠቃለያ
                </div>
              </div>

              {/* Meta details */}
              <div className="receipt-meta-row text-xs">
                <span className="label">REGISTER:</span>
                <span className="val font-mono">{shift.register_id}</span>
              </div>
              <div className="receipt-meta-row text-xs">
                <span className="label">CASHIER / ገንዘብ ተቀባይ:</span>
                <span className="val font-bold">{shift.cashier_name}</span>
              </div>
              <div className="receipt-meta-row text-xs">
                <span className="label">SHIFT NUMBER:</span>
                <span className="val font-mono font-bold">{shift.shift_number}</span>
              </div>
              <div className="receipt-meta-row text-xs">
                <span className="label">OPENED AT / የተከፈተበት:</span>
                <span className="val">{shift.opened_at ? new Date(shift.opened_at).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="receipt-meta-row text-xs">
                <span className="label">CLOSED AT / የተዘጋበት:</span>
                <span className="val">{shift.closed_at ? new Date(shift.closed_at).toLocaleString() : new Date().toLocaleString()}</span>
              </div>

              {/* Opening Float */}
              <div className="receipt-divider" />
              <div className="receipt-meta-row text-xs" style={{ fontWeight: 800 }}>
                <span>OPENING CASH FLOAT / የመነሻ ካሽ:</span>
                <span className="font-mono">{fmt(openingCashFloat)} ETB</span>
              </div>

              {/* Payment Summary */}
              <div className="receipt-divider-double" />
              <div className="font-bold text-xs uppercase tracking-wider mb-1">
                Payment Summary / የክፍያዎች ዝርዝር
              </div>
              <div className="space-y-1 text-xs">
                <div className="receipt-meta-row">
                  <span>Cash Collections:</span>
                  <span className="font-mono font-bold">{fmt(paymentBreakdown.cash)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Telebirr Collections:</span>
                  <span className="font-mono font-bold">{fmt(paymentBreakdown.telebirr)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>CBE Birr Collections:</span>
                  <span className="font-mono font-bold">{fmt(paymentBreakdown.cbeBirr)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Card Collections:</span>
                  <span className="font-mono font-bold">{fmt(paymentBreakdown.card)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Bank Collections:</span>
                  <span className="font-mono font-bold">{fmt(paymentBreakdown.bankTransfer)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Insurance Received:</span>
                  <span className="font-mono font-bold">{fmt(paymentBreakdown.insurance)} ETB</span>
                </div>
              </div>

              <div className="receipt-divider" />
              <div className="receipt-meta-row text-xs font-black" style={{ fontSize: '1.05em' }}>
                <span>TOTAL CONFIRMED RECEIPTS:</span>
                <span className="font-mono text-emerald-800">{fmt(paymentBreakdown.totalConfirmed)} ETB</span>
              </div>

              {/* Cash Reconciliation */}
              <div className="receipt-divider-double" />
              <div className="font-bold text-xs uppercase tracking-wider mb-1">
                Cash Reconciliation / የካሽ ማመሳከሪያ
              </div>
              <div className="space-y-1 text-xs">
                <div className="receipt-meta-row">
                  <span>Opening Cash:</span>
                  <span className="font-mono">{fmt(cashReconciliation.openingCash)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>+ Cash Collections:</span>
                  <span className="font-mono">{fmt(cashReconciliation.cashCollections)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>- Cash Refunds Paid Out:</span>
                  <span className="font-mono">-{fmt(cashReconciliation.cashRefunds)} ETB</span>
                </div>
                <div className="receipt-meta-row font-bold border-t border-dashed border-slate-400 pt-1">
                  <span>EXPECTED CLOSING CASH:</span>
                  <span className="font-mono">{fmt(cashReconciliation.expectedClosingCash)} ETB</span>
                </div>
                <div className="receipt-meta-row font-bold">
                  <span>ACTUAL CASH COUNTED:</span>
                  <span className="font-mono">{fmt(cashReconciliation.actualCashCounted || 0)} ETB</span>
                </div>
                <div className="receipt-meta-row font-black border-t border-slate-900 pt-1">
                  <span>CASH VARIANCE / ልዩነት:</span>
                  <span className={`font-mono ${isVarianceNegative ? 'text-red-600' : isVariancePositive ? 'text-blue-600' : 'text-emerald-700'}`}>
                    {variance > 0 ? `+${fmt(variance)}` : fmt(variance)} ETB
                  </span>
                </div>
              </div>

              {/* Digital Payment Status */}
              <div className="receipt-divider-double" />
              <div className="font-bold text-xs uppercase tracking-wider mb-1">
                Digital Payment Status / የዲጂታል ክፍያዎች ሁኔታ
              </div>
              <div className="space-y-1 text-xs">
                <div className="receipt-meta-row">
                  <span>Verified & Confirmed:</span>
                  <span className="font-mono font-bold text-emerald-700">{fmt(digitalPaymentStatus.verified)} ETB</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Pending Merchant Verification:</span>
                  <span className="font-mono font-bold text-amber-600">
                    {fmt(digitalPaymentStatus.pending)} ETB ({digitalPaymentStatus.pendingCount} txns)
                  </span>
                </div>
                <div className="receipt-meta-row">
                  <span>Rejected / Disputed:</span>
                  <span className="font-mono font-bold text-red-600">{fmt(digitalPaymentStatus.rejected)} ETB</span>
                </div>
              </div>

              {/* Notes & Variance Reasons */}
              {shift.variance_reason && (
                <>
                  <div className="receipt-divider" />
                  <div className="text-xs">
                    <span className="font-bold">Variance Reason: </span>
                    <span>{shift.variance_reason}</span>
                  </div>
                </>
              )}

              {shift.closing_notes && (
                <div className="text-xs mt-1">
                  <span className="font-bold">Closing Notes: </span>
                  <span>{shift.closing_notes}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="receipt-signatures text-xs">
                <div className="sign-line">
                  <span>Prepared By (Cashier): {shift.cashier_name}</span>
                  <span>Signature: ________________</span>
                </div>
                <div className="sign-line">
                  <span>Received By (Finance Officer):</span>
                  <span>Signature: ________________</span>
                </div>
              </div>

              <div className="receipt-divider" />
              <div className="receipt-footer-notes text-[10px] text-center font-amharic">
                <p>አለም ከተማ እናት ጠቅላላ ሆስፒታል — የሂሳብ ክፍል ይፋዊ የፈረቃ ሰነድ</p>
                <p>Alem Ketema Enat General Hospital Financial Operations</p>
              </div>
            </div>
          </div>

          {/* Finance Handover Action Card (No print) */}
          <div className="no-print bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Handover Shift to Finance
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Submit the cash and transaction summary to the finance department for formal sign-off.
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                shift.status === 'HANDED_OVER'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : shift.status === 'RECONCILED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
                Status: {shift.status}
              </span>
            </div>

            {handoverSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">Shift handover submitted to Finance successfully. Status is now PENDING FINANCE REVIEW.</span>
              </div>
            ) : shift.status === 'CLOSED' ? (
              <div className="space-y-3">
                <textarea
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Optional handover remarks for receiving finance officer (e.g. Cash counted in cashier booth, physical bills handed to safe)..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSubmitHandover}
                  disabled={submittingHandover}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submittingHandover ? 'Submitting Handover...' : 'Submit Handover to Finance Officer'}
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                This shift is already {shift.status.toLowerCase().replace('_', ' ')}. No further cashier action needed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZReportModal;
