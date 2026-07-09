import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, Stethoscope, Calendar, Activity, TrendingUp,
  DollarSign, Pill, FlaskConical, FileText, Bed, AlertCircle, RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalPatients: number;
  activeDoctors: number;
  todayAppointments: number;
  availableBeds: number;
  pendingInvoices: number;
  currentAdmissions: number;
  todayRevenue: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
      const [statsRes, revenueRes, apptRes, diseaseRes, patientRes] = await Promise.allSettled([
        api.get('/reports/dashboard-stats'),
        api.get(`/reports/revenue?period=${revenuePeriod}`),
        api.get('/reports/appointments'),
        api.get('/reports/diseases'),
        api.get('/reports/patients'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (revenueRes.status === 'fulfilled') setRevenueData(revenueRes.value.data.data.chart || []);
      if (apptRes.status === 'fulfilled') setAppointmentData(
        (apptRes.value.data.data.byStatus || []).map((d: any) => ({
          name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
          value: parseInt(d.count)
        }))
      );
      if (diseaseRes.status === 'fulfilled') setDiseaseData(diseaseRes.value.data.data.topDiseases || []);
      if (patientRes.status === 'fulfilled') setPatientMonthly(patientRes.value.data.data.monthly || []);
    } catch (err) {
      setError('Failed to load some dashboard data. Showing available information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [revenuePeriod]);

  const statCards = [
    { name: 'Total Patients', value: stats?.totalPatients ?? '—', icon: Users, color: 'bg-blue-500', trend: '+12%' },
    { name: 'Active Doctors', value: stats?.activeDoctors ?? '—', icon: Stethoscope, color: 'bg-green-500', trend: '' },
    { name: "Today's Appointments", value: stats?.todayAppointments ?? '—', icon: Calendar, color: 'bg-purple-500', trend: '' },
    { name: 'Available Beds', value: stats?.availableBeds ?? '—', icon: Bed, color: 'bg-orange-500', trend: '' },
    { name: 'Current Admissions', value: stats?.currentAdmissions ?? '—', icon: Activity, color: 'bg-cyan-500', trend: '' },
    { name: 'Pending Invoices', value: stats?.pendingInvoices ?? '—', icon: FileText, color: 'bg-red-500', trend: '' },
    { name: "Today's Revenue", value: stats?.todayRevenue != null ? `$${stats.todayRevenue.toLocaleString()}` : '—', icon: DollarSign, color: 'bg-emerald-500', trend: '' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Hospital overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {loading ? <span className="animate-pulse bg-gray-200 dark:bg-gray-600 rounded h-7 w-16 inline-block" /> : stat.value}
                </p>
                {stat.trend && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />{stat.trend} this month
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Overview</h2>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setRevenuePeriod(p)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  revenuePeriod === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {loading || revenueData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{loading ? 'Loading chart...' : 'No revenue data yet'}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Status Pie */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Appointment Status</h2>
          {loading || appointmentData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{loading ? 'Loading...' : 'No appointment data'}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={appointmentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {appointmentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Patient Registrations Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">New Patients (Last 6 Months)</h2>
          {loading || patientMonthly.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{loading ? 'Loading...' : 'No registration data'}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={patientMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Patients" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Diseases */}
      {diseaseData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Diagnoses</h2>
          <div className="space-y-3">
            {diseaseData.slice(0, 8).map((d: any, i: number) => {
              const maxCount = parseInt(diseaseData[0]?.count || 1);
              const pct = (parseInt(d.count) / maxCount) * 100;
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-40 text-sm text-gray-700 dark:text-gray-300 truncate">{d.disease_name}</div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-8 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">{d.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Patients', href: '/patients', icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Appointments', href: '/appointments', icon: Calendar, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Invoices', href: '/invoices', icon: FileText, color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
          { label: 'Admissions', href: '/admissions', icon: Bed, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Lab Tests', href: '/lab-tests', icon: FlaskConical, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20' },
          { label: 'Medicines', href: '/medicines', icon: Pill, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all ${item.color}`}
          >
            <item.icon className="w-7 h-7 mb-2" />
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
