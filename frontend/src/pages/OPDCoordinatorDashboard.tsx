/**
 * OPD Coordinator Dashboard
 * Alem Ketema Enat Hospital Management System
 *
 * Dedicated dashboard for the Outpatient Department (OPD) Coordinator & Administrators.
 * Core Workflow Stage:
 * RECEPTION → TRIAGE → VITALS → [OPD COORDINATOR] → DEPARTMENT ASSIGNMENT → DOCTOR ASSIGNMENT → DOCTOR CONSULTATION
 *
 * Responsibilities:
 * 1. View patients who completed triage and vitals
 * 2. Review patient demographic and clinical information
 * 3. Review triage priority (Emergency, Urgent, Routine)
 * 4. Review clinical complaints and preliminary nurse notes
 * 5. Review complete recorded vitals (BP, HR, Temp, RR, SpO2, Weight, Height, Pain score, BMI, Abnormal flags)
 * 6. Select appropriate clinical department
 * 7. View doctors assigned to that department with real-time availability and workload
 * 8. Assign patient to selected doctor with coordinator ID and timestamp
 * 9. Dispatch patient directly to the doctor's consultation queue
 */

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Building2, UserCheck, RefreshCw, Users, Stethoscope,
  Activity, AlertTriangle, CheckCircle2, Search,
  Heart, Thermometer, Wind, AlertOctagon
} from 'lucide-react';

interface CoordinatorEncounter {
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
  medical_history?: string;
  status: string;
  priority?: string;
  chief_complaint?: string;
  preliminary_observations?: string;
  assessed_at?: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  pain_score?: number;
  bmi?: number;
  abnormal_flags?: string;
  vitals_recorded_at?: string;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  department_id?: number;
  department_name?: string;
  is_available: boolean;
  phone?: string;
  active_workload?: number;
}

const priorityConfig: Record<string, { label: string; badge: string; color: string; border: string; icon: string }> = {
  emergency: {
    label: 'Emergency (P1)',
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800',
    color: 'text-red-600',
    border: 'border-l-red-500',
    icon: '🚨'
  },
  urgent: {
    label: 'Urgent (P2)',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    color: 'text-amber-600',
    border: 'border-l-amber-500',
    icon: '⚠️'
  },
  normal: {
    label: 'Routine (P3)',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    color: 'text-emerald-600',
    border: 'border-l-emerald-500',
    icon: '✓'
  },
  routine: {
    label: 'Routine (P3)',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    color: 'text-emerald-600',
    border: 'border-l-emerald-500',
    icon: '✓'
  }
};

