import React from 'react';

interface InvoiceStatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200',
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200',
  REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200',
};

const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({ status }) => {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${statusColors[status] || statusColors.UNPAID}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default InvoiceStatusBadge;