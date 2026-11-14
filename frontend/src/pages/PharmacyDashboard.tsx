/**
 * Full Hospital Pharmacy Management Suite
 * Alem Ketema Enat Hospital Management System
 * 
 * 1. Prescriptions & Dispensing Queue (FEFO, Payment Status, Label Generation)
 * 2. Point of Sale (POS) & Walk-In OTC Dispensing with Printable Receipts
 * 3. Medication Catalog & Formulary Management
 * 4. FEFO Medication Batches & Shelf-Life Tracker
 * 5. Narcotics & Controlled Substances Register (MoH / EFMHACA Compliant)
 * 6. Clinical Safety, Drug-Drug Interactions & Allergy Alerts
 * 7. Pharmacy Analytics & Smart Queue Counter Integration
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Pill, RefreshCw, CheckCircle2, Search, AlertTriangle,
  PlusCircle, ShieldAlert, Boxes, FileText, ShoppingCart,
  Trash2, Printer, Shield, Lock, Plus, Minus,
  Clock, Check, DollarSign, X,
  Building, Sparkles, QrCode
} from 'lucide-react';
import WristbandScannerModal from '../components/WristbandScannerModal';

// ── Types ────────────────────────────────────────────────────────────
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
  diagnosis_name?: string;
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
}

interface MedicineItem {
  id: number;
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  unit?: string;
  unit_price: number;
  stock_quantity?: number;
  reorder_level?: number;
  is_controlled?: boolean;
  is_prescription_required?: boolean;
  description?: string;
}

interface CartItem {
  medicine: MedicineItem;
  quantity: number;
}

interface PharmacySale {
  id: number;
  sale_receipt_number: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  dispensed_counter: string;
  dispensed_by_name?: string;
  created_at: string;
  items?: any[];
  notes?: string;
}

interface ControlledDrugLog {
  id: number;
  log_number: string;
  medication_name: string;
  batch_number: string;
  patient_name: string;
  patient_mrn: string;
  doctor_name: string;
  doctor_license_number: string;
  indication: string;
  quantity_prescribed: number;
  quantity_dispensed: number;
  unit: string;
  balance_remaining: number;
  witness_name: string;
  witness_role: string;
  dispensed_by_name?: string;
  dispensed_at: string;
  notes?: string;
}

interface PrescriptionLabelData {
  hospitalName: string;
  pharmacyName: string;
  phone: string;
  prescriptionNumber: string;
  date: string;
  patientName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  instructionsAmharic: string;
  doctorName: string;
  dispensedBy: string;
  precautions: string;
  counterStation: string;
}

export const PharmacyDashboard: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    'prescriptions' | 'pos' | 'catalog' | 'batches' | 'controlled' | 'alerts' | 'analytics'
  >('prescriptions');

  const urlPatientId = searchParams.get('patient_id');

  useEffect(() => {
    if (urlPatientId) {
      loadPatientForPharmacy(parseInt(urlPatientId, 10));
    }
  }, [urlPatientId]);

  const loadPatientForPharmacy = async (pid: number) => {
    try {
      const res = await api.get(`/patients/${pid}`);
      if (res.data?.success && res.data.data) {
        const p = res.data.data;
        const fullName = `${p.first_name} ${p.last_name}`;
        setRxSearch(fullName);
        setActiveTab('prescriptions');
        setRxFilter('all');
        if (p.allergies) {
          showToast('warning', `Identified patient ${fullName}. Documented Allergies: ${p.allergies}`);
        } else {
          showToast('success', `Identified patient ${fullName}. Filtering prescriptions.`);
        }
      }
    } catch {
      // ignore
    }
  };

  // General Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; msg: string } | null>(null);

  // ── Tab 1: Prescriptions Queue State ─────────────────────────────────
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [rxSearch, setRxSearch] = useState('');
  const [rxFilter, setRxFilter] = useState<'pending' | 'dispensed' | 'all'>('pending');
  const [dispensingRxId, setDispensingRxId] = useState<number | null>(null);
  const [safetyCheckResult, setSafetyCheckResult] = useState<any | null>(null);
  const [safetyCheckTarget, setSafetyCheckTarget] = useState<Prescription | null>(null);

  // ── Tab 2: POS / Walk-in OTC State ────────────────────────────────────
  const [posCatalogSearch, setPosCatalogSearch] = useState('');
  const [posCategoryFilter, setPosCategoryFilter] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'telebirr' | 'cbe_birr' | 'card' | 'insurance'>('telebirr');
  const [posCounter, setPosCounter] = useState('Pharmacy 1');
  const [posNotes, setPosNotes] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [recentSales, setRecentSales] = useState<PharmacySale[]>([]);
  const [todaySalesSummary, setTodaySalesSummary] = useState({ todaySalesCount: 0, todayRevenueETB: 0 });
  const [selectedReceipt, setSelectedReceipt] = useState<PharmacySale | null>(null);

  // ── Tab 3: Catalog State ─────────────────────────────────────────────
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicineItem | null>(null);
  const [medForm, setMedForm] = useState({
    name: '',
    generic_name: '',
    category: 'Antibiotics',
    unit: 'tablets',
    unit_price: '25.00',
    reorder_level: '20',
    is_controlled: false,
    is_prescription_required: true,
    manufacturer: '',
    storage_conditions: 'Store below 25°C',
    description: ''
  });

  // ── Tab 4: FEFO Batches State ─────────────────────────────────────────
  const [batches, setBatches] = useState<MedicationBatch[]>([]);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState<'all' | 'valid' | 'near_expiry' | 'expired' | 'out_of_stock'>('all');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<MedicationBatch | null>(null);
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

  // ── Tab 5: Controlled Substances State ───────────────────────────────
  const [controlledLogs, setControlledLogs] = useState<ControlledDrugLog[]>([]);
  const [safeInventory, setSafeInventory] = useState<any[]>([]);
  const [showControlledModal, setShowControlledModal] = useState(false);
  const [controlledForm, setControlledForm] = useState({
    medication_id: '',
    patient_name: '',
    patient_mrn: '',
    doctor_name: 'Dr. Awoke Desta',
    doctor_license_number: 'ETH-MD-48192',
    indication: 'Post-operative severe trauma analgesia',
    quantity_prescribed: '2',
    quantity_dispensed: '2',
    unit: 'ampoules',
    witness_name: 'Sr. Bethlehem Yilma',
    witness_role: 'Charge Nurse',
    notes: 'Witnessed in surgical ward'
  });

  // ── Tab 6: Safety & Expiry Alerts State ──────────────────────────────
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [evaluatingAlerts, setEvaluatingAlerts] = useState(false);

  // ── Label Modal State ────────────────────────────────────────────────
  const [labelModalData, setLabelModalData] = useState<PrescriptionLabelData | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handlePatientScanVerified = (result: any) => {
    setShowScannerModal(false);
    const patient = result?.patient;
    if (!patient) return;
    const fullName = `${patient.first_name} ${patient.last_name}`;
    setRxSearch(fullName);
    setActiveTab('prescriptions');
    setRxFilter('all');
    if (patient.allergies) {
      showToast('warning', `Identified patient ${fullName} (${patient.mrn || 'ID #' + patient.id}). Documented Allergies: ${patient.allergies}`);
    } else {
      showToast('success', `Identified patient: ${fullName} (${patient.mrn || 'ID #' + patient.id}). Filtering active prescriptions.`);
    }
  };

  // Ref for print container
  const printAreaRef = useRef<HTMLDivElement>(null);

  const showToast = (type: 'success' | 'error' | 'warning', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Fetch Functions ──────────────────────────────────────────────────
  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const params = rxFilter === 'pending' ? '?is_dispensed=false' : rxFilter === 'dispensed' ? '?is_dispensed=true' : '';
      const res = await api.get(`/prescriptions${params}`);
      setPrescriptions(res.data.data.prescriptions || []);
    } catch {
      showToast('error', 'Failed to load prescriptions queue');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await api.get('/pharmacy/batches');
      setBatches(res.data.data.batches || []);
    } catch (e) {
      console.error('Error fetching batches:', e);
    }
  };

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines?limit=250');
      setMedicines(res.data.data.medicines || []);
    } catch (e) {
      console.error('Error fetching medicines catalog:', e);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await api.get('/pharmacy/sales');
      if (res.data?.success) {
        setRecentSales(res.data.data.sales || []);
        if (res.data.data.summary) {
          setTodaySalesSummary(res.data.data.summary);
        }
      }
    } catch (e) {
      console.error('Error fetching pharmacy sales:', e);
    }
  };

  const fetchControlledSubstances = async () => {
    try {
      const res = await api.get('/pharmacy/controlled-substances');
      if (res.data?.success) {
        setControlledLogs(res.data.data.logs || []);
        setSafeInventory(res.data.data.safeInventory || []);
      }
    } catch (e) {
      console.error('Error fetching controlled substances:', e);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/pharmacy/inventory/alerts');
      setInventoryAlerts(res.data.data.alerts || []);
    } catch (e) {
      console.error('Error fetching inventory alerts:', e);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchBatches();
    fetchMedicines();
    fetchSales();
    fetchControlledSubstances();
    fetchAlerts();
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [rxFilter]);

  // ── Dispensing via FEFO ──────────────────────────────────────────────
  const handleDispenseFEFO = async (rx: Prescription) => {
    setDispensingRxId(rx.id);
    try {
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
      setDispensingRxId(null);
    }
  };

  // ── Safety Check ─────────────────────────────────────────────────────
  const handleRunSafetyCheck = async (rx: Prescription) => {
    setSafetyCheckTarget(rx);
    try {
      const res = await api.post('/pharmacy/safety-check', {
        patient_id: rx.patient_id,
        medication_name: rx.medication_name
      });
      setSafetyCheckResult(res.data.data);
    } catch (err: any) {
      showToast('error', 'Safety evaluation failed: ' + err.message);
    }
  };

  // ── Print Prescription Label ─────────────────────────────────────────
  const handleOpenPrintLabel = async (rxId: number) => {
    try {
      const res = await api.get(`/pharmacy/prescriptions/${rxId}/label`);
      if (res.data?.success) {
        setLabelModalData(res.data.data);
      }
    } catch (err: any) {
      showToast('error', 'Failed to generate label: ' + err.message);
    }
  };

  // ── POS Cart Controls ────────────────────────────────────────────────
  const addToCart = (med: MedicineItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.medicine.id === med.id);
      if (existing) {
        return prev.map(item =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const updateCartQty = (medId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.medicine.id === medId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (medId: number) => {
    setCart(prev => prev.filter(item => item.medicine.id !== medId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.medicine.unit_price * item.quantity), 0);
  }, [cart]);

  // Submit POS Sale
  const handleCheckoutSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast('warning', 'Cart is empty. Select medicines first.');
      return;
    }
    if (!customerName.trim()) {
      showToast('error', 'Customer name is required.');
      return;
    }

    setSubmittingSale(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        items: cart.map(i => ({ medication_id: i.medicine.id, quantity: i.quantity })),
        payment_method: paymentMethod,
        dispensed_counter: posCounter,
        notes: posNotes || undefined
      };

      const res = await api.post('/pharmacy/sales', payload);
      if (res.data?.success) {
        showToast('success', `Direct sale ${res.data.data.sale.sale_receipt_number} completed!`);
        setSelectedReceipt(res.data.data.sale);
        setCart([]);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setPosNotes('');
        await fetchSales();
        await fetchBatches();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Sale checkout failed');
    } finally {
      setSubmittingSale(false);
    }
  };

  // ── Medication Catalog Add / Edit ────────────────────────────────────
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: medForm.name.trim(),
        generic_name: medForm.generic_name.trim() || null,
        category: medForm.category,
        unit: medForm.unit,
        unit_price: parseFloat(medForm.unit_price) || 0,
        reorder_level: parseInt(medForm.reorder_level, 10) || 10,
        is_controlled: medForm.is_controlled,
        is_prescription_required: medForm.is_prescription_required,
        manufacturer: medForm.manufacturer || null,
        storage_conditions: medForm.storage_conditions || null,
        description: medForm.description || null
      };

      if (editingMed) {
        await api.put(`/medicines/${editingMed.id}`, payload);
        showToast('success', `Updated medication ${payload.name}`);
      } else {
        await api.post('/medicines', payload);
        showToast('success', `Added new medication ${payload.name}`);
      }
      setShowAddMedModal(false);
      setEditingMed(null);
      await fetchMedicines();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save medication');
    }
  };

  // ── Batch Reception ──────────────────────────────────────────────────
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
      await fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to receive batch');
    }
  };

  // ── Stock Adjustment ─────────────────────────────────────────────────
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
      await fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Adjustment failed');
    }
  };

  // ── Controlled Substances Submission ─────────────────────────────────
  const handleSaveControlledDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!controlledForm.medication_id || !controlledForm.patient_name || !controlledForm.quantity_dispensed) {
      showToast('error', 'Please fill all mandatory controlled drug fields.');
      return;
    }
    try {
      const res = await api.post('/pharmacy/controlled-substances', controlledForm);
      if (res.data?.success) {
        showToast('success', `Controlled drug recorded under ${res.data.data.log.log_number}!`);
        setShowControlledModal(false);
        setControlledForm({
          medication_id: '',
          patient_name: '',
          patient_mrn: '',
          doctor_name: 'Dr. Awoke Desta',
          doctor_license_number: 'ETH-MD-48192',
          indication: 'Post-operative severe trauma analgesia',
          quantity_prescribed: '2',
          quantity_dispensed: '2',
          unit: 'ampoules',
          witness_name: 'Sr. Bethlehem Yilma',
          witness_role: 'Charge Nurse',
          notes: 'Witnessed in surgical ward'
        });
        await fetchControlledSubstances();
        await fetchBatches();
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to record controlled substance');
    }
  };

  // ── Safety Alerts Evaluation ─────────────────────────────────────────
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
    if (!window.confirm(`Quarantine batch ${batchNumber}? This will immediately halt dispensing and remove stock from circulation.`)) {
      return;
    }
    try {
      await api.post(`/pharmacy/inventory/batches/${batchId}/quarantine`, {
        reason: 'Pharmacist initiated clinical safety quarantine'
      });
      showToast('success', `Batch ${batchNumber} quarantined.`);
      await fetchAlerts();
      await fetchBatches();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to quarantine batch');
    }
  };

  // ── Filters & Computations ───────────────────────────────────────────
  const filteredRx = useMemo(() => {
    return prescriptions.filter(p => {
      const q = rxSearch.toLowerCase();
      const matchSearch =
        (p.patient_name || '').toLowerCase().includes(q) ||
        (p.medication_name || '').toLowerCase().includes(q) ||
        (p.doctor_name || '').toLowerCase().includes(q);
      return matchSearch;
    });
  }, [prescriptions, rxSearch]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const q = catalogSearch.toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        (m.generic_name || '').toLowerCase().includes(q) ||
        (m.category || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (catalogCategory !== 'All' && m.category !== catalogCategory) return false;
      return true;
    });
  }, [medicines, catalogSearch, catalogCategory]);

  const posFilteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const q = posCatalogSearch.toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        (m.generic_name || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (posCategoryFilter !== 'All' && m.category !== posCategoryFilter) return false;
      return true;
    });
  }, [medicines, posCatalogSearch, posCategoryFilter]);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const q = batchSearch.toLowerCase();
      const matchSearch =
        b.medication_name.toLowerCase().includes(q) ||
        b.batch_number.toLowerCase().includes(q) ||
        (b.storage_location || '').toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (batchFilter === 'expired') return b.daysUntilExpiry <= 0;
      if (batchFilter === 'near_expiry') return b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 90;
      if (batchFilter === 'out_of_stock') return b.quantity_available <= 0;
      if (batchFilter === 'valid') return b.daysUntilExpiry > 90 && b.quantity_available > 0;
      return true;
    });
  }, [batches, batchSearch, batchFilter]);

  // Expiry counts for top alert banner
  const expiredCount = batches.filter(b => b.daysUntilExpiry <= 0).length;
  const criticalCount = batches.filter(b => b.daysUntilExpiry > 0 && b.daysUntilExpiry <= 30).length;
  const nearExpiryCount = batches.filter(b => b.daysUntilExpiry > 30 && b.daysUntilExpiry <= 90).length;
  const lowStockCount = medicines.filter(m => (m.stock_quantity || 0) <= (m.reorder_level || 20)).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-2.5 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">

      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── 1. Top Header & Pharmacy Overview ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl text-white shadow-md shadow-cyan-600/20">
              <Pill className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {language === 'am' ? 'የመድኃኒት ቤትና ማከፋፈያ ማዕከል' : 'Pharmacy & Clinical Dispensing Suite'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alem Ketema Enat Hospital • FEFO Stock Rotation • EFMHACA Controlled Drugs Register
              </p>
            </div>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'የታካሚ QR ስካን' : 'Scan Patient QR'}</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'ቀጥታ ሽያጭ (POS)' : 'New Walk-in Sale'}</span>
          </button>

          <button
            onClick={() => setShowReceiveModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'ባች ተቀበል' : 'Receive Batch'}</span>
          </button>

          <button
            onClick={() => {
              setEditingMed(null);
              setMedForm({
                name: '', generic_name: '', category: 'Antibiotics', unit: 'tablets',
                unit_price: '25.00', reorder_level: '20', is_controlled: false,
                is_prescription_required: true, manufacturer: '', storage_conditions: 'Store below 25°C', description: ''
              });
              setShowAddMedModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'መድኃኒት ጨምር' : 'Add Medication'}</span>
          </button>

          <button
            onClick={() => {
              fetchPrescriptions();
              fetchBatches();
              fetchMedicines();
              fetchSales();
              fetchControlledSubstances();
              fetchAlerts();
            }}
            className="p-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh All Pharmacy Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. Top KPI Metric Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Metric 1: Pending Prescriptions */}
        <div
          onClick={() => { setActiveTab('prescriptions'); setRxFilter('pending'); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-cyan-400 transition flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {prescriptions.filter(p => !p.is_dispensed).length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Pending Prescriptions</div>
          </div>
        </div>

        {/* Metric 2: Today's Dispensed */}
        <div
          onClick={() => { setActiveTab('prescriptions'); setRxFilter('dispensed'); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-400 transition flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {prescriptions.filter(p => p.is_dispensed).length}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Dispensed Today</div>
          </div>
        </div>

        {/* Metric 3: OTC Sales Revenue */}
        <div
          onClick={() => setActiveTab('pos')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-blue-400 transition flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {todaySalesSummary.todayRevenueETB.toFixed(0)} <span className="text-xs font-normal text-slate-400">ETB</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Walk-In Sales ({todaySalesSummary.todaySalesCount})</div>
          </div>
        </div>

        {/* Metric 4: Expiry Warnings */}
        <div
          onClick={() => { setActiveTab('batches'); setBatchFilter('expired'); }}
          className={`p-3.5 rounded-2xl border shadow-sm cursor-pointer transition flex items-center space-x-3 ${
            expiredCount > 0
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {expiredCount + criticalCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {expiredCount > 0 ? `${expiredCount} Expired Batches` : 'Critical Batches'}
            </div>
          </div>
        </div>

        {/* Metric 5: Low Stock Items */}
        <div
          onClick={() => setActiveTab('catalog')}
          className="col-span-2 sm:col-span-4 lg:col-span-1 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:border-cyan-400 transition flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {lowStockCount}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Low Stock Items</div>
          </div>
        </div>
      </div>

      {/* ── Expiry Safeguard Alert Banner ─────────────────────────────── */}
      {(expiredCount > 0 || criticalCount > 0 || nearExpiryCount > 0) && (
        <div className="p-4 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 border border-red-300 dark:border-red-900/60 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-900 dark:text-red-200 uppercase tracking-wider">
                Clinical Expiry & Shelf-Life Safety Safeguard
              </h4>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">
                {expiredCount > 0 && <span className="font-extrabold underline">{expiredCount} EXPIRED batches</span>}
                {expiredCount > 0 && criticalCount > 0 && ' • '}
                {criticalCount > 0 && <span className="font-bold">{criticalCount} critical batches (≤30 days remaining)</span>}
                {(expiredCount > 0 || criticalCount > 0) && nearExpiryCount > 0 && ' • '}
                {nearExpiryCount > 0 && <span>{nearExpiryCount} batches within 90 days</span>}
                {' '}— Expired medications are strictly blocked from patient dispensation.
              </p>
            </div>
          </div>

          <button
            onClick={() => { setActiveTab('batches'); setBatchFilter('expired'); }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            Review Expired Batches
          </button>
        </div>
      )}

      {/* ── 3. Tab Navigation Bar (7 Specialized Modules) ─────────────── */}
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'prescriptions', label: language === 'am' ? 'የሀኪም ማዘዣዎች' : 'Prescription Queue', icon: FileText, badge: prescriptions.filter(p => !p.is_dispensed).length },
          { id: 'pos', label: language === 'am' ? 'የቀጥታ ሽያጭ (POS)' : 'Walk-In POS Sales', icon: ShoppingCart, badge: cart.length > 0 ? `${cart.length} in cart` : null },
          { id: 'catalog', label: language === 'am' ? 'የመድኃኒቶች ዝርዝር' : 'Medication Catalog', icon: Pill, badge: medicines.length },
          { id: 'batches', label: language === 'am' ? 'የባች እና FEFO ቁጥጥር' : 'FEFO Batches & Expiry', icon: Boxes, badge: batches.length },
          { id: 'controlled', label: language === 'am' ? 'ቁጥጥር የሚደረግባቸው መድኃኒቶች' : 'Narcotics Register', icon: Lock, badge: safeInventory.length },
          { id: 'alerts', label: language === 'am' ? 'የደህንነት ማስጠንቀቂያዎች' : 'Safety Alerts', icon: ShieldAlert, badge: inventoryAlerts.filter(a => !a.is_acknowledged).length || null },
          { id: 'analytics', label: language === 'am' ? 'ትንታኔ እና ሪፖርቶች' : 'Reports & Counters', icon: Building, badge: null }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-4 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border-b-2 border-cyan-600'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: PRESCRIPTIONS & DISPENSING QUEUE ─────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={rxSearch}
                onChange={e => setRxSearch(e.target.value)}
                placeholder="Search patient, medication name, or prescribing doctor..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              {(['pending', 'dispensed', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setRxFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                    rxFilter === f
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f === 'pending' ? 'Pending Dispensation' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Prescriptions List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {filteredRx.length === 0 ? (
              <div className="p-12 text-center">
                <Pill className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">No prescriptions found</h4>
                <p className="text-xs text-slate-400 mt-1">Doctor orders from OPD consultations will appear here automatically.</p>
              </div>
            ) : (
              filteredRx.map(rx => (
                <div key={rx.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-2xl ${
                      rx.is_dispensed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-300'
                    }`}>
                      <Pill className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                          {rx.medication_name}
                        </span>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                          rx.is_dispensed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {rx.is_dispensed ? '✓ Dispensed' : '⏳ Pending'}
                        </span>
                        {rx.payment_status === 'UNPAID' && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
                            Cashier Payment Required
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        Patient: <span className="font-bold text-slate-900 dark:text-white">{rx.patient_name}</span>
                        {' • '} Prescriber: Dr. {rx.doctor_name}
                        {rx.prescribed_date && (
                          <span className="text-slate-400"> • {new Date(rx.prescribed_date).toLocaleDateString('en-GB')}</span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400">{rx.dosage}</span> · {rx.frequency} · {rx.duration}
                        {rx.instructions && (
                          <span className="ml-1 text-slate-700 dark:text-slate-200">
                            · "{rx.instructions}"
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center space-x-2 self-start md:self-center">
                    {/* Safety Check Button */}
                    <button
                      onClick={() => handleRunSafetyCheck(rx)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                      title="Run drug allergy & interaction safety check"
                    >
                      <Shield className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Safety</span>
                    </button>

                    {/* Print Label Button */}
                    <button
                      onClick={() => handleOpenPrintLabel(rx.id)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center space-x-1"
                      title="Print patient medication label sticker"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-500" />
                      <span>Label</span>
                    </button>

                    {/* Dispense via FEFO Button */}
                    {!rx.is_dispensed && rx.payment_status !== 'UNPAID' && (
                      <button
                        onClick={() => handleDispenseFEFO(rx)}
                        disabled={dispensingRxId === rx.id}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>{dispensingRxId === rx.id ? 'Allocating...' : 'Dispense FEFO'}</span>
                      </button>
                    )}

                    {!rx.is_dispensed && rx.payment_status === 'UNPAID' && (
                      <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-medium cursor-not-allowed">
                        Payment Pending
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: POINT OF SALE (POS) & WALK-IN OTC DISPENSING ─────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Panel: Medication Catalog Quick Picker */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <Pill className="w-4 h-4 text-cyan-600" />
                  <span>Select Medicines for Walk-in Patient</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {posFilteredMedicines.length} Available
                </span>
              </div>

              {/* Search & Category Pills */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={posCatalogSearch}
                    onChange={e => setPosCatalogSearch(e.target.value)}
                    placeholder="Search medicines by brand or generic name..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                  {['All', 'Antibiotics', 'Analgesic', 'Antihypertensive', 'Antimalarial', 'Vitamins', 'IV Fluids'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setPosCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg font-semibold transition whitespace-nowrap ${
                        posCategoryFilter === cat
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Medicines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {posFilteredMedicines.map(med => (
                  <div
                    key={med.id}
                    onClick={() => addToCart(med)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-cyan-500 cursor-pointer transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {med.name}
                        </span>
                        {med.is_controlled && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Rx Only
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {med.generic_name || med.category}
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                        {med.unit_price} ETB
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        + Add to cart
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Sales History */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <span>Recent Walk-in POS Sales</span>
                </h4>
                <button
                  onClick={fetchSales}
                  className="text-xs text-cyan-600 hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="pb-2">Receipt #</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Payment</th>
                      <th className="pb-2 text-right">Amount</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentSales.slice(0, 5).map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                          {sale.sale_receipt_number}
                        </td>
                        <td className="py-2.5 text-slate-700 dark:text-slate-300">
                          {sale.customer_name}
                        </td>
                        <td className="py-2.5">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {parseFloat(String(sale.final_amount)).toFixed(2)} ETB
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => setSelectedReceipt(sale)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Cart & Checkout */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Walk-in Dispensing Cart
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-rose-500 hover:underline flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Your cart is currently empty. Click any medicine on the left to add items.
                  </div>
                ) : (
                  cart.map(item => (
                    <div
                      key={item.medicine.id}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex-1 pr-2 truncate">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.medicine.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.medicine.unit_price} ETB each
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQty(item.medicine.id, -1)}
                          className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.medicine.id, 1)}
                          className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right pl-3 font-mono font-bold text-xs text-slate-900 dark:text-white min-w-[60px]">
                        {(item.medicine.unit_price * item.quantity).toFixed(2)} ETB
                      </div>

                      <button
                        onClick={() => removeFromCart(item.medicine.id)}
                        className="text-slate-400 hover:text-rose-500 pl-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Customer & Checkout Form */}
            <form onSubmit={handleCheckoutSale} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Almaz Kebede"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="09..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dispensing Station
                  </label>
                  <select
                    value={posCounter}
                    onChange={e => setPosCounter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Pharmacy 1">Pharmacy Counter 1</option>
                    <option value="Pharmacy 2">Pharmacy Counter 2</option>
                    <option value="Pharmacy 3">Pharmacy Counter 3</option>
                    <option value="Pharmacy 4">Pharmacy Counter 4</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  {[
                    { id: 'telebirr', label: 'Telebirr' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'cbe_birr', label: 'CBE Birr' }
                  ].map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-1.5 rounded-lg font-bold border transition ${
                        paymentMethod === m.id
                          ? 'bg-cyan-50 dark:bg-cyan-950 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totals & Submit */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-bold text-slate-600 dark:text-slate-400">Total Payable:</span>
                  <span className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                    {cartTotal.toFixed(2)} ETB
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submittingSale || cart.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{submittingSale ? 'Processing...' : 'Complete Sale & Issue Receipt'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: MEDICATION CATALOG & FORMULARY ───────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search medication catalog by brand or generic..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={catalogCategory}
                onChange={e => setCatalogCategory(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
              >
                <option value="All">All Categories</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesic">Analgesic / Pain</option>
                <option value="Antihypertensive">Antihypertensive</option>
                <option value="Antimalarial">Antimalarial</option>
                <option value="Narcotic Analgesic">Narcotic Controlled</option>
                <option value="IV Fluids">IV Fluids</option>
              </select>

              <button
                onClick={() => {
                  setEditingMed(null);
                  setShowAddMedModal(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>
            </div>
          </div>

          {/* Medicines Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Medication Name</th>
                    <th className="py-3 px-4">Generic Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Safety Level</th>
                    <th className="py-3 px-4">Controls</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMedicines.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {m.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {m.generic_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {m.unit_price} ETB
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (m.stock_quantity || 0) <= 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : (m.stock_quantity || 0) <= (m.reorder_level || 20)
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {(m.stock_quantity || 0) <= 0 ? 'Out of Stock' : (m.stock_quantity || 0) <= (m.reorder_level || 20) ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {m.is_controlled ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-200">
                            Controlled Drug
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Regular</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => {
                            setEditingMed(m);
                            setMedForm({
                              name: m.name,
                              generic_name: m.generic_name || '',
                              category: m.category || 'Antibiotics',
                              unit: m.unit || 'tablets',
                              unit_price: String(m.unit_price),
                              reorder_level: String(m.reorder_level || 20),
                              is_controlled: !!m.is_controlled,
                              is_prescription_required: !!m.is_prescription_required,
                              manufacturer: m.manufacturer || '',
                              storage_conditions: 'Store below 25°C',
                              description: m.description || ''
                            });
                            setShowAddMedModal(true);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setReceiveForm(prev => ({ ...prev, medication_id: String(m.id) }));
                            setShowReceiveModal(true);
                          }}
                          className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300 rounded font-bold"
                        >
                          + Batch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 4: FEFO MEDICATION BATCHES & EXPIRY TRACKER ─────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={batchSearch}
                onChange={e => setBatchSearch(e.target.value)}
                placeholder="Search batch number, drug name, or shelf location..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    batchFilter === f.id
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Medication</th>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Available Qty</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Shelf-Life Status</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBatches.map(batch => {
                    const isExpired = batch.daysUntilExpiry <= 0;
                    const isCritical = batch.daysUntilExpiry > 0 && batch.daysUntilExpiry <= 30;
                    const isNear = batch.daysUntilExpiry > 30 && batch.daysUntilExpiry <= 90;

                    let badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                    let label = 'VALID STOCK';
                    if (batch.quantity_available <= 0) {
                      badgeClass = 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
                      label = 'DEPLETED';
                    } else if (isExpired) {
                      badgeClass = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300';
                      label = 'BLOCKED (EXPIRED)';
                    } else if (isCritical) {
                      badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300';
                      label = `CRITICAL (${batch.daysUntilExpiry}d left)`;
                    } else if (isNear) {
                      badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                      label = `NEAR EXPIRY (${batch.daysUntilExpiry}d)`;
                    }

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {batch.medication_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {batch.batch_number}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                            {batch.quantity_available}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">units</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(batch.expiry_date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {batch.storage_location || 'Main Pharmacy'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setShowAdjustModal(batch)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded text-xs font-semibold text-slate-700 dark:text-slate-300"
                          >
                            Adjust / Quarantine
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 5: NARCOTICS & CONTROLLED SUBSTANCES REGISTER ────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'controlled' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Lock className="w-5 h-5 text-rose-600" />
                <span>Ministry of Health (MoH) Controlled Drugs & Narcotics Safe Register</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Double-witnessed audit trail for schedule II & III controlled pharmaceuticals
              </p>
            </div>

            <button
              onClick={() => setShowControlledModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Administration</span>
            </button>
          </div>

          {/* Safe Stock Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {safeInventory.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-[11px] text-slate-400 font-bold uppercase truncate">{item.name}</div>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono mt-1">
                  {item.safe_balance} <span className="text-xs font-normal text-slate-400">{item.unit || 'units'}</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Safe Verified</div>
              </div>
            ))}
          </div>

          {/* Controlled Log Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Log #</th>
                    <th className="py-3 px-4">Medication & Batch</th>
                    <th className="py-3 px-4">Patient (MRN)</th>
                    <th className="py-3 px-4">Prescriber</th>
                    <th className="py-3 px-4 text-center">Dispensed</th>
                    <th className="py-3 px-4 text-center">Safe Balance</th>
                    <th className="py-3 px-4">Witness Staff</th>
                    <th className="py-3 px-4 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {controlledLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-rose-600 dark:text-rose-400">
                        {log.log_number}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{log.medication_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Lot: {log.batch_number}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{log.patient_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.patient_mrn}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-300">{log.doctor_name}</div>
                        <div className="text-[10px] text-slate-400">{log.doctor_license_number}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600">
                        {log.quantity_dispensed} {log.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {log.balance_remaining}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{log.witness_name}</div>
                        <div className="text-[10px] text-slate-400">{log.witness_role}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-mono">
                        {new Date(log.dispensed_at).toLocaleString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 6: SAFETY & CLINICAL INVENTORY ALERTS ───────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Automated Pharmacy Inventory & Safety Audit</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time evaluation of expiry dates, FEFO compliance, and clinical safety thresholds
              </p>
            </div>

            <button
              onClick={handleEvaluateAlerts}
              disabled={evaluatingAlerts}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${evaluatingAlerts ? 'animate-spin' : ''}`} />
              <span>{evaluatingAlerts ? 'Auditing...' : 'Run Stock & Expiry Audit'}</span>
            </button>
          </div>

          <div className="space-y-3">
            {inventoryAlerts.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">All Inventory Safe & Compliant</h4>
                <p className="text-xs text-slate-400 mt-1">No active stockouts, expired batches, or safety alerts detected.</p>
              </div>
            ) : (
              inventoryAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border-2 transition flex items-start justify-between flex-wrap gap-4 ${
                    alert.severity === 'critical'
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                      : 'border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-[280px]">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        alert.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {alert.severity}
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
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                        <span className="font-bold text-violet-600 dark:text-violet-400">Suggested Action:</span> {alert.suggested_action}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {!alert.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {alert.batch_id && (alert.alert_type === 'expired' || alert.alert_type === 'near_expiry') && (
                      <button
                        onClick={() => handleQuarantineBatch(alert.batch_id, alert.batch_number || `ID ${alert.batch_id}`)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Quarantine</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── TAB 7: REPORTS & SMART COUNTER DISPENSING ───────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-600" />
              <span>Smart Queue Dispensing Stations</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live linkage to hospital smart queue counters (Pharmacy 1 through 4)
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Pharmacy 1', type: 'Dispensing Desk A', token: 'P-032', status: 'Serving' },
                { name: 'Pharmacy 2', type: 'Dispensing Desk B', token: 'P-033', status: 'Serving' },
                { name: 'Pharmacy 3', type: 'Consultation & Review', token: '—', status: 'Idle' },
                { name: 'Pharmacy 4', type: 'Fast-Track / Discharge', token: 'P-034', status: 'Serving' }
              ].map(ctr => (
                <div key={ctr.name} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{ctr.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ctr.status === 'Serving' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {ctr.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{ctr.type}</div>
                  <div className="font-mono font-extrabold text-lg text-cyan-600 dark:text-cyan-400 mt-2">
                    {ctr.token}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Clinical Pharmacy Quality Indicators</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-600 dark:text-slate-300">FEFO First-Expired-First-Out Adherence:</span>
                <span className="font-bold text-emerald-600">100% Guaranteed</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-600 dark:text-slate-300">Prescription Verification Rate:</span>
                <span className="font-bold text-cyan-600">100% Doctor Signed</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-600 dark:text-slate-300">Controlled Substance Witness Compliance:</span>
                <span className="font-bold text-rose-600">100% MoH Compliant</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <span className="text-slate-600 dark:text-slate-300">Daily Inventory Turnover Index:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">High Circulation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: PRINTABLE PRESCRIPTION LABEL STICKER ─────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {labelModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Printer className="w-5 h-5 text-cyan-600" />
                <span>Prescription Dispensing Label</span>
              </h3>
              <button
                onClick={() => setLabelModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Label Card */}
            <div ref={printAreaRef} className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-2xl bg-white text-slate-900 text-xs space-y-2">
              <div className="text-center border-b pb-2">
                <h4 className="font-black text-sm uppercase tracking-wider">{labelModalData.hospitalName}</h4>
                <p className="text-[10px] text-slate-600">{labelModalData.pharmacyName}</p>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>{labelModalData.prescriptionNumber}</span>
                  <span>{labelModalData.date}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Patient:</span>
                <div className="font-bold text-sm">{labelModalData.patientName}</div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-black text-sm text-cyan-900">{labelModalData.medicationName}</div>
                <div className="font-bold text-xs mt-0.5">{labelModalData.dosage} · {labelModalData.frequency} · {labelModalData.duration}</div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Directions / መመሪያ:</span>
                <div className="font-semibold text-xs text-slate-800">{labelModalData.instructions}</div>
                <div className="font-bold text-xs text-emerald-800 mt-0.5">{labelModalData.instructionsAmharic}</div>
              </div>

              <div className="text-[10px] text-slate-500 italic pt-1 border-t">
                {labelModalData.precautions}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-slate-400">
                <span>Prescriber: {labelModalData.doctorName}</span>
                <span>Dispenser: {labelModalData.dispensedBy}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker Label</span>
              </button>
              <button
                onClick={() => setLabelModalData(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: PRINTABLE POS SALES RECEIPT ───────────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Pharmacy Cash Receipt</span>
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div className="border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-white text-slate-900 text-xs font-mono space-y-2">
              <div className="text-center border-b pb-2">
                <h4 className="font-black text-xs uppercase">Alem Ketema Enat Hospital</h4>
                <p className="text-[10px] text-slate-500">Outpatient Pharmacy & POS</p>
                <p className="text-[10px] text-slate-400 mt-1">Tel: +251 11 681 2044</p>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span className="font-bold">Receipt: {selectedReceipt.sale_receipt_number}</span>
                <span>{new Date(selectedReceipt.created_at || Date.now()).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="text-[11px]">
                Customer: <span className="font-bold">{selectedReceipt.customer_name}</span>
              </div>

              <div className="border-t border-b py-2 space-y-1">
                {selectedReceipt.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">{item.medication_name} x{item.quantity}</span>
                    <span className="font-bold">{parseFloat(item.total_price || 0).toFixed(2)} ETB</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-extrabold pt-1">
                <span>TOTAL:</span>
                <span>{parseFloat(String(selectedReceipt.final_amount)).toFixed(2)} ETB</span>
              </div>
              <div className="text-[10px] text-slate-500 text-center uppercase">
                Payment: {selectedReceipt.payment_method} · Status: PAID
              </div>
              <div className="text-center text-[10px] text-slate-400 pt-2 border-t">
                Thank you for choosing Alem Ketema Enat Hospital.
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 text-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: CLINICAL SAFETY & ALLERGY WARNING ────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {safetyCheckResult && safetyCheckTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                <Shield className="w-5 h-5 text-cyan-600" />
                <span>Clinical Safety & Allergy Check</span>
              </h3>
              <button
                onClick={() => { setSafetyCheckResult(null); setSafetyCheckTarget(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>Patient: <span className="font-bold text-slate-900 dark:text-white">{safetyCheckTarget.patient_name}</span></div>
                <div>Medication: <span className="font-bold text-cyan-600 dark:text-cyan-400">{safetyCheckTarget.medication_name}</span></div>
              </div>

              {safetyCheckResult.safe ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center space-x-3 text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="font-bold">No Contraindications Detected</h5>
                    <p className="text-[11px] mt-0.5">Patient has no recorded allergies to this drug class and no dangerous concurrent interactions.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {safetyCheckResult.warnings.map((w: any, idx: number) => (
                    <div key={idx} className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200">
                      <div className="font-bold flex items-center space-x-1.5 uppercase text-[11px]">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>{w.type === 'allergy' ? 'Documented Patient Allergy' : 'Drug Interaction'}</span>
                      </div>
                      <p className="text-xs mt-1">{w.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setSafetyCheckResult(null); setSafetyCheckTarget(null); }}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs"
              >
                Close Safety Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: ADD / EDIT MEDICATION ────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                {editingMed ? 'Edit Medication Formulary' : 'Add Medication to Formulary'}
              </h3>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedication} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Medication Name (Brand / Common) *</label>
                <input
                  required
                  value={medForm.name}
                  onChange={e => setMedForm({ ...medForm, name: e.target.value })}
                  placeholder="e.g. Amoxicillin 500mg Capsules"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Generic Name</label>
                  <input
                    value={medForm.generic_name}
                    onChange={e => setMedForm({ ...medForm, generic_name: e.target.value })}
                    placeholder="e.g. Amoxicillin Trihydrate"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={medForm.category}
                    onChange={e => setMedForm({ ...medForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  >
                    <option value="Antibiotics">Antibiotics</option>
                    <option value="Analgesic">Analgesic / Pain</option>
                    <option value="Antihypertensive">Antihypertensive</option>
                    <option value="Antimalarial">Antimalarial</option>
                    <option value="Antidiabetic">Antidiabetic</option>
                    <option value="Sedative / Anxiolytic">Sedative / Anxiolytic</option>
                    <option value="Narcotic Analgesic">Narcotic Controlled</option>
                    <option value="IV Fluids">IV Fluids</option>
                    <option value="Vitamins">Vitamins</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Price (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={medForm.unit_price}
                    onChange={e => setMedForm({ ...medForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dispense Unit</label>
                  <input
                    value={medForm.unit}
                    onChange={e => setMedForm({ ...medForm, unit: e.target.value })}
                    placeholder="tablets, vial, bottle"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={medForm.reorder_level}
                    onChange={e => setMedForm({ ...medForm, reorder_level: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medForm.is_controlled}
                    onChange={e => setMedForm({ ...medForm, is_controlled: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span className="font-bold text-rose-600 dark:text-rose-400">Narcotic / Controlled Drug</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medForm.is_prescription_required}
                    onChange={e => setMedForm({ ...medForm, is_prescription_required: e.target.checked })}
                    className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Prescription Required</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md"
                >
                  {editingMed ? 'Update Medication' : 'Save New Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: RECEIVE NEW BATCH ─────────────────────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Receive New Medication Batch (FEFO Rotation)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter batch credentials to register into automated First-Expired-First-Out dispensing
            </p>

            <form onSubmit={handleReceiveBatch} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Medication *</label>
                <select
                  required
                  value={receiveForm.medication_id}
                  onChange={e => setReceiveForm({ ...receiveForm, medication_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- Choose Medication Formulary Item --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.generic_name || 'Generic'}) — {m.unit_price} ETB
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Batch / Lot Number *</label>
                  <input
                    required
                    value={receiveForm.batch_number}
                    onChange={e => setReceiveForm({ ...receiveForm, batch_number: e.target.value })}
                    placeholder="e.g. BATCH-2026-X1"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receiveForm.quantity}
                    onChange={e => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry Date * (Must be in future)</label>
                <input
                  type="date"
                  required
                  value={receiveForm.expiry_date}
                  onChange={e => setReceiveForm({ ...receiveForm, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Supplier Name</label>
                  <input
                    value={receiveForm.supplier_name}
                    onChange={e => setReceiveForm({ ...receiveForm, supplier_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Storage Shelf Location</label>
                  <input
                    value={receiveForm.storage_location}
                    onChange={e => setReceiveForm({ ...receiveForm, storage_location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md"
                >
                  Record Batch Reception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: STOCK ADJUSTMENT & QUARANTINE ─────────────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Stock Adjustment / Quarantine
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Batch: <span className="font-bold text-slate-800 dark:text-slate-200">{showAdjustModal.batch_number}</span> ({showAdjustModal.medication_name})
            </p>

            <form onSubmit={handleStockAdjustment} className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex justify-between font-mono">
                <span className="text-slate-500">Available Stock:</span>
                <span className="font-black text-slate-900 dark:text-white">{showAdjustModal.quantity_available} units</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Adjustment Type *</label>
                <select
                  value={adjustForm.movement_type}
                  onChange={e => setAdjustForm({ ...adjustForm, movement_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="damaged">Damaged Stock (Deduct)</option>
                  <option value="expired">Expired Stock Disposal (Deduct & Quarantine)</option>
                  <option value="quarantined">Safety Recall Quarantine (Hold)</option>
                  <option value="returned">Supplier Return</option>
                  <option value="adjusted">Physical Count Correction (+ or -)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity Change (+ or -) *</label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantity_change}
                  onChange={e => setAdjustForm({ ...adjustForm, quantity_change: e.target.value })}
                  placeholder="-5 or +10"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mandatory Authorized Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={adjustForm.reason}
                  onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. Expired shelf-life disposal witnessed by Chief Pharmacist"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(null)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                >
                  Authorize Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────── */}
      {/* ── MODAL: LOG CONTROLLED SUBSTANCE DISPENSATION ─────────────── */}
      {/* ────────────────────────────────────────────────────────────── */}
      {showControlledModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Lock className="w-5 h-5 text-rose-600" />
              <span>Log Controlled Drug Administration</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Requires dual clinical sign-off per Ethiopian Federal Ministry of Health regulations
            </p>

            <form onSubmit={handleSaveControlledDrug} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Controlled Medication *</label>
                <select
                  required
                  value={controlledForm.medication_id}
                  onChange={e => setControlledForm({ ...controlledForm, medication_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                >
                  <option value="">-- Choose Schedule II/III Drug --</option>
                  {medicines.filter(m => m.is_controlled).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.generic_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Patient Full Name *</label>
                  <input
                    required
                    value={controlledForm.patient_name}
                    onChange={e => setControlledForm({ ...controlledForm, patient_name: e.target.value })}
                    placeholder="e.g. Abebe Bikila"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Patient MRN / ID</label>
                  <input
                    value={controlledForm.patient_mrn}
                    onChange={e => setControlledForm({ ...controlledForm, patient_mrn: e.target.value })}
                    placeholder="AKEH-0042"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescribing Doctor *</label>
                  <input
                    required
                    value={controlledForm.doctor_name}
                    onChange={e => setControlledForm({ ...controlledForm, doctor_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Doctor License Number</label>
                  <input
                    value={controlledForm.doctor_license_number}
                    onChange={e => setControlledForm({ ...controlledForm, doctor_license_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity Dispensed *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={controlledForm.quantity_dispensed}
                    onChange={e => setControlledForm({ ...controlledForm, quantity_dispensed: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                  <input
                    value={controlledForm.unit}
                    onChange={e => setControlledForm({ ...controlledForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Witness Clinical Staff *</label>
                  <input
                    required
                    value={controlledForm.witness_name}
                    onChange={e => setControlledForm({ ...controlledForm, witness_name: e.target.value })}
                    placeholder="Sr. Bethlehem Yilma"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Witness Role</label>
                  <input
                    value={controlledForm.witness_role}
                    onChange={e => setControlledForm({ ...controlledForm, witness_role: e.target.value })}
                    placeholder="ICU / Recovery Nurse"
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Clinical Indication *</label>
                <input
                  required
                  value={controlledForm.indication}
                  onChange={e => setControlledForm({ ...controlledForm, indication: e.target.value })}
                  placeholder="Post-operative severe trauma analgesia"
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowControlledModal(false)}
                  className="px-4 py-2 border rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                >
                  Record Controlled Substance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Pharmacy Patient QR Scanner Modal ── */}
      {showScannerModal && (
        <WristbandScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onPatientVerified={handlePatientScanVerified}
          continueLabel="Open Patient Prescriptions"
        />
      )}
    </div>
  );
};

export default PharmacyDashboard;
