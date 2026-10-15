/**
 * InsurancePage — Full Insurance & Claims Management (Migration 009)
 *
 * Tabs:
 *  1. Dashboard   — KPI cards + status breakdown + provider performance
 *  2. Policies    — Patient policy enrollment & benefit tracker
 *  3. Claims      — Claims lifecycle (submit → approve → paid)
 *  4. Pre-Auth    — Pre-authorization request management
 *  5. Providers   — Provider registry (admin)
 */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield, Plus, Search, FileText, X, CheckCircle2,
  AlertTriangle, RefreshCw, ChevronUp,
  Building2, CreditCard, DollarSign, TrendingUp,
  Eye, Edit2, Banknote,
  Activity, BarChart3, Filter
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Provider {
  id: number; code: string; name_en: string; name_am?: string;
  provider_type: string; phone?: string; email?: string;
  contract_end_date?: string; reimbursement_days: number; is_active: boolean;
}

interface Policy {
  id: number; patient_id: number; patient_name: string;
  provider_id: number; provider_name: string; provider_code: string; provider_type: string;
  policy_number: string; membership_id?: string; plan_name?: string; plan_type: string;
  effective_date: string; expiry_date?: string;
  annual_limit?: number; remaining_benefit?: number;
  copay_fixed: number; copay_percentage: number; deductible_amount: number; deductible_met: number;
  is_primary: boolean; is_active: boolean; verification_status: string;
}

interface Claim {
  id: number; claim_number: string; patient_id: number; patient_name: string;
  provider_name?: string; provider_code?: string; policy_number?: string; plan_name?: string;
  claim_amount: string; approved_amount?: number; payment_amount?: number;
  patient_copay?: number; deductible_applied?: number;
  status: string; claim_type: string; diagnosis_code?: string;
  notes?: string; rejection_reason?: string; provider_claim_ref?: string;
  submitted_by_email?: string; reviewed_by_email?: string;
  submitted_at?: string; reviewed_at?: string; payment_received_at?: string;
  created_at: string;
}

interface PARequest {
  id: number; pa_number: string; patient_name: string; provider_name: string;
  policy_number: string; service_type: string; service_description: string;
  requested_amount: number; approved_amount?: number;
  status: string; requested_at: string; reviewed_at?: string;
  review_notes?: string; valid_from?: string; valid_until?: string;
  provider_reference?: string;
}

interface Analytics {
  totals: { total_claims: string; total_billed: string; total_approved: string; total_paid: string; total_copay: string };
  byStatus: { status: string; count: string; amount: string }[];
  byProvider: { provider_name: string; code: string; claims: string; billed: string; approved: string }[];
  paPending: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard',  icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'policies',  label: 'Policies',   icon: <CreditCard className="h-4 w-4" /> },
  { id: 'claims',    label: 'Claims',     icon: <FileText className="h-4 w-4" /> },
  { id: 'preauth',   label: 'Pre-Auth',   icon: <Shield className="h-4 w-4" /> },
  { id: 'providers', label: 'Providers',  icon: <Building2 className="h-4 w-4" /> },
] as const;
type TabId = typeof TABS[number]['id'];

const STATUS_COLORS: Record<string, string> = {
  pending:            'bg-amber-100 text-amber-700',
  submitted:          'bg-blue-100 text-blue-700',
  processing:         'bg-sky-100 text-sky-700',
  approved:           'bg-emerald-100 text-emerald-700',
  partially_approved: 'bg-teal-100 text-teal-700',
  rejected:           'bg-red-100 text-red-700',
  paid:               'bg-green-100 text-green-700',
  appealed:           'bg-purple-100 text-purple-700',
  written_off:        'bg-slate-100 text-slate-500',
  draft:              'bg-gray-100 text-gray-500',
  unverified:         'bg-amber-100 text-amber-700',
  verified:           'bg-emerald-100 text-emerald-700',
  expired:            'bg-red-100 text-red-700',
  suspended:          'bg-orange-100 text-orange-700',
  cancelled:          'bg-gray-100 text-gray-500',
};

