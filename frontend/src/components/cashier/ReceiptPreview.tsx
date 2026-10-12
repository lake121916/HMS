import React from 'react';
import { Printer, Download } from 'lucide-react';
import { toNum } from '../../utils/format';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { language, formatCurrency } = useLanguage();
  const safeAmount = toNum(receipt.amount);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
      {/* Header */}
      <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          Alem Ketema Enat Hospital
          <span className="block text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
            አለም ከተማ እናት ጠቅላላ ሆስፒታል
          </span>
        </h1>
        <div className="inline-block mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Official Payment Receipt — ይፋዊ የክፍያ ደረሰኝ
          </p>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">
            Receipt No. / <span className="font-amharic text-xs">የደረሰኝ ቁጥር:</span>
          </span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{receipt.receipt_number || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">
            Invoice Ref. / <span className="font-amharic text-xs">የክፍያ መጠየቂያ:</span>
          </span>
          <span className="font-mono font-medium text-gray-900 dark:text-white">{receipt.invoice_number || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-dashed border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">
            Date & Time / <span className="font-amharic text-xs">ቀን እና ሰዓት:</span>
          </span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : 'Just now'}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-600 dark:text-gray-400">
            Cashier / <span className="font-amharic text-xs">ገንዘብ ተቀባይ:</span>
          </span>
          <span className="font-medium text-gray-900 dark:text-white">{receipt.cashier_name || 'Hospital Cashier'}</span>
        </div>
      </div>

      {/* Patient Information */}
      <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Patient / <span className="font-amharic text-xs">የታካሚ ስም:</span>
          </span>
          <span className="font-bold text-gray-900 dark:text-white">{receipt.patient_name || 'Walk-in Patient'}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600 dark:text-gray-400">
            Patient ID / <span className="font-amharic text-xs">መለያ (MRN):</span>
          </span>
          <span className="font-mono font-medium text-gray-900 dark:text-white">{receipt.patient_id || 'N/A'}</span>
        </div>
      </div>

      {/* Items */}
      {receipt.items && receipt.items.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Services & Items / አገልግሎቶችና ክፍያዎች
          </h3>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {receipt.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{item.service}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(toNum(item.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
              Amount Received
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-amharic">
              የተከፈለ ጠቅላላ መጠን
            </span>
          </div>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {formatCurrency(safeAmount)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-3">
          <span className="text-gray-600 dark:text-gray-400">
            Payment Method / <span className="font-amharic text-xs">የክፍያ ዘዴ:</span>
          </span>
          <span className="font-semibold text-gray-900 dark:text-white capitalize">{(receipt.payment_method || 'cash').replace('_', ' ')}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600 dark:text-gray-400">
            Status / <span className="font-amharic text-xs">ሁኔታ:</span>
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">PAID & CONFIRMED (ተረጋግጧል)</span>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="text-center text-xs text-gray-400 dark:text-gray-500 mb-4 space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
        <p>Thank you for choosing Alem Ketema Enat Hospital.</p>
        <p className="font-amharic">አለም ከተማ እናት ጠቅላላ ሆስፒታልን ስለመረጡ እናመሰግናለን።</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
        {onPrint && (
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> {language === 'am' ? 'ይፋዊ ደረሰኝ አትም' : 'Print Official Receipt'}
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" /> {language === 'am' ? 'ደረሰኝ አውርድ' : 'Download Receipt'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ReceiptPreview;