import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Calendar, Plus, Clock,
  X, MapPin,
  UserCheck, Award, CheckSquare
} from 'lucide-react';

interface BoardMeeting {
  id: number;
  meeting_number: string;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time?: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'adjourned' | 'minutes_approved' | 'cancelled';
  meeting_minutes?: string;
  presided_by_name?: string;
  recorded_by_name?: string;
  agenda_count: number;
  decisions_count: number;
}

interface Agenda {
  id: number;
  item_order: number;
  title: string;
  description?: string;
  presenter_name?: string;
  decision_required: boolean;
}

interface Decision {
  id: number;
  resolution_number: string;
  resolution_type: string;
  subject: string;
  resolution_text: string;
  voting_result: string;
  recorded_by_name?: string;
  created_at: string;
}

const BoardMeetingsPage: React.FC = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals & Detail State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<BoardMeeting | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Sub-modals for adding agendas or resolutions
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    meeting_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '17:00',
    location: 'Executive Board Room (Block B, 3rd Floor)'
  });

  const [agendaForm, setAgendaForm] = useState({
    title: '',
    description: '',
    presenter_name: 'Medical Director',
    decision_required: true
  });

  const [decisionForm, setDecisionForm] = useState({
    resolution_type: 'scholarship_approval',
    subject: '',
    resolution_text: '',
    voting_result: 'Unanimously Approved'
  });

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/board/meetings');
      if (res.data?.success) {
        setMeetings(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching meetings:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load board meetings' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/board/meetings', createForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Board meeting scheduled' });
        setShowCreateModal(false);
        fetchMeetings();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error scheduling meeting' });
    } finally {
      setSubmitting(false);
    }
  };

  const openMeetingDetail = async (meeting: BoardMeeting) => {
    setSelectedMeeting(meeting);
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/board/meetings/${meeting.id}`);
      if (res.data?.success) {
        setAgendas(res.data.data.agendas || []);
        setDecisions(res.data.data.decisions || []);
      }
    } catch (e) {
      console.error('Error loading meeting details:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/board/meetings/${selectedMeeting.id}/agendas`, agendaForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Agenda item added' });
        setShowAgendaModal(false);
        setAgendaForm({ title: '', description: '', presenter_name: '', decision_required: true });
        openMeetingDetail(selectedMeeting);
        fetchMeetings();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error adding agenda' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/board/meetings/${selectedMeeting.id}/decisions`, decisionForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Formal board resolution adopted!' });
        setShowDecisionModal(false);
        setDecisionForm({ resolution_type: 'scholarship_approval', subject: '', resolution_text: '', voting_result: 'Unanimously Approved' });
        openMeetingDetail(selectedMeeting);
        fetchMeetings();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error recording resolution' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Hospital Board Meetings & Resolutions
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Convene executive board sessions, manage structured agendas, and record official adopted resolutions.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Board Session
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

      {/* Meetings List */}
      {loading ? (
        <div className="p-16 text-center text-gray-500">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading board meetings...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {meetings.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {m.meeting_number}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.status === 'minutes_approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>
                  {m.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-base">
                {m.title}
              </h3>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(m.meeting_date).toLocaleDateString()} at {m.start_time?.slice(0, 5)} {m.end_time ? `- ${m.end_time.slice(0, 5)}` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{m.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                  <span>Presided By: {m.presided_by_name || 'Board Chairperson'}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {m.agenda_count} Agendas · {m.decisions_count} Resolutions Adopted
              </span>

              <button
                onClick={() => openMeetingDetail(m)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                View Session & Minutes
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* MEETING DETAIL MODAL */}
      {showDetailModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">{selectedMeeting.title}</h3>
                <p className="text-xs text-indigo-600 font-mono">{selectedMeeting.meeting_number} · {new Date(selectedMeeting.meeting_date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="p-12 text-center text-gray-500">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                Loading session agendas and minutes...
              </div>
            ) : (
              <div className="mt-4 space-y-5 text-sm">
                {/* Meeting Minutes */}
                {selectedMeeting.meeting_minutes && (
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-xs">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">Executive Session Minutes:</span>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedMeeting.meeting_minutes}</p>
                  </div>
                )}

                {/* Agendas Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      Session Agendas ({agendas.length})
                    </h4>
                    {isPrivileged && (
                      <button
                        onClick={() => setShowAgendaModal(true)}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        + Add Agenda Item
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {agendas.map((a) => (
                      <div key={a.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {a.item_order}. {a.title}
                          </span>
                          {a.description && <p className="text-gray-500 mt-0.5">{a.description}</p>}
                          {a.presenter_name && <span className="text-[11px] text-gray-400 block mt-1">Presenter: {a.presenter_name}</span>}
                        </div>
                        {a.decision_required && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-full shrink-0">
                            Vote Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resolutions / Decisions Section */}
                <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-600" />
                      Adopted Formal Board Resolutions ({decisions.length})
                    </h4>
                    {isPrivileged && (
                      <button
                        onClick={() => setShowDecisionModal(true)}
                        className="text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        + Adopt Formal Resolution
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {decisions.map((d) => (
                      <div key={d.id} className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                        <div className="flex justify-between items-start">
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{d.resolution_number}</span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full">
                            {d.voting_result}
                          </span>
                        </div>
                        <h5 className="font-semibold text-gray-900 dark:text-white mt-1">{d.subject}</h5>
                        <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{d.resolution_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Schedule Board Meeting Session</h3>
            <form onSubmit={handleCreateMeeting} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Governing Board Q4 Clinical Governance Session"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Meeting Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.meeting_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, meeting_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={createForm.start_time}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Venue / Location</label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm"
                >
                  {submitting ? 'Scheduling...' : 'Convene Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD AGENDA MODAL */}
      {showAgendaModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Add Agenda Item</h3>
            <form onSubmit={handleAddAgenda} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Agenda Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Specialty Fellowship Allocation Review"
                  value={agendaForm.title}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Presenter</label>
                <input
                  type="text"
                  value={agendaForm.presenter_name}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, presenter_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description / Notes</label>
                <textarea
                  value={agendaForm.description}
                  onChange={(e) => setAgendaForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-16"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAgendaModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm"
                >
                  Add Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADOPT RESOLUTION MODAL */}
      {showDecisionModal && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Adopt Formal Board Resolution</h3>
            <form onSubmit={handleAddDecision} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Resolution Category *</label>
                <select
                  value={decisionForm.resolution_type}
                  onChange={(e) => setDecisionForm(prev => ({ ...prev, resolution_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="scholarship_approval">Scholarship Approval</option>
                  <option value="specialization_approval">Specialization & Residency Approval</option>
                  <option value="policy_ratification">Clinical Policy Ratification</option>
                  <option value="budget_approval">Budget Allocation Approval</option>
                  <option value="general">General Executive Resolution</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Resolution Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Endorsement of Surgical Residency Sponsorships"
                  value={decisionForm.subject}
                  onChange={(e) => setDecisionForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Formal Resolution Text *</label>
                <textarea
                  required
                  placeholder="IT IS HEREBY RESOLVED THAT..."
                  value={decisionForm.resolution_text}
                  onChange={(e) => setDecisionForm(prev => ({ ...prev, resolution_text: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-24"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm"
                >
                  Adopt Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardMeetingsPage;
