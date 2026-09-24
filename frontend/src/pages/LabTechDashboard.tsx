/**
 * Lab Technician Dashboard
 * - View pending lab orders
 * - Mark tests in-progress
 * - Enter and submit results
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FlaskConical, RefreshCw, CheckCircle2, Search, AlertCircle } from 'lucide-react';

interface LabTest {
  id: number;
  patient_name: string;
  doctor_name: string;
  test_name: string;
  test_type: string;
  priority: string;
  status: string;
  requested_date: string;
  results?: string;
  is_abnormal?: boolean;
  encounter_id?: number;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

const LabTechDashboard: React.FC = () => {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selected, setSelected] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending'|'in_progress'|'completed'|'all'>('pending');
  const [resultForm, setResultForm] = useState({
    results: '', reference_range: '', is_abnormal: false, notes: ''
  });

  useEffect(() => { fetchTests(); }, [filter]);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/lab-tests${params}`);
      setTests(res.data.data.labTests || []);
    } catch { showToast('error', 'Failed to load lab tests'); }
    finally { setLoading(false); }
  };

  const markInProgress = async (id: number) => {
    try {
      await api.put(`/lab-tests/${id}`, { status: 'in_progress' });
      showToast('success', 'Test marked as in progress');
      fetchTests();
    } catch { showToast('error', 'Update failed'); }
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post(`/lab-tests/${selected.id}/result`, resultForm);
      showToast('success', `Results recorded for ${selected.test_name}!`);
      setSelected(null);
      setResultForm({ results: '', reference_range: '', is_abnormal: false, notes: '' });
      fetchTests();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to submit result');
    } finally { setSubmitting(false); }
  };

  const filtered = tests.filter(t => {
    const q = search.toLowerCase();
    return t.patient_name?.toLowerCase().includes(q) || t.test_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 uppercase tracking-wider">
            Laboratory
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Lab Technician Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Process lab orders and record results</p>
        </div>
        <button onClick={fetchTests} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-sm text-slate-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          {(['pending','in_progress','completed','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize
                ${filter === f ? 'bg-white dark:bg-slate-700 text-cyan-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f.replace('_',' ')}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-64 pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
        </div>
        <div className="ml-auto flex gap-4">
          {[
            { label: 'Pending', count: tests.filter(t=>t.status==='pending').length, color: 'text-amber-600' },
            { label: 'In Progress', count: tests.filter(t=>t.status==='in_progress').length, color: 'text-blue-600' },
            { label: 'Completed', count: tests.filter(t=>t.status==='completed').length, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        {/* Test List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FlaskConical className="h-10 w-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No lab tests</p>
            </div>
          ) : filtered.map(test => (
            <div key={test.id}
              onClick={() => { if (test.status !== 'completed') { setSelected(test); setResultForm({ results: test.results || '', reference_range: '', is_abnormal: test.is_abnormal || false, notes: '' }); } }}
              className={`p-4 flex items-center gap-4 ${test.status !== 'completed' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}
                ${selected?.id === test.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-l-cyan-500' : ''}`}
            >
              <div className={`p-2.5 rounded-xl ${test.status === 'completed' ? 'bg-emerald-100' : test.status === 'in_progress' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                <FlaskConical className={`h-5 w-5 ${test.status === 'completed' ? 'text-emerald-600' : test.status === 'in_progress' ? 'text-blue-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{test.test_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[test.priority || 'normal']}`}>
                    {test.priority}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Patient: <span className="font-medium text-slate-700 dark:text-slate-300">{test.patient_name}</span>
                  {test.doctor_name && ` · Dr. ${test.doctor_name}`}
                </div>
                {test.test_type && <div className="text-xs text-slate-400">{test.test_type}</div>}
                {test.results && (
                  <div className={`text-xs mt-1 ${test.is_abnormal ? 'text-red-600' : 'text-emerald-600'}`}>
                    {test.is_abnormal ? '⚠️ Abnormal' : '✓ Normal'} — {test.results.slice(0,60)}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                  ${test.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    test.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {test.status.replace('_',' ')}
                </span>
                {test.status === 'pending' && (
                  <button onClick={e => { e.stopPropagation(); markInProgress(test.id); }}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Result Entry Form */}
        {selected ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Enter Test Result</h3>
            <div className="text-sm text-slate-500 mb-4">
              {selected.test_name} — {selected.patient_name}
            </div>
            <form onSubmit={submitResult} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Results *</label>
                <textarea
                  required
                  rows={5}
                  value={resultForm.results}
                  onChange={e => setResultForm(f => ({...f, results: e.target.value}))}
                  placeholder="Enter test results in detail..."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Reference Range</label>
                <input value={resultForm.reference_range}
                  onChange={e => setResultForm(f => ({...f, reference_range: e.target.value}))}
                  placeholder="e.g. 4.5–11.0 × 10⁹/L"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer"
                onClick={() => setResultForm(f => ({...f, is_abnormal: !f.is_abnormal}))}>
                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition
                  ${resultForm.is_abnormal ? 'border-red-500 bg-red-500' : 'border-slate-300'}`}>
                  {resultForm.is_abnormal && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as Abnormal</div>
                  <div className="text-xs text-slate-400">Check if results are outside normal range</div>
                </div>
                {resultForm.is_abnormal && <AlertCircle className="h-4 w-4 text-red-500 ml-auto" />}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Technician Notes</label>
                <input value={resultForm.notes}
                  onChange={e => setResultForm(f => ({...f, notes: e.target.value}))}
                  placeholder="Any additional comments..."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[300px]">
            <div className="text-center text-slate-400">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click a pending test to enter results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabTechDashboard;
