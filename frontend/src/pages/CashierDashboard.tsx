import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  DollarSign, Users, FileText, Clock, CreditCard, Smartphone,
  Building2, Shield, RefreshCw, Search, Filter, Printer, Download,
  TrendingUp, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { fmt, toNum } from '../utils/format';
import StatCard from '../components/cashier/StatCard';
import InvoiceTable from '../components/cashier/InvoiceTable';
import PaymentModal from '../components/cashier/PaymentModal';
import ReceiptPreview from '../components/cashier/ReceiptPreview';

interface Invoice {
  id: number;
  invoice_number: string;
  patient_name: string;
  patient_id: string;
  invoice_type: string;
  encounter_number?: string;
  total_amount: number;
  amount_paid: number;
  created_at: string;
  status: string;
  items?: Array<{ service: string; quantity: number; unit_price: number; total: number }>;
}

interface Payment {
  id: number;
  receipt_number: string;
  invoice_number: string;
  patient_name: string;
  patient_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  cashier_name: string;
  status: string;
}

interface DashboardStats {
  todayPayments: number;
  todayTransactions: number;
  unpaidInvoices: number;
  paidInvoices: number;
  outstandingAmount: number;
  cashPayments: number;
  cardPayments: number;
  telebirrPayments: number;
  bankPayments: number;
  insurancePayments: number;
}

const CashierDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'unpaid' | 'payments' | 'receipts' | 'billing'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab, statusFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const statsRes = await api.get('/cashier/stats');
        setStats(statsRes.data.data);
      } else if (activeTab === 'unpaid') {
        const invoicesRes = await api.get('/cashier/invoices/unpaid');
        setInvoices(invoicesRes.data.data.invoices || []);
      } else if (activeTab === 'payments') {
        const paymentsRes = await api.get('/cashier/payments/history');
        setPayments(paymentsRes.data.data.payments || []);
      } else if (activeTab === 'receipts') {
        const paymentsRes = await api.get('/cashier/payments/history');
        setPayments(paymentsRes.data.data.payments || []);
      }
    } catch (error) {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const res = await api.get(`/invoices/${invoice.id}`);
      setSelectedInvoice({ ...invoice, items: res.data.data.items || [] });
      setShowPaymentModal(true);
    } catch (error) {
      showToast('error', 'Failed to load invoice details');
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    try {
      await api.post('/cashier/payments/process', paymentData);
      showToast('success', 'Payment processed successfully');
      setShowPaymentModal(false);
      fetchDashboardData();
    } catch (error: any) {
      throw error;
    }
  };

  const handleViewReceipt = (payment: Payment) => {
    setSelectedReceipt(payment);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleDownloadReceipt = (paymentToDownload?: Payment | null) => {
    const r = paymentToDownload || selectedReceipt;
    if (!r) return;

    const formattedAmount = fmt(toNum(r.amount));
    const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${r.receipt_number || 'RCP'}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 2px solid #0d9488; border-radius: 20px; background: #ffffff; }
    .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { margin: 0; color: #0f766e; font-size: 24px; font-weight: 800; }
    .header p { margin: 4px 0 0 0; color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; tracking: 1px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
    .row .label { color: #64748b; }
    .row .val { font-weight: 700; color: #0f172a; }
    .box { bg-color: #f8fafc; background: #f8fafc; padding: 16px; border-radius: 14px; margin: 20px 0; border: 1px solid #e2e8f0; }
    .total-container { background: #ccfbf1; padding: 16px; border-radius: 14px; text-align: right; margin-top: 20px; border: 1px solid #99f6e4; }
    .total-label { font-size: 12px; color: #0f766e; text-transform: uppercase; font-weight: 800; }
    .total-amount { font-size: 26px; font-weight: 900; color: #0d9488; margin-top: 4px; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; border-t: 1px solid #e2e8f0; pt: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Alem Ketema Enat Hospital</h1>
    <p>Official Payment Receipt</p>
  </div>

  <div class="row"><span class="label">Receipt Number:</span><span class="val" style="color: #0284c7;">${r.receipt_number || 'N/A'}</span></div>
  <div class="row"><span class="label">Invoice Reference:</span><span class="val">${r.invoice_number || 'N/A'}</span></div>
  <div class="row"><span class="label">Date & Time:</span><span class="val">${r.payment_date ? new Date(r.payment_date).toLocaleString() : new Date().toLocaleString()}</span></div>
  <div class="row"><span class="label">Cashier:</span><span class="val">${r.cashier_name || 'Hospital Cashier'}</span></div>

  <div class="box">
    <div class="row" style="border: none; padding-top: 0;"><span class="label">Patient Name:</span><span class="val">${r.patient_name || 'Walk-in Patient'}</span></div>
    <div class="row" style="border: none; padding-bottom: 0;"><span class="label">Patient ID / MRN:</span><span class="val">${r.patient_id || 'N/A'}</span></div>
  </div>

  <div class="row"><span class="label">Payment Method:</span><span class="val" style="text-transform: capitalize;">${(r.payment_method || 'cash').replace('_', ' ')}</span></div>
  <div class="row"><span class="label">Payment Status:</span><span class="val" style="color: #059669;">PAID & CONFIRMED</span></div>

  <div class="total-container">
    <div class="total-label">Amount Received</div>
    <div class="total-amount">${formattedAmount} ETB / USD</div>
  </div>

  <div class="footer">
    <p style="margin: 0; font-weight: 600;">Thank you for choosing Alem Ketema Enat Hospital.</p>
    <p style="margin: 4px 0 0 0;">This document is an official computer-generated receipt.</p>
  </div>
</body>
</html>`;

    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${r.receipt_number || 'download'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', `Receipt ${r.receipt_number} downloaded successfully!`);
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.patient_id?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPayments = payments.filter(pay =>
    pay.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    pay.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    pay.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/30">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              Cashier Dashboard
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Financial Station
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Invoice management, payment processing, and receipt generation
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'unpaid', label: 'Unpaid Invoices', icon: FileText },
          { id: 'payments', label: 'Payments', icon: DollarSign },
          { id: 'receipts', label: 'Receipts', icon: Printer },
          { id: 'billing', label: 'Patient Billing', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-2xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard label="Today's Payments" value={`$${fmt(stats.todayPayments)}`} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Transactions" value={stats.todayTransactions} icon={Clock} color="bg-blue-50 text-blue-600" />
            <StatCard label="Unpaid Invoices" value={stats.unpaidInvoices} icon={FileText} color="bg-red-50 text-red-600" />
            <StatCard label="Paid Invoices" value={stats.paidInvoices} icon={CheckCircle2} color="bg-green-50 text-green-600" />
            <StatCard label="Outstanding" value={`$${fmt(stats.outstandingAmount)}`} icon={AlertTriangle} color="bg-amber-50 text-amber-600" />
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Payment Method Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Cash" value={`$${fmt(stats.cashPayments)}`} icon={DollarSign} color="bg-green-50 text-green-600" />
              <StatCard label="Card" value={`$${fmt(stats.cardPayments)}`} icon={CreditCard} color="bg-blue-50 text-blue-600" />
              <StatCard label="Telebirr" value={`$${fmt(stats.telebirrPayments)}`} icon={Smartphone} color="bg-purple-50 text-purple-600" />
              <StatCard label="Bank" value={`$${fmt(stats.bankPayments)}`} icon={Building2} color="bg-amber-50 text-amber-600" />
              <StatCard label="Insurance" value={`$${fmt(stats.insurancePayments)}`} icon={Shield} color="bg-cyan-50 text-cyan-600" />
            </div>
          </div>
        </div>
      )}

      {/* Unpaid Invoices Tab */}
      {activeTab === 'unpaid' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name, invoice number, or patient ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>

          <InvoiceTable
            invoices={filteredInvoices}
            onView={handleViewInvoice}
            onPay={handlePayInvoice}
            loading={loading}
          />
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search payments by patient name, receipt number, or invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt #</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Loading payments...</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No payments found</td></tr>
                  ) : filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 font-bold text-sm text-blue-600 dark:text-blue-400">{payment.receipt_number}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{payment.invoice_number}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{payment.patient_name}</div>
                        <div className="text-xs text-gray-500">{payment.patient_id}</div>
                      </td>
                      <td className="px-5 py-4 font-extrabold text-sm text-gray-900 dark:text-white">${fmt(payment.amount)}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">{new Date(payment.payment_date).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receipts Tab */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search receipts by receipt number, patient, or invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receipt #</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Loading receipts...</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No receipts found</td></tr>
                  ) : filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 font-bold text-sm text-blue-600 dark:text-blue-400">{payment.receipt_number}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{payment.patient_name}</div>
                        <div className="text-xs text-gray-500">{payment.patient_id}</div>
                      </td>
                      <td className="px-5 py-4 font-extrabold text-sm text-gray-900 dark:text-white">${fmt(payment.amount)}</td>
                      <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">{new Date(payment.payment_date).toLocaleString()}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewReceipt(payment)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadReceipt(payment)}
                            title="Download Receipt"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-800 dark:text-gray-400 hover:bg-gray-100 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Patient Billing Tab */}
      {activeTab === 'billing' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Patient Billing Search</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Search for a patient to view their complete billing history and outstanding balances.</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Enter patient ID or name..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <PaymentModal
          invoice={selectedInvoice}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handlePaymentSubmit}
          loading={loading}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Receipt Preview</h2>
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 hover:text-gray-600">
                <Filter className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <ReceiptPreview
                receipt={{
                  receipt_number: selectedReceipt.receipt_number,
                  invoice_number: selectedReceipt.invoice_number,
                  patient_name: selectedReceipt.patient_name,
                  patient_id: selectedReceipt.patient_id,
                  amount: selectedReceipt.amount,
                  payment_method: selectedReceipt.payment_method,
                  payment_date: selectedReceipt.payment_date,
                  cashier_name: selectedReceipt.cashier_name,
                }}
                onPrint={handlePrintReceipt}
                onDownload={handleDownloadReceipt}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierDashboard;