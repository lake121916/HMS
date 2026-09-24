import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { CalendarDays, ClipboardList, Activity, Users, Pill, FlaskConical, ArrowRight, RefreshCw } from 'lucide-react';

interface DoctorDashboardData {
  stats: {
    todayAppointments: number;
    pendingAppointments: number;
    activePatients: number;
    prescriptions: number;
    labTests: number;
  };
  appointments: Array<{
    id: number;
    patient_name: string;
    appointment_date: string;
    status: string;
    reason: string;
  }>;
  vitals: Array<{
    id: number;
    patient_name: string;
    oxygen_saturation: number | string;
    heart_rate: number | string;
    recorded_at: string;
  }>;
  prescriptions: Array<{
    id: number;
    patient_name: string;
    medication_name: string;
    dosage: string;
    frequency: string;
  }>;
  labTests: Array<{
    id: number;
    patient_name: string;
    test_name: string;
    status: string;
  }>;
}

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800';

const DoctorDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DoctorDashboardData | null>(null);

  const fetchDoctorDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appointmentsRes, vitalsRes, prescriptionsRes, labTestsRes] = await Promise.allSettled([
        api.get('/appointments'),
        api.get('/vitals'),
        api.get('/prescriptions'),
        api.get('/lab-tests'),
      ]);

      const appointments = appointmentsRes.status === 'fulfilled' ? (appointmentsRes.value.data?.data?.appointments || []) : [];
      const vitals = vitalsRes.status === 'fulfilled' ? (vitalsRes.value.data?.data?.vitals || []) : [];
      const prescriptions = prescriptionsRes.status === 'fulfilled' ? (prescriptionsRes.value.data?.data?.prescriptions || []) : [];
      const labTests = labTestsRes.status === 'fulfilled' ? (labTestsRes.value.data?.data?.lab_tests || []) : [];

      const appointmentSummary: Record<string, number> = appointments.reduce((acc: Record<string, number>, item: any) => {
        const status = item.status || 'scheduled';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const upcoming = appointments.filter((item: any) => ['scheduled', 'confirmed'].includes(item.status)).slice(0, 5);
      const patientFocus = Array.from(new Set(vitals.map((item: any) => item.patient_name).filter(Boolean))).length;

      setData({
        stats: {
          todayAppointments: appointments.length,
          pendingAppointments: (appointmentSummary.confirmed || 0) + (appointmentSummary.scheduled || 0),
          activePatients: patientFocus,
          prescriptions: prescriptions.length,
          labTests: labTests.length,
        },
        appointments: upcoming,
        vitals: vitals.slice(0, 5),
        prescriptions: prescriptions.slice(0, 4),
        labTests: labTests.slice(0, 4),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load doctor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDashboard();
  }, []);

  const doctorCards = useMemo(() => [
    { label: 'Today appointments', value: data?.stats.todayAppointments ?? 0, icon: CalendarDays, color: 'bg-blue-500' },
    { label: 'Pending review', value: data?.stats.pendingAppointments ?? 0, icon: ClipboardList, color: 'bg-amber-500' },
    { label: 'Active patients', value: data?.stats.activePatients ?? 0, icon: Users, color: 'bg-emerald-500' },
    { label: 'Prescriptions', value: data?.stats.prescriptions ?? 0, icon: Pill, color: 'bg-violet-500' },
    { label: 'Lab tests', value: data?.stats.labTests ?? 0, icon: FlaskConical, color: 'bg-cyan-500' },
  ], [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Doctor portal</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Doctor dashboard</h1>
        </div>
        <button
          onClick={fetchDoctorDashboard}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {doctorCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cardClass}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{loading ? '—' : value}</p>
              </div>
              <div className={`rounded-xl p-3 text-white ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming appointments</h2>
            <button
              onClick={() => window.location.assign('/appointments')}
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
            >
              View all <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading appointments...</div>
          ) : data?.appointments && data.appointments.length > 0 ? (
            <div className="space-y-3">
              {data.appointments.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{item.patient_name || 'Unknown patient'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(item.appointment_date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                      {item.status}
                    </span>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.reason || 'General consultation'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming appointments found.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Latest vitals</h2>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading vitals...</div>
          ) : data?.vitals && data.vitals.length > 0 ? (
            <div className="space-y-3">
              {data.vitals.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-white">{item.patient_name}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.recorded_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    HR {item.heart_rate || '—'} · O₂ {item.oxygen_saturation || '—'}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No vitals recorded yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <Pill className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent prescriptions</h2>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading prescriptions...</div>
          ) : data?.prescriptions && data.prescriptions.length > 0 ? (
            <div className="space-y-3">
              {data.prescriptions.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">{item.medication_name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.patient_name} · {item.dosage} · {item.frequency}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No prescriptions found.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-4 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Lab test queue</h2>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Loading lab tests...</div>
          ) : data?.labTests && data.labTests.length > 0 ? (
            <div className="space-y-3">
              {data.labTests.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{item.test_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.patient_name}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    {item.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No lab tests found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboardPage;
