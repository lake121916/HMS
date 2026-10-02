import React from 'react';
import { Printer, Download } from 'lucide-react';

interface Receipt {
  receipt_number: string;
  invoice_number: string;
  patient_name: string;
  patient_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  cashier_name: string;
  items?: Array<{ service: string; amount: number }>;
}

interface ReceiptPreviewProps {
  receipt: Receipt;
  onPrint?: () => void;
  onDownload?: () => void;
}

const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({ receipt, onPrint, onDownload }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
      {/* Header */}
      <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alem Ketema Enat Hospital</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Payment Receipt</p>
      </div>

      {/* Receipt Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Receipt Number:</span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.receipt_number}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Invoice Number:</span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.invoice_number}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Date:</span>
          <span className="font-medium text-gray-900 dark:text-white">{new Date(receipt.payment_date).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Cashier:</span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.cashier_name}</span>
        </div>
      </div>

      {/* Patient Information */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Patient:</span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.patient_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Patient ID:</span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.patient_id}</span>
        </div>
      </div>

      {/* Items */}
      {receipt.items && receipt.items.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Services</h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {receipt.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{item.service}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount</span>
          <span className="text-2xl font-black text-green-600 dark:text-green-400">${receipt.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
          <span className="font-medium text-gray-900 dark:text-white capitalize">{receipt.payment_method.replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className="font-medium text-green-600 dark:text-green-400">PAID</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onPrint && (
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPreview;