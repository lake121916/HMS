import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  CalendarDays, FileText, FlaskConical, Pill, Receipt, RefreshCw, Bell,
  User, AlertTriangle, Printer, Activity
} from 'lucide-react';

interface PortalData {
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    blood_type?: string;
    allergies?: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    insurance_number?: string;
  };
  appointments: Array<{
    id: number;
    appointment_date: string;
    status: string;
    doctor_name: string;
    specialization?: string;
    reason?: string;
  }>;
  diagnoses: Array<{
    id: number;
    diagnosis_date: string;
    disease_name: string;
    icd_code?: string;
    severity?: string;
    notes?: string;
  }>;
  prescriptions: Array<{
    id: number;
    prescribed_date: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
    is_dispensed: boolean;
    workflow_status: string;
  }>;
  labTests: Array<{
    id: number;
    requested_date: string;
    test_name: string;
    test_type?: string;
    status: string;
    workflow_status: string;
    results?: string;
    is_abnormal?: boolean;
    result_date?: string;
  }>;
  invoices: Array<{
    id: number;
    invoice_date: string;
    total_amount: string;
    status: string;
  }>;
  notifications: Array<{
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>;
}

type TabKey = 'overview' | 'appointments' | 'labs' | 'prescriptions' | 'billing' | 'notifications';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900';

