/**
 * CashierWorkflow — Main Cashier Station Page (Migration 008 Feature Set)
 *
 * Tabs:
 *  1. Billing Queue  — Process payments for pending encounters/invoices
 *  2. Shift Manager  — Open / close shifts with cash float & variance
 *  3. Z-Report       — Full shift reconciliation report with print
 *  4. Thermal Print  — Receipt lookup, 80mm print, audited reprint
 *  5. Digital Verify — Telebirr / CBE reference verification + pending list
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Receipt, CreditCard, DollarSign, CheckCircle2,
  RefreshCw, Printer, Clock, FileText, Smartphone,
  ShieldCheck, ChevronRight
} from 'lucide-react';

import ShiftManager from '../components/cashier/ShiftManager';
import ZReportView from '../components/cashier/ZReportView';
import ThermalReceiptPrint from '../components/cashier/ThermalReceiptPrint';
import DigitalPaymentVerifier from '../components/cashier/DigitalPaymentVerifier';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingEncounter {
  id: number;
  encounter_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  priority: string;
  chief_complaint: string;
  invoice_id: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  invoice_status: string;
}

interface InvoiceDetail {
  invoice: any;
  items: any[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'billing',  label: 'Billing Queue',    icon: <Receipt className="h-4 w-4" /> },
  { id: 'shift',    label: 'Shift Manager',     icon: <Clock className="h-4 w-4" /> },
  { id: 'zreport',  label: 'Z-Report',          icon: <FileText className="h-4 w-4" /> },
  { id: 'receipt',  label: 'Thermal Print',     icon: <Printer className="h-4 w-4" /> },
  { id: 'digital',  label: 'Digital Verify',    icon: <Smartphone className="h-4 w-4" /> },
] as const;

type TabId = typeof TABS[number]['id'];

const statusColors: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  partial:   'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  unpaid:    'bg-amber-100 text-amber-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

const CashierWorkflow: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('billing');
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);

  // Billing queue state
  const [encounters, setEncounters] = useState<PendingEncounter[]>([]);
  const [selected, setSelected] = useState<PendingEncounter | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_method: 'cash', transaction_id: '', notes: ''
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  useEffect(() => { fetchQueue(); }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/encounters/cashier/pending');
      setEncounters(res.data.data.encounters || []);
    } catch { showToast('error', 'Failed to load billing queue'); }
    finally { setLoading(false); }
  };

  const openEncounter = async (enc: PendingEncounter) => {
    setSelected(enc);
    setPaymentForm({ amount: enc.balance?.toString() || '', payment_method: 'cash', transaction_id: '', notes: '' });
    setShowReceipt(false);
    setLastPayment(null);
    try {
      const res = await api.get(`/encounters/${enc.id}/billing`);
      setInvoiceDetail(res.data.data);
    } catch {
      try {
        const res2 = await api.get(`/invoices/${enc.invoice_id}`);
        const inv = res2.data.data;
        setInvoiceDetail({ invoice: inv.invoice, items: [] });
      } catch { }
    }
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !invoiceDetail?.invoice) return;
    setSubmitting(true);
    try {
      const payRes = await api.post('/cashier/payments/process', {
        invoice_id: invoiceDetail.invoice.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        transaction_id: paymentForm.transaction_id || undefined,
        notes: paymentForm.notes || undefined,
        shift_id: activeShiftId || undefined,
      });
      const payment = payRes.data.data?.payment || payRes.data.data;
      setLastPayment(payment);
      showToast('success', `Payment of ${parseFloat(paymentForm.amount).toLocaleString()} ETB recorded! Receipt: ${payment?.receipt_number || ''}`);
      setShowReceipt(true);
      await openEncounter(selected);
      fetchQueue();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Payment failed');
    } finally { setSubmitting(false); }
  };

  const printReceipt = () => window.print();

  const totalPending = encounters.reduce((s, e) => s + (e.balance || 0), 0);
  const needsRef = ['telebirr', 'cbe_birr', 'bank_transfer'].includes(paymentForm.payment_method);

  return (
    <div className="space-y-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
            <ShieldCheck className="h-3 w-3" />
            Cashier Station
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Payment Processing</h1>
          <p className="text-sm text-slate-500 mt-1">
            Shift-based payment collection, receipt printing, and digital payment verification
            {activeShiftId && (
              <span className="ml-2 text-emerald-600 font-medium">· Shift #{activeShiftId} Active</span>
            )}
          </p>
        </div>
        <button onClick={fetchQueue} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-sm text-slate-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition
              ${activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'billing' && encounters.length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {encounters.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: Billing Queue ────────────────────────────────────── */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pending Payments', value: encounters.length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
              { label: 'Outstanding Balance', value: `${totalPending.toLocaleString()} ETB`, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
              { label: 'Partial Invoices', value: `${encounters.filter(e => ['partial'].includes(e.invoice_status)).length}`, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-slate-600 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
            {/* Queue panel */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                  <Receipt className="h-4 w-4 text-emerald-500" />
                  Payment Queue
                </h2>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-400px)] divide-y divide-slate-100 dark:divide-slate-700">
                {encounters.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle2 className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">All payments up to date!</p>
                  </div>
                ) : encounters.map(enc => (
                  <div
                    key={enc.id}
                    onClick={() => openEncounter(enc)}
                    className={`p-4 cursor-pointer transition
                      ${selected?.id === enc.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm text-slate-900 dark:text-white">
                          {enc.first_name} {enc.last_name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {enc.encounter_number}
                        </div>
                        {enc.chief_complaint && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-1">📋 {enc.chief_complaint}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {parseFloat(enc.balance?.toString() || '0').toLocaleString()} ETB
                        </div>
                        <div className="text-xs text-slate-400">outstanding</div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[enc.invoice_status] || 'bg-slate-100 text-slate-600'}`}>
                          {enc.invoice_status}
                        </span>
                      </div>
                    </div>
                    {selected?.id === enc.id && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <ChevronRight className="h-3 w-3" /> Selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Invoice detail + payment form */}
            {selected && invoiceDetail ? (
              <div className="space-y-4">
                {/* Invoice header */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                        Invoice #{invoiceDetail.invoice.id}
                      </h3>
                      <div className="text-sm text-slate-500 mt-1">
                        {selected.first_name} {selected.last_name} · {selected.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {parseFloat(invoiceDetail.invoice.total_amount || 0).toLocaleString()} ETB
                      </div>
                      <div className="text-sm text-emerald-600">
                        Paid: {parseFloat(invoiceDetail.invoice.amount_paid || 0).toLocaleString()} ETB
                      </div>
                      <div className="text-sm font-semibold text-red-600">
                        Balance: {(parseFloat(invoiceDetail.invoice.total_amount || 0) - parseFloat(invoiceDetail.invoice.amount_paid || 0)).toLocaleString()} ETB
                      </div>
                    </div>
                  </div>

                  {/* Line items table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <span>Service/Item</span><span>Qty</span><span>Unit Price</span><span>Subtotal</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(invoiceDetail.items || []).length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400 italic">No itemised breakdown available</div>
                      ) : (invoiceDetail.items || []).map((item: any) => (
                        <div key={item.id} className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                          <div>
                            <div className="text-sm text-slate-900 dark:text-white">{item.description}</div>
                            <div className="text-xs text-slate-400 capitalize">{(item.source_type || '').replace('_', ' ')}</div>
                          </div>
                          <div className="text-sm text-slate-600 text-center">{item.quantity}</div>
                          <div className="text-sm text-slate-600">{parseFloat(item.unit_price).toLocaleString()} ETB</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">{parseFloat(item.subtotal).toLocaleString()} ETB</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 flex justify-end">
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        Total: {parseFloat(invoiceDetail.invoice.total_amount || 0).toLocaleString()} ETB
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment form */}
                {(parseFloat(invoiceDetail.invoice.total_amount || 0) - parseFloat(invoiceDetail.invoice.amount_paid || 0)) > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-500" />
                      Record Payment
                      {!activeShiftId && (
                        <span className="text-xs text-amber-600 ml-1 font-normal">
                          (No active shift — open a shift first for receipt tracking)
                        </span>
                      )}
                    </h3>
                    <form onSubmit={recordPayment} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Amount (ETB) *</label>
                          <input
                            type="number" step="0.01" required min="0.01"
                            max={parseFloat(invoiceDetail.invoice.total_amount || 0) - parseFloat(invoiceDetail.invoice.amount_paid || 0)}
                            value={paymentForm.amount}
                            onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Payment Method *</label>
                          <select
                            value={paymentForm.payment_method}
                            onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          >
                            {[
                              ['cash', '💵 Cash'],
                              ['card', '💳 Card'],
                              ['telebirr', '📱 Telebirr'],
                              ['cbe_birr', '🏦 CBE Birr'],
                              ['bank_transfer', '🏦 Bank Transfer'],
                              ['insurance', '🏥 Insurance'],
                              ['online', '🌐 Online'],
                              ['check', '📄 Cheque'],
                            ].map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            Transaction Reference {needsRef ? '*' : ''}
                          </label>
                          <input
                            value={paymentForm.transaction_id}
                            required={needsRef}
                            onChange={e => setPaymentForm(f => ({ ...f, transaction_id: e.target.value }))}
                            placeholder={needsRef ? 'Required for digital payments' : 'Optional'}
                            className={`mt-1 w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 dark:bg-slate-900
                              ${needsRef ? 'border-violet-300 focus:ring-violet-300' : 'border-slate-200 dark:border-slate-600 focus:ring-emerald-300'}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                          <input
                            value={paymentForm.notes}
                            onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Any remarks…"
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          />
                        </div>
                      </div>
                      {needsRef && (
                        <div className="flex items-center gap-2 text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                          <Smartphone className="h-3.5 w-3.5 shrink-0" />
                          Use the <strong>Digital Verify</strong> tab to pre-validate this reference before posting
                        </div>
                      )}
                      <div className="flex gap-3 justify-end">
                        <button type="submit" disabled={submitting}
                          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                          <DollarSign className="h-4 w-4" />
                          {submitting ? 'Processing…' : 'Record Payment'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Receipt confirmation */}
                {showReceipt && lastPayment && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Payment Confirmed
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActiveTab('receipt');
                            // Pre-fill search with receipt number
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Full Print
                        </button>
                        <button onClick={printReceipt}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                          <Printer className="h-3.5 w-3.5" />
                          Quick Print
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      {[
                        { l: 'Patient', v: `${selected.first_name} ${selected.last_name}` },
                        { l: 'Receipt #', v: lastPayment.receipt_number || '—' },
                        { l: 'Invoice #', v: invoiceDetail.invoice.id },
                        { l: 'Amount Paid', v: `${parseFloat(lastPayment.amount).toLocaleString()} ETB`, green: true },
                        { l: 'Method', v: lastPayment.payment_method?.replace('_', ' ') },
                        { l: 'Date/Time', v: new Date(lastPayment.payment_date || Date.now()).toLocaleString() },
                      ].map(r => (
                        <div key={r.l} className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                          <span className="text-slate-500">{r.l}</span>
                          <span className={`font-medium ${r.green ? 'text-emerald-600 font-bold' : ''}`}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[400px]">
                <div className="text-center text-slate-400 px-8">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Select a patient from the queue to view invoice and process payment</p>
                  <p className="text-xs mt-2 text-slate-300">Invoices are automatically generated by the system</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Shift Manager ────────────────────────────────────── */}
      {activeTab === 'shift' && (
        <ShiftManager onShiftChanged={setActiveShiftId} />
      )}

      {/* ── TAB: Z-Report ────────────────────────────────────────── */}
      {activeTab === 'zreport' && (
        <div className="space-y-4">
          {!activeShiftId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              No active shift found. Open a shift on the <strong>Shift Manager</strong> tab first, or view a past shift by ID.
            </div>
          )}
          <ZReportView shiftId={activeShiftId} />
        </div>
      )}

      {/* ── TAB: Thermal Receipt Print ───────────────────────────── */}
      {activeTab === 'receipt' && (
        <ThermalReceiptPrint />
      )}

      {/* ── TAB: Digital Verify ──────────────────────────────────── */}
      {activeTab === 'digital' && (
        <DigitalPaymentVerifier shiftId={activeShiftId} />
      )}
    </div>
  );
};

export default CashierWorkflow;
