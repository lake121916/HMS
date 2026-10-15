/**
 * ShiftManager — Open / Close Cashier Shift
 * Manages shift lifecycle: open (with opening cash float), view live summary, close (with cash count & variance reason).
 */
import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import {
  Clock, DollarSign, TrendingUp, LogIn, LogOut,
  AlertTriangle, CheckCircle2, RefreshCw, Banknote,
  Smartphone, CreditCard, Building2, ShieldCheck, Info
} from 'lucide-react';

interface ShiftSummary {
  shift: {
    id: number;
    shift_number: string;
    register_id: string;
    cashier_name: string;
    opened_at: string;
    closed_at: string | null;
    status: string;
    closing_notes: string | null;
    cash_variance: number | null;
  };
  openingCash: number;
  cashCollections: number;
  telebirrCollections: number;
  cbeBirrCollections: number;
  cardCollections: number;
  bankCollections: number;
  insuranceCollections: number;
  otherCollections: number;
  expectedClosingCash: number;
  totalConfirmedCollections: number;
  digitalStatus: { verified: number; pending: number; pendingCount: number; rejected: number };
  totalTransactions: number;
}

interface Props {
  onShiftChanged?: (shiftId: number | null) => void;
}

const fmt = (n: number) => n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ShiftManager: React.FC<Props> = ({ onShiftChanged }) => {
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warn'; msg: string } | null>(null);

  // Open shift form
  const [openForm, setOpenForm] = useState({ opening_cash: '', register_id: 'REG-01', notes: '' });
  // Close shift form
  const [closeForm, setCloseForm] = useState({ closing_cash_counted: '', closing_notes: '', variance_reason: '' });
  const [showCloseForm, setShowCloseForm] = useState(false);

  const showToast = (type: 'success' | 'error' | 'warn', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchCurrentShift = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cashier/shifts/current');
      if (res.data.data) {
        setSummary(res.data.data.summary ?? { shift: res.data.data.shift, ...defaultMetrics() });
        onShiftChanged?.(res.data.data.shift?.id ?? null);
      } else {
        setSummary(null);
        onShiftChanged?.(null);
      }
    } catch {
      showToast('error', 'Failed to fetch current shift');
    } finally {
      setLoading(false);
    }
  }, [onShiftChanged]);

  useEffect(() => { fetchCurrentShift(); }, [fetchCurrentShift]);

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/cashier/shifts/open', {
        register_id: openForm.register_id,
        opening_cash: parseFloat(openForm.opening_cash || '0'),
        notes: openForm.notes,
      });
      showToast('success', 'Shift opened successfully');
      setOpenForm({ opening_cash: '', register_id: 'REG-01', notes: '' });
      await fetchCurrentShift();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to open shift');
    } finally {
      setSubmitting(false);
    }
  };

  const closeShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary) return;
    setSubmitting(true);
    try {
      await api.post(`/cashier/shifts/${summary.shift.id}/close`, {
        closing_cash_counted: parseFloat(closeForm.closing_cash_counted || '0'),
        closing_notes: closeForm.closing_notes,
        variance_reason: closeForm.variance_reason,
      });
      showToast('success', 'Shift closed. Z-Report is available.');
      setShowCloseForm(false);
      setCloseForm({ closing_cash_counted: '', closing_notes: '', variance_reason: '' });
      await fetchCurrentShift();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  // Live variance preview while cashier types counted cash
  const liveVariance =
    summary && closeForm.closing_cash_counted !== ''
      ? parseFloat(closeForm.closing_cash_counted) - summary.expectedClosingCash
      : null;

  const varianceColor =
    liveVariance === null ? '' :
    Math.abs(liveVariance) <= 50 ? 'text-emerald-600' :
    Math.abs(liveVariance) <= 200 ? 'text-amber-500' : 'text-red-600';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mr-3" />
        <span className="text-slate-500 text-sm">Loading shift data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'warn' ? 'bg-amber-500' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {summary ? (
        /* ── Active Shift ─────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Shift header banner */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span className="text-emerald-200 text-xs font-semibold uppercase tracking-widest">Active Shift</span>
                </div>
                <h2 className="text-2xl font-bold">{summary.shift.shift_number}</h2>
                <p className="text-emerald-200 text-sm mt-1">
                  {summary.shift.cashier_name} · Register {summary.shift.register_id}
                </p>
                <p className="text-emerald-300 text-xs mt-1">
                  Opened: {new Date(summary.shift.opened_at).toLocaleString('en-ET')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{fmt(summary.totalConfirmedCollections)} ETB</div>
                <div className="text-emerald-200 text-sm">Total Confirmed Collections</div>
                <div className="text-emerald-300 text-xs mt-1">{summary.totalTransactions} transaction{summary.totalTransactions !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>

          {/* Payment method breakdown grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Cash', value: summary.cashCollections, icon: <Banknote className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Telebirr', value: summary.telebirrCollections, icon: <Smartphone className="h-4 w-4" />, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
              { label: 'CBE Birr', value: summary.cbeBirrCollections, icon: <Building2 className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
              { label: 'Card', value: summary.cardCollections, icon: <CreditCard className="h-4 w-4" />, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200' },
              { label: 'Insurance', value: summary.insuranceCollections, icon: <ShieldCheck className="h-4 w-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
              { label: 'Other', value: summary.otherCollections, icon: <DollarSign className="h-4 w-4" />, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
            ].map(m => (
              <div key={m.label} className={`${m.bg} border rounded-2xl p-4 text-center`}>
                <div className={`${m.color} flex justify-center mb-1`}>{m.icon}</div>
                <div className={`font-bold text-sm ${m.color}`}>{fmt(m.value)}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Cash reconciliation panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Cash Reconciliation Preview
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Opening Float', value: fmt(summary.openingCash) + ' ETB' },
                { label: '+ Cash Collected This Shift', value: fmt(summary.cashCollections) + ' ETB', highlight: 'emerald' },
                { label: '= Expected Closing Cash', value: fmt(summary.expectedClosingCash) + ' ETB', bold: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 ${r.bold ? 'font-semibold' : ''}`}>
                  <span className="text-slate-500">{r.label}</span>
                  <span className={r.highlight === 'emerald' ? 'text-emerald-600 font-medium' : ''}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending digital alert */}
          {(summary.digitalStatus.pending > 0 || summary.digitalStatus.rejected > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-semibold text-amber-800">Digital Payment Verification Required</div>
                <div className="text-amber-700 mt-1">
                  {summary.digitalStatus.pendingCount} payment{summary.digitalStatus.pendingCount !== 1 ? 's' : ''} pending reconciliation
                  — {fmt(summary.digitalStatus.pending)} ETB.
                  Use the <strong>Digital Verification</strong> tab to confirm each transaction reference before closing.
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowCloseForm(v => !v)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition shadow"
            >
              <LogOut className="h-4 w-4" />
              {showCloseForm ? 'Cancel Close' : 'Close Shift'}
            </button>
            <button
              onClick={fetchCurrentShift}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-sm text-slate-600 rounded-xl transition"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Live Data
            </button>
          </div>

          {/* Close shift form */}
          {showCloseForm && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-red-200 dark:border-red-900 p-6 shadow-sm">
              <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-5">
                <LogOut className="h-4 w-4" />
                Close Shift — Physical Cash Count
              </h3>
              <form onSubmit={closeShift} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                      Physically Counted Cash (ETB) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={closeForm.closing_cash_counted}
                      onChange={e => setCloseForm(f => ({ ...f, closing_cash_counted: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 font-mono text-lg"
                      placeholder="0.00"
                      autoFocus
                    />
                    {liveVariance !== null && (
                      <div className={`mt-2 text-xs font-semibold flex items-center gap-1 ${varianceColor}`}>
                        <Info className="h-3.5 w-3.5" />
                        Variance: {liveVariance >= 0 ? '+' : ''}{fmt(liveVariance)} ETB
                        &nbsp;·&nbsp;Expected: {fmt(summary.expectedClosingCash)} ETB
                        {Math.abs(liveVariance) <= 50
                          ? ' ✓ Within tolerance'
                          : ' ⚠ Reason required'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Closing Notes</label>
                    <input
                      value={closeForm.closing_notes}
                      onChange={e => setCloseForm(f => ({ ...f, closing_notes: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                      placeholder="End-of-shift remarks…"
                    />
                  </div>
                </div>
                {liveVariance !== null && Math.abs(liveVariance) > 50 && (
                  <div>
                    <label className="text-xs font-medium text-amber-700 block mb-1">
                      Variance Explanation * (mandatory — variance exceeds 50 ETB threshold)
                    </label>
                    <textarea
                      value={closeForm.variance_reason}
                      onChange={e => setCloseForm(f => ({ ...f, variance_reason: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      placeholder="Explain the discrepancy in detail…"
                    />
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowCloseForm(false)}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-100 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow">
                    <LogOut className="h-4 w-4" />
                    {submitting ? 'Closing Shift…' : 'Confirm & Close Shift'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        /* ── No Active Shift ────────────────────────────────────── */
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 p-10 text-center">
            <Clock className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-white">No Active Shift</h3>
            <p className="text-sm text-slate-500 mt-1">Open a shift to begin accepting payments for this register session</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
              <LogIn className="h-4 w-4 text-emerald-500" />
              Open New Shift
            </h3>
            <form onSubmit={openShift} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Opening Cash Float (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openForm.opening_cash}
                    onChange={e => setOpenForm(f => ({ ...f, opening_cash: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                    placeholder="e.g. 500.00"
                  />
                  <p className="text-xs text-slate-400 mt-1">Amount of cash placed in register at shift start</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Register ID</label>
                  <select
                    value={openForm.register_id}
                    onChange={e => setOpenForm(f => ({ ...f, register_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {['REG-01', 'REG-02', 'REG-03'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Opening Notes (optional)</label>
                  <input
                    value={openForm.notes}
                    onChange={e => setOpenForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    placeholder="e.g. Received cash float from Finance on handover"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition shadow">
                  <LogIn className="h-4 w-4" />
                  {submitting ? 'Opening Shift…' : 'Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function defaultMetrics() {
  return {
    openingCash: 0, cashCollections: 0, telebirrCollections: 0, cbeBirrCollections: 0,
    cardCollections: 0, bankCollections: 0, insuranceCollections: 0, otherCollections: 0,
    expectedClosingCash: 0, totalConfirmedCollections: 0,
    digitalStatus: { verified: 0, pending: 0, pendingCount: 0, rejected: 0 },
    totalTransactions: 0,
  };
}

export default ShiftManager;
