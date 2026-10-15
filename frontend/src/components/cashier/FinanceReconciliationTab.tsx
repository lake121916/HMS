import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw,
  Check, X, Eye, Smartphone, Building2
} from 'lucide-react';
import { fmt } from '../../utils/format';
import api from '../../services/api';
import ZReportModal, { ZReportData } from './ZReportModal';

export const FinanceReconciliationTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'shifts' | 'digital' | 'audit'>('shifts');
  const [shifts, setShifts] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Z-Report inspection
  const [selectedZReport, setSelectedZReport] = useState<ZReportData | null>(null);
  const [showZReportModal, setShowZReportModal] = useState(false);

  // Handover Review Modal
  const [reviewShift, setReviewShift] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'shifts') {
        const res = await api.get('/cashier/finance/shifts');
        setShifts(res.data.data.shifts || []);
      } else if (activeSubTab === 'digital') {
        const res = await api.get('/cashier/payments/history?verification_status=PENDING');
        setPendingPayments(res.data.data.payments || []);
      } else if (activeSubTab === 'audit') {
        const res = await api.get('/cashier/finance/audit-trail');
        setAuditEvents(res.data.data.events || []);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleOpenZReport = async (shiftId: number) => {
    try {
      const res = await api.get(`/cashier/shifts/${shiftId}/z-report`);
      setSelectedZReport(res.data.data);
      setShowZReportModal(true);
    } catch (err: any) {
      showToast('error', 'Failed to generate Z-Report');
    }
  };

  const handleReviewDecision = async (status: 'ACCEPTED' | 'DISPUTED') => {
    if (!reviewShift || !reviewShift.handover_id) return;
    setSubmittingReview(true);
    try {
      await api.post(`/cashier/finance/handovers/${reviewShift.handover_id}/review`, {
        status,
        review_notes: reviewNotes
      });
      showToast('success', `Shift handover marked as ${status}`);
      setReviewShift(null);
      setReviewNotes('');
      fetchData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleVerifyPayment = async (paymentId: number) => {
    try {
      await api.post(`/cashier/payments/${paymentId}/verify`, {
        verification_method: 'MANUAL_MERCHANT_APP',
        evidence_ref: 'Finance verified against hospital merchant statement'
      });
      showToast('success', 'Digital transaction successfully verified and settled');
      fetchData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Verification failed');
    }
  };

  const handleRejectPayment = async (paymentId: number) => {
    const reason = prompt('Please enter the reason for rejecting this digital payment:');
    if (!reason) return;
    try {
      await api.post(`/cashier/payments/${paymentId}/reject`, { reason });
      showToast('success', 'Payment rejected and removed from confirmed funds');
      fetchData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Rejection failed');
    }
  };

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

      {/* Sub tabs */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('shifts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'shifts'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Cashier Shift Handovers
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('digital')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'digital'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Digital Payment Verification Queue
            {pendingPayments.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {pendingPayments.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Financial Audit Trail
          </button>
        </div>

        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Subtab 1: Shift Handovers */}
      {activeSubTab === 'shifts' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Shift #</th>
                  <th className="px-5 py-3.5 font-bold">Cashier</th>
                  <th className="px-5 py-3.5 font-bold">Register</th>
                  <th className="px-5 py-3.5 font-bold">Closed At</th>
                  <th className="px-5 py-3.5 font-bold">Opening Float</th>
                  <th className="px-5 py-3.5 font-bold">Counted Cash</th>
                  <th className="px-5 py-3.5 font-bold">Variance</th>
                  <th className="px-5 py-3.5 font-bold">Finance Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">Loading shift records...</td></tr>
                ) : shifts.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-400">No shift records found</td></tr>
                ) : shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{shift.shift_number}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{shift.cashier_name}</td>
                    <td className="px-5 py-4 text-slate-500 font-mono">{shift.register_id}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {shift.closed_at ? new Date(shift.closed_at).toLocaleString() : 'In Progress (Open)'}
                    </td>
                    <td className="px-5 py-4 font-mono">{fmt(shift.opening_cash)} ETB</td>
                    <td className="px-5 py-4 font-mono font-bold">{shift.closing_cash_counted !== null ? `${fmt(shift.closing_cash_counted)} ETB` : '—'}</td>
                    <td className="px-5 py-4">
                      {shift.cash_variance !== null ? (
                        <span className={`font-mono font-bold ${
                          parseFloat(shift.cash_variance) < 0 ? 'text-red-500' : parseFloat(shift.cash_variance) > 0 ? 'text-blue-500' : 'text-emerald-500'
                        }`}>
                          {parseFloat(shift.cash_variance) > 0 ? `+${fmt(shift.cash_variance)}` : fmt(shift.cash_variance)} ETB
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        shift.finance_status === 'ACCEPTED' || shift.status === 'RECONCILED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : shift.finance_status === 'DISPUTED' || shift.status === 'REQUIRES_REVIEW'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {shift.finance_status || shift.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenZReport(shift.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Z-Report
                      </button>

                      {shift.handover_id && shift.finance_status === 'PENDING_REVIEW' && (
                        <button
                          type="button"
                          onClick={() => setReviewShift(shift)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1 shadow-sm"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Sign-off
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Digital Payment Verification Queue */}
      {activeSubTab === 'digital' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Telebirr & CBE Birr Payment Reconciliations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verify each transaction against the official Ethio Telecom merchant app (Till 654321) or CBE account (1000189922341).
              </p>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              {pendingPayments.length} Pending Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Receipt #</th>
                  <th className="px-5 py-3.5 font-bold">Patient</th>
                  <th className="px-5 py-3.5 font-bold">Gateway</th>
                  <th className="px-5 py-3.5 font-bold">Reference Code</th>
                  <th className="px-5 py-3.5 font-bold">Amount</th>
                  <th className="px-5 py-3.5 font-bold">Date & Time</th>
                  <th className="px-5 py-3.5 font-bold text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading pending transactions...</td></tr>
                ) : pendingPayments.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">All digital payments are reconciled and up to date!</td></tr>
                ) : pendingPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{pay.receipt_number}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{pay.patient_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{pay.patient_id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        {pay.payment_method === 'telebirr' ? <Smartphone className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                        {pay.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 dark:text-white">
                      {pay.provider_reference || pay.transaction_id || 'N/A'}
                    </td>
                    <td className="px-5 py-4 font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {fmt(pay.amount)} ETB
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(pay.payment_date).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyPayment(pay.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold inline-flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm Match
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectPayment(pay.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300 font-bold inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Timestamp</th>
                  <th className="px-5 py-3.5 font-bold">Action</th>
                  <th className="px-5 py-3.5 font-bold">Actor</th>
                  <th className="px-5 py-3.5 font-bold">Entity</th>
                  <th className="px-5 py-3.5 font-bold">Reason / Notes</th>
                  <th className="px-5 py-3.5 font-bold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading financial audit log...</td></tr>
                ) : auditEvents.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No financial audit records logged yet</td></tr>
                ) : auditEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        evt.action.includes('DUPLICATE') || evt.action.includes('REJECT')
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          : evt.action.includes('VERIFIED') || evt.action.includes('ACCEPTED')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {evt.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                      {evt.actor_name} ({evt.actor_role})
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500">
                      {evt.entity_type} #{evt.entity_id}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {evt.reason || '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                      {JSON.stringify(evt.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Handover Modal */}
      {reviewShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Finance Review: {reviewShift.shift_number}
              </h3>
              <button onClick={() => setReviewShift(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span className="font-bold">{reviewShift.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Counted Cash:</span>
                <span className="font-mono font-bold">{fmt(reviewShift.closing_cash_counted)} ETB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Variance:</span>
                <span className="font-mono font-bold text-red-500">{fmt(reviewShift.cash_variance)} ETB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Finance Review Remarks
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Physical cash verified against safe deposit envelope..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleReviewDecision('DISPUTED')}
                disabled={submittingReview}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Dispute Handover
              </button>
              <button
                type="button"
                onClick={() => handleReviewDecision('ACCEPTED')}
                disabled={submittingReview}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                Accept & Reconcile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Z-Report Modal */}
      {selectedZReport && (
        <ZReportModal
          isOpen={showZReportModal}
          onClose={() => setShowZReportModal(false)}
          zReport={selectedZReport}
        />
      )}
    </div>
  );
};

export default FinanceReconciliationTab;
