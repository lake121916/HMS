/**
 * Enhanced Cashier Dashboard
 * - Auto-generated invoices queue
 * - Invoice item breakdown
 * - Payment recording
 * - Receipt generation
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Receipt, CreditCard, DollarSign, CheckCircle2,
  RefreshCw, Printer
} from 'lucide-react';

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

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const CashierWorkflow: React.FC = () => {
  const [encounters, setEncounters] = useState<PendingEncounter[]>([]);
  const [selected, setSelected] = useState<PendingEncounter | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '', payment_method: 'cash', transaction_id: '', notes: ''
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<any>(null);

  useEffect(() => { fetchQueue(); }, []);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
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
    try {
      const res = await api.get(`/encounters/${enc.id}/billing`);
      setInvoiceDetail(res.data.data);
    } catch {
      // Try by invoice ID
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
      const payRes = await api.post('/payments', {
        invoice_id: invoiceDetail.invoice.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        transaction_id: paymentForm.transaction_id || undefined,
        notes: paymentForm.notes || undefined,
      });
      setLastPayment(payRes.data.data.payment);
      showToast('success', `Payment of ${parseFloat(paymentForm.amount).toLocaleString()} ETB recorded!`);
      setShowReceipt(true);
      // Refresh
      await openEncounter(selected);
      fetchQueue();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Payment failed');
    } finally { setSubmitting(false); }
  };

  const printReceipt = () => {
    window.print();
  };

  const totalPending = encounters.reduce((s, e) => s + (e.balance || 0), 0);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Cashier Station
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Billing & Payment Processing</h1>
          <p className="text-sm text-slate-500 mt-1">Invoices are auto-generated — receive and record payments</p>
        </div>
        <button onClick={fetchQueue} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-sm text-slate-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Payments', value: encounters.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Outstanding Balance', value: `${totalPending.toLocaleString()} ETB`, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Invoice Items', value: encounters.filter(e => e.invoice_status === 'partial').length + ' partial', color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-200`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Queue */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-500" />
              Payment Queue
            </h2>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-350px)] divide-y divide-slate-100 dark:divide-slate-700">
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
                      {enc.encounter_number} · #{enc.id}
                    </div>
                    {enc.chief_complaint && (
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">📋 {enc.chief_complaint}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {parseFloat(enc.balance?.toString() || '0').toLocaleString()} ETB
                    </div>
                    <div className="text-xs text-slate-400">outstanding</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[enc.invoice_status] || 'bg-slate-100 text-slate-600'}`}>
                      {enc.invoice_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice Detail + Payment */}
        {selected && invoiceDetail ? (
          <div className="space-y-4">
            {/* Invoice Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                    Invoice #{invoiceDetail.invoice.id}
                  </h3>
                  <div className="text-sm text-slate-500 mt-1">
                    Patient: {selected.first_name} {selected.last_name} · {selected.phone}
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

              {/* Line Items */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <span>Service/Item</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span>Subtotal</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {(invoiceDetail.items || []).length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">Loading items...</div>
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

            {/* Payment Form */}
            {(parseFloat(invoiceDetail.invoice.total_amount || 0) - parseFloat(invoiceDetail.invoice.amount_paid || 0)) > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-500" />
                  Record Payment
                </h3>
                <form onSubmit={recordPayment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Amount (ETB) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min="0.01"
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
                          ['mobile_money', '📱 Mobile Money'],
                          ['bank_transfer', '🏦 Bank Transfer'],
                          ['insurance', '🏥 Insurance'],
                          ['online', '🌐 Online'],
                          ['check', '📄 Check'],
                        ].map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Transaction Reference</label>
                      <input
                        value={paymentForm.transaction_id}
                        onChange={e => setPaymentForm(f => ({ ...f, transaction_id: e.target.value }))}
                        placeholder="e.g. TXN-12345"
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                      <input
                        value={paymentForm.notes}
                        onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Any notes..."
                        className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button type="submit" disabled={submitting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                      <DollarSign className="h-4 w-4" />
                      {submitting ? 'Processing...' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Receipt */}
            {showReceipt && lastPayment && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-200 dark:border-emerald-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Payment Receipt
                  </h3>
                  <button onClick={printReceipt}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient</span>
                    <span className="font-medium">{selected.first_name} {selected.last_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice #</span>
                    <span className="font-medium">{invoiceDetail.invoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid</span>
                    <span className="font-bold text-emerald-600">{parseFloat(lastPayment.amount).toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Method</span>
                    <span className="capitalize">{lastPayment.payment_method?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date/Time</span>
                    <span>{new Date(lastPayment.payment_date || Date.now()).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[400px]">
            <div className="text-center text-slate-400">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a patient from the queue to view invoice and process payment</p>
              <p className="text-xs mt-2 text-slate-300">Invoices are automatically generated by the system</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashierWorkflow;
