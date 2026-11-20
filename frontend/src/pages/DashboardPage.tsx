import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Users, Stethoscope, Activity,
  Bed, AlertCircle, RefreshCw, Building2, Shield,
  CreditCard, FileText, ArrowUpRight
} from 'lucide-react';
import {
  DashboardHeader,
  WelcomeBanner,
  StatisticCard,
  ChartCard
} from '../components/common/PremiumUI';

const DashboardAnalyticsCharts = lazy(() => import('../components/dashboard/DashboardAnalyticsCharts'));

interface DashboardStats {
  totalPatients: number;
  activeDoctors: number;
  todayAppointments: number;
  availableBeds: number;
  pendingInvoices: number;
  currentAdmissions: number;
  todayRevenue: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalDepartments: number;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [appointmentData, setAppointmentData] = useState<any[]>([]);
  const [diseaseData, setDiseaseData] = useState<any[]>([]);
  const [patientMonthly, setPatientMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, adminRes, revenueRes, apptRes, diseaseRes, patientRes] = await Promise.allSettled([
        api.get('/reports/dashboard-stats'),
        api.get('/admin/stats'),
        api.get(`/reports/revenue?period=${revenuePeriod}`),
        api.get('/reports/appointments'),
        api.get('/reports/diseases'),
        api.get('/reports/patients'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (adminRes.status === 'fulfilled') setAdminStats(adminRes.value.data.data);
      if (revenueRes.status === 'fulfilled') setRevenueData(revenueRes.value.data.data.chart || []);
      if (apptRes.status === 'fulfilled') {
        setAppointmentData(
          (apptRes.value.data.data.byStatus || []).map((d: any) => ({
            name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
            value: parseInt(d.count) || 0
          }))
        );
      }
      if (diseaseRes.status === 'fulfilled') setDiseaseData(diseaseRes.value.data.data.topDiseases || []);
      if (patientRes.status === 'fulfilled') setPatientMonthly(patientRes.value.data.data.monthly || []);
    } catch {
      setError('Unable to load telemetry metrics. Showing active clinical state.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [revenuePeriod]);

  // Route role-guarded users to their primary workbench
  useEffect(() => {
    if (!user) return;
    const roleRouteMap: Record<string, string> = {
      super_admin:      '/dashboard',
      admin:            '/dashboard',
      hospital_manager: '/dashboard',
      receptionist:     '/reception-workflow',
      doctor:           '/consultation',
      nurse:            '/nurse',
      lab_technician:   '/lab-dashboard',
      pharmacist:       '/pharmacy',
      cashier:          '/cashier-workflow',
      patient:          '/patient-portal',
    };
    const target = roleRouteMap[user.role] || '/dashboard';
    if (target !== '/dashboard') {
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="space-y-6">
      {/* ── 1. Master Healthcare SaaS Header ─────────────────────────── */}
      <DashboardHeader
        title="Hospital Executive Command Center"
        amharicTitle="የሆስፒታል አመራር ማዕከል"
        subtitle="Real-time clinical census, revenue intelligence, and cross-department telemetry"
        badge={user?.role === 'super_admin' ? 'Super Admin' : 'Executive Overview'}
        icon={Building2}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/opd')}
              className="h-9 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Activity className="w-4 h-4" />
              <span>OPD Hub</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className="h-9 px-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className="h-9 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* ── 2. Luminous Welcome Banner ───────────────────────────────── */}
      <WelcomeBanner
        userName={`${user?.firstName || 'Staff'} ${user?.lastName || ''}`}
        roleName={user?.role?.replace(/_/g, ' ') || 'Executive'}
        departmentName="North Shewa Healthcare Network"
        metrics={[
          { label: 'Active Beds', value: stats?.availableBeds ?? '—' },
          { label: 'Admissions', value: stats?.currentAdmissions ?? '—' },
          { label: 'Revenue (ETB)', value: stats?.todayRevenue != null ? Number(stats.todayRevenue).toLocaleString() : '0' }
        ]}
      />

      {error && (
        <div className="flex items-center p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 3. Luminous Gradient Statistic Cards ─────────────────────── */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3 sm:gap-4">
        <StatisticCard
          title="Total Patients"
          amharicTitle="ጠቅላላ ታካሚዎች"
          value={adminStats?.totalPatients ?? stats?.totalPatients ?? '—'}
          icon={Users}
          variant="cyan"
          change="+14% mo"
          changeType="positive"
          subtitle="Hospital Census"
          onClick={() => navigate('/patients')}
        />
        <StatisticCard
          title="Medical Doctors"
          amharicTitle="ሀኪሞች"
          value={adminStats?.totalDoctors ?? stats?.activeDoctors ?? '—'}
          icon={Stethoscope}
          variant="blue"
          change="Full Roster"
          changeType="neutral"
          subtitle="Clinicians On Call"
          onClick={() => navigate('/doctors')}
        />
        <StatisticCard
          title="Clinical Units"
          amharicTitle="ክፍሎች"
          value={adminStats?.totalDepartments ?? 8}
          icon={Building2}
          variant="purple"
          subtitle="Departments"
          onClick={() => navigate('/departments-admin')}
        />
        <StatisticCard
          title="Admissions"
          amharicTitle="የተኛ ታካሚ"
          value={stats?.currentAdmissions ?? '—'}
          icon={Activity}
          variant="teal"
          change="Inpatient"
          changeType="neutral"
          subtitle="Ward Census"
          onClick={() => navigate('/admissions')}
        />
        <StatisticCard
          title="Available Beds"
          amharicTitle="ክፍት አልጋ"
          value={stats?.availableBeds ?? '—'}
          icon={Bed}
          variant="amber"
          subtitle="Ward Capacity"
          onClick={() => navigate('/beds')}
        />
        <StatisticCard
          title="Staff on Duty"
          amharicTitle="ሰራተኞች"
          value={adminStats?.activeUsers ?? '—'}
          icon={Shield}
          variant="cyan"
          subtitle="Authenticated"
          onClick={() => navigate('/user-management')}
        />
        <StatisticCard
          title="Today's Revenue"
          amharicTitle="የዛሬ ገቢ"
          value={stats?.todayRevenue != null ? `ETB ${Number(stats.todayRevenue).toLocaleString()}` : 'ETB 0'}
          icon={CreditCard}
          variant="teal"
          change="TeleBirr/Cash"
          changeType="positive"
          subtitle="Reconciled"
          onClick={() => navigate('/finance-reports')}
        />
      </div>

      {/* ── 4. Lazy-Loaded Clinical & Financial Telemetry Charts ──── */}
      <Suspense fallback={
        <div className="h-72 rounded-2xl bg-slate-900/40 border border-slate-800/80 animate-pulse flex flex-col items-center justify-center p-6 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Hydrating visual analytics telemetry...</p>
        </div>
      }>
        <DashboardAnalyticsCharts
          loading={loading}
          revenuePeriod={revenuePeriod}
          onPeriodChange={setRevenuePeriod}
          revenueData={revenueData}
          appointmentData={appointmentData}
          patientMonthly={patientMonthly}
        />
      </Suspense>

      {/* ── 6. Morbidity & Disease Analytics ─────────────────────────── */}
      {diseaseData.length > 0 && (
        <ChartCard
          title="Top Clinical Morbidities & Diagnoses"
          subtitle="Prevalence of clinical conditions recorded across OPD & Emergency consultations"
          actions={
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Full Morbidity Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {diseaseData.slice(0, 8).map((d: any, i: number) => {
              const maxCount = parseInt(diseaseData[0]?.count || 1);
              const pct = Math.min(100, Math.round(((parseInt(d.count) || 0) / maxCount) * 100));
              return (
                <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{d.disease_name}</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{d.count} cases</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default DashboardPage;