const PatientPortalPage: React.FC = () => {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const loadPortal = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/portal/me');
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load your patient portal records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, []);

  const patient = data?.patient;
  const fullName = patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';

  const printHealthSummary = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & Patient Identity Card ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-300 shadow-inner">
            <User className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
                Patient Health Portal
              </span>
              {patient?.blood_type && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-400/30">
                  🩸 Blood: {patient.blood_type}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              Welcome, {fullName}
            </h1>
            <p className="text-xs text-teal-100/80 mt-0.5">
              MRN / ID: <span className="font-mono font-bold text-white">#ETH-PT-{patient?.id || '0000'}</span> ·
              {patient?.insurance_number ? (
                <span className="ml-2 font-medium">Policy: {patient.insurance_number}</span>
              ) : ' General Patient'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={printHealthSummary}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
          >
            <Printer className="h-4 w-4" /> Print Summary
          </button>
          <button
            onClick={loadPortal}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-md disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Allergies Warning Strip (If any) */}
      {patient?.allergies && (
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[11px] text-amber-800 dark:text-amber-300">
              Clinical Allergy Advisory:
            </p>
            <p className="font-medium mt-0.5">{patient.allergies}</p>
          </div>
        </div>
      )}

      {/* ── Summary Stat Pills ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Appointments', count: data?.appointments.length || 0, icon: CalendarDays, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Lab Reports', count: data?.labTests.length || 0, icon: FlaskConical, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' },
          { label: 'Prescriptions', count: data?.prescriptions.length || 0, icon: Pill, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40' },
          { label: 'Billing Invoices', count: data?.invoices.length || 0, icon: Receipt, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={card}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {loading ? '—' : stat.count}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'appointments', label: 'Appointments', icon: CalendarDays },
          { key: 'labs', label: 'Lab Results', icon: FlaskConical },
          { key: 'prescriptions', label: 'Prescriptions', icon: Pill },
          { key: 'billing', label: 'Invoices & Billing', icon: Receipt },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Appointments */}
          <section className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <CalendarDays className="h-5 w-5 text-blue-600" /> Recent Appointments
              </h2>
              <button onClick={() => setActiveTab('appointments')} className="text-xs font-bold text-teal-600 hover:underline">
                View All
              </button>
            </div>
            {data?.appointments.length ? (
              <div className="space-y-3">
                {data.appointments.slice(0, 3).map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Dr. {item.doctor_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.specialization || 'Clinical Doctor'} · {new Date(item.appointment_date).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No appointments scheduled.</p>
            )}
          </section>

          {/* Active Prescriptions */}
          <section className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Pill className="h-5 w-5 text-violet-600" /> Prescribed Medications
              </h2>
              <button onClick={() => setActiveTab('prescriptions')} className="text-xs font-bold text-teal-600 hover:underline">
                View All
              </button>
            </div>
            {data?.prescriptions.length ? (
              <div className="space-y-3">
                {data.prescriptions.slice(0, 3).map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{item.medication_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.dosage} · {item.frequency}</p>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                      item.is_dispensed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {item.is_dispensed ? '✓ Dispensed' : '⏳ Ready at Pharmacy'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No prescriptions recorded.</p>
            )}
          </section>

          {/* Lab Test Results */}
          <section className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <FlaskConical className="h-5 w-5 text-cyan-600" /> Diagnostic Lab Findings
              </h2>
              <button onClick={() => setActiveTab('labs')} className="text-xs font-bold text-teal-600 hover:underline">
                View All
              </button>
            </div>
            {data?.labTests.length ? (
              <div className="space-y-3">
                {data.labTests.slice(0, 3).map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{item.test_name}</p>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        item.is_abnormal ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.results && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono">
                        {item.results}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No lab tests on record.</p>
            )}
          </section>

          {/* Clinical Diagnoses History */}
          <section className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <FileText className="h-5 w-5 text-emerald-600" /> Recorded Diagnoses
              </h2>
            </div>
            {data?.diagnoses.length ? (
              <div className="space-y-3">
                {data.diagnoses.slice(0, 4).map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{item.disease_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(item.diagnosis_date).toLocaleDateString()} · {item.severity || 'Managed'}
                      </p>
                    </div>
                    {item.icd_code && (
                      <span className="font-mono text-xs font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        {item.icd_code}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No diagnoses recorded.</p>
            )}
          </section>
        </div>
      )}

      {/* ── TAB 2: APPOINTMENTS ── */}
      {activeTab === 'appointments' && (
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <CalendarDays className="h-5 w-5 text-blue-600" /> All Medical Consultations & Appointments
          </h2>
          {data?.appointments.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.appointments.map(item => (
                <div key={item.id} className="py-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Dr. {item.doctor_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.specialization || 'Clinical Doctor'} · {item.reason || 'General Checkup'}</p>
                    <p className="text-xs text-slate-400 mt-1">Scheduled: {new Date(item.appointment_date).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-3 py-1 text-xs font-bold capitalize text-blue-700 dark:text-blue-300">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No appointments found.</p>
          )}
        </section>
      )}

      {/* ── TAB 3: LAB RESULTS ── */}
      {activeTab === 'labs' && (
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <FlaskConical className="h-5 w-5 text-cyan-600" /> Laboratory Reports & Investigative Panels
          </h2>
          {data?.labTests.length ? (
            <div className="space-y-4">
              {data.labTests.map(item => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{item.test_name}</p>
                      <p className="text-xs text-slate-500">Requested: {new Date(item.requested_date).toLocaleDateString()} · {item.test_type || 'Biochemistry'}</p>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full uppercase ${
                      item.is_abnormal ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  {item.results ? (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Laboratory Findings:</p>
                      <p className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{item.results}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400 italic">Specimen under laboratory investigation...</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No laboratory tests recorded.</p>
          )}
        </section>
      )}

      {/* ── TAB 4: PRESCRIPTIONS ── */}
      {activeTab === 'prescriptions' && (
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Pill className="h-5 w-5 text-violet-600" /> Doctor Prescriptions & Dosage Instructions
          </h2>
          {data?.prescriptions.length ? (
            <div className="space-y-3">
              {data.prescriptions.map(item => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{item.medication_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                      {item.dosage} · {item.frequency} {item.duration ? `· Duration: ${item.duration}` : ''}
                    </p>
                    {item.instructions && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
                        Instructions: {item.instructions}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">Prescribed: {new Date(item.prescribed_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                    item.is_dispensed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}>
                    {item.is_dispensed ? '✓ Dispensed' : '⏳ Pending Dispensation'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No active prescriptions.</p>
          )}
        </section>
      )}

      {/* ── TAB 5: BILLING ── */}
      {activeTab === 'billing' && (
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Receipt className="h-5 w-5 text-amber-600" /> Hospital Invoices & Statements
          </h2>
          {data?.invoices.length ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.invoices.map(item => (
                <div key={item.id} className="py-3.5 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-bold text-xs text-slate-900 dark:text-white">Invoice #{item.id}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(item.invoice_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{item.total_amount} ETB</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      item.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No invoices found.</p>
          )}
        </section>
      )}

      {/* ── TAB 6: NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Bell className="h-5 w-5 text-teal-600" /> Notifications & Hospital Announcements
          </h2>
          {data?.notifications.length ? (
            <div className="space-y-3">
              {data.notifications.map(item => (
                <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs text-slate-900 dark:text-white">{item.title}</p>
                    <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">You have no new notifications.</p>
          )}
        </section>
      )}
    </div>
  );
};

export default PatientPortalPage;
