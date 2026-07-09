import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Calendar, Clock, User, CheckCircle, XCircle, X, RefreshCw, Search } from 'lucide-react';

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  patient_name?: string;
  doctor_name?: string;
  appointment_date: string;
  status: string;
  reason: string;
  notes?: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completed:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  rescheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const AppointmentsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    patientId: '', doctorId: '', appointmentDate: '', reason: '', notes: ''
  });
  const [rescheduleData, setRescheduleData] = useState({ newDate: '', reason: '' });

  useEffect(() => { fetchAppointments(); }, [statusFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/appointments${params}`);
      setAppointments(res.data.data.appointments || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBook = () => {
    setFormData({ patientId:'', doctorId:'', appointmentDate:'', reason:'', notes:'' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/appointments', {
        patientId: parseInt(formData.patientId),
        doctorId: parseInt(formData.doctorId),
        appointmentDate: formData.appointmentDate,
        reason: formData.reason,
        notes: formData.notes || undefined,
      });
      setShowModal(false);
      fetchAppointments();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to book appointment'); }
  };

  const handleCancel = async (appt: Appointment) => {
    if (!window.confirm(`Cancel appointment for ${appt.patient_name || 'this patient'}?`)) return;
    try {
      await api.put(`/appointments/${appt.id}/cancel`, { reason: 'Cancelled by staff' });
      fetchAppointments();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to cancel appointment'); }
  };

  const openReschedule = (appt: Appointment) => {
    setSelectedAppt(appt);
    setRescheduleData({ newDate: appt.appointment_date.slice(0, 16), reason: '' });
    setShowRescheduleModal(true);
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/appointments/${selectedAppt?.id}/reschedule`, {
        newDate: rescheduleData.newDate,
        reason: rescheduleData.reason || 'Rescheduled',
      });
      setShowRescheduleModal(false);
      fetchAppointments();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to reschedule'); }
  };

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase();
    return !search ||
      (a.patient_name?.toLowerCase().includes(q)) ||
      (a.doctor_name?.toLowerCase().includes(q)) ||
      (a.reason?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" /> Appointments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {user?.role === 'patient' ? 'Your appointment history' : 'Manage patient appointments'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAppointments} disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {can('appointments:create') && (
            <button onClick={handleBook}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold gap-2">
              <Plus className="w-4 h-4" /> Book Appointment
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient, doctor or reason..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Date & Time', 'Patient', 'Doctor', 'Reason', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-40" />
                  Loading...
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No appointments found
                </td></tr>
              ) : filtered.map(appt => (
                <tr key={appt.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white font-medium">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      {new Date(appt.appointment_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {new Date(appt.appointment_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {appt.patient_name || `Patient #${appt.patient_id}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {appt.doctor_name || `Doctor #${appt.doctor_id}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[160px] truncate" title={appt.reason}>
                    {appt.reason || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-700'}`}>
                      {appt.status === 'confirmed' ? <CheckCircle className="w-3 h-3" /> :
                       appt.status === 'cancelled' ? <XCircle className="w-3 h-3" /> : null}
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {can('appointments:edit') && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button onClick={() => openReschedule(appt)}
                          title="Reschedule"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
                          Reschedule
                        </button>
                      )}
                      {can('appointments:cancel') && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button onClick={() => handleCancel(appt)}
                          title="Cancel"
                          className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Book Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Book Appointment</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Patient ID *</label>
                  <input type="number" required value={formData.patientId}
                    onChange={e => setFormData({...formData, patientId:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Doctor ID *</label>
                  <input type="number" required value={formData.doctorId}
                    onChange={e => setFormData({...formData, doctorId:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Date & Time *</label>
                <input type="datetime-local" required value={formData.appointmentDate}
                  onChange={e => setFormData({...formData, appointmentDate:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Reason for Visit *</label>
                <textarea required value={formData.reason} rows={3}
                  onChange={e => setFormData({...formData, reason:e.target.value})} className={inp}
                  placeholder="Describe the reason for the appointment..." /></div>
              <div><label className={lbl}>Additional Notes</label>
                <textarea value={formData.notes} rows={2}
                  onChange={e => setFormData({...formData, notes:e.target.value})} className={inp} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">Book Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reschedule Appointment</h2>
              <button onClick={() => setShowRescheduleModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReschedule} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">
                  {selectedAppt.patient_name || `Patient #${selectedAppt.patient_id}`}
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
                  Current: {new Date(selectedAppt.appointment_date).toLocaleString()}
                </p>
              </div>
              <div><label className={lbl}>New Date & Time *</label>
                <input type="datetime-local" required value={rescheduleData.newDate}
                  onChange={e => setRescheduleData({...rescheduleData, newDate:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Reason for Rescheduling</label>
                <input value={rescheduleData.reason}
                  onChange={e => setRescheduleData({...rescheduleData, reason:e.target.value})} className={inp}
                  placeholder="Optional reason..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Reschedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
