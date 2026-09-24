/**
 * Pharmacy Dashboard
 * - View pending/undispensed prescriptions
 * - Dispense medications
 * - Update stock
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Pill, RefreshCw, CheckCircle2, Search } from 'lucide-react';

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  is_dispensed: boolean;
  workflow_status: string;
  prescribed_date: string;
  encounter_id?: number;
}

const PharmacyDashboard: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending'|'dispensed'|'all'>('pending');

  useEffect(() => { fetchPrescriptions(); }, []);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const params = filter === 'pending' ? '?is_dispensed=false' :
                     filter === 'dispensed' ? '?is_dispensed=true' : '';
      const res = await api.get(`/prescriptions${params}`);
      setPrescriptions(res.data.data.prescriptions || []);
    } catch { showToast('error', 'Failed to load prescriptions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPrescriptions(); }, [filter]);

  const dispense = async (id: number, patientName: string) => {
    setSubmitting(id);
    try {
      await api.put(`/prescriptions/${id}`, { is_dispensed: true });
      showToast('success', `Medication dispensed for ${patientName}!`);
      fetchPrescriptions();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Dispense failed');
    } finally { setSubmitting(null); }
  };

  const filtered = prescriptions.filter(p => {
    const q = search.toLowerCase();
    return (
      p.patient_name?.toLowerCase().includes(q) ||
      p.medication_name?.toLowerCase().includes(q) ||
      p.doctor_name?.toLowerCase().includes(q)
    );
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
          <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 uppercase tracking-wider">
            Pharmacy
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Pharmacy Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">View and dispense prescriptions</p>
        </div>
        <button onClick={fetchPrescriptions} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-sm text-slate-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats + Controls */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
          {(['pending','dispensed','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize
                ${filter === f ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, medication..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div className="ml-auto flex gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-amber-600">{prescriptions.filter(p => !p.is_dispensed).length}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-600">{prescriptions.filter(p => p.is_dispensed).length}</div>
            <div className="text-xs text-slate-500">Dispensed</div>
          </div>
        </div>
      </div>

      {/* Prescription List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Pill className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No prescriptions</p>
          </div>
        ) : filtered.map(rx => (
          <div key={rx.id} className="p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl ${rx.is_dispensed ? 'bg-emerald-100' : 'bg-violet-100'}`}>
              <Pill className={`h-5 w-5 ${rx.is_dispensed ? 'text-emerald-600' : 'text-violet-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">{rx.medication_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${rx.is_dispensed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {rx.is_dispensed ? '✓ Dispensed' : '⏳ Pending'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Patient: <span className="font-medium text-slate-700 dark:text-slate-300">{rx.patient_name}</span>
                {' · '}Dr. {rx.doctor_name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {rx.dosage} · {rx.frequency} · {rx.duration}
                {rx.instructions && ` · ${rx.instructions}`}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                Prescribed: {new Date(rx.prescribed_date).toLocaleString()}
              </div>
            </div>
            {!rx.is_dispensed && (
              <button
                onClick={() => dispense(rx.id, rx.patient_name)}
                disabled={submitting === rx.id}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition whitespace-nowrap"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting === rx.id ? 'Dispensing...' : 'Dispense'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PharmacyDashboard;
