import React from 'react';
import { Link } from 'react-router-dom';

const dummy = {
  todaysRevenue: 12450.75,
  totalTransactions: 42,
  pendingBills: 8,
  paidBills: 34,
  outstandingBalance: 4520.5,
  recentPayments: [
    { id: 'TXN-1001', patient: 'Jane Doe', method: 'Card', amount: 120.0, time: '09:15' },
    { id: 'TXN-1002', patient: 'John Smith', method: 'Cash', amount: 75.5, time: '10:02' },
    { id: 'TXN-1003', patient: 'Asha Bekele', method: 'Insurance', amount: 560.0, time: '10:30' },
  ],
  insuranceClaims: 3,
  dailyCollections: [1200, 1800, 2400, 3000, 2000, 2050, 1900],
};

const formatCurrency = (v: number) => v.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

const CashierDashboard: React.FC = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cashier Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/payments" className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">Receive Payment</Link>
          <Link to="/invoices" className="px-3 py-2 border border-gray-200 rounded-md text-sm">Invoices</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Today's Revenue</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(dummy.todaysRevenue)}</div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Transactions</div>
          <div className="text-2xl font-bold mt-2">{dummy.totalTransactions}</div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Outstanding Balance</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(dummy.outstandingBalance)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-3">Recent Payments</h2>
          <ul className="divide-y">
            {dummy.recentPayments.map(p => (
              <li key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.patient}</div>
                  <div className="text-sm text-gray-500">{p.id} • {p.method}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(p.amount)}</div>
                  <div className="text-sm text-gray-400">{p.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-lg font-medium mb-3">Analytics & Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Pending Bills</div>
              <div className="font-semibold">{dummy.pendingBills}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Paid Bills</div>
              <div className="font-semibold">{dummy.paidBills}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Insurance Claims</div>
              <div className="font-semibold">{dummy.insuranceClaims}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-lg font-medium mb-3">Daily Collection Chart (last 7 days)</h2>
        <div className="flex items-end gap-2 h-40">
          {dummy.dailyCollections.map((v, i) => (
            <div key={i} className="flex-1 bg-blue-100 rounded-t-md flex items-end">
              <div style={{ height: `${Math.min(100, (v / 3500) * 100)}%` }} className="w-full bg-blue-600 rounded-t-md" title={`${formatCurrency(v)}`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CashierDashboard;
