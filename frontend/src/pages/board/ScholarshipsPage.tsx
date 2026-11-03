import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap, Plus, CheckCircle2, Clock,
  X, Award, Briefcase, Ban, Star
} from 'lucide-react';

interface ScholarshipProgram {
  id: number;
  program_code: string;
  title: string;
  category: string;
  sponsoring_org: string;
  total_slots: number;
  available_slots: number;
  opening_date: string;
  closing_date: string;
  eligibility_criteria: string;
  financial_support_amount: number | string;
  duration_months: number;
  required_documents: string[];
  status: 'draft' | 'active' | 'closed' | 'completed';
  total_applications?: number;
  approved_applications?: number;
}

interface ScholarshipApplication {
  id: number;
  application_number: string;
  program_id: number;
  program_title: string;
  program_category: string;
  financial_support_amount: number | string;
  applicant_user_id: number;
  applicant_name: string;
  applicant_type: 'employee' | 'student';
  employee_id_code?: string;
  department_name?: string;
  education_level: string;
  academic_gpa?: number;
  years_of_experience: number;
  contact_phone: string;
  contact_email: string;
  statement_of_purpose?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'shortlisted' | 'approved' | 'rejected' | 'completed';
  evaluation_score?: number;
  evaluation_remarks?: string;
  evaluator_name?: string;
  board_decision_ref?: string;
  approver_name?: string;
  rejection_reason?: string;
  created_at: string;
}

const ScholarshipsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'programs' | 'applications'>('programs');
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedProgramForApply, setSelectedProgramForApply] = useState<ScholarshipProgram | null>(null);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [selectedAppForEvaluate, setSelectedAppForEvaluate] = useState<ScholarshipApplication | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedAppForDecision, setSelectedAppForDecision] = useState<ScholarshipApplication | null>(null);

  // Forms
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  // Create Program Form
  const [programForm, setProgramForm] = useState({
    title: '',
    category: 'Postgraduate Medical Residency',
    sponsoring_org: 'Ministry of Health & Hospital Board Fellowship',
    total_slots: '2',
    opening_date: new Date().toISOString().split('T')[0],
    closing_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eligibility_criteria: 'Minimum 2 years hospital service at Alem Ketema Enat Hospital with satisfactory clinical appraisal.',
    financial_support_amount: '200000',
    duration_months: '36'
  });

  // Apply Form
  const [applyForm, setApplyForm] = useState({
    applicant_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Staff Clinician',
    applicant_type: 'employee',
    employee_id_code: `EMP-${user?.id || '101'}`,
    department_id: '',
    education_level: 'Doctor of Medicine (MD)',
    academic_gpa: '3.65',
    years_of_experience: '3.0',
    contact_phone: '+251 91 123 4567',
    contact_email: user?.email || 'staff@hospital.com',
    statement_of_purpose: ''
  });

  // Evaluation Form
  const [evalScore, setEvalScore] = useState('85');
  const [evalRemarks, setEvalRemarks] = useState('');
  const [isShortlist, setIsShortlist] = useState(true);

  // Decision Form
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [boardDecisionRef, setBoardDecisionRef] = useState('RES-2026-004');
  const [decisionReason, setDecisionReason] = useState('');

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');

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
        const res = await api.get('/board/scholarships/programs');
        setPrograms(res.data?.data || []);
      } else {
        const res = await api.get('/board/scholarships/applications');
        setApplications(res.data?.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching scholarship data:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to fetch scholarship information' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/board/scholarships/programs', programForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Scholarship program created successfully' });
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
    setSubmitting(true);
    try {
      const res = await api.post('/board/scholarships/applications', {
        program_id: selectedProgramForApply.id,
        ...applyForm
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Scholarship application submitted to the hospital committee!' });
        setShowApplyModal(false);
        setActiveTab('applications');
        fetchData();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error submitting application' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForEvaluate) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/board/scholarships/applications/${selectedAppForEvaluate.id}/evaluate`, {
        evaluation_score: evalScore,
        evaluation_remarks: evalRemarks,
        shortlist: isShortlist
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Committee evaluation recorded successfully' });
        setShowEvaluateModal(false);
        fetchData();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error recording evaluation' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForDecision) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/board/scholarships/applications/${selectedAppForDecision.id}/decision`, {
        decision: decisionType,
        board_decision_ref: boardDecisionRef,
        rejection_reason: decisionReason
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: `Scholarship application ${decisionType}` });
        setShowDecisionModal(false);
        fetchData();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error submitting decision' });
    } finally {
      setSubmitting(false);
    }
  };

  const getAppStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Approved & Awarded</span>;
      case 'shortlisted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><Star className="w-3 h-3" /> Shortlisted</span>;
      case 'under_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"><Clock className="w-3 h-3" /> Committee Review</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><Ban className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Submitted</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Hospital Scholarship & Fellowships
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Manage scholarship programs, track employee educational sponsorships, and record board award decisions.
          </p>
        </div>

        {isPrivileged && (
          <button
            onClick={() => setShowCreateProgramModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Scholarship Program
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
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Award className="w-4 h-4" />
          Scholarship Programs ({programs.length})
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`py-3 px-5 font-semibold text-sm border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'applications'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Application Directory ({applications.length})
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-gray-500">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading scholarship data...
        </div>
      ) : activeTab === 'programs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {programs.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    {p.program_code}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white mt-3 text-base leading-snug">
                  {p.title}
                </h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                  {p.category}
                </p>

                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2.5 line-clamp-3">
                  {p.eligibility_criteria}
                </p>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sponsor:</span>
                    <span className="font-medium text-right">{p.sponsoring_org}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Slots:</span>
                    <span className="font-medium">{p.available_slots} available / {p.total_slots} total</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Financial Support:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {Number(p.financial_support_amount).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Duration:</span>
                    <span className="font-medium">{p.duration_months} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Deadline:</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{new Date(p.closing_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs text-gray-400">
                  {p.total_applications || 0} applied · {p.approved_applications || 0} awarded
                </span>

                {p.status === 'active' && p.available_slots > 0 && (
                  <button
                    onClick={() => {
                      setSelectedProgramForApply(p);
                      setShowApplyModal(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VIEW: APPLICATIONS TABLE */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {applications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-40 text-indigo-600" />
              <p className="font-medium">No scholarship applications submitted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Application #</th>
                    <th className="py-3 px-4">Applicant & Dept</th>
                    <th className="py-3 px-4">Program Applied</th>
                    <th className="py-3 px-4">Credentials & GPA</th>
                    <th className="py-3 px-4">Evaluation Score</th>
                    <th className="py-3 px-4">Status</th>
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
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {app.department_name || 'Staff'} · {app.contact_phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-gray-200">{app.program_title}</div>
                        <div className="text-xs text-emerald-600 font-medium">
                          {Number(app.financial_support_amount).toLocaleString()} ETB
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="text-gray-900 dark:text-gray-200 font-medium">{app.education_level}</div>
                        <div className="text-gray-500">GPA: {app.academic_gpa || 'N/A'} · Exp: {app.years_of_experience} yrs</div>
                      </td>
                      <td className="py-3 px-4">
                        {app.evaluation_score !== undefined && app.evaluation_score !== null ? (
                          <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {app.evaluation_score} / 100
                            {app.evaluator_name && <span className="block text-[11px] text-gray-400 font-normal">By: {app.evaluator_name}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not Evaluated</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {getAppStatusBadge(app.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isPrivileged && app.status !== 'approved' && app.status !== 'rejected' && (
                            <button
                              onClick={() => {
                                setSelectedAppForEvaluate(app);
                                setEvalScore(String(app.evaluation_score || '85'));
                                setEvalRemarks(app.evaluation_remarks || '');
                                setShowEvaluateModal(true);
                              }}
                              title="Evaluate Application"
                              className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium rounded transition-colors"
                            >
                              Evaluate
                            </button>
                          )}

                          {isPrivileged && (app.status === 'shortlisted' || app.status === 'under_review') && (
                            <button
                              onClick={() => {
                                setSelectedAppForDecision(app);
                                setShowDecisionModal(true);
                              }}
                              title="Record Board Award Decision"
                              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors"
                            >
                              Board Decision
                            </button>
                          )}
                        </div>
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
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Create New Scholarship Program
              </h3>
              <button onClick={() => setShowCreateProgramModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Scholarship Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surgical Subspecialty Fellowship 2026/27"
                  value={programForm.title}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={programForm.category}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sponsoring Organization *</label>
                  <input
                    type="text"
                    required
                    value={programForm.sponsoring_org}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, sponsoring_org: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Available Slots *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={programForm.total_slots}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, total_slots: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Stipend / Support (ETB)</label>
                  <input
                    type="number"
                    value={programForm.financial_support_amount}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, financial_support_amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    value={programForm.duration_months}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, duration_months: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Opening Date *</label>
                  <input
                    type="date"
                    required
                    value={programForm.opening_date}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, opening_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Closing Date *</label>
                  <input
                    type="date"
                    required
                    value={programForm.closing_date}
                    onChange={(e) => setProgramForm(prev => ({ ...prev, closing_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Eligibility Criteria *</label>
                <textarea
                  required
                  value={programForm.eligibility_criteria}
                  onChange={(e) => setProgramForm(prev => ({ ...prev, eligibility_criteria: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-20"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Creating...' : 'Publish Program'}
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
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Submit Scholarship Application</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{selectedProgramForApply.title}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Applicant Full Name *</label>
                  <input
                    type="text"
                    required
                    value={applyForm.applicant_name}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, applicant_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Employee / Student ID</label>
                  <input
                    type="text"
                    value={applyForm.employee_id_code}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, employee_id_code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Qualification / Education *</label>
                  <input
                    type="text"
                    required
                    value={applyForm.education_level}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, education_level: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Academic GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={applyForm.academic_gpa}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, academic_gpa: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={applyForm.department_id}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, department_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Select Department (Optional)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={applyForm.contact_phone}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    value={applyForm.contact_email}
                    onChange={(e) => setApplyForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Statement of Motivation & Professional Commitment</label>
                <textarea
                  placeholder="Explain why you wish to pursue this scholarship and how your training will benefit Alem Ketema Enat Hospital..."
                  value={applyForm.statement_of_purpose}
                  onChange={(e) => setApplyForm(prev => ({ ...prev, statement_of_purpose: e.target.value }))}
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVALUATION MODAL */}
      {showEvaluateModal && selectedAppForEvaluate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Record Committee Evaluation</h3>
            <p className="text-xs text-gray-500 mt-1">Applicant: {selectedAppForEvaluate.applicant_name} ({selectedAppForEvaluate.application_number})</p>

            <form onSubmit={handleEvaluateSubmit} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Evaluation Score (0 - 100) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={evalScore}
                  onChange={(e) => setEvalScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Committee Remarks</label>
                <textarea
                  value={evalRemarks}
                  onChange={(e) => setEvalRemarks(e.target.value)}
                  placeholder="Record evaluation panel comments, academic merits, clinical interview assessment..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shortlistToggle"
                  checked={isShortlist}
                  onChange={(e) => setIsShortlist(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="shortlistToggle" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Advance to Shortlisted Candidates
                </label>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEvaluateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECISION MODAL */}
      {showDecisionModal && selectedAppForDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base">Formal Board Award Decision</h3>
            <p className="text-xs text-gray-500 mt-1">Applicant: {selectedAppForDecision.applicant_name} ({selectedAppForDecision.program_title})</p>

            <form onSubmit={handleDecisionSubmit} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Board Decision *</label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="approved">Approve & Award Scholarship</option>
                  <option value="rejected">Reject Application</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Board Resolution Reference</label>
                <input
                  type="text"
                  placeholder="e.g. RES-2026-004"
                  value={boardDecisionRef}
                  onChange={(e) => setBoardDecisionRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                />
              </div>

              {decisionType === 'rejected' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Rejection Reason</label>
                  <textarea
                    required
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm h-20"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-lg font-medium text-sm text-white ${
                    decisionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Recording...' : `Record ${decisionType === 'approved' ? 'Award' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipsPage;
