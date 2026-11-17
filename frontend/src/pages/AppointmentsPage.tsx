import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  useAppointments, useCreateAppointment,
  useCancelAppointment, useRescheduleAppointment,
} from '../hooks/useApi';
import {
  Calendar, Clock, CheckCircle2, XCircle, X, RefreshCw, Search,
  Plus, CalendarCheck, CalendarX, ArrowUpRight
} from 'lucide-react';
import { DashboardHeader, StatisticCard } from '../components/common/PremiumUI';

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  patient_name?: string;
  doctor_name?: string;
  appointment_date: string;
  status: string;
  reason?: string;
  notes?: string;
}

const inp = 'w-full px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition';
const lbl = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  scheduled:   { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', icon: Clock },
  confirmed:   { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2 },
  completed:   { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30', icon: CheckCircle2 },
  cancelled:   { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', icon: XCircle },
  rescheduled: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', icon: ArrowUpRight },
};

const AppointmentsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    patientId: '', doctorId: '', appointmentDate: '', reason: '', notes: ''
  });
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', reason: '' });

  // ── TanStack Query ──────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useAppointments({ status: statusFilter });
  const appointments: Appointment[] = data?.appointments ?? [];

  const createAppointment   = useCreateAppointment();
  const cancelAppointment   = useCancelAppointment();
  const rescheduleAppointment = useRescheduleAppointment();

  const handleBook = () => {
    setFormData({ patientId:'', doctorId:'', appointmentDate:'', reason:'', notes:'' });
    navigate('/appointments/new');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment.mutateAsync({
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        appointmentDate: formData.appointmentDate,
        reason: formData.reason,
        notes: formData.notes || undefined,
      });
      closeModal();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to book appointment'); }
  };

  const handleCancel = async (appt: Appointment) => {
    if (!window.confirm(`Cancel appointment for ${appt.patient_name || 'this patient'}?`)) return;
    try {
      await cancelAppointment.mutateAsync({ id: appt.id, reason: 'Cancelled by staff' });
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to cancel appointment'); }
  };

  const closeModal = () => {
    setShowModal(false);
    if (location.pathname.endsWith('/new')) {
      navigate('/appointments');
    }
  };

  const openReschedule = (appt: Appointment) => {
    setSelectedAppt(appt);
    setRescheduleData({ newDate: appt.appointment_date.slice(0, 16), reason: '' });
    setShowRescheduleModal(true);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await rescheduleAppointment.mutateAsync({
        id: selectedAppt!.id,
        newDate: rescheduleData.newDate,
        reason: rescheduleData.reason || 'Rescheduled',
      });
      setShowRescheduleModal(false);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to reschedule'); }
  };

  React.useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      const patientId = searchParams.get('patient');
      setFormData({ patientId: patientId || '', doctorId:'', appointmentDate:'', reason:'', notes:'' });
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname, searchParams]);

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase();
    return !search ||
      (a.patient_name?.toLowerCase().includes(q)) ||
      (a.doctor_name?.toLowerCase().includes(q)) ||
      (a.reason?.toLowerCase().includes(q));
  });

  const scheduledCount = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Clinical Appointments"
        amharicTitle="የክሊኒካል ቀጠሮዎች መቆጣጠሪያ"
        badge="Outpatient Scheduling"
        icon={Calendar}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-navy-700/80 bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-500/40 transition disabled:opacity-50 cursor-pointer"
              title="Refresh Appointments"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            {can('appointments:create') && (
              <button
                onClick={handleBook}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            )}
          </div>
        }
      />

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatisticCard
          title="Total Bookings"
          value={appointments.length}
          subtitle="All patient encounters"
          icon={Calendar}
          variant="cyan"
        />
        <StatisticCard
          title="Confirmed / Scheduled"
          value={scheduledCount}
          subtitle="Active outpatient queue"
          icon={CalendarCheck}
          variant="teal"
        />
        <StatisticCard
          title="Completed Visits"
          value={completedCount}
          subtitle="Successfully discharged"
          icon={CheckCircle2}
          variant="blue"
        />
        <StatisticCard
          title="Cancelled / Missed"
          value={cancelledCount}
          subtitle="No-show or withdrawn"
          icon={CalendarX}
          variant="rose"
        />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, doctor, reason, or MRN..."
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
          <option value="">All Statuses ({appointments.length})</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      {/* Mobile Card List (< sm) */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-500" />
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-8 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-500" />
            No appointments found
          </div>
        ) : (
          filtered.map(appt => {
            const conf = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
            const StatusIcon = conf.icon;
            return (
              <div
                key={appt.id}
                className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center shrink-0">
                      {appt.patient_name?.[0] || 'P'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {appt.patient_name || `Patient #${appt.patient_id}`}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {appt.doctor_name || `Doctor #${appt.doctor_id}`}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border ${conf.bg} ${conf.text} ${conf.border}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="capitalize">{appt.status}</span>
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-navy-950/60 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{new Date(appt.appointment_date).toLocaleDateString()} at {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {appt.reason && (
                    <div className="text-slate-500 dark:text-slate-400 text-xs">
                      Concern: <span className="text-slate-800 dark:text-slate-200 font-medium">{appt.reason}</span>
                    </div>
                  )}
                </div>

                {(can('appointments:edit') || can('appointments:cancel')) && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-navy-800">
                    {can('appointments:edit') && (
                      <button
                        onClick={() => openReschedule(appt)}
                        className="flex-1 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl hover:bg-cyan-100 dark:hover:bg-cyan-900/40 transition text-center cursor-pointer"
                      >
                        Reschedule
                      </button>
                    )}
                    {can('appointments:cancel') && (
                      <button
                        onClick={() => handleCancel(appt)}
                        className="flex-1 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition text-center cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
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
                {['Date & Time', 'Patient', 'Attending Doctor', 'Clinical Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-500 opacity-60" />
                    Loading clinical appointments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-500" />
                    No appointments matched your query
                  </td>
                </tr>
              ) : (
                filtered.map(appt => {
                  const conf = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                  const StatusIcon = conf.icon;
                  return (
                    <tr key={appt.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                          {new Date(appt.appointment_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {appt.patient_name?.[0] || 'P'}
                          </div>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {appt.patient_name || `Patient #${appt.patient_id}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {appt.doctor_name || `Doctor #${appt.doctor_id}`}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-[180px] truncate" title={appt.reason}>
                        {appt.reason || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border ${conf.bg} ${conf.text} ${conf.border}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="capitalize">{appt.status}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {can('appointments:edit') && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <button
                              onClick={() => openReschedule(appt)}
                              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 px-2 py-1 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                            >
                              Reschedule
                            </button>
                          )}
                          {can('appointments:cancel') && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                            <button
                              onClick={() => handleCancel(appt)}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-500" /> Book Clinical Appointment
              </h3>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
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
                  value={formData.patientId}
                  onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Doctor ID</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2"
                  value={formData.doctorId}
                  onChange={e => setFormData({ ...formData, doctorId: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Appointment Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.appointmentDate}
                  onChange={e => setFormData({ ...formData, appointmentDate: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Clinical Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Follow-up consultation, HTN review"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional referral details or special accommodations"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className={inp}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAppointment.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {createAppointment.isPending ? 'Confirming...' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-500" /> Reschedule Appointment
              </h3>
              <button onClick={() => setShowRescheduleModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReschedule} className="space-y-3.5">
              <div>
                <label className={lbl}>New Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleData.newDate}
                  onChange={e => setRescheduleData({ ...rescheduleData, newDate: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Reason for Change</label>
                <input
                  type="text"
                  placeholder="e.g. Patient requested, Doctor in surgery"
                  value={rescheduleData.reason}
                  onChange={e => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                  className={inp}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleAppointment.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {rescheduleAppointment.isPending ? 'Updating...' : 'Save New Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
