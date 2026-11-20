import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  QrCode, CalendarDays, ClipboardList, Users,
  Pill, FlaskConical, ArrowRight, RefreshCw, Stethoscope, ChevronRight
} from 'lucide-react';
import WristbandScannerModal from '../components/WristbandScannerModal';
import {
  DashboardHeader,
  StatisticCard,
  ChartCard,
  EmptyState
} from '../components/common/PremiumUI';

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

const DoctorDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handlePatientScanVerified = (result: any) => {
    setShowScannerModal(false);
    const patient = result?.patient;
    if (patient?.id) {
      navigate(`/consultation?patient_id=${patient.id}`);
    }
  };

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

      const upcoming = appointments.filter((item: any) => ['scheduled', 'confirmed'].includes(item.status)).slice(0, 6);
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
        prescriptions: prescriptions.slice(0, 5),
        labTests: labTests.slice(0, 5),
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
    { label: 'Today Appointments', amharic: 'የዛሬ ቀጠሮ', value: data?.stats.todayAppointments ?? 0, icon: CalendarDays, variant: 'blue' as const, subtitle: 'Scheduled visits' },
    { label: 'Pending Review', amharic: 'የሚጠበቁ', value: data?.stats.pendingAppointments ?? 0, icon: ClipboardList, variant: 'amber' as const, subtitle: 'Awaiting doctor' },
    { label: 'Active Patients', amharic: 'ንቁ ታካሚዎች', value: data?.stats.activePatients ?? 0, icon: Users, variant: 'cyan' as const, subtitle: 'Assigned today' },
    { label: 'Prescriptions', amharic: 'የታዘዙ መድኃኒት', value: data?.stats.prescriptions ?? 0, icon: Pill, variant: 'purple' as const, subtitle: 'Rx issued' },
    { label: 'Lab Tests', amharic: 'የላብራቶሪ ምርመራ', value: data?.stats.labTests ?? 0, icon: FlaskConical, variant: 'teal' as const, subtitle: 'Diagnostic orders' },
  ], [data]);

  return (
    <div className="space-y-6">
      {/* ── 1. Doctor Dashboard Header ───────────────────────────────── */}
      <DashboardHeader
        title="Physician Clinical Overview"
        amharicTitle="የሀኪም ክሊኒካል ማጠቃለያ"
        subtitle="Patient consultations, incoming lab results, electronic prescriptions, and appointment schedule"
        badge="Attending Physician"
        icon={Stethoscope}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/consultation')}
              className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Consultation Desk</span>
            </button>
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="h-9 px-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Patient</span>
            </button>
            <button
              type="button"
              onClick={fetchDoctorDashboard}
              disabled={loading}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          {error}
        </div>
      )}

      {/* ── 2. Gradient Statistic Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {doctorCards.map((card, idx) => (
          <StatisticCard
            key={idx}
            title={card.label}
            amharicTitle={card.amharic}
            value={loading ? '—' : card.value}
            icon={card.icon}
            variant={card.variant}
            subtitle={card.subtitle}
          />
        ))}
      </div>

      {/* ── 3. Main Clinical Workspace (Appointments & Latest Vitals) ── */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Upcoming Appointments */}
        <div className="xl:col-span-2">
          <ChartCard
            title="Today Scheduled Appointments"
            subtitle="Patients queued for direct outpatient consultation"
            actions={
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Schedule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading appointments telemetry...</div>
            ) : data?.appointments && data.appointments.length > 0 ? (
              <div className="space-y-2.5">
                {data.appointments.map(item => (
                  <div
                    key={item.id}
                    onClick={() => navigate('/consultation')}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200/80 dark:border-navy-800 hover:border-cyan-500/40 hover:bg-slate-100/60 dark:hover:bg-navy-850 transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {item.patient_name || 'Patient'}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {item.reason || 'General clinical follow-up'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {new Date(item.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Upcoming Appointments"
                description="No patients are currently scheduled for this window. Walk-ins from reception will appear automatically."
              />
            )}
          </ChartCard>
        </div>

        {/* Latest Clinical Vitals */}
        <div>
          <ChartCard
            title="Recent Intake Vitals"
            subtitle="Pre-consultation observations from triage nurses"
            actions={
              <button
                onClick={() => navigate('/vitals')}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Vitals Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading vitals stream...</div>
            ) : data?.vitals && data.vitals.length > 0 ? (
              <div className="space-y-2.5">
                {data.vitals.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {item.patient_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        HR: {item.heart_rate || '—'} bpm
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        SpO₂: {item.oxygen_saturation || '—'}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Recent Observations"
                description="Nursing staff have not recorded vitals for pending patients yet."
              />
            )}
          </ChartCard>
        </div>
      </div>

      {/* ── 4. Diagnostics & Prescriptions Activity ───────────────────── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Prescriptions */}
        <ChartCard
          title="Recent Electronic Prescriptions"
          subtitle="Medications ordered during today's clinical encounters"
          actions={
            <button
              onClick={() => navigate('/prescriptions')}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Pharmacy Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading prescriptions...</div>
          ) : data?.prescriptions && data.prescriptions.length > 0 ? (
            <div className="space-y-2">
              {data.prescriptions.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.medication_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.patient_name} • {item.dosage} • {item.frequency}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold text-[10px]">
                    Rx Active
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Prescriptions Issued"
              description="No active prescriptions have been logged for this shift yet."
            />
          )}
        </ChartCard>

        {/* Lab Test Queue */}
        <ChartCard
          title="Laboratory Diagnostic Orders"
          subtitle="Real-time test processing and abnormal result alerts"
          actions={
            <button
              onClick={() => navigate('/lab-tests')}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>All Lab Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading laboratory orders...</div>
          ) : data?.labTests && data.labTests.length > 0 ? (
            <div className="space-y-2">
              {data.labTests.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.test_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.patient_name}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-300 font-bold text-[10px] uppercase">
                    {item.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Laboratory Tests Queued"
              description="All diagnostic requests have been fulfilled or none are pending."
            />
          )}
        </ChartCard>
      </div>

      {/* ── 5. Wristband Scanner Modal ──────────────────────────────── */}
      {showScannerModal && (
        <WristbandScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onPatientVerified={handlePatientScanVerified}
          continueLabel="Open Clinical Consultation"
        />
      )}
    </div>
  );
};

export default DoctorDashboardPage;
