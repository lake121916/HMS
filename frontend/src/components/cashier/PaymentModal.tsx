import React, { useState, useEffect, useRef } from 'react';
import {
  X, AlertTriangle, CheckCircle2, QrCode,
  Copy, Check, RefreshCw, Zap, ShieldCheck, Shield, CheckCircle, Clock
} from 'lucide-react';
import PaymentMethodSelector from './PaymentMethodSelector';
import { fmt, toNum } from '../../utils/format';
import api from '../../services/api';

interface Invoice {
  id: number;
  invoice_number: string;
  patient_name: string;
  patient_id: string;
  total_amount: number;
  amount_paid: number;
  invoice_type: string;
  items?: Array<{ service: string; quantity: number; unit_price: number; total: number }>;
}

interface PaymentModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (paymentData: any) => Promise<void>;
  loading?: boolean;
  activeShiftId?: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, isOpen, onClose, onSubmit, loading, activeShiftId }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amount, setAmount] = useState(fmt(toNum(invoice.total_amount) - toNum(invoice.amount_paid)));
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  // Mobile payment verification states
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    reference: string;
    provider: string;
    message: string;
  } | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Dynamic QR States
  const [loadingQr, setLoadingQr] = useState(false);
  const [dynamicQr, setDynamicQr] = useState<{
    requestId: string;
    qrPayload: string;
    qrCodeDataUrl: string;
    amount: number;
    provider: string;
    expiresAt: string;
  } | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(900);
  const pollTimerRef = useRef<any>(null);

  // Insurance Co-Pay States
  const [loadingCopay, setLoadingCopay] = useState(false);
  const [copayBreakdown, setCopayBreakdown] = useState<any | null>(null);
  const [applyingCopay, setApplyingCopay] = useState(false);
  const [copayApplied, setCopayApplied] = useState(false);

  const remaining = invoice.total_amount - invoice.amount_paid;
  const paymentAmount = parseFloat(amount);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Fetch Dynamic QR when telebirr or cbe birr is selected
  useEffect(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setVerificationResult(null);

    if (paymentMethod === 'telebirr' || paymentMethod === 'bank_transfer') {
      const provider = paymentMethod === 'telebirr' ? 'telebirr' : 'cbe_birr';
      generateDynamicQr(provider);
    } else {
      setDynamicQr(null);
    }

    if (paymentMethod === 'insurance') {
      loadInsuranceBreakdown();
    }
  }, [paymentMethod, invoice.id]);

  // Countdown timer for dynamic QR
  useEffect(() => {
    if (!dynamicQr?.expiresAt) return;
    const interval = setInterval(() => {
      const msLeft = new Date(dynamicQr.expiresAt).getTime() - Date.now();
      const s = Math.max(0, Math.floor(msLeft / 1000));
      setQrSecondsLeft(s);
      if (s <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [dynamicQr]);

  const generateDynamicQr = async (provider: string) => {
    setLoadingQr(true);
    setError('');
    try {
      const res = await api.post('/payments/qr', {
        invoice_id: invoice.id,
        provider
      });
      if (res.data.success && res.data.data) {
        setDynamicQr(res.data.data);
        const msLeft = new Date(res.data.data.expiresAt).getTime() - Date.now();
        setQrSecondsLeft(Math.max(0, Math.floor(msLeft / 1000)));

        // Start background polling for status
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(async () => {
          try {
            const statusRes = await api.get(`/payments/qr/${res.data.data.requestId}/status`);
            if (statusRes.data.data?.status === 'completed') {
              clearInterval(pollTimerRef.current);
              setVerificationResult({
                verified: true,
                reference: statusRes.data.data.transactionId || 'AUTO-CONFIRMED',
                provider: provider.toUpperCase(),
                message: 'Customer scanned and completed payment on mobile app!'
              });
              setTransactionRef(statusRes.data.data.transactionId || '');
            }
          } catch (e) {
            // silent poll failure
          }
        }, 4000);
      }
    } catch (err: any) {
      console.warn('Could not load dynamic QR, falling back to static guide:', err.message);
    } finally {
      setLoadingQr(false);
    }
  };

  const loadInsuranceBreakdown = async () => {
    setLoadingCopay(true);
    setError('');
    try {
      const res = await api.get(`/insurance/invoices/${invoice.id}/copay-breakdown`);
      if (res.data.success) {
        setCopayBreakdown(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Patient has no verified active insurance policy');
    } finally {
      setLoadingCopay(false);
    }
  };

  const handleApplyCopaySplit = async () => {
    if (!copayBreakdown) return;
    setApplyingCopay(true);
    setError('');
    try {
      const res = await api.post(`/insurance/invoices/${invoice.id}/apply-copay`, {
        policy_id: copayBreakdown.policyId,
        notes: `Cashier POS applied ${copayBreakdown.planName} (${copayBreakdown.coveragePercentage}% coverage)`
      });
      if (res.data.success) {
        setCopayApplied(true);
        // Patient balance now reduced to co-pay
        const copay = res.data.data.patientCoPay;
        setAmount(fmt(copay));
        // Prompt cashier to collect co-pay
        setPaymentMethod('cash');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to apply insurance co-pay split');
    } finally {
      setApplyingCopay(false);
    }
  };

  const handleVerifyReference = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid amount before verifying reference');
      return;
    }
    if (!transactionRef || !transactionRef.trim()) {
      setError(`Please enter the transaction reference from the patient's payment SMS/screen.`);
      return;
    }
    setError('');
    setVerifying(true);
    try {
      // First try dynamic QR confirmation if requestId exists
      if (dynamicQr?.requestId) {
        const confirmRes = await api.post(`/payments/qr/${dynamicQr.requestId}/confirm`, {
          transaction_id: transactionRef.trim(),
          amount: paymentAmount
        });
        if (confirmRes.data.success) {
          setVerificationResult({
            verified: true,
            reference: transactionRef.trim(),
            provider: dynamicQr.provider.toUpperCase(),
            message: confirmRes.data.message || 'Payment verified and receipt registered'
          });
          setVerifying(false);
          return;
        }
      }

      // Legacy fallback
      const res = await api.post('/cashier/payments/verify-reference', {
        method: paymentMethod,
        reference: transactionRef.trim(),
        amount: paymentAmount
      });

      if (res.data.success && res.data.data) {
        setTransactionRef(res.data.data.reference);
        setVerificationResult({
          verified: true,
          reference: res.data.data.reference,
          provider: res.data.data.provider,
          message: res.data.data.message
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Verification failed. Please check transaction code.';
      setError(msg);
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentMethod === 'insurance') {
      if (!copayApplied) {
        setError('Please click "Apply Insurance Split & Claim" above before finalizing checkout.');
        return;
      }
    }

    if (paymentAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (paymentAmount > remaining + 0.01) {
      setError(`Amount exceeds remaining balance of ETB ${fmt(remaining)}`);
      return;
    }

    if ((paymentMethod === 'bank_transfer' || paymentMethod === 'telebirr') && !transactionRef) {
      setError(`Transaction reference code is required for ${paymentMethod === 'telebirr' ? 'Telebirr' : 'CBE Birr'}`);
      return;
    }

    try {
      await onSubmit({
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        transaction_id: transactionRef ? transactionRef.trim() : undefined,
        shift_id: activeShiftId || undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment processing failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                POS Checkout
              </span>
              <span className="text-xs text-slate-300">Invoice #{invoice.invoice_number}</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight mt-1 text-white">Process Patient Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Information Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Patient Details</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{invoice.patient_name}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{invoice.patient_id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Billing Category</p>
                <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 mt-1 capitalize">
                  {invoice.invoice_type}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Select Payment Gateway *
            </label>
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} disabled={loading} />
          </div>

          {/* ── PRIORITY 1: INSURANCE CO-PAY AND CLAIMS BREAKDOWN ── */}
          {paymentMethod === 'insurance' && (
            <div className="bg-gradient-to-br from-cyan-950 via-slate-900 to-blue-950 text-white rounded-3xl p-5 shadow-xl border border-cyan-800/40 space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-800/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500 flex items-center justify-center font-black text-slate-950 text-base shadow-md">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                      CBHI & Private Insurance Split
                      <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded-full font-bold uppercase">
                        {copayBreakdown?.providerType || 'Insurance'}
                      </span>
                    </h4>
                    <p className="text-xs text-cyan-200">
                      Policy: <span className="font-mono font-bold text-amber-300">{copayBreakdown?.policyNumber || 'Checking...'}</span> ({copayBreakdown?.providerName || 'Evaluating coverage'})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadInsuranceBreakdown}
                  disabled={loadingCopay}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 transition-all"
                  title="Recalculate Coverage"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingCopay ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingCopay ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-cyan-300">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <p className="text-xs font-bold">Evaluating insurance policy formulary & limits...</p>
                </div>
              ) : copayBreakdown ? (
                <div className="space-y-4">
                  {/* Co-pay Calculation Matrix */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                      <p className="text-[10px] font-black uppercase text-slate-400">Total Billed</p>
                      <p className="text-sm font-black text-white mt-0.5">{fmt(copayBreakdown.totalInvoiceAmount)} ETB</p>
                    </div>
                    <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30">
                      <p className="text-[10px] font-black uppercase text-emerald-400">Insurer Share ({copayBreakdown.coveragePercentage}%)</p>
                      <p className="text-sm font-black text-emerald-300 mt-0.5">{fmt(copayBreakdown.approvedInsuranceContribution)} ETB</p>
                    </div>
                    <div className="bg-amber-950/40 p-3 rounded-2xl border border-amber-500/30">
                      <p className="text-[10px] font-black uppercase text-amber-400">Patient Co-Pay ({copayBreakdown.copayPercentage}%)</p>
                      <p className="text-sm font-black text-amber-300 mt-0.5">{fmt(copayBreakdown.patientCoPay)} ETB</p>
                    </div>
                  </div>

                  {/* Formulary Line Items */}
                  {copayBreakdown.itemsBreakdown && (
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 text-xs bg-slate-950/50">
                      <table className="w-full">
                        <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold">
                          <tr>
                            <th className="px-3 py-1.5 text-left">Service / Item</th>
                            <th className="px-3 py-1.5 text-right">Cost</th>
                            <th className="px-3 py-1.5 text-right">Coverage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-[11px]">
                          {copayBreakdown.itemsBreakdown.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="px-3 py-1.5 text-slate-200">{item.description}</td>
                              <td className="px-3 py-1.5 text-right font-mono">{fmt(item.cost)} ETB</td>
                              <td className="px-3 py-1.5 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  item.isEligible ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {item.isEligible ? `${copayBreakdown.coveragePercentage}% Covered` : 'Excluded'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Apply Co-Pay Action */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/30 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-cyan-200">
                        {copayApplied ? 'Insurance Split Approved & Claim Recorded!' : 'Apply Insurance Split & Generate Claim'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {copayApplied 
                          ? `Patient payable reduced to ${fmt(copayBreakdown.patientCoPay)} ETB. Proceed to collect co-pay.`
                          : 'Records insurer receivable claim and allocates patient co-pay.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyCopaySplit}
                      disabled={applyingCopay || copayApplied}
                      className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        copayApplied
                          ? 'bg-emerald-500 text-slate-950 cursor-default'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-slate-950'
                      }`}
                    >
                      {applyingCopay ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Applying...
                        </>
                      ) : copayApplied ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" /> Split Applied
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" /> Apply Split
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── PRIORITY 2: DYNAMIC TELEBIRR & CBE BIRR QR DRAWER ── */}
          {(paymentMethod === 'telebirr' || paymentMethod === 'bank_transfer') && (
            <div className={`rounded-3xl p-5 shadow-xl border text-white space-y-4 ${
              paymentMethod === 'telebirr'
                ? 'bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 border-purple-800/40'
                : 'bg-gradient-to-br from-amber-950 via-slate-900 to-orange-950 border-amber-800/40'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                    paymentMethod === 'telebirr' ? 'bg-purple-600 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {paymentMethod === 'telebirr' ? 't' : 'CBE'}
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                      {paymentMethod === 'telebirr' ? 'Telebirr Dynamic QR Checkout' : 'CBE Birr Dynamic QR Checkout'}
                      <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold ${
                        paymentMethod === 'telebirr' 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      }`}>
                        Exact Amount QR
                      </span>
                    </h4>
                    <p className="text-xs opacity-80">
                      Till / Merchant Account: <span className="font-mono font-bold text-emerald-300">
                        {paymentMethod === 'telebirr' ? '654321' : '1000189922341'}
                      </span>
                    </p>
                  </div>
                </div>

                {dynamicQr && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono text-amber-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{Math.floor(qrSecondsLeft / 60)}:{String(qrSecondsLeft % 60).padStart(2, '0')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Genuine Dynamic QR Image */}
                <div className="bg-white p-4 rounded-2xl shadow-inner flex flex-col items-center justify-center text-slate-900 border-2 border-slate-300">
                  {loadingQr ? (
                    <div className="w-40 h-40 flex flex-col items-center justify-center text-slate-500 gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
                      <span className="text-[11px] font-bold">Generating dynamic QR...</span>
                    </div>
                  ) : dynamicQr?.qrCodeDataUrl ? (
                    <img 
                      src={dynamicQr.qrCodeDataUrl} 
                      alt="Payment QR Code" 
                      className="w-44 h-44 object-contain rounded-xl shadow-md"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                      <QrCode className="w-16 h-16 opacity-40" />
                    </div>
                  )}
                  
                  <p className="text-[11px] font-bold text-slate-800 mt-2 text-center">
                    Scan with {paymentMethod === 'telebirr' ? 'Telebirr' : 'CBE Birr'} App
                  </p>
                  <p className="text-[10px] text-emerald-700 font-black mt-0.5">
                    Amount: {fmt(dynamicQr?.amount || paymentAmount || remaining)} ETB
                  </p>
                </div>

                {/* Instructions and Deep Link Info */}
                <div className="space-y-3">
                  <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800 text-xs space-y-2">
                    <p className="font-extrabold text-amber-300">How Patient Pays:</p>
                    <ol className="list-decimal list-inside text-slate-300 text-[11px] space-y-1">
                      <li>Open {paymentMethod === 'telebirr' ? 'Telebirr' : 'CBE Birr'} app on phone</li>
                      <li>Scan the dynamic QR code on screen</li>
                      <li>The exact amount of <span className="font-bold text-emerald-300">{fmt(paymentAmount || remaining)} ETB</span> is pre-loaded</li>
                      <li>Patient authorizes with PIN and gives Transaction ID</li>
                    </ol>

                    {dynamicQr && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(dynamicQr.qrPayload)}
                          className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          Copy Deep Link Payload
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyReference}
                    disabled={verifying}
                    className={`w-full py-2.5 px-4 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                      paymentMethod === 'telebirr'
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-slate-950'
                    }`}
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Transaction...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 fill-current" /> Authorize / Validate Transaction Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payment Amount (ETB) *
              </label>
              <button
                type="button"
                onClick={() => setAmount(fmt(remaining))}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Pay Full Balance ({fmt(remaining)} ETB)
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3.5 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-base font-extrabold text-slate-900 dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="Enter amount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                ETB
              </span>
            </div>
            {paymentAmount > remaining && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Amount exceeds remaining invoice balance
              </p>
            )}
          </div>

          {/* Transaction Reference & Verification Banner */}
          {(paymentMethod === 'bank_transfer' || paymentMethod === 'telebirr') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {paymentMethod === 'telebirr' ? 'Telebirr Reference Number' : 'CBE Birr Transaction Reference'} *
                </label>
                {verificationResult?.verified && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> API VERIFIED
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => {
                    setTransactionRef(e.target.value);
                    setVerificationResult(null);
                  }}
                  disabled={loading}
                  className={`w-full px-4 py-3 border-2 rounded-2xl text-sm font-mono font-bold dark:bg-slate-800 dark:text-white transition-all ${
                    verificationResult?.verified
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                  }`}
                  placeholder={paymentMethod === 'telebirr' ? 'e.g. TLB-882910' : 'e.g. CBE-992144'}
                />
                
                <button
                  type="button"
                  onClick={handleVerifyReference}
                  disabled={verifying}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl shadow transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Verify
                </button>
              </div>

              {/* Verification details pill */}
              {verificationResult && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold">{verificationResult.provider}</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">{verificationResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Payment Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Telebirr app confirmed by patient mobile screen"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || paymentAmount <= 0 || paymentAmount > remaining}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Complete Payment ({fmt(paymentAmount || 0)} ETB)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
