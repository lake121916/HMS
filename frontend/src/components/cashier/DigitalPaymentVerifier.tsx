/**
 * DigitalPaymentVerifier — Telebirr / CBE Birr Reference Verification Panel
 * Pre-validates transaction references before posting a digital payment,
 * shows duplicate detection, and lists pending verifications for the active shift.
 */
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Smartphone, Building2, CheckCircle2, AlertTriangle,
  XCircle, RefreshCw, ShieldCheck, Search, Info
} from 'lucide-react';

interface VerifyResult {
  verified: boolean;
  reference: string;
  provider: string;
  status: string;
  amount: number;
  merchantTill?: string;
  accountNumber?: string;
  message: string;
}

interface PendingPayment {
  id: number;
  receipt_number: string;
  patient_name: string;
  amount: number;
  payment_method: string;
  provider_reference?: string;
  verification_status: string;
  payment_date: string;
  invoice_number: string;
}

interface Props {
  shiftId?: number | null;
}

const providerOptions = [
  { value: 'telebirr', label: 'Telebirr (Ethio Telecom)', icon: <Smartphone className="h-4 w-4" />, color: 'text-violet-600' },
  { value: 'cbe_birr', label: 'CBE Birr / Bank Transfer', icon: <Building2 className="h-4 w-4" />, color: 'text-blue-600' },
];

const fmt = (n: number) => n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const DigitalPaymentVerifier: React.FC<Props> = ({ shiftId }) => {
  const [provider, setProvider] = useState('telebirr');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Approve / reject a pending payment
  const [approving, setApproving] = useState<number | null>(null);

  useEffect(() => {
    if (shiftId) fetchPendingPayments();
  }, [shiftId]);

  const fetchPendingPayments = async () => {
    setLoadingPending(true);
    try {
      const res = await api.get('/cashier/payments/history', {
        params: { verification_status: 'PENDING', shift_id: shiftId, limit: 50 }
      });
      setPendingPayments(res.data.data?.payments || []);
    } catch {
      // silently ignore
    } finally {
      setLoadingPending(false);
    }
  };

  const verifyReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;
    setChecking(true);
    setCheckError(null);
    setResult(null);
    try {
      const res = await api.post('/cashier/payments/verify-reference', {
        method: provider,
        reference: reference.trim(),
        amount: parseFloat(amount || '0'),
      });
      setResult(res.data.data);
    } catch (err: any) {
      if (err.response?.data?.isDuplicate) {
        setCheckError('⚠ DUPLICATE: ' + (err.response?.data?.message || 'This reference was already used.'));
      } else {
        setCheckError(err.response?.data?.message || 'Verification failed');
      }
    } finally {
      setChecking(false);
    }
  };

  const approvePayment = async (paymentId: number) => {
    setApproving(paymentId);
    try {
      await api.patch(`/cashier/payments/${paymentId}/verify`, {
        status: 'VERIFIED',
        method: 'MANUAL_MERCHANT_APP',
      });
      await fetchPendingPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setApproving(null);
    }
  };

  const rejectPayment = async (paymentId: number) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    setApproving(paymentId);
    try {
      await api.patch(`/cashier/payments/${paymentId}/verify`, {
        status: 'REJECTED',
        reason,
      });
      await fetchPendingPayments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Pre-verification form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
          <ShieldCheck className="h-4 w-4 text-violet-500" />
          Pre-Verify Transaction Reference
          <span className="text-xs text-slate-400 font-normal ml-1">— Check before posting payment</span>
        </h3>

        {/* Provider select */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {providerOptions.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => { setProvider(p.value); setResult(null); setCheckError(null); }}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-sm font-medium transition
                ${provider === p.value
                  ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
            >
              <span className={provider === p.value ? p.color : 'text-slate-400'}>{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={verifyReference} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                Transaction Reference *
              </label>
              <input
                value={reference}
                onChange={e => { setReference(e.target.value); setResult(null); setCheckError(null); }}
                placeholder={provider === 'telebirr' ? 'e.g. TLB20241013XXXXX' : 'e.g. FT2410130001234'}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <p className="text-xs text-slate-400 mt-1">
                {provider === 'telebirr'
                  ? 'Copy from Telebirr merchant app or customer SMS'
                  : 'Copy from CBE mobile banking confirmation'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Expected Amount (ETB)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={checking || !reference.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
              {checking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {checking ? 'Checking…' : 'Verify Reference'}
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <div className="font-semibold text-emerald-800 mb-2">Reference Valid — Ready to Post</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-emerald-700">
                  <div><span className="text-emerald-500">Provider:</span> {result.provider}</div>
                  <div><span className="text-emerald-500">Reference:</span> <code className="font-mono">{result.reference}</code></div>
                  {result.merchantTill && <div><span className="text-emerald-500">Merchant Till:</span> *127*6*{result.merchantTill}#</div>}
                  {result.accountNumber && <div><span className="text-emerald-500">CBE Account:</span> {result.accountNumber}</div>}
                </div>
                <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  {result.message}
                </div>
              </div>
            </div>
          </div>
        )}

        {checkError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">{checkError}</div>
          </div>
        )}
      </div>

      {/* Pending digital payments for this shift */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Pending Verification
            {pendingPayments.length > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingPayments.length}
              </span>
            )}
          </h3>
          <button onClick={fetchPendingPayments} disabled={loadingPending}
            className="text-slate-400 hover:text-slate-600 transition">
            <RefreshCw className={`h-4 w-4 ${loadingPending ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingPending ? (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : pendingPayments.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="h-9 w-9 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No pending digital payments for this shift</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {pendingPayments.map(p => (
              <div key={p.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {p.payment_method === 'telebirr'
                      ? <Smartphone className="h-4 w-4 text-violet-500 shrink-0" />
                      : <Building2 className="h-4 w-4 text-blue-500 shrink-0" />}
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">{p.patient_name}</span>
                    <span className="text-xs text-slate-400">{p.invoice_number}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>Receipt: <code className="font-mono">{p.receipt_number}</code></div>
                    {p.provider_reference && (
                      <div>Ref: <code className="font-mono text-violet-700 dark:text-violet-400">{p.provider_reference}</code></div>
                    )}
                    <div>{new Date(p.payment_date).toLocaleString('en-ET')}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-slate-900 dark:text-white font-mono text-sm">{fmt(p.amount)} ETB</div>
                  <div className="text-xs text-amber-600 font-semibold mt-0.5 capitalize">{p.payment_method.replace('_', ' ')}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approvePayment(p.id)}
                    disabled={approving === p.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition"
                  >
                    {approving === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    Approve
                  </button>
                  <button
                    onClick={() => rejectPayment(p.id)}
                    disabled={approving === p.id}
                    className="flex items-center gap-1 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg disabled:opacity-50 transition"
                  >
                    <XCircle className="h-3 w-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-xs text-blue-700 dark:text-blue-300 flex gap-3 items-start">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold mb-1">Digital Payment Workflow</div>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Cashier uses this panel to pre-verify the Telebirr/CBE reference from customer's phone</li>
            <li>Payment is posted with status PENDING until reference is confirmed</li>
            <li>Cashier approves after matching reference on merchant app / bank statement</li>
            <li>All approvals are logged in the Financial Audit Trail</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DigitalPaymentVerifier;
