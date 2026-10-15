/**
 * ZReportView — Official Z-Report / End-of-Shift Reconciliation
 * Displays a full formatted Z-report for a closed or current shift,
 * with hospital header, payment breakdown table, cash reconciliation,
 * digital status, and a complete transaction ledger.
 */
import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import {
  FileText, Printer, RefreshCw, AlertTriangle, CheckCircle2,
  Banknote, Smartphone, Building2, CreditCard, ShieldCheck,
  DollarSign, ChevronDown, ChevronUp
} from 'lucide-react';

interface ZReport {
  hospital: {
    name_en: string;
    name_am: string;
    address_en: string;
    telephone: string;
    tin: string;
    telebirrTill: string;
    cbeAccount: string;
  };
  shift: {
    id: number;
    shift_number: string;
    register_id: string;
    cashier_name: string;
    opened_at: string;
    closed_at: string | null;
    status: string;
    closing_notes: string | null;
    variance_reason: string | null;
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
    payments: PaymentRow[];
  };
}

interface PaymentRow {
  id: number;
  receipt_number: string;
  patient_name: string;
  patient_id: string;
  amount: number;
  payment_method: string;
  payment_provider: string;
  verification_status: string;
  payment_date: string;
  invoice_number: string;
}

interface Props {
  shiftId?: number | null;
}

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const methodIcon: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3.5 w-3.5" />,
  telebirr: <Smartphone className="h-3.5 w-3.5" />,
  cbe_birr: <Building2 className="h-3.5 w-3.5" />,
  bank_transfer: <Building2 className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
  insurance: <ShieldCheck className="h-3.5 w-3.5" />,
};

