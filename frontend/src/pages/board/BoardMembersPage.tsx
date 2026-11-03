import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, Plus, Clock,
  X, Mail, Phone, Calendar
} from 'lucide-react';

interface BoardMember {
  id: number;
  user_id?: number;
  full_name: string;
  role_title: string;
  committee: string;
  department_name?: string;
  appointed_date: string;
  term_end_date?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

const BoardMembersPage: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals & Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: '',
    role_title: 'Board Member',
    committee: 'Executive Board',
    appointed_date: new Date().toISOString().split('T')[0],
    term_end_date: new Date(Date.now() + 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    phone: '+251 91 123 4567',
    email: ''
  });

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/board/members');
      if (res.data?.success) {
        setMembers(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching board members:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load board members' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/board/members', addForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Board member appointed successfully' });
        setShowAddModal(false);
        fetchMembers();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error appointing member' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (member: BoardMember) => {
    try {
      const res = await api.put(`/board/members/${member.id}`, {
        is_active: !member.is_active
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Member status updated' });
        fetchMembers();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error updating member status' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Hospital Governing Board Members
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Alem Ketema Enat Hospital Governing Board of Directors and specialized governance committee trustees.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Appoint Board Trustee
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-4 rounded-lg flex items-center justify-between text-sm ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Members Grid */}
      {loading ? (
        <div className="p-16 text-center text-gray-500">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading board trustees...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-base">
                  {m.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {m.is_active ? 'Active Trustee' : 'Former Member'}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-base">
                {m.full_name}
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                {m.role_title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {m.committee}
              </p>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                {m.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{m.email}</span>
                  </div>
                )}
                {m.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{m.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Appointed: {new Date(m.appointed_date).toLocaleDateString()}</span>
                </div>
                {m.term_end_date && (
                  <div className="text-[11px] text-gray-400">
                    Term End: {new Date(m.term_end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            {isPrivileged && (
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button
                  onClick={() => toggleActive(m)}
                  className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  {m.is_active ? 'Mark Inactive' : 'Reactivate'}
                </button>
              </div>
            )}
          </div>
        ))}
        </div>
      )}

      {/* APPOINT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Appoint Board Trustee</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Tewodros Gebremedhin"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Board Role / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chairperson, Secretary, Medical Director"
                  value={addForm.role_title}
                  onChange={(e) => setAddForm(prev => ({ ...prev, role_title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Standing Committee *</label>
                <select
                  value={addForm.committee}
                  onChange={(e) => setAddForm(prev => ({ ...prev, committee: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="Executive Board">Executive Board</option>
                  <option value="Clinical Governance & Credentialing Committee">Clinical Governance & Credentialing Committee</option>
                  <option value="Finance & Audit Board Committee">Finance & Audit Board Committee</option>
                  <option value="Community Advisory & Ethics Committee">Community Advisory & Ethics Committee</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Appointed Date</label>
                  <input
                    type="date"
                    required
                    value={addForm.appointed_date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, appointed_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Term End Date</label>
                  <input
                    type="date"
                    value={addForm.term_end_date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, term_end_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Appointing...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardMembersPage;
