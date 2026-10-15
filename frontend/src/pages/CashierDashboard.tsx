import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  DollarSign, Users, FileText, Clock, CreditCard, Smartphone,
  Building2, Shield, RefreshCw, Search, Filter, Printer,
  TrendingUp, CheckCircle2, AlertTriangle, Lock, Unlock, ShieldCheck
} from 'lucide-react';
import { fmt } from '../utils/format';
import StatCard from '../components/cashier/StatCard';
import InvoiceTable from '../components/cashier/InvoiceTable';
import PaymentModal from '../components/cashier/PaymentModal';
import ReceiptPreview, { ReceiptData, HospitalConfig } from '../components/cashier/ReceiptPreview';
import ShiftManagementModal from '../components/cashier/ShiftManagementModal';
import ZReportModal, { ZReportData } from '../components/cashier/ZReportModal';
import FinanceReconciliationTab from '../components/cashier/FinanceReconciliationTab';

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
  provider_reference?: string;
  verification_status?: string;
  reprint_count?: number;
  shift_id?: number;
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
  pendingDigitalCount?: number;
  pendingDigitalAmount?: number;
}

const CashierDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'unpaid' | 'payments' | 'receipts' | 'shift' | 'finance' | 'billing'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [fullReceiptData, setFullReceiptData] = useState<ReceiptData | null>(null);
  const [hospitalConfig, setHospitalConfig] = useState<HospitalConfig | undefined>(undefined);

  // Shift Management & Z-Report
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState(false);
  const [currentZReport, setCurrentZReport] = useState<ZReportData | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchHospitalConfig();
    fetchCurrentShift();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab, statusFilter]);

  const fetchHospitalConfig = async () => {
    try {
      const res = await api.get('/cashier/config');
      setHospitalConfig(res.data.data);
    } catch (err) {
      console.error('Failed to load hospital config:', err);
    }
  };

  const fetchCurrentShift = async () => {
    try {
      const res = await api.get('/cashier/shifts/current');
      setCurrentShift(res.data.data?.shift || null);
    } catch (err) {
      console.error('Failed to load active shift:', err);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const statsRes = await api.get('/cashier/stats');
        setStats(statsRes.data.data);
      } else if (activeTab === 'unpaid') {
        const invoicesRes = await api.get('/cashier/invoices/unpaid');
        setInvoices(invoicesRes.data.data.invoices || []);
      } else if (activeTab === 'payments' || activeTab === 'receipts') {
        const paymentsRes = await api.get('/cashier/payments/history');
        setPayments(paymentsRes.data.data.payments || []);
      } else if (activeTab === 'shift') {
        fetchCurrentShift();
      }
    } catch (error) {
      showToast('error', 'Failed to load cashier data');
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
      setSelectedInvoice({
        ...invoice,
        items: res.data.data.items || []
      });
      setShowPaymentModal(true);
    } catch (error) {
      showToast('error', 'Failed to load invoice items');
    }
  };

  const handlePayInvoice = (invoice: Invoice) => {
    handleViewInvoice(invoice);
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    try {
      const res = await api.post('/cashier/payments/process', paymentData);
      showToast('success', `Payment processed successfully! Receipt: ${res.data.data.receipt_number}`);
      setShowPaymentModal(false);
      fetchDashboardData();
      fetchCurrentShift();

      // Automatically preview generated thermal receipt
      if (res.data.data.payment) {
        handleViewReceipt(res.data.data.payment);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleViewReceipt = async (payment: Payment | any) => {
    try {
      const identifier = payment.receipt_number || payment.id;
      const res = await api.get(`/cashier/receipt/${identifier}`);
      const data = res.data.data;
      setFullReceiptData({
        ...data.receipt,
        items: data.items || []
      });
      if (data.hospital) {
        setHospitalConfig(data.hospital);
      }
      setShowReceiptModal(true);
    } catch (err) {
      showToast('error', 'Failed to load receipt details');
    }
  };

  const handleReprintReceipt = async () => {
    if (!fullReceiptData?.id) return;
    try {
      const res = await api.post(`/cashier/receipts/${fullReceiptData.id}/reprint`, {
        reason: 'Authorized duplicate requested by patient/cashier'
      });
      const updated = res.data.data;
      setFullReceiptData({
        ...fullReceiptData,
        reprint_count: updated.reprint_count,
        is_reprint: true
      });
      showToast('success', `Reprint authorized (Copy #${updated.reprint_count})`);
      fetchDashboardData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Reprint authorization failed');
    }
  };

  const handleShiftClosed = async (shiftData: any) => {
    setCurrentShift(null);
    showToast('success', 'Shift finalized and closed successfully!');
    try {
      const res = await api.get(`/cashier/shifts/${shiftData.shift.id}/z-report`);
      setCurrentZReport(res.data.data);
      setShowZReportModal(true);
    } catch (err) {
      console.error(err);
    }
    fetchDashboardData();
  };

  const handleHandoverSubmit = async (shiftId: number, notes: string) => {
    try {
      await api.post(`/cashier/shifts/${shiftId}/handover`, { notes });
      showToast('success', 'Shift handover submitted to Finance successfully');
      fetchCurrentShift();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to submit handover');
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.patient_id?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPayments = payments.filter(pay =>
    pay.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    pay.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    pay.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    pay.provider_reference?.toLowerCase().includes(search.toLowerCase())
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

      {/* ── Active Cashier Shift Notification Bar ─────────────────────── */}
      <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md ${
        currentShift
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border-emerald-800/40 text-white'
          : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-orange-950/80 border-amber-800/40 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
            currentShift ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
          }`}>
            {currentShift ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                currentShift ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {currentShift ? `Active Shift: ${currentShift.shift_number}` : 'No Active Shift'}
              </span>
              <span className="text-xs text-slate-400 font-mono">Register: {currentShift?.register_id || 'REG-01'}</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {currentShift
                ? `Opened at ${new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with Opening Float: ${fmt(currentShift.opening_cash)} ETB`
                : 'Transactions require an open shift to maintain cash drawer reconciliation.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentShift ? (
            <button
              type="button"
              onClick={() => setShowCloseShiftModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> End Shift & Z-Report
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" /> Open Shift
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/30">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              Cashier & Billing Terminal
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
                ETB Currency / ብር
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5 font-amharic">
              አለም ከተማ እናት ጠቅላላ ሆስፒታል — የገንዘብ መቀበያ፣ ቴሌብር፣ ንግድ ባንክ እና የፈረቃ ማጠቃለያ (Z-Report)
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
          { id: 'dashboard', label: 'Dashboard Overview', icon: TrendingUp },
          { id: 'unpaid', label: 'Unpaid Invoices', icon: FileText },
          { id: 'payments', label: 'Payment Ledger', icon: DollarSign },
          { id: 'receipts', label: 'Thermal Receipts', icon: Printer },
          { id: 'shift', label: 'Shift & Z-Report', icon: Clock },
          { id: 'finance', label: 'Finance & Audit', icon: ShieldCheck },
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
            <StatCard label="Today's Collections" value={`${fmt(stats.todayPayments)} ETB`} icon={DollarSign} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Completed Transactions" value={stats.todayTransactions} icon={Clock} color="bg-blue-50 text-blue-600" />
            <StatCard label="Unpaid Invoices" value={stats.unpaidInvoices} icon={FileText} color="bg-red-50 text-red-600" />
            <StatCard label="Paid Invoices" value={stats.paidInvoices} icon={CheckCircle2} color="bg-green-50 text-green-600" />
            <StatCard label="Outstanding Balance" value={`${fmt(stats.outstandingAmount)} ETB`} icon={AlertTriangle} color="bg-amber-50 text-amber-600" />
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Hospital Revenue Breakdown by Channel</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Authoritative settlements recorded in Ethiopian Birr (ETB)</p>
              </div>
              {stats.pendingDigitalCount && stats.pendingDigitalCount > 0 ? (
                <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-200">
                  {stats.pendingDigitalCount} Digital Transactions Awaiting Verification
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Cash (Drawer)" value={`${fmt(stats.cashPayments)} ETB`} icon={DollarSign} color="bg-green-50 text-green-600" />
              <StatCard label="Card (POS)" value={`${fmt(stats.cardPayments)} ETB`} icon={CreditCard} color="bg-blue-50 text-blue-600" />
              <StatCard label="Telebirr (Till 654321)" value={`${fmt(stats.telebirrPayments)} ETB`} icon={Smartphone} color="bg-purple-50 text-purple-600" />
              <StatCard label="CBE Birr / Bank" value={`${fmt(stats.bankPayments)} ETB`} icon={Building2} color="bg-amber-50 text-amber-600" />
              <StatCard label="Insurance Claims" value={`${fmt(stats.insurancePayments)} ETB`} icon={Shield} color="bg-cyan-50 text-cyan-600" />
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
                placeholder="Search by patient name, invoice number, or MRN..."
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
              placeholder="Search payments by patient name, receipt #, invoice #, or transaction code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Receipt #</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Invoice #</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Amount (ETB)</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Txn Ref</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Verification</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Loading payment ledger...</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No payment records found</td></tr>
                  ) : filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{payment.receipt_number}</td>
                      <td className="px-5 py-4 font-mono text-gray-600 dark:text-gray-400">{payment.invoice_number}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{payment.patient_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{payment.patient_id}</div>
                      </td>
                      <td className="px-5 py-4 font-black text-gray-900 dark:text-white font-mono text-sm">
                        {fmt(payment.amount)} ETB
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {payment.provider_reference || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          payment.verification_status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : payment.verification_status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {payment.verification_status || 'VERIFIED'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{new Date(payment.payment_date).toLocaleString()}</td>
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
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Receipt #</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Method</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Reprints</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3.5 font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Loading thermal receipts...</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No receipts found</td></tr>
                  ) : filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-4 font-bold text-sm text-blue-600 dark:text-blue-400 font-mono">{payment.receipt_number}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{payment.patient_name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{payment.patient_id}</div>
                      </td>
                      <td className="px-5 py-4 font-black text-gray-900 dark:text-white font-mono">{fmt(payment.amount)} ETB</td>
                      <td className="px-5 py-4 capitalize">{payment.payment_method.replace('_', ' ')}</td>
                      <td className="px-5 py-4">
                        {payment.reprint_count && payment.reprint_count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {payment.reprint_count} copies
                          </span>
                        ) : (
                          <span className="text-gray-400">Original</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{new Date(payment.payment_date).toLocaleString()}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleViewReceipt(payment)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 font-bold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" /> Thermal Preview
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Shift & Z-Report Tab */}
      {activeTab === 'shift' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              Cashier Shift Lifecycle & End-of-Day Closeout
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Manage your drawer float, perform midday/end-of-day cash reconciliation, and generate the official Z-Report.
            </p>

            {currentShift ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400">Shift Number</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{currentShift.shift_number}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400">Workstation</span>
                    <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">{currentShift.register_id}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400">Opening Cash Float</span>
                    <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">{fmt(currentShift.opening_cash)} ETB</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-black uppercase text-slate-400">Opened Timestamp</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{new Date(currentShift.opened_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCloseShiftModal(true)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" /> Finalize Shift & Produce Z-Report
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Lock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Register Shift Currently Active</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Open a shift and record your starting drawer cash float to start processing patient invoices and receipts.
                </p>
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(true)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  Open Cashier Shift
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Finance & Audit Tab */}
      {activeTab === 'finance' && (
        <FinanceReconciliationTab />
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
          activeShiftId={currentShift?.id}
        />
      )}

      {/* Thermal Receipt Preview Modal */}
      {showReceiptModal && fullReceiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">
                Thermal Receipt Slip / የክፍያ ደረሰኝ
              </h2>
              <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 hover:text-gray-600">
                <Filter className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ReceiptPreview
                receipt={fullReceiptData}
                hospital={hospitalConfig}
                onPrint={() => window.print()}
                onReprint={handleReprintReceipt}
                onClose={() => setShowReceiptModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      <ShiftManagementModal
        mode="open"
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        onSuccess={(shift) => {
          setCurrentShift(shift);
          showToast('success', `Shift ${shift.shift_number} successfully opened!`);
        }}
      />

      {/* Close Shift Modal */}
      {currentShift && (
        <ShiftManagementModal
          mode="close"
          isOpen={showCloseShiftModal}
          onClose={() => setShowCloseShiftModal(false)}
          activeShift={currentShift}
          onSuccess={handleShiftClosed}
        />
      )}

      {/* Z-Report Modal */}
      {currentZReport && (
        <ZReportModal
          isOpen={showZReportModal}
          onClose={() => setShowZReportModal(false)}
          zReport={currentZReport}
          onHandover={handleHandoverSubmit}
        />
      )}
    </div>
  );
};

export default CashierDashboard;