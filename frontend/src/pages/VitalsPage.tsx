/**
 * Vitals Management & Clinical Measurement Station
 * Alem Ketema Enat Hospital Management System
 *
 * Core OPD Stage 3:
 * RECEPTION → TRIAGE → [VITALS NURSE] → OPD COORDINATOR → DEPARTMENT ASSIGNMENT → DOCTOR ASSIGNMENT → DOCTOR CONSULTATION
 *
 * Responsibilities:
 * - Receive patients who completed triage (WAITING_FOR_VITALS)
 * - Record BP, Temp, Pulse, RR, SpO2, Weight, Height, Pain Score (0–10)
 * - Live Calculate BMI with category badge
 * - Highlight abnormal measurements
 * - On submission: automatically forward patient to the OPD Coordinator queue (WAITING_FOR_OPD_COORDINATOR)
 */

import React, { useState, useEffect } from 'react';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  Plus, Search, Edit, Trash2, X, Activity,
  AlertTriangle, CheckCircle2, Clock, ChevronRight, RefreshCw, QrCode
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVitals, useCreateVital, useUpdateVital, useDeleteVital } from '../hooks/useApi';
import api from '../services/api';
import WristbandScannerModal from '../components/WristbandScannerModal';

interface Vital {
  id: number;
  patient_id: number;
  patient_name: string;
  nurse_name: string;
  recorded_at: string;
  temperature: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  weight: number;
  height: number;
  blood_glucose: number;
  pain_score?: number;
  bmi?: number;
  abnormal_flags?: string;
  notes: string;
}

interface VitalsQueueEncounter {
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
  status: string;
  priority?: string;
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
  pain_score?: number;
  bmi?: number;
  abnormal_flags?: string;
  created_at: string;
}

const inp = 'w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white';
const lbl = 'block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1';

