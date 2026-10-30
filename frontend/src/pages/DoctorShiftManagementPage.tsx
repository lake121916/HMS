import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Calendar, Clock, UserCheck, ShieldAlert, CheckCircle2,
  AlertTriangle, PlusCircle, RefreshCw, ArrowRightLeft,
  Building2, Check
} from 'lucide-react';

interface DoctorShift {
  id: number;
  doctor_id?: number;
  user_id?: number;
  staff_role?: string;
  staff_name?: string;
  department_id?: number;
  shift_date: string;
  shift_type: 'morning' | 'evening' | 'night' | 'on_call' | 'custom';
  start_time: string;
  end_time: string;
  status: string;
  is_on_duty: boolean;
  max_active_patients: number;
  notes?: string;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_specialization?: string;
  doctor_phone?: string;
  department_name?: string;
  active_patient_load?: number;
}

interface OnDutyDoctor {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  phone?: string;
  department_id?: number;
  department_name?: string;
  shift_id?: number;
  shift_type?: string;
  start_time?: string;
  end_time?: string;
  is_on_duty: boolean;
  max_active_patients: number;
  active_workload: number;
}

interface ClinicalHandover {
  id: number;
  shift_id?: number;
  from_doctor_id: number;
  to_doctor_id: number;
  patient_id: number;
  encounter_id?: number;
  pending_tasks?: string;
  clinical_notes?: string;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_mrn: string;
  patient_gender?: string;
  from_doctor_first_name: string;
  from_doctor_last_name: string;
  to_doctor_first_name: string;
  to_doctor_last_name: string;
  encounter_number?: string;
  encounter_status?: string;
}

