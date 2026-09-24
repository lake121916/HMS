/**
 * Admin Assignment Dashboard
 * - View patients with completed triage
 * - Review triage info (vitals, priority, complaint)
 * - Assign department + doctor
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Building2, UserCheck, RefreshCw,
  Users
} from 'lucide-react';

interface AssignmentEncounter {
  id: number;
  encounter_number: string;
  patient_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  priority: string;
  chief_complaint?: string;
  preliminary_observations?: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  created_at: string;
}

interface Department { id: number; name: string; }
interface Doctor { id: number; first_name: string; last_name: string; specialization: string; is_available: boolean; department_id?: number; }

const priorityConfig: Record<string, { color: string; label: string }> = {
  emergency: { color: 'bg-red-100 text-red-700 border-red-200', label: '🚨 Emergency' },
  urgent:    { color: 'bg-orange-100 text-orange-700 border-orange-200', label: '⚠️ Urgent' },
  normal:    { color: 'bg-green-100 text-green-700 border-green-200', label: '✓ Normal' },
};

const AssignmentDashboard: React.FC = () => {
  const [queue, setQueue] = useState<AssignmentEncounter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<AssignmentEncounter | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null);
  const [form, setForm] = useState({ department_id: '', doctor_id: '', notes: '' });

  useEffect(() => { fetchAll(); }, []);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [queueRes, deptsRes, docsRes] = await Promise.all([
        api.get('/encounters/assignment-queue'),
        api.get('/admin/departments').catch(() => ({ data: { data: { departments: [] } } })),
        api.get('/doctors'),
      ]);
      setQueue(queueRes.data.data.encounters || []);
      const depts = queueRes.data?.data?.departments
        || deptsRes.data?.data?.departments
        || [];
      setDepartments(depts.length ? depts : await api.get('/admin/departments').then(r => r.data?.data?.departments || []).catch(() => []));
      setDoctors(docsRes.data.data.doctors || []);
    } catch { showToast('error', 'Failed to load data'); }
    finally { setLoading(false); }
  };

  // Load departments separately if needed
  useEffect(() => {
    api.get('/admin/departments').then(r => setDepartments(r.data?.data?.departments || [])).catch(() => {});
  }, []);

  const filteredDoctors = form.department_id
    ? doctors.filter(doc => !doc.department_id || String(doc.department_id) === String(form.department_id))
    : doctors;

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !form.department_id || !form.doctor_id) return;
    setSubmitting(true);
    try {
      await api.post(`/encounters/${selected.id}/assign`, {
        department_id: parseInt(form.department_id),
        doctor_id: parseInt(form.doctor_id),
        notes: form.notes
      });
      showToast('success', `${selected.first_name} ${selected.last_name} assigned successfully!`);
      setSelected(null);
      setForm({ department_id: '', doctor_id: '', notes: '' });
      fetchAll();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Assignment failed');
    } finally { setSubmitting(false); }
  };

  const calcAge = (dob?: string) => dob
    ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 3.154e10)} yrs`
    : 'N/A';

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            Admin — Workflow
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Department & Doctor Assignment</h1>
          <p className="text-sm text-slate-500 mt-1">Review triage assessments and assign clinical resources</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition text-sm text-slate-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Assignment', value: queue.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Emergency Priority', value: queue.filter(e => e.priority === 'emergency').length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Available Doctors', value: doctors.filter(d => d.is_available).length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-200`}>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Queue List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-500" />
              Triage Completed — Ready for Assignment
            </h2>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-350px)] divide-y divide-slate-100 dark:divide-slate-700">
            {queue.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No patients awaiting assignment</p>
              </div>
            ) : queue.map(enc => (
              <div
                key={enc.id}
                onClick={() => { setSelected(enc); setForm({ department_id: '', doctor_id: '', notes: '' }); }}
                className={`p-4 cursor-pointer transition
                  ${selected?.id === enc.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                    {enc.first_name} {enc.last_name}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityConfig[enc.priority || 'normal']?.color}`}>
                    {priorityConfig[enc.priority || 'normal']?.label}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {enc.gender} · {calcAge(enc.date_of_birth)} · #{enc.id}
                </div>
                {enc.chief_complaint && (
                  <div className="text-xs text-slate-500 mt-1 line-clamp-1">📋 {enc.chief_complaint}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Form */}
        {selected ? (
          <div className="space-y-4">
            {/* Patient Info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Patient & Triage Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Patient', value: `${selected.first_name} ${selected.last_name}` },
                  { label: 'Age/Gender', value: `${calcAge(selected.date_of_birth)} · ${selected.gender}` },
                  { label: 'Priority', value: priorityConfig[selected.priority || 'normal']?.label },
                  ...(selected.temperature ? [{ label: 'Temp', value: `${selected.temperature}°C` }] : []),
                  ...(selected.heart_rate ? [{ label: 'HR', value: `${selected.heart_rate} bpm` }] : []),
                  ...(selected.blood_pressure_systolic ? [{ label: 'BP', value: `${selected.blood_pressure_systolic}/${selected.blood_pressure_diastolic} mmHg` }] : []),
                  ...(selected.oxygen_saturation ? [{ label: 'SpO₂', value: `${selected.oxygen_saturation}%` }] : []),
                  ...(selected.weight ? [{ label: 'Weight', value: `${selected.weight} kg` }] : []),
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>

              {selected.chief_complaint && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mb-3">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Chief Complaint</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{selected.chief_complaint}</div>
                </div>
              )}

              {selected.preliminary_observations && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Preliminary Observations</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{selected.preliminary_observations}</div>
                </div>
              )}
            </div>

            {/* Assignment Form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                Assign Department & Doctor
              </h3>
              <form onSubmit={assign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={form.department_id}
                    onChange={e => setForm(f => ({ ...f, department_id: e.target.value, doctor_id: '' }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Select department...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Doctor *
                  </label>
                  <select
                    required
                    value={form.doctor_id}
                    onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                    disabled={!form.department_id}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50"
                  >
                    <option value="">Select doctor...</option>
                    {filteredDoctors.map(d => (
                      <option key={d.id} value={d.id} disabled={!d.is_available}>
                        Dr. {d.first_name} {d.last_name} — {d.specialization}
                        {!d.is_available ? ' (Unavailable)' : ''}
                      </option>
                    ))}
                  </select>
                  {filteredDoctors.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">No doctors available for this department</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assignment Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any special instructions or notes..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setSelected(null)}
                    className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting || !form.department_id || !form.doctor_id}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                    <UserCheck className="h-4 w-4" />
                    {submitting ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[400px]">
            <div className="text-center text-slate-400">
              <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a patient from the queue to assign a department and doctor</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDashboard;
