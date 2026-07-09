import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';

interface Payment {
  id: number;
  invoice_id: number;
  patient_name: string;
  amount: number;
  invoice_total: number;
  payment_method: string;
  payment_date: string;
  transaction_id: string;
  received_by_email: string;
  notes: string;
}

interface PaymentStats {
  todayCollection: number;
  monthCollection: number;
  pendingCount: number;
  pendingAmount: number;
}

const methodColors: Record<string, string> = {
  cash: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  card: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  insurance: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  online: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  check: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, statsRes] = await Promise.allSettled([
        api.get('/payments'),
        api.get('/payments/stats'),
      ]);
      if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data.data.payments || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = payments.filter(p =>
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.invoice_id).includes(search)
  );

  const statCards = [
    { label: "Today's Collections", value: stats ? `$${stats.todayCollection.toLocaleString()}` : '—', icon: DollarSign, color: 'bg-green-500' },
    { label: 'This Month', value: stats ? `$${stats.monthCollection.toLocaleString()}` : '—', icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Pending Invoices', value: stats ? stats.pendingCount : '—', icon: AlertCircle, color: 'bg-yellow-500' },
    { label: 'Pending Amount', value: stats ? `$${stats.pendingAmount.toLocaleString()}` : '—', icon: CreditCard, color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Payment history and collection tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-7 w-16 inline-block" /> : s.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by patient or invoice ID..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['#', 'Invoice', 'Patient', 'Amount', 'Method', 'Transaction ID', 'Date', 'Received By'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No payments found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">#{p.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">#{p.invoice_id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.patient_name}</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600 dark:text-green-400">${parseFloat(String(p.amount)).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${methodColors[p.payment_method] || 'bg-gray-100 text-gray-800'}`}>
                      {p.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.transaction_id || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(p.payment_date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.received_by_email || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage;
