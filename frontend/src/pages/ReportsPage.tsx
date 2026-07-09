import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Calendar, Building2, FileBarChart } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'patients' | 'appointments' | 'departments' | 'diseases'>('revenue');
  const [revenueData, setRevenueData] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [apptData, setApptData] = useState<any>(null);
  const [deptData, setDeptData] = useState<any>(null);
  const [diseaseData, setDiseaseData] = useState<any>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);

  const fetchTab = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'revenue' && !revenueData) {
        const res = await api.get(`/reports/revenue?period=${revenuePeriod}`);
        setRevenueData(res.data.data);
      }
      if (tab === 'patients' && !patientData) {
        const res = await api.get('/reports/patients');
        setPatientData(res.data.data);
      }
      if (tab === 'appointments' && !apptData) {
        const res = await api.get('/reports/appointments');
        setApptData(res.data.data);
      }
      if (tab === 'departments' && !deptData) {
        const res = await api.get('/reports/department-performance');
        setDeptData(res.data.data);
      }
      if (tab === 'diseases' && !diseaseData) {
        const res = await api.get('/reports/diseases');
        setDiseaseData(res.data.data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTab(activeTab); }, [activeTab, revenuePeriod]);

  const tabs = [
    { id: 'revenue', label: 'Revenue', icon: TrendingUp },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'diseases', label: 'Top Diagnoses', icon: FileBarChart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Data-driven insights for hospital operations</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {revenueData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Today's Revenue", value: `$${parseFloat(revenueData.totals?.today || 0).toLocaleString()}`, color: 'text-green-600 dark:text-green-400' },
                { label: 'This Month', value: `$${parseFloat(revenueData.totals?.this_month || 0).toLocaleString()}`, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'This Year', value: `$${parseFloat(revenueData.totals?.this_year || 0).toLocaleString()}`, color: 'text-purple-600 dark:text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Chart</h2>
              <div className="flex gap-2">
                {(['week', 'month', 'year'] as const).map(p => (
                  <button key={p} onClick={() => { setRevenuePeriod(p); setRevenueData(null); }}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${revenuePeriod === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'}`}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {loading || !revenueData?.chart?.length ? (
              <div className="h-64 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No revenue data'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData.chart}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Patients Tab */}
      {activeTab === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Total Patients</h2>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{patientData?.totalPatients ?? (loading ? '...' : '—')}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Gender</h2>
              {patientData?.byGender?.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={patientData.byGender.map((g: any) => ({ name: g.gender, value: parseInt(g.count) }))}
                      cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {patientData.byGender.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-40 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No data'}</div>}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Registrations</h2>
            {patientData?.monthly?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={patientData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="New Patients" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-64 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No data'}</div>}
          </div>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">By Status</h2>
              {apptData?.byStatus?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={apptData.byStatus.map((d: any) => ({ name: d.status, value: parseInt(d.count) }))}
                      cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {apptData.byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-56 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No data'}</div>}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Volume</h2>
              {apptData?.monthly?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={apptData.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Appointments" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-56 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No data'}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Department Performance (Last 30 Days)</h2>
          {deptData?.departments?.length ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deptData.departments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="appointment_count" name="Appointments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="doctor_count" name="Doctors" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-4">Department</th>
                      <th className="py-2 pr-4">Doctors</th>
                      <th className="py-2 pr-4">Appointments</th>
                      <th className="py-2">Diagnoses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {deptData.departments.map((d: any, i: number) => (
                      <tr key={i} className="text-gray-700 dark:text-gray-300">
                        <td className="py-2 pr-4 font-medium">{d.name}</td>
                        <td className="py-2 pr-4">{d.doctor_count}</td>
                        <td className="py-2 pr-4">{d.appointment_count}</td>
                        <td className="py-2">{d.diagnosis_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className="h-64 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No data'}</div>}
        </div>
      )}

      {/* Diseases Tab */}
      {activeTab === 'diseases' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top 10 Diagnoses</h2>
          {diseaseData?.topDiseases?.length ? (
            <>
              <div className="space-y-3 mb-6">
                {diseaseData.topDiseases.map((d: any, i: number) => {
                  const max = parseInt(diseaseData.topDiseases[0]?.count || 1);
                  return (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-6 text-xs text-gray-500 dark:text-gray-400 text-right">{i + 1}.</div>
                      <div className="w-48 text-sm text-gray-700 dark:text-gray-300 truncate" title={d.disease_name}>{d.disease_name}</div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                        <div className="h-3 rounded-full" style={{ width: `${(parseInt(d.count) / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <div className="w-8 text-sm font-bold text-gray-700 dark:text-gray-300 text-right">{d.count}</div>
                    </div>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={diseaseData.topDiseases.map((d: any) => ({ name: d.disease_name.length > 15 ? d.disease_name.slice(0, 15) + '…' : d.disease_name, count: parseInt(d.count) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Cases" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : <div className="h-64 flex items-center justify-center text-gray-400">{loading ? 'Loading...' : 'No diagnosis data'}</div>}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