const PROVIDERS_LIST = [
  'Ethiopian Insurance Corporation','Nyala Insurance S.C.','Awash Insurance Company S.C.',
  'United Insurance Company S.C.','Nile Insurance Company S.C.','Community-Based Health Insurance (CBHI)',
  'Other',
];

const fmt = (n: number | string | undefined | null) =>
  parseFloat(String(n || 0)).toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-ET') : '—';

const inp = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-slate-900 dark:text-white';
const lbl = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

// ── Main Component ────────────────────────────────────────────────────────────

const InsurancePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = ['super_admin','admin','hospital_manager','finance_officer'].includes(user?.role || '');

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Data states
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [paRequests, setPaRequests] = useState<PARequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Search / filter
  const [claimSearch, setClaimSearch] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');
  const [policySearch, setPolicySearch] = useState('');

  // Modals
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showPAModal, setShowPAModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPAReviewModal, setShowPAReviewModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [selectedPA, setSelectedPA] = useState<PARequest | null>(null);
  const [expandedClaim, setExpandedClaim] = useState<number | null>(null);

  // Forms
  const [claimForm, setClaimForm] = useState({
    patient_id: '', provider_name: 'Ethiopian Insurance Corporation', policy_number: '',
    claim_amount: '', diagnosis_code: 'Z00.0', claim_type: 'outpatient', notes: '',
  });
  const [policyForm, setPolicyForm] = useState({
    patient_id: '', provider_id: '', policy_number: '', plan_name: '', plan_type: 'inpatient_outpatient',
    effective_date: '', expiry_date: '', annual_limit: '', copay_fixed: '0', copay_percentage: '0',
    deductible_amount: '0', is_primary: true, notes: '',
  });
  const [paForm, setPAForm] = useState({
    policy_id: '', patient_id: '', service_type: 'diagnostic', service_description: '',
    requested_amount: '', valid_from: '', valid_until: '',
  });
  const [reviewForm, setReviewForm] = useState({
    status: 'approved', approved_amount: '', provider_claim_ref: '', notes: '', rejection_reason: '',
  });
  const [paReviewForm, setPAReviewForm] = useState({
    status: 'approved', approved_amount: '', provider_reference: '', review_notes: '',
    valid_from: '', valid_until: '',
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch functions
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/insurance/analytics/summary');
      setAnalytics(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchProviders = useCallback(async () => {
    try { const r = await api.get('/insurance/providers'); setProviders(r.data.data.providers || []); }
    catch { /* ignore */ }
  }, []);

  const fetchPolicies = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/insurance/policies'); setPolicies(r.data.data.policies || []); }
    catch { showToast('error', 'Failed to load policies'); }
    finally { setLoading(false); }
  }, []);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (claimStatusFilter) params.status = claimStatusFilter;
      const r = await api.get('/insurance/claims', { params });
      setClaims(r.data.data.claims || []);
    } catch { showToast('error', 'Failed to load claims'); }
    finally { setLoading(false); }
  }, [claimStatusFilter]);

  const fetchPA = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/insurance/pre-auth'); setPaRequests(r.data.data.requests || []); }
    catch { showToast('error', 'Failed to load pre-auth requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (activeTab === 'policies') fetchPolicies();
    if (activeTab === 'claims')   fetchClaims();
    if (activeTab === 'preauth')  fetchPA();
    if (activeTab === 'dashboard') fetchAnalytics();
  }, [activeTab, claimStatusFilter]);

  // Submit handlers
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/insurance/claims', {
        ...claimForm,
        patient_id: parseInt(claimForm.patient_id),
        claim_amount: parseFloat(claimForm.claim_amount),
      });
      showToast('success', 'Claim submitted successfully');
      setShowClaimModal(false);
      setClaimForm({ patient_id:'', provider_name:'Ethiopian Insurance Corporation', policy_number:'', claim_amount:'', diagnosis_code:'Z00.0', claim_type:'outpatient', notes:'' });
      fetchClaims();
    } catch (err: any) { showToast('error', err.response?.data?.message || 'Failed to submit claim'); }
  };

  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/insurance/policies', {
        ...policyForm,
        patient_id: parseInt(policyForm.patient_id),
        provider_id: parseInt(policyForm.provider_id),
        annual_limit: policyForm.annual_limit ? parseFloat(policyForm.annual_limit) : null,
        copay_fixed: parseFloat(policyForm.copay_fixed || '0'),
        copay_percentage: parseFloat(policyForm.copay_percentage || '0'),
        deductible_amount: parseFloat(policyForm.deductible_amount || '0'),
      });
      showToast('success', 'Policy enrolled successfully');
      setShowPolicyModal(false);
      fetchPolicies();
    } catch (err: any) { showToast('error', err.response?.data?.message || 'Failed to enroll policy'); }
  };

  const handlePASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/insurance/pre-auth', {
        ...paForm,
        policy_id: parseInt(paForm.policy_id),
        patient_id: parseInt(paForm.patient_id),
        requested_amount: parseFloat(paForm.requested_amount),
      });
      showToast('success', 'Pre-authorization request submitted');
      setShowPAModal(false);
      fetchPA();
    } catch (err: any) { showToast('error', err.response?.data?.message || 'Failed to submit PA request'); }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      await api.put(`/insurance/claims/${selectedClaim.id}`, {
        status: reviewForm.status,
        notes: reviewForm.notes,
        approved_amount: reviewForm.approved_amount ? parseFloat(reviewForm.approved_amount) : undefined,
        provider_claim_ref: reviewForm.provider_claim_ref || undefined,
        rejection_reason: reviewForm.rejection_reason || undefined,
      });
      showToast('success', `Claim ${reviewForm.status}`);
      setShowReviewModal(false);
      setSelectedClaim(null);
      fetchClaims();
      fetchAnalytics();
    } catch (err: any) { showToast('error', err.response?.data?.message || 'Failed to update claim'); }
  };

  const handlePAReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPA) return;
    try {
      await api.put(`/insurance/pre-auth/${selectedPA.id}`, paReviewForm);
      showToast('success', `Pre-auth ${paReviewForm.status}`);
      setShowPAReviewModal(false);
      setSelectedPA(null);
      fetchPA();
    } catch (err: any) { showToast('error', err.response?.data?.message || 'Failed to update PA request'); }
  };

  // Computed
  const filteredClaims = claims.filter(c =>
    c.patient_name?.toLowerCase().includes(claimSearch.toLowerCase()) ||
    c.claim_number?.toLowerCase().includes(claimSearch.toLowerCase()) ||
    c.provider_name?.toLowerCase().includes(claimSearch.toLowerCase()) ||
    c.policy_number?.includes(claimSearch)
  );

  const filteredPolicies = policies.filter(p =>
    p.patient_name?.toLowerCase().includes(policySearch.toLowerCase()) ||
    p.policy_number?.toLowerCase().includes(policySearch.toLowerCase()) ||
    p.provider_name?.toLowerCase().includes(policySearch.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
            <Shield className="h-3 w-3" />
            Insurance & Claims
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Insurance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Policy enrollment, pre-authorization, claims lifecycle & benefit tracking
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPolicyModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-100 text-sm text-slate-700 rounded-xl transition">
            <Plus className="h-4 w-4" /> Enroll Policy
          </button>
          <button onClick={() => setShowClaimModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus className="h-4 w-4" /> File Claim
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition
              ${activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {tab.icon}{tab.label}
            {tab.id === 'preauth' && analytics?.paPending ? (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{analytics.paPending}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── TAB: Dashboard ─────────────────────────────────────────── */}
      {activeTab === 'dashboard' && analytics && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Claims', value: parseInt(analytics.totals.total_claims).toLocaleString(), icon: <FileText className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              { label: 'Total Billed', value: `${fmt(analytics.totals.total_billed)} ETB`, icon: <DollarSign className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
              { label: 'Approved Coverage', value: `${fmt(analytics.totals.total_approved)} ETB`, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Paid to Hospital', value: `${fmt(analytics.totals.total_paid)} ETB`, icon: <Banknote className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} border rounded-2xl p-5`}>
                <div className={`${k.color} mb-2`}>{k.icon}</div>
                <div className={`font-bold text-lg ${k.color}`}>{k.value}</div>
                <div className="text-xs text-slate-500 mt-1">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Status breakdown + Provider table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-blue-500" />
                Claims by Status
              </h3>
              <div className="space-y-2">
                {analytics.byStatus.map(s => {
                  const total = analytics.byStatus.reduce((a, b) => a + parseInt(b.count), 0);
                  const pct = total > 0 ? Math.round(parseInt(s.count) / total * 100) : 0;
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[s.status] || 'bg-slate-100 text-slate-500'}`}>
                            {s.status.replace('_',' ')}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">{s.count} claims</span>
                        </div>
                        <span className="text-slate-500 font-mono text-xs">{fmt(s.amount)} ETB</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top providers */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Provider Performance
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>{['Provider','Claims','Billed','Approved'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {analytics.byProvider.map(p => (
                      <tr key={p.code} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white text-xs">{p.provider_name}</div>
                          <div className="text-xs text-slate-400">{p.code}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.claims}</td>
                        <td className="px-4 py-3 font-mono text-xs">{fmt(p.billed)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-emerald-600">{fmt(p.approved)}</td>
                      </tr>
                    ))}
                    {analytics.byProvider.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No provider data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PA Pending alert */}
          {analytics.paPending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold text-amber-800">{analytics.paPending} Pre-Authorization Request{analytics.paPending !== 1 ? 's' : ''} Pending</div>
                <div className="text-sm text-amber-700 mt-0.5">Review and approve or reject on the Pre-Auth tab</div>
              </div>
              <button onClick={() => setActiveTab('preauth')} className="text-xs font-semibold text-amber-700 underline">
                Go to Pre-Auth →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Policies ──────────────────────────────────────────── */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={policySearch} onChange={e => setPolicySearch(e.target.value)}
                placeholder="Search by patient, provider, or policy #..."
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-800 w-72" />
            </div>
            <button onClick={fetchPolicies} disabled={loading}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>{['Patient','Provider / Policy','Plan','Benefits','Co-pay','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredPolicies.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    {loading ? 'Loading…' : 'No policies enrolled. Click "Enroll Policy" to add one.'}
                  </td></tr>
                ) : filteredPolicies.map(pol => {
                  const remainingPct = pol.annual_limit && pol.remaining_benefit
                    ? Math.max(0, Math.min(100, pol.remaining_benefit / pol.annual_limit * 100))
                    : null;
                  return (
                    <tr key={pol.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{pol.patient_name}</div>
                        <div className="text-xs text-slate-400">#{pol.patient_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{pol.provider_name}</div>
                        <div className="text-xs font-mono text-slate-400">{pol.policy_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 dark:text-slate-300">{pol.plan_name || '—'}</div>
                        <div className="text-xs text-slate-400 capitalize">{pol.plan_type?.replace(/_/g,' ')}</div>
                      </td>
                      <td className="px-4 py-3">
                        {pol.annual_limit ? (
                          <div>
                            <div className="text-xs text-slate-500 mb-1">
                              {fmt(pol.remaining_benefit)} / {fmt(pol.annual_limit)} ETB
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                              <div className={`h-full rounded-full ${remainingPct! > 30 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${remainingPct}%` }} />
                            </div>
                          </div>
                        ) : <span className="text-xs text-slate-400">Unlimited</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        {pol.copay_fixed > 0 && <div>Fixed: {fmt(pol.copay_fixed)} ETB</div>}
                        {pol.copay_percentage > 0 && <div>{pol.copay_percentage}%</div>}
                        {!pol.copay_fixed && !pol.copay_percentage && <span className="text-slate-400">None</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[pol.verification_status] || 'bg-slate-100 text-slate-500'}`}>
                          {pol.verification_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin && pol.verification_status !== 'verified' && (
                          <button onClick={async () => {
                            try {
                              await api.post(`/insurance/policies/${pol.id}/verify`, { verification_status: 'verified' });
                              showToast('success', 'Policy verified');
                              fetchPolicies();
                            } catch { showToast('error', 'Verification failed'); }
                          }} className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold">
                            Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Claims ────────────────────────────────────────────── */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={claimSearch} onChange={e => setClaimSearch(e.target.value)}
                placeholder="Search by patient, claim #, or provider..."
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-800 w-full" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select value={claimStatusFilter} onChange={e => setClaimStatusFilter(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-slate-800 appearance-none">
                <option value="">All Statuses</option>
                {['pending','submitted','processing','approved','partially_approved','rejected','paid','written_off'].map(s => (
                  <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <button onClick={fetchClaims} disabled={loading}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>{['Claim #','Patient','Provider / Policy','Billed','Approved','Co-pay','Status','Date',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredClaims.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    {loading ? 'Loading…' : 'No claims found. File a claim using the button above.'}
                  </td></tr>
                ) : filteredClaims.map(c => (
                  <React.Fragment key={c.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">{c.claim_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{c.patient_name}</div>
                        {c.diagnosis_code && <div className="text-xs text-slate-400">{c.diagnosis_code}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 dark:text-slate-300">{c.provider_name || '—'}</div>
                        {c.policy_number && <div className="text-xs font-mono text-slate-400">{c.policy_number}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{fmt(c.claim_amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-emerald-600">{c.approved_amount ? fmt(c.approved_amount) : '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-amber-600">{c.patient_copay ? fmt(c.patient_copay) : '0.00'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-500'}`}>
                          {c.status.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(c.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setExpandedClaim(expandedClaim === c.id ? null : c.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                            {expandedClaim === c.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
                          </button>
                          {isAdmin && ['pending','submitted','processing'].includes(c.status) && (
                            <button onClick={() => { setSelectedClaim(c); setReviewForm({ status:'approved', approved_amount: c.claim_amount, provider_claim_ref:'', notes:'', rejection_reason:'' }); setShowReviewModal(true); }}
                              className="p-1 hover:bg-blue-100 rounded">
                              <Edit2 className="h-4 w-4 text-blue-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedClaim === c.id && (
                      <tr>
                        <td colSpan={9} className="bg-slate-50 dark:bg-slate-900/40 px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            {[
                              { l:'Claim Type', v: c.claim_type },
                              { l:'Payment Received', v: c.payment_amount ? `${fmt(c.payment_amount)} ETB` : '—' },
                              { l:'Provider Ref', v: c.provider_claim_ref || '—' },
                              { l:'Deductible Applied', v: c.deductible_applied ? `${fmt(c.deductible_applied)} ETB` : '—' },
                              { l:'Submitted By', v: c.submitted_by_email || '—' },
                              { l:'Reviewed By', v: c.reviewed_by_email || '—' },
                              { l:'Reviewed At', v: fmtDate(c.reviewed_at) },
                              { l:'Paid At', v: fmtDate(c.payment_received_at) },
                            ].map(r => (
                              <div key={r.l}>
                                <div className="text-slate-400 uppercase tracking-wide text-xs mb-0.5">{r.l}</div>
                                <div className="font-medium text-slate-800 dark:text-white">{r.v}</div>
                              </div>
                            ))}
                            {c.notes && <div className="col-span-2 md:col-span-4"><div className="text-slate-400 uppercase tracking-wide text-xs mb-0.5">Notes</div><div className="text-slate-700 dark:text-slate-300">{c.notes}</div></div>}
                            {c.rejection_reason && <div className="col-span-2 md:col-span-4"><div className="text-red-400 uppercase tracking-wide text-xs mb-0.5">Rejection Reason</div><div className="text-red-700 dark:text-red-400">{c.rejection_reason}</div></div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Pre-Auth ──────────────────────────────────────────── */}
      {activeTab === 'preauth' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Pre-authorization requests from clinical staff for insured services</p>
            <button onClick={() => setShowPAModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
              <Plus className="h-4 w-4" /> New PA Request
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <tr>{['PA #','Patient','Provider','Service','Requested','Approved','Status','Valid Until',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paRequests.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    {loading ? 'Loading…' : 'No pre-authorization requests yet'}
                  </td></tr>
                ) : paRequests.map(pa => (
                  <tr key={pa.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{pa.pa_number}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{pa.patient_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{pa.provider_name}</td>
                    <td className="px-4 py-3">
                      <div className="capitalize text-slate-700 dark:text-slate-300 text-xs">{pa.service_type?.replace(/_/g,' ')}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{pa.service_description}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{fmt(pa.requested_amount)} ETB</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-600">{pa.approved_amount ? `${fmt(pa.approved_amount)} ETB` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[pa.status] || 'bg-slate-100 text-slate-500'}`}>
                        {pa.status.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(pa.valid_until)}</td>
                    <td className="px-4 py-3">
                      {isAdmin && ['pending','submitted'].includes(pa.status) && (
                        <button onClick={() => { setSelectedPA(pa); setPAReviewForm({ status:'approved', approved_amount: String(pa.requested_amount), provider_reference:'', review_notes:'', valid_from:'', valid_until:'' }); setShowPAReviewModal(true); }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Providers ─────────────────────────────────────────── */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(p => (
              <div key={p.id} className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-5 ${p.is_active ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{p.name_en}</div>
                    {p.name_am && <div className="text-xs text-slate-400 mt-0.5">{p.name_am}</div>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Code:</span><span className="font-mono font-semibold text-slate-800 dark:text-white">{p.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span><span className="capitalize">{p.provider_type.replace(/_/g,' ')}</span>
                  </div>
                  {p.phone && <div className="flex justify-between"><span>Phone:</span><span>{p.phone}</span></div>}
                  {p.email && <div className="flex justify-between"><span>Email:</span><span className="truncate max-w-32">{p.email}</span></div>}
                  <div className="flex justify-between">
                    <span>Reimbursement:</span><span>{p.reimbursement_days} days</span>
                  </div>
                  {p.contract_end_date && (
                    <div className="flex justify-between">
                      <span>Contract Ends:</span>
                      <span className={new Date(p.contract_end_date) < new Date() ? 'text-red-500 font-semibold' : ''}>
                        {fmtDate(p.contract_end_date)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Modals */}
      {/* ════════════════════════════════════════════════════════════ */}

      {/* File Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500" /> File Insurance Claim</span>
              <button onClick={() => setShowClaimModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Patient ID *</label><input type="number" required value={claimForm.patient_id} onChange={e=>setClaimForm(f=>({...f,patient_id:e.target.value}))} className={inp} placeholder="e.g. 12" /></div>
                <div><label className={lbl}>Claim Amount (ETB) *</label><input type="number" step="0.01" required value={claimForm.claim_amount} onChange={e=>setClaimForm(f=>({...f,claim_amount:e.target.value}))} className={inp} placeholder="e.g. 1500.00" /></div>
              </div>
              <div><label className={lbl}>Insurance Provider *</label>
                <select value={claimForm.provider_name} onChange={e=>setClaimForm(f=>({...f,provider_name:e.target.value}))} className={inp}>
                  {PROVIDERS_LIST.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Policy / Coverage Number *</label><input required value={claimForm.policy_number} onChange={e=>setClaimForm(f=>({...f,policy_number:e.target.value}))} className={inp} placeholder="e.g. POL-993821" /></div>
                <div><label className={lbl}>Claim Type</label>
                  <select value={claimForm.claim_type} onChange={e=>setClaimForm(f=>({...f,claim_type:e.target.value}))} className={inp}>
                    {['outpatient','inpatient','emergency','pharmacy','lab','radiology'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Diagnosis Code (ICD-10)</label><input value={claimForm.diagnosis_code} onChange={e=>setClaimForm(f=>({...f,diagnosis_code:e.target.value}))} className={inp} placeholder="e.g. I10 – Essential Hypertension" /></div>
              <div><label className={lbl}>Notes</label><textarea rows={2} value={claimForm.notes} onChange={e=>setClaimForm(f=>({...f,notes:e.target.value}))} className={inp} placeholder="Brief claim description…" /></div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Submit Claim</button>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-500" /> Enroll Insurance Policy</span>
              <button onClick={() => setShowPolicyModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handlePolicySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Patient ID *</label><input type="number" required value={policyForm.patient_id} onChange={e=>setPolicyForm(f=>({...f,patient_id:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Provider *</label>
                  <select required value={policyForm.provider_id} onChange={e=>setPolicyForm(f=>({...f,provider_id:e.target.value}))} className={inp}>
                    <option value="">Select provider…</option>
                    {providers.filter(p=>p.is_active).map(p=><option key={p.id} value={p.id}>{p.name_en}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Policy Number *</label><input required value={policyForm.policy_number} onChange={e=>setPolicyForm(f=>({...f,policy_number:e.target.value}))} className={inp} placeholder="e.g. POL-993821" /></div>
                <div><label className={lbl}>Plan Name</label><input value={policyForm.plan_name} onChange={e=>setPolicyForm(f=>({...f,plan_name:e.target.value}))} className={inp} placeholder="e.g. Gold Plan" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Effective Date *</label><input type="date" required value={policyForm.effective_date} onChange={e=>setPolicyForm(f=>({...f,effective_date:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Expiry Date</label><input type="date" value={policyForm.expiry_date} onChange={e=>setPolicyForm(f=>({...f,expiry_date:e.target.value}))} className={inp} /></div>
              </div>
              <div><label className={lbl}>Annual Benefit Limit (ETB)</label><input type="number" step="0.01" value={policyForm.annual_limit} onChange={e=>setPolicyForm(f=>({...f,annual_limit:e.target.value}))} className={inp} placeholder="Leave blank for unlimited" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Fixed Co-pay (ETB)</label><input type="number" step="0.01" min="0" value={policyForm.copay_fixed} onChange={e=>setPolicyForm(f=>({...f,copay_fixed:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Co-pay %</label><input type="number" step="0.01" min="0" max="100" value={policyForm.copay_percentage} onChange={e=>setPolicyForm(f=>({...f,copay_percentage:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Deductible (ETB)</label><input type="number" step="0.01" min="0" value={policyForm.deductible_amount} onChange={e=>setPolicyForm(f=>({...f,deductible_amount:e.target.value}))} className={inp} /></div>
              </div>
              <div><label className={lbl}>Plan Type</label>
                <select value={policyForm.plan_type} onChange={e=>setPolicyForm(f=>({...f,plan_type:e.target.value}))} className={inp}>
                  {[['inpatient_outpatient','Inpatient & Outpatient'],['inpatient_only','Inpatient Only'],['outpatient_only','Outpatient Only'],['comprehensive','Comprehensive']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Notes</label><textarea rows={2} value={policyForm.notes} onChange={e=>setPolicyForm(f=>({...f,notes:e.target.value}))} className={inp} /></div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Enroll Policy</button>
            </form>
          </div>
        </div>
      )}

      {/* Review Claim Modal */}
      {showReviewModal && selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white">Review Claim {selectedClaim.claim_number}</span>
              <button onClick={()=>setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-xs space-y-1.5">
                {[['Patient',selectedClaim.patient_name],['Provider',selectedClaim.provider_name||'—'],['Policy',selectedClaim.policy_number||'—'],['Billed',`ETB ${fmt(selectedClaim.claim_amount)}`]].map(([l,v])=>(
                  <div key={l} className="flex justify-between"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800 dark:text-white">{v}</span></div>
                ))}
              </div>
              <div><label className={lbl}>Decision *</label>
                <select value={reviewForm.status} onChange={e=>setReviewForm(f=>({...f,status:e.target.value}))} className={inp}>
                  {[['approved','Approve'],['partially_approved','Partially Approve'],['rejected','Reject'],['processing','Mark as Processing'],['paid','Mark as Paid']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {['approved','partially_approved','paid'].includes(reviewForm.status) && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Approved Amount (ETB)</label><input type="number" step="0.01" value={reviewForm.approved_amount} onChange={e=>setReviewForm(f=>({...f,approved_amount:e.target.value}))} className={inp} /></div>
                  <div><label className={lbl}>Provider Reference</label><input value={reviewForm.provider_claim_ref} onChange={e=>setReviewForm(f=>({...f,provider_claim_ref:e.target.value}))} className={inp} placeholder="Insurer's claim #" /></div>
                </div>
              )}
              {reviewForm.status === 'rejected' && (
                <div><label className={lbl}>Rejection Reason *</label><textarea required rows={2} value={reviewForm.rejection_reason} onChange={e=>setReviewForm(f=>({...f,rejection_reason:e.target.value}))} className={inp} /></div>
              )}
              <div><label className={lbl}>Notes</label><textarea rows={2} value={reviewForm.notes} onChange={e=>setReviewForm(f=>({...f,notes:e.target.value}))} className={inp} placeholder="Internal notes…" /></div>
              <button type="submit" className={`w-full py-2.5 font-bold rounded-xl text-sm text-white ${reviewForm.status==='rejected'?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
                Submit Decision
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PA Request Modal */}
      {showPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" /> New Pre-Authorization Request</span>
              <button onClick={()=>setShowPAModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handlePASubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Patient ID *</label><input type="number" required value={paForm.patient_id} onChange={e=>setPAForm(f=>({...f,patient_id:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Policy ID *</label><input type="number" required value={paForm.policy_id} onChange={e=>setPAForm(f=>({...f,policy_id:e.target.value}))} className={inp} placeholder="From Policies tab" /></div>
              </div>
              <div><label className={lbl}>Service Type *</label>
                <select required value={paForm.service_type} onChange={e=>setPAForm(f=>({...f,service_type:e.target.value}))} className={inp}>
                  {['inpatient_admission','elective_surgery','diagnostic','specialist_referral','physiotherapy','pharmacy','other'].map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div><label className={lbl}>Service Description *</label><textarea required rows={2} value={paForm.service_description} onChange={e=>setPAForm(f=>({...f,service_description:e.target.value}))} className={inp} placeholder="Describe the service requiring pre-authorization…" /></div>
              <div><label className={lbl}>Requested Amount (ETB) *</label><input type="number" step="0.01" required value={paForm.requested_amount} onChange={e=>setPAForm(f=>({...f,requested_amount:e.target.value}))} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Valid From</label><input type="date" value={paForm.valid_from} onChange={e=>setPAForm(f=>({...f,valid_from:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Valid Until</label><input type="date" value={paForm.valid_until} onChange={e=>setPAForm(f=>({...f,valid_until:e.target.value}))} className={inp} /></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Submit PA Request</button>
            </form>
          </div>
        </div>
      )}

      {/* PA Review Modal */}
      {showPAReviewModal && selectedPA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white">Review PA — {selectedPA.pa_number}</span>
              <button onClick={()=>setShowPAReviewModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handlePAReviewSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-4 text-xs space-y-1.5">
                {[['Patient',selectedPA.patient_name],['Provider',selectedPA.provider_name],['Service',selectedPA.service_type?.replace(/_/g,' ')],['Requested',`ETB ${fmt(selectedPA.requested_amount)}`]].map(([l,v])=>(
                  <div key={l} className="flex justify-between"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800 dark:text-white">{v}</span></div>
                ))}
                <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">{selectedPA.service_description}</div>
              </div>
              <div><label className={lbl}>Decision *</label>
                <select value={paReviewForm.status} onChange={e=>setPAReviewForm(f=>({...f,status:e.target.value}))} className={inp}>
                  {[['approved','Approve'],['partially_approved','Partially Approve'],['rejected','Reject'],['submitted','Mark as Submitted to Insurer']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {['approved','partially_approved'].includes(paReviewForm.status) && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Approved Amount (ETB)</label><input type="number" step="0.01" value={paReviewForm.approved_amount} onChange={e=>setPAReviewForm(f=>({...f,approved_amount:e.target.value}))} className={inp} /></div>
                  <div><label className={lbl}>Provider Reference</label><input value={paReviewForm.provider_reference} onChange={e=>setPAReviewForm(f=>({...f,provider_reference:e.target.value}))} className={inp} /></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Valid From</label><input type="date" value={paReviewForm.valid_from} onChange={e=>setPAReviewForm(f=>({...f,valid_from:e.target.value}))} className={inp} /></div>
                <div><label className={lbl}>Valid Until</label><input type="date" value={paReviewForm.valid_until} onChange={e=>setPAReviewForm(f=>({...f,valid_until:e.target.value}))} className={inp} /></div>
              </div>
              <div><label className={lbl}>Review Notes</label><textarea rows={2} value={paReviewForm.review_notes} onChange={e=>setPAReviewForm(f=>({...f,review_notes:e.target.value}))} className={inp} /></div>
              <button type="submit" className={`w-full py-2.5 font-bold rounded-xl text-sm text-white ${paReviewForm.status==='rejected'?'bg-red-600 hover:bg-red-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
                Confirm Decision
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsurancePage;
