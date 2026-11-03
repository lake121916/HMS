import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Baby, Plus, Search, CheckCircle2,
  Download, Eye, Filter, X, ShieldCheck, Clock,
  Edit3, Ban, HeartHandshake, AlertTriangle
} from 'lucide-react';

interface BirthRecord {
  id: number;
  registration_number: string;
  certificate_number?: string;
  baby_name: string;
  gender: string;
  date_of_birth: string;
  time_of_birth: string;
  mother_id: number;
  mother_name: string;
  mother_phone?: string;
  father_name?: string;
  father_national_id?: string;
  father_phone?: string;
  attending_clinician_name?: string;
  clinician_role?: string;
  delivery_type: string;
  birth_weight: number;
  gestational_age_weeks?: number;
  apgar_score_1min?: number;
  apgar_score_5min?: number;
  place_of_birth: string;
  medical_record_ref?: string;
  certificate_status: 'draft' | 'pending_verification' | 'approved' | 'issued' | 'rejected' | 'corrected';
  verification_token?: string;
  registered_by_name?: string;
  verified_by_name?: string;
  approved_by_name?: string;
  issued_by_name?: string;
  rejection_reason?: string;
  correction_notes?: string;
  created_at: string;
}

const BirthCertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<BirthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BirthRecord | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionData, setCorrectionData] = useState({
    baby_name: '',
    father_name: '',
    birth_weight: '',
    delivery_type: 'Spontaneous Vaginal',
    father_national_id: '',
    father_phone: ''
  });

  const [createForm, setCreateForm] = useState({
    baby_name: '',
    gender: 'male',
    date_of_birth: new Date().toISOString().split('T')[0],
    time_of_birth: '12:00',
    mother_id: '',
    mother_name: '',
    father_name: '',
    father_national_id: '',
    father_phone: '',
    attending_clinician_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Dr. Attending',
    clinician_role: 'Doctor',
    delivery_type: 'Spontaneous Vaginal',
    birth_weight: '3.2',
    gestational_age_weeks: '39',
    apgar_score_1min: '8',
    apgar_score_5min: '9',
    place_of_birth: 'Alem Ketema Enat Hospital - Maternity & Delivery Ward',
    medical_record_ref: ''
  });

  // Patient search for mother
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);

  const isPrivileged = ['admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');
  const isClinician = ['doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager'].includes(user?.role || '');

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, searchTerm]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/board/birth-certificates', {
        params: {
          status: statusFilter,
          search: searchTerm || undefined
        }
      });
      if (res.data?.success) {
        setRecords(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching birth records:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to load birth records' });
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
      const pts = res.data?.data?.patients || res.data?.data || [];
      // Filter female patients for mother registration if gender specified
      setPatientResults(pts.filter((p: any) => p.gender === 'female' || !p.gender));
    } catch (e) {
      console.error('Patient search error:', e);
    }
  };

  const selectMother = (patient: any) => {
    setCreateForm(prev => ({
      ...prev,
      mother_id: String(patient.id),
      mother_name: `${patient.first_name} ${patient.last_name}`,
      medical_record_ref: `ETH-MRN-${patient.id}`
    }));
    setPatientResults([]);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.mother_id) {
      setFeedbackMsg({ type: 'error', text: 'Please search and select the mother from patient registry' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/board/birth-certificates', createForm);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Newborn registered successfully' });
        setShowCreateModal(false);
        fetchRecords();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Error registering birth record' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: number) => {
    try {
      const res = await api.put(`/board/birth-certificates/${id}/verify`);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Birth record verified and approved' });
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
      const res = await api.put(`/board/birth-certificates/${id}/approve`);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Birth record approved' });
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
      const res = await api.put(`/board/birth-certificates/${id}/issue`);
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Birth certificate formally issued with verification QR' });
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
      const res = await api.put(`/board/birth-certificates/${selectedRecord.id}/reject`, {
        rejection_reason: rejectionReason
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Birth record rejected' });
        setShowRejectModal(false);
        setRejectionReason('');
        fetchRecords();
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Rejection failed' });
    }
  };

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord || !correctionNotes.trim()) return;
    try {
      const res = await api.put(`/board/birth-certificates/${selectedRecord.id}/correct`, {
        correction_notes: correctionNotes,
        ...correctionData
      });
      if (res.data?.success) {
        setFeedbackMsg({ type: 'success', text: 'Birth certificate amended with audit trail' });
        setShowCorrectModal(false);
        setCorrectionNotes('');
        fetchRecords();
        setSelectedRecord(res.data.data);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.response?.data?.message || 'Correction failed' });
    }
  };

  const downloadPdf = (id: number, _docNum?: string) => {
    window.open(`/api/board/birth-certificates/${id}/pdf`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> Issued</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"><ShieldCheck className="w-3 h-3" /> Approved</span>;
      case 'pending_verification':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"><Clock className="w-3 h-3" /> Pending Verification</span>;
      case 'corrected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"><Edit3 className="w-3 h-3" /> Corrected</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><Ban className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Draft</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Notice Alert */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">Legal Notice Regarding Hospital Birth Records:</p>
            <p className="mt-0.5">
              Hospital birth certificates issued by Alem Ketema Enat Hospital are clinical notifications confirming delivery details within this facility.
              They are <strong>not</strong> a substitute for official civil birth certificates issued by the Federal Vital Events Registration Agency (VERA) or Local Kebeles.
            </p>
          </div>
        </div>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Baby className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Birth Certificates & Newborn Registry
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            Manage newborn registrations, clinical delivery verifications, and hospital certificate issuance.
          </p>
        </div>

        {isClinician && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Register Newborn
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

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search baby name, mother, reg #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="approved">Approved</option>
            <option value="issued">Issued</option>
            <option value="corrected">Corrected</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading newborn records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Baby className="w-12 h-12 mx-auto mb-3 opacity-40 text-emerald-600" />
            <p className="font-medium">No birth records found</p>
            <p className="text-xs mt-1">Try adjusting your search criteria or register a new birth event.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3.5 px-4">Registration #</th>
                  <th className="py-3.5 px-4">Baby Particulars</th>
                  <th className="py-3.5 px-4">Mother Name</th>
                  <th className="py-3.5 px-4">Delivery & Weight</th>
                  <th className="py-3.5 px-4">Attending Clinician</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {r.registration_number}
                      {r.certificate_number && (
                        <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-sans mt-0.5">
                          Cert: {r.certificate_number}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{r.baby_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {r.gender} · {new Date(r.date_of_birth).toLocaleDateString()} {r.time_of_birth?.slice(0, 5)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{r.mother_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">MRN: ETH-MRN-{r.mother_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 dark:text-gray-200">{r.delivery_type}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{r.birth_weight} kg · GA {r.gestational_age_weeks || 39}w</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-gray-900 dark:text-gray-200">{r.attending_clinician_name || 'Dr. On-Duty'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{r.clinician_role || 'Doctor'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(r.certificate_status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => { setSelectedRecord(r); setShowDetailModal(true); }}
                          title="View Record Details"
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(r.certificate_status === 'issued' || r.certificate_status === 'approved' || r.certificate_status === 'corrected') && (
                          <button
                            onClick={() => downloadPdf(r.id, r.certificate_number || r.registration_number)}
                            title="Print / Download PDF Certificate"
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        {isClinician && r.certificate_status === 'pending_verification' && (
                          <button
                            onClick={() => handleVerify(r.id)}
                            title="Verify Medical Delivery Record"
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}

                        {isPrivileged && (r.certificate_status === 'approved' || r.certificate_status === 'corrected') && !r.certificate_number && (
                          <button
                            onClick={() => handleIssue(r.id)}
                            title="Formally Issue Certificate & QR Code"
                            className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition-colors"
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
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <Baby className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Hospital Birth Record</h3>
                  <p className="text-xs text-gray-500 font-mono">{selectedRecord.registration_number}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Baby Full Name</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-base">{selectedRecord.baby_name}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Gender & Weight</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{selectedRecord.gender} · {selectedRecord.birth_weight} kg</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Date & Time of Birth</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {new Date(selectedRecord.date_of_birth).toLocaleDateString()} at {selectedRecord.time_of_birth?.slice(0, 5)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Delivery Type</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{selectedRecord.delivery_type}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Apgar Score (1m / 5m)</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{selectedRecord.apgar_score_1min || '-'} / {selectedRecord.apgar_score_5min || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">Gestational Age</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{selectedRecord.gestational_age_weeks || 39} Weeks</span>
                </div>
              </div>

              {/* Parents Section */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  Parental Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Mother Full Name:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{selectedRecord.mother_name}</span>
                    <span className="text-gray-400 block mt-0.5">Patient ID: #{selectedRecord.mother_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Father Full Name:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{selectedRecord.father_name || 'Not Recorded'}</span>
                    {selectedRecord.father_national_id && <span className="text-gray-400 block mt-0.5">ID: {selectedRecord.father_national_id}</span>}
                  </div>
                </div>
              </div>

              {/* Verification & Lifecycle status */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Administrative & Verification Status
                </h4>
                <div className="grid grid-cols-2 gap-3 text-gray-600 dark:text-gray-400">
                  <div>Status: {getStatusBadge(selectedRecord.certificate_status)}</div>
                  <div>Cert #: <span className="font-mono">{selectedRecord.certificate_number || 'Unissued'}</span></div>
                  <div>Attending Clinician: {selectedRecord.attending_clinician_name || '-'}</div>
                  <div>Verified By: {selectedRecord.verified_by_name || 'Pending'}</div>
                  <div>Approved By: {selectedRecord.approved_by_name || 'Pending'}</div>
                  <div>Issued By: {selectedRecord.issued_by_name || 'Pending'}</div>
                </div>

                {selectedRecord.correction_notes && (
                  <div className="mt-3 p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-900 dark:text-purple-300">
                    <span className="font-semibold block">Correction Audit History:</span>
                    <p className="mt-0.5 whitespace-pre-wrap">{selectedRecord.correction_notes}</p>
                  </div>
                )}

                {selectedRecord.rejection_reason && (
                  <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-900 dark:text-rose-300">
                    <span className="font-semibold block">Rejection Reason:</span>
                    <p className="mt-0.5">{selectedRecord.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isPrivileged && selectedRecord.certificate_status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setCorrectionData({
                        baby_name: selectedRecord.baby_name,
                        father_name: selectedRecord.father_name || '',
                        birth_weight: String(selectedRecord.birth_weight),
                        delivery_type: selectedRecord.delivery_type,
                        father_national_id: selectedRecord.father_national_id || '',
                        father_phone: selectedRecord.father_phone || ''
                      });
                      setShowCorrectModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Correct Details
                  </button>
                )}

                {isPrivileged && selectedRecord.certificate_status !== 'rejected' && selectedRecord.certificate_status !== 'issued' && (
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 rounded-lg hover:bg-rose-200 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Reject
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isClinician && selectedRecord.certificate_status === 'pending_verification' && (
                  <button
                    onClick={() => handleVerify(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Medically Verify
                  </button>
                )}

                {isPrivileged && selectedRecord.certificate_status === 'pending_verification' && (
                  <button
                    onClick={() => handleApprove(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Board Approve
                  </button>
                )}

                {isPrivileged && (selectedRecord.certificate_status === 'approved' || selectedRecord.certificate_status === 'corrected') && !selectedRecord.certificate_number && (
                  <button
                    onClick={() => handleIssue(selectedRecord.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Issue Certificate
                  </button>
                )}

                {(selectedRecord.certificate_status === 'issued' || selectedRecord.certificate_status === 'approved' || selectedRecord.certificate_status === 'corrected') && (
                  <button
                    onClick={() => downloadPdf(selectedRecord.id, selectedRecord.certificate_number || selectedRecord.registration_number)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF Certificate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEWBORN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Newborn Delivery Registration</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-sm">
              {/* Mother Lookup */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Mother from Patient Directory *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search mother by name or patient ID..."
                    value={patientSearch}
                    onChange={(e) => searchPatients(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {patientResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {patientResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => selectMother(p)}
                          className="px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer flex justify-between text-xs"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">{p.first_name} {p.last_name}</span>
                          <span className="text-gray-500">ID #{p.id} · Phone: {p.phone || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {createForm.mother_id && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    ✓ Selected Mother: {createForm.mother_name} (Patient ID: #{createForm.mother_id})
                  </p>
                )}
              </div>

              {/* Baby particulars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Baby Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kidus Yohannes Bekele"
                    value={createForm.baby_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, baby_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Gender *</label>
                  <select
                    value={createForm.gender}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={createForm.date_of_birth}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Time of Birth *</label>
                  <input
                    type="time"
                    required
                    value={createForm.time_of_birth}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, time_of_birth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Delivery Clinical Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Delivery Type *</label>
                  <select
                    value={createForm.delivery_type}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, delivery_type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Spontaneous Vaginal">Spontaneous Vaginal</option>
                    <option value="Cesarean Section">Cesarean Section</option>
                    <option value="Assisted Instrumental">Assisted Instrumental</option>
                    <option value="Breech Extraction">Breech Extraction</option>
                    <option value="Vacuum Assisted">Vacuum Assisted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Birth Weight (kg) *</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={createForm.birth_weight}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, birth_weight: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Gestational Age (weeks)</label>
                  <input
                    type="number"
                    value={createForm.gestational_age_weeks}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, gestational_age_weeks: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Apgar Scores */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Apgar 1-Minute (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={createForm.apgar_score_1min}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, apgar_score_1min: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Apgar 5-Minute (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={createForm.apgar_score_5min}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, apgar_score_5min: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Father particulars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Father Full Name</label>
                  <input
                    type="text"
                    value={createForm.father_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, father_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Father National ID / Kebele ID</label>
                  <input
                    type="text"
                    value={createForm.father_national_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, father_national_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Father Phone</label>
                  <input
                    type="text"
                    value={createForm.father_phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, father_phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Clinician and Hospital */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Attending Clinician Name</label>
                  <input
                    type="text"
                    value={createForm.attending_clinician_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, attending_clinician_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Place of Delivery</label>
                  <input
                    type="text"
                    value={createForm.place_of_birth}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, place_of_birth: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Newborn Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CORRECTION MODAL */}
      {showCorrectModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-purple-600" />
              Authorized Amendment with Audit Trail
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Modifying record for {selectedRecord.baby_name} ({selectedRecord.registration_number}). All changes are permanently recorded in the administrative audit log.
            </p>

            <form onSubmit={handleCorrectionSubmit} className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Correction Reason & Legal Authority *</label>
                <textarea
                  required
                  placeholder="Explain why correction is required (e.g. Parental name spelling rectification per Kebele ID)..."
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Corrected Baby Name</label>
                <input
                  type="text"
                  value={correctionData.baby_name}
                  onChange={(e) => setCorrectionData(prev => ({ ...prev, baby_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Corrected Father Name</label>
                <input
                  type="text"
                  value={correctionData.father_name}
                  onChange={(e) => setCorrectionData(prev => ({ ...prev, father_name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Birth Weight (kg)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={correctionData.birth_weight}
                    onChange={(e) => setCorrectionData(prev => ({ ...prev, birth_weight: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Father Phone</label>
                  <input
                    type="text"
                    value={correctionData.father_phone}
                    onChange={(e) => setCorrectionData(prev => ({ ...prev, father_phone: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm"
                >
                  Commit Amendment
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
              Reject Birth Certificate Record
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Please specify the clinical or administrative reason for rejecting this record.
            </p>

            <div className="mt-4 space-y-3">
              <textarea
                required
                placeholder="State the reason for rejection..."
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

export default BirthCertificatesPage;
