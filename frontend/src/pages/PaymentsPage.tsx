import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, DollarSign, TrendingUp, CreditCard, AlertCircle, X, Plus } from 'lucide-react';

interface Payment {
  id: number;
  invoice_id: number;
  patient_name: string;
  amount: number;
  invoice_total: number;
  payment_method: string;
  payment_date: string;
  transaction_id: string;
  received_by_email: string;
  notes: string;
}

interface PaymentStats {
  todayCollection: number;
  monthCollection: number;
  pendingCount: number;
  pendingAmount: number;
}

interface Invoice {
  id: number;
  patient_name: string;
  patient_phone?: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  due_date?: string;
}

const methodColors: Record<string, string> = {
  cash: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  card: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  insurance: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  online: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  check: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentView, setCurrentView] = useState<'payments' | 'outstanding'>('outstanding');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState({ amount: '', payment_method: 'cash', transaction_id: '', notes: '' });
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, statsRes, invoicesRes] = await Promise.allSettled([
        api.get('/payments'),
        api.get('/payments/stats'),
        api.get('/invoices'),
      ]);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data.data.payments || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value.data.data.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    const remaining = Math.max(0, invoice.total_amount - (invoice.amount_paid || 0));
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: remaining.toFixed(2),
      payment_method: 'cash',
      transaction_id: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setPaymentData({ amount: '', payment_method: 'cash', transaction_id: '', notes: '' });
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await api.post('/payments', {
        invoice_id: selectedInvoice.id,
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || undefined,
        notes: paymentData.notes || undefined,
      });
      closePaymentModal();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to record payment.');
    }
  };

  const openRefundModal = (payment: Payment) => {
    setSelectedPaymentForRefund(payment);
    setRefundAmount(payment.amount.toFixed(2));
    setRefundReason('');
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setSelectedPaymentForRefund(null);
    setRefundAmount('');
    setRefundReason('');
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;

    if (!selectedPaymentForRefund.transaction_id) {
      alert('Refund cannot be processed because this payment has no transaction ID.');
      return;
    }

    try {
      await api.post('/payments/refund', {
        paymentIntentId: selectedPaymentForRefund.transaction_id,
        amount: parseFloat(refundAmount),
      });
      closeRefundModal();
      fetchData();
      alert('Refund request submitted successfully.');
    } catch (error) {
      console.error(error);
      alert('Failed to submit refund request.');
    }
  };

  const dailyCollectionData = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const iso = date.toISOString().slice(0, 10);
      return {
        label: date.toLocaleDateString(undefined, { weekday: 'short' }),
        iso,
        amount: 0,
      };
    });

    const totalsByDay = payments.reduce<Record<string, number>>((acc, payment) => {
      const iso = new Date(payment.payment_date).toISOString().slice(0, 10);
      acc[iso] = (acc[iso] || 0) + payment.amount;
      return acc;
    }, {});

    return lastSevenDays.map(day => ({ ...day, amount: totalsByDay[day.iso] || 0 }));
  })();

  const paymentMethodTotals = payments.reduce<Record<string, number>>((acc, payment) => {
    const method = payment.payment_method?.toLowerCase() || 'other';
    acc[method] = (acc[method] || 0) + payment.amount;
    return acc;
  }, {});

  const methodTotals = {
    cash: paymentMethodTotals.cash || 0,
    card: paymentMethodTotals.card || 0,
    insurance: paymentMethodTotals.insurance || 0,
    online: paymentMethodTotals.online || 0,
    other: paymentMethodTotals.other || 0,
  };

  const maxDailyAmount = Math.max(1, ...dailyCollectionData.map(day => day.amount));

  const outstandingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial');

  const filteredInvoices = outstandingInvoices.filter(inv =>
    inv.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(inv.id).includes(search)
  );

  const filteredPayments = payments.filter(p =>
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.invoice_id).includes(search)
  );

  const statCards = [
    { label: "Today's Collections", value: stats ? `$${stats.todayCollection.toLocaleString()}` : '—', icon: DollarSign, color: 'bg-green-500' },
    { label: 'This Month', value: stats ? `$${stats.monthCollection.toLocaleString()}` : '—', icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Pending Invoices', value: stats ? stats.pendingCount : '—', icon: AlertCircle, color: 'bg-yellow-500' },
    { label: 'Pending Amount', value: stats ? `$${stats.pendingAmount.toLocaleString()}` : '—', icon: CreditCard, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cashier Dashboard</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Track collections, invoices, payments, and daily reconciliations in one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/invoices" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Create Invoice</Link>
          <Link to="/reports" className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">View Reports</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-7 w-16 inline-block" /> : s.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cashier Responsibilities</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage billing, payments, insurance, refunds, and reports from a single dashboard.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Patient Billing</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate invoices for consultations, labs, pharmacy, admissions, surgery, rooms and procedures.</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Receive Payments</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Accept cash, card, mobile money, bank transfer, and insurance payments.</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Generate Invoices</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Print or email invoices and receipts.</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Insurance Claims</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verify coverage, record insurer payments, and track claim status.</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Refund Management</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Process approved refunds, capture reasons, and maintain history.</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 transition-colors">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Outstanding Balances</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">View unpaid bills, record partial payments, and track remaining amounts.</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Billing Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-600">Outstanding Bills</p>
                <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{loading ? '...' : stats ? stats.pendingCount : '—'}</p>
              </div>
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-xs uppercase tracking-wide text-red-600">Pending Amount</p>
                <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{loading ? '...' : stats ? `$${stats.pendingAmount.toLocaleString()}` : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Daily Cash Report</h2>
          <div className="grid gap-3">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Collections</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{loading ? '...' : stats ? `$${stats.todayCollection.toLocaleString()}` : '—'}</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Top Payment Methods</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div className="rounded-lg bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold">Cash</p>
                  <p>{loading ? '...' : `$${methodTotals.cash.toLocaleString()}`}</p>
                </div>
                <div className="rounded-lg bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold">Card</p>
                  <p>{loading ? '...' : `$${methodTotals.card.toLocaleString()}`}</p>
                </div>
                <div className="rounded-lg bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold">Insurance</p>
                  <p>{loading ? '...' : `$${methodTotals.insurance.toLocaleString()}`}</p>
                </div>
                <div className="rounded-lg bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
                  <p className="font-semibold">Online</p>
                  <p>{loading ? '...' : `$${methodTotals.online.toLocaleString()}`}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Refunds</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">Manage approved refunds in the Refunds workflow.</p>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Closing Balance</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{loading ? '...' : stats ? `$${(stats.todayCollection - 0).toLocaleString()}` : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-sm">
            <button
              onClick={() => setCurrentView('outstanding')}
              className={`px-4 py-2 rounded-full text-sm ${currentView === 'outstanding' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
            >
              Outstanding Invoices
            </button>
            <button
              onClick={() => setCurrentView('payments')}
              className={`px-4 py-2 rounded-full text-sm ${currentView === 'payments' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'}`}
            >
              Payment History
            </button>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by patient or invoice ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Collection Trend</h2>
          <div className="h-48 grid grid-cols-7 gap-2 items-end">
            {dailyCollectionData.map(day => (
              <div key={day.iso} className="flex flex-col items-center gap-2">
                <div className="w-full rounded-t-xl bg-blue-600" style={{ height: `${Math.max(12, (day.amount / maxDailyAmount) * 100)}%` }} title={`${day.label}: $${day.amount.toLocaleString()}`} />
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Payment Breakdown</h2>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Cash</span>
              <span>{loading ? '...' : `$${methodTotals.cash.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Card</span>
              <span>{loading ? '...' : `$${methodTotals.card.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Insurance</span>
              <span>{loading ? '...' : `$${methodTotals.insurance.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Online</span>
              <span>{loading ? '...' : `$${methodTotals.online.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Other</span>
              <span>{loading ? '...' : `$${methodTotals.other.toLocaleString()}`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Outstanding Invoices</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Record payments against pending or partially paid invoices.</p>
          </div>
          <button
            onClick={() => { if (outstandingInvoices[0]) openPaymentModal(outstandingInvoices[0]); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Record Quick Payment
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Invoice #', 'Patient', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading outstanding invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No outstanding invoices at the moment.</td></tr>
              ) : filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">#{inv.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{inv.patient_name}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${inv.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">${inv.amount_paid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">${Math.max(0, inv.total_amount - inv.amount_paid).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">{inv.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openPaymentModal(inv)}
                      className="text-sm px-3 py-1 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Record Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Record Payment</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Invoice #{selectedInvoice.id} • {selectedInvoice.patient_name}</p>
              </div>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Invoice Total</p>
                  <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">${selectedInvoice.total_amount.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Amount Paid</p>
                  <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-300">${selectedInvoice.amount_paid.toFixed(2)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/20 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Remaining Balance</p>
                  <p className="mt-2 text-lg font-semibold text-red-600 dark:text-red-300">${Math.max(0, selectedInvoice.total_amount - selectedInvoice.amount_paid).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Payment Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentData.amount}
                  onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Payment Method</label>
                <select
                  value={paymentData.payment_method}
                  onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="online">Online</option>
                  <option value="check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Transaction ID</label>
                <input
                  type="text"
                  value={paymentData.transaction_id}
                  onChange={e => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closePaymentModal}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments history table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {(currentView === 'payments'
                  ? ['#', 'Invoice', 'Patient', 'Amount', 'Method', 'Transaction ID', 'Date', 'Received By', 'Action']
                  : ['Invoice #', 'Patient', 'Total', 'Paid', 'Balance', 'Status', 'Due Date', 'Action']
                ).map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : currentView === 'payments' ? (
                filteredPayments.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No payments found</td></tr>
                ) : filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">#{p.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">#{p.invoice_id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.patient_name}</td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">${parseFloat(String(p.amount)).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${methodColors[p.payment_method] || 'bg-gray-100 text-gray-800'}`}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.transaction_id || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(p.payment_date).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.received_by_email || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openRefundModal(p)}
                        className="text-sm px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >Refund</button>
                    </td>
                  </tr>
                ))
              ) : (
                filteredInvoices.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No outstanding invoices at the moment.</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">#{inv.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{inv.patient_name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${inv.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">${inv.amount_paid.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-red-600 dark:text-red-400">${Math.max(0, inv.total_amount - inv.amount_paid).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm capitalize text-gray-900 dark:text-white">{inv.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openPaymentModal(inv)}
                        className="text-sm px-3 py-1 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >Record Payment</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showRefundModal && selectedPaymentForRefund && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Refund Payment</h3>
              <button onClick={closeRefundModal} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmitRefund} className="px-6 py-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Refunding payment for <strong>{selectedPaymentForRefund.patient_name}</strong> on invoice #{selectedPaymentForRefund.invoice_id}.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                <input type="number" min="0" step="0.01" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID</label>
                <input type="text" value={selectedPaymentForRefund.transaction_id} disabled className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={3} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white" placeholder="Optional refund reason" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeRefundModal} className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-900">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700">Confirm Refund</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
