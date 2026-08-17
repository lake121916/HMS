import React, { useState, useMemo } from 'react';
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
  const [payments, setPayments] = useState(dummy.recentPayments);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(p => p.patient.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.method.toLowerCase().includes(q));
  }, [payments, query]);

  const addPaymentOptimistic = (payment: any) => {
    setPayments(prev => [payment, ...prev].slice(0, 20));
  };

  const handleReceive = async (form: { patient: string; method: string; amount: number; reference?: string }) => {
    setLoading(true);
    const newPayment = {
      id: `TMP-${Date.now()}`,
      patient: form.patient,
      method: form.method,
      amount: form.amount,
      time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
    addPaymentOptimistic(newPayment);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient: form.patient, method: form.method, amount: form.amount, reference: form.reference }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      // replace temp id with real one if returned
      if (data?.id) {
        setPayments(prev => prev.map(p => p.id === newPayment.id ? { ...p, id: data.id } : p));
      }
    } catch (err) {
      // on error, remove optimistic item and show alert
      setPayments(prev => prev.filter(p => p.id !== newPayment.id));
      alert('Failed to record payment — please try again.');
    } finally {
      setLoading(false);
      setModalOpen(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cashier Dashboard</h1>
        <div className="flex gap-3">
          <button onClick={() => setModalOpen(true)} className="px-3 py-2 bg-[#06b6d4] text-[#042230] rounded-md text-sm font-semibold">Receive Payment</button>
          <Link to="/invoices" className="px-3 py-2 border border-gray-200 rounded-md text-sm">Invoices</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Today's Revenue</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(dummy.todaysRevenue + payments.reduce((s, p) => s + p.amount, 0) - dummy.recentPayments.reduce((s, p) => s + p.amount, 0))}</div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Total Transactions</div>
          <div className="text-2xl font-bold mt-2">{dummy.totalTransactions + (payments.length - dummy.recentPayments.length)}</div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Outstanding Balance</div>
          <div className="text-2xl font-bold mt-2">{formatCurrency(dummy.outstandingBalance)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Recent Payments</h2>
            <div className="flex items-center gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by patient, id, method" className="px-3 py-2 border rounded-md text-sm" />
            </div>
          </div>
          <ul className="divide-y">
            {filtered.map(p => (
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
            {filtered.length === 0 && <li className="py-6 text-center text-sm text-gray-500">No payments found.</li>}
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
            <div key={i} className="flex-1 bg-[#e6fbfb] rounded-t-md flex items-end">
              <div style={{ height: `${Math.min(100, (v / 3500) * 100)}%` }} className="w-full bg-[#06b6d4] rounded-t-md" title={`${formatCurrency(v)}`}></div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <ReceivePaymentModal onClose={() => setModalOpen(false)} onSubmit={handleReceive} loading={loading} />
      )}
    </div>
  );
};

const ReceivePaymentModal: React.FC<{ onClose: () => void; onSubmit: (f: any) => Promise<void>; loading: boolean }> = ({ onClose, onSubmit, loading }) => {
  const [patient, setPatient] = useState('');
  const [method, setMethod] = useState('Cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  const methods = ['Cash', 'Card', 'Insurance', 'Mobile Money'];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!patient || !amt || isNaN(amt)) return alert('Please enter patient name and valid amount.');
    await onSubmit({ patient, method, amount: amt, reference });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Receive Payment</h3>
          <button type="button" onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700">Patient</label>
            <input value={patient} onChange={e => setPatient(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              {methods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Amount</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-md" inputMode="decimal" />
          </div>
          <div>
            <label className="text-sm text-gray-700">Reference (optional)</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className="w-full px-3 py-2 border rounded-md" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-3 py-2 rounded-md border">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-[#06b6d4] text-[#042230] font-semibold">{loading ? 'Saving...' : 'Save Payment'}</button>
        </div>
      </form>
    </div>
  );
};

export default CashierDashboard;
