/**
 * Pharmacy Dashboard with Batch Tracking & FEFO Inventory Management
 * Alem Ketema Enat Hospital Management System
 * - Prescriptions queue with payment status check
 * - Batch-level inventory tracking with FEFO (First Expired, First Out)
 * - Expiry alerts (EXPIRED, CRITICAL_NEAR_EXPIRY, NEAR_EXPIRY, VALID)
 * - Receive new medication batches
 * - Stock adjustments with audit reason
 */

import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Pill, RefreshCw, CheckCircle2, Search, AlertTriangle,
  PlusCircle, ShieldAlert, Boxes, FileText
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  is_dispensed: boolean;
  workflow_status: string;
  prescribed_date: string;
  encounter_id?: number;
  payment_status?: string;
}

interface MedicationBatch {
  id: number;
  medication_id: number;
  medication_name: string;
  generic_name?: string;
  batch_number: string;
  quantity_received: number;
  quantity_available: number;
  expiry_date: string;
  received_date: string;
  storage_location?: string;
  supplier_name?: string;
  status: 'active' | 'quarantined' | 'recalled' | 'depleted';
  daysUntilExpiry: number;
  statusMeta?: string;
  suggestedAction?: string;
}

interface MedicineOption {
  id: number;
  name: string;
  generic_name?: string;
  unit_price: number;
}

const formatAmharicInstruction = (inst: string): string => {
  if (!inst) return '';
  const lower = inst.toLowerCase();
  if (lower.includes('with food')) return '— ከምግብ ጋር ይወሰድ';
  if (lower.includes('before meal') || lower.includes('before food')) return '— ከምግብ በፊት ይወሰድ';
  if (lower.includes('after meal') || lower.includes('after food')) return '— ከምግብ በኋላ ይወሰድ';
  if (lower.includes('morning') && lower.includes('night')) return '— ጥዋትና ማታ';
  return '';
};

