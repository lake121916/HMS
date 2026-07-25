import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Trash2, X, FlaskConical, Upload } from 'lucide-react';

interface LabTest {
  id: number; patient_name: string; doctor_name: string; test_name: string; test_type: string;
  status: string; priority: string; requested_date: string; notes: string;
  results?: string; is_abnormal?: boolean; result_date?: string;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const STATUS_COLORS: Record<string,string> = {
  pending: 'bg-yellow-100 text-yellow-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-600',
};
const PRIORITY_COLORS: Record<string,string> = {
  low: 'bg-gray-100 text-gray-500', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700',
};

const LabTestsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [orderForm, setOrderForm] = useState({ patient_id:'', test_name:'', test_type:'blood', priority:'normal', notes:'' });
  const [resultForm, setResultForm] = useState({ results:'', reference_range:'', is_abnormal:false, notes:'' });

  useEffect(() => { fetchTests(); }, [statusFilter]);

  const fetchTests = async () => {
    try {
      const p = statusFilter ? `?status=${statusFilter}` : '';
      const r = await api.get(`/lab-tests${p}`);
      setTests(r.data.data.labTests || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lab-tests', { ...orderForm, patient_id: parseInt(orderForm.patient_id) });
      setShowOrderModal(false); fetchTests();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try { await api.put(`/lab-tests/${id}`, { status }); fetchTests(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleUploadResult = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/lab-tests/${selectedTest?.id}/result`, resultForm);
      setShowResultModal(false); fetchTests();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this lab test?')) return;
    try { await api.delete(`/lab-tests/${id}`); fetchTests(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = tests.filter(t =>
    t.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.test_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-cyan-600" /> Lab Tests
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'doctor' && 'Order lab tests for your patients'}
            {user?.role === 'lab_technician' && 'Process tests and upload results — you cannot order tests'}
            {user?.role === 'patient' && 'Your requested lab tests and results'}
            {(user?.role === 'super_admin' || user?.role === 'admin') && 'Manage all lab tests'}
            {user?.role === 'nurse' && 'View lab test orders for your patients'}
          </p>
        </div>
        {can('lab_tests:create') && (
          <button onClick={() => { setOrderForm({patient_id:'',test_name:'',test_type:'blood',priority:'normal',notes:''}); setShowOrderModal(true); }}
            className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> Order Test
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient or test name..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Patient', 'Test', 'Type', 'Priority', 'Status', 'Ordered', 'Result', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No lab tests found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{t.patient_name}</td>
                  <td className="px-3 py-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.test_name}</div>
                    {t.doctor_name && <div className="text-xs text-gray-400">by {t.doctor_name}</div>}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{t.test_type}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${PRIORITY_COLORS[t.priority]||''}`}>{t.priority}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${STATUS_COLORS[t.status]||''}`}>{t.status.replace('_',' ')}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{new Date(t.requested_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    {t.results ? (
                      <span className={`text-xs font-medium ${t.is_abnormal ? 'text-red-600' : 'text-green-600'}`}>
                        {t.is_abnormal ? '⚠ Abnormal' : '✓ Normal'}
                      </span>
                    ) : <span className="text-xs text-gray-400">Pending</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {/* Lab tech: start processing */}
                      {can('lab_tests:update_status') && t.status === 'pending' && (
                        <button onClick={() => handleStatusUpdate(t.id, 'in_progress')} title="Start Processing"
                          className="text-blue-500 hover:text-blue-700 text-xs font-medium">Start</button>
                      )}
                      {/* Lab tech: upload result */}
                      {can('lab_tests:upload_result') && t.status === 'in_progress' && (
                        <button onClick={() => { setSelectedTest(t); setResultForm({results:'',reference_range:'',is_abnormal:false,notes:''}); setShowResultModal(true); }}
                          title="Upload Result" className="text-green-500 hover:text-green-700">
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                      {/* Doctor: cancel */}
                      {can('lab_tests:create') && t.status === 'pending' && (
                        <button onClick={() => handleStatusUpdate(t.id, 'cancelled')} title="Cancel" className="text-red-400 hover:text-red-600 text-xs">Cancel</button>
                      )}
                      {can('lab_tests:delete') && (
                        <button onClick={() => handleDelete(t.id)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Test Modal (doctor only) */}
      {showOrderModal && can('lab_tests:create') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Lab Test</h2>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleOrder} className="p-6 space-y-4">
              <div><label className={lbl}>Patient ID *</label><input type="number" required value={orderForm.patient_id} onChange={e=>setOrderForm({...orderForm,patient_id:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Test Name *</label><input required value={orderForm.test_name} onChange={e=>setOrderForm({...orderForm,test_name:e.target.value})} className={inp} placeholder="e.g. Complete Blood Count" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Test Type</label>
                  <select value={orderForm.test_type} onChange={e=>setOrderForm({...orderForm,test_type:e.target.value})} className={inp}>
                    {['blood','urine','stool','x-ray','mri','ct','ecg','ultrasound','culture','other'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Priority</label>
                  <select value={orderForm.priority} onChange={e=>setOrderForm({...orderForm,priority:e.target.value})} className={inp}>
                    <option value="low">Low</option><option value="normal">Normal</option>
                    <option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Notes</label><textarea value={orderForm.notes} onChange={e=>setOrderForm({...orderForm,notes:e.target.value})} rows={2} className={inp} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowOrderModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700">Order Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Result Modal (lab_technician only) */}
      {showResultModal && can('lab_tests:upload_result') && selectedTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upload Result</h2>
              <button onClick={() => setShowResultModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUploadResult} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">{selectedTest.test_name}</p>
                <p className="text-blue-600 dark:text-blue-400 text-xs">Patient: {selectedTest.patient_name}</p>
              </div>
              <div><label className={lbl}>Results *</label><textarea required value={resultForm.results} onChange={e=>setResultForm({...resultForm,results:e.target.value})} rows={4} className={inp} placeholder="Enter test results..." /></div>
              <div><label className={lbl}>Reference Range</label><input value={resultForm.reference_range} onChange={e=>setResultForm({...resultForm,reference_range:e.target.value})} className={inp} placeholder="e.g. 4.5–11 x10⁹/L" /></div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="abnormal" checked={resultForm.is_abnormal} onChange={e=>setResultForm({...resultForm,is_abnormal:e.target.checked})} className="w-4 h-4 rounded" />
                <label htmlFor="abnormal" className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Abnormal</label>
              </div>
              <div><label className={lbl}>Notes</label><textarea value={resultForm.notes} onChange={e=>setResultForm({...resultForm,notes:e.target.value})} rows={2} className={inp} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowResultModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">Submit Result</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabTestsPage;
