import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart3, Baby, FileText, GraduationCap, Stethoscope,
  BookOpen, ShieldCheck, Download, Award, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';

interface BoardStats {
  births: {
    total_births: number;
    births_this_month: number;
    certificates_issued: number;
    pending_verification: number;
    male_count: number;
    female_count: number;
    csection_count: number;
    vaginal_count: number;
  };
  deaths: {
    total_deaths: number;
    deaths_this_month: number;
    documents_issued: number;
    medically_verified_count: number;
    autopsy_count: number;
  };
  scholarships: {
    active_programs: number;
    total_financial_commitment: string | number;
    total_applications: number;
    awarded_count: number;
  };
  specializations: {
    active_programs: number;
    total_applicants: number;
    candidates_in_training: number;
    graduates_completed: number;
  };
  training: {
    total_trainings: number;
    total_ceu_offered: string | number;
    total_trainees_enrolled: number;
    trainees_certified: number;
  };
  governance: {
    active_board_members: number;
    total_meetings_convened: number;
    total_resolutions_passed: number;
  };
  recent_audit?: any[];
}



const BoardReportsPage: React.FC = () => {
  const [stats, setStats] = useState<BoardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/board/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error('Error fetching board stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const deliveryData = stats ? [
    { name: 'Spontaneous Vaginal', count: stats.births.vaginal_count || 0 },
    { name: 'Cesarean Section', count: stats.births.csection_count || 0 }
  ] : [];

  const programSummaryData = stats ? [
    { name: 'Births Issued', value: stats.births.certificates_issued },
    { name: 'Deaths Documented', value: stats.deaths.documents_issued },
    { name: 'Scholarships Awarded', value: stats.scholarships.awarded_count },
    { name: 'Specialists In Training', value: stats.specializations.candidates_in_training },
    { name: 'Staff Certified (CPD)', value: stats.training.trainees_certified },
    { name: 'Board Resolutions', value: stats.governance.total_resolutions_passed }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Board & Executive Administrative Reports
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Hospital-wide vital statistics, clinical governance milestones, and board decision monitoring.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Executive Report
        </button>
      </div>

      {loading || !stats ? (
        <div className="p-16 text-center text-gray-500">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          Aggregating governance and vital records data...
        </div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Births Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Deliveries</span>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <Baby className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.births.total_births}</span>
                <span className="text-xs text-emerald-600 ml-2 font-medium">+{stats.births.births_this_month} this month</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                <span>Issued Certs: {stats.births.certificates_issued}</span>
                <span>C-Section: {stats.births.csection_count}</span>
              </div>
            </div>

            {/* Deaths Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mortality Records</span>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.deaths.total_deaths}</span>
                <span className="text-xs text-slate-500 ml-2">Total Documented</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                <span>Verified: {stats.deaths.medically_verified_count}</span>
                <span>Autopsies: {stats.deaths.autopsy_count}</span>
              </div>
            </div>

            {/* Scholarships Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scholarship Funding</span>
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(stats.scholarships.total_financial_commitment).toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 ml-1">ETB</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                <span>Programs: {stats.scholarships.active_programs}</span>
                <span>Awarded: {stats.scholarships.awarded_count}</span>
              </div>
            </div>

            {/* Governance Card */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Board Resolutions</span>
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.governance.total_resolutions_passed}</span>
                <span className="text-xs text-purple-600 ml-2 font-medium">Adopted Policies</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                <span>Sessions: {stats.governance.total_meetings_convened}</span>
                <span>Trustees: {stats.governance.active_board_members}</span>
              </div>
            </div>
          </div>

          {/* Secondary Metric Strips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Specialization & CPD strip */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Medical Specializations & Residency</h4>
                  <p className="text-xs text-gray-500">{stats.specializations.active_programs} Active Disciplines · {stats.specializations.total_applicants} Applicants</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.specializations.candidates_in_training}</span>
                <span className="text-xs text-gray-500 block">Residents In Training</span>
              </div>
            </div>

            {/* Continuous Training */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Professional Development (CPD)</h4>
                  <p className="text-xs text-gray-500">{stats.training.total_trainings} Workshops · {stats.training.total_ceu_offered} CEU Credits Offered</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.training.trainees_certified}</span>
                <span className="text-xs text-gray-500 block">Staff Certified</span>
              </div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Methods Chart */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">
                Maternity Deliveries: Spontaneous Vaginal vs Cesarean
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Governance & Administrative Overview */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4">
                Executive Governance & Administrative Milestones
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={programSummaryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" stroke="#888888" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#888888" fontSize={11} width={130} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Audit Trail Table */}
          {stats.recent_audit && stats.recent_audit.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Recent Board & Administrative Audit Trail
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3">Module</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Performed By</th>
                      <th className="py-2 px-3">Entity Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {stats.recent_audit.map((log: any) => (
                      <tr key={log.id}>
                        <td className="py-2 px-3 text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-2 px-3 font-medium uppercase text-indigo-600">{log.module.replace('_', ' ')}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-800 dark:text-gray-200">
                          {log.performer_name || 'Admin'} ({log.performer_role})
                        </td>
                        <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                          {log.entity_type} #{log.entity_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BoardReportsPage;
