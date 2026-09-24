import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { CalendarDays, FileText, FlaskConical, Pill, Receipt, RefreshCw, Bell } from 'lucide-react';

interface PortalData {
  patient?: { first_name: string; last_name: string; blood_type?: string; allergies?: string };
  appointments: Array<{ id: number; appointment_date: string; status: string; doctor_name: string; specialization?: string; reason?: string }>;
  diagnoses: Array<{ id: number; diagnosis_date: string; disease_name: string; severity?: string; notes?: string }>;
  prescriptions: Array<{ id: number; prescribed_date: string; medication_name: string; dosage: string; frequency: string; is_dispensed: boolean; workflow_status: string }>;
  labTests: Array<{ id: number; requested_date: string; test_name: string; status: string; workflow_status: string; results?: string; is_abnormal?: boolean }>;
  invoices: Array<{ id: number; invoice_date: string; total_amount: string; status: string }>;
  notifications: Array<{ id: number; title: string; message: string; is_read: boolean; created_at: string }>;
}

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800';

const PatientPortalPage: React.FC = () => {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPortal = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/portal/me');
      setData(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to load your portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPortal(); }, []);

  const name = data?.patient ? `${data.patient.first_name} ${data.patient.last_name}` : 'Patient';
  const summaryCards: Array<{ label: string; value: number; icon: React.ElementType; color: string }> = [
    { label: 'Appointments', value: data?.appointments.length || 0, icon: CalendarDays, color: 'text-blue-600' },
    { label: 'Lab reports', value: data?.labTests.filter(item => item.results).length || 0, icon: FlaskConical, color: 'text-cyan-600' },
    { label: 'Prescriptions', value: data?.prescriptions.length || 0, icon: Pill, color: 'text-violet-600' },
    { label: 'Invoices', value: data?.invoices.length || 0, icon: Receipt, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-600">Patient portal</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Welcome, {name}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your appointments, results, prescriptions, and billing in one place.</p>
        </div>
        <button onClick={loadPortal} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, color }) => (
          <div key={String(label)} className={card}>
            <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{loading ? '—' : value}</p></div><Icon className={`h-7 w-7 ${color}`} /></div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><CalendarDays className="h-5 w-5 text-blue-600" /> Appointments</h2>
          {data?.appointments.length ? <div className="space-y-3">{data.appointments.slice(0, 6).map(item => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div><p className="font-medium text-slate-900 dark:text-white">Dr. {item.doctor_name}</p><p className="text-sm text-slate-500">{new Date(item.appointment_date).toLocaleString()}</p></div><span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold capitalize text-blue-700">{item.status}</span></div>)}</div> : <p className="text-sm text-slate-500">No appointments found.</p>}
        </section>

        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><FlaskConical className="h-5 w-5 text-cyan-600" /> Lab results</h2>
          {data?.labTests.length ? <div className="space-y-3">{data.labTests.slice(0, 6).map(item => <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-center justify-between"><p className="font-medium text-slate-900 dark:text-white">{item.test_name}</p><span className={`text-xs font-semibold capitalize ${item.is_abnormal ? 'text-red-600' : 'text-emerald-600'}`}>{item.workflow_status || item.status}</span></div>{item.results && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{item.results}</p>}</div>)}</div> : <p className="text-sm text-slate-500">No lab tests found.</p>}
        </section>

        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Pill className="h-5 w-5 text-violet-600" /> Prescriptions</h2>
          {data?.prescriptions.length ? <div className="space-y-3">{data.prescriptions.slice(0, 6).map(item => <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-center justify-between"><p className="font-medium text-slate-900 dark:text-white">{item.medication_name}</p><span className="text-xs font-semibold capitalize text-violet-600">{item.workflow_status || (item.is_dispensed ? 'dispensed' : 'created')}</span></div><p className="text-sm text-slate-500">{item.dosage} · {item.frequency}</p></div>)}</div> : <p className="text-sm text-slate-500">No prescriptions found.</p>}
        </section>

        <section className={card}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Bell className="h-5 w-5 text-amber-600" /> Notifications</h2>
          {data?.notifications.length ? <div className="space-y-3">{data.notifications.slice(0, 6).map(item => <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-white">{item.title}</p><p className="text-sm text-slate-500">{item.message}</p></div>)}</div> : <p className="text-sm text-slate-500">You have no notifications.</p>}
        </section>
      </div>

      <section className={card}><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><FileText className="h-5 w-5 text-emerald-600" /> Diagnoses and billing</h2><div className="grid gap-4 md:grid-cols-2"><div>{data?.diagnoses.length ? data.diagnoses.slice(0, 5).map(item => <div key={item.id} className="mb-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="font-medium text-slate-900 dark:text-white">{item.disease_name}</p><p className="text-sm capitalize text-slate-500">{item.severity || 'Recorded'} · {new Date(item.diagnosis_date).toLocaleDateString()}</p></div>) : <p className="text-sm text-slate-500">No diagnoses recorded.</p>}</div><div>{data?.invoices.length ? data.invoices.slice(0, 5).map(item => <div key={item.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700"><span className="text-sm text-slate-700 dark:text-slate-300">Invoice #{item.id}</span><span className="text-sm font-semibold">{item.total_amount} · {item.status}</span></div>) : <p className="text-sm text-slate-500">No invoices found.</p>}</div></div></section>
    </div>
  );
};

export default PatientPortalPage;