export const PharmacyDashboard: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'batches' | 'alerts'>('prescriptions');

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [search, setSearch] = useState('');
  const [rxSearchTerm, setRxSearchTerm] = useState('');
  const [rxFilter, setRxFilter] = useState<'pending' | 'dispensed' | 'all'>('pending');

  // Batches state
  const [batches, setBatches] = useState<MedicationBatch[]>([]);
  const [batchFilter, setBatchFilter] = useState<'all' | 'valid' | 'near_expiry' | 'expired' | 'out_of_stock'>('all');
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<MedicationBatch | null>(null);

  // Persistent Inventory Alerts state
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [evaluatingAlerts, setEvaluatingAlerts] = useState(false);

  // Forms
  const [receiveForm, setReceiveForm] = useState({
    medication_id: '',
    batch_number: '',
    quantity: '100',
    expiry_date: '',
    storage_location: 'Main Pharmacy - Shelf A',
    supplier_name: 'Ethiopian Pharmaceuticals Supply Agency (EPSA)',
    unit_cost: '0.00'
  });

  const [adjustForm, setAdjustForm] = useState({
    quantity_change: '-1',
    movement_type: 'damaged',
    reason: ''
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchBatches();
    fetchMedicines();
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/pharmacy/inventory/alerts');
      setInventoryAlerts(res.data.data.alerts || []);
    } catch {
      console.error('Error fetching inventory alerts');
    }
  };

  const handleEvaluateAlerts = async () => {
    setEvaluatingAlerts(true);
    try {
      const res = await api.post('/pharmacy/inventory/evaluate-alerts');
      showToast('success', `Safety audit complete: ${res.data.data.alertsCreated} created, ${res.data.data.alertsUpdated} updated.`);
      await fetchAlerts();
      await fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to evaluate inventory');
    } finally {
      setEvaluatingAlerts(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await api.patch(`/pharmacy/inventory/alerts/${alertId}/acknowledge`);
      showToast('success', 'Alert acknowledged.');
      await fetchAlerts();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to acknowledge alert');
    }
  };

  const handleQuarantineBatch = async (batchId: number, batchNumber: string) => {
    if (!window.confirm(`Are you sure you want to quarantine batch ${batchNumber}? This will immediately halt dispensing and remove stock from active circulation.`)) {
      return;
    }
    try {
      await api.post(`/pharmacy/inventory/batches/${batchId}/quarantine`, {
        reason: 'Pharmacist initiated clinical safety quarantine'
      });
      showToast('success', `Batch ${batchNumber} successfully quarantined.`);
      await fetchAlerts();
      await fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to quarantine batch');
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const params = rxFilter === 'pending' ? '?is_dispensed=false' :
                     rxFilter === 'dispensed' ? '?is_dispensed=true' : '';
      const res = await api.get(`/prescriptions${params}`);
      setPrescriptions(res.data.data.prescriptions || []);
    } catch {
      showToast('error', 'Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/pharmacy/batches');
      setBatches(res.data.data.batches || []);
    } catch {
      console.error('Error fetching batches');
    }
  };

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines?limit=200');
      setMedicines(res.data.data.medicines || []);
    } catch {
      console.error('Error fetching medicine catalog');
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [rxFilter]);

  // Dispense with FEFO allocation
  const dispenseWithFEFO = async (rx: Prescription) => {
    setSubmitting(rx.id);
    try {
      // Call FEFO dispense endpoint
      const res = await api.post('/pharmacy/dispense', {
        prescription_id: rx.id,
        quantity: 1,
        notes: `FEFO prescription dispensing for ${rx.patient_name}`
      });

      const allocInfo = res.data.data?.allocations?.map(
        (a: any) => `Batch ${a.batchNumber} (${a.quantityAllocated} units)`
      ).join(', ') || 'Earliest batch';

      showToast('success', `Dispensed via FEFO: ${allocInfo} for ${rx.patient_name}!`);
      await fetchPrescriptions();
      await fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Dispense failed');
    } finally {
      setSubmitting(null);
    }
  };

  // Submit Receive New Batch
  const handleReceiveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveForm.medication_id || !receiveForm.batch_number || !receiveForm.expiry_date) {
      showToast('error', 'Please fill all required batch fields.');
      return;
    }
    try {
      await api.post('/pharmacy/batches', receiveForm);
      showToast('success', `Batch ${receiveForm.batch_number} received into FEFO inventory!`);
      setShowReceiveModal(false);
      setReceiveForm({
        medication_id: '',
        batch_number: '',
        quantity: '100',
        expiry_date: '',
        storage_location: 'Main Pharmacy - Shelf A',
        supplier_name: 'Ethiopian Pharmaceuticals Supply Agency (EPSA)',
        unit_cost: '0.00'
      });
      fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to receive batch');
    }
  };

  // Submit Stock Adjustment
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal || !adjustForm.reason) {
      showToast('error', 'Mandatory authorized reason required.');
      return;
    }
    try {
      await api.post('/pharmacy/stock-adjustments', {
        batch_id: showAdjustModal.id,
        quantity_change: parseInt(adjustForm.quantity_change, 10),
        movement_type: adjustForm.movement_type,
        reason: adjustForm.reason
      });
      showToast('success', `Stock adjusted for batch ${showAdjustModal.batch_number}`);
      setShowAdjustModal(null);
      setAdjustForm({ quantity_change: '-1', movement_type: 'damaged', reason: '' });
      fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Adjustment failed');
    }
  };

  // Filter Prescriptions
  const filteredRx = prescriptions.filter(p => {
    if (rxSearchTerm) {
      const q = rxSearchTerm.toLowerCase();
      const matchName = (p.patient_name || '').toLowerCase().includes(q);
      const matchMed = (p.medication_name || '').toLowerCase().includes(q);
      const matchDoc = (p.doctor_name || '').toLowerCase().includes(q);
      if (!matchName && !matchMed && !matchDoc) return false;
    }
    const q = search.toLowerCase();
    return (
      p.patient_name?.toLowerCase().includes(q) ||
      p.medication_name?.toLowerCase().includes(q) ||
      p.doctor_name?.toLowerCase().includes(q)
    );
  });

  // Filter Batches
  const filteredBatches = batches.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = (
      b.medication_name?.toLowerCase().includes(q) ||
      b.batch_number?.toLowerCase().includes(q) ||
      b.storage_location?.toLowerCase().includes(q)
    );
    if (!matchSearch) return false;

    if (batchFilter === 'expired') return b.daysUntilExpiry <= 0;
    if (batchFilter === 'near_expiry') return b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 90;
    if (batchFilter === 'out_of_stock') return b.quantity_available <= 0;
    if (batchFilter === 'valid') return b.daysUntilExpiry > 90 && b.quantity_available > 0;
    return true;
  });

  // Expiry counts
  const expiredCount = batches.filter(b => b.daysUntilExpiry <= 0).length;
  const criticalCount = batches.filter(b => b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 30).length;
  const nearExpiryCount = batches.filter(b => b.daysUntilExpiry > 30 && b.daysUntilExpiry <= 90).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-950/70 px-3 py-1 text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
            <Pill className="h-3.5 w-3.5" /> Alem Ketema Pharmacy • FEFO System
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            Pharmacy & Batch Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforcing First Expired, First Out (FEFO) dispensing & shelf-life safety
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReceiveModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <PlusCircle className="h-4 w-4" />
            Receive Batch
          </button>
          <button
            onClick={() => { fetchPrescriptions(); fetchBatches(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Prominent Expired / Critical Expiry Warning Banners */}
      {(expiredCount > 0 || criticalCount > 0 || nearExpiryCount > 0) && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/60 text-red-600 rounded-xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
                Pharmaceutical Expiry Safeguard Alert
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                {expiredCount > 0 && <span className="font-bold underline">{expiredCount} EXPIRED batches</span>}
                {expiredCount > 0 && criticalCount > 0 && ' • '}
                {criticalCount > 0 && <span className="font-bold">{criticalCount} critical near-expiry batches (&le;30d)</span>}
                {(expiredCount > 0 || criticalCount > 0) && nearExpiryCount > 0 && ' • '}
                {nearExpiryCount > 0 && <span className="font-medium text-amber-700 dark:text-amber-300">{nearExpiryCount} batches within 90 days</span>}
                {' '}identified in inventory. Expired medications are automatically blocked from dispensing.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setActiveTab('batches'); setBatchFilter('expired'); }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            Inspect Affected Batches
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'prescriptions'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Prescription Dispensing</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
            {prescriptions.filter(p => !p.is_dispensed).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'batches'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>FEFO Medication Batches</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
            {batches.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'alerts'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Safety & Inventory Alerts</span>
          {inventoryAlerts.filter(a => !a.is_acknowledged).length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold">
              {inventoryAlerts.filter(a => !a.is_acknowledged).length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Sub-Filter Bar */}
      <div className="flex gap-4 items-center flex-wrap">
        {activeTab === 'prescriptions' ? (
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            {(['pending', 'dispensed', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRxFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                  rxFilter === f ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 flex-wrap">
            {[
              { id: 'all', label: 'All Batches' },
              { id: 'valid', label: 'Valid Stock' },
              { id: 'near_expiry', label: 'Near Expiry (≤90d)' },
              { id: 'expired', label: 'Expired (Blocked)' },
              { id: 'out_of_stock', label: 'Depleted' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setBatchFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  batchFilter === f.id ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={activeTab === 'prescriptions' ? "Search patient, medication..." : "Search medication, batch number, location..."}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      </div>

      {/* ── TAB 1: PRESCRIPTION DISPENSING ──────────────────────────── */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={rxSearchTerm}
                onChange={e => setRxSearchTerm(e.target.value)}
                placeholder="Search by patient, drug name, or prescriber..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredRx.length} of {prescriptions.length} prescriptions
              </span>
            </div>
          </div>
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
          {filteredRx.length === 0 ? (
            <div className="p-12 text-center">
              <Pill className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500">No prescriptions found</p>
              <p className="text-xs text-slate-400 mt-1">Pending doctor prescriptions will appear here.</p>
            </div>
          ) : (
            filteredRx.map(rx => (
              <div key={rx.id} className="p-5 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${rx.is_dispensed ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                    <Pill className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {rx.medication_name}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                        rx.is_dispensed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rx.is_dispensed ? '✓ Dispensed' : '⏳ Pending Dispensation'}
                      </span>
                      {rx.payment_status === 'UNPAID' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                          {language === 'am' ? 'ክፍያ ይጠበቃል' : 'Payment Required'}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Patient: <span className="font-bold text-slate-800 dark:text-slate-100">{rx.patient_name}</span>
                      {' · '} Prescriber: Dr. {rx.doctor_name}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{rx.dosage}</span> · {rx.frequency} · {rx.duration}
                      {rx.instructions && (
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {' · '}{rx.instructions} <span className="text-emerald-700 font-amharic">{formatAmharicInstruction(rx.instructions)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {!rx.is_dispensed && rx.payment_status !== 'UNPAID' && (
                    <button
                      onClick={() => dispenseWithFEFO(rx)}
                      disabled={submitting === rx.id}
                      className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {submitting === rx.id ? 'Allocating FEFO...' : 'Dispense via FEFO'}
                    </button>
                  )}
                  {!rx.is_dispensed && rx.payment_status === 'UNPAID' && (
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed"
                      title="Patient must settle invoice at cashier before dispensing."
                    >
                      Payment Pending
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      )}

      {/* ── TAB 2: FEFO BATCHES INVENTORY ───────────────────────────── */}
      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Medication</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Available Qty</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Shelf-Life Status</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No medication batches found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map(batch => {
                    const isExpired = batch.daysUntilExpiry <= 0;
                    const isCritical = batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 30;
                    const isNear = batch.daysUntilExpiry > 30 && batch.daysUntilExpiry <= 90;

                    let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
                    let label = 'VALID STOCK';
                    if (batch.quantity_available <= 0) {
                      badgeColor = 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
                      label = 'DEPLETED';
                    } else if (isExpired) {
                      badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300';
                      label = 'BLOCKED (EXPIRED)';
                    } else if (isCritical) {
                      badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300';
                      label = `CRITICAL (${batch.daysUntilExpiry}d remaining)`;
                    } else if (isNear) {
                      badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                      label = `NEAR EXPIRY (${batch.daysUntilExpiry}d)`;
                    }

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {batch.medication_name}
                          </div>
                          {batch.generic_name && (
                            <div className="text-[11px] text-slate-400">{batch.generic_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {batch.batch_number}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-black text-sm ${batch.quantity_available <= 5 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                            {batch.quantity_available}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">units</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {new Date(batch.expiry_date).toLocaleDateString('en-GB')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isExpired ? `${Math.abs(batch.daysUntilExpiry)} days ago` : `${batch.daysUntilExpiry} days left`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeColor}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {batch.storage_location || 'Main Pharmacy'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setShowAdjustModal(batch)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: SAFETY & INVENTORY ALERTS ─────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Action & Metric Header */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Automated Inventory & Shelf-Life Safety Alerts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time evaluation of expiry dates, FEFO compliance, and clinical stock thresholds
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleEvaluateAlerts}
                disabled={evaluatingAlerts}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${evaluatingAlerts ? 'animate-spin' : ''}`} />
                {evaluatingAlerts ? 'Auditing Inventory...' : 'Run Stock & Expiry Audit'}
              </button>
            </div>
          </div>

          {/* Alert Cards List */}
          <div className="space-y-3">
            {inventoryAlerts.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All Inventory Clean & Safe</p>
                <p className="text-xs text-slate-400 mt-1">No active stockouts, expired batches, or critical thresholds detected.</p>
              </div>
            ) : (
              inventoryAlerts.map((alert: any) => {
                const isCritical = alert.severity === 'critical';
                const isWarning = alert.severity === 'warning';
                const borderClass = isCritical 
                  ? 'border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20'
                  : isWarning 
                  ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

                return (
                  <div key={alert.id} className={`p-4 rounded-2xl border-2 transition ${borderClass} flex items-start justify-between flex-wrap gap-4`}>
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCritical ? 'bg-red-600 text-white' : isWarning ? 'bg-amber-500 text-slate-950' : 'bg-slate-500 text-white'
                        }`}>
                          {alert.severity}
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {alert.alert_type.replace('_', ' ')}
                        </span>

                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {alert.medication_name}
                        </span>

                        {alert.batch_number && (
                          <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            Batch: {alert.batch_number}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {alert.message}
                      </p>

                      {alert.suggested_action && (
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="font-bold text-violet-600 dark:text-violet-400">Suggested Action:</span> {alert.suggested_action}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                        <span>Reported: {new Date(alert.created_at).toLocaleString('en-GB')}</span>
                        {alert.is_acknowledged ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Acknowledged {alert.acknowledged_by_name ? `by ${alert.acknowledged_by_name}` : ''}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">Unacknowledged</span>
                        )}
                      </div>
                    </div>

                    {/* Alert Action Buttons */}
                    <div className="flex items-center gap-2 self-center">
                      {!alert.is_acknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Acknowledge
                        </button>
                      )}

                      {alert.batch_id && (alert.alert_type === 'expired' || alert.alert_type === 'near_expiry') && (
                        <button
                          type="button"
                          onClick={() => handleQuarantineBatch(alert.batch_id, alert.batch_number || `ID ${alert.batch_id}`)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Quarantine Batch
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: RECEIVE NEW BATCH ─────────────────────────────────── */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Receive New Medication Batch
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter batch details to register into FEFO dispensing rotation
            </p>

            <form onSubmit={handleReceiveBatch} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Medication *
                </label>
                <select
                  required
                  value={receiveForm.medication_id}
                  onChange={e => setReceiveForm({ ...receiveForm, medication_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- Choose Medication Catalog Item --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.generic_name || 'Generic'}) — {m.unit_price} ETB
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Batch / Lot Number *
                  </label>
                  <input
                    required
                    value={receiveForm.batch_number}
                    onChange={e => setReceiveForm({ ...receiveForm, batch_number: e.target.value })}
                    placeholder="e.g. BATCH-2026-X1"
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiveForm.quantity}
                    onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Expiry Date * (Must be in future)
                </label>
                <input
                  type="date"
                  required
                  value={receiveForm.expiry_date}
                  onChange={e => setReceiveForm({ ...receiveForm, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier Name
                  </label>
                  <input
                    value={receiveForm.supplier_name}
                    onChange={e => setReceiveForm({ ...receiveForm, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Storage Shelf / Location
                  </label>
                  <input
                    value={receiveForm.storage_location}
                    onChange={e => setReceiveForm({ ...receiveForm, storage_location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Record Batch Reception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: STOCK ADJUSTMENT ─────────────────────────────────── */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Stock Adjustment / Quarantine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Batch: <span className="font-bold text-slate-800 dark:text-slate-200">{showAdjustModal.batch_number}</span> ({showAdjustModal.medication_name})
            </p>

            <form onSubmit={handleStockAdjustment} className="mt-5 space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs flex justify-between">
                <span className="text-slate-500">Current Available Quantity:</span>
                <span className="font-black text-slate-800 dark:text-slate-200">{showAdjustModal.quantity_available} units</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type *
                </label>
                <select
                  value={adjustForm.movement_type}
                  onChange={e => setAdjustForm({ ...adjustForm, movement_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="damaged">Damaged Stock (Deduct)</option>
                  <option value="expired">Expired Stock Disposal (Deduct & Quarantine)</option>
                  <option value="quarantined">Safety Recall Quarantine (Hold)</option>
                  <option value="returned">Supplier Return</option>
                  <option value="adjusted">Physical Count Correction (+ or -)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantity Change (+ or -) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantity_change}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
                  placeholder="-5 or +10"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Authorized Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Expired shelf life disposal witnessed by Chief Pharmacist"
                  className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Authorize Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyDashboard;
