import React, { useState, useEffect } from 'react';
import {
  X, AlertTriangle, CheckCircle2, QrCode, Smartphone, Building2,
  Copy, Check, RefreshCw, Zap, ShieldCheck
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
}

const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, isOpen, onClose, onSubmit, loading }) => {
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
  const [copiedAccount, setCopiedAccount] = useState(false);

  const remaining = invoice.total_amount - invoice.amount_paid;
  const paymentAmount = parseFloat(amount);

  // Reset verification when payment method or amount changes
  useEffect(() => {
    setVerificationResult(null);
    if (paymentMethod !== 'telebirr' && paymentMethod !== 'bank_transfer') {
      setTransactionRef('');
    }
  }, [paymentMethod]);

  const handleVerifyReference = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid amount before verifying reference');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const res = await api.post('/cashier/payments/verify-reference', {
        method: paymentMethod,
        reference: transactionRef,
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
      setError(err.response?.data?.message || 'Verification failed. Please check transaction code.');
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
        transaction_id: transactionRef || undefined,
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

          {/* Invoice Items Summary */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Itemized Services</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold">Service / Item</th>
                      <th className="px-4 py-2.5 text-right font-bold">Qty</th>
                      <th className="px-4 py-2.5 text-right font-bold">Unit Price</th>
                      <th className="px-4 py-2.5 text-right font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{item.service}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400 font-semibold">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600 dark:text-slate-400">{fmt(item.unit_price)} ETB</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">{fmt(item.total)} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment Balance Calculation */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Invoice Amount</p>
              <p className="text-xl font-black text-white">{fmt(invoice.total_amount)} ETB</p>
              {invoice.amount_paid > 0 && (
                <p className="text-xs text-emerald-400 font-medium mt-0.5">Paid: {fmt(invoice.amount_paid)} ETB</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Remaining Balance</p>
              <p className="text-2xl font-black text-amber-400">{fmt(remaining)} ETB</p>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Select Payment Gateway *
            </label>
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} disabled={loading} />
          </div>

          {/* Dynamic Mobile Payment Drawers (Telebirr & CBE Birr) */}
          {paymentMethod === 'telebirr' && (
            <div className="bg-gradient-to-br from-purple-900 via-purple-950 to-indigo-950 text-white rounded-3xl p-5 shadow-xl border border-purple-800/40 relative overflow-hidden space-y-4">
              <div className="flex items-center justify-between border-b border-purple-800/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-lg text-white shadow-md">
                    t
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                      Telebirr Merchant QR Payment
                      <span className="text-[9px] bg-purple-500/30 text-purple-300 border border-purple-400/40 px-2 py-0.5 rounded-full font-bold">
                        Ethio Telecom Direct
                      </span>
                    </h4>
                    <p className="text-xs text-purple-200">Merchant Till Code: <span className="font-mono font-bold text-yellow-300">654321</span></p>
                  </div>
                </div>
                <QrCode className="w-8 h-8 text-purple-300 opacity-80" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Simulated Telebirr QR Code */}
                <div className="bg-white p-3 rounded-2xl shadow-inner flex flex-col items-center justify-center text-slate-900 border-2 border-purple-400">
                  <div className="relative w-36 h-36 bg-slate-950 rounded-xl p-2 flex items-center justify-center">
                    {/* SVG QR Visual */}
                    <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                      <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h15 v15 h-15 z M45,45 h20 v20 h-20 z M75,75 h20 v20 h-20 z M15,45 h15 v15 h-15 z M70,40 h20 v15 h-20 z M40,75 h20 v15 h-20 z M85,55 h10 v10 h-10 z M55,0 h10 v20 h-10 z" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-9 h-9 bg-purple-700 text-white font-black text-xs rounded-xl flex items-center justify-center border-2 border-white shadow-lg">
                        telebirr
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 mt-2 text-center">
                    Scan with Telebirr Mobile App
                  </p>
                  <p className="text-[10px] text-purple-700 font-extrabold mt-0.5">
                    Payee: Alem Ketema Enat Hospital
                  </p>
                </div>

                {/* USSD & Instant Verification Instructions */}
                <div className="space-y-3">
                  <div className="bg-purple-900/60 rounded-2xl p-3 border border-purple-700/50 space-y-1.5 text-xs">
                    <p className="font-extrabold text-purple-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-purple-300" /> Dial USSD Instructions:
                    </p>
                    <ol className="list-decimal list-inside text-slate-200 space-y-1 text-[11px] leading-relaxed">
                      <li>Dial <span className="font-mono font-bold text-amber-300">*127#</span> on phone</li>
                      <li>Select <span className="font-bold text-white">Pay Merchant</span></li>
                      <li>Till No: <span className="font-mono font-bold text-amber-300">654321</span></li>
                      <li>Enter Amount: <span className="font-bold text-emerald-300">{paymentAmount || remaining} ETB</span></li>
                    </ol>
                  </div>

                  {/* Auto verification trigger */}
                  <button
                    type="button"
                    onClick={handleVerifyReference}
                    disabled={verifying}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        Connecting to Telebirr Server...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current text-slate-950" />
                        Auto-Verify Telebirr Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'bank_transfer' && (
            <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-amber-900 text-white rounded-3xl p-5 shadow-xl border border-amber-800/40 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-800/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-md">
                    CBE
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                      Commercial Bank of Ethiopia (CBE Birr)
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                        Direct Bank
                      </span>
                    </h4>
                    <p className="text-xs text-amber-200">Official Hospital Account Handoff</p>
                  </div>
                </div>
                <Building2 className="w-8 h-8 text-amber-400 opacity-80" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Account Details Box */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-amber-500/30 space-y-2 text-xs">
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Account Name</p>
                    <p className="font-extrabold text-white text-sm">Alem Ketema Enat Hospital</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">CBE Account Number</p>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl border border-slate-800 mt-0.5">
                      <span className="font-mono text-sm font-black tracking-widest text-emerald-400">1000189922341</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('1000189922341')}
                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1"
                      >
                        {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedAccount ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Branch / USSD</p>
                    <p className="text-slate-300 font-semibold">Addis Ababa Main | USSD: <span className="font-mono font-bold text-amber-300">*847#</span></p>
                  </div>
                </div>

                {/* CBE Birr Verification instructions */}
                <div className="flex flex-col justify-between space-y-3">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
                    <p className="font-extrabold text-amber-300">CBE Transfer Instructions:</p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Instruct patient to complete transfer via CBE Birr App, Mobile Banking, or ATM. Provide reference number below for validation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyReference}
                    disabled={verifying}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {verifying ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        Validating CBE System...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 fill-current text-slate-950" />
                        Verify CBE Birr Transfer
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