const statusBadge = (s: string) => {
  if (s === 'VERIFIED') return 'bg-emerald-100 text-emerald-700';
  if (s === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (s === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-500';
};

export const ZReportView: React.FC<Props> = ({ shiftId }) => {
  const [report, setReport] = useState<ZReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    if (!shiftId) { setReport(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/cashier/shifts/${shiftId}/z-report`);
      setReport(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load Z-Report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [shiftId]);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`
      <html><head><title>Z-Report — ${report?.shift.shift_number}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 11px; margin: 20px; color: #000; }
        h1 { font-size: 14px; text-align: center; margin-bottom: 2px; }
        h2 { font-size: 12px; text-align: center; color: #444; margin: 2px 0 8px; }
        .divider { border-top: 1px dashed #999; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .row.bold { font-weight: bold; }
        .row.total { border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { border-bottom: 1px solid #333; padding: 3px 4px; text-align: left; font-weight: bold; font-size: 9px; }
        td { padding: 2px 4px; font-size: 9px; border-bottom: 1px solid #eee; }
        .badge { padding: 1px 4px; border-radius: 3px; font-size: 8px; }
        .verified { background: #d1fae5; color: #065f46; }
        .pending { background: #fef3c7; color: #92400e; }
        .rejected { background: #fee2e2; color: #991b1b; }
        @media print { @page { size: A4; margin: 15mm; } }
      </style></head><body>${printContent}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  if (!shiftId) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
        <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Open or close a shift first to generate the Z-Report</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mr-2" />
        <span className="text-slate-500 text-sm">Generating Z-Report…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div>
          <div className="font-semibold text-red-700">Failed to load Z-Report</div>
          <div className="text-sm text-red-600 mt-0.5">{error}</div>
          <button onClick={fetchReport} className="mt-2 text-xs text-red-600 underline">Retry</button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { hospital, shift, paymentBreakdown: pb, cashReconciliation: cr, digitalPaymentStatus: dp, metrics } = report;
  const varColor = cr.variance === null ? '' : Math.abs(cr.variance) <= 50 ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          Z-Report — {shift.shift_number}
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            shift.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' :
            shift.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' :
            shift.status === 'RECONCILED' ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>{shift.status}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={fetchReport} className="flex items-center gap-1 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-sm text-slate-600 rounded-xl transition">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition">
            <Printer className="h-4 w-4" />
            Print Z-Report
          </button>
        </div>
      </div>

      {/* Printable report content */}
      <div ref={printRef} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Hospital header */}
        <div className="bg-slate-900 text-white p-6 text-center">
          <div className="text-lg font-bold">{hospital.name_en}</div>
          <div className="text-slate-400 text-sm mt-0.5">{hospital.name_am}</div>
          <div className="text-slate-400 text-xs mt-1">{hospital.address_en}</div>
          <div className="text-slate-400 text-xs">{hospital.telephone}</div>
          <div className="text-slate-300 text-xs mt-1">TIN: {hospital.tin}</div>
          <div className="mt-3 font-mono text-xl font-bold tracking-widest text-emerald-400">— Z REPORT —</div>
        </div>

        {/* Shift info */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2 text-sm">
          {[
            { l: 'Shift #', v: shift.shift_number },
            { l: 'Register', v: shift.register_id },
            { l: 'Cashier', v: shift.cashier_name },
            { l: 'Opened', v: new Date(shift.opened_at).toLocaleString('en-ET') },
            { l: 'Closed', v: shift.closed_at ? new Date(shift.closed_at).toLocaleString('en-ET') : '—' },
            { l: 'Transactions', v: String(metrics.totalTransactions) },
          ].map(r => (
            <div key={r.l} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700 last:border-0 col-span-1">
              <span className="text-slate-500">{r.l}</span>
              <span className="font-medium text-slate-900 dark:text-white">{r.v}</span>
            </div>
          ))}
        </div>

        {/* Payment breakdown */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Payment Breakdown</div>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Cash', value: pb.cash, icon: <Banknote className="h-3.5 w-3.5 text-emerald-500" /> },
              { label: 'Telebirr (Verified)', value: pb.telebirr, icon: <Smartphone className="h-3.5 w-3.5 text-violet-500" /> },
              { label: 'CBE Birr / Bank Transfer', value: pb.cbeBirr, icon: <Building2 className="h-3.5 w-3.5 text-blue-500" /> },
              { label: 'Card', value: pb.card, icon: <CreditCard className="h-3.5 w-3.5 text-sky-500" /> },
              { label: 'Insurance', value: pb.insurance, icon: <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> },
              { label: 'Other', value: pb.other, icon: <DollarSign className="h-3.5 w-3.5 text-slate-400" /> },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700 last:border-0">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {r.icon}{r.label}
                </div>
                <span className="font-mono font-medium">{fmt(r.value)} ETB</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 border-t-2 border-slate-300 dark:border-slate-500 mt-2 font-bold text-base">
              <span className="text-slate-900 dark:text-white">Total Confirmed</span>
              <span className="text-emerald-600 font-mono">{fmt(pb.totalConfirmed)} ETB</span>
            </div>
          </div>
        </div>

        {/* Cash reconciliation */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Cash Reconciliation</div>
          <div className="space-y-2 text-sm">
            {[
              { l: 'Opening Float', v: fmt(cr.openingCash) + ' ETB' },
              { l: '+ Cash Collected', v: fmt(cr.cashCollections) + ' ETB' },
              { l: '− Cash Refunds', v: fmt(cr.cashRefunds) + ' ETB' },
              { l: 'Expected Closing Cash', v: fmt(cr.expectedClosingCash) + ' ETB', bold: true },
            ].map(r => (
              <div key={r.l} className={`flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700 last:border-0 ${r.bold ? 'font-semibold' : ''}`}>
                <span className="text-slate-500">{r.l}</span>
                <span className="font-mono">{r.v}</span>
              </div>
            ))}
            {cr.actualCashCounted !== null && (
              <>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Actual Counted Cash</span>
                  <span className="font-mono font-semibold">{fmt(cr.actualCashCounted)} ETB</span>
                </div>
                <div className={`flex justify-between py-2 border-t border-dashed border-slate-300 font-bold ${varColor}`}>
                  <span>Variance</span>
                  <span className="font-mono">
                    {cr.variance! >= 0 ? '+' : ''}{fmt(cr.variance!)} ETB
                    {Math.abs(cr.variance!) <= 50 ? ' ✓' : ' ⚠'}
                  </span>
                </div>
              </>
            )}
          </div>
          {shift.variance_reason && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Variance Note:</span> {shift.variance_reason}
            </div>
          )}
        </div>

        {/* Digital payment status */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Digital Payment Status</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { l: 'Verified', v: dp.verified, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-4 w-4" /> },
              { l: 'Pending', v: dp.pending, note: `${dp.pendingCount} txn`, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle className="h-4 w-4" /> },
              { l: 'Rejected', v: dp.rejected, color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <AlertTriangle className="h-4 w-4" /> },
            ].map(r => (
              <div key={r.l} className={`${r.bg} border rounded-xl p-3 text-center`}>
                <div className={`${r.color} flex justify-center mb-1`}>{r.icon}</div>
                <div className={`font-bold text-sm ${r.color} font-mono`}>{fmt(r.v)}</div>
                <div className="text-xs text-slate-500">{r.l}</div>
                {r.note && <div className="text-xs text-slate-400 mt-0.5">{r.note}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Transaction ledger (collapsible) */}
        <div className="px-6 py-4">
          <button
            onClick={() => setShowLedger(v => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Transaction Ledger ({metrics.payments.length} receipts)
            </div>
            {showLedger ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>

          {showLedger && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    {['Receipt #', 'Patient', 'Amount', 'Method', 'Status', 'Time'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {metrics.payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{p.receipt_number}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.patient_name}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">{fmt(p.amount)} ETB</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          {methodIcon[p.payment_method] ?? <DollarSign className="h-3.5 w-3.5" />}
                          {p.payment_method?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge(p.verification_status)}`}>
                          {p.verification_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                        {new Date(p.payment_date).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-700">
          Generated: {new Date().toLocaleString('en-ET')} · This is an official financial document.
        </div>
      </div>
    </div>
  );
};

export default ZReportView;
