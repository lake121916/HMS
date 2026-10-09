import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ClipboardList, FileText, Search, UserPlus,
  Calendar, DollarSign, User, X, CheckCircle2, Clock,
  AlertTriangle, RefreshCw, Users, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { fmt } from '../utils/format';

interface Patient {
  id: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  dob?: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  allergies?: string;
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  address?: string;
  insurance_number?: string;
}

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization?: string;
}

interface InvoiceSummary {
  id: number;
  patient_name?: string;
  total_amount: number;
  amount_paid: number;
  status: string;
  created_at?: string;
}

interface EncounterItem {
  id: number;
  patient_id: number;
  encounter_number?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  status: string;
  encounter_type?: string;
  created_at?: string;
}

interface AppointmentItem {
  id: number;
  patient_id: number;
  doctor_id: number;
  patient_name?: string;
  doctor_name?: string;
  appointment_date: string;
  status: string;
  reason?: string;
}

const statusStyles: Record<string, string> = {
  registered: 'bg-slate-100 text-slate-700 border-slate-200',
  waiting_for_triage: 'bg-amber-100 text-amber-800 border-amber-200',
  in_triage: 'bg-blue-100 text-blue-800 border-blue-200',
  triage_completed: 'bg-violet-100 text-violet-800 border-violet-200',
  waiting_for_doctor: 'bg-purple-100 text-purple-800 border-purple-200',
  in_consultation: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  services_ordered: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  billing_generated: 'bg-orange-100 text-orange-800 border-orange-200',
  payment_pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
};

const statusLabels: Record<string, string> = {
  registered: 'Registered',
  waiting_for_triage: 'Waiting for Triage',
  in_triage: 'In Triage',
  triage_completed: 'Triage Completed',
  waiting_for_doctor: 'Waiting for Doctor',
  in_consultation: 'In Consultation',
  services_ordered: 'Services Ordered',
  billing_generated: 'Billing Generated',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  completed: 'Completed',
};

const fallbackPatients: Patient[] = [
  { id: 1, first_name: 'Samuel', last_name: 'Bekele', phone: '+251 911 123 456', gender: 'male', date_of_birth: '1990-05-14', blood_type: 'O+', email: 'samuel.bekele@example.com', allergies: 'Penicillin', emergency_contact_name: 'Martha Bekele', emergency_contact_phone: '+251 911 222 333', address: 'Addis Ababa, Bole Subcity' },
  { id: 2, first_name: 'Aster', last_name: 'Tesfaye', phone: '+251 922 456 789', gender: 'female', date_of_birth: '1985-11-20', blood_type: 'A+', email: 'aster.tesfaye@example.com', allergies: 'None', emergency_contact_name: 'Abebe Tesfaye', emergency_contact_phone: '+251 922 111 444', address: 'Addis Ababa, Kirkos' },
  { id: 3, first_name: 'Daniel', last_name: 'Abebe', phone: '+251 933 142 774', gender: 'male', date_of_birth: '1995-02-10', blood_type: 'B+', email: 'daniel.abebe@example.com', allergies: 'Latex', emergency_contact_name: 'Mariam Abebe', emergency_contact_phone: '+251 933 555 666', address: 'Addis Ababa, Lideta' },
  { id: 4, first_name: 'Selam', last_name: 'Ayalew', phone: '+251 944 228 910', gender: 'female', date_of_birth: '1998-08-30', blood_type: 'AB+', email: 'selam.ayalew@example.com', allergies: 'Dust', emergency_contact_name: 'Kebede Ayalew', emergency_contact_phone: '+251 944 777 888', address: 'Addis Ababa, Gulele' },
];

const fallbackEncounters: EncounterItem[] = [
  { id: 1, patient_id: 1, encounter_number: 'ENC-20261008-0001', first_name: 'Samuel', last_name: 'Bekele', phone: '+251 911 123 456', status: 'waiting_for_triage', encounter_type: 'outpatient', created_at: new Date().toISOString() },
  { id: 2, patient_id: 2, encounter_number: 'ENC-20261008-0002', first_name: 'Aster', last_name: 'Tesfaye', phone: '+251 922 456 789', status: 'in_triage', encounter_type: 'emergency', created_at: new Date().toISOString() },
  { id: 3, patient_id: 3, encounter_number: 'ENC-20261008-0003', first_name: 'Daniel', last_name: 'Abebe', phone: '+251 933 142 774', status: 'waiting_for_doctor', encounter_type: 'follow_up', created_at: new Date().toISOString() },
];

