import React from 'react';
import { Eye, DollarSign } from 'lucide-react';
import InvoiceStatusBadge from './InvoiceStatusBadge';

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
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
  onPay: (invoice: Invoice) => void;
  loading?: boolean;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, onView, onPay, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
        <div className="text-gray-400">Loading invoices...</div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
        <div className="text-gray-400">No invoices found</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient</th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{invoice.invoice_number}</div>
                  {invoice.encounter_number && (
                    <div className="text-xs text-gray-400">{invoice.encounter_number}</div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{invoice.patient_name}</div>
                  <div className="text-xs text-gray-500">{invoice.patient_id}</div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full capitalize">
                    {invoice.invoice_type}
                  </span>
                </td>
                <td className="px-5 py-4 font-extrabold text-sm text-gray-900 dark:text-white">
                  ${parseFloat(String(invoice.total_amount)).toFixed(2)}
                </td>
                <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-4">
                  <InvoiceStatusBadge status={invoice.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(invoice)}
                      title="View Invoice"
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                      <button
                        onClick={() => onPay(invoice)}
                        title="Process Payment"
                        className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;