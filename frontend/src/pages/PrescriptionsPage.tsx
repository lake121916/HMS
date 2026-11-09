import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  usePrescriptions,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
  Prescription
} from '../hooks/useApi';
import {
  Pill, Search, Edit, Trash2, X, CheckCircle, AlertOctagon, AlertTriangle,
  Eye, Clock, Printer, History, AlertCircle, FileText,
  RefreshCw, User, Stethoscope, Plus, CheckCircle2, XCircle,
  Layers, Package, Check
} from 'lucide-react';

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white transition';
const lbl = 'block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5';

interface DispensationRecord {
  dispensation_id?: number;
  id?: number;
  prescription_id: number;
  patient_id: number;
  patient_name: string;
  patient_mrn?: string;
  doctor_name?: string;
  pharmacist_id?: number;
  pharmacist_name?: string;
  pharmacist_email?: string;
  medication_id?: number;
  medication_name?: string;
  batch_number: string;
  lot_number?: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  dispensed_at: string;
  notes?: string;
  invoice_id?: number;
  invoice_status?: string;
  invoice_total?: string | number;
}

interface BatchItem {
  id: number;
  batch_number: string;
  quantity_available: number;
  expiry_date: string;
  daysUntilExpiry?: number;
  shelfStatus?: 'VALID' | 'NEAR_EXPIRY' | 'CRITICAL_NEAR_EXPIRY' | 'EXPIRED';
  isExpired?: boolean;
  storage_location?: string;
}

interface PrescriptionDetailsResponse {
  prescription: Prescription & {
    prescribedQuantity: number;
    dispensedQuantity: number;
    remainingQuantity: number;
    stockAvailable: number;
    isStockSufficient: boolean;
    isExpired: boolean;
    doctor_license?: string;
    patient_allergies_text?: string;
    medication_category?: string;
    is_controlled?: boolean;
  };
  batches: BatchItem[];
  totalStockAvailable: number;
  allergies: Array<{
    allergen_name: string;
    allergen_category: string;
    reaction_description?: string;
    severity: string;
    verification_status: string;
  }>;
  dispensingHistory: DispensationRecord[];
}

const PrescriptionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const isPharmacist = user?.role === 'pharmacist';
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [detailsModal, setDetailsModal] = useState<PrescriptionDetailsResponse | null>(null);

  // Dispensing Modal State
  const [dispenseTarget, setDispenseTarget] = useState<Prescription | null>(null);
  const [dispenseBatches, setDispenseBatches] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('auto');
  const [quantityToDispense, setQuantityToDispense] = useState<number>(1);
  const [dispenseNotes, setDispenseNotes] = useState<string>('');
  const [dispenseSubmitting, setDispenseSubmitting] = useState(false);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  // Dispensing History Modal (Hospital-wide)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [globalHistory, setGlobalHistory] = useState<DispensationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Printable Bottle Label Modal
  const [labelModal, setLabelModal] = useState<Prescription | null>(null);

  // Doctor Form State (creation / edit)
  const [form, setForm] = useState({
    patient_id: '',
    diagnosis_id: '',
    medication_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '1',
    instructions: ''
  });

  // Allergy validation state (for doctors)
  const [allergyModal, setAllergyModal] = useState<{
    alerts: any[];
    drugInteractions?: any[];
    uncertaintyNote?: string | null;
    hardBlocked: boolean;
    requiresOverride?: boolean;
  } | null>(null);
  const [overrideAck, setOverrideAck] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // ── Queries & Mutations ──────────────────────────────────────────────────
  const { data, isLoading, refetch } = usePrescriptions();
  const prescriptions = useMemo(() => (data ?? []) as Prescription[], [data]);

  React.useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId) setSearch(patientId);
  }, [searchParams]);

  const createPrescription = useCreatePrescription();
  const updatePrescription = useUpdatePrescription(editing?.id ?? 0);
  const deletePrescription = useDeletePrescription();

  // Metrics summary
  const metrics = useMemo(() => {
    let pending = 0;
    let partial = 0;
    let dispensed = 0;
    let expired = 0;
    let lowStock = 0;

    prescriptions.forEach(p => {
      const st = (p.status || (p.is_dispensed ? 'Dispensed' : 'Pending')).toLowerCase();
      if (st === 'pending') pending++;
      else if (st.includes('partial')) partial++;
      else if (st === 'dispensed') dispensed++;
      else if (st === 'expired') expired++;

      const rem = Math.max(0, (p.quantity || 1) - (p.quantity_dispensed || 0));
      if (!p.is_dispensed && (p.stock_available ?? 0) < rem) {
        lowStock++;
      }
    });

    return { total: prescriptions.length, pending, partial, dispensed, expired, lowStock };
  }, [prescriptions]);

  // Filtered list
  const filtered = useMemo(() => {
    return prescriptions.filter(p => {
      // Search
      const s = search.toLowerCase();
      const matchSearch =
        !search ||
        p.patient_name?.toLowerCase().includes(s) ||
        p.patient_mrn?.toLowerCase().includes(s) ||
        String(p.patient_id).includes(s) ||
        p.doctor_name?.toLowerCase().includes(s) ||
        p.medication_name?.toLowerCase().includes(s);

      // Status
      let matchStatus = true;
      const st = (p.status || (p.is_dispensed ? 'Dispensed' : 'Pending')).toLowerCase();
      if (statusFilter !== 'all') {
        const sf = statusFilter.toLowerCase();
        if (sf === 'pending') matchStatus = st === 'pending';
        else if (sf === 'partially dispensed') matchStatus = st.includes('partial');
        else if (sf === 'dispensed') matchStatus = st === 'dispensed';
        else if (sf === 'expired') matchStatus = st === 'expired';
        else if (sf === 'cancelled') matchStatus = st === 'cancelled';
      }

      // Stock
      let matchStock = true;
      const rem = Math.max(0, (p.quantity || 1) - (p.quantity_dispensed || 0));
      const avail = p.stock_available ?? 0;
      if (stockFilter === 'in_stock') matchStock = avail >= rem;
      else if (stockFilter === 'low_stock') matchStock = avail > 0 && avail < rem;
      else if (stockFilter === 'out_of_stock') matchStock = avail === 0;

      return matchSearch && matchStatus && matchStock;
    });
  }, [prescriptions, search, statusFilter, stockFilter]);

  // Open Detailed Prescription View Modal
  const openViewDetails = async (prescriptionId: number) => {
    try {
      const res = await api.get(`/prescriptions/${prescriptionId}`);
      if (res.data?.success) {
        setDetailsModal(res.data.data);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to load prescription details');
    }
  };

  // Open Dispense Modal
  const openDispenseModal = async (p: Prescription) => {
    setDispenseTarget(p);
    setDispenseError(null);
    setDispenseNotes('');
    const rem = Math.max(1, (p.quantity || 1) - (p.quantity_dispensed || 0));
    setQuantityToDispense(rem);
    setSelectedBatchId('auto');

    // Fetch batches for this prescription
    try {
      const res = await api.get(`/prescriptions/${p.id}`);
      if (res.data?.success) {
        const batches = res.data.data.batches || [];
        setDispenseBatches(batches);
      }
    } catch (e) {
      setDispenseBatches([]);
    }
  };

  // Execute Dispense Action
  const handleConfirmDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispenseTarget) return;

    setDispenseSubmitting(true);
    setDispenseError(null);

    try {
      const payload: Record<string, any> = {
        quantity_to_dispense: quantityToDispense,
        notes: dispenseNotes.trim() || undefined
      };
      if (selectedBatchId !== 'auto') {
        payload.batch_id = parseInt(selectedBatchId, 10);
      }

      const res = await api.post(`/prescriptions/${dispenseTarget.id}/dispense`, payload);
      if (res.data?.success) {
        await refetch();
        setDispenseTarget(null);
        if (detailsModal && detailsModal.prescription.id === dispenseTarget.id) {
          openViewDetails(dispenseTarget.id);
        }
      }
    } catch (err: any) {
      setDispenseError(err.response?.data?.message || 'Failed to dispense medication');
    } finally {
      setDispenseSubmitting(false);
    }
  };

  // Cancel Prescription Action
  const handleCancelPrescription = async (prescriptionId: number) => {
    const reason = window.prompt('Enter reason for cancelling this prescription:');
    if (!reason || !reason.trim()) return;

    try {
      const res = await api.post(`/prescriptions/${prescriptionId}/cancel`, { reason: reason.trim() });
      if (res.data?.success) {
        await refetch();
        if (detailsModal?.prescription.id === prescriptionId) {
          setDetailsModal(null);
        }
        alert('Prescription marked as cancelled.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel prescription');
    }
  };

  // Fetch Hospital-wide Dispensing History
  const openDispensingHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await api.get('/prescriptions/dispensations/history');
      if (res.data?.success) {
        setGlobalHistory(res.data.data.dispensations || []);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Doctor: Open Add Prescription Modal
  const openAdd = () => {
    setEditing(null);
    setForm({
      patient_id: '',
      diagnosis_id: '',
      medication_name: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantity: '1',
      instructions: ''
    });
    setAllergyModal(null);
    setOverrideAck(false);
    setOverrideReason('');
    setShowAddModal(true);
  };

  // Doctor: Open Edit Prescription Modal
  const openEdit = (p: Prescription) => {
    setEditing(p);
    setForm({
      patient_id: String(p.patient_id),
      diagnosis_id: '',
      medication_name: p.medication_name,
      dosage: p.dosage,
      frequency: p.frequency,
      duration: p.duration,
      quantity: String(p.quantity || 1),
      instructions: p.instructions || ''
    });
    setAllergyModal(null);
    setOverrideAck(false);
    setOverrideReason('');
    setShowAddModal(true);
  };

  // Doctor: Handle Delete
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;
    try {
      await deletePrescription.mutateAsync(id);
      await refetch();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete prescription');
    }
  };

  // Doctor: Handle Submit
  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editing && form.patient_id && form.medication_name) {
        const valRes = await api.post('/prescriptions/validate', {
          patient_id: parseInt(form.patient_id, 10),
          medication_name: form.medication_name
        });
        const check = valRes.data.data;
        if (check.hasConflict) {
          setAllergyModal({
            alerts: check.alerts || [],
            drugInteractions: check.drugInteractions || [],
            uncertaintyNote: check.uncertaintyNote || null,
            hardBlocked: check.hardBlocked,
            requiresOverride: check.requiresOverride
          });
          return;
        }
      }
      await submitDoctorPrescription();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save prescription');
    }
  };

  const submitDoctorPrescription = async (override?: string) => {
    const payload = {
      ...form,
      patient_id: parseInt(form.patient_id, 10),
      diagnosis_id: form.diagnosis_id ? parseInt(form.diagnosis_id, 10) : undefined,
      quantity: parseInt(form.quantity, 10) || 1,
      override_reason: override || null,
      override_acknowledged: Boolean(override)
    };
    if (editing) {
      await updatePrescription.mutateAsync(payload as Record<string, unknown>);
    } else {
      await createPrescription.mutateAsync(payload as Record<string, unknown>);
    }
    await refetch();
    setShowAddModal(false);
    setAllergyModal(null);
    setOverrideAck(false);
    setOverrideReason('');
  };

  const handleConfirmOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert('Mandatory clinical override justification is required (minimum 5 characters).');
      return;
    }
    submitDoctorPrescription(overrideReason.trim());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Pill className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Prescription Management
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isPharmacist && 'Clinical Pharmacist Dispensing Queue, Batch Allocation & Inventory Verification'}
                {isDoctor && 'Doctor Prescriptions, Drug Safety Checks & Patient Order History'}
                {isDoctor === false && isPharmacist === false && 'Hospital Prescriptions & Clinical Dispensations'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            title="Refresh queue"
            className="p-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {(isPharmacist || isAdmin || isDoctor) && (
            <button
              onClick={openDispensingHistory}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition"
            >
              <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Dispensing History</span>
            </button>
          )}

          {can('prescriptions:create') && !isPharmacist && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-purple-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Prescription</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter === 'all'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-semibold">
            <span>TOTAL ORDERS</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1.5">{metrics.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Pending')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter.toLowerCase() === 'pending'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>PENDING DISPENSE</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{metrics.pending}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Partially Dispensed')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter.toLowerCase().includes('partial')
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-semibold">
            <span>PARTIALLY FILLED</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1.5">{metrics.partial}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Dispensed')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            statusFilter.toLowerCase() === 'dispensed'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <span>FULLY DISPENSED</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{metrics.dispensed}</div>
        </div>

        <div
          onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-4 rounded-2xl border cursor-pointer transition col-span-2 sm:col-span-1 ${
            stockFilter === 'low_stock'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <span>INSUFFICIENT STOCK</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">{metrics.lowStock}</div>
        </div>
      </div>

      {/* ── Filters & Search Controls ───────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name, MRN (AKEH-XXXX), doctor, or medication..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Partially Dispensed', label: 'Partial' },
            { id: 'Dispensed', label: 'Dispensed' },
            { id: 'Expired', label: 'Expired' },
            { id: 'Cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                statusFilter.toLowerCase() === tab.id.toLowerCase()
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Prescriptions Table ────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <tr>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-3">Prescribing Doctor</th>
                <th className="py-3.5 px-3">Medication & Regimen</th>
                <th className="py-3.5 px-3 text-center">Prescribed</th>
                <th className="py-3.5 px-3 text-center">Dispensed</th>
                <th className="py-3.5 px-3">Inventory Stock</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3">Order Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                      <span>Loading prescription records...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Pill className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-600 dark:text-gray-300">No prescriptions found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search keywords</p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const prescribedQty = p.quantity || 1;
                  const dispensedQty = p.quantity_dispensed || 0;
                  const remainingQty = Math.max(0, prescribedQty - dispensedQty);
                  const stockAvail = p.stock_available ?? 0;
                  const isStockSufficient = stockAvail >= remainingQty;
                  const st = (p.status || (p.is_dispensed ? 'Dispensed' : 'Pending')).toLowerCase();
                  const isFullyDispensed = st === 'dispensed' || p.is_dispensed;
                  const isCancelled = st === 'cancelled';
                  const isExpired = st === 'expired' || (p.expiry_date && new Date(p.expiry_date) < new Date());

                  return (
                    <tr key={p.id} className="hover:bg-purple-50/30 dark:hover:bg-gray-750 transition">
                      {/* Patient */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.patient_name}</span>
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                          {p.patient_mrn || `AKEH-${String(p.patient_id).padStart(4, '0')}`}
                          {p.patient_gender && <span className="text-gray-400 font-sans ml-1.5 capitalize">• {p.patient_gender}</span>}
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 px-3">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {p.doctor_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {p.doctor_department || 'General OPD'}
                        </div>
                      </td>

                      {/* Medication & Regimen */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.medication_name}</span>
                          {p.is_controlled && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-[10px] font-black rounded">
                              CONTROLLED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {p.dosage} • {p.frequency} • {p.duration}
                        </div>
                        {p.instructions && (
                          <div className="text-[11px] text-gray-400 italic truncate max-w-xs mt-0.5">
                            "{p.instructions}"
                          </div>
                        )}
                      </td>

                      {/* Prescribed Qty */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-200">
                          {prescribedQty}
                        </span>
                      </td>

                      {/* Dispensed Qty */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`font-mono font-bold ${
                          isFullyDispensed ? 'text-emerald-600 dark:text-emerald-400' :
                          dispensedQty > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                        }`}>
                          {dispensedQty} / {prescribedQty}
                        </span>
                      </td>

                      {/* Inventory Stock Availability */}
                      <td className="py-3.5 px-3">
                        {isFullyDispensed ? (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> Fulfilled
                          </span>
                        ) : stockAvail === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded-lg text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Out of stock
                          </span>
                        ) : !isStockSufficient ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg text-xs font-semibold" title={`Requested ${remainingQty}, but only ${stockAvail} in stock`}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Low: {stockAvail} avail
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-xs font-semibold">
                            <Package className="w-3.5 h-3.5 text-emerald-500" /> {stockAvail} in stock
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isFullyDispensed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' :
                          st.includes('partial') ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300' :
                          isExpired ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300' :
                          isCancelled ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}>
                          {isFullyDispensed && <CheckCircle className="w-3 h-3" />}
                          {st.includes('partial') && <Layers className="w-3 h-3" />}
                          {isExpired && <AlertTriangle className="w-3 h-3" />}
                          {isCancelled && <XCircle className="w-3 h-3" />}
                          {!isFullyDispensed && !st.includes('partial') && !isExpired && !isCancelled && <Clock className="w-3 h-3" />}
                          {p.status || (p.is_dispensed ? 'Dispensed' : 'Pending')}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <div>{new Date(p.prescribed_date).toLocaleDateString()}</div>
                        {p.expiry_date && (
                          <div className={`text-[10px] ${isExpired ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                            Exp: {new Date(p.expiry_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => openViewDetails(p.id)}
                            title="View Full Details"
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Dispense Action (Pharmacist / Admin) */}
                          {(isPharmacist || isAdmin) && !isFullyDispensed && !isCancelled && !isExpired && (
                            <button
                              onClick={() => openDispenseModal(p)}
                              title="Dispense Medication"
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                            >
                              <Pill className="w-3.5 h-3.5" />
                              <span>Dispense</span>
                            </button>
                          )}

                          {/* Print Label */}
                          <button
                            onClick={() => setLabelModal(p)}
                            title="Print Bottle Label"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Cancel (Doctor/Admin/Pharmacist) */}
                          {!isFullyDispensed && !isCancelled && (
                            <button
                              onClick={() => handleCancelPrescription(p.id)}
                              title="Cancel Prescription"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Doctor / Admin Edit & Delete (Pharmacist strictly barred) */}
                          {!isPharmacist && can('prescriptions:edit') && !isFullyDispensed && (
                            <button
                              onClick={() => openEdit(p)}
                              title="Edit Prescription"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {!isPharmacist && can('prescriptions:delete') && !isFullyDispensed && (
                            <button
                              onClick={() => handleDelete(p.id)}
                              title="Delete Prescription"
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: VIEW FULL PRESCRIPTION DETAILS                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-150 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Prescription #{detailsModal.prescription.id} Details
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span>Ordered on {new Date(detailsModal.prescription.prescribed_date).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">
                      Status: {detailsModal.prescription.status || (detailsModal.prescription.is_dispensed ? 'Dispensed' : 'Pending')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailsModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm">
              {/* Patient & Doctor Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-500" /> Patient Information
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white text-base">
                    {detailsModal.prescription.patient_name}
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-mono mt-0.5 font-semibold">
                    {detailsModal.prescription.patient_mrn || `AKEH-${String(detailsModal.prescription.patient_id).padStart(4, '0')}`}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-0.5">
                    <div>Gender: <span className="capitalize text-gray-800 dark:text-gray-200">{detailsModal.prescription.patient_gender || 'Not specified'}</span></div>
                    {detailsModal.prescription.patient_phone && <div>Phone: {detailsModal.prescription.patient_phone}</div>}
                  </div>

                  {/* Recorded Allergies Warning */}
                  {detailsModal.allergies?.length > 0 && (
                    <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl">
                      <div className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Recorded Patient Allergies:
                      </div>
                      <div className="text-xs font-semibold text-red-800 dark:text-red-300 mt-1">
                        {detailsModal.allergies.map(a => `${a.allergen_name} (${a.severity})`).join(', ')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-500" /> Prescriber Information
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white text-base">
                    {detailsModal.prescription.doctor_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Department: <span className="font-medium text-gray-800 dark:text-gray-200">{detailsModal.prescription.doctor_department || 'General Medicine'}</span>
                  </div>
                  {detailsModal.prescription.doctor_license && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      License: {detailsModal.prescription.doctor_license}
                    </div>
                  )}
                  {detailsModal.prescription.invoice_id && (
                    <div className="mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Linked Invoice #{detailsModal.prescription.invoice_id} ({detailsModal.prescription.invoice_status?.toUpperCase() || 'BILLED'})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Medication Details */}
              <div className="p-4 bg-purple-50/40 dark:bg-gray-750 rounded-2xl border border-purple-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Pill className="w-5 h-5 text-purple-600" />
                    <span>{detailsModal.prescription.medication_name}</span>
                  </div>
                  <div className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-3 py-1 rounded-full">
                    {detailsModal.prescription.prescribedQuantity} units prescribed
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                  <div><span className="text-gray-400">Dosage:</span> <span className="font-bold text-gray-800 dark:text-gray-200">{detailsModal.prescription.dosage}</span></div>
                  <div><span className="text-gray-400">Frequency:</span> <span className="font-bold text-gray-800 dark:text-gray-200">{detailsModal.prescription.frequency}</span></div>
                  <div><span className="text-gray-400">Duration:</span> <span className="font-bold text-gray-800 dark:text-gray-200">{detailsModal.prescription.duration}</span></div>
                </div>

                {detailsModal.prescription.instructions && (
                  <div className="mt-2.5 p-2.5 bg-white dark:bg-gray-800 rounded-xl text-xs text-gray-600 dark:text-gray-300 border border-purple-100 dark:border-gray-700">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Patient Directions: </span>
                    {detailsModal.prescription.instructions}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between pt-3 border-t border-purple-100 dark:border-gray-700 text-xs font-semibold">
                  <div>
                    Dispensed so far: <span className="font-bold text-purple-700 dark:text-purple-300">{detailsModal.prescription.dispensedQuantity}</span> / {detailsModal.prescription.prescribedQuantity}
                  </div>
                  <div className="text-purple-700 dark:text-purple-300 font-bold">
                    Remaining to dispense: {detailsModal.prescription.remainingQuantity} units
                  </div>
                </div>
              </div>

              {/* Available Batches & FEFO Inventory Check */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Available Pharmacy Batches (FEFO Order)
                  </h4>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Total In Stock: {detailsModal.totalStockAvailable} units
                  </span>
                </div>

                {detailsModal.batches?.length === 0 ? (
                  <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    No active non-expired stock available in inventory for this medication.
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-gray-700/60 font-semibold text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="p-2.5">Batch Number</th>
                          <th className="p-2.5">Expiry Date</th>
                          <th className="p-2.5">Shelf Status</th>
                          <th className="p-2.5 text-right">Available Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {detailsModal.batches.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td className="p-2.5 font-mono font-bold text-gray-900 dark:text-white">
                              {b.batch_number}
                            </td>
                            <td className="p-2.5 text-gray-600 dark:text-gray-400">
                              {new Date(b.expiry_date).toLocaleDateString()}
                              {b.daysUntilExpiry !== undefined && (
                                <span className="text-[10px] text-gray-400 ml-1.5">({b.daysUntilExpiry} days left)</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.shelfStatus === 'CRITICAL_NEAR_EXPIRY' ? 'bg-orange-100 text-orange-800' :
                                b.shelfStatus === 'NEAR_EXPIRY' ? 'bg-yellow-100 text-yellow-800' :
                                b.shelfStatus === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {b.shelfStatus || 'VALID'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {b.quantity_available}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Dispensation History for this prescription */}
              {detailsModal.dispensingHistory?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-purple-600" />
                    Dispensing History for this Prescription
                  </h4>
                  <div className="space-y-2">
                    {detailsModal.dispensingHistory.map((d, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            Dispensed {d.quantity_dispensed} units by {d.pharmacist_email || d.pharmacist_name || 'Pharmacist'}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Batch: <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{d.batch_number || d.lot_number}</span> • {new Date(d.dispensed_at).toLocaleString()}
                          </div>
                          {d.notes && <div className="text-[11px] text-gray-500 italic mt-0.5">Note: "{d.notes}"</div>}
                        </div>
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg font-bold text-[11px]">
                          ✓ Recorded
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDetailsModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLabelModal(detailsModal.prescription)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Label</span>
                </button>

                {(isPharmacist || isAdmin) &&
                  detailsModal.prescription.remainingQuantity > 0 &&
                  !detailsModal.prescription.is_dispensed &&
                  detailsModal.prescription.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = detailsModal.prescription;
                        setDetailsModal(null);
                        openDispenseModal(target);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                    >
                      <Pill className="w-3.5 h-3.5" />
                      <span>Dispense Now</span>
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: INTERACTIVE DISPENSING & BATCH ALLOCATION                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {dispenseTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-150 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Dispense Medication
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Rx #{dispenseTarget.id} • {dispenseTarget.patient_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDispenseTarget(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispense} className="p-6 space-y-4">
              {/* Error banner */}
              {dispenseError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{dispenseError}</span>
                </div>
              )}

              {/* Medication Summary */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-1.5">
                <div className="font-bold text-gray-900 dark:text-white text-sm">
                  {dispenseTarget.medication_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Dosage: {dispenseTarget.dosage} • Frequency: {dispenseTarget.frequency} • {dispenseTarget.duration}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600 text-xs font-semibold">
                  <span>Prescribed: {dispenseTarget.quantity || 1} units</span>
                  <span>Dispensed: {dispenseTarget.quantity_dispensed || 0} units</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    Remaining: {Math.max(0, (dispenseTarget.quantity || 1) - (dispenseTarget.quantity_dispensed || 0))} units
                  </span>
                </div>
              </div>

              {/* Inventory Batch Selector */}
              <div>
                <label className={lbl}>Inventory Batch Selection *</label>
                <select
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className={inp}
                >
                  <option value="auto">
                    ⭐ Auto-Select Earliest Expiry (FEFO) - [Recommended]
                  </option>
                  {dispenseBatches.map(b => (
                    <option key={b.id} value={b.id} disabled={b.isExpired || b.quantity_available <= 0}>
                      Batch: {b.batch_number} | Exp: {new Date(b.expiry_date).toLocaleDateString()} | Avail: {b.quantity_available} units
                      {b.isExpired ? ' (EXPIRED - BLOCKED)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  FEFO ensures stock rotation by dispensing batches nearing expiry first.
                </p>
              </div>

              {/* Quantity to Dispense & Partial Dispense Support */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={lbl}>Quantity to Dispense *</label>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    Support partial fulfillment
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, (dispenseTarget.quantity || 1) - (dispenseTarget.quantity_dispensed || 0))}
                  value={quantityToDispense}
                  onChange={e => setQuantityToDispense(parseInt(e.target.value, 10) || 1)}
                  className={inp}
                  required
                />
                {/* Live partial dispensing feedback */}
                {(() => {
                  const rem = Math.max(0, (dispenseTarget.quantity || 1) - (dispenseTarget.quantity_dispensed || 0));
                  if (quantityToDispense < rem) {
                    return (
                      <div className="mt-1.5 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                        ℹ️ <strong>Partial Dispensation:</strong> {quantityToDispense} units will be dispensed now. The remaining {rem - quantityToDispense} units will remain in queue with status <strong>Partially Dispensed</strong>.
                      </div>
                    );
                  } else {
                    return (
                      <div className="mt-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                        ✓ <strong>Full Dispensation:</strong> This will fulfill the entire prescription and mark status as <strong>Dispensed</strong>.
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Billing Note */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-purple-800 dark:text-purple-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  Billing Engine Linkage:
                </div>
                <p>
                  Integrated with billing. This transaction is verified against hospital invoices to prevent duplicate billing and double charges.
                </p>
              </div>

              {/* Pharmacist Notes */}
              <div>
                <label className={lbl}>Pharmacist Dispensing Notes</label>
                <textarea
                  rows={2}
                  value={dispenseNotes}
                  onChange={e => setDispenseNotes(e.target.value)}
                  placeholder="e.g. Counseled patient on taking with meals; patient verified."
                  className={inp}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setDispenseTarget(null)}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispenseSubmitting || quantityToDispense <= 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
                >
                  {dispenseSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispensing...</span>
                    </>
                  ) : (
                    <>
                      <Pill className="w-4 h-4" />
                      <span>Confirm & Dispense Medication</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: HOSPITAL-WIDE DISPENSING HISTORY AUDIT LOG                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Dispensing History & Audit Trail
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Official record of all medications dispensed by pharmacy staff
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by patient, medicine, batch number, or pharmacist..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                  <span>Loading dispensing audit logs...</span>
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Rx #</th>
                        <th className="p-3">Patient</th>
                        <th className="p-3">Medication</th>
                        <th className="p-3">Batch #</th>
                        <th className="p-3 text-center">Prescribed</th>
                        <th className="p-3 text-center">Dispensed</th>
                        <th className="p-3">Pharmacist</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {globalHistory
                        .filter(h => {
                          const s = historySearch.toLowerCase();
                          return (
                            !historySearch ||
                            h.patient_name?.toLowerCase().includes(s) ||
                            h.medication_name?.toLowerCase().includes(s) ||
                            h.batch_number?.toLowerCase().includes(s) ||
                            h.pharmacist_name?.toLowerCase().includes(s)
                          );
                        })
                        .map((h, i) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                            <td className="p-3 whitespace-nowrap text-gray-500">
                              {new Date(h.dispensed_at).toLocaleString()}
                            </td>
                            <td className="p-3 font-mono font-bold text-purple-600">
                              #{h.prescription_id}
                            </td>
                            <td className="p-3 font-semibold text-gray-900 dark:text-white">
                              {h.patient_name}
                              <div className="text-[10px] text-gray-400 font-mono">{h.patient_mrn}</div>
                            </td>
                            <td className="p-3 font-bold text-gray-800 dark:text-gray-200">
                              {h.medication_name}
                            </td>
                            <td className="p-3 font-mono text-purple-700 dark:text-purple-300 font-semibold">
                              {h.batch_number}
                            </td>
                            <td className="p-3 text-center font-mono">{h.quantity_prescribed}</td>
                            <td className="p-3 text-center font-mono font-bold text-emerald-600">
                              {h.quantity_dispensed}
                            </td>
                            <td className="p-3 text-gray-600 dark:text-gray-400">
                              {h.pharmacist_name || 'Pharmacist'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: PRINTABLE PATIENT MEDICATION BOTTLE LABEL                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {labelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-5 rounded-2xl bg-amber-50/20 text-center font-sans space-y-3">
              <div className="border-b border-gray-200 pb-2">
                <div className="text-[10px] font-black tracking-widest uppercase text-purple-700">
                  ALEM KETEMA ENAT HOSPITAL PHARMACY
                </div>
                <div className="text-[9px] text-gray-500">Tel: +251 11 000 0000 • North Shoa, Ethiopia</div>
              </div>

              <div>
                <div className="text-sm font-black text-gray-900">
                  {labelModal.patient_name}
                </div>
                <div className="text-[11px] font-mono text-purple-600">
                  MRN: {labelModal.patient_mrn || `AKEH-${String(labelModal.patient_id).padStart(4, '0')}`}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="text-base font-black text-gray-900 dark:text-white">
                  {labelModal.medication_name}
                </div>
                <div className="text-xs font-bold text-purple-600 mt-0.5">
                  {labelModal.dosage} • {labelModal.frequency}
                </div>
              </div>

              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl">
                <div>Directions: {labelModal.instructions || 'Take as prescribed by doctor.'}</div>
                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-bold mt-1">
                  «በሐኪሙ ትእዛዝ መሠረት በጥንቃቄ ይውሰዱ»
                </div>
              </div>

              <div className="text-[10px] text-gray-400 flex items-center justify-between pt-2 border-t border-gray-200">
                <span>Prescriber: {labelModal.doctor_name}</span>
                <span>Date: {new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setLabelModal(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: DOCTOR PRESCRIPTION CREATION & EDIT MODAL                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && can('prescriptions:create') && !isPharmacist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit Prescription' : 'New Doctor Prescription'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDoctorSubmit} className="p-6 space-y-4">
              {!editing && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Patient ID *</label>
                    <input
                      type="number"
                      required
                      value={form.patient_id}
                      onChange={e => setForm({ ...form, patient_id: e.target.value })}
                      className={inp}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Diagnosis ID</label>
                    <input
                      type="number"
                      value={form.diagnosis_id}
                      onChange={e => setForm({ ...form, diagnosis_id: e.target.value })}
                      className={inp}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={lbl}>Medication Name *</label>
                <input
                  required
                  value={form.medication_name}
                  onChange={e => setForm({ ...form, medication_name: e.target.value })}
                  className={inp}
                  placeholder="e.g. Amoxicillin 500mg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Dosage *</label>
                  <input
                    required
                    value={form.dosage}
                    onChange={e => setForm({ ...form, dosage: e.target.value })}
                    className={inp}
                    placeholder="e.g. 500mg"
                  />
                </div>
                <div>
                  <label className={lbl}>Frequency *</label>
                  <input
                    required
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                    className={inp}
                    placeholder="e.g. Three times daily"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Duration *</label>
                  <input
                    required
                    value={form.duration}
                    onChange={e => setForm({ ...form, duration: e.target.value })}
                    className={inp}
                    placeholder="e.g. 7 days"
                  />
                </div>
                <div>
                  <label className={lbl}>Prescribed Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className={inp}
                    placeholder="e.g. 21"
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Clinical Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                  rows={2}
                  className={inp}
                  placeholder="Take with food, avoid dairy products..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition"
                >
                  {editing ? 'Update Prescription' : 'Check Safety & Prescribe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Doctor Allergy Conflict Modal ───────────────────────────────── */}
      {allergyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 border-2 border-red-500 animate-shake">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 rounded-2xl flex-shrink-0">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-100 dark:bg-red-950 px-2.5 py-0.5 rounded-full">
                  CLINICAL SAFETY ALERT
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  Medication Allergy & Interaction Warning
                </h3>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing.
              </p>
            </div>

            {allergyModal.hardBlocked && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-950 border-2 border-red-600 rounded-2xl text-xs font-black text-red-900 dark:text-red-200 flex items-start gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  HARD STOP CONTRAINDICATION: Severe allergy (Anaphylaxis) recorded. Prescribing this medication is strictly blocked by hospital policy.
                </div>
              </div>
            )}

            {!allergyModal.hardBlocked ? (
              <form onSubmit={handleConfirmOverride} className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Mandatory Prescriber Override Justification * (Min 5 chars)
                  </label>
                  <textarea
                    required
                    minLength={5}
                    rows={2}
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="e.g. Benefits outweigh cross-reactivity risk; observed dose"
                    className={inp}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ack-check"
                    required
                    checked={overrideAck}
                    onChange={e => setOverrideAck(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="ack-check" className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    I acknowledge the clinical risk and assume prescribing responsibility.
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAllergyModal(null)}
                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!overrideAck || overrideReason.trim().length < 5}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    Authorize Override & Prescribe
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAllergyModal(null)}
                  className="px-5 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900"
                >
                  Close & Change Medication
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsPage;