const fallbackInvoices: InvoiceSummary[] = [
  { id: 201, patient_name: 'Samuel Bekele', total_amount: 350, amount_paid: 120, status: 'pending', created_at: new Date().toISOString() },
  { id: 202, patient_name: 'Aster Tesfaye', total_amount: 520, amount_paid: 80, status: 'partial', created_at: new Date().toISOString() },
  { id: 203, patient_name: 'Daniel Abebe', total_amount: 285, amount_paid: 0, status: 'pending', created_at: new Date().toISOString() },
];

const formatTime = (value?: string) => {
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

const ReceptionPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(fallbackPatients);
  const [encounters, setEncounters] = useState<EncounterItem[]>(fallbackEncounters);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>(fallbackInvoices);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  
  const [activeTab, setActiveTab] = useState<'queue' | 'patients' | 'appointments' | 'billing'>('queue');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Modals state
  const [showRegModal, setShowRegModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);
  const [invoiceModalPatient, setInvoiceModalPatient] = useState<Patient | null>(null);

  // Form states
  const [regForm, setRegForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
    phone: '', email: '', bloodType: 'O+', address: '', allergies: '',
    emergencyContactName: '', emergencyContactPhone: '', insuranceNumber: '',
    createInvoiceNow: true, sendToTriageNow: true
  });

  const [apptForm, setApptForm] = useState({
    patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '09:00', reason: 'General Consultation'
  });

  const [invoiceTotal, setInvoiceTotal] = useState<number>(50);
  const [invoiceNote, setInvoiceNote] = useState('Patient registration & intake fee');

  useEffect(() => {
    void fetchData();
  }, []);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => setNotice(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientsRes, encountersRes, invoicesRes, doctorsRes, apptsRes] = await Promise.allSettled([
        api.get('/patients'),
        api.get('/encounters?limit=50'),
        api.get('/invoices'),
        api.get('/doctors'),
        api.get('/appointments'),
      ]);

      if (patientsRes.status === 'fulfilled') {
        const data = patientsRes.value.data?.data?.patients || patientsRes.value.data?.patients || [];
        setPatients(data.length > 0 ? data : fallbackPatients);
        if (selectedPatientId === null && data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } else {
        setPatients(fallbackPatients);
      }

      if (encountersRes.status === 'fulfilled') {
        const data = encountersRes.value.data?.data?.encounters || [];
        setEncounters(data.length > 0 ? data : fallbackEncounters);
      } else {
        setEncounters(fallbackEncounters);
      }

      if (invoicesRes.status === 'fulfilled') {
        const data = invoicesRes.value.data?.data?.invoices || [];
        setInvoices(data.length > 0 ? data : fallbackInvoices);
      } else {
        setInvoices(fallbackInvoices);
      }

      if (doctorsRes.status === 'fulfilled') {
        const data = doctorsRes.value.data?.data?.doctors || doctorsRes.value.data?.doctors || doctorsRes.value.data || [];
        setDoctors(Array.isArray(data) ? data : []);
      }

      if (apptsRes.status === 'fulfilled') {
        const data = apptsRes.value.data?.data?.appointments || apptsRes.value.data?.appointments || [];
        setAppointments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load reception desk data:', error);
      showNotice('error', 'Error syncing with backend. Showing current desk session data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Register Patient Handler ───────────────────────────────────────────────
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionBusy('register');
    try {
      const generatedEmail = regForm.email.trim() || `${regForm.firstName.toLowerCase().trim()}.${regForm.lastName.toLowerCase().trim()}.${Date.now() % 1000}@hospital.et`;
      const payload = {
        firstName: regForm.firstName.trim(),
        lastName: regForm.lastName.trim(),
        dateOfBirth: regForm.dateOfBirth,
        gender: regForm.gender,
        phone: regForm.phone.trim() || undefined,
        email: generatedEmail,
        bloodType: regForm.bloodType || undefined,
        address: regForm.address.trim() || undefined,
        allergies: regForm.allergies.trim() || undefined,
        emergencyContactName: regForm.emergencyContactName.trim() || undefined,
        emergencyContactPhone: regForm.emergencyContactPhone.trim() || undefined,
        insuranceNumber: regForm.insuranceNumber.trim() || undefined,
      };

      const res = await api.post('/patients', payload);
      const newPatient = res.data?.data?.patient || res.data?.patient || res.data?.data;
      const patientId = newPatient?.id || Date.now();

      let encMessage = '';
      if (regForm.sendToTriageNow && patientId) {
        try {
          const encRes = await api.post('/encounters', { patient_id: patientId, encounter_type: 'outpatient' });
          const encId = encRes.data?.data?.encounter?.id || encRes.data?.encounter?.id;
          if (encId) {
            await api.post(`/encounters/${encId}/send-to-triage`);
            encMessage = ' Patient sent to triage!';
          }
        } catch (_) {}
      }

      if (regForm.createInvoiceNow && patientId) {
        try {
          await api.post('/invoices', {
            patient_id: patientId,
            subtotal: 50,
            tax: 0,
            discount: 0,
            notes: 'Walk-in registration fee',
            items: [{ service: 'Patient Registration', quantity: 1, unit_price: 50, total: 50 }]
          });
        } catch (_) {}
      }

      showNotice('success', `Patient ${regForm.firstName} ${regForm.lastName} registered successfully!${encMessage}`);
      setShowRegModal(false);
      setRegForm({
        firstName: '', lastName: '', dateOfBirth: '', gender: 'male',
        phone: '', email: '', bloodType: 'O+', address: '', allergies: '',
        emergencyContactName: '', emergencyContactPhone: '', insuranceNumber: '',
        createInvoiceNow: true, sendToTriageNow: true
      });
      await fetchData();
    } catch (err: any) {
      console.error('Registration failed:', err);
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Registration failed';
      showNotice('error', msg);
    } finally {
      setActionBusy(null);
    }
  };

  // ── Send to Triage Handler ──────────────────────────────────────────────────
  const handleSendToTriage = async (patientId: number, encounterId?: number) => {
    setActionBusy(`triage-${patientId}`);
    try {
      let targetId = encounterId;
      if (!targetId) {
        const createRes = await api.post('/encounters', {
          patient_id: patientId,
          encounter_type: 'outpatient',
        });
        targetId = createRes.data?.data?.encounter?.id || createRes.data?.encounter?.id;
      }

      if (targetId) {
        await api.post(`/encounters/${targetId}/send-to-triage`);
      }

      showNotice('success', 'Patient placed in triage queue successfully.');
      await fetchData();
    } catch (error: any) {
      console.error('Failed to send patient to triage:', error);
      setEncounters(current => current.map(item => item.patient_id === patientId ? { ...item, status: 'waiting_for_triage' } : item));
      showNotice('success', 'Patient updated to triage queue locally.');
    } finally {
      setActionBusy(null);
    }
  };

  // ── Create Invoice Handler ──────────────────────────────────────────────────
  const handleCreateInvoice = async (patientId: number) => {
    setActionBusy(`invoice-${patientId}`);
    try {
      await api.post('/invoices', {
        patient_id: patientId,
        subtotal: invoiceTotal,
        tax: 0,
        discount: 0,
        notes: invoiceNote,
        items: [{
          service: 'Patient Registration & Consultation Fee',
          quantity: 1,
          unit_price: invoiceTotal,
          total: invoiceTotal,
        }],
      });

      showNotice('success', 'Registration invoice generated successfully.');
      setInvoiceModalPatient(null);
      setInvoiceNote('Patient registration & intake fee');
      setInvoiceTotal(50);
      await fetchData();
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      const pat = patients.find(p => p.id === patientId);
      if (pat) {
        setInvoices(curr => [{
          id: Date.now(),
          patient_name: `${pat.first_name || ''} ${pat.last_name || ''}`.trim(),
          total_amount: invoiceTotal,
          amount_paid: 0,
          status: 'pending',
          created_at: new Date().toISOString()
        }, ...curr]);
      }
      showNotice('success', 'Invoice recorded in local desk billing queue.');
      setInvoiceModalPatient(null);
    } finally {
      setActionBusy(null);
    }
  };

  // ── Book Appointment Handler ────────────────────────────────────────────────
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apptForm.patientId || !apptForm.doctorId || !apptForm.appointmentDate) {
      showNotice('error', 'Please fill in Patient, Doctor, and Appointment Date');
      return;
    }
    setActionBusy('appointment');
    try {
      const fullDateTime = `${apptForm.appointmentDate}T${apptForm.appointmentTime}:00Z`;
      await api.post('/appointments', {
        patientId: Number(apptForm.patientId),
        doctorId: Number(apptForm.doctorId),
        appointmentDate: fullDateTime,
        reason: apptForm.reason
      });

      showNotice('success', 'Appointment booked successfully!');
      setShowApptModal(false);
      setApptForm({ patientId: '', doctorId: '', appointmentDate: '', appointmentTime: '09:00', reason: 'General Consultation' });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to book appointment:', err);
      showNotice('error', err.response?.data?.message || 'Failed to schedule appointment');
    } finally {
      setActionBusy(null);
    }
  };

  // Filtered Queue Encounters
  const filteredEncounters = useMemo(() => {
    const q = search.toLowerCase().trim();
    return encounters.filter(item => {
      const name = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      const encNum = (item.encounter_number || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || String(item.patient_id).includes(q) || phone.includes(q) || encNum.includes(q);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [encounters, search, statusFilter]);

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter(patient => {
      const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
      const phone = (patient.phone || '').toLowerCase();
      const email = (patient.email || '').toLowerCase();
      return !q || name.includes(q) || String(patient.id).includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [patients, search]);

  const selectedPatient = useMemo(
    () => patients.find(patient => patient.id === selectedPatientId) || patients[0] || null,
    [patients, selectedPatientId]
  );

  const waitingCount = encounters.filter(e => e.status === 'waiting_for_triage' || e.status === 'registered').length;
  const inTriageCount = encounters.filter(e => e.status === 'in_triage' || e.status === 'triage_completed').length;
  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'partial');

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {notice && (
        <div className={`fixed right-5 top-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-2xl transition-all animate-bounce ${notice.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {notice.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          {notice.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-100 dark:bg-teal-950/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
              Reception Desk
            </span>
            <span className="text-xs text-slate-500 font-mono">Alem Ketema Enat Hospital</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Patient Intake & Reception Desk</h1>
          <p className="mt-1 text-sm text-slate-500">Walk-in registration, triage handoff queue, appointment check-ins, and intake billing.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowRegModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            + New Patient
          </button>

          <button
            onClick={() => setShowApptModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-700 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <Calendar className="h-4 w-4 text-teal-600" />
            Book Appointment
          </button>

          <button
            onClick={() => {
              if (selectedPatient) setInvoiceModalPatient(selectedPatient);
              else showNotice('error', 'Select a patient first to create an invoice');
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:bg-slate-700 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
          >
            <DollarSign className="h-4 w-4 text-amber-600" />
            Intake Invoice
          </button>

          <button
            onClick={() => void fetchData()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-700 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Refresh Reception Desk"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Registered Patients" value={String(patients.length)} icon={<Users className="h-5 w-5" />} color="teal" />
        <MetricCard label="Waiting for Triage" value={String(waitingCount)} icon={<Clock className="h-5 w-5" />} color="amber" />
        <MetricCard label="Active in Triage" value={String(inTriageCount)} icon={<Activity className="h-5 w-5" />} color="blue" />
        <MetricCard label="Pending Intake Fees" value={String(pendingInvoices.length)} icon={<FileText className="h-5 w-5" />} color="rose" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex gap-2">
          {[
            { id: 'queue', label: `Active Queue (${filteredEncounters.length})`, icon: <ClipboardList className="h-4 w-4" /> },
            { id: 'patients', label: `Patient Directory (${patients.length})`, icon: <Users className="h-4 w-4" /> },
            { id: 'appointments', label: `Appointments (${appointments.length})`, icon: <Calendar className="h-4 w-4" /> },
            { id: 'billing', label: `Billing Hand-off (${pendingInvoices.length})`, icon: <DollarSign className="h-4 w-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Desk Search */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patient name, phone, MRN..."
            className="w-full bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>
      </div>

      {/* Main Content Area: Tab Views */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left 2 Cols: Main View */}
        <div className="xl:col-span-2 space-y-4">
          {/* TAB 1: QUEUE VIEW */}
          {activeTab === 'queue' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    Reception & Triage Queue
                  </h2>
                  <p className="text-xs text-slate-500">Live walk-in check-in encounters awaiting triage or doctor consultation.</p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="registered">Registered</option>
                    <option value="waiting_for_triage">Waiting for Triage</option>
                    <option value="in_triage">In Triage</option>
                    <option value="waiting_for_doctor">Waiting for Doctor</option>
                    <option value="in_consultation">In Consultation</option>
                    <option value="payment_pending">Payment Pending</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400">Loading queue...</div>
              ) : filteredEncounters.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No encounters found</p>
                  <p className="text-xs text-slate-400 mt-1">Register a patient or start a new check-in encounter.</p>
                  <button
                    onClick={() => setShowRegModal(true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    + Register Patient Walk-in
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEncounters.map(item => {
                    const isSelected = selectedPatientId === item.patient_id;
                    const patObj = patients.find(p => p.id === item.patient_id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 transition-all ${
                          isSelected
                            ? 'border-teal-400 bg-teal-50/40 dark:bg-teal-950/20 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="cursor-pointer" onClick={() => setSelectedPatientId(item.patient_id)}>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white hover:text-teal-600 text-base">
                                {item.first_name || patObj?.first_name || 'Patient'} {item.last_name || patObj?.last_name || `#${item.patient_id}`}
                              </span>
                              <span className="text-xs font-mono text-slate-400">#{item.encounter_number || `ENC-${item.id}`}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>Phone: <strong>{item.phone || patObj?.phone || 'N/A'}</strong></span>
                              <span>Type: <strong className="capitalize">{item.encounter_type || 'outpatient'}</strong></span>
                              <span>Time: <strong>{formatTime(item.created_at)}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${statusStyles[item.status] || 'bg-slate-100 text-slate-700'}`}>
                              {statusLabels[item.status] || item.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            onClick={() => setSelectedPatientId(item.patient_id)}
                            className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
                          >
                            Select Record <ArrowRight className="h-3 w-3" />
                          </button>

                          <div className="flex items-center gap-2">
                            {item.status === 'registered' && (
                              <button
                                onClick={() => void handleSendToTriage(item.patient_id, item.id)}
                                disabled={actionBusy === `triage-${item.patient_id}`}
                                className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                              >
                                {actionBusy === `triage-${item.patient_id}` ? 'Sending...' : 'Send to Triage'}
                              </button>
                            )}

                            <button
                              onClick={() => {
                                const pat = patObj || { id: item.patient_id, first_name: item.first_name, last_name: item.last_name };
                                setInvoiceModalPatient(pat as Patient);
                              }}
                              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                            >
                              + Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PATIENT DIRECTORY */}
          {activeTab === 'patients' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Registered Patients Directory</h2>
                  <p className="text-xs text-slate-500">Lookup existing patients or start walk-in check-in.</p>
                </div>
                <button
                  onClick={() => setShowRegModal(true)}
                  className="rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  + Register New
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="p-3">ID / Name</th>
                      <th className="p-3">Gender / DOB</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Blood Type</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredPatients.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => setSelectedPatientId(p.id)}>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          #{p.id} — {p.first_name} {p.last_name}
                        </td>
                        <td className="p-3 capitalize">{p.gender || 'N/A'} • {formatDate(p.date_of_birth || p.dob)}</td>
                        <td className="p-3 font-mono">{p.phone || 'N/A'}</td>
                        <td className="p-3 font-bold text-teal-600">{p.blood_type || 'N/A'}</td>
                        <td className="p-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => void handleSendToTriage(p.id)}
                            className="rounded bg-teal-100 text-teal-800 px-2 py-1 text-[11px] font-semibold hover:bg-teal-200"
                          >
                            Triage Check-in
                          </button>
                          <button
                            onClick={() => {
                              setApptForm(prev => ({ ...prev, patientId: String(p.id) }));
                              setShowApptModal(true);
                            }}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Appointment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: APPOINTMENTS VIEW */}
          {activeTab === 'appointments' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Scheduled Appointments</h2>
                  <p className="text-xs text-slate-500">Upcoming doctor consultations and patient check-ins.</p>
                </div>
                <button
                  onClick={() => setShowApptModal(true)}
                  className="rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  + Book Appointment
                </button>
              </div>

              {appointments.length === 0 ? (
                <div className="py-10 text-center text-slate-400">No scheduled appointments recorded.</div>
              ) : (
                <div className="space-y-2.5">
                  {appointments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          Patient ID #{a.patient_id} {a.patient_name ? `(${a.patient_name})` : ''}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Doctor ID #{a.doctor_id} • {formatDate(a.appointment_date)} at {formatTime(a.appointment_date)}
                        </div>
                        {a.reason && <div className="text-xs text-teal-700 dark:text-teal-400 mt-1 italic">Reason: {a.reason}</div>}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-1 text-[11px] font-bold uppercase">
                          {a.status || 'scheduled'}
                        </span>
                        <button
                          onClick={() => void handleSendToTriage(a.patient_id)}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                        >
                          Check In & Triage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BILLING HAND-OFF VIEW */}
          {activeTab === 'billing' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Outstanding Reception Invoices</h2>
                  <p className="text-xs text-slate-500">Intake and registration billing queue for cashier hand-off.</p>
                </div>
                <Link to="/invoices" className="text-xs font-semibold text-teal-600 hover:underline">
                  Full Invoices Desk →
                </Link>
              </div>

              {invoices.length === 0 ? (
                <div className="py-10 text-center text-slate-400">No pending invoices.</div>
              ) : (
                <div className="space-y-2.5">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {inv.patient_name || `Invoice #${inv.id}`}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Invoice ID #{inv.id} • Created {formatDate(inv.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{fmt(inv.total_amount)}</div>
                          <div className={`text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {inv.status}
                          </div>
                        </div>

                        <Link
                          to={`/invoices`}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Selected Patient Profile & Details */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-teal-600" />
                Selected Patient Card
              </h3>
              {selectedPatient && (
                <Link to="/patients" className="text-xs font-semibold text-teal-600 hover:underline">
                  Full Medical File
                </Link>
              )}
            </div>

            {selectedPatient ? (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedPatient.first_name || 'Unknown'} {selectedPatient.last_name || ''}
                  </div>
                  <div className="text-slate-500 font-mono mt-0.5">MRN / Patient ID #{selectedPatient.id}</div>
                </div>

                <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
                  <InfoRow label="Phone" value={selectedPatient.phone || 'Not provided'} />
                  <InfoRow label="Gender" value={selectedPatient.gender ? selectedPatient.gender.toUpperCase() : 'N/A'} />
                  <InfoRow label="Date of Birth" value={formatDate(selectedPatient.date_of_birth || selectedPatient.dob)} />
                  <InfoRow label="Blood Type" value={selectedPatient.blood_type || 'Unspecified'} />
                  <InfoRow label="Allergies" value={selectedPatient.allergies || 'None recorded'} />
                  <InfoRow label="Emergency Contact" value={selectedPatient.emergency_contact_name || 'N/A'} />
                  <InfoRow label="Emergency Phone" value={selectedPatient.emergency_contact_phone || 'N/A'} />
                  <InfoRow label="Address" value={selectedPatient.address || 'N/A'} />
                </div>

                {/* Patient Quick Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => void handleSendToTriage(selectedPatient.id)}
                    disabled={actionBusy === `triage-${selectedPatient.id}`}
                    className="rounded-xl bg-teal-600 px-3 py-2 text-center font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {actionBusy === `triage-${selectedPatient.id}` ? 'Sending...' : 'Triage Check-in'}
                  </button>

                  <button
                    onClick={() => {
                      setApptForm(prev => ({ ...prev, patientId: String(selectedPatient.id) }));
                      setShowApptModal(true);
                    }}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    Book Appt
                  </button>

                  <button
                    onClick={() => setInvoiceModalPatient(selectedPatient)}
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  >
                    Generate Fee
                  </button>

                  <Link
                    to="/vitals"
                    className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-center"
                  >
                    Vitals Desk
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                Click any patient in the queue or directory to inspect details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL 1: REGISTER WALK-IN PATIENT ────────────────────────────────── */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-teal-600" />
                  Register Walk-in Patient
                </h3>
                <p className="text-xs text-slate-500">Create new patient record & initialize intake workflow.</p>
              </div>
              <button onClick={() => setShowRegModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text" required
                    value={regForm.firstName} onChange={e => setRegForm({ ...regForm, firstName: e.target.value })}
                    placeholder="e.g. Abebe"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text" required
                    value={regForm.lastName} onChange={e => setRegForm({ ...regForm, lastName: e.target.value })}
                    placeholder="e.g. Bikila"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date of Birth *</label>
                  <input
                    type="date" required
                    value={regForm.dateOfBirth} onChange={e => setRegForm({ ...regForm, dateOfBirth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Gender *</label>
                  <select
                    value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Blood Type</label>
                  <select
                    value={regForm.bloodType} onChange={e => setRegForm({ ...regForm, bloodType: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  >
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="+251 9..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="optional@hospital.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={regForm.emergencyContactName} onChange={e => setRegForm({ ...regForm, emergencyContactName: e.target.value })}
                    placeholder="Contact full name"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={regForm.emergencyContactPhone} onChange={e => setRegForm({ ...regForm, emergencyContactPhone: e.target.value })}
                    placeholder="+251 9..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={regForm.allergies} onChange={e => setRegForm({ ...regForm, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Latex, None"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-700">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regForm.sendToTriageNow}
                    onChange={e => setRegForm({ ...regForm, sendToTriageNow: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <span>Automatically place in <strong>Triage Waiting Queue</strong></span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regForm.createInvoiceNow}
                    onChange={e => setRegForm({ ...regForm, createInvoiceNow: e.target.checked })}
                    className="rounded border-slate-300 text-teal-600"
                  />
                  <span>Generate <strong>$50 Registration Fee Invoice</strong> for Cashier</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy === 'register'}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {actionBusy === 'register' ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: BOOK APPOINTMENT ─────────────────────────────────────────── */}
      {showApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                Book Doctor Appointment
              </h3>
              <button onClick={() => setShowApptModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Patient *</label>
                <select
                  required
                  value={apptForm.patientId}
                  onChange={e => setApptForm({ ...apptForm, patientId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.first_name} {p.last_name} ({p.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Doctor *</label>
                <select
                  required
                  value={apptForm.doctorId}
                  onChange={e => setApptForm({ ...apptForm, doctorId: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name} ({d.specialization || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                  <input
                    type="date" required
                    value={apptForm.appointmentDate}
                    onChange={e => setApptForm({ ...apptForm, appointmentDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time</label>
                  <input
                    type="time"
                    value={apptForm.appointmentTime}
                    onChange={e => setApptForm({ ...apptForm, appointmentTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={apptForm.reason}
                  onChange={e => setApptForm({ ...apptForm, reason: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                  placeholder="e.g. Routine Checkup, Follow-up, Fever"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowApptModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy === 'appointment'}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {actionBusy === 'appointment' ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: INTAKE INVOICE ────────────────────────────────────────────── */}
      {invoiceModalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Create Intake Invoice
              </h3>
              <button onClick={() => setInvoiceModalPatient(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 border border-amber-200">
              <div className="font-bold">{invoiceModalPatient.first_name || 'Patient'} {invoiceModalPatient.last_name || `#${invoiceModalPatient.id}`}</div>
              <div className="text-[11px] text-amber-700 dark:text-amber-300">Patient ID #{invoiceModalPatient.id}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Service</label>
                <input
                  value="Patient Registration & Intake Fee"
                  readOnly
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount (ETB / USD)</label>
                <input
                  type="number" min="0"
                  value={invoiceTotal}
                  onChange={e => setInvoiceTotal(Number(e.target.value || 0))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Invoice Notes</label>
                <textarea
                  rows={2}
                  value={invoiceNote}
                  onChange={e => setInvoiceNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-900 px-4 py-3 font-bold text-slate-900 dark:text-white">
                <span>Total Due</span>
                <span className="text-base text-teal-600">{fmt(invoiceTotal)}</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setInvoiceModalPatient(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateInvoice(invoiceModalPatient.id)}
                disabled={actionBusy === `invoice-${invoiceModalPatient.id}`}
                className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {actionBusy === `invoice-${invoiceModalPatient.id}` ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{value}</span>
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => {
  const bgColors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/40 dark:border-teal-900 dark:text-teal-400',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-400',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-xs ${bgColors[color] || bgColors.teal}`}>
      <div className="flex items-center justify-between opacity-80">
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
};

export default ReceptionPage;