const priorityBadges: Record<string, { label: string; badge: string }> = {
  emergency: { label: '🚨 Emergency', badge: 'bg-red-100 text-red-700 border-red-200' },
  urgent:    { label: '⚠️ Urgent',    badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  normal:    { label: '✓ Routine',    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  routine:   { label: '✓ Routine',    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const VitalsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vital | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<VitalsQueueEncounter | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [vitalsQueue, setVitalsQueue] = useState<VitalsQueueEncounter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [form, setForm] = useState({
    patient_id: '',
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    heart_rate: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    height: '',
    pain_score: '0',
    blood_glucose: '',
    notes: ''
  });

  // TanStack Query for History
  const { data: vitalsData, isLoading: historyLoading, refetch: refetchHistory } = useVitals();
  const vitals = (vitalsData ?? []) as Vital[];
  const createVital = useCreateVital();
  const updateVital = useUpdateVital(editing?.id ?? 0);
  const deleteVital = useDeleteVital();

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const [showScannerModal, setShowScannerModal] = useState(false);

  const handlePatientScanVerified = (result: any) => {
    setShowScannerModal(false);
    const patient = result?.patient;
    if (!patient) return;
    const match = vitalsQueue.find(e => e.patient_id === patient.id || (
      e.first_name?.toLowerCase() === patient.first_name?.toLowerCase() &&
      e.last_name?.toLowerCase() === patient.last_name?.toLowerCase()
    ));
    if (match) {
      void openQueueRecord(match);
      showToast('success', `Found vitals queue encounter for ${patient.first_name} ${patient.last_name}`);
    } else {
      setSelectedEncounter(null);
      setEditing(null);
      setForm({
        patient_id: String(patient.id),
        temperature: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        heart_rate: '',
        respiratory_rate: '',
        oxygen_saturation: '',
        weight: '',
        height: '',
        pain_score: '0',
        blood_glucose: '',
        notes: ''
      });
      setShowModal(true);
      showToast('success', `Identified patient: ${patient.first_name} ${patient.last_name} (${patient.mrn || 'ID #' + patient.id})`);
    }
  };

  useEffect(() => {
    fetchVitalsQueue();
  }, []);

  const fetchVitalsQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await api.get('/encounters/vitals-queue');
      setVitalsQueue(res.data?.data?.encounters || []);
    } catch {
      // Non-fatal queue fetch
    } finally {
      setQueueLoading(false);
    }
  };

  // Live BMI calculation
  const liveBmi = React.useMemo(() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    if (!isNaN(w) && !isNaN(h) && h > 0) {
      return +(w / Math.pow(h / 100, 2)).toFixed(2);
    }
    return null;
  }, [form.weight, form.height]);

  // Live abnormal flags
  const liveAbnormalFlags = React.useMemo(() => {
    const flags: string[] = [];
    const sys = parseInt(form.blood_pressure_systolic, 10);
    const dia = parseInt(form.blood_pressure_diastolic, 10);
    const temp = parseFloat(form.temperature);
    const hr = parseInt(form.heart_rate, 10);
    const rr = parseInt(form.respiratory_rate, 10);
    const spo2 = parseFloat(form.oxygen_saturation);
    const pain = parseInt(form.pain_score, 10);

    if (!isNaN(sys) && (sys >= 140 || sys < 90)) flags.push(`Systolic BP: ${sys} mmHg`);
    if (!isNaN(dia) && (dia >= 90 || dia < 60)) flags.push(`Diastolic BP: ${dia} mmHg`);
    if (!isNaN(temp) && (temp >= 38.0 || temp < 36.0)) flags.push(`Temp: ${temp}°C`);
    if (!isNaN(hr) && (hr > 100 || hr < 60)) flags.push(`Pulse: ${hr} bpm`);
    if (!isNaN(rr) && (rr > 20 || rr < 12)) flags.push(`RR: ${rr}/min`);
    if (!isNaN(spo2) && spo2 < 95) flags.push(`SpO₂: ${spo2}%`);
    if (!isNaN(pain) && pain >= 7) flags.push(`Severe Pain: ${pain}/10`);

    return flags;
  }, [form]);

  const openQueueRecord = async (enc: VitalsQueueEncounter) => {
    setSelectedEncounter(enc);
    setEditing(null);
    setForm({
      patient_id: String(enc.patient_id),
      temperature: enc.temperature ? String(enc.temperature) : '',
      blood_pressure_systolic: enc.blood_pressure_systolic ? String(enc.blood_pressure_systolic) : '',
      blood_pressure_diastolic: enc.blood_pressure_diastolic ? String(enc.blood_pressure_diastolic) : '',
      heart_rate: enc.heart_rate ? String(enc.heart_rate) : '',
      respiratory_rate: enc.respiratory_rate ? String(enc.respiratory_rate) : '',
      oxygen_saturation: enc.oxygen_saturation ? String(enc.oxygen_saturation) : '',
      weight: enc.weight ? String(enc.weight) : '',
      height: enc.height ? String(enc.height) : '',
      pain_score: enc.pain_score !== undefined && enc.pain_score !== null ? String(enc.pain_score) : '0',
      blood_glucose: '',
      notes: ''
    });

    // Notify backend that nurse started recording vitals
    try {
      await api.post(`/encounters/${enc.id}/start-vitals`);
    } catch {}

    setShowModal(true);
  };

  const openAddStandalone = () => {
    setSelectedEncounter(null);
    setEditing(null);
    setForm({
      patient_id: '',
      temperature: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      heart_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: '',
      pain_score: '0',
      blood_glucose: '',
      notes: ''
    });
    setShowModal(true);
  };

  const openEdit = (v: Vital) => {
    setSelectedEncounter(null);
    setEditing(v);
    setForm({
      patient_id: String(v.patient_id),
      temperature: String(v.temperature || ''),
      blood_pressure_systolic: String(v.blood_pressure_systolic || ''),
      blood_pressure_diastolic: String(v.blood_pressure_diastolic || ''),
      heart_rate: String(v.heart_rate || ''),
      respiratory_rate: String(v.respiratory_rate || ''),
      oxygen_saturation: String(v.oxygen_saturation || ''),
      weight: String(v.weight || ''),
      height: String(v.height || ''),
      pain_score: String(v.pain_score ?? '0'),
      blood_glucose: String(v.blood_glucose || ''),
      notes: v.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedEncounter) {
        // Core OPD Workflow: Record Vitals & Dispatch to OPD Coordinator
        const res = await api.post(`/encounters/${selectedEncounter.id}/vitals`, {
          temperature: form.temperature ? parseFloat(form.temperature) : null,
          blood_pressure_systolic: form.blood_pressure_systolic ? parseInt(form.blood_pressure_systolic) : null,
          blood_pressure_diastolic: form.blood_pressure_diastolic ? parseInt(form.blood_pressure_diastolic) : null,
          heart_rate: form.heart_rate ? parseInt(form.heart_rate) : null,
          respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate) : null,
          oxygen_saturation: form.oxygen_saturation ? parseFloat(form.oxygen_saturation) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          height: form.height ? parseFloat(form.height) : null,
          pain_score: parseInt(form.pain_score, 10),
          blood_glucose: form.blood_glucose ? parseFloat(form.blood_glucose) : null,
          notes: form.notes
        });

        showToast('success', res.data?.message || `Vitals recorded! Patient forwarded to OPD Coordinator queue.`);
        setShowModal(false);
        fetchVitalsQueue();
        refetchHistory();
      } else if (editing) {
        // Edit existing vital record
        const payload: Record<string, unknown> = { ...form };
        ['temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
         'respiratory_rate', 'oxygen_saturation', 'weight', 'height', 'blood_glucose', 'patient_id', 'pain_score']
          .forEach(k => {
            if (payload[k] !== '') payload[k] = parseFloat(payload[k] as string);
            else delete payload[k];
          });
        await updateVital.mutateAsync(payload);
        showToast('success', 'Vitals record updated');
        setShowModal(false);
      } else {
        // Create standalone vital
        const payload: Record<string, unknown> = { ...form };
        ['temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
         'respiratory_rate', 'oxygen_saturation', 'weight', 'height', 'blood_glucose', 'patient_id', 'pain_score']
          .forEach(k => {
            if (payload[k] !== '') payload[k] = parseFloat(payload[k] as string);
            else delete payload[k];
          });
        await createVital.mutateAsync(payload);
        showToast('success', 'Vitals record created');
        setShowModal(false);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save vitals');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this vital record?')) return;
    try {
      await deleteVital.mutateAsync(id);
      showToast('success', 'Record deleted');
    } catch (e: any) {
      showToast('error', e.response?.data?.message || 'Failed to delete');
    }
  };

  const filteredHistory = vitals.filter(v =>
    v.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.nurse_name?.toLowerCase().includes(search.toLowerCase())
  );

  const calculateAge = (dob?: string) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    return `${Math.floor(diff / (365.25 * 24 * 3600 * 1000))} yrs`;
  };

  const isPatient = user?.role === 'patient';

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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
            Clinical Nursing Station · Stage 3
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" /> Patient Vitals & Clinical Measurements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Measure and record physiological vitals, pain score, and BMI. On completion, automatically forward to OPD Coordinator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR</span>
          </button>

          <button
            onClick={fetchVitalsQueue}
            disabled={queueLoading}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${queueLoading ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>

          {can('vitals:create') && (
            <button
              onClick={openAddStandalone}
              className="flex items-center px-3.5 py-2 sm:px-4 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold gap-1.5 sm:gap-2 shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Manual Record
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Awaiting Vitals Queue
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-extrabold">
            {vitalsQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Vitals History & Records
        </button>
      </div>

      {/* TAB 1: Awaiting Vitals Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3.5 rounded-2xl text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <div>
              <strong>OPD Protocol:</strong> Patients listed below completed initial triage and require comprehensive vitals, pain evaluation, and BMI calculation.
            </div>
            <span className="font-semibold text-[11px] bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded-md">
              Auto-forwards to OPD Coordinator
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vitalsQueue.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Vitals Queue is Clear</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  All triaged patients have had their vitals recorded and are now in the OPD Coordinator queue for doctor assignment.
                </p>
              </div>
            ) : (
              vitalsQueue.map(enc => {
                const pTag = priorityBadges[String(enc.priority || 'normal').toLowerCase()] || priorityBadges.normal;
                return (
                  <div
                    key={enc.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {enc.first_name} {enc.last_name}
                          </h3>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {enc.gender} · {calculateAge(enc.date_of_birth)} · <span className="font-mono">{enc.encounter_number}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pTag.badge}`}>
                          {pTag.label}
                        </span>
                      </div>

                      {/* Complaint */}
                      {enc.chief_complaint && (
                        <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                          <strong className="text-slate-500 dark:text-slate-400 font-semibold block text-[10px] uppercase">
                            Chief Complaint
                          </strong>
                          {enc.chief_complaint}
                        </div>
                      )}

                      {/* Preliminary observations */}
                      {enc.preliminary_observations && (
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          📋 {enc.preliminary_observations}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Waiting for Vitals
                      </span>

                      <button
                        onClick={() => openQueueRecord(enc)}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Record Vitals <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Vitals History & Records */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {!isPatient && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vitals records by patient or nurse name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {[isPatient ? 'Recorded By' : 'Patient', 'Date/Time', 'Temp', 'BP', 'Pulse', 'SpO₂', 'RR', 'Weight / Ht', 'Pain', 'BMI', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {historyLoading ? (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">Loading vitals...</td></tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">No vitals records found</td></tr>
                  ) : filteredHistory.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition">
                      <td className="px-3 py-3">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {isPatient ? (v.nurse_name || 'Staff') : v.patient_name}
                        </div>
                        {!isPatient && v.nurse_name && <div className="text-[10px] text-slate-400">by {v.nurse_name}</div>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {new Date(v.recorded_at).toLocaleDateString()} {new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {v.temperature ? `${v.temperature}°C` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {v.blood_pressure_systolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {v.heart_rate ? `${v.heart_rate} bpm` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold">
                        {v.oxygen_saturation ? (
                          <span className={`px-2 py-0.5 rounded-full ${v.oxygen_saturation < 95 ? 'bg-red-100 text-red-700' : 'text-slate-800 dark:text-slate-200'}`}>
                            {v.oxygen_saturation}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {v.respiratory_rate ? `${v.respiratory_rate}/min` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {v.weight ? `${v.weight}kg` : '—'} {v.height ? `/ ${v.height}cm` : ''}
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-amber-600">
                        {v.pain_score !== undefined && v.pain_score !== null ? `${v.pain_score}/10` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-emerald-600">
                        {v.bmi ? `${v.bmi}` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {can('vitals:edit') && (
                            <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {can('vitals:delete') && (
                            <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record / Edit Vitals Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2.5 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {selectedEncounter ? 'Stage 3: Vitals Assessment' : 'Clinical Recording'}
                </span>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {selectedEncounter
                    ? `Record Vitals for ${selectedEncounter.first_name} ${selectedEncounter.last_name}`
                    : editing
                      ? 'Edit Vitals Record'
                      : 'Record Patient Vitals'}
                </h2>
                {selectedEncounter && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    MRN: {selectedEncounter.encounter_number} · Complaint: {selectedEncounter.chief_complaint || 'None'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              {!selectedEncounter && !editing && (
                <div>
                  <label className={lbl}>Patient ID *</label>
                  <input
                    type="number"
                    required
                    value={form.patient_id}
                    onChange={e => setForm({ ...form, patient_id: e.target.value })}
                    className={inp}
                    placeholder="Enter patient numeric ID"
                  />
                </div>
              )}

              {/* Blood Pressure & Heart Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={form.blood_pressure_systolic}
                    onChange={e => setForm({ ...form, blood_pressure_systolic: e.target.value })}
                    className={inp}
                    placeholder="e.g. 120"
                  />
                </div>

                <div>
                  <label className={lbl}>Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={form.blood_pressure_diastolic}
                    onChange={e => setForm({ ...form, blood_pressure_diastolic: e.target.value })}
                    className={inp}
                    placeholder="e.g. 80"
                  />
                </div>

                <div>
                  <label className={lbl}>Heart Rate (Pulse bpm)</label>
                  <input
                    type="number"
                    value={form.heart_rate}
                    onChange={e => setForm({ ...form, heart_rate: e.target.value })}
                    className={inp}
                    placeholder="e.g. 72"
                  />
                </div>
              </div>

              {/* Temp, SpO2, RR */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.temperature}
                    onChange={e => setForm({ ...form, temperature: e.target.value })}
                    className={inp}
                    placeholder="e.g. 36.8"
                  />
                </div>

                <div>
                  <label className={lbl}>O₂ Saturation SpO₂ (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    max="100"
                    value={form.oxygen_saturation}
                    onChange={e => setForm({ ...form, oxygen_saturation: e.target.value })}
                    className={inp}
                    placeholder="e.g. 98"
                  />
                </div>

                <div>
                  <label className={lbl}>Respiratory Rate (/min)</label>
                  <input
                    type="number"
                    value={form.respiratory_rate}
                    onChange={e => setForm({ ...form, respiratory_rate: e.target.value })}
                    className={inp}
                    placeholder="e.g. 16"
                  />
                </div>
              </div>

              {/* Weight, Height, BMI */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.weight}
                    onChange={e => setForm({ ...form, weight: e.target.value })}
                    className={inp}
                    placeholder="e.g. 70"
                  />
                </div>

                <div>
                  <label className={lbl}>Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.height}
                    onChange={e => setForm({ ...form, height: e.target.value })}
                    className={inp}
                    placeholder="e.g. 175"
                  />
                </div>

                <div>
                  <label className={lbl}>Calculated BMI</label>
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold flex items-center justify-between">
                    <span>{liveBmi ? `${liveBmi} kg/m²` : '—'}</span>
                    {liveBmi && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        liveBmi < 18.5 ? 'bg-amber-100 text-amber-700' :
                        liveBmi < 25 ? 'bg-emerald-100 text-emerald-700' :
                        liveBmi < 30 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {liveBmi < 18.5 ? 'Underweight' : liveBmi < 25 ? 'Normal' : liveBmi < 30 ? 'Overweight' : 'Obese'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pain Score Slider / Selector (0 - 10) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={lbl}>Pain Score (Visual Scale 0–10) *</label>
                  <span className={`text-xs font-extrabold ${
                    parseInt(form.pain_score, 10) === 0 ? 'text-emerald-600' :
                    parseInt(form.pain_score, 10) <= 3 ? 'text-blue-600' :
                    parseInt(form.pain_score, 10) <= 6 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {parseInt(form.pain_score, 10) === 0 ? '0 — No Pain' :
                     parseInt(form.pain_score, 10) <= 3 ? `${form.pain_score} — Mild Pain` :
                     parseInt(form.pain_score, 10) <= 6 ? `${form.pain_score} — Moderate Pain` :
                     `${form.pain_score} — Severe Pain`}
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm({ ...form, pain_score: String(val) })}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                        form.pain_score === String(val)
                          ? val === 0
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : val <= 3
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : val <= 6
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Abnormal Clinical Flags Warning */}
              {liveAbnormalFlags.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <strong>Abnormal Measurements Detected:</strong>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {liveAbnormalFlags.map((flag, idx) => (
                        <span key={idx} className="bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={lbl}>Clinical Observations & Vitals Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className={inp}
                  placeholder="Record any abnormal findings, patient posture, or special instructions..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  <CheckCircle2 className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                  {submitting
                    ? 'Saving...'
                    : selectedEncounter
                      ? 'Complete Vitals & Forward to OPD Coordinator'
                      : editing
                        ? 'Update Vitals'
                        : 'Save Vitals'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Patient QR Scanner Modal ── */}
      {showScannerModal && (
        <WristbandScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onPatientVerified={handlePatientScanVerified}
          continueLabel="Record Patient Vitals"
        />
      )}
    </div>
  );
};

export default VitalsPage;
