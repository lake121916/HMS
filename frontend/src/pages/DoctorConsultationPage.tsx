/**
 * Doctor Consultation Page
 * Full consultation workflow:
 * - View patient queue (waiting_for_doctor, in_consultation)
 * - Start consultation
 * - Review patient history, triage info, vitals
 * - Record diagnosis, notes, treatment plan
 * - Order prescriptions → auto-billing
 * - Order lab tests → auto-billing
 * - Order radiology → auto-billing
 * - Order procedures → auto-billing
 * - Complete consultation → auto-billing (consultation fee)
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Stethoscope, FlaskConical, Scan, Pill, Syringe,
  CheckSquare, RefreshCw, AlertTriangle, ChevronRight,
  User, DollarSign
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

type Tab = 'consult' | 'prescriptions' | 'labs' | 'radiology' | 'procedures' | 'billing';

const priorityColors: Record<string, string> = {
  emergency: 'bg-red-100 text-red-700',
  urgent:    'bg-orange-100 text-orange-700',
  normal:    'bg-green-100 text-green-700',
};

const DoctorConsultationPage: React.FC = () => {
  const [queue, setQueue] = useState<EncounterSummary[]>([]);
  const [activeEncounter, setActiveEncounter] = useState<FullEncounter | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('consult');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);

  // Form states
  const [consultForm, setConsultForm] = useState({ consultation_notes: '', diagnosis: '', icd_code: '', treatment_plan: '', follow_up_instructions: '' });
  const [rxForm, setRxForm] = useState({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '1' });
  const [labForm, setLabForm] = useState({ test_name: '', test_type: '', priority: 'normal', notes: '' });
  const [radForm, setRadForm] = useState({ study_type: '', body_part: '', clinical_indication: '', priority: 'routine', notes: '' });
  const [procForm, setProcForm] = useState({ procedure_name: '', description: '', priority: 'routine', notes: '' });

  useEffect(() => { fetchQueue(); }, []);

  const showToast = (type: 'success'|'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get('/encounters/doctor-queue');
      setQueue(res.data.data.encounters || []);
    } catch { showToast('error', 'Failed to load queue'); }
    finally { setLoading(false); }
  };

  const openEncounter = async (enc: EncounterSummary) => {
    setLoading(true);
    try {
      // Start consultation if not already in it
      if (enc.status === 'waiting_for_doctor') {
        await api.post(`/encounters/${enc.id}/start-consultation`);
      }
      const res = await api.get(`/encounters/${enc.id}`);
      const full = res.data.data;
      setActiveEncounter({ ...full.encounter, ...full });
      setActiveTab('consult');
      setConsultForm({
        consultation_notes: full.encounter.consultation_notes || '',
        diagnosis: full.encounter.diagnosis || '',
        icd_code: full.encounter.icd_code || '',
        treatment_plan: full.encounter.treatment_plan || '',
        follow_up_instructions: full.encounter.follow_up_instructions || '',
      });
      fetchQueue();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to open encounter');
    } finally { setLoading(false); }
  };

  const refreshEncounter = async () => {
    if (!activeEncounter) return;
    const res = await api.get(`/encounters/${activeEncounter.id}`);
    const full = res.data.data;
    setActiveEncounter(prev => ({ ...prev, ...full.encounter, ...full }));
  };

  const completeConsultation = async () => {
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      await api.post(`/encounters/${activeEncounter.id}/complete-consultation`, consultForm);
      showToast('success', 'Consultation completed and billed!');
      await refreshEncounter();
      fetchQueue();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to complete consultation');
    } finally { setSubmitting(false); }
  };


  const addPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      await api.post('/prescriptions', {
        ...rxForm,
        patient_id: activeEncounter.patient_id,
        encounter_id: activeEncounter.id,
        quantity: parseInt(rxForm.quantity) || 1,
      });
      showToast('success', `Prescription for ${rxForm.medication_name} created & billed!`);
      setRxForm({ medication_name: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '1' });
      await refreshEncounter();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create prescription');
    } finally { setSubmitting(false); }
  };

  const orderLabTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEncounter) return;
    setSubmitting(true);
    try {
      await api.post('/lab-tests', {
        ...labForm,
        patient_id: activeEncounter.patient_id,
        encounter_id: activeEncounter.id,
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
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Left Panel — Queue */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">My Patient Queue</h2>
            <button onClick={fetchQueue} disabled={loading} className="text-slate-400 hover:text-slate-600">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-2 flex gap-1">
            {[
              { label: 'Waiting', count: queue.filter(e => e.status === 'waiting_for_doctor').length, color: 'bg-amber-100 text-amber-700' },
              { label: 'In Progress', count: queue.filter(e => e.status === 'in_consultation').length, color: 'bg-blue-100 text-blue-700' },
            ].map(s => (
              <span key={s.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                {s.count} {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {queue.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No patients in queue
            </div>
          ) : queue.map(enc => (
            <div
              key={enc.id}
              onClick={() => openEncounter(enc)}
              className={`p-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition
                ${activeEncounter?.id === enc.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-slate-900 dark:text-white">
                  {enc.first_name} {enc.last_name}
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityColors[enc.priority || 'normal']}`}>
                  {enc.priority || 'Normal'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {enc.department_name || 'Unassigned'}
              </div>
              {enc.chief_complaint && (
                <div className="text-xs text-slate-500 mt-1 line-clamp-1">📋 {enc.chief_complaint}</div>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                  ${enc.status === 'in_consultation' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                  {enc.status === 'in_consultation' ? 'In Progress' : 'Waiting'}
                </span>
                <ChevronRight className="h-3 w-3 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {activeEncounter ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
          {/* Patient Banner */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {activeEncounter.first_name[0]}{activeEncounter.last_name[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900 dark:text-white">
                      {activeEncounter.first_name} {activeEncounter.last_name}
                    </h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityColors[activeEncounter.priority || 'normal']}`}>
                      {activeEncounter.priority || 'Normal'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500">
                    {activeEncounter.gender} · {calcAge(activeEncounter.date_of_birth)} ·
                    Blood: {activeEncounter.blood_type || 'N/A'} ·
                    {activeEncounter.encounter_number}
                  </div>
                  {activeEncounter.allergies && (
                    <div className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                      <AlertTriangle className="h-3 w-3" /> Allergies: {activeEncounter.allergies}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Vital signs mini strip */}
                <div className="hidden lg:flex gap-3 text-xs bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border">
                  {activeEncounter.temperature && <span>🌡️ {activeEncounter.temperature}°C</span>}
                  {activeEncounter.heart_rate && <span>❤️ {activeEncounter.heart_rate}bpm</span>}
                  {activeEncounter.blood_pressure_systolic && (
                    <span>💉 {activeEncounter.blood_pressure_systolic}/{activeEncounter.blood_pressure_diastolic}</span>
                  )}
                  {activeEncounter.oxygen_saturation && <span>O₂ {activeEncounter.oxygen_saturation}%</span>}
                </div>

                {activeEncounter.consultation_status !== 'completed' && (
                  <button
                    onClick={completeConsultation}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Complete & Bill
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-4">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition
                    ${activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* ── Consultation Tab ── */}
            {activeTab === 'consult' && (
              <div className="max-w-3xl space-y-4">
                {/* Chief Complaint */}
                {activeEncounter.chief_complaint && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">CHIEF COMPLAINT (from Triage)</div>
                    <div className="text-sm text-slate-800 dark:text-slate-200">{activeEncounter.chief_complaint}</div>
                    {activeEncounter.preliminary_observations && (
                      <div className="mt-2 text-xs text-slate-500">Observations: {activeEncounter.preliminary_observations}</div>
                    )}
                  </div>
                )}

                {activeEncounter.medical_history && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="text-xs font-semibold text-amber-700 mb-1">MEDICAL HISTORY</div>
                    <div className="text-sm text-slate-700">{activeEncounter.medical_history}</div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Consultation Notes & Diagnosis</h3>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Consultation Notes</label>
                    <textarea
                      rows={4}
                      value={consultForm.consultation_notes}
                      onChange={e => setConsultForm(f => ({ ...f, consultation_notes: e.target.value }))}
                      placeholder="Clinical observations, examination findings..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Diagnosis *</label>
                      <input
                        value={consultForm.diagnosis}
                        onChange={e => setConsultForm(f => ({ ...f, diagnosis: e.target.value }))}
                        placeholder="Primary diagnosis"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ICD Code</label>
                      <input
                        value={consultForm.icd_code}
                        onChange={e => setConsultForm(f => ({ ...f, icd_code: e.target.value }))}
                        placeholder="e.g. J18.1"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Treatment Plan</label>
                    <textarea
                      rows={3}
                      value={consultForm.treatment_plan}
                      onChange={e => setConsultForm(f => ({ ...f, treatment_plan: e.target.value }))}
                      placeholder="Management and treatment plan..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Follow-up Instructions</label>
                    <textarea
                      rows={2}
                      value={consultForm.follow_up_instructions}
                      onChange={e => setConsultForm(f => ({ ...f, follow_up_instructions: e.target.value }))}
                      placeholder="Patient instructions and follow-up..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button onClick={completeConsultation} disabled={submitting || !consultForm.diagnosis}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                      <CheckSquare className="h-4 w-4" />
                      {submitting ? 'Processing...' : 'Complete Consultation & Bill'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Prescriptions Tab ── */}
            {activeTab === 'prescriptions' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-violet-500" /> Add Prescription
                  </h3>
                  <form onSubmit={addPrescription} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Medication Name *</label>
                        <input required value={rxForm.medication_name} onChange={e => setRxForm(f => ({...f, medication_name: e.target.value}))}
                          placeholder="e.g. Amoxicillin 500mg"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                      </div>
                      {[
                        {key:'dosage',label:'Dosage *',ph:'e.g. 500mg',req:true},
                        {key:'frequency',label:'Frequency *',ph:'e.g. 3x daily',req:true},
                        {key:'duration',label:'Duration *',ph:'e.g. 7 days',req:true},
                        {key:'quantity',label:'Quantity',ph:'1',req:false,type:'number'},
                      ].map(f => (
                        <div key={f.key}>
                          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{f.label}</label>
                          <input required={f.req} type={f.type||'text'} value={(rxForm as any)[f.key]}
                            onChange={e => setRxForm(prev => ({...prev,[f.key]:e.target.value}))}
                            placeholder={f.ph}
                            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                        </div>
                      ))}
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Instructions</label>
                        <input value={rxForm.instructions} onChange={e => setRxForm(f => ({...f,instructions:e.target.value}))}
                          placeholder="Special instructions..."
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={submitting}
                        className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                        {submitting ? 'Prescribing...' : '+ Add & Bill Prescription'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Prescription list */}
                {(activeEncounter.prescriptions || []).length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {(activeEncounter.prescriptions || []).map((rx: any) => (
                      <div key={rx.id} className="p-4">
                        <div className="flex justify-between">
                          <div className="font-medium text-sm text-slate-900 dark:text-white">{rx.medication_name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${rx.is_dispensed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {rx.is_dispensed ? 'Dispensed' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {rx.dosage} · {rx.frequency} · {rx.duration}
                          {rx.instructions && ` · ${rx.instructions}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Lab Tests Tab ── */}
            {activeTab === 'labs' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-cyan-500" /> Order Lab Test
                  </h3>
                  <form onSubmit={orderLabTest} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Test Name *</label>
                        <input required value={labForm.test_name} onChange={e => setLabForm(f=>({...f,test_name:e.target.value}))}
                          placeholder="e.g. CBC, Liver Function Test, Blood Glucose"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Test Type</label>
                        <input value={labForm.test_type} onChange={e => setLabForm(f=>({...f,test_type:e.target.value}))}
                          placeholder="e.g. Hematology, Biochemistry"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Priority</label>
                        <select value={labForm.priority} onChange={e => setLabForm(f=>({...f,priority:e.target.value}))}
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300">
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Notes</label>
                        <input value={labForm.notes} onChange={e => setLabForm(f=>({...f,notes:e.target.value}))}
                          placeholder="Special instructions for the lab..."
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={submitting}
                        className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                        {submitting ? 'Ordering...' : '+ Order & Bill Lab Test'}
                      </button>
                    </div>
                  </form>
                </div>

                {(activeEncounter.labTests || []).length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100">
                    {(activeEncounter.labTests || []).map((lt: any) => (
                      <div key={lt.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm text-slate-900 dark:text-white">{lt.test_name}</div>
                          <div className="text-xs text-slate-500">{lt.test_type} · Priority: {lt.priority}</div>
                          {lt.results && <div className="text-xs text-emerald-600 mt-1">✓ Result: {lt.results.slice(0,60)}...</div>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                          ${lt.status === 'completed' ? 'bg-green-100 text-green-700' :
                            lt.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {lt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Radiology Tab ── */}
            {activeTab === 'radiology' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Scan className="h-4 w-4 text-indigo-500" /> Order Radiology
                  </h3>
                  <form onSubmit={orderRadiology} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600">Study Type *</label>
                        <select required value={radForm.study_type} onChange={e => setRadForm(f=>({...f,study_type:e.target.value}))}
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                          <option value="">Select...</option>
                          {['X-Ray','CT Scan','MRI','Ultrasound','Mammography','Fluoroscopy','Nuclear Medicine','PET Scan','Echocardiogram'].map(s =>
                            <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Body Part</label>
                        <input value={radForm.body_part} onChange={e => setRadForm(f=>({...f,body_part:e.target.value}))}
                          placeholder="e.g. Chest, Abdomen, Head"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Clinical Indication</label>
                        <input value={radForm.clinical_indication} onChange={e => setRadForm(f=>({...f,clinical_indication:e.target.value}))}
                          placeholder="Reason for this study..."
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Priority</label>
                        <select value={radForm.priority} onChange={e => setRadForm(f=>({...f,priority:e.target.value}))}
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={submitting || !radForm.study_type}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                        {submitting ? 'Ordering...' : '+ Order & Bill Radiology'}
                      </button>
                    </div>
                  </form>
                </div>

                {(activeEncounter.radiologyOrders || []).length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y">
                    {(activeEncounter.radiologyOrders || []).map((ro: any) => (
                      <div key={ro.id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm text-slate-900 dark:text-white">{ro.study_type}</div>
                          <div className="text-xs text-slate-500">{ro.body_part} · {ro.priority}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                          ${ro.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {ro.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Procedures Tab ── */}
            {activeTab === 'procedures' && (
              <div className="max-w-3xl space-y-5">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-rose-500" /> Order Procedure
                  </h3>
                  <form onSubmit={orderProcedure} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Procedure Name *</label>
                        <input required value={procForm.procedure_name} onChange={e => setProcForm(f=>({...f,procedure_name:e.target.value}))}
                          placeholder="e.g. IV Cannulation, ECG, Wound Dressing"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600">Description</label>
                        <input value={procForm.description} onChange={e => setProcForm(f=>({...f,description:e.target.value}))}
                          placeholder="Procedure details..."
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">Priority</label>
                        <select value={procForm.priority} onChange={e => setProcForm(f=>({...f,priority:e.target.value}))}
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={submitting}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                        {submitting ? 'Ordering...' : '+ Order & Bill Procedure'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Billing Tab ── */}
            {activeTab === 'billing' && (
              <div className="max-w-3xl">
                {activeEncounter.billing?.invoice ? (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Invoice #{activeEncounter.billing.invoice.id}</h3>
                        <div className="text-xs text-slate-500">Auto-generated · Encounter {activeEncounter.encounter_number}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize
                        ${activeEncounter.billing.invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                          activeEncounter.billing.invoice.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {activeEncounter.billing.invoice.status}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {(activeEncounter.billing.items || []).map((item: any) => (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{item.description}</div>
                            <div className="text-xs text-slate-400 capitalize">{item.source_type.replace('_', ' ')}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {item.quantity} × {parseFloat(item.unit_price).toLocaleString()} ETB
                            </div>
                            <div className="text-xs text-slate-500">= {parseFloat(item.subtotal).toLocaleString()} ETB</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 dark:bg-slate-900">
                      <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                        <span>Total</span>
                        <span>{parseFloat(activeEncounter.billing.invoice.total_amount || 0).toLocaleString()} ETB</span>
                      </div>
                      {activeEncounter.billing.invoice.amount_paid > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 mt-1">
                          <span>Amount Paid</span>
                          <span>{parseFloat(activeEncounter.billing.invoice.amount_paid || 0).toLocaleString()} ETB</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No billing yet. Order services or complete consultation to generate invoice.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center text-slate-400">
            <Stethoscope className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-500">Select a patient from the queue</p>
            <p className="text-sm text-slate-400 mt-1">to begin consultation</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorConsultationPage;
