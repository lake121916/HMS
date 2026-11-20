/**
 * Lab Technician Dashboard
 * - View pending lab orders
 * - Mark tests in-progress
 * - Enter and submit results
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { FlaskConical, RefreshCw, CheckCircle2, Search, AlertCircle, Printer, QrCode } from 'lucide-react';
import WristbandScannerModal from '../components/WristbandScannerModal';
import PatientIdentityBanner from '../components/PatientIdentityBanner';
import { DashboardHeader, StatisticCard, WorkflowTabs } from '../components/common/PremiumUI';

interface LabTest {
  id: number;
  patient_name: string;
  doctor_name: string;
  test_name: string;
  test_type: string;
  priority: string;
  status: string;
  requested_date: string;
  results?: string;
  is_abnormal?: boolean;
  encounter_id?: number;
  payment_status?: string;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-slate-100 text-slate-600',
};

const LabTechDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selected, setSelected] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'in_progress' | 'completed' | 'all'>('pending');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [verifiedPatient, setVerifiedPatient] = useState<any | null>(null);

  const urlPatientId = searchParams.get('patient_id');

  useEffect(() => {
    if (urlPatientId) {
      loadPatientForLab(parseInt(urlPatientId, 10));
    }
  }, [urlPatientId]);

  const loadPatientForLab = async (pid: number) => {
    try {
      const res = await api.get(`/patients/${pid}`);
      if (res.data?.success && res.data.data) {
        const p = res.data.data;
        setVerifiedPatient(p);
        const fullName = `${p.first_name} ${p.last_name}`;
        setSearch(fullName);
        setFilter('all');
        showToast('success', `Identified patient: ${fullName}. Displaying lab orders.`);
      }
    } catch {
      // ignore
    }
  };

  const handlePatientScanVerified = (result: any) => {
    setShowScannerModal(false);
    const patient = result?.patient || result;
    if (!patient) return;
    setVerifiedPatient(patient);
    const fullName = `${patient.first_name} ${patient.last_name}`;
    setSearch(fullName);
    setFilter('all');
    showToast('success', `Identified patient: ${fullName} (${patient.mrn || 'ID #' + patient.id}). Filtering lab orders.`);
  };
  const [resultForm, setResultForm] = useState({
    results: '', reference_range: '', is_abnormal: false, notes: ''
  });

  useEffect(() => { fetchTests(); }, [filter]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/lab-tests${params}`);
      setTests(res.data.data.labTests || []);
    } catch { showToast('error', 'Failed to load lab tests'); }
    finally { setLoading(false); }
  };

  const markInProgress = async (id: number) => {
    try {
      await api.put(`/lab-tests/${id}`, { status: 'in_progress' });
      showToast('success', 'Test marked as in progress');
      fetchTests();
    } catch { showToast('error', 'Update failed'); }
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post(`/lab-tests/${selected.id}/result`, resultForm);
      showToast('success', `Results recorded for ${selected.test_name}! Dispatched to doctor chart and cashier billing.`);
      setSelected(null);
      setResultForm({ results: '', reference_range: '', is_abnormal: false, notes: '' });
      fetchTests();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to submit result');
    } finally { setSubmitting(false); }
  };

  const filtered = tests.filter(t => {
    const q = search.toLowerCase();
    return t.patient_name?.toLowerCase().includes(q) || t.test_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Premium Lab Dashboard Header ─────────────────────────── */}
      <DashboardHeader
        title="Clinical Laboratory & Diagnostic Hub"
        amharicTitle="የላብራቶሪ የሥራ ማዕከል"
        subtitle="Specimen intake, diagnostic test processing, abnormal value alerts, and results delivery"
        badge="Clinical Pathology"
        icon={FlaskConical}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="h-9 px-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Scan Specimen / Wristband</span>
            </button>
            <button
              onClick={fetchTests}
              disabled={loading}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        }
      />

      {/* ── Lab Telemetry Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatisticCard
          title="Pending Analysis"
          amharicTitle="የሚጠበቁ"
          value={tests.filter(t => t.status === 'pending').length}
          icon={FlaskConical}
          variant="amber"
          subtitle="Orders awaiting processing"
        />
        <StatisticCard
          title="In Progress"
          amharicTitle="በመሰራት ላይ"
          value={tests.filter(t => t.status === 'in_progress').length}
          icon={RefreshCw}
          variant="blue"
          subtitle="Active bench tests"
        />
        <StatisticCard
          title="Completed & Verified"
          amharicTitle="የተጠናቀቁ"
          value={tests.filter(t => t.status === 'completed').length}
          icon={CheckCircle2}
          variant="teal"
          subtitle="Dispatched to physician chart"
        />
      </div>

      {/* Two-Identifier Patient Identity Banner */}
      {verifiedPatient && (
        <PatientIdentityBanner
          patient={{
            id: verifiedPatient.id,
            mrn: verifiedPatient.mrn || `AKEH-PAT-${verifiedPatient.id}`,
            first_name: verifiedPatient.first_name,
            last_name: verifiedPatient.last_name,
            gender: verifiedPatient.gender,
            date_of_birth: verifiedPatient.date_of_birth,
            blood_type: verifiedPatient.blood_type,
            allergies: verifiedPatient.allergies,
            encounter: verifiedPatient.encounter
          }}
          onClearContext={() => {
            setVerifiedPatient(null);
            setSearch('');
          }}
        />
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <WorkflowTabs
          tabs={[
            { id: 'pending', label: 'Pending Tests', count: tests.filter(t => t.status === 'pending').length },
            { id: 'in_progress', label: 'In Progress', count: tests.filter(t => t.status === 'in_progress').length },
            { id: 'completed', label: 'Completed', count: tests.filter(t => t.status === 'completed').length },
            { id: 'all', label: 'All Orders', count: tests.length }
          ]}
          activeTab={filter}
          onChange={f => setFilter(f as any)}
          className="flex-1"
        />

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search test name or patient..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        {/* Test List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <FlaskConical className="h-10 w-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No lab tests</p>
            </div>
          ) : filtered.map(test => (
            <div key={test.id}
              onClick={() => { if (test.status !== 'completed') { setSelected(test); setResultForm({ results: test.results || '', reference_range: '', is_abnormal: test.is_abnormal || false, notes: '' }); } }}
              className={`p-4 flex items-center gap-4 ${test.status !== 'completed' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}
                ${selected?.id === test.id ? 'bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-l-cyan-500' : ''}`}
            >
              <div className={`p-2.5 rounded-xl ${test.status === 'completed' ? 'bg-emerald-100' : test.status === 'in_progress' ? 'bg-blue-100' : 'bg-amber-100'}`}>
                <FlaskConical className={`h-5 w-5 ${test.status === 'completed' ? 'text-emerald-600' : test.status === 'in_progress' ? 'text-blue-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">{test.test_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[test.priority || 'normal']}`}>
                    {test.priority}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Patient: <span className="font-medium text-slate-700 dark:text-slate-300">{test.patient_name}</span>
                  {test.doctor_name && ` · Dr. ${test.doctor_name}`}
                </div>
                {test.test_type && <div className="text-xs text-slate-400">{test.test_type}</div>}
                {test.results && (
                  <div className={`text-xs mt-1 ${test.is_abnormal ? 'text-red-600' : 'text-emerald-600'}`}>
                    {test.is_abnormal ? '⚠️ Abnormal' : '✓ Normal'} — {test.results.slice(0, 60)}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                  ${test.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    test.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                  {test.status.replace('_', ' ')}
                </span>
                {test.status === 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/api/documents/lab-result/${test.id}/pdf`, '_blank');
                    }}
                    className="mt-1 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-lg hover:bg-cyan-100 transition border border-cyan-200"
                    title="Print Official Lab Certificate PDF"
                  >
                    <Printer className="w-3.5 h-3.5" /> Certificate PDF
                  </button>
                )}
                {test.payment_status === 'UNPAID' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                    Payment Required
                  </span>
                )}
                {test.status === 'pending' && test.payment_status !== 'UNPAID' && (
                  <button onClick={e => { e.stopPropagation(); markInProgress(test.id); }}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                    Start
                  </button>
                )}
                {test.status === 'pending' && test.payment_status === 'UNPAID' && (
                  <button disabled
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    title="Payment required to start test"
                  >
                    Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Result Entry Form */}
        {selected ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Enter Test Result</h3>
            <div className="text-sm text-slate-500 mb-4">
              {selected.test_name} — {selected.patient_name}
            </div>
            <form onSubmit={submitResult} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Results *</label>
                <textarea
                  required
                  rows={5}
                  value={resultForm.results}
                  onChange={e => setResultForm(f => ({ ...f, results: e.target.value }))}
                  placeholder="Enter test results in detail..."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Reference Range</label>
                <input value={resultForm.reference_range}
                  onChange={e => setResultForm(f => ({ ...f, reference_range: e.target.value }))}
                  placeholder="e.g. 4.5–11.0 × 10⁹/L"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer"
                onClick={() => setResultForm(f => ({ ...f, is_abnormal: !f.is_abnormal }))}>
                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition
                  ${resultForm.is_abnormal ? 'border-red-500 bg-red-500' : 'border-slate-300'}`}>
                  {resultForm.is_abnormal && <span className="text-white text-xs">✓</span>}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as Abnormal</div>
                  <div className="text-xs text-slate-400">Check if results are outside normal range</div>
                </div>
                {resultForm.is_abnormal && <AlertCircle className="h-4 w-4 text-red-500 ml-auto" />}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Technician Notes</label>
                <input value={resultForm.notes}
                  onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional comments..."
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
                  <CheckCircle2 className="h-4 w-4" />
                  {submitting ? 'Submitting...' : 'Submit Result'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[300px]">
            <div className="text-center text-slate-400">
              <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click a pending test to enter results</p>
            </div>
          </div>
        )}
      </div>
      {/* ── Lab Patient QR Scanner Modal ── */}
      {showScannerModal && (
        <WristbandScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          department="Laboratory"
          requireTwoIdentifierVerification={true}
          onPatientVerified={handlePatientScanVerified}
          continueLabel="Filter Patient Lab Orders"
        />
      )}
    </div>
  );
};

export default LabTechDashboard;
