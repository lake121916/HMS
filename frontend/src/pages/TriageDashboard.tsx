/**
 * Triage Nurse Dashboard & Workflow
 * 3-Stage Lifecycle:
 * 1. Waiting for Triage (waiting_for_triage)
 * 2. In Triage (in_triage)
 * 3. Completed (triage_completed / routing completed)
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Activity, Heart, Thermometer, Wind,
  Weight, Ruler, RefreshCw, AlertTriangle,
  UserCheck, Stethoscope, Clock, CheckCircle2,
  ChevronRight, Eye, Search, FileText
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
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  priority?: string;
  chief_complaint?: string;
  preliminary_observations?: string;
  department_name?: string;
  doctor_name?: string;
  status: string;
  created_at: string;
  assessed_at?: string;
}

interface Department { id: number; name: string; }
interface Doctor { id: number; first_name: string; last_name: string; specialization: string; is_available: boolean; department_id?: number; }

const priorityConfig: Record<string, { label: string; color: string; badge: string; icon: string }> = {
  emergency: { label: 'Emergency', color: 'bg-red-500 text-white', badge: 'bg-red-100 text-red-700 border-red-200', icon: '🚨' },
  urgent:    { label: 'Urgent',    color: 'bg-amber-500 text-white', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⚠️' },
  normal:    { label: 'Normal',    color: 'bg-emerald-500 text-white', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✓' },
};

const TriageDashboard: React.FC = () => {
  const [stageTab, setStageTab] = useState<'waiting' | 'in_triage' | 'completed'>('waiting');
  const [encounters, setEncounters] = useState<TriageEncounter[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selected, setSelected] = useState<TriageEncounter | null>(null);
  const [viewDetailModal, setViewDetailModal] = useState<TriageEncounter | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [vitals, setVitals] = useState({
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    chief_complaint: '',
    preliminary_observations: '',
    priority: 'normal' as 'emergency' | 'urgent' | 'normal',
    department_id: '',
    doctor_id: ''
  });

  useEffect(() => {
    fetchAllData();
  }, [stageTab]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [qRes, deptsRes, docsRes] = await Promise.all([
        api.get(`/encounters/triage-queue?status=all`),
        api.get('/admin/departments').catch(() => api.get('/services/departments')).catch(() => ({ data: { data: { departments: [] } } })),
        api.get('/doctors').catch(() => ({ data: { data: { doctors: [] } } })),
      ]);

      const raw = qRes.data?.data?.encounters || [];
      setEncounters(raw);

      const depts = deptsRes.data?.data?.departments || deptsRes.data?.departments || [];
      setDepartments(depts);

      const docs = docsRes.data?.data?.doctors || docsRes.data?.doctors || [];
      setDoctors(docs);
    } catch {
      showToast('error', 'Failed to load triage workflow data');
    } finally {
      setLoading(false);
    }
  };

  // Stage Categories
  const waitingList = encounters.filter(e => e.status === 'waiting_for_triage');
  const inTriageList = encounters.filter(e => e.status === 'in_triage');
  const completedList = encounters.filter(e => ['triage_completed', 'department_assigned', 'doctor_assigned', 'waiting_for_doctor', 'in_consultation'].includes(e.status));

  const filteredCurrentList = (
    stageTab === 'waiting' ? waitingList :
    stageTab === 'in_triage' ? inTriageList : completedList
  ).filter(e =>
    `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    e.encounter_number?.toLowerCase().includes(search.toLowerCase()) ||
    (e.chief_complaint && e.chief_complaint.toLowerCase().includes(search.toLowerCase()))
  );

  // Transition: Start Triage Assessment
  const handleStartTriage = async (enc: TriageEncounter) => {
    try {
      await api.post(`/encounters/${enc.id}/start-triage`);
      showToast('success', `Triage started for ${enc.first_name} ${enc.last_name}`);
      selectPatient({ ...enc, status: 'in_triage' });
      setStageTab('in_triage');
      fetchAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to start triage');
    }
  };

  const selectPatient = (enc: TriageEncounter) => {
    setSelected(enc);
    setVitals({
      temperature: enc.temperature ? String(enc.temperature) : '',
      blood_pressure_systolic: enc.blood_pressure_systolic ? String(enc.blood_pressure_systolic) : '',
      blood_pressure_diastolic: enc.blood_pressure_diastolic ? String(enc.blood_pressure_diastolic) : '',
      heart_rate: enc.heart_rate ? String(enc.heart_rate) : '',
      respiratory_rate: enc.respiratory_rate ? String(enc.respiratory_rate) : '',
      oxygen_saturation: enc.oxygen_saturation ? String(enc.oxygen_saturation) : '',
      weight: enc.weight ? String(enc.weight) : '',
      height: enc.height ? String(enc.height) : '',
      chief_complaint: enc.chief_complaint || '',
      preliminary_observations: enc.preliminary_observations || '',
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
      await api.post(`/encounters/${selected.id}/triage`, {
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

      showToast('success', `Triage completed for ${selected.first_name} ${selected.last_name}`);
      setSelected(null);
      setStageTab('completed');
      fetchAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save triage assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-400/30">
            <Activity className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              Clinical Triage & Assessment Station
              <span className="text-xs font-bold bg-red-500/20 text-red-300 border border-red-400/30 px-2 py-0.5 rounded-full">
                3-Stage Flow
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Rapid patient prioritization, vital signs recording, chief complaint assessment, and department routing.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAllData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Station
        </button>
      </div>

      {/* ── 3-Stage Progress Counters & Tabs Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Stage 1: Waiting */}
        <button
          onClick={() => setStageTab('waiting')}
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
            stageTab === 'waiting'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stageTab === 'waiting' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Stage 1</p>
              <h3 className="font-extrabold text-sm">Waiting for Triage</h3>
            </div>
          </div>
          <span className={`text-xl font-black px-3 py-1 rounded-xl ${stageTab === 'waiting' ? 'bg-white/20' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>
            {waitingList.length}
          </span>
        </button>

        {/* Stage 2: In Triage */}
        <button
          onClick={() => setStageTab('in_triage')}
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
            stageTab === 'in_triage'
              ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stageTab === 'in_triage' ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Stage 2</p>
              <h3 className="font-extrabold text-sm">In Triage Assessment</h3>
            </div>
          </div>
          <span className={`text-xl font-black px-3 py-1 rounded-xl ${stageTab === 'in_triage' ? 'bg-white/20' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'}`}>
            {inTriageList.length}
          </span>
        </button>

        {/* Stage 3: Completed */}
        <button
          onClick={() => setStageTab('completed')}
          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
            stageTab === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${stageTab === 'completed' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Stage 3</p>
              <h3 className="font-extrabold text-sm">Completed Triage</h3>
            </div>
          </div>
          <span className={`text-xl font-black px-3 py-1 rounded-xl ${stageTab === 'completed' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
            {completedList.length}
          </span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search stage patients by name, encounter number, or complaint..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ── STAGE 1: WAITING FOR TRIAGE ── */}
      {stageTab === 'waiting' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Patients Awaiting Initial Assessment ({filteredCurrentList.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading queue...</div>
          ) : filteredCurrentList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30 text-amber-500" />
              <p className="font-semibold text-gray-600 dark:text-gray-300">No patients currently waiting for triage</p>
              <p className="text-xs mt-1">New registered patients from reception will appear here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCurrentList.map(enc => {
                const age = calculateAge(enc.date_of_birth);
                return (
                  <div
                    key={enc.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {enc.encounter_number}
                          </span>
                          <h3 className="text-base font-extrabold text-gray-900 dark:text-white mt-1">
                            {enc.first_name} {enc.last_name}
                          </h3>
                        </div>
                        <span className="text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Waiting
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750 p-2.5 rounded-xl">
                        <div>Age/Gender: <strong className="text-gray-800 dark:text-gray-200">{age != null ? `${age}y` : '—'} / {enc.gender || '—'}</strong></div>
                        <div>Blood Type: <strong className="text-gray-800 dark:text-gray-200">{enc.blood_type || '—'}</strong></div>
                        <div className="col-span-2">Allergies: <strong className="text-red-600 dark:text-red-400">{enc.allergies || 'None reported'}</strong></div>
                      </div>

                      {enc.chief_complaint && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic">
                          "{enc.chief_complaint}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartTriage(enc)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <Stethoscope className="w-4 h-4" /> Start Triage Assessment
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── STAGE 2: IN TRIAGE ASSESSMENT ── */}
      {stageTab === 'in_triage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Patient List */}
          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" /> Active Assessments ({filteredCurrentList.length})
            </h2>

            {filteredCurrentList.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-400 text-xs">
                No active assessments in progress. Select a patient from "Waiting for Triage" to start.
              </div>
            ) : (
              filteredCurrentList.map(enc => (
                <div
                  key={enc.id}
                  onClick={() => selectPatient(enc)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selected?.id === enc.id
                      ? 'bg-blue-50/80 dark:bg-blue-900/30 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                      : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{enc.first_name} {enc.last_name}</h4>
                      <span className="text-xs text-gray-500">{enc.encounter_number}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Assessment Form Area */}
          <div className="lg:col-span-2">
            {selected ? (
              <form onSubmit={submitTriage} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Active Patient Assessment</span>
                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">{selected.first_name} {selected.last_name}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-200">
                    {selected.encounter_number}
                  </span>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Triage Priority Level *</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['emergency', 'urgent', 'normal'] as const).map(p => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setVitals({ ...vitals, priority: p })}
                        className={`py-3 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                          vitals.priority === p
                            ? priorityConfig[p].color + ' shadow-md ring-2 ring-offset-1'
                            : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span>{priorityConfig[p].icon}</span>
                        <span>{priorityConfig[p].label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vitals Recording Grid */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vital Signs Recording</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-red-500" /> Temp (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.temperature}
                        onChange={e => setVitals({ ...vitals, temperature: e.target.value })}
                        placeholder="37.0"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-pink-500" /> BP Systolic
                      </label>
                      <input
                        type="number"
                        value={vitals.blood_pressure_systolic}
                        onChange={e => setVitals({ ...vitals, blood_pressure_systolic: e.target.value })}
                        placeholder="120"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" /> BP Diastolic
                      </label>
                      <input
                        type="number"
                        value={vitals.blood_pressure_diastolic}
                        onChange={e => setVitals({ ...vitals, blood_pressure_diastolic: e.target.value })}
                        placeholder="80"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-500" /> Heart Rate (bpm)
                      </label>
                      <input
                        type="number"
                        value={vitals.heart_rate}
                        onChange={e => setVitals({ ...vitals, heart_rate: e.target.value })}
                        placeholder="72"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-blue-500" /> Resp Rate (/min)
                      </label>
                      <input
                        type="number"
                        value={vitals.respiratory_rate}
                        onChange={e => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                        placeholder="16"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-teal-500" /> SpO2 (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.oxygen_saturation}
                        onChange={e => setVitals({ ...vitals, oxygen_saturation: e.target.value })}
                        placeholder="98"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Weight className="w-3.5 h-3.5 text-indigo-500" /> Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.weight}
                        onChange={e => setVitals({ ...vitals, weight: e.target.value })}
                        placeholder="70"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                        <Ruler className="w-3.5 h-3.5 text-purple-500" /> Height (cm)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitals.height}
                        onChange={e => setVitals({ ...vitals, height: e.target.value })}
                        placeholder="175"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Complaints & Observations */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Chief Complaint *</label>
                    <textarea
                      required
                      rows={2}
                      value={vitals.chief_complaint}
                      onChange={e => setVitals({ ...vitals, chief_complaint: e.target.value })}
                      placeholder="Primary symptom or reason for visit..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Preliminary Observations & Notes</label>
                    <textarea
                      rows={2}
                      value={vitals.preliminary_observations}
                      onChange={e => setVitals({ ...vitals, preliminary_observations: e.target.value })}
                      placeholder="Nurse clinical notes..."
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Direct Department & Doctor Assignment */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Assign Department</label>
                    <select
                      value={vitals.department_id}
                      onChange={e => setVitals({ ...vitals, department_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Assign Doctor</label>
                    <select
                      value={vitals.doctor_id}
                      onChange={e => setVitals({ ...vitals, doctor_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">-- Select Doctor --</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name} ({d.specialization})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Complete Triage Assessment
                </button>
              </form>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400">
                <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
                <p className="font-semibold text-gray-600 dark:text-gray-300">Select a patient to record triage vitals</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STAGE 3: COMPLETED TRIAGE ── */}
      {stageTab === 'completed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Finalized Triage Assessments ({filteredCurrentList.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading completed assessments...</div>
          ) : filteredCurrentList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
              <p className="font-semibold text-gray-600 dark:text-gray-300">No completed triage assessments found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3.5">Patient / Encounter</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th className="px-5 py-3.5">Vitals Readout</th>
                      <th className="px-5 py-3.5">Assigned Routing</th>
                      <th className="px-5 py-3.5">Assessed Time</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                    {filteredCurrentList.map(enc => {
                      const pConf = priorityConfig[enc.priority || 'normal'] || priorityConfig.normal;
                      return (
                        <tr key={enc.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-5 py-4">
                            <div className="font-bold text-sm text-gray-900 dark:text-white">{enc.first_name} {enc.last_name}</div>
                            <div className="text-gray-400 font-mono text-[11px]">{enc.encounter_number}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${pConf.badge}`}>
                              {pConf.icon} {pConf.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              {enc.temperature && <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded font-mono">T: {enc.temperature}°C</span>}
                              {enc.blood_pressure_systolic && <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded font-mono">BP: {enc.blood_pressure_systolic}/{enc.blood_pressure_diastolic}</span>}
                              {enc.heart_rate && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-mono">HR: {enc.heart_rate}</span>}
                              {enc.oxygen_saturation && <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-mono">SpO2: {enc.oxygen_saturation}%</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {enc.doctor_name ? (
                              <div className="font-semibold text-blue-600 dark:text-blue-400">{enc.doctor_name}</div>
                            ) : enc.department_name ? (
                              <div className="font-semibold text-purple-600 dark:text-purple-400">{enc.department_name}</div>
                            ) : (
                              <span className="text-gray-400 italic">General Queue</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-gray-400 whitespace-nowrap">
                            {enc.assessed_at ? new Date(enc.assessed_at).toLocaleString() : new Date(enc.created_at).toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setViewDetailModal(enc)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 font-bold rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {viewDetailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Triage Record: {viewDetailModal.first_name} {viewDetailModal.last_name}
              </h3>
              <button onClick={() => setViewDetailModal(null)} className="text-gray-400 hover:text-gray-600">
                <FileText className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-750 p-3 rounded-xl">
                <div>Encounter: <strong className="font-mono text-blue-600">{viewDetailModal.encounter_number}</strong></div>
                <div>Priority: <strong className="uppercase">{viewDetailModal.priority || 'normal'}</strong></div>
                <div>Chief Complaint: <strong className="block text-gray-800 dark:text-gray-200 mt-1">{viewDetailModal.chief_complaint || 'N/A'}</strong></div>
                <div>Notes: <strong className="block text-gray-800 dark:text-gray-200 mt-1">{viewDetailModal.preliminary_observations || 'N/A'}</strong></div>
              </div>

              <div className="p-3 border border-gray-100 dark:border-gray-700 rounded-xl space-y-2">
                <span className="font-bold text-gray-500 uppercase tracking-wider block">Recorded Vitals</span>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>Temp: <strong>{viewDetailModal.temperature ?? '—'}°C</strong></div>
                  <div>BP: <strong>{viewDetailModal.blood_pressure_systolic ?? '—'}/{viewDetailModal.blood_pressure_diastolic ?? '—'}</strong></div>
                  <div>HR: <strong>{viewDetailModal.heart_rate ?? '—'} bpm</strong></div>
                  <div>Resp: <strong>{viewDetailModal.respiratory_rate ?? '—'}/min</strong></div>
                  <div>SpO2: <strong>{viewDetailModal.oxygen_saturation ?? '—'}%</strong></div>
                  <div>Weight: <strong>{viewDetailModal.weight ?? '—'} kg</strong></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewDetailModal(null)}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriageDashboard;
