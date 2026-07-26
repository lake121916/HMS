import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  Shield, Plus, Search, CheckCircle2, X, AlertCircle, FileText,
  Clock, CheckCircle, Ban, RefreshCw
} from 'lucide-react';

interface InsuranceClaim {
  id: number;
  patient_id: number;
  patient_name: string;
  provider_name: string;
  policy_number: string;
  claim_amount: string;
  status: string;
  diagnosis_code: string;
  notes: string;
  created_at: string;
}

const inp = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const InsurancePage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);

  // Forms state
  const [submitForm, setSubmitForm] = useState({
    patient_id: '',
    provider_name: 'Ethiopian Insurance Corp',
    policy_number: '',
    claim_amount: '',
    diagnosis_code: 'Z00.0',
    notes: ''
  });

  const [reviewForm, setReviewForm] = useState({
    status: 'approved',
    notes: ''
  });

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await api.get('/insurance/claims');
      if (res.data.success) {
        setClaims(res.data.data.claims || []);
      }
    } catch (err) {
      console.error('Failed to fetch insurance claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/insurance/claims', {
        ...submitForm,
        patient_id: parseInt(submitForm.patient_id, 10),
        claim_amount: parseFloat(submitForm.claim_amount)
      });
      if (res.data.success) {
        setShowSubmitModal(false);
        setSubmitForm({
          patient_id: '',
          provider_name: 'Ethiopian Insurance Corp',
          policy_number: '',
          claim_amount: '',
          diagnosis_code: 'Z00.0',
          notes: ''
        });
        fetchClaims();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit insurance claim.');
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      const res = await api.put(`/insurance/claims/${selectedClaim.id}`, reviewForm);
      if (res.data.success) {
        setShowReviewModal(false);
        setSelectedClaim(null);
        setReviewForm({ status: 'approved', notes: '' });
        fetchClaims();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update claim review.');
    }
  };

  const filteredClaims = claims.filter(c =>
    c.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.provider_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.policy_number?.includes(search)
  );

  // Statistics summaries
  const totalAmount = claims.reduce((acc, curr) => acc + parseFloat(curr.claim_amount || '0'), 0);
  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> Insurance Claims & Billing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            File claim reports, manage medical coverage approvals, and review policy verification parameters.
          </p>
        </div>
        {can('invoices:create') && (
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold gap-2 transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> File New Claim
          </button>
        )}
      </div>

      {/* Grid: Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-semibold block uppercase">Total Claim Submissions</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">ETB {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center text-yellow-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-semibold block uppercase">Pending Review claims</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{pendingCount} claims</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 font-semibold block uppercase">Approved Coverage cases</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{approvedCount} claims</span>
          </div>
        </div>
      </div>

      {/* Claims list registry */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
          <span className="font-bold text-gray-900 dark:text-white">Coverage Claims Database</span>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient or provider..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading claims record database...</p>
        ) : filteredClaims.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No claims filed inside the database yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5">Patient Name</th>
                  <th className="px-5 py-3.5">Insurance Provider</th>
                  <th className="px-5 py-3.5">Policy Number</th>
                  <th className="px-5 py-3.5">Claim Amount</th>
                  <th className="px-5 py-3.5">ICD Code</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                {filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-4 font-bold text-gray-950 dark:text-white">
                      {claim.patient_name}
                      <span className="block text-xs font-normal text-gray-400">Patient ID: #{claim.patient_id}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-650 dark:text-gray-350">{claim.provider_name}</td>
                    <td className="px-5 py-4 font-mono text-xs">{claim.policy_number}</td>
                    <td className="px-5 py-4 text-gray-900 dark:text-white">
                      ETB {parseFloat(claim.claim_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-500">{claim.diagnosis_code || 'Z00.0'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${STATUS_COLORS[claim.status] || ''}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {claim.status === 'pending' && can('admin:departments') ? (
                        <button
                          onClick={() => {
                            setSelectedClaim(claim);
                            setReviewForm({ status: 'approved', notes: '' });
                            setShowReviewModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 text-blue-700 rounded-lg text-xs font-bold"
                        >
                          Review claim
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-normal italic">
                          Reviewed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Submit New Claim */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Submit Insurance Claim</span>
              <button onClick={() => setShowSubmitModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleClaimSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Patient ID</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1"
                    value={submitForm.patient_id}
                    onChange={(e) => setSubmitForm({ ...submitForm, patient_id: e.target.value })}
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Claim Amount (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 450.00"
                    value={submitForm.claim_amount}
                    onChange={(e) => setSubmitForm({ ...submitForm, claim_amount: e.target.value })}
                    className={inp}
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>Insurance Provider</label>
                <select
                  value={submitForm.provider_name}
                  onChange={(e) => setSubmitForm({ ...submitForm, provider_name: e.target.value })}
                  className={inp}
                >
                  <option value="Ethiopian Insurance Corp">Ethiopian Insurance Corp</option>
                  <option value="Nyala Insurance S.C.">Nyala Insurance S.C.</option>
                  <option value="Awash Insurance Company">Awash Insurance Company</option>
                  <option value="United Insurance Company S.C.">United Insurance Company S.C.</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Policy / Coverage ID Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POL-993821"
                  value={submitForm.policy_number}
                  onChange={(e) => setSubmitForm({ ...submitForm, policy_number: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Diagnosis Code (ICD-10)</label>
                <input
                  type="text"
                  placeholder="e.g. I10 (Essential Hypertension)"
                  value={submitForm.diagnosis_code}
                  onChange={(e) => setSubmitForm({ ...submitForm, diagnosis_code: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Claim Notes / Descriptions</label>
                <textarea
                  rows={2}
                  placeholder="Brief claim description..."
                  value={submitForm.notes}
                  onChange={(e) => setSubmitForm({ ...submitForm, notes: e.target.value })}
                  className={inp}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm"
              >
                Submit Claim Report
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Claim */}
      {showReviewModal && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Review Insurance Claim</span>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <p><strong>Patient Name:</strong> {selectedClaim.patient_name}</p>
                <p><strong>Provider:</strong> {selectedClaim.provider_name}</p>
                <p><strong>Policy Number:</strong> {selectedClaim.policy_number}</p>
                <p><strong>Claim Amount:</strong> ETB {parseFloat(selectedClaim.claim_amount).toLocaleString()}</p>
              </div>
              <div>
                <label className={lbl}>Approval Decision</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                  className={inp}
                >
                  <option value="approved">Approve Coverage</option>
                  <option value="rejected">Reject Coverage</option>
                  <option value="processing">Mark as Processing</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Decision Justification Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="State reason for approval or rejection..."
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                  className={inp}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm"
              >
                Submit Claim Decision
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsurancePage;
