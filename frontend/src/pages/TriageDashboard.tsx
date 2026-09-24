/**
 * Triage Nurse Dashboard
 * - View patients waiting for triage (sorted by arrival + urgency)
 * - Record vitals + chief complaint + priority
 * - Complete triage assessment → TRIAGE_COMPLETED
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Activity, Heart, Thermometer, Wind,
  Weight, Ruler, ClipboardCheck, RefreshCw, AlertTriangle,
  Building2, UserCheck, Stethoscope
} from 'lucide-react';

interface TriageEncounter {
  id: number;
  encounter_number: string;
  patient_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  blood_type?: string;
  allergies?: string;
  priority?: string;
  chief_complaint?: string;
  status: string;
  created_at: string;
}

interface Department { id: number; name: string; }
interface Doctor { id: number; first_name: string; last_name: string; specialization: string; is_available: boolean; department_id?: number; }

const priorityConfig = {
  emergency: { label: 'Emergency', color: 'bg-red-500 text-white', icon: '🚨' },
  urgent:    { label: 'Urgent',    color: 'bg-orange-400 text-white', icon: '⚠️' },
  normal:    { label: 'Normal',    color: 'bg-green-100 text-green-700', icon: '✓' },
};

const TriageDashboard: React.FC = () => {
  const [queue, setQueue] = useState<TriageEncounter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<TriageEncounter | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success'|'error'; msg: string } | null>(null);

  const [vitals, setVitals] = useState({
    temperature: '', blood_pressure_systolic: '', blood_pressure_diastolic: '',
    heart_rate: '', respiratory_rate: '', oxygen_saturation: '',
    weight: '', height: '',
    chief_complaint: '', preliminary_observations: '', priority: 'normal' as 'emergency'|'urgent'|'normal',
    department_id: '', doctor_id: ''
  });

  useEffect(() => { fetchAllData(); }, []);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [qRes, deptsRes, docsRes] = await Promise.all([
        api.get('/encounters/triage-queue'),
        api.get('/admin/departments').catch(() => api.get('/services/departments')).catch(() => ({ data: { data: { departments: [] } } })),
        api.get('/doctors').catch(() => ({ data: { data: { doctors: [] } } })),
      ]);
      setQueue(qRes.data.data.encounters || []);
      const depts = deptsRes.data?.data?.departments || deptsRes.data?.departments || [];
      setDepartments(depts);
      setDoctors(docsRes.data?.data?.doctors || docsRes.data?.doctors || []);
    } catch { showToast('error', 'Failed to load triage queue data'); }
    finally { setLoading(false); }
  };

  const selectPatient = (enc: TriageEncounter) => {
    setSelected(enc);
    setVitals({
      temperature: '', blood_pressure_systolic: '', blood_pressure_diastolic: '',
      heart_rate: '', respiratory_rate: '', oxygen_saturation: '',
      weight: '', height: '',
      chief_complaint: enc.chief_complaint || '',
      preliminary_observations: '',
      priority: (enc.priority as any) || 'normal',
      department_id: '',
      doctor_id: ''
    });
  };

  const submitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/encounters/${selected.id}/triage`, {
        temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
        blood_pressure_systolic: vitals.blood_pressure_systolic ? parseInt(vitals.blood_pressure_systolic) : null,
        blood_pressure_diastolic: vitals.blood_pressure_diastolic ? parseInt(vitals.blood_pressure_diastolic) : null,
        heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
        respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : null,
        oxygen_saturation: vitals.oxygen_saturation ? parseFloat(vitals.oxygen_saturation) : null,
        weight: vitals.weight ? parseFloat(vitals.weight) : null,
        height: vitals.height ? parseFloat(vitals.height) : null,
        chief_complaint: vitals.chief_complaint,
        preliminary_observations: vitals.preliminary_observations,
        priority: vitals.priority,
        department_id: vitals.department_id ? parseInt(vitals.department_id) : null,
        doctor_id: vitals.doctor_id ? parseInt(vitals.doctor_id) : null,
      });
      showToast('success', res.data.message || `Triage completed for ${selected.first_name} ${selected.last_name}`);
      setSelected(null);
      fetchAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Triage submission failed');
    } finally { setSubmitting(false); }
  };

  const calcAge = (dob?: string) => {
    if (!dob) return 'N/A';
    return `${Math.floor((Date.now() - new Date(dob).getTime()) / 3.154e10)} yrs`;
  };

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
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 uppercase tracking-wider">
            Triage Station
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Triage Nurse Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Assess and prioritize incoming patients</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-sm">
            {Object.entries(priorityConfig).map(([k, v]) => (
              <span key={k} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${v.color}`}>
                {v.icon} {v.label}
              </span>
            ))}
          </div>
          <button onClick={fetchAllData} disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Queue */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Triage Queue
              </h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {queue.length} waiting
              </span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
            {queue.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No patients waiting for triage</p>
              </div>
            ) : queue.map(enc => (
              <div
                key={enc.id}
                onClick={() => selectPatient(enc)}
                className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition
                  ${selected?.id === enc.id
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-l-orange-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-white">
                      {enc.first_name} {enc.last_name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      #{enc.id} · {enc.gender} · {calcAge(enc.date_of_birth)}
                    </div>
                    {enc.chief_complaint && (
                      <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                        📋 {enc.chief_complaint}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    priorityConfig[(enc.priority as keyof typeof priorityConfig) || 'normal']?.color || 'bg-slate-100 text-slate-600'
                  }`}>
                    {priorityConfig[(enc.priority as keyof typeof priorityConfig) || 'normal']?.label || 'Normal'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Arrived: {new Date(enc.created_at).toLocaleTimeString()}
                  {enc.encounter_number && ` · ${enc.encounter_number}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Triage Form */}
        {selected ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            {/* Patient info banner */}
            <div className="mb-5 flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-900 dark:to-slate-900 rounded-xl border border-orange-200 dark:border-orange-800">
              <div className="h-12 w-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                {selected.first_name[0]}{selected.last_name[0]}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 dark:text-white">{selected.first_name} {selected.last_name}</div>
                <div className="text-sm text-slate-500">
                  {selected.gender} · {calcAge(selected.date_of_birth)} · Blood: {selected.blood_type || 'N/A'}
                </div>
                {selected.allergies && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Allergies: {selected.allergies}
                  </div>
                )}
              </div>
              <div>
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${priorityConfig[(vitals.priority as keyof typeof priorityConfig)].color}`}>
                  {priorityConfig[vitals.priority as keyof typeof priorityConfig].icon} {priorityConfig[vitals.priority as keyof typeof priorityConfig].label}
                </span>
              </div>
            </div>

            <form onSubmit={submitTriage}>
              {/* Priority */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Triage Priority *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['emergency', 'urgent', 'normal'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setVitals(v => ({ ...v, priority: p }))}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition
                        ${vitals.priority === p
                          ? p === 'emergency' ? 'border-red-500 bg-red-500 text-white'
                            : p === 'urgent' ? 'border-orange-400 bg-orange-400 text-white'
                            : 'border-green-500 bg-green-500 text-white'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      {priorityConfig[p].icon} {priorityConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Chief Complaint *
                </label>
                <textarea
                  required
                  rows={3}
                  value={vitals.chief_complaint}
                  onChange={e => setVitals(v => ({ ...v, chief_complaint: e.target.value }))}
                  placeholder="Patient's main complaint in their own words..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Vital Signs */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Vital Signs
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, placeholder: '36.5' },
                    { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', icon: Heart, placeholder: '80' },
                    { key: 'oxygen_saturation', label: 'O₂ Saturation', unit: '%', icon: Activity, placeholder: '98' },
                    { key: 'respiratory_rate', label: 'Resp. Rate', unit: '/min', icon: Wind, placeholder: '16' },
                    { key: 'weight', label: 'Weight', unit: 'kg', icon: Weight, placeholder: '70' },
                    { key: 'height', label: 'Height', unit: 'cm', icon: Ruler, placeholder: '170' },
                  ].map(f => (
                    <div key={f.key} className="relative">
                      <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                      <div className="relative">
                        <f.icon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="number"
                          step="0.1"
                          placeholder={f.placeholder}
                          value={(vitals as any)[f.key]}
                          onChange={e => setVitals(v => ({ ...v, [f.key]: e.target.value }))}
                          className="w-full pl-8 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                        <span className="absolute right-2 top-2.5 text-xs text-slate-400">{f.unit}</span>
                      </div>
                    </div>
                  ))}

                  {/* Blood Pressure — two inputs */}
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Blood Pressure</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="120"
                        value={vitals.blood_pressure_systolic}
                        onChange={e => setVitals(v => ({ ...v, blood_pressure_systolic: e.target.value }))}
                        className="flex-1 px-2 py-2 rounded-l-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <span className="text-slate-400 text-sm px-1">/</span>
                      <input
                        type="number"
                        placeholder="80"
                        value={vitals.blood_pressure_diastolic}
                        onChange={e => setVitals(v => ({ ...v, blood_pressure_diastolic: e.target.value }))}
                        className="flex-1 px-2 py-2 rounded-r-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <span className="ml-1 text-xs text-slate-400">mmHg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Department & Doctor Assignment (Direct Route) */}
              <div className="mb-5 p-4 bg-orange-50/50 dark:bg-slate-900/50 rounded-xl border border-orange-200 dark:border-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 text-sm mb-3">
                  <Stethoscope className="h-4 w-4 text-orange-500" />
                  Direct Consultation Routing (Department & Doctor Assignment)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Department Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" /> Target Department
                    </label>
                    <select
                      value={vitals.department_id}
                      onChange={e => setVitals(v => ({ ...v, department_id: e.target.value, doctor_id: '' }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                      <option value="">-- Send to Assignment Queue --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Doctor Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Attending Doctor
                    </label>
                    <select
                      value={vitals.doctor_id}
                      onChange={e => {
                        const docId = e.target.value;
                        const docObj = doctors.find(d => String(d.id) === String(docId));
                        setVitals(v => ({
                          ...v,
                          doctor_id: docId,
                          department_id: docObj?.department_id ? String(docObj.department_id) : v.department_id
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    >
                      <option value="">-- Direct Doctor Assignment --</option>
                      {doctors
                        .filter(d => !vitals.department_id || !d.department_id || String(d.department_id) === String(vitals.department_id))
                        .map(doc => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.first_name} {doc.last_name} ({doc.specialization || 'General'}) {doc.is_available ? '✓ Available' : '❌ Busy'}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Assigning a doctor immediately places the patient into their consultation queue (`WAITING_FOR_DOCTOR`) and triggers standard consultation auto-billing.
                </p>
              </div>

              {/* Preliminary Observations */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Preliminary Observations
                </label>
                <textarea
                  rows={2}
                  value={vitals.preliminary_observations}
                  onChange={e => setVitals(v => ({ ...v, preliminary_observations: e.target.value }))}
                  placeholder="Any additional clinical observations..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setSelected(null)}
                  className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !vitals.chief_complaint}
                  className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Complete Triage Assessment'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[400px]">
            <div className="text-center text-slate-400">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a patient from the queue to begin triage assessment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriageDashboard;