const OPDCoordinatorDashboard: React.FC = () => {
  const [queue, setQueue] = useState<CoordinatorEncounter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<CoordinatorEncounter | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [form, setForm] = useState({
    department_id: '',
    doctor_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [queueRes, deptsRes, docsRes] = await Promise.all([
        api.get('/encounters/opd-coordinator-queue').catch(() => api.get('/encounters/assignment-queue')),
        api.get('/departments').catch(() => api.get('/admin/departments')).catch(() => ({ data: { data: { departments: [] } } })),
        api.get('/doctors').catch(() => ({ data: { data: { doctors: [] } } })),
      ]);

      const encountersList = queueRes.data?.data?.encounters || [];
      setQueue(encountersList);

      const deptList = deptsRes.data?.data?.departments || deptsRes.data?.departments || [];
      setDepartments(deptList);

      const docList = docsRes.data?.data?.doctors || docsRes.data?.doctors || [];
      setDoctors(docList);
    } catch (err: any) {
      showToast('error', 'Failed to synchronize OPD coordinator queue');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    return `${years} yrs`;
  };

  const getBmiCategory = (bmi?: number) => {
    if (!bmi) return null;
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' };
    if (bmi < 25) return { label: 'Normal weight', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40' };
    return { label: 'Obese', color: 'text-red-600 bg-red-50 dark:bg-red-950/40' };
  };

  const getPainCategory = (pain?: number) => {
    if (pain === undefined || pain === null) return null;
    if (pain === 0) return { label: 'No Pain (0/10)', color: 'text-emerald-600' };
    if (pain <= 3) return { label: `Mild (${pain}/10)`, color: 'text-blue-600' };
    if (pain <= 6) return { label: `Moderate (${pain}/10)`, color: 'text-amber-600' };
    return { label: `Severe (${pain}/10)`, color: 'text-red-600 font-bold' };
  };

  // Filtered doctors by selected department
  const filteredDoctors = form.department_id
    ? doctors.filter(doc => !doc.department_id || String(doc.department_id) === String(form.department_id))
    : doctors;

  // Filter queue by search
  const filteredQueue = queue.filter(enc => {
    const q = search.toLowerCase();
    const fullName = `${enc.first_name} ${enc.last_name}`.toLowerCase();
    const num = (enc.encounter_number || '').toLowerCase();
    const complaint = (enc.chief_complaint || '').toLowerCase();
    return fullName.includes(q) || num.includes(q) || complaint.includes(q);
  });

  // Handle coordinator assignment submission
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !form.department_id || !form.doctor_id) {
      showToast('error', 'Please select both Department and Doctor');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/encounters/${selected.id}/coordinator-assign`, {
        department_id: parseInt(form.department_id),
        doctor_id: parseInt(form.doctor_id),
        notes: form.notes
      });

      const selectedDoc = doctors.find(d => String(d.id) === String(form.doctor_id));
      const doctorDisplayName = selectedDoc ? `Dr. ${selectedDoc.first_name} ${selectedDoc.last_name}` : 'Assigned Doctor';

      showToast('success', res.data?.message || `${selected.first_name} ${selected.last_name} dispatched to ${doctorDisplayName}'s consultation queue!`);

      // Remove assigned encounter from queue and reset selection
      setQueue(prev => prev.filter(item => item.id !== selected.id));
      setSelected(null);
      setForm({ department_id: '', doctor_id: '', notes: '' });

      // Refresh data
      fetchInitialData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Assignment failed. Please check doctor availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 transition-all
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                Outpatient Department Workflow
              </span>
              <span className="bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 px-2.5 py-0.5 rounded-full text-xs font-medium">
                Stage 4: Coordinator Assignment
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              OPD Coordinator Dashboard
            </h1>
            <p className="text-indigo-100 text-sm mt-1 max-w-2xl">
              Alem Ketema Enat Hospital — Review verified triage & vitals assessments, allocate clinical departments, and dispatch patients to on-duty physicians.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchInitialData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-semibold text-white transition backdrop-blur-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-2xl font-black">{queue.length}</div>
            <div className="text-xs text-indigo-100 font-medium">Ready for Assignment</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-2xl font-black text-red-200">
              {queue.filter(e => String(e.priority).toLowerCase() === 'emergency').length}
            </div>
            <div className="text-xs text-indigo-100 font-medium">Emergency Priority</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-2xl font-black text-amber-200">
              {queue.filter(e => String(e.priority).toLowerCase() === 'urgent').length}
            </div>
            <div className="text-xs text-indigo-100 font-medium">Urgent Priority</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="text-2xl font-black text-emerald-200">
              {doctors.filter(d => d.is_available).length}
            </div>
            <div className="text-xs text-indigo-100 font-medium">Doctors Available</div>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Waiting Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Vitals Completed Queue ({queue.length})
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient name, MRN, complaint..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Patients Scroll List */}
            <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto pr-1">
              {filteredQueue.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No patients currently waiting for assignment
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Patients will appear here automatically once Vitals Nurse completes recording.
                  </p>
                </div>
              ) : (
                filteredQueue.map(enc => {
                  const pConf = priorityConfig[String(enc.priority || 'normal').toLowerCase()] || priorityConfig.normal;
                  const isSelected = selected?.id === enc.id;
                  const bmiCat = getBmiCategory(enc.bmi);
                  const painCat = getPainCategory(enc.pain_score);

                  return (
                    <div
                      key={enc.id}
                      onClick={() => {
                        setSelected(enc);
                        setForm({ department_id: '', doctor_id: '', notes: '' });
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-left
                        ${isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }
                        ${pConf.border} border-l-4`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {enc.first_name} {enc.last_name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {enc.gender} · {calculateAge(enc.date_of_birth)} · <span className="font-mono">{enc.encounter_number}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pConf.badge}`}>
                          {pConf.label}
                        </span>
                      </div>

                      {/* Chief Complaint */}
                      {enc.chief_complaint && (
                        <div className="mt-2 text-xs text-slate-700 dark:text-slate-300 line-clamp-1">
                          <strong className="text-slate-500 dark:text-slate-400 font-semibold">Complaint:</strong> {enc.chief_complaint}
                        </div>
                      )}

                      {/* Vitals Summary Strip */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                        {enc.blood_pressure_systolic && enc.blood_pressure_diastolic && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-md font-medium text-slate-700 dark:text-slate-300">
                            BP: {enc.blood_pressure_systolic}/{enc.blood_pressure_diastolic}
                          </span>
                        )}
                        {enc.heart_rate && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-md font-medium text-slate-700 dark:text-slate-300">
                            HR: {enc.heart_rate}
                          </span>
                        )}
                        {enc.temperature && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-md font-medium text-slate-700 dark:text-slate-300">
                            {enc.temperature}°C
                          </span>
                        )}
                        {enc.oxygen_saturation && (
                          <span className={`px-2 py-0.5 rounded-md font-medium ${enc.oxygen_saturation < 95 ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'}`}>
                            SpO₂: {enc.oxygen_saturation}%
                          </span>
                        )}
                        {painCat && (
                          <span className={`px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-900 ${painCat.color}`}>
                            Pain: {enc.pain_score}/10
                          </span>
                        )}
                        {bmiCat && enc.bmi && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${bmiCat.color}`}>
                            BMI: {enc.bmi}
                          </span>
                        )}
                      </div>

                      {/* Abnormal Flags Notice */}
                      {enc.abnormal_flags && (
                        <div className="mt-2 text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{enc.abnormal_flags}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Review & Assignment Workstation (7 cols) */}
        <div className="lg:col-span-7">
          {selected ? (
            <div className="space-y-5">
              {/* Detailed Clinical Review Card */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                      {selected.first_name[0]}{selected.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                        {selected.first_name} {selected.last_name}
                      </h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {selected.gender} · {calculateAge(selected.date_of_birth)} ({selected.date_of_birth || 'DOB unknown'}) · Phone: {selected.phone || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                      {selected.encounter_number}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Priority: <strong className="text-indigo-600 capitalize">{selected.priority || 'Routine'}</strong>
                    </div>
                  </div>
                </div>

                {/* Chief Complaint & Nurse Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                      Chief Complaint & Symptoms
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 font-medium leading-relaxed">
                      {selected.chief_complaint || 'No complaint details recorded'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                      Nurse Observations & Triage Notes
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 font-medium leading-relaxed">
                      {selected.preliminary_observations || 'No additional nurse observations provided'}
                    </p>
                  </div>
                </div>

                {/* Complete Vitals Grid */}
                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-600" /> Recorded Patient Vitals
                    </span>
                    {selected.vitals_recorded_at && (
                      <span className="text-[10px] text-slate-400 font-normal">
                        Recorded {new Date(selected.vitals_recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-500" /> Blood Pressure
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.blood_pressure_systolic && selected.blood_pressure_diastolic
                          ? `${selected.blood_pressure_systolic}/${selected.blood_pressure_diastolic} mmHg`
                          : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-rose-500" /> Heart Rate (Pulse)
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.heart_rate ? `${selected.heart_rate} bpm` : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-orange-500" /> Temperature
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.temperature ? `${selected.temperature}°C` : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Wind className="w-3 h-3 text-blue-500" /> SpO₂ (Oxygen)
                      </div>
                      <div className={`text-sm font-bold mt-0.5 ${selected.oxygen_saturation && selected.oxygen_saturation < 95 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                        {selected.oxygen_saturation ? `${selected.oxygen_saturation}%` : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Respiratory Rate</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.respiratory_rate ? `${selected.respiratory_rate}/min` : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Weight & Height</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.weight ? `${selected.weight} kg` : '—'} · {selected.height ? `${selected.height} cm` : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Pain Score (0–10)</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.pain_score !== undefined && selected.pain_score !== null
                          ? `${selected.pain_score} / 10`
                          : '—'}
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] text-slate-400">Body Mass Index (BMI)</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                        {selected.bmi ? `${selected.bmi} kg/m²` : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Abnormal Flags Alert Box */}
                  {selected.abnormal_flags && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 shrink-0 text-red-600" />
                      <div>
                        <strong>Abnormal Clinical Findings:</strong> {selected.abnormal_flags}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Form Card */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Select Department & Doctor Assignment
                </h3>

                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  {/* Department Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Clinical Department *
                    </label>
                    <select
                      required
                      value={form.department_id}
                      onChange={e => setForm(f => ({ ...f, department_id: e.target.value, doctor_id: '' }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Target Clinical Department --</option>
                      {departments.map(dept => {
                        const docsInDept = doctors.filter(d => String(d.department_id) === String(dept.id));
                        const availableCount = docsInDept.filter(d => d.is_available).length;
                        return (
                          <option key={dept.id} value={dept.id}>
                            {dept.name} ({availableCount} available / {docsInDept.length} registered)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Doctor Select with Workload Information */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Attending Physician / Doctor *
                    </label>
                    <select
                      required
                      disabled={!form.department_id}
                      value={form.doctor_id}
                      onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="">
                        {!form.department_id
                          ? '-- Please select a department first --'
                          : filteredDoctors.length === 0
                            ? '-- No doctors registered in this department --'
                            : '-- Select Doctor for Consultation --'}
                      </option>
                      {filteredDoctors.map(doc => {
                        const statusTag = doc.is_available ? '🟢 Available' : '🔴 Busy / Off Duty';
                        return (
                          <option key={doc.id} value={doc.id} disabled={!doc.is_available}>
                            Dr. {doc.first_name} {doc.last_name} — {doc.specialization} [{statusTag}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Coordinator Assignment Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Coordinator Instructions / Assignment Notes
                    </label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Add any specific clinical routing instructions, priority handover notes, or special accommodation requirements..."
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Submission Action */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                    >
                      Cancel Selection
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !form.department_id || !form.doctor_id}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg transition"
                    >
                      <UserCheck className="w-5 h-5" />
                      {submitting ? 'Dispatching...' : 'Assign to Doctor & Send to Consultation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-16 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <Stethoscope className="w-16 h-16 text-indigo-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                No Patient Selected for Assignment
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Select a patient from the waiting queue on the left to review their triage complaint, vitals, pain score, and calculate department allocation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OPDCoordinatorDashboard;