export const DoctorShiftManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'duty' | 'roster' | 'handover'>('duty');
  const [shifts, setShifts] = useState<DoctorShift[]>([]);
  const [onDutyList, setOnDutyList] = useState<OnDutyDoctor[]>([]);
  const [handovers, setHandovers] = useState<ClinicalHandover[]>([]);
  const { user: currentUser } = useAuth();
  const canManageShifts = ['super_admin', 'admin', 'hospital_manager'].includes(currentUser?.role || '');
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'nurse' | 'lab_technician' | 'pharmacist'>('all');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [shiftForm, setShiftForm] = useState({
    staff_role: 'doctor',
    user_id: '',
    doctor_id: '',
    department_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: 'morning',
    start_time: '08:00',
    end_time: '16:00',
    max_active_patients: 20,
    is_on_duty: true,
    notes: ''
  });

  const [handoverForm, setHandoverForm] = useState({
    to_doctor_id: '',
    patient_id: '',
    encounter_id: '',
    pending_tasks: '',
    clinical_notes: ''
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftsRes, onDutyRes, handoversRes, staffRes, docsRes, deptsRes] = await Promise.all([
        api.get(`/shifts?shift_date=${filterDate}`),
        api.get('/shifts/on-duty'),
        api.get('/shifts/handovers'),
        api.get('/shifts/staff'),
        api.get('/doctors'),
        api.get('/departments')
      ]);

      setShifts(shiftsRes.data?.data || []);
      setOnDutyList(onDutyRes.data?.data || []);
      setHandovers(handoversRes.data?.data || []);
      setStaffList(staffRes.data?.data || []);
      setDoctors(docsRes.data?.data?.doctors || docsRes.data?.data || []);
      setDepartments(deptsRes.data?.data?.departments || deptsRes.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load shift data', err);
      showNotification('error', err.response?.data?.message || 'Failed to load shift data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDate]);

  const handlePresetChange = (type: string) => {
    let start = '08:00';
    let end = '16:00';
    if (type === 'evening') { start = '16:00'; end = '00:00'; }
    if (type === 'night')   { start = '00:00'; end = '08:00'; }
    if (type === 'on_call') { start = '08:00'; end = '08:00'; }

    setShiftForm(f => ({
      ...f,
      shift_type: type,
      start_time: start,
      end_time: end
    }));
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftForm.doctor_id && !shiftForm.user_id) {
      showNotification('error', 'Please select a staff member');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/shifts', {
        doctor_id: shiftForm.doctor_id ? parseInt(shiftForm.doctor_id) : undefined,
        user_id: shiftForm.user_id ? parseInt(shiftForm.user_id) : undefined,
        staff_role: shiftForm.staff_role,
        department_id: shiftForm.department_id ? parseInt(shiftForm.department_id) : undefined,
        shift_date: shiftForm.shift_date,
        shift_type: shiftForm.shift_type,
        start_time: shiftForm.start_time + (shiftForm.start_time.length === 5 ? ':00' : ''),
        end_time: shiftForm.end_time + (shiftForm.end_time.length === 5 ? ':00' : ''),
        max_active_patients: parseInt(String(shiftForm.max_active_patients)),
        is_on_duty: shiftForm.is_on_duty,
        notes: shiftForm.notes
      });

      showNotification('success', 'Staff shift scheduled successfully');
      setShowScheduleModal(false);
      setShiftForm({
        staff_role: 'doctor',
        user_id: '',
        doctor_id: '',
        department_id: '',
        shift_date: new Date().toISOString().split('T')[0],
        shift_type: 'morning',
        start_time: '08:00',
        end_time: '16:00',
        max_active_patients: 20,
        is_on_duty: true,
        notes: ''
      });
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to schedule shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelShift = async (shiftId: number) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled shift?')) return;
    try {
      await api.delete(`/shifts/${shiftId}`);
      showNotification('success', 'Shift cancelled successfully');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to cancel shift');
    }
  };

  const handleToggleDuty = async (shiftId: number) => {
    try {
      const res = await api.put(`/shifts/${shiftId}/toggle-duty`);
      showNotification('success', res.data?.message || 'Duty status updated');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update duty status');
    }
  };

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverForm.to_doctor_id || !handoverForm.patient_id) {
      showNotification('error', 'Please select incoming doctor and enter patient ID');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/shifts/handover', {
        to_doctor_id: parseInt(handoverForm.to_doctor_id),
        patient_id: parseInt(handoverForm.patient_id),
        encounter_id: handoverForm.encounter_id ? parseInt(handoverForm.encounter_id) : undefined,
        pending_tasks: handoverForm.pending_tasks,
        clinical_notes: handoverForm.clinical_notes
      });

      showNotification('success', 'Clinical handover submitted and patient transferred successfully');
      setShowHandoverModal(false);
      setHandoverForm({
        to_doctor_id: '',
        patient_id: '',
        encounter_id: '',
        pending_tasks: '',
        clinical_notes: ''
      });
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to submit clinical handover');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeHandover = async (id: number) => {
    try {
      await api.put(`/shifts/handovers/${id}/acknowledge`);
      showNotification('success', 'Handover acknowledged and verified by incoming clinician');
      loadData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to acknowledge handover');
    }
  };

  const pendingHandovers = handovers.filter(h => !h.is_acknowledged);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-rose-600 text-white'
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-4 font-black">×</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" /> Alem Ketema Enat Hospital · North Shewa
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Staff Shift Management & Clinical Duty Roster
          </h1>
          <p className="text-blue-200 text-xs sm:text-sm mt-1 max-w-2xl">
            Roster management, intelligent patient workload balancing, and seamless inter-shift clinical handovers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManageShifts && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Schedule Staff Shift
            </button>
          )}
          <button
            onClick={() => setShowHandoverModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            <ArrowRightLeft className="w-4 h-4" /> Initiate Handover
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On-Duty Doctors Now</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {onDutyList.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Ready for intelligent patient assignment</span>
          </div>
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled for Today</span>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {shifts.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Morning, evening, night & on-call</span>
          </div>
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Handovers</span>
            <div className={`text-2xl font-black mt-1 ${pendingHandovers.length > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {pendingHandovers.length}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Awaiting incoming doctor sign-off</span>
          </div>
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-2xl flex items-center justify-center">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hospital Time Zone</span>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">
              Africa/Addis_Ababa
            </div>
            <span className="text-[10px] text-slate-500 font-medium">UTC+3 (East Africa Time)</span>
          </div>
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('duty')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'duty'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Live Duty Roster & Workload ({onDutyList.length})
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Shift Calendar & Schedule ({shifts.length})
          </button>

          <button
            onClick={() => setActiveTab('handover')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'handover'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" /> Clinical Shift Handovers ({handovers.length})
            {pendingHandovers.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping ml-1" />
            )}
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── TAB 1: LIVE ON-DUTY ROSTER & WORKLOAD ── */}
      {activeTab === 'duty' && (
        <div className="space-y-4">
          {onDutyList.length === 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl p-8 text-center">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase">
                Understaffing Warning: No Doctors Currently Active On Duty
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-md mx-auto">
                Triage patient routing will fall back to department queue coordinators. Schedule a shift or toggle on-duty status below.
              </p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition"
              >
                + Schedule Doctor On Duty
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {onDutyList.map(doc => {
                const loadPercent = Math.min(100, Math.round((doc.active_workload / (doc.max_active_patients || 20)) * 100));
                const isHeavyLoad = loadPercent >= 80;

                return (
                  <div
                    key={doc.doctor_id}
                    className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-blue-100 dark:bg-blue-950/50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-sm">
                          Dr.
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            Dr. {doc.first_name} {doc.last_name}
                          </h4>
                          <span className="text-[11px] text-slate-500 block">
                            {doc.specialization || 'General Practitioner'} · {doc.department_name || 'General OPD'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                        ● On Duty
                      </span>
                    </div>

                    {/* Workload Meter */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold text-[11px]">Active Consultation Queue:</span>
                        <strong className={`font-mono text-xs ${isHeavyLoad ? 'text-rose-600 font-black' : 'text-slate-800 dark:text-slate-200'}`}>
                          {doc.active_workload} / {doc.max_active_patients || 20} patients
                        </strong>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHeavyLoad ? 'bg-rose-500' : loadPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${loadPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block text-right">
                        {loadPercent}% current capacity utilization
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="text-slate-500">
                        Shift: <strong className="text-slate-700 dark:text-slate-300 uppercase">{doc.shift_type || 'Morning'}</strong>
                      </span>
                      {doc.shift_id && (
                        <button
                          onClick={() => handleToggleDuty(doc.shift_id!)}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 transition"
                        >
                          Sign Off Duty
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SHIFT SCHEDULE & ROSTER ── */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Date:</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'All Personnel' },
                  { id: 'doctor', label: 'Doctors' },
                  { id: 'nurse', label: 'Nurses' },
                  { id: 'lab_technician', label: 'Lab Techs' },
                  { id: 'pharmacist', label: 'Pharmacists' }
                ].map(rf => (
                  <button
                    key={rf.id}
                    onClick={() => setRoleFilter(rf.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      roleFilter === rf.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>
            </div>

            {canManageShifts && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Add Shift Entry
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4">Staff Member</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Shift Type</th>
                    <th className="p-4">Hours</th>
                    <th className="p-4">On Duty</th>
                    <th className="p-4">Active Patients</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {shifts.filter(s => roleFilter === 'all' || (s.staff_role || 'doctor') === roleFilter).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        No shifts scheduled for selected category on {filterDate}. Click "Add Shift Entry" to schedule.
                      </td>
                    </tr>
                  ) : (
                    shifts.filter(s => roleFilter === 'all' || (s.staff_role || 'doctor') === roleFilter).map(shift => (
                      <tr key={shift.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {shift.staff_name || (shift.doctor_first_name ? `Dr. ${shift.doctor_first_name} ${shift.doctor_last_name}` : 'Staff Personnel')}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {shift.doctor_specialization || shift.department_name || 'Hospital Clinical Staff'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            (shift.staff_role || 'doctor') === 'doctor' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            shift.staff_role === 'nurse' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            shift.staff_role === 'lab_technician' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' :
                            shift.staff_role === 'pharmacist' ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {(shift.staff_role || 'doctor').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                          {shift.department_name || 'General Hospital'}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {shift.shift_type}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                          {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                        </td>
                        <td className="p-4">
                          {(canManageShifts || (shift.user_id && shift.user_id === currentUser?.id)) ? (
                            <button
                              onClick={() => handleToggleDuty(shift.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition cursor-pointer ${
                                shift.is_on_duty
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title={canManageShifts ? 'Manager duty toggle' : 'Clock in / clock out for this shift'}
                            >
                              {shift.is_on_duty ? '✓ On Duty' : 'Off Duty'}
                            </button>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              shift.is_on_duty
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {shift.is_on_duty ? 'On Duty' : 'Off Duty'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {shift.active_patient_load || 0} / {shift.max_active_patients}
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {shift.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(canManageShifts || (shift.user_id && shift.user_id === currentUser?.id)) && (
                              <button
                                onClick={() => handleToggleDuty(shift.id)}
                                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                {shift.is_on_duty ? 'Clock Out' : 'Clock In'}
                              </button>
                            )}
                            {canManageShifts && (
                              <button
                                onClick={() => handleCancelShift(shift.id)}
                                className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CLINICAL SHIFT HANDOVERS ── */}
      {activeTab === 'handover' && (
        <div className="space-y-6">
          {/* Pending Alerts Banner */}
          {pendingHandovers.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Action Required: {pendingHandovers.length} Unacknowledged Clinical Patient Handover(s)
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Incoming physicians must review and electronically sign off on patient clinical notes and pending diagnostic tasks.
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Clinical Shift Handovers & Patient Transfers
                </h3>
                <p className="text-[11px] text-slate-500">
                  Logged transfers between outgoing and incoming duty doctors with documented pending investigations.
                </p>
              </div>

              <button
                onClick={() => setShowHandoverModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" /> Transfer Patient to Next Shift
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {handovers.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No clinical shift handovers recorded.
                </div>
              ) : (
                handovers.map(handover => (
                  <div key={handover.id} className="p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">
                          Rx
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Patient: {handover.patient_first_name} {handover.patient_last_name}</span>
                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {handover.patient_mrn}
                            </span>
                            {handover.encounter_number && (
                              <span className="font-mono text-[10px] text-slate-500">
                                #{handover.encounter_number}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Transfer: Dr. {handover.from_doctor_first_name} {handover.from_doctor_last_name} ➔ 
                            Dr. {handover.to_doctor_first_name} {handover.to_doctor_last_name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {handover.is_acknowledged ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 rounded-full">
                            <Check className="w-3.5 h-3.5" /> Acknowledged & Accepted
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledgeHandover(handover.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-xl shadow-sm transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sign & Acknowledge
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pending Tasks & Clinical Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <strong className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Pending Tasks & Diagnostic Follow-Up:
                        </strong>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {handover.pending_tasks || 'No pending tasks recorded.'}
                        </p>
                      </div>

                      <div>
                        <strong className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Clinical Summary & Patient Condition:
                        </strong>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {handover.clinical_notes || 'No notes documented.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULE SHIFT MODAL ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Schedule Doctor Shift
            </h3>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Staff Role Category *</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'doctor', label: 'Doctor' },
                    { id: 'nurse', label: 'Nurse' },
                    { id: 'lab_technician', label: 'Lab Tech' },
                    { id: 'pharmacist', label: 'Pharmacist' }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setShiftForm(f => ({ ...f, staff_role: r.id, user_id: '', doctor_id: '' }))}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        shiftForm.staff_role === r.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Staff Personnel ({shiftForm.staff_role.replace(/_/g, ' ').toUpperCase()}) *
                </label>
                <select
                  required
                  value={shiftForm.user_id || shiftForm.doctor_id}
                  onChange={e => {
                    const val = e.target.value;
                    const found = staffList.find(s => String(s.user_id) === val || String(s.doctor_id) === val);
                    setShiftForm(f => ({
                      ...f,
                      user_id: found ? String(found.user_id) : val,
                      doctor_id: found?.doctor_id ? String(found.doctor_id) : (f.staff_role === 'doctor' ? val : ''),
                      department_id: found?.department_id ? String(found.department_id) : f.department_id
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="">-- Select {shiftForm.staff_role.replace(/_/g, ' ')} --</option>
                  {(staffList.filter(s => s.staff_role === shiftForm.staff_role).length > 0
                    ? staffList.filter(s => s.staff_role === shiftForm.staff_role)
                    : (shiftForm.staff_role === 'doctor' ? doctors.map(d => ({ user_id: d.user_id || d.id, doctor_id: d.id, staff_name: `Dr. ${d.first_name} ${d.last_name}`, designation: d.specialization })) : [])
                  ).map((s: any) => (
                    <option key={s.user_id || s.doctor_id} value={String(s.user_id || s.doctor_id)}>
                      {s.staff_name} ({s.designation || s.department_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <select
                    value={shiftForm.department_id}
                    onChange={e => setShiftForm(f => ({ ...f, department_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                  >
                    <option value="">Default Doctor Dept</option>
                    {departments.map(dep => (
                      <option key={dep.id} value={dep.id}>{dep.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Shift Date *</label>
                  <input
                    type="date"
                    required
                    value={shiftForm.shift_date}
                    onChange={e => setShiftForm(f => ({ ...f, shift_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Shift Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Shift Type Preset</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'morning', label: 'Morning', sub: '08:00-16:00' },
                    { id: 'evening', label: 'Evening', sub: '16:00-00:00' },
                    { id: 'night',   label: 'Night',   sub: '00:00-08:00' },
                    { id: 'on_call', label: 'On-Call', sub: '24h' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePresetChange(p.id)}
                      className={`p-2 rounded-xl border text-center transition ${
                        shiftForm.shift_type === p.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs">{p.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.start_time}
                    onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.end_time}
                    onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Active Patients</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={shiftForm.max_active_patients}
                    onChange={e => setShiftForm(f => ({ ...f, max_active_patients: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shiftForm.is_on_duty}
                      onChange={e => setShiftForm(f => ({ ...f, is_on_duty: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Set Immediately On Duty</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Shift Notes</label>
                <textarea
                  rows={2}
                  value={shiftForm.notes}
                  onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Special instructions, surgical rounds coverage, etc."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INITIATE HANDOVER MODAL ── */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" /> Initiate Clinical Shift Handover
            </h3>

            <form onSubmit={handleCreateHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Incoming Doctor *</label>
                <select
                  required
                  value={handoverForm.to_doctor_id}
                  onChange={e => setHandoverForm(f => ({ ...f, to_doctor_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="">-- Select Incoming Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.first_name} {d.last_name} ({d.specialization || 'Physician'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Patient ID *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1"
                    value={handoverForm.patient_id}
                    onChange={e => setHandoverForm(f => ({ ...f, patient_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Encounter ID (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={handoverForm.encounter_id}
                    onChange={e => setHandoverForm(f => ({ ...f, encounter_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pending Tasks & Tests *</label>
                <textarea
                  required
                  rows={2}
                  value={handoverForm.pending_tasks}
                  onChange={e => setHandoverForm(f => ({ ...f, pending_tasks: e.target.value }))}
                  placeholder="e.g. Follow up on CBC & Blood Culture result at 19:00; Recheck blood pressure in 2 hours."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Clinical Notes & Stability Summary</label>
                <textarea
                  rows={3}
                  value={handoverForm.clinical_notes}
                  onChange={e => setHandoverForm(f => ({ ...f, clinical_notes: e.target.value }))}
                  placeholder="Summary of patient symptoms, stability, warnings, and current treatments..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Transferring...' : 'Submit Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorShiftManagementPage;
