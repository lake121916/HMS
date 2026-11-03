import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Stethoscope, Plus, Clock,
  X, ShieldCheck, Award,
  Building2, UserCheck, Ban, ArrowRight, BookOpen
} from 'lucide-react';

interface SpecializationProgram {
  id: number;
  program_code: string;
  name: string;
  medical_field: string;
  partner_institution: string;
  duration_years: number | string;
  admission_requirements: string;
  total_positions: number;
  available_positions: number;
  sponsorship_type: string;
  application_deadline: string;
  status: 'active' | 'closed' | 'upcoming';
  total_applications?: number;
  accepted_candidates?: number;
}

interface SpecializationApplication {
  id: number;
  application_number: string;
  program_id: number;
  program_name: string;
  medical_field: string;
  partner_institution: string;
  duration_years: number;
  applicant_user_id: number;
  applicant_name: string;
  current_position: string;
  department_id: number;
  department_name?: string;
  current_qualification: string;
  work_experience_years: number;
  preferred_institution?: string;
  recommendation_summary?: string;
  status: 'submitted' | 'department_review' | 'hr_verification' | 'board_review' | 'approved' | 'rejected' | 'in_training' | 'completed';
  dept_head_approved?: boolean;
  dept_head_name?: string;
  dept_head_notes?: string;
  hr_verified?: boolean;
  hr_name?: string;
  hr_notes?: string;
  board_approved?: boolean;
  board_decision_ref?: string;
  training_start_date?: string;
  training_end_date?: string;
  rejection_reason?: string;
  created_at: string;
}

const SpecializationPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'programs' | 'candidates'>('programs');
  const [programs, setPrograms] = useState<SpecializationProgram[]>([]);
  const [applications, setApplications] = useState<SpecializationApplication[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedProgramForApply, setSelectedProgramForApply] = useState<SpecializationProgram | null>(null);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedAppForStage, setSelectedAppForStage] = useState<SpecializationApplication | null>(null);

  // Forms
  const [submitting, setSubmitting] = useState(false);
  const [programForm, setProgramForm] = useState({
    name: '',
    medical_field: 'Surgery',
    partner_institution: 'Tikur Anbessa Specialized Hospital / AAU College of Health Sciences',
    duration_years: '3.0',
    admission_requirements: 'Post-internship clinical experience of at least 2 years and valid Ethiopian medical license.',
    total_positions: '2',
    sponsorship_type: 'Full Hospital & MOH Sponsorship',
    application_deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [applyForm, setApplyForm] = useState({
    applicant_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Dr. Medical Officer',
    current_position: 'General Medical Practitioner',
    department_id: '',
    current_qualification: 'MD (Doctor of Medicine)',
    work_experience_years: '2.5',
    preferred_institution: 'Tikur Anbessa Specialized Hospital',
    recommendation_summary: ''
  });

  // Stage transition form
  const [targetStage, setTargetStage] = useState<string>('department_review');
  const [stageNotes, setStageNotes] = useState('');
  const [stageApproved, setStageApproved] = useState(true);
  const [boardDecisionRef, setBoardDecisionRef] = useState('RES-2026-005');
  const [trainingStartDate, setTrainingStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainingEndDate, setTrainingEndDate] = useState(new Date(Date.now() + 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');
  const isDoctor = ['doctor', 'admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');

  useEffect(() => {
    fetchData();
    fetchDepartments();
  }, [activeTab]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data?.data?.departments || res.data?.data || []);
    } catch (e) {
      console.error('Error fetching departments:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'programs') {
        const res = await api.get('/board/specializations/programs');
        setPrograms(res.data?.data || []);
      } else {
        const res = await api.get('/board/specializations/applications');
        setApplications(res.data?.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching specializations data:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load specializations data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/board/specializations/programs', programForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Specialization program created' });
        setShowCreateProgramModal(false);
        fetchData();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error creating program' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramForApply) return;
    if (!applyForm.department_id) {
      setFeedbackMsg({ type: 'error', text: 'Please select your current department' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/board/specializations/applications', {
        program_id: selectedProgramForApply.id,
        ...applyForm
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Specialization candidacy application submitted!' });
        setShowApplyModal(false);
        setActiveTab('candidates');
        fetchData();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error submitting application' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForStage) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/board/specializations/applications/${selectedAppForStage.id}/stage`, {
        stage: targetStage,
        notes: stageNotes,
        approved: stageApproved,
        board_decision_ref: boardDecisionRef,
        training_start_date: trainingStartDate,
        training_end_date: trainingEndDate,
        rejection_reason: !stageApproved ? stageNotes : undefined
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: `Candidacy advanced to ${targetStage.replace('_', ' ')}` });
        setShowStageModal(false);
        fetchData();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error updating stage' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStageBadge = (status: string) => {
    switch (status) {
      case 'in_training':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><BookOpen className="w-3 h-3" /> In Residency / Training</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"><Award className="w-3 h-3" /> Specialization Completed</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><ShieldCheck className="w-3 h-3" /> Board Approved</span>;
      case 'board_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"><Clock className="w-3 h-3" /> Board Review</span>;
      case 'hr_verification':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300"><Building2 className="w-3 h-3" /> HR Verification</span>;
      case 'department_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><UserCheck className="w-3 h-3" /> Dept Head Review</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><Ban className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Submitted</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Stethoscope className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Medical Specialization & Residency Programs
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Manage clinical subspecialty tracks, clinician multi-stage sponsorship workflows, and resident progress.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setShowCreateProgramModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Specialization Track
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('programs')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'programs'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Specialization Programs ({programs.length})
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'candidates'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Candidacy Pipeline ({applications.length})
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          Loading specialization programs...
        </div>
      ) : activeTab === 'programs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {programs.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                    {p.program_code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {p.status}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-lg leading-snug">
                  {p.name}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                  Field: {p.medical_field} · {p.duration_years} Years
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Partner Academic Center:</span>
                    <span className="font-medium text-right">{p.partner_institution}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sponsorship Model:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{p.sponsorship_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Positions:</span>
                    <span className="font-medium">{p.available_positions} Available / {p.total_positions} Total</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Application Deadline:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{new Date(p.application_deadline).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block mb-1">Prerequisites:</span>
                  <p>{p.admission_requirements}</p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {p.total_applications || 0} applicants · {p.accepted_candidates || 0} accepted
                </span>

                {isDoctor && p.status === 'active' && p.available_positions > 0 && (
                  <button
                    onClick={() => {
                      setSelectedProgramForApply(p);
                      setShowApplyModal(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Apply for Track
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VIEW: CANDIDACY PIPELINE */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {applications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Stethoscope className="w-12 h-12 mx-auto mb-2 opacity-40 text-blue-600" />
              <p className="font-medium">No specialization candidates currently in pipeline</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Application #</th>
                    <th className="py-3 px-4">Clinician Candidate</th>
                    <th className="py-3 px-4">Specialization Track</th>
                    <th className="py-3 px-4">Department & Exp</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {app.application_number}
                        <span className="block text-[11px] text-gray-400 font-sans">{new Date(app.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">{app.applicant_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{app.current_position} · {app.current_qualification}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-200">{app.program_name}</div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">{app.partner_institution}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="text-gray-900 dark:text-gray-200 font-medium">{app.department_name}</div>
                        <div className="text-gray-500">{app.work_experience_years} years experience</div>
                      </td>
                      <td className="py-3 px-4">
                        {getStageBadge(app.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPrivileged && app.status !== 'completed' && app.status !== 'rejected' && (
                          <button
                            onClick={() => {
                              setSelectedAppForStage(app);
                              // Next logical stage suggestion
                              if (app.status === 'submitted') setTargetStage('department_review');
                              else if (app.status === 'department_review') setTargetStage('hr_verification');
                              else if (app.status === 'hr_verification') setTargetStage('board_review');
                              else if (app.status === 'board_review') setTargetStage('approved');
                              else if (app.status === 'approved') setTargetStage('in_training');
                              else if (app.status === 'in_training') setTargetStage('completed');
                              setShowStageModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium rounded transition-colors"
                          >
                            Advance Stage <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CREATE PROGRAM MODAL */}
      {showCreateProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Create Specialization Track</h3>
              <button onClick={() => setShowCreateProgramModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Track Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Residency in General Surgery"
                  value={programForm.name}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Medical Discipline *</label>
                  <input
                    type="text"
                    required
                    value={programForm.medical_field}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, medical_field: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration (Years) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={programForm.duration_years}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, duration_years: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Partner Academic Teaching Center *</label>
                <input
                  type="text"
                  required
                  value={programForm.partner_institution}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, partner_institution: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Allocated Positions *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={programForm.total_positions}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, total_positions: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Application Deadline *</label>
                  <input
                    type="date"
                    required
                    value={programForm.application_deadline}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, application_deadline: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Admission Requirements *</label>
                <textarea
                  required
                  value={programForm.admission_requirements}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, admission_requirements: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProgramModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Creating...' : 'Publish Specialization Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLY MODAL */}
      {showApplyModal && selectedProgramForApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Candidacy Application</h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{selectedProgramForApply.name}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Clinician Full Name *</label>
                  <input
                    type="text"
                    required
                    value={applyForm.applicant_name}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, applicant_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Position *</label>
                  <input
                    type="text"
                    required
                    value={applyForm.current_position}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, current_position: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Department *</label>
                  <select
                    required
                    value={applyForm.department_id}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Work Experience (Years) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={applyForm.work_experience_years}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, work_experience_years: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Clinical Qualification *</label>
                <input
                  type="text"
                  required
                  value={applyForm.current_qualification}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, current_qualification: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Clinical Statement & Objectives</label>
                <textarea
                  placeholder="Detail clinical motivations, anticipated department service post-training, and specific subspecialty focus..."
                  value={applyForm.recommendation_summary}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, recommendation_summary: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-24"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Candidacy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAGE TRANSITION MODAL */}
      {showStageModal && selectedAppForStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Advance Candidacy Stage</h3>
            <p className="text-xs text-gray-500 mt-1">
              Candidate: {selectedAppForStage.applicant_name} ({selectedAppForStage.program_name})
            </p>

            <form onSubmit={handleStageSubmit} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Stage *</label>
                <select
                  value={targetStage}
                  onChange={(e) => setTargetStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="department_review">Department Head Review</option>
                  <option value="hr_verification">HR Service Verification</option>
                  <option value="board_review">Board Committee Review</option>
                  <option value="approved">Board Approval</option>
                  <option value="in_training">Enrolled In Training / Residency</option>
                  <option value="completed">Completed & Certified</option>
                  <option value="rejected">Reject Candidacy</option>
                </select>
              </div>

              {targetStage === 'approved' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Board Resolution Ref</label>
                  <input
                    type="text"
                    value={boardDecisionRef}
                    onChange={(e) => setBoardDecisionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                  />
                </div>
              )}

              {targetStage === 'in_training' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Residency Start Date</label>
                    <input
                      type="date"
                      value={trainingStartDate}
                      onChange={(e) => setTrainingStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Estimated Completion</label>
                    <input
                      type="date"
                      value={trainingEndDate}
                      onChange={(e) => setTrainingEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Notes / Endorsement / Audit Summary</label>
                <textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="Record verification findings, conditions of sponsorship, or department head endorsement..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="stageApprovedCheck"
                  checked={stageApproved}
                  onChange={(e) => setStageApproved(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="stageApprovedCheck" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Formally Endorse & Approve this Stage
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStageModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
                >
                  {submitting ? 'Updating...' : 'Commit Stage Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecializationPage;
