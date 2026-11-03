import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, Plus, Search, CheckCircle2,
  Download, Eye, Filter, X, ShieldCheck, Clock,
  Ban, Stethoscope, AlertTriangle
} from 'lucide-react';

interface DeathRecord {
  id: number;
  record_number: string;
  document_number?: string;
  patient_id: number;
  patient_name: string;
  mrn?: string;
  gender: string;
  age_years?: number;
  date_of_death: string;
  time_of_death: string;
  department_id?: number;
  dept_name?: string;
  place_of_death: string;
  attending_doctor_id: number;
  attending_doctor_full_name?: string;
  immediate_cause: string;
  antecedent_cause?: string;
  underlying_cause?: string;
  icd10_code?: string;
  contributing_conditions?: string;
  autopsy_requested: boolean;
  medical_history_summary?: string;
  next_of_kin_name: string;
  next_of_kin_relation: string;
  next_of_kin_phone?: string;
  next_of_kin_address?: string;
  document_status: 'pending_medical_verification' | 'verified' | 'approved' | 'issued' | 'rejected';
  verification_token?: string;
  verified_by_name?: string;
  approved_by_name?: string;
  issued_by_name?: string;
  rejection_reason?: string;
  created_at: string;
}

const DeathCertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DeathRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DeathRecord | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    patient_id: '',
    patient_name: '',
    mrn: '',
    gender: 'male',
    age_years: '',
    date_of_death: new Date().toISOString().split('T')[0],
    time_of_death: '12:00',
    department_id: '',
    department_name: '',
    place_of_death: 'Alem Ketema Enat Hospital - Inpatient Ward',
    attending_doctor_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Dr. Attending Physician',
    immediate_cause: '',
    antecedent_cause: '',
    underlying_cause: '',
    icd10_code: '',
    contributing_conditions: '',
    autopsy_requested: false,
    medical_history_summary: '',
    next_of_kin_name: '',
    next_of_kin_relation: '',
    next_of_kin_phone: '',
    next_of_kin_address: ''
  });

  // Patient search state
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');
  const isDoctor = ['doctor', 'admin', 'super_admin'].includes(user?.role || '');

  useEffect(() => {
    fetchRecords();
    fetchDepartments();
  }, [statusFilter, searchTerm]);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data?.data?.departments || res.data?.data || []);
    } catch (e) {
      console.error('Error fetching departments:', e);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/board/death-certificates', {
        params: {
          status: statusFilter,
          search: searchTerm || undefined
        }
      });
      if (res.data?.success) {
        setRecords(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching death records:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load death records' });
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async (query: string) => {
    setPatientSearch(query);
    if (!query || query.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const res = await api.get('/patients', { params: { search: query, limit: 6 } });
      setPatientResults(res.data?.data?.patients || res.data?.data || []);
    } catch (e) {
      console.error('Patient search error:', e);
    }
  };

  const selectPatient = (patient: any) => {
    let calculatedAge = '';
    if (patient.date_of_birth) {
      const dob = new Date(patient.date_of_birth);
      const diffMs = Date.now() - dob.getTime();
      calculatedAge = String(Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)));
    }

    setCreateForm(prev => ({
      ...prev,
      patient_id: String(patient.id),
      patient_name: `${patient.first_name} ${patient.last_name}`,
      mrn: `ETH-MRN-${patient.id}`,
      gender: patient.gender || 'male',
      age_years: calculatedAge,
      next_of_kin_name: patient.emergency_contact_name || '',
      next_of_kin_phone: patient.emergency_contact_phone || patient.phone || '',
      next_of_kin_relation: patient.emergency_contact_relation || 'Next of Kin'
    }));
    setPatientResults([]);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.patient_id) {
      setFeedbackMsg({ type: 'error', text: 'Please search and select deceased patient from hospital registry' });
      return;
    }
    if (!createForm.immediate_cause.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Immediate medical cause of death is required' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/board/death-certificates', createForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Hospital death documentation recorded successfully' });
        setShowCreateModal(false);
        fetchRecords();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error recording death document' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      const res = await api.put(`/board/death-certificates/${id}/verify`);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Medical cause of death verified by physician' });
        fetchRecords();
        if (selectedRecord?.id === id) {
          setSelectedRecord(res.data.data);
        }
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Verification failed' });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await api.put(`/board/death-certificates/${id}/approve`);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Death documentation approved' });
        fetchRecords();
        if (selectedRecord?.id === id) {
          setSelectedRecord(res.data.data);
        }
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Approval failed' });
    }
  };

  const handleIssue = async (id: number) => {
    try {
      const res = await api.put(`/board/death-certificates/${id}/issue`);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Official medical death documentation issued with QR code' });
        fetchRecords();
        if (selectedRecord?.id === id) {
          setSelectedRecord(res.data.data);
        }
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Issuance failed' });
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedRecord || !rejectionReason.trim()) return;
    try {
      const res = await api.put(`/board/death-certificates/${selectedRecord.id}/reject`, {
        rejection_reason: rejectionReason
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Death documentation rejected' });
        setShowRejectModal(false);
        setRejectionReason('');
        fetchRecords();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Rejection failed' });
    }
  };

  const downloadPdf = (id: number, _docNum?: string) => {
    window.open(`/api/board/death-certificates/${id}/pdf`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Issued</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><ShieldCheck className="w-3 h-3" /> Approved</span>;
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"><Stethoscope className="w-3 h-3" /> Medically Verified</span>;
      case 'pending_medical_verification':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Clock className="w-3 h-3" /> Pending Physician Verification</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><Ban className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Legal Notice */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border-l-4 border-slate-600 p-4 rounded-r-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-slate-700 dark:text-slate-300 mt-0.5 shrink-0" />
          <div className="text-sm text-slate-900 dark:text-slate-200">
            <p className="font-semibold">Legal Notice Regarding Hospital Cause of Death Certification:</p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Only authorized medical practitioners are legally permitted to document and verify clinical causes of death.
              This hospital document confirms clinical occurrence and medical cause within Alem Ketema Enat Hospital and does <strong>not</strong> substitute for official civil death certificates issued by the Vital Events Registration Agency (VERA) or Local Kebeles.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-slate-700 dark:text-slate-300" />
            Hospital Death Certificates & Documentation
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Register deceased patients, document WHO cause of death sequences, and issue verifiable hospital documentation.
          </p>
        </div>

        {isDoctor && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium shadow-sm transition-colors text-sm dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Plus className="w-4 h-4" />
            Document Deceased Patient
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

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search deceased patient, record #, MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-slate-500 outline-none"
          >
            <option value="all">All Document Statuses</option>
            <option value="pending_medical_verification">Pending Medical Verification</option>
            <option value="verified">Medically Verified</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
            Loading death documentation records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-600" />
            <p className="font-medium">No death records found</p>
            <p className="text-xs mt-1">Try adjusting your filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3.5 px-4">Document / Record #</th>
                  <th className="py-3.5 px-4">Deceased Patient</th>
                  <th className="py-3.5 px-4">Date & Department</th>
                  <th className="py-3.5 px-4">Immediate Cause (ICD-10)</th>
                  <th className="py-3.5 px-4">Attending Doctor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {r.record_number}
                      {r.document_number && (
                        <span className="block text-[11px] text-blue-600 dark:text-blue-400 font-sans mt-0.5">
                          Doc: {r.document_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{r.patient_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {r.gender} · {r.age_years ? `${r.age_years} yrs` : 'Age Unspecified'} · MRN: {r.mrn || `ETH-MRN-${r.patient_id}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 dark:text-gray-200">{new Date(r.date_of_death).toLocaleDateString()} {r.time_of_death?.slice(0, 5)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{r.dept_name || 'Hospital Inpatient'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 dark:text-gray-200 font-medium">{r.immediate_cause}</div>
                      {r.icd10_code && (
                        <span className="inline-block mt-0.5 text-[11px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                          {r.icd10_code}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 dark:text-gray-200">{r.attending_doctor_full_name || 'Dr. Certifying'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(r.document_status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => { setSelectedRecord(r); setShowDetailModal(true); }}
                          title="View Death Documentation Details"
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(r.document_status === 'issued' || r.document_status === 'approved' || r.document_status === 'verified') && (
                          <button
                            onClick={() => downloadPdf(r.id, r.document_number || r.record_number)}
                            title="Print / Download PDF Documentation"
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        {isDoctor && r.document_status === 'pending_medical_verification' && (
                          <button
                            onClick={() => handleVerify(r.id)}
                            title="Verify Medical Cause of Death"
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition-colors"
                          >
                            <Stethoscope className="w-4 h-4" />
                          </button>
                        )}

                        {isPrivileged && (r.document_status === 'verified' || r.document_status === 'approved') && !r.document_number && (
                          <button
                            onClick={() => handleIssue(r.id)}
                            title="Formally Issue Documentation with QR"
                            className="px-2 py-1 text-xs bg-slate-800 hover:bg-slate-900 text-white font-medium rounded transition-colors dark:bg-slate-700"
                          >
                            Issue
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

      {/* DETAIL MODAL */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Medical Death Documentation</h3>
                  <p className="text-xs text-gray-500 font-mono">{selectedRecord.record_number}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              {/* Deceased info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Deceased Full Name</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-base">{selectedRecord.patient_name}</span>
                  <span className="text-xs text-gray-400 block mt-0.5">MRN: {selectedRecord.mrn || `ETH-MRN-${selectedRecord.patient_id}`}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Demographics</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                    {selectedRecord.gender} · {selectedRecord.age_years ? `${selectedRecord.age_years} years old` : 'Age not recorded'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Date & Time of Death</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {new Date(selectedRecord.date_of_death).toLocaleDateString()} at {selectedRecord.time_of_death?.slice(0, 5)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Department & Location</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {selectedRecord.dept_name || 'Hospital Ward'} · {selectedRecord.place_of_death}
                  </span>
                </div>
              </div>

              {/* WHO Cause of death */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  WHO Standard Cause of Death Sequence
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 block">Immediate Cause (Part I Line a):</span>
                    <span className="text-gray-900 dark:text-white font-medium">{selectedRecord.immediate_cause}</span>
                    {selectedRecord.icd10_code && <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">[ICD-10: {selectedRecord.icd10_code}]</span>}
                  </div>

                  {selectedRecord.antecedent_cause && (
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block">Antecedent Cause (Line b):</span>
                      <span className="text-gray-900 dark:text-white">{selectedRecord.antecedent_cause}</span>
                    </div>
                  )}

                  {selectedRecord.underlying_cause && (
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block">Underlying Cause (Line c):</span>
                      <span className="text-gray-900 dark:text-white">{selectedRecord.underlying_cause}</span>
                    </div>
                  )}

                  {selectedRecord.contributing_conditions && (
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/40">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 block">Contributing Significant Conditions (Part II):</span>
                      <span className="text-gray-900 dark:text-white">{selectedRecord.contributing_conditions}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Next of Kin */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                <span className="font-semibold text-gray-900 dark:text-white block">Next of Kin / Informant:</span>
                <p className="text-gray-800 dark:text-gray-200">
                  {selectedRecord.next_of_kin_name} ({selectedRecord.next_of_kin_relation}) · Tel: {selectedRecord.next_of_kin_phone || 'N/A'}
                </p>
                {selectedRecord.next_of_kin_address && (
                  <p className="text-gray-500">Address: {selectedRecord.next_of_kin_address}</p>
                )}
              </div>

              {/* Status and Verification */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                <h4 className="font-semibold text-gray-900 dark:text-white">Verification & Issuance Status</h4>
                <div className="grid grid-cols-2 gap-3 text-gray-600 dark:text-gray-400">
                  <div>Document Status: {getStatusBadge(selectedRecord.document_status)}</div>
                  <div>Doc Number: <span className="font-mono">{selectedRecord.document_number || 'Pending'}</span></div>
                  <div>Attending Doctor: {selectedRecord.attending_doctor_full_name || 'Dr. Certifying'}</div>
                  <div>Verified By: {selectedRecord.verified_by_name || 'Pending'}</div>
                  <div>Approved By: {selectedRecord.approved_by_name || 'Pending'}</div>
                  <div>Issued By: {selectedRecord.issued_by_name || 'Pending'}</div>
                </div>

                {selectedRecord.rejection_reason && (
                  <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-900 dark:text-rose-300">
                    <span className="font-semibold block">Rejection Reason:</span>
                    <p className="mt-0.5">{selectedRecord.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
              <div>
                {isPrivileged && selectedRecord.document_status !== 'rejected' && selectedRecord.document_status !== 'issued' && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 rounded-lg hover:bg-rose-200 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Reject Documentation
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isDoctor && selectedRecord.document_status === 'pending_medical_verification' && (
                  <button
                    onClick={() => handleVerify(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <Stethoscope className="w-4 h-4" />
                    Physician Verify
                  </button>
                )}

                {isPrivileged && selectedRecord.document_status === 'verified' && (
                  <button
                    onClick={() => handleApprove(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Board Approve
                  </button>
                )}

                {isPrivileged && (selectedRecord.document_status === 'verified' || selectedRecord.document_status === 'approved') && !selectedRecord.document_number && (
                  <button
                    onClick={() => handleIssue(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors dark:bg-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Issue Document
                  </button>
                )}

                {(selectedRecord.document_status === 'issued' || selectedRecord.document_status === 'approved' || selectedRecord.document_status === 'verified') && (
                  <button
                    onClick={() => downloadPdf(selectedRecord.id, selectedRecord.document_number || selectedRecord.record_number)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF Documentation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Document Deceased Patient</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-sm">
              {/* Patient Lookup */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Deceased Patient from Hospital Records *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search deceased patient by name or ID..."
                    value={patientSearch}
                    onChange={(e) => searchPatients(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                  {patientResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {patientResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => selectPatient(p)}
                          className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer flex justify-between text-xs"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">{p.first_name} {p.last_name}</span>
                          <span className="text-gray-500">ID #{p.id} · {p.gender} · DOB: {p.date_of_birth || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {createForm.patient_id && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    ✓ Selected Patient: {createForm.patient_name} (MRN: {createForm.mrn})
                  </p>
                )}
              </div>

              {/* Date, Time & Department */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Death *</label>
                  <input
                    type="date"
                    required
                    value={createForm.date_of_death}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, date_of_death: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Time of Death *</label>
                  <input
                    type="time"
                    required
                    value={createForm.time_of_death}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, time_of_death: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Hospital Department</label>
                  <select
                    value={createForm.department_id}
                    onChange={(e) => {
                      const dept = departments.find(d => String(d.id) === e.target.value);
                      setCreateForm(prev => ({ ...prev, department_id: e.target.value, department_name: dept?.name || '' }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="">Select Ward / Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* WHO Causes of Death */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
                <span className="font-semibold text-xs text-gray-900 dark:text-white block">Medical Cause of Death (WHO Standards)</span>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Immediate Cause of Death (Part I Line a) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Septic Shock, Acute Respiratory Distress Syndrome..."
                    value={createForm.immediate_cause}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, immediate_cause: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Antecedent Cause (Line b)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Severe Community-Acquired Pneumonia"
                      value={createForm.antecedent_cause}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, antecedent_cause: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Underlying Cause (Line c)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Type 2 Diabetes Mellitus"
                      value={createForm.underlying_cause}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, underlying_cause: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ICD-10 Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. A41.9, J96.0, E11.9"
                      value={createForm.icd10_code}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, icd10_code: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contributing Conditions (Part II)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chronic Kidney Disease, Hypertension"
                      value={createForm.contributing_conditions}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, contributing_conditions: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Next of Kin */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Next of Kin Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.next_of_kin_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, next_of_kin_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Relationship *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spouse, Son, Mother"
                    value={createForm.next_of_kin_relation}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, next_of_kin_relation: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.next_of_kin_phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, next_of_kin_phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
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
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 dark:bg-slate-700"
                >
                  {submitting ? 'Recording...' : 'Record Death Documentation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              Reject Medical Death Documentation
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Provide clinical or administrative rationale for returning or rejecting this record.
            </p>

            <div className="mt-4 space-y-3">
              <textarea
                required
                placeholder="Specify clinical or documentation discrepancy..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 h-24"
              />

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-sm"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeathCertificatesPage;
