/**
 * Receptionist Workflow Page
 * - Search/register patients
 * - Create encounters
 * - Send to triage queue
 */
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Search, UserPlus, ClipboardList, ArrowRight, RefreshCw,
  CheckCircle2, User
} from 'lucide-react';

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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'encounters'>('search');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // New patient form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: 'male',
    phone: '', email: '', blood_type: '', address: '', allergies: '',
    emergency_contact_name: '', emergency_contact_phone: ''
  });

  useEffect(() => { fetchEncounters(); }, []);

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
      const res = await api.post('/patients', regForm);
      const patient = res.data.data.patient;
      showToast('success', `Patient ${patient.first_name} ${patient.last_name} registered!`);
      setSelectedPatient(patient);
      setShowRegForm(false);
      setRegForm({
        first_name: '', last_name: '', date_of_birth: '', gender: 'male',
        phone: '', email: '', blood_type: '', address: '', allergies: '',
        emergency_contact_name: '', emergency_contact_phone: ''
      });
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
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
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Receptionist Desk
          </span>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Patient Registration & Check-in</h1>
          <p className="text-sm text-slate-500 mt-1">Search, register, and send patients to triage</p>
        </div>
        <button
          onClick={() => { setShowRegForm(true); setActiveTab('search'); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          <UserPlus className="h-4 w-4" />
          New Patient
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit">
        {[{ key: 'search', label: 'Patient Search' }, { key: 'encounters', label: `Active Encounters (${encounters.length})` }].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.key
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
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
                  onClick={() => setSelectedPatient(p)}
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
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Selected Patient</h2>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-900 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </div>
                      <div className="text-sm text-slate-500">
                        ID: #{selectedPatient.id} · {selectedPatient.gender} ·{' '}
                        {selectedPatient.date_of_birth
                          ? `${Math.floor((Date.now() - new Date(selectedPatient.date_of_birth).getTime()) / 3.154e10)} yrs`
                          : 'Age N/A'}
                      </div>
                      <div className="text-xs text-slate-400">{selectedPatient.phone} · {selectedPatient.email}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Create Encounter & Send to Triage:</p>
                  {(['outpatient', 'emergency', 'inpatient'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => createEncounterAndSendToTriage(selectedPatient.id, type)}
                      disabled={loading}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-medium text-sm transition disabled:opacity-50
                        ${type === 'emergency'
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : type === 'inpatient'
                            ? 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
                            : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                      <span className="capitalize">{type} Visit</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs opacity-70">Create & Send to Triage</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
                  >
                    ✕ Clear selection
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 text-center">
                <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select a patient to create an encounter</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{patients.length}</div>
                <div className="text-xs text-slate-500 mt-1">Search Results</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="text-2xl font-bold text-amber-600">{encounters.filter(e => e.status === 'waiting_for_triage').length}</div>
                <div className="text-xs text-slate-500 mt-1">Waiting for Triage</div>
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
              <div key={enc.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white text-sm">
                    {enc.first_name} {enc.last_name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {enc.encounter_number} · {new Date(enc.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[enc.status] || 'bg-slate-100'}`}>
                  {statusLabels[enc.status] || enc.status}
                </span>
              </div>
            ))}
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
    </div>
  );
};

export default ReceptionistWorkflow;
