import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, X, LogOut, Bed, Users, CheckCircle2, ArrowRightLeft, RefreshCw } from 'lucide-react';
import RoleGuard from '../components/RoleGuard';
import { DashboardHeader, StatisticCard } from '../components/common/PremiumUI';

interface Admission {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  specialization: string;
  bed_number: string;
  ward: string;
  bed_type: string;
  admission_date: string;
  discharge_date: string;
  status: string;
  diagnosis: string;
  treatment_plan: string;
  total_charges: number;
}

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  admitted: { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
  discharged: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  transferred: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
};

const inp = 'w-full px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition';
const lbl = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5';

const AdmissionsPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [showModal, setShowModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [formData, setFormData] = useState({
    patient_id: '', bed_id: '', admitting_doctor_id: '', diagnosis: '', treatment_plan: ''
  });
  const [dischargeData, setDischargeData] = useState({ discharge_summary: '', total_charges: '' });

  useEffect(() => { fetchAdmissions(); }, [statusFilter]);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/admissions${params}`);
      setAdmissions(res.data.data.admissions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admissions', {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        bed_id: formData.bed_id ? parseInt(formData.bed_id) : undefined,
        admitting_doctor_id: formData.admitting_doctor_id ? parseInt(formData.admitting_doctor_id) : undefined,
      });
      setShowModal(false);
      fetchAdmissions();
    } catch (e) { alert('Failed to create admission'); }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admissions/${selectedAdmission?.id}/discharge`, {
        discharge_summary: dischargeData.discharge_summary,
        total_charges: dischargeData.total_charges ? parseFloat(dischargeData.total_charges) : 0
      });
      setShowDischargeModal(false);
      fetchAdmissions();
    } catch (e) { alert('Failed to discharge patient'); }
  };

  const filtered = admissions.filter(a =>
    a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.ward?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAdmitted = admissions.filter(a => a.status === 'admitted').length;
  const totalDischarged = admissions.filter(a => a.status === 'discharged').length;
  const totalTransferred = admissions.filter(a => a.status === 'transferred').length;

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'hospital_manager', 'doctor', 'nurse', 'receptionist']}>
      <div className="space-y-6">
        <DashboardHeader
          title="Inpatient Admissions & Ward Management"
          amharicTitle="የተኝተው ታካሚዎች ቅበላ እና አልጋ አመዳደብ"
          badge="Inpatient Services"
          icon={Bed}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAdmissions}
                disabled={loading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-navy-700/80 bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-500/40 transition disabled:opacity-50 cursor-pointer"
                title="Refresh Admissions"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                onClick={() => { setFormData({ patient_id: '', bed_id: '', admitting_doctor_id: '', diagnosis: '', treatment_plan: '' }); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Admit Patient</span>
              </button>
            </div>
          }
        />

        {/* Metric Telemetry Cards */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatisticCard
            title="Total Admissions"
            value={admissions.length}
            subtitle="All inpatient records"
            icon={Users}
            variant="cyan"
          />
          <StatisticCard
            title="Currently Admitted"
            value={totalAdmitted}
            subtitle="Occupying hospital beds"
            icon={Bed}
            variant="teal"
          />
          <StatisticCard
            title="Discharged"
            value={totalDischarged}
            subtitle="Completed hospital care"
            icon={CheckCircle2}
            variant="blue"
          />
          <StatisticCard
            title="Transferred"
            value={totalTransferred}
            subtitle="Referral or ward shift"
            icon={ArrowRightLeft}
            variant="amber"
          />
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name, ward, or room number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none transition cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="admitted">Admitted</option>
            <option value="discharged">Discharged</option>
            <option value="transferred">Transferred</option>
          </select>
        </div>

        {/* Mobile Cards (< sm) */}
        <div className="sm:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-500" />
              Loading admissions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-8 text-center text-slate-400">
              <Bed className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-500" />
              No admissions found
            </div>
          ) : (
            filtered.map(a => {
              const conf = statusConfig[a.status] || statusConfig.admitted;
              return (
                <div
                  key={a.id}
                  className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center shrink-0">
                        {a.patient_name?.[0] || 'P'}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {a.patient_name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {a.patient_phone || 'No phone recorded'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full border capitalize ${conf.bg} ${conf.text} ${conf.border}`}>
                      {a.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-navy-950/60 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400">Ward & Bed:</span>
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">{a.ward} {a.bed_number ? `· Bed ${a.bed_number}` : ''}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400">Attending Doctor:</span>
                      <span className="font-semibold">{a.doctor_name || '—'}</span>
                    </div>
                    {a.diagnosis && (
                      <div className="pt-1 border-t border-slate-200/50 dark:border-navy-800 text-slate-600 dark:text-slate-400">
                        Diagnosis: <span className="font-medium text-slate-800 dark:text-slate-200">{a.diagnosis}</span>
                      </div>
                    )}
                  </div>

                  {a.status === 'admitted' && (
                    <button
                      onClick={() => { setSelectedAdmission(a); setDischargeData({ discharge_summary: '', total_charges: '' }); setShowDischargeModal(true); }}
                      className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Discharge Patient</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Data Table (>= sm) */}
        <div className="hidden sm:block bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-navy-950/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-navy-800">
                <tr>
                  {['Patient', 'Doctor', 'Bed / Ward', 'Admitted', 'Diagnosis', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-500 opacity-60" />
                      Loading admissions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <Bed className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-500" />
                      No admissions found
                    </td>
                  </tr>
                ) : (
                  filtered.map(a => {
                    const conf = statusConfig[a.status] || statusConfig.admitted;
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-sm font-bold text-slate-900 dark:text-white">{a.patient_name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{a.patient_phone}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{a.doctor_name || '—'}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{a.specialization}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{a.ward}</span>
                          {a.bed_number && <span className="text-xs text-slate-500 dark:text-slate-400"> · Bed {a.bed_number}</span>}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                          {new Date(a.admission_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[160px] truncate" title={a.diagnosis}>
                          {a.diagnosis || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border capitalize ${conf.bg} ${conf.text} ${conf.border}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {a.status === 'admitted' && (
                            <button
                              onClick={() => { setSelectedAdmission(a); setDischargeData({ discharge_summary: '', total_charges: '' }); setShowDischargeModal(true); }}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 cursor-pointer"
                            >
                              <LogOut className="w-3.5 h-3.5" /> Discharge
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admission Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-full max-w-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Bed className="w-5 h-5 text-cyan-500" /> Admit Patient to Ward
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className={lbl}>Patient ID / Number</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1"
                    value={formData.patient_id}
                    onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Bed ID (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={formData.bed_id}
                    onChange={e => setFormData({ ...formData, bed_id: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Admitting Doctor ID</label>
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    value={formData.admitting_doctor_id}
                    onChange={e => setFormData({ ...formData, admitting_doctor_id: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Initial Clinical Diagnosis</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute appendicitis, Pneumonia"
                    value={formData.diagnosis}
                    onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Treatment Plan / Care Orders</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. IV fluids, pre-op antibiotics, surgical consult"
                    value={formData.treatment_plan}
                    onChange={e => setFormData({ ...formData, treatment_plan: e.target.value })}
                    className={inp}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-md transition cursor-pointer"
                  >
                    Confirm Admission
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Discharge Modal */}
        {showDischargeModal && selectedAdmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <LogOut className="w-5 h-5 text-rose-500" /> Patient Discharge Summary
                </h3>
                <button onClick={() => setShowDischargeModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleDischarge} className="space-y-3.5">
                <div>
                  <label className={lbl}>Discharge Clinical Summary</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Patient recovered, vital signs stable, wound healing normally..."
                    value={dischargeData.discharge_summary}
                    onChange={e => setDischargeData({ ...dischargeData, discharge_summary: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Total Inpatient Hospital Charges (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2400.00"
                    value={dischargeData.total_charges}
                    onChange={e => setDischargeData({ ...dischargeData, total_charges: e.target.value })}
                    className={inp}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                  <button
                    type="button"
                    onClick={() => setShowDischargeModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl shadow-md transition cursor-pointer"
                  >
                    Authorize Discharge
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default AdmissionsPage;
