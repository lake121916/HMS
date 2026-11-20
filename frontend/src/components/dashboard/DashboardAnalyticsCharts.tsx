import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, Calendar, Users } from 'lucide-react';
import { ChartCard } from '../common/PremiumUI';

interface RevenuePoint {
  period: string;
  revenue: number;
}

interface DistributionItem {
  name: string;
  value: number;
}

interface MonthlyIntakeItem {
  month: string;
  count: number;
}

interface DashboardAnalyticsChartsProps {
  loading: boolean;
  revenuePeriod: 'week' | 'month' | 'year';
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
  revenueData: RevenuePoint[];
  appointmentData: DistributionItem[];
  patientMonthly: MonthlyIntakeItem[];
}

const PIE_COLORS = ['#06b6d4', '#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

export const DashboardAnalyticsCharts: React.FC<DashboardAnalyticsChartsProps> = ({
  loading,
  revenuePeriod,
  onPeriodChange,
  revenueData,
  appointmentData,
  patientMonthly,
}) => {
  return (
    <>
      {/* ── Revenue Collections Area Chart ── */}
      <ChartCard
        title="Hospital Financial Performance & Revenue Stream"
        subtitle="Consolidated outpatient, pharmacy, lab, and inpatient service receipts (ETB)"
        actions={
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['week', 'month', 'year'] as const).map(period => (
              <button
                key={period}
                type="button"
                onClick={() => onPeriodChange(period)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize cursor-pointer ${
                  revenuePeriod === period
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-72 w-full pt-2">
          {loading || revenueData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <div className="text-center space-y-2">
                <Activity className="w-8 h-8 mx-auto opacity-30 animate-pulse text-cyan-400" />
                <p>{loading ? 'Aggregating financial telemetry...' : 'No revenue records for this window'}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="premiumRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1d38',
                    borderColor: 'rgba(6, 182, 212, 0.3)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                  }}
                  formatter={(v: any) => [`ETB ${parseFloat(v).toLocaleString()}`, 'Collections']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#premiumRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* ── Analytics Row (Appointment Distribution & Registrations) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Status Breakdown */}
        <ChartCard
          title="Clinical Appointment Acuity & Status"
          subtitle="Real-time patient bookings, completed consults, and cancellations"
        >
          <div className="h-64 flex items-center justify-center">
            {loading || appointmentData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs">
                <Calendar className="w-8 h-8 mx-auto opacity-30 mb-2 text-cyan-400" />
                <p>{loading ? 'Loading appointment telemetry...' : 'No appointment data recorded'}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={appointmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {appointmentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1d38',
                      borderColor: 'rgba(6, 182, 212, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* Patient Registration Trends */}
        <ChartCard
          title="Patient Intake Volume (Last 6 Months)"
          subtitle="Monthly outpatient & inpatient registrations across all intake pathways"
        >
          <div className="h-64 flex items-center justify-center">
            {loading || patientMonthly.length === 0 ? (
              <div className="text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto opacity-30 mb-2 text-teal-400" />
                <p>{loading ? 'Aggregating patient intake logs...' : 'No monthly registration records'}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1d38',
                      borderColor: 'rgba(20, 184, 166, 0.3)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" name="Patients" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>
    </>
  );
};

export default DashboardAnalyticsCharts;
