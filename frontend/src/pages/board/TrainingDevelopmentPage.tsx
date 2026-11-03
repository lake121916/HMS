import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  BookOpen, Plus, Clock,
  X, Users, Calendar, MapPin
} from 'lucide-react';

interface TrainingProgram {
  id: number;
  program_code: string;
  title: string;
  category: string;
  description?: string;
  trainer_name: string;
  trainer_institution?: string;
  start_date: string;
  end_date: string;
  venue: string;
  ceu_credits: number | string;
  max_participants: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  registered_count: number;
  completed_count: number;
}

interface Participant {
  id: number;
  training_id: number;
  user_id: number;
  participant_name: string;
  department_name?: string;
  email?: string;
  staff_role?: string;
  attendance_status: 'registered' | 'attended' | 'completed' | 'absent';
  evaluation_score?: number;
  certificate_number?: string;
  certificate_issued: boolean;
  certificate_issued_at?: string;
}

const TrainingDevelopmentPage: React.FC = () => {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingProgram | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'Clinical CPD',
    description: '',
    trainer_name: '',
    trainer_institution: 'Alem Ketema Enat Hospital & Regional Health Bureau',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    venue: 'Hospital Main Auditorium (Block A)',
    ceu_credits: '15.0',
    max_participants: '35'
  });

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/board/training/programs');
      if (res.data?.success) {
        setTrainings(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching trainings:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load training programs' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/board/training/programs', createForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Training program scheduled successfully' });
        setShowCreateModal(false);
        fetchTrainings();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error scheduling training' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSelf = async (trainingId: number) => {
    try {
      const res = await api.post(`/board/training/programs/${trainingId}/register`, {});
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'You have been enrolled in this training program!' });
        fetchTrainings();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Registration failed' });
    }
  };

  const viewParticipants = async (training: TrainingProgram) => {
    setSelectedTraining(training);
    setShowParticipantsModal(true);
    setLoadingParticipants(true);
    try {
      const res = await api.get(`/board/training/programs/${training.id}/participants`);
      setParticipants(res.data?.data || []);
    } catch (e) {
      console.error('Error fetching participants:', e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleUpdateParticipant = async (participantId: number, status: string, score: string) => {
    try {
      const res = await api.put(`/board/training/participants/${participantId}`, {
        attendance_status: status,
        evaluation_score: score ? parseFloat(score) : undefined
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Participant status updated' });
        if (selectedTraining) {
          viewParticipants(selectedTraining);
          fetchTrainings();
        }
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update participant' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Training & Continuous Professional Development (CPD)
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Schedule medical workshops, track employee CEU credits, and award certified completion credentials.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Training Program
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

      {/* Programs Grid */}
      {loading ? (
        <div className="p-16 text-center text-gray-500">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          Loading scheduled training programs...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trainings.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-600 transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {t.program_code}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {t.ceu_credits} CEU Credits
                </span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-base leading-snug">
                {t.title}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {t.category}
              </p>

              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                {t.description || 'Continuous healthcare professional skills enhancement and quality care standard training.'}
              </p>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>{new Date(t.start_date).toLocaleDateString()} - {new Date(t.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="truncate">{t.venue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  <span>Trainer: {t.trainer_name}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Enrolled: {t.registered_count} / {t.max_participants}</span>
                  <span>{t.completed_count} Certified</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, ((t.registered_count || 0) / t.max_participants) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center gap-2">
              <button
                onClick={() => viewParticipants(t)}
                className="text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                Roster ({t.registered_count})
              </button>

              <button
                onClick={() => handleRegisterSelf(t.id)}
                className="px-3 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Enroll Staff
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* CREATE PROGRAM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Schedule Professional Training Program</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTraining} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Program Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Neonatal Resuscitation Program (NRP)"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={createForm.category}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">CEU Credits Awarded *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={createForm.ceu_credits}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, ceu_credits: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Trainer / Facilitator Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.trainer_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, trainer_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Capacity *</label>
                  <input
                    type="number"
                    required
                    value={createForm.max_participants}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, max_participants: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.start_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.end_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Training Venue / Hall *</label>
                <input
                  type="text"
                  required
                  value={createForm.venue}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, venue: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Program Syllabus / Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Scheduling...' : 'Publish Training'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTICIPANTS ROSTER MODAL */}
      {showParticipantsModal && selectedTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Participants Roster</h3>
                <p className="text-xs text-emerald-600 font-medium">{selectedTraining.title}</p>
              </div>
              <button onClick={() => setShowParticipantsModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              {loadingParticipants ? (
                <div className="p-8 text-center text-gray-500">Loading roster...</div>
              ) : participants.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">No participants registered yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="py-2.5 px-3">Participant Name</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Attendance</th>
                        <th className="py-2.5 px-3">Score & Cert</th>
                        {isPrivileged && <th className="py-2.5 px-3 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                      {participants.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-900 dark:text-white">{p.participant_name}</span>
                            <span className="block text-[11px] text-gray-400">{p.staff_role}</span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{p.department_name || 'Hospital Staff'}</td>
                          <td className="py-2.5 px-3 capitalize">
                            <span className={`px-2 py-0.5 rounded-full font-medium ${
                              p.attendance_status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.attendance_status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {p.certificate_number ? (
                              <span className="font-mono text-[11px] text-emerald-600 font-semibold">{p.certificate_number}</span>
                            ) : (
                              <span className="text-gray-400">Score: {p.evaluation_score || '-'}</span>
                            )}
                          </td>
                          {isPrivileged && (
                            <td className="py-2.5 px-3 text-right">
                              {p.attendance_status !== 'completed' && (
                                <button
                                  onClick={() => handleUpdateParticipant(p.id, 'completed', '92')}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors"
                                >
                                  Certify
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingDevelopmentPage;
