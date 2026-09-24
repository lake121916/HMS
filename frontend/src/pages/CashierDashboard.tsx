import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface PaymentRecord {
  id: string;
  patient: string;
  method: 'Cash' | 'Card' | 'Insurance' | 'Mobile Money' | 'Bank Transfer' | 'Online';
  amount: number;
  reference?: string;
  time: string;
}

interface InvoiceSummary {
  id: number;
  patient_name: string;
  total_amount: number;
  amount_paid: number;
  status: string;
}

const todayExample: PaymentRecord[] = [
  { id: 'TXN-101', patient: 'Selam Bekele', method: 'Card', amount: 4200, reference: 'CARD-8891', time: '09:15' },
  { id: 'TXN-102', patient: 'Abebe Tadesse', method: 'Cash', amount: 2500, reference: 'CASH-204', time: '10:23' },
  { id: 'TXN-103', patient: 'Meron Alemu', method: 'Insurance', amount: 6800, reference: 'INS-117', time: '11:10' },
  { id: 'TXN-104', patient: 'Kebede Worku', method: 'Mobile Money', amount: 1800, reference: 'MM-420', time: '13:42' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(value);

const PaymentMethodStyles: Record<string, string> = {
  Cash: 'bg-green-100 text-green-800',
  Card: 'bg-blue-100 text-blue-800',
  Insurance: 'bg-purple-100 text-purple-800',
  'Mobile Money': 'bg-cyan-100 text-cyan-800',
  'Bank Transfer': 'bg-amber-100 text-amber-800',
  Online: 'bg-indigo-100 text-indigo-800',
};

const normalizeMethod = (method: PaymentRecord['method']) => {
  switch (method) {
    case 'Cash':
      return 'cash';
    case 'Card':
      return 'card';
    case 'Insurance':
      return 'insurance';
    case 'Mobile Money':
      return 'mobile_money';
    case 'Bank Transfer':
      return 'bank_transfer';
    case 'Online':
      return 'online';
    default:
      return 'cash';
  }
};

const CashierDashboard: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>(todayExample);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payments');
      const rows = res.data?.data?.payments || [];
      const mapped = rows.map((entry: any) => ({
        id: `TXN-${entry.id}`,
        patient: entry.patient_name || 'Patient',
        method: String(entry.payment_method || 'cash').split('_').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') as PaymentRecord['method'],
        amount: Number(entry.amount || 0),
        reference: entry.transaction_id || '—',
        time: new Date(entry.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setPayments(mapped.length ? mapped : todayExample);
    } catch (error) {
      setPayments(todayExample);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      const rows = res.data?.data?.invoices || [];
      setInvoices(rows.filter((invoice: InvoiceSummary) => invoice.status !== 'paid'));
    } catch (error) {
      setInvoices([]);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter(payment =>
      payment.patient.toLowerCase().includes(term) ||
      payment.id.toLowerCase().includes(term) ||
      payment.method.toLowerCase().includes(term)
    );
  }, [payments, query]);

  const totalRevenue = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  const paidBills = useMemo(() => payments.length, [payments]);
  const pendingBills = 7;
  const outstandingBalance = 14500;

  const handleSavePayment = async (form: {
    patient: string;
    method: PaymentRecord['method'];
    amount: number;
    reference?: string;
    invoiceId?: number;
  }) => {
    setLoading(true);

    if (!form.invoiceId) {
      alert('Please select an invoice before saving the payment.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/payments', {
        invoice_id: form.invoiceId,
        amount: Number(form.amount),
        payment_method: normalizeMethod(form.method),
        transaction_id: form.reference?.trim() || undefined,
        notes: `Cashier payment received from ${form.patient.trim()}`,
      });

      await fetchPayments();
      await fetchInvoices();
      setLoading(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Payment submission error:', error);
      setLoading(false);
      alert('The payment could not be saved. Please check the invoice and try again.');
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cashier Dashboard</h1>
          <p className="text-sm text-gray-500">Track daily collections and record patient payments by method.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Receive Payment
          </button>
          <Link to="/invoices" className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
            Invoices
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Today's Revenue" value={formatCurrency(totalRevenue)} accent="bg-emerald-500" />
        <StatCard label="Total Transactions" value={String(paidBills)} accent="bg-blue-500" />
        <StatCard label="Outstanding Balance" value={formatCurrency(outstandingBalance)} accent="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payment Activity</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient, ID, or method"
              className="w-full md:w-72 px-3 py-2 border border-gray-200 rounded-md text-sm"
            />
          </div>

          <div className="space-y-3">
            {filtered.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3">
                <div>
                  <div className="font-medium text-gray-900">{payment.patient}</div>
                  <div className="text-xs text-gray-500">{payment.id} • {payment.reference}</div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${PaymentMethodStyles[payment.method]}`}>
                    {payment.method}
                  </span>
                  <div className="text-[11px] text-gray-400 mt-1">{payment.time}</div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">No payments match your search.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pending Bills</span>
                <span className="font-semibold">{pendingBills}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Paid Bills</span>
                <span className="font-semibold">{paidBills}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Insurance Claims</span>
                <span className="font-semibold">3</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Mix</h2>
            <div className="space-y-3 text-sm">
              {Object.entries(PaymentMethodStyles).map(([method, style]) => {
                const total = payments
                  .filter(payment => payment.method === method)
                  .reduce((sum, payment) => sum + payment.amount, 0);

                return (
                  <div key={method} className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${style}`}>
                      {method}
                    </span>
                    <span className="font-semibold">{formatCurrency(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Example Payment Cases</h2>
          <span className="text-xs text-gray-500">Sample records for common cashier actions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <ExampleBox title="Cash payment" text="Patient pays consultation fee immediately at the desk." method="Cash" amount="2,500 ETB" />
          <ExampleBox title="Card payment" text="Card swipe from an insured patient for a laboratory bill." method="Card" amount="4,200 ETB" />
          <ExampleBox title="Insurance claim" text="Insurance covers a surgical invoice after approval." method="Insurance" amount="6,800 ETB" />
          <ExampleBox title="Mobile money" text="Patient settles a pharmacy purchase by mobile wallet." method="Mobile Money" amount="1,800 ETB" />
        </div>
      </div>

      {isOpen && (
        <ReceivePaymentModal
          invoices={invoices}
          onClose={() => setIsOpen(false)}
          onSubmit={handleSavePayment}
          loading={loading}
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`h-11 w-11 rounded-lg ${accent}`} />
    </div>
  </div>
);

const ExampleBox: React.FC<{ title: string; text: string; method: string; amount: string }> = ({ title, text, method, amount }) => (
  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
    <div className="text-sm font-semibold text-gray-800">{title}</div>
    <p className="mt-1 text-xs text-gray-600">{text}</p>
    <div className="mt-3 flex items-center justify-between text-xs">
      <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-1">{method}</span>
      <span className="font-semibold text-gray-800">{amount}</span>
    </div>
  </div>
);

const ReceivePaymentModal: React.FC<{
  invoices: InvoiceSummary[];
  onClose: () => void;
  onSubmit: (payload: { patient: string; method: PaymentRecord['method']; amount: number; reference?: string; invoiceId?: number }) => Promise<void> | void;
  loading: boolean;
}> = ({ invoices, onClose, onSubmit, loading }) => {
  const [patient, setPatient] = useState('Selam Bekele');
  const [invoiceId, setInvoiceId] = useState<number | ''>(invoices[0]?.id ?? '');
  const [method, setMethod] = useState<PaymentRecord['method']>('Cash');
  const [amount, setAmount] = useState('2500');
  const [reference, setReference] = useState('EXAMPLE-001');

  const methods: PaymentRecord['method'][] = ['Cash', 'Card', 'Insurance', 'Mobile Money', 'Bank Transfer', 'Online'];

  const referenceLabel = method === 'Card' ? 'Card authorization / receipt number'
    : method === 'Insurance' ? 'Insurance claim number'
      : method === 'Mobile Money' ? 'Mobile money transaction ID'
        : method === 'Bank Transfer' ? 'Bank transfer reference'
          : method === 'Online' ? 'Online payment reference' : 'Reference (optional)';

  const referenceRequired = method !== 'Cash';

  useEffect(() => {
    if (!invoiceId && invoices[0]) {
      setInvoiceId(invoices[0].id);
    }
  }, [invoiceId, invoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);

    if (!patient.trim()) {
      alert('Please enter the patient name.');
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    if (referenceRequired && !reference.trim()) {
      alert(`Please enter the ${referenceLabel.toLowerCase()}.`);
      return;
    }

    await onSubmit({ patient, method, amount: value, reference: reference.trim() || undefined, invoiceId: Number(invoiceId) || undefined });
  };

  const loadExample = () => {
    setPatient('Martha Addisu');
    setMethod('Card');
    setAmount('4200');
    setReference('CARD-EXAMPLE-01');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Receive Payment</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select an outstanding invoice</option>
              {invoices.length > 0 ? invoices.map((item) => (
                <option key={item.id} value={item.id}>#{item.id} • {item.patient_name}</option>
              )) : <option value="">No outstanding invoices</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
            <input
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentRecord['method'])}
              className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {methods.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ETB)</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{referenceLabel}{referenceRequired ? ' *' : ''}</label>
            <input
              required={referenceRequired}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button type="button" onClick={loadExample} className="text-sm text-blue-600 hover:underline">
              Load Example
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-2 border border-gray-200 rounded-md text-sm">Cancel</button>
              <button type="submit" disabled={loading || !invoiceId} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold disabled:opacity-60">
                {loading ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CashierDashboard;
