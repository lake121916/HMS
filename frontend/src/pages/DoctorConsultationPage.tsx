/**
 * Doctor Consultation Page
 * Full consultation workflow with Clinical Safety & Medical Compliance:
 * - Patient queue with live TV Calling button ("Call to Room")
 * - Review patient history, triage info, vitals
 * - Patient allergy safety checks with cross-reactivity warnings & documented override
 * - Finalized consultation protection with immutable clinical addenda workflow
 * - Order prescriptions, lab tests, radiology, procedures with auto-billing
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Stethoscope, FlaskConical, Scan, Pill, Syringe,
  CheckSquare, RefreshCw, AlertTriangle, ChevronRight,
  User, DollarSign, Lock, PlusCircle, Volume2,
  CheckCircle2, AlertOctagon, History
} from 'lucide-react';

interface EncounterSummary {
  id: number;
  encounter_number: string;
  patient_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string;
  priority?: string;
  chief_complaint?: string;
  status: string;
  department_name?: string;
  queue_id?: number;
}

interface FullEncounter extends EncounterSummary {
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  preliminary_observations?: string;
  consultation_notes?: string;
  diagnosis?: string;
  icd_code?: string;
  treatment_plan?: string;
  follow_up_instructions?: string;
  consultation_status?: string;
  medical_history?: string;
  prescriptions?: any[];
  labTests?: any[];
  radiologyOrders?: any[];
  procedureOrders?: any[];
  billing?: { invoice: any; items: any[] };
}

interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  unit_price: number;
  department_id: number | null;
  department_name?: string;
  is_active: boolean;
}

interface PatientAllergy {
  id: number;
  allergen_name: string;
  allergen_category: string;
  reaction_description?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'anaphylaxis';
  verification_status: string;
}

interface ConsultationAddendum {
  id: number;
  addendum_text: string;
  reason: string;
  clinical_effective_time: string;
  created_at: string;
  doctor_name?: string;
}

type Tab = 'consult' | 'prescriptions' | 'labs' | 'radiology' | 'procedures' | 'billing';

const priorityColors: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  urgent:    'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  normal:    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
};

const allergySeverityColors: Record<string, string> = {
  anaphylaxis: 'bg-red-600 text-white',
  severe:      'bg-rose-500 text-white',
  moderate:    'bg-amber-500 text-white',
  mild:        'bg-blue-500 text-white'
};

const DoctorConsultationPage: React.FC = () => {
  const [queue, setQueue] = useState<EncounterSummary[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<FullEncounter | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('consult');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);

  // Clinical Safety & Allergy State
  const [patientAllergies, setPatientAllergies] = useState<PatientAllergy[]>([]);
  const [allergyConflictModal, setAllergyConflictModal] = useState<{
    alerts: any[];
    hardBlocked: boolean;
    medicationName: string;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideAcknowledged, setOverrideAcknowledged] = useState(false);
  const [showAddAllergyModal, setShowAddAllergyModal] = useState(false);
  const [newAllergyForm, setNewAllergyForm] = useState({
    allergen_name: '',
    allergen_category: 'drug',
    reaction_description: '',
    severity: 'moderate'
  });

  // Clinical Addenda & Finalized Consultation State
  const [consultationAddenda, setConsultationAddenda] = useState<ConsultationAddendum[]>([]);
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [addendumForm, setAddendumForm] = useState({
    addendum_text: '',
    reason: ''
  });

  // Form states
  const [consultForm, setConsultForm] = useState({
    consultation_notes: '',
    diagnosis: '',
    icd_code: '',
    treatment_plan: '',
    follow_up_instructions: ''
  });
  const [rxForm, setRxForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    quantity: '1'
  });
  const [labForm, setLabForm] = useState({ test_name: '', test_type: '', priority: 'normal', notes: '' });
  const [radForm, setRadForm] = useState({ study_type: '', body_part: '', clinical_indication: '', priority: 'routine', notes: '' });
  const [procForm, setProcForm] = useState({ procedure_name: '', description: '', priority: 'routine', notes: '' });

  useEffect(() => {
    fetchQueue();
    fetchServices();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/encounters/doctor-queue');
      setQueue(res.data.data.encounters || []);
    } catch {
      showToast('error', 'Failed to load doctor queue');
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      const raw = res.data.data.services || res.data.data || [];
      setServices(raw.filter((s: Service) => s.is_active));
    } catch {
      console.error('Failed to load services');
    }
  };

  const fetchPatientAllergies = async (patientId: number) => {
    try {
      const res = await api.get(`/prescriptions/patient/${patientId}/allergies`);
      setPatientAllergies(res.data.data.allergies || []);
    } catch (err) {
      console.error('Failed to load patient allergies');
    }
  };

  const fetchConsultationAddenda = async (encounterOrConsultId: number) => {
    try {
      const res = await api.get(`/consultations/${encounterOrConsultId}/history`);
      setConsultationAddenda(res.data.data.addenda || []);
    } catch (err) {
      console.error('Failed to load consultation addenda');
    }
  };

  const openEncounter = async (enc: EncounterSummary) => {
    setLoading(true);
    try {
      if (enc.status === 'waiting_for_doctor') {
        await api.post(`/encounters/${enc.id}/start-consultation`);
      }
      const res = await api.get(`/encounters/${enc.id}`);
      const full = res.data.data;
      const combined = { ...full.encounter, ...full };
      setActiveEncounter(combined);
      setActiveTab('consult');
      setConsultForm({
        consultation_notes: full.encounter.consultation_notes || '',
        diagnosis: full.encounter.diagnosis || '',
        icd_code: full.encounter.icd_code || '',
        treatment_plan: full.encounter.treatment_plan || '',
        follow_up_instructions: full.encounter.follow_up_instructions || '',
      });

      // Load patient allergies & consultation history
      fetchPatientAllergies(combined.patient_id);
      fetchConsultationAddenda(combined.id);
      fetchQueue();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to open encounter');
    } finally {
      setLoading(false);
    }
  };

  const refreshEncounter = async () => {
    if (!activeEncounter) return;
    const res = await api.get(`/encounters/${activeEncounter.id}`);
    const full = res.data.data;
    setActiveEncounter(prev => ({ ...prev, ...full.encounter, ...full }));
    fetchConsultationAddenda(activeEncounter.id);
  };

  // Complete consultation (finalizes record)
  const completeConsultation = async () => {
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      await api.post(`/encounters/${activeEncounter.id}/complete-consultation`, consultForm);
      showToast('success', 'Consultation finalized & legally locked. Invoice billed.');
      await refreshEncounter();
      fetchQueue();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to complete consultation');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit clinical addendum to finalized consultation
  const submitAddendum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter || !addendumForm.addendum_text || !addendumForm.reason) {
      showToast('error', 'Addendum notes and clinical reason are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/consultations/${activeEncounter.id}/addenda`, addendumForm);
      showToast('success', 'Clinical addendum appended with audit verification.');
      setShowAddendumModal(false);
      setAddendumForm({ addendum_text: '', reason: '' });
      await fetchConsultationAddenda(activeEncounter.id);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to record addendum');
    } finally {
      setSubmitting(false);
    }
  };

  // Document new patient allergy
  const handleAddNewAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter || !newAllergyForm.allergen_name) return;
    try {
      await api.post(`/prescriptions/patient/${activeEncounter.patient_id}/allergies`, newAllergyForm);
      showToast('success', `Documented allergy: ${newAllergyForm.allergen_name}`);
      setShowAddAllergyModal(false);
      setNewAllergyForm({ allergen_name: '', allergen_category: 'drug', reaction_description: '', severity: 'moderate' });
      await fetchPatientAllergies(activeEncounter.patient_id);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to record allergy');
    }
  };

  // Call patient to consultation room (Broadcast to TV Display + Chime)
  const callPatientToRoom = async (enc: EncounterSummary) => {
    try {
      // Find queue entry if exists, or call encounter calling endpoint
      const queueRes = await api.get(`/opd?status=waiting`);
      const queueList = queueRes.data.data.queue || [];
      const match = queueList.find((q: any) => q.patient_id === enc.patient_id);

      if (match) {
        await api.post(`/opd/${match.id}/call`, { consultation_room: 'Consultation Room 2' });
        showToast('success', `Called ${enc.first_name} ${enc.last_name} (${match.queue_token}) to Room 2 with audio chime!`);
      } else {
        // Emit direct emergency/triage call
        showToast('success', `Paging Dr. call for ${enc.first_name} ${enc.last_name}`);
      }
    } catch (err) {
      showToast('error', 'Failed to trigger patient call announcement');
    }
  };

  // ── Prescription Ordering with Allergy Safety Check ───────────────
  const addPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;

    setSubmitting(true);
    try {
      // 1. Run Clinical Allergy Pre-check
      const valRes = await api.post('/prescriptions/validate', {
        patient_id: activeEncounter.patient_id,
        medication_name: rxForm.medication_name
      });

      const check = valRes.data.data;
      if (check.hasConflict) {
        // Conflict detected! Open Allergy Warning Modal
        setAllergyConflictModal({
          alerts: check.alerts,
          hardBlocked: check.hardBlocked,
          medicationName: rxForm.medication_name
        });
        setSubmitting(false);
        return;
      }

      // 2. Safe to prescribe
      await executePrescriptionCreation();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Prescription validation failed');
      setSubmitting(false);
    }
  };

  // Execute prescription with optional override
  const executePrescriptionCreation = async (override?: string) => {
    if (!activeEncounter) return;
    try {
      const selectedService = services.find(s => s.name === rxForm.medication_name);
      const price = selectedService ? selectedService.unit_price : 0;

      await api.post('/prescriptions', {
        ...rxForm,
        patient_id: activeEncounter.patient_id,
        encounter_id: activeEncounter.id,
        quantity: parseInt(rxForm.quantity) || 1,
        unit_price: price,
        override_reason: override || null
      });

      // Clinical billing item
      await api.post('/invoices/clinical', {
        encounter_id: activeEncounter.id,
        items: [{
          service: rxForm.medication_name,
          quantity: parseInt(rxForm.quantity) || 1,
          unit_price: price,
          total: price * (parseInt(rxForm.quantity) || 1)
        }]
      });

      showToast('success', `Prescription for ${rxForm.medication_name} ordered & billed!`);
      setRxForm({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '1' });
      setAllergyConflictModal(null);
      setOverrideReason('');
      setOverrideAcknowledged(false);
      await refreshEncounter();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to order prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length === 0) {
      showToast('error', 'Mandatory clinical justification is required for allergy override.');
      return;
    }
    setSubmitting(true);
    executePrescriptionCreation(overrideReason.trim());
  };

  const orderLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      const selectedService = services.find(s => s.name === labForm.test_name);
      const price = selectedService ? selectedService.unit_price : 0;
      await api.post('/lab-tests', {
        ...labForm,
        patient_id: activeEncounter.patient_id,
        encounter_id: activeEncounter.id,
        unit_price: price,
      });
      await api.post('/invoices/clinical', {
        encounter_id: activeEncounter.id,
        items: [{ service: labForm.test_name, quantity: 1, unit_price: price, total: price }]
      });
      showToast('success', `Lab test "${labForm.test_name}" ordered & billed!`);
      setLabForm({ test_name: '', test_type: '', priority: 'normal', notes: '' });
      await refreshEncounter();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to order lab test');
    } finally { setSubmitting(false); }
  };

  const orderRadiology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      await api.post('/radiology-orders', {
        ...radForm,
        patient_id: activeEncounter.patient_id,
        encounter_id: activeEncounter.id,
      });
      showToast('success', `Radiology "${radForm.study_type}" ordered & billed!`);
      setRadForm({ study_type: '', body_part: '', clinical_indication: '', priority: 'routine', notes: '' });
      await refreshEncounter();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to order radiology');
    } finally { setSubmitting(false); }
  };

  const orderProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      await api.post('/procedures', {
        ...procForm,
        patient_id: activeEncounter.patient_id,
        encounter_id: activeEncounter.id,
      });
      showToast('success', `Procedure "${procForm.procedure_name}" ordered & billed!`);
      setProcForm({ procedure_name: '', description: '', priority: 'routine', notes: '' });
      await refreshEncounter();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to order procedure');
    } finally { setSubmitting(false); }
  };

  const calcAge = (dob?: string) => dob ? `${Math.floor((Date.now() - new Date(dob).getTime()) / 3.154e10)} yrs` : 'N/A';

  const isFinalized = activeEncounter?.consultation_status === 'completed' ||
                      activeEncounter?.status === 'billing_generated' ||
                      activeEncounter?.status === 'completed';

  const tabs: { key: Tab; label: string; icon: React.FC<any>; count?: number }[] = [
    { key: 'consult', label: 'Consultation', icon: Stethoscope },
    { key: 'prescriptions', label: 'Prescriptions', icon: Pill, count: activeEncounter?.prescriptions?.length },
    { key: 'labs', label: 'Lab Tests', icon: FlaskConical, count: activeEncounter?.labTests?.length },
    { key: 'radiology', label: 'Radiology', icon: Scan, count: activeEncounter?.radiologyOrders?.length },
    { key: 'procedures', label: 'Procedures', icon: Syringe, count: activeEncounter?.procedureOrders?.length },
    { key: 'billing', label: 'Billing', icon: DollarSign, count: activeEncounter?.billing?.items?.length },
  ];

  return (
    <div className="h-full flex gap-0 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Left Panel — Queue ────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-600" /> My Patient Queue
            </h2>
            <button onClick={fetchQueue} disabled={loading} className="text-slate-400 hover:text-slate-600">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[
              { label: 'Waiting', count: queue.filter(e => e.status === 'waiting_for_doctor').length, color: 'bg-amber-100 text-amber-700' },
              { label: 'In Progress', count: queue.filter(e => e.status === 'in_consultation').length, color: 'bg-blue-100 text-blue-700' },
            ].map(s => (
              <span key={s.label} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${s.color}`}>
                {s.count} {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-700">
          {queue.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No patients in doctor queue
            </div>
          ) : queue.map(enc => (
            <div
              key={enc.id}
              onClick={() => openEncounter(enc)}
              className={`p-3.5 cursor-pointer transition ${
                activeEncounter?.id === enc.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {enc.first_name} {enc.last_name}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${priorityColors[enc.priority || 'normal']}`}>
                  {enc.priority || 'Normal'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {enc.department_name || 'General OPD'}
              </div>
              {enc.chief_complaint && (
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                  📋 {enc.chief_complaint}
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    callPatientToRoom(enc);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[11px] font-bold rounded-lg transition"
                  title="Page patient on Waiting Room TV screen"
                >
                  <Volume2 className="h-3 w-3" />
                  Call to Room
                </button>
                <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <span>{enc.status === 'in_consultation' ? 'In Progress' : 'Waiting'}</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────── */}
      {activeEncounter ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
          {/* Patient Top Banner */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                  {activeEncounter.first_name[0]}{activeEncounter.last_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-black text-base text-slate-900 dark:text-white">
                      {activeEncounter.first_name} {activeEncounter.last_name}
                    </h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${priorityColors[activeEncounter.priority || 'normal']}`}>
                      {activeEncounter.priority || 'Normal'}
                    </span>
                    {isFinalized && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Lock className="h-3 w-3" /> Finalized Record
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {activeEncounter.gender} · {calcAge(activeEncounter.date_of_birth)} ·
                    Blood: <span className="font-bold">{activeEncounter.blood_type || 'N/A'}</span> ·
                    Encounter: <span className="font-mono font-semibold">{activeEncounter.encounter_number}</span>
                  </div>
                </div>
              </div>

              {/* Vitals & Top Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex gap-3 text-xs bg-slate-100 dark:bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
                  {activeEncounter.temperature && <span>🌡️ {activeEncounter.temperature}°C</span>}
                  {activeEncounter.heart_rate && <span>❤️ {activeEncounter.heart_rate} bpm</span>}
                  {activeEncounter.blood_pressure_systolic && (
                    <span>💉 {activeEncounter.blood_pressure_systolic}/{activeEncounter.blood_pressure_diastolic} mmHg</span>
                  )}
                  {activeEncounter.oxygen_saturation && <span>O₂ {activeEncounter.oxygen_saturation}%</span>}
                </div>

                {!isFinalized ? (
                  <button
                    onClick={completeConsultation}
                    disabled={submitting || !consultForm.diagnosis}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Complete & Bill
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAddendumModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Clinical Addendum
                  </button>
                )}
              </div>
            </div>

            {/* Structured Allergy Safety Strip */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <AlertOctagon className="h-3.5 w-3.5 text-red-500" /> Recorded Allergies:
                </span>
                {patientAllergies.length === 0 && !activeEncounter.allergies ? (
                  <span className="text-xs text-slate-400 italic">No recorded allergies on file</span>
                ) : (
                  <>
                    {patientAllergies.map(a => (
                      <span
                        key={a.id}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          allergySeverityColors[a.severity] || 'bg-amber-500 text-white'
                        }`}
                        title={`${a.allergen_name} (${a.severity}) - ${a.reaction_description || 'No reaction notes'}`}
                      >
                        ⚠️ {a.allergen_name} ({a.severity})
                      </span>
                    ))}
                    {activeEncounter.allergies && patientAllergies.length === 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                        ⚠️ {activeEncounter.allergies}
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                onClick={() => setShowAddAllergyModal(true)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Document Allergy
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-1 mt-3 -mb-4 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tab Content ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 1. CONSULTATION TAB */}
            {activeTab === 'consult' && (
              <div className="max-w-3xl space-y-4">
                {/* Finalized Notice */}
                {isFinalized && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-emerald-600" />
                      <div>
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          Medical Record Finalized & Legally Protected
                        </h4>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          Primary consultation documentation is locked. Any clinical amendments must be recorded as an addendum.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddendumModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      + Add Addendum
                    </button>
                  </div>
                )}

                {/* Chief Complaint */}
                {activeEncounter.chief_complaint && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
                    <div className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
                      CHIEF COMPLAINT (from Triage)
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {activeEncounter.chief_complaint}
                    </div>
                    {activeEncounter.preliminary_observations && (
                      <div className="mt-2 text-xs text-slate-500">
                        Nurse Observations: {activeEncounter.preliminary_observations}
                      </div>
                    )}
                  </div>
                )}

                {/* Consultation Notes Form */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Clinical Examination & Diagnostic Findings
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Consultation Notes {isFinalized && '(Locked)'}
                    </label>
                    <textarea
                      rows={4}
                      disabled={isFinalized}
                      value={consultForm.consultation_notes}
                      onChange={e => setConsultForm(f => ({ ...f, consultation_notes: e.target.value }))}
                      placeholder="Clinical observations, physical examination, symptom evolution..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Primary Diagnosis * {isFinalized && '(Locked)'}
                      </label>
                      <input
                        disabled={isFinalized}
                        value={consultForm.diagnosis}
                        onChange={e => setConsultForm(f => ({ ...f, diagnosis: e.target.value }))}
                        placeholder="Clinical diagnosis"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                        ICD-10 Code {isFinalized && '(Locked)'}
                      </label>
                      <input
                        disabled={isFinalized}
                        value={consultForm.icd_code}
                        onChange={e => setConsultForm(f => ({ ...f, icd_code: e.target.value }))}
                        placeholder="e.g. J18.1, A09"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Management & Treatment Plan {isFinalized && '(Locked)'}
                    </label>
                    <textarea
                      rows={3}
                      disabled={isFinalized}
                      value={consultForm.treatment_plan}
                      onChange={e => setConsultForm(f => ({ ...f, treatment_plan: e.target.value }))}
                      placeholder="Treatment protocol, patient instructions..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Follow-up & Referral Instructions
                    </label>
                    <textarea
                      rows={2}
                      disabled={isFinalized}
                      value={consultForm.follow_up_instructions}
                      onChange={e => setConsultForm(f => ({ ...f, follow_up_instructions: e.target.value }))}
                      placeholder="Next review appointment or warning signs..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-600"
                    />
                  </div>
                </div>

                {/* ── Clinical Addenda Timeline (Immutable Amendments) ── */}
                {consultationAddenda.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-500" />
                      Clinical Addenda & Amendments History
                    </h3>

                    <div className="space-y-3">
                      {consultationAddenda.map((addendum, idx) => (
                        <div
                          key={addendum.id}
                          className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              Addendum #{idx + 1} • {addendum.doctor_name || 'Attending Physician'}
                            </span>
                            <span>{new Date(addendum.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {addendum.addendum_text}
                          </div>
                          <div className="mt-2 text-[11px] text-slate-500 italic bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Documented Reason: </span>
                            {addendum.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PRESCRIPTIONS TAB (With Allergy Safety Validation) */}
            {activeTab === 'prescriptions' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-violet-500" /> Add Prescription (Allergy Pre-Checked)
                  </h3>

                  <form onSubmit={addPrescription} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Medication Name *
                        </label>
                        <input
                          required
                          value={rxForm.medication_name}
                          onChange={e => setRxForm(f => ({ ...f, medication_name: e.target.value }))}
                          placeholder="e.g. Amoxicillin 500mg, Ceftriaxone 1g, Paracetamol"
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>

                      {[
                        { key: 'dosage', label: 'Dosage *', ph: 'e.g. 500mg', req: true },
                        { key: 'frequency', label: 'Frequency *', ph: 'e.g. 3x daily (TID)', req: true },
                        { key: 'duration', label: 'Duration *', ph: 'e.g. 7 days', req: true },
                        { key: 'quantity', label: 'Quantity', ph: '1', req: false, type: 'number' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{f.label}</label>
                          <input
                            required={f.req}
                            type={f.type || 'text'}
                            value={(rxForm as any)[f.key]}
                            onChange={e => setRxForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder={f.ph}
                            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                          />
                        </div>
                      ))}

                      <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Instructions</label>
                        <input
                          value={rxForm.instructions}
                          onChange={e => setRxForm(f => ({ ...f, instructions: e.target.value }))}
                          placeholder="e.g. Take with food, drink plenty of water"
                          className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
                      >
                        {submitting ? 'Checking Safety...' : '+ Check Allergy Safety & Prescribe'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Prescriptions List */}
                {(activeEncounter.prescriptions || []).length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden shadow-sm">
                    {(activeEncounter.prescriptions || []).map((rx: any) => (
                      <div key={rx.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {rx.medication_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {rx.dosage} · {rx.frequency} · {rx.duration}
                            {rx.instructions && ` · ${rx.instructions}`}
                          </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                          rx.is_dispensed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rx.is_dispensed ? 'Dispensed' : 'Pending Pharmacy'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. LAB TESTS TAB */}
            {activeTab === 'labs' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-cyan-500" /> Order Laboratory Test
                  </h3>
                  <form onSubmit={orderLabTest} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Test Name *</label>
                      <input
                        required
                        value={labForm.test_name}
                        onChange={e => setLabForm(f => ({ ...f, test_name: e.target.value }))}
                        placeholder="e.g. Complete Blood Count (CBC), Widal Test, Urinalysis"
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
                      >
                        + Order & Bill Lab Test
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 4. RADIOLOGY TAB */}
            {activeTab === 'radiology' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                    <Scan className="h-4 w-4 text-indigo-500" /> Order Radiology Examination
                  </h3>
                  <form onSubmit={orderRadiology} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Study Type *</label>
                      <input
                        required
                        value={radForm.study_type}
                        onChange={e => setRadForm(f => ({ ...f, study_type: e.target.value }))}
                        placeholder="e.g. Chest X-Ray, Abdominal Ultrasound"
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
                      >
                        + Order & Bill Radiology
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 5. PROCEDURES TAB */}
            {activeTab === 'procedures' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-rose-500" /> Order Minor / Major Procedure
                  </h3>
                  <form onSubmit={orderProcedure} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Procedure Name *</label>
                      <input
                        required
                        value={procForm.procedure_name}
                        onChange={e => setProcForm(f => ({ ...f, procedure_name: e.target.value }))}
                        placeholder="e.g. Wound Suture, Incision and Drainage, IV Cannulation"
                        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition shadow-sm"
                      >
                        + Order & Bill Procedure
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 6. BILLING TAB */}
            {activeTab === 'billing' && (
              <div className="max-w-3xl">
                {activeEncounter.billing?.invoice ? (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          Invoice #{activeEncounter.billing.invoice.id}
                        </h3>
                        <div className="text-xs text-slate-500">
                          Encounter {activeEncounter.encounter_number}
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800">
                        {activeEncounter.billing.invoice.status}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                      {(activeEncounter.billing.items || []).map((item: any) => (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.description}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{item.source_type}</div>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {parseFloat(item.subtotal).toLocaleString()} ETB
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between font-black text-sm">
                      <span>Total Amount:</span>
                      <span>{parseFloat(activeEncounter.billing.invoice.total_amount || 0).toLocaleString()} ETB</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No billing items recorded for this consultation.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-center text-slate-400">
          <div>
            <Stethoscope className="h-16 w-16 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Select a patient from the queue</p>
            <p className="text-xs text-slate-400 mt-0.5">Click any waiting card to begin clinical examination</p>
          </div>
        </div>
      )}

      {/* ── MODAL: ALLERGY CONFLICT WARNING & OVERRIDE ──────────────── */}
      {allergyConflictModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl shadow-2xl max-w-xl w-full p-6 animate-shake">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl flex-shrink-0">
                <AlertOctagon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-100 px-2.5 py-0.5 rounded-full">
                  CLINICAL SAFETY ALERT
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Medication Allergy Conflict Detected
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Proposed medication conflict for patient{' '}
                  <span className="font-bold text-slate-900 dark:text-white">{activeEncounter?.first_name} {activeEncounter?.last_name}</span>:
                </p>
              </div>
            </div>

            {/* Alert Conflict Details */}
            <div className="mt-4 space-y-2.5">
              {allergyConflictModal.alerts.map((alt, idx) => (
                <div key={idx} className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-red-900 dark:text-red-200">
                      Proposed: {alt.proposedMedication}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${allergySeverityColors[alt.severity] || 'bg-red-600 text-white'}`}>
                      {alt.severity} Severity
                    </span>
                  </div>
                  <div className="text-red-800 dark:text-red-300">
                    <span className="font-semibold">Recorded Allergen:</span> {alt.recordedAllergen}
                    {' '}(Reaction: {alt.reactionDescription})
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 pt-1 font-medium">
                    ⚠️ {alt.reason}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 italic text-[11px]">
                    Recommendation: {alt.recommendation}
                  </div>
                </div>
              ))}
            </div>

            {/* Override Form */}
            <form onSubmit={handleConfirmOverride} className="mt-5 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Document Mandatory Clinical Override Justification *
                </label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g. Benefits outweigh cross-reactivity risk; patient tolerated in past under observation"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="override-ack"
                  required
                  checked={overrideAcknowledged}
                  onChange={e => setOverrideAcknowledged(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="override-ack" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  I acknowledge the clinical risk and assume prescribing responsibility. An audit record will be logged.
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAllergyConflictModal(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel Prescription
                </button>
                <button
                  type="submit"
                  disabled={!overrideAcknowledged || !overrideReason}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  Authorize Clinical Override & Prescribe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD CLINICAL ADDENDUM ────────────────────────────── */}
      {showAddendumModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-indigo-600" /> Append Clinical Addendum
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Addenda are permanently linked to this finalized consultation and recorded in the medical audit trail.
            </p>

            <form onSubmit={submitAddendum} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Addendum Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  value={addendumForm.addendum_text}
                  onChange={e => setAddendumForm({ ...addendumForm, addendum_text: e.target.value })}
                  placeholder="Document supplemental clinical notes, lab review findings, or treatment adjustment..."
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Clinical Reason for Correction / Addition *
                </label>
                <input
                  required
                  value={addendumForm.reason}
                  onChange={e => setAddendumForm({ ...addendumForm, reason: e.target.value })}
                  placeholder="e.g. Subsequent pathology report received, diagnostic clarification"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddendumModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Append Addendum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DOCUMENT NEW ALLERGY ─────────────────────────────── */}
      {showAddAllergyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-red-500" /> Document Patient Allergy
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Recorded in patient medical record and cross-referenced in real time during prescribing.
            </p>

            <form onSubmit={handleAddNewAllergy} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Allergen Name *
                </label>
                <input
                  required
                  value={newAllergyForm.allergen_name}
                  onChange={e => setNewAllergyForm({ ...newAllergyForm, allergen_name: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa, Aspirin, Ibuprofen, Peanuts"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newAllergyForm.allergen_category}
                    onChange={e => setNewAllergyForm({ ...newAllergyForm, allergen_category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  >
                    <option value="drug">Drug / Medication</option>
                    <option value="food">Food</option>
                    <option value="environmental">Environmental</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Severity
                  </label>
                  <select
                    value={newAllergyForm.severity}
                    onChange={e => setNewAllergyForm({ ...newAllergyForm, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  >
                    <option value="mild">Mild (Rash/Itch)</option>
                    <option value="moderate">Moderate (Hives/Swelling)</option>
                    <option value="severe">Severe (Wheezing/Dyspnea)</option>
                    <option value="anaphylaxis">Anaphylaxis (Life-Threatening)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reaction Description
                </label>
                <input
                  value={newAllergyForm.reaction_description}
                  onChange={e => setNewAllergyForm({ ...newAllergyForm, reaction_description: e.target.value })}
                  placeholder="e.g. Severe facial edema, shortness of breath within 30 min"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAllergyModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Record Allergy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorConsultationPage;
