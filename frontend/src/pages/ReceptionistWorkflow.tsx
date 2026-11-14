/**
 * Receptionist Workflow Page
 * - Search/register patients
 * - Create encounters
 * - Send to triage queue
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Search, UserPlus, ClipboardList, ArrowRight, RefreshCw,
  CheckCircle2, User, Printer, QrCode, DollarSign, Receipt,
  ShieldCheck, AlertCircle
} from 'lucide-react';
import QueueTokenTicket, { QueueTicketData } from '../components/queue/QueueTokenTicket';
import PatientWristbandModal from '../components/PatientWristbandModal';
import WristbandScannerModal from '../components/WristbandScannerModal';
import PatientJourneyHandoff from '../components/workflow/PatientJourneyHandoff';

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  blood_type?: string;
}

interface InvoiceSummary {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  total_amount: string | number;
  amount_paid?: string | number;
  status: string;
  notes?: string;
  created_at: string;
  invoice_date?: string;
}

interface Encounter {
  id: number;
  encounter_number: string;
  patient_id: number;
  status: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  registered: 'bg-slate-100 text-slate-700',
  waiting_for_triage: 'bg-amber-100 text-amber-700',
  in_triage: 'bg-blue-100 text-blue-700',
  triage_completed: 'bg-blue-100 text-blue-700',
  department_assigned: 'bg-indigo-100 text-indigo-700',
  doctor_assigned: 'bg-violet-100 text-violet-700',
  waiting_for_doctor: 'bg-purple-100 text-purple-700',
  in_consultation: 'bg-cyan-100 text-cyan-700',
  services_ordered: 'bg-teal-100 text-teal-700',
  billing_generated: 'bg-orange-100 text-orange-700',
  payment_pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const statusLabels: Record<string, string> = {
  registered: 'Registered',
  waiting_for_triage: 'Waiting for Triage',
  in_triage: 'In Triage',
  triage_completed: 'Triage Completed',
  department_assigned: 'Dept. Assigned',
  doctor_assigned: 'Doctor Assigned',
  waiting_for_doctor: 'Waiting for Doctor',
  in_consultation: 'In Consultation',
  services_ordered: 'Services Ordered',
  billing_generated: 'Billing Generated',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  completed: 'Completed',
};

const ReceptionistWorkflow: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [selectedPatientInvoice, setSelectedPatientInvoice] = useState<InvoiceSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'encounters' | 'billing'>('search');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [printTicket, setPrintTicket] = useState<QueueTicketData | null>(null);
  const [wristbandPatient, setWristbandPatient] = useState<any | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const urlPatientId = searchParams.get('patient_id');

  useEffect(() => {
    if (urlPatientId) {
      const pid = parseInt(urlPatientId, 10);
      if (!isNaN(pid)) {
        loadPatientById(pid);
      }
    }
  }, [urlPatientId]);

  const fetchPatientInvoice = async (patientId: number) => {
    try {
      const res = await api.get(`/invoices?patient_id=${patientId}&limit=5`);
      const list = res.data?.data?.invoices || [];
      const pendingInv = list.find((i: any) => i.status === 'pending' || i.status === 'partial') || list[0] || null;
      setSelectedPatientInvoice(pendingInv);
    } catch {
      setSelectedPatientInvoice(null);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices?status=pending&limit=50');
      const list = res.data?.data?.invoices || [];
      setInvoices(Array.isArray(list) ? list : []);
    } catch {
      // ignore
    }
  };

  const applyCbhiWaiver = async (invoiceId: number) => {
    try {
      setLoading(true);
      await api.put(`/invoices/${invoiceId}`, {
        status: 'paid',
        discount: 50.00,
        notes: 'CBHI Member Card Verified - 100% Intake Card Fee Covered (Waiver Applied)'
      });
      showToast('success', 'CBHI Verification Applied! 50 ETB card fee waived.');
      fetchInvoices();
      if (selectedPatient) {
        fetchPatientInvoice(selectedPatient.id);
      }
    } catch {
      showToast('error', 'Failed to apply CBHI waiver');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientById = async (id: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/patients/${id}`);
      if (res.data?.success && res.data.data) {
        setSelectedPatient(res.data.data);
        fetchPatientInvoice(res.data.data.id);
        setActiveTab('search');
        setSearch(`${res.data.data.first_name} ${res.data.data.last_name}`);
        showToast('success', `Identified patient: ${res.data.data.first_name} ${res.data.data.last_name} (${res.data.data.mrn || 'ID #' + id})`);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handlePatientScanVerified = async (result: any) => {
    setShowScannerModal(false);
    const scannedPatient = result?.patient;
    if (!scannedPatient) return;
    try {
      const res = await api.get(`/patients/${scannedPatient.id}`);
      setSelectedPatient(res.data.data);
      fetchPatientInvoice(res.data.data.id);
      setSearch(`${scannedPatient.first_name} ${scannedPatient.last_name}`);
      setActiveTab('search');
      showToast('success', `Identified patient: ${scannedPatient.first_name} ${scannedPatient.last_name} (${scannedPatient.mrn || 'ID #' + scannedPatient.id})`);
    } catch {
      setSelectedPatient(scannedPatient);
      fetchPatientInvoice(scannedPatient.id);
      setActiveTab('search');
    }
  };

  // New patient form with 3 Intake Pathways
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: 'male',
    phone: '', email: '', blood_type: '', address: '', allergies: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    intake_pathway: 'self_pay' as 'self_pay' | 'cbhi' | 'emergency',
    insurance_number: '',
    waiver_reason: 'CBHI Membership Booklet Verified'
  });

  useEffect(() => {
    fetchEncounters();
    fetchInvoices();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEncounters = async () => {
    try {
      const res = await api.get('/encounters?status=registered&status=waiting_for_triage&limit=50');
      setEncounters(res.data.data.encounters || []);
    } catch { }
  };

  const searchPatients = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(search)}&limit=20`);
      setPatients(res.data.data.patients || []);
    } catch {
      showToast('error', 'Failed to search patients');
    } finally { setLoading(false); }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...regForm,
        firstName: regForm.first_name.trim(),
        lastName: regForm.last_name.trim(),
        dateOfBirth: regForm.date_of_birth,
        gender: regForm.gender,
        email: regForm.email.trim() || undefined,
        phone: regForm.phone.trim() || undefined,
      };

      const res = await api.post('/patients', payload);
      const patient = res.data?.data?.patient || res.data?.data || res.data?.patient;

      if (!patient || !patient.id) {
        throw new Error('Patient record was not returned by the server');
      }

      let successMsg = `Patient ${patient.first_name} ${patient.last_name} registered successfully!`;
      if (regForm.intake_pathway === 'cbhi') {
        successMsg += ' CBHI 50 ETB fee waived & authorized for Triage queue.';
      } else if (regForm.intake_pathway === 'emergency') {
        successMsg += ' Emergency intake priority activated; billing deferred.';
      } else {
        successMsg += ' 50 ETB Card Invoice created for Cashier clearance.';
      }

      showToast('success', successMsg);
      setSelectedPatient(patient);
      fetchPatientInvoice(patient.id);
      fetchInvoices();
      fetchEncounters();
      setShowRegForm(false);
      setRegForm({
        first_name: '', last_name: '', date_of_birth: '', gender: 'male',
        phone: '', email: '', blood_type: '', address: '', allergies: '',
        emergency_contact_name: '', emergency_contact_phone: '',
        intake_pathway: 'self_pay', insurance_number: '', waiver_reason: 'CBHI Membership Booklet Verified'
      });
      // Also add newly registered patient to the search list
      setPatients(prev => [patient, ...prev.filter(p => p.id !== patient.id)]);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const printOrReprintTicket = async (patientId: number, encounterId?: number) => {
    try {
      const res = await api.post('/opd', {
        patient_id: patientId,
        encounter_id: encounterId || null,
        department_id: 1,
        priority: 'normal'
      });
      if (res.data.data?.queue) {
        setPrintTicket(res.data.data.queue);
      }
    } catch (err: any) {
      showToast('error', 'Failed to generate queue ticket');
    }
  };

  const createEncounterAndSendToTriage = async (patientId: number, encounterType = 'outpatient') => {
    setLoading(true);
    try {
      // Create encounter
      const encRes = await api.post('/encounters', { patient_id: patientId, encounter_type: encounterType });
      const encounter = encRes.data.data.encounter;
      // Send to triage
      await api.post(`/encounters/${encounter.id}/send-to-triage`);
      showToast('success', `Encounter ${encounter.encounter_number} created & sent to triage!`);
      setSelectedPatient(null);
      fetchEncounters();
      // Generate OPD Queue ticket & trigger print modal
      await printOrReprintTicket(patientId, encounter.id);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to create encounter');
    } finally { setLoading(false); }
  };

  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase();
    const name = `${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(q) || String(p.id).includes(q) || (p.phone || '').includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Receptionist Desk
          </span>
          <h1 className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Patient Registration & Check-in</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Search, register, and send patients to triage</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <QrCode className="h-4 w-4" />
            <span>Scan Patient QR</span>
          </button>
          <button
            onClick={() => { setShowRegForm(true); setActiveTab('search'); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            <UserPlus className="h-4 w-4" />
            New Patient
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
        {[
          { key: 'search', label: 'Patient Search' },
          { key: 'encounters', label: `Active Encounters (${encounters.length})` },
          { key: 'billing', label: `Billing Hand-off (${invoices.length})` }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.key
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" /> Search Patient
            </h2>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchPatients()}
                placeholder="Search by name, ID, or phone..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={searchPatients}
                disabled={loading}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                title="Scan Patient QR Code via Camera"
                className="px-3 py-2.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-xl text-sm font-medium transition flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {filteredPatients.length === 0 && search && (
                <div className="text-center py-8">
                  <User className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No patients found</p>
                  <button
                    onClick={() => setShowRegForm(true)}
                    className="mt-3 text-blue-600 text-sm hover:underline font-medium"
                  >
                    + Register new patient
                  </button>
                </div>
              )}
              {filteredPatients.slice(0, 10).map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPatient(p);
                    fetchPatientInvoice(p.id);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition
                    ${selectedPatient?.id === p.id
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: #{p.id} · {p.phone || 'No phone'} · {p.blood_type || 'Blood type N/A'}
                    </div>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 ${selectedPatient?.id === p.id ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Patient Action Panel */}
          <div className="space-y-4">
            {selectedPatient ? (
              <div className="space-y-4">
                <PatientJourneyHandoff
                  currentStage="register"
                  patient={{
                    id: selectedPatient.id,
                    mrn: (selectedPatient as any).mrn || `PAT-${String(selectedPatient.id).padStart(4, '0')}`,
                    first_name: selectedPatient.first_name,
                    last_name: selectedPatient.last_name,
                    gender: selectedPatient.gender,
                    date_of_birth: selectedPatient.date_of_birth,
                    blood_type: selectedPatient.blood_type,
                    phone: selectedPatient.phone,
                    allergies: (selectedPatient as any).allergies
                  }}
                  nextActionLabel="Send Outpatient to Triage"
                  nextActionDescription="Patient verified at Reception desk. Create visit and route to Triage & Vitals desk."
                  onNextAction={() => createEncounterAndSendToTriage(selectedPatient.id, 'outpatient')}
                  nextActionLoading={loading}
                  secondaryAction={{
                    label: 'Print Wristband',
                    icon: Printer,
                    onClick: () => setWristbandPatient(selectedPatient)
                  }}
                />

                {/* Registration Fee & Intake Billing Status */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Intake Card Fee (50 ETB)
                        </h3>
                        <p className="text-[11px] text-slate-500">Registration fee & cashier clearance status</p>
                      </div>
                    </div>
                    {selectedPatientInvoice ? (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        selectedPatientInvoice.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : (selectedPatientInvoice.notes || '').includes('CBHI')
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                      }`}>
                        {selectedPatientInvoice.status === 'paid'
                          ? 'Paid ✓'
                          : (selectedPatientInvoice.notes || '').includes('CBHI')
                            ? 'CBHI Waived ✓'
                            : 'Pending Cashier'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Free / Exempt
                      </span>
                    )}
                  </div>

                  {selectedPatientInvoice && selectedPatientInvoice.status !== 'paid' && !(selectedPatientInvoice.notes || '').includes('CBHI') && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => navigate(`/cashier?patient_id=${selectedPatient.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 rounded-xl text-xs font-semibold transition"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Send to Cashier (Pay 50 ETB)</span>
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => applyCbhiWaiver(selectedPatientInvoice.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80 rounded-xl text-xs font-semibold transition"
                        title="Verify Ethiopian CBHI insurance card and waive 50 ETB fee"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Apply CBHI Waiver</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Create Visit by Acuity / Department:
                    </p>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear Selection
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['outpatient', 'emergency', 'inpatient'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => createEncounterAndSendToTriage(selectedPatient.id, type)}
                        disabled={loading}
                        className={`min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border font-bold text-xs transition disabled:opacity-50
                          ${type === 'emergency'
                            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                            : type === 'inpatient'
                              ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:border-purple-900 dark:text-purple-300'
                              : 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-300'
                          }`}
                      >
                        <span className="capitalize">{type}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
                <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select a patient to create an encounter</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{patients.length}</div>
                <div className="text-xs text-slate-500 mt-1">Search Results</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-2xl font-bold text-teal-600">{encounters.filter(e => e.status === 'waiting_for_triage').length}</div>
                <div className="text-xs text-slate-500 mt-1">Waiting for Triage</div>
              </div>
              <div
                onClick={() => setActiveTab('billing')}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-amber-400 hover:shadow-sm transition"
              >
                <div className="text-2xl font-bold text-amber-600">{invoices.length}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                  <span>Pending Card Fees</span>
                  <span className="text-amber-600 font-bold">→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Encounters Tab */}
      {activeTab === 'encounters' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Active Encounters</h2>
            <button onClick={fetchEncounters} className="text-slate-500 hover:text-slate-700">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {encounters.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No active encounters</div>
            ) : encounters.map(enc => (
              <div key={enc.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white text-sm">
                    {enc.first_name} {enc.last_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {enc.encounter_number} · {new Date(enc.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => printOrReprintTicket(enc.patient_id, enc.id)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    title="Print or reprint patient queue ticket"
                  >
                    <Printer className="h-3.5 w-3.5" /> Ticket
                  </button>
                  <button
                    onClick={() => setWristbandPatient({
                      id: enc.patient_id,
                      first_name: enc.first_name,
                      last_name: enc.last_name,
                      created_at: enc.created_at,
                      encounterId: enc.id
                    })}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    title="Print patient medical identification wristband"
                  >
                    <Printer className="h-3.5 w-3.5 text-indigo-600" /> Wristband
                  </button>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[enc.status] || 'bg-slate-100'}`}>
                    {statusLabels[enc.status] || enc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Hand-off Tab */}
      {activeTab === 'billing' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-500" />
                <h2 className="font-bold text-slate-900 dark:text-white text-lg">Intake & Registration Billing Hand-off</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Outstanding 50 ETB card registration fees waiting for Cashier collection or CBHI exemption verification.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchInvoices}
                className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title="Refresh invoices"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigate('/cashier')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
              >
                <span>Full Cashier Desk</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {invoices.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">All Intake Fees Cleared</p>
                <p className="text-xs text-slate-500 mt-1">No pending registration or intake invoices in the queue.</p>
              </div>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {inv.patient_name || `Patient #${inv.patient_id}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Inv #{inv.id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>Phone: {inv.patient_phone || 'N/A'}</span>
                      <span>•</span>
                      <span>Created: {new Date(inv.created_at || inv.invoice_date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-300 italic">{inv.notes || 'Intake Card Fee'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    <div className="text-right">
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {Number(inv.total_amount).toFixed(2)} ETB
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                        {inv.status}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          await loadPatientById(inv.patient_id);
                          setActiveTab('search');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
                        title="Load patient details in action panel"
                      >
                        Select & Triage
                      </button>
                      <button
                        onClick={() => navigate(`/cashier?patient_id=${inv.patient_id}`)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        title="Hand off patient to Cashier desk for payment"
                      >
                        <DollarSign className="h-3 w-3" />
                        <span>Send to Cashier</span>
                      </button>
                      <button
                        onClick={() => applyCbhiWaiver(inv.id)}
                        disabled={loading}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold transition"
                        title="Apply Ethiopian CBHI insurance card waiver"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Register New Patient Modal */}
      {showRegForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" /> Register New Patient
              </h2>
              <button onClick={() => setShowRegForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleRegisterPatient} className="space-y-4">
              {/* 3 Patient Intake Pathways */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Intake Pathway *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* 1. Self-Pay */}
                  <div
                    onClick={() => setRegForm(prev => ({ ...prev, intake_pathway: 'self_pay' }))}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      regForm.intake_pathway === 'self_pay'
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" /> 1. Self-Pay
                      </span>
                      <input
                        type="radio"
                        name="intake_pathway"
                        checked={regForm.intake_pathway === 'self_pay'}
                        onChange={() => setRegForm(prev => ({ ...prev, intake_pathway: 'self_pay' }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      50 ETB card registration fee at Cashier desk before triage.
                    </p>
                  </div>

                  {/* 2. CBHI / Indigent */}
                  <div
                    onClick={() => setRegForm(prev => ({ ...prev, intake_pathway: 'cbhi' }))}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      regForm.intake_pathway === 'cbhi'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" /> 2. CBHI / Indigent
                      </span>
                      <input
                        type="radio"
                        name="intake_pathway"
                        checked={regForm.intake_pathway === 'cbhi'}
                        onChange={() => setRegForm(prev => ({ ...prev, intake_pathway: 'cbhi' }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      1-Click Fee Waiver with Kebele Booklet verification.
                    </p>
                  </div>

                  {/* 3. Emergency */}
                  <div
                    onClick={() => setRegForm(prev => ({ ...prev, intake_pathway: 'emergency' }))}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      regForm.intake_pathway === 'emergency'
                        ? 'border-red-500 bg-red-50/70 dark:bg-red-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-red-800 dark:text-red-300 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> 3. Emergency
                      </span>
                      <input
                        type="radio"
                        name="intake_pathway"
                        checked={regForm.intake_pathway === 'emergency'}
                        onChange={() => setRegForm(prev => ({ ...prev, intake_pathway: 'emergency' }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Immediate clinical care · Zero upfront payment · Deferred billing.
                    </p>
                  </div>
                </div>

                {/* Conditional CBHI details */}
                {regForm.intake_pathway === 'cbhi' && (
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        CBHI Booklet / Policy Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AMH-KB-40291"
                        value={regForm.insurance_number}
                        onChange={e => setRegForm(prev => ({ ...prev, insurance_number: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-blue-200 dark:border-blue-700 dark:bg-slate-800 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        Waiver Justification / Audit Reason
                      </label>
                      <input
                        type="text"
                        value={regForm.waiver_reason}
                        onChange={e => setRegForm(prev => ({ ...prev, waiver_reason: e.target.value }))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-blue-200 dark:border-blue-700 dark:bg-slate-800 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'first_name', label: 'First Name', required: true },
                  { key: 'last_name', label: 'Last Name', required: true },
                  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
                  { key: 'phone', label: 'Phone', type: 'tel' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
                  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
                ].map(field => (
                  <div key={field.key} className={field.key === 'date_of_birth' ? 'col-span-1' : ''}>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      required={field.required}
                      value={(regForm as any)[field.key]}
                      onChange={e => setRegForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                  <select
                    value={regForm.gender}
                    onChange={e => setRegForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Blood Type</label>
                  <select
                    value={regForm.blood_type}
                    onChange={e => setRegForm(prev => ({ ...prev, blood_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={regForm.address}
                  onChange={e => setRegForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Known Allergies</label>
                <input
                  value={regForm.allergies}
                  onChange={e => setRegForm(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRegForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Printable Queue Ticket Modal ── */}
      {printTicket && (
        <QueueTokenTicket
          ticket={printTicket}
          onClose={() => setPrintTicket(null)}
          onReprint={() => {
            if (printTicket.patient_id) {
              printOrReprintTicket(printTicket.patient_id, printTicket.encounter_id);
            }
          }}
        />
      )}

      {/* ── Printable Patient Wristband Modal ── */}
      {wristbandPatient && (
        <PatientWristbandModal
          isOpen={!!wristbandPatient}
          onClose={() => setWristbandPatient(null)}
          patient={wristbandPatient}
          encounterId={wristbandPatient?.encounterId}
        />
      )}

      {/* ── Patient QR Scanner Modal ── */}
      {showScannerModal && (
        <WristbandScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onPatientVerified={handlePatientScanVerified}
          continueLabel="Select Patient Record"
        />
      )}
    </div>
  );
};

export default ReceptionistWorkflow;
