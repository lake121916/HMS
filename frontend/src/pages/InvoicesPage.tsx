import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search, X, Eye, DollarSign, Trash2 } from 'lucide-react';
import { useRoleAccess } from '../hooks/useRoleAccess';

interface Invoice {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  amount_paid: number;
  status: string;
  notes: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_id: string;
  received_by_email: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const InvoicesPage: React.FC = () => {
  const { can } = useRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<Payment[]>([]);
  const [formData, setFormData] = useState({
    patient_id: '', subtotal: '', tax: '0', discount: '0',
    due_date: '', notes: '', admission_id: ''
  });
  const [paymentData, setPaymentData] = useState({
    amount: '', payment_method: 'cash', transaction_id: '', notes: ''
  });

  useEffect(() => { fetchInvoices(); }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/invoices${params}`);
      setInvoices(res.data.data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleViewInvoice = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    try {
      const res = await api.get(`/invoices/${inv.id}`);
      setInvoicePayments(res.data.data.payments || []);
    } catch (e) { setInvoicePayments([]); }
    setShowDetailModal(true);
  };

  const handlePayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const remaining = inv.total_amount - inv.amount_paid;
    setPaymentData({ amount: remaining.toFixed(2), payment_method: 'cash', transaction_id: '', notes: '' });
    setShowPaymentModal(true);
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/invoices', {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        subtotal: parseFloat(formData.subtotal),
        tax: parseFloat(formData.tax),
        discount: parseFloat(formData.discount),
      });
      setShowModal(false);
      if (location.pathname.endsWith('/new')) navigate('/invoices');
      fetchInvoices();
    } catch (e) { alert('Failed to create invoice'); }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        invoice_id: selectedInvoice?.id,
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || undefined,
        notes: paymentData.notes || undefined,
      });
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (e) { alert('Failed to record payment'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await api.delete(`/invoices/${id}`); fetchInvoices(); }
    catch (e) { alert('Failed to delete invoice'); }
  };

  React.useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setFormData({ patient_id: searchParams.get('patient') || '', subtotal: '', tax: '0', discount: '0', due_date: '', notes: '', admission_id: '' });
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname, searchParams]);

  const filtered = invoices.filter(inv =>
    inv.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(inv.id).includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage billing and invoices</p>
        </div>
        {can('invoices:create') && (
          <button onClick={() => {
              navigate('/invoices/new');
              setFormData({ patient_id: '', subtotal: '', tax: '0', discount: '0', due_date: '', notes: '', admission_id: '' });
            }}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient name or invoice ID..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Invoice #', 'Patient', 'Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No invoices found</td></tr>
              ) : filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400">#{inv.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{inv.patient_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{inv.patient_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${parseFloat(String(inv.total_amount)).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">${parseFloat(String(inv.amount_paid || 0)).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                    ${Math.max(0, parseFloat(String(inv.total_amount)) - parseFloat(String(inv.amount_paid || 0))).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[inv.status] || statusColors.pending}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewInvoice(inv)} title="View" className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Eye className="w-4 h-4" /></button>
                      {can('payments:create') && inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button onClick={() => handlePayment(inv)} title="Record Payment" className="text-green-600 hover:text-green-800 dark:text-green-400"><DollarSign className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => handleDelete(inv.id)} title="Delete" className="text-red-600 hover:text-red-800 dark:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New Invoice</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient ID *</label>
                <input type="number" required value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Enter patient ID" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtotal ($) *</label>
                  <input type="number" step="0.01" required value={formData.subtotal} onChange={e => setFormData({ ...formData, subtotal: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ($)</label>
                  <input type="number" step="0.01" value={formData.tax} onChange={e => setFormData({ ...formData, tax: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount ($)</label>
                  <input type="number" step="0.01" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {formData.subtotal && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                  Total: ${(parseFloat(formData.subtotal || '0') + parseFloat(formData.tax || '0') - parseFloat(formData.discount || '0')).toFixed(2)}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                <input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invoice #{selectedInvoice.id}</h2>
                <span className={`mt-1 px-2 py-0.5 text-xs font-medium rounded-full inline-block capitalize ${statusColors[selectedInvoice.status]}`}>{selectedInvoice.status}</span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Patient</p><p className="font-medium text-gray-900 dark:text-white">{selectedInvoice.patient_name}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Invoice Date</p><p className="font-medium text-gray-900 dark:text-white">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Subtotal</p><p className="font-medium text-gray-900 dark:text-white">${parseFloat(String(selectedInvoice.subtotal)).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Tax</p><p className="font-medium text-gray-900 dark:text-white">${parseFloat(String(selectedInvoice.tax)).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Discount</p><p className="font-medium text-gray-900 dark:text-white">${parseFloat(String(selectedInvoice.discount)).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Total</p><p className="text-lg font-bold text-gray-900 dark:text-white">${parseFloat(String(selectedInvoice.total_amount)).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Amount Paid</p><p className="font-medium text-green-600 dark:text-green-400">${parseFloat(String(selectedInvoice.amount_paid || 0)).toFixed(2)}</p></div>
                <div><p className="text-xs text-gray-500 dark:text-gray-400">Balance Due</p><p className="font-bold text-red-600 dark:text-red-400">${Math.max(0, parseFloat(String(selectedInvoice.total_amount)) - parseFloat(String(selectedInvoice.amount_paid || 0))).toFixed(2)}</p></div>
              </div>
              {selectedInvoice.notes && <div><p className="text-xs text-gray-500 dark:text-gray-400">Notes</p><p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{selectedInvoice.notes}</p></div>}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Payment History</h3>
                {invoicePayments.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No payments recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {invoicePayments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">${parseFloat(String(p.amount)).toFixed(2)}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2 capitalize">{p.payment_method}</span>
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">{new Date(p.payment_date).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                <p className="text-blue-800 dark:text-blue-300">Invoice #{selectedInvoice.id} — {selectedInvoice.patient_name}</p>
                <p className="text-blue-600 dark:text-blue-400 font-medium">Balance: ${Math.max(0, parseFloat(String(selectedInvoice.total_amount)) - parseFloat(String(selectedInvoice.amount_paid || 0))).toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($) *</label>
                <input type="number" step="0.01" required value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
                <select value={paymentData.payment_method} onChange={e => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="insurance">Insurance</option>
                  <option value="online">Online</option>
                  <option value="check">Check</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction ID</label>
                <input type="text" value={paymentData.transaction_id} onChange={e => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;
