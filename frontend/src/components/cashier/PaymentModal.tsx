import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import PaymentMethodSelector from './PaymentMethodSelector';
import { fmt, toNum } from '../../utils/format';

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

  const remaining = invoice.total_amount - invoice.amount_paid;
  const paymentAmount = parseFloat(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (paymentAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (paymentAmount > remaining + 0.01) {
      setError(`Amount exceeds remaining balance of $${fmt(remaining)}`);
      return;
    }

    if (paymentMethod === 'bank_transfer' && !transactionRef) {
      setError('Transaction reference is required for bank transfers');
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Process Payment</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Invoice #{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Patient</p>
                <p className="font-bold text-gray-900 dark:text-white">{invoice.patient_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.patient_id}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Invoice Type</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">{invoice.invoice_type}</p>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          {invoice.items && invoice.items.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Billing Items</h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Service</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-gray-900 dark:text-white">{item.service}</td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">${fmt(item.unit_price)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">${fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
              <span className="font-bold text-gray-900 dark:text-white">${invoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Already Paid</span>
              <span className="font-medium text-green-600 dark:text-green-400">${invoice.amount_paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Remaining Balance</span>
              <span className="font-bold text-red-600 dark:text-red-400">${remaining.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Payment Method *</label>
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} disabled={loading} />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Amount (ETB) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500"
              placeholder="Enter amount"
            />
            {paymentAmount > remaining && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Amount exceeds remaining balance
              </p>
            )}
          </div>

          {/* Transaction Reference */}
          {(paymentMethod === 'bank_transfer' || paymentMethod === 'telebirr') && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                {paymentMethod === 'telebirr' ? 'Telebirr Reference' : 'Bank Reference'} *
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500"
                placeholder="Enter transaction reference"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500"
              placeholder="Additional notes (optional)"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || paymentAmount <= 0 || paymentAmount > remaining}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirm Payment
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