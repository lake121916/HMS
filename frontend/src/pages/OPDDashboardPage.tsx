/**
 * OPD Central Command Dashboard & Unified Patient Journey Hub
 * Alem Ketema Enat Hospital Management System
 *
 * Central command hub orchestrating the 6 distinct outpatient hospital workstations:
 * RECEPTION -> TRIAGE -> COORDINATOR -> CONSULTATION -> LAB/PHARMACY -> CASHIER
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, UserCheck, Stethoscope, Activity, ClipboardCheck,
  AlertTriangle, Clock, RefreshCw,
  Plus, Search, ArrowRight, Radio, Tv, CheckCircle2,
  Building2, TrendingUp, ShieldAlert, ArrowUpRight, Share2,
  X
} from 'lucide-react';

interface OPDMetrics {
  kpis: {
    totalPatientsToday: number;
    waitingPatients: number;
    inTriage: number;
    inCoordinator: number;
    waitingForDoctors: number;
    inConsultation: number;
    completedConsultations: number;
    cancelledVisits: number;
    emergencyReferrals: number;
    availableDoctors: number;
    totalDoctors: number;
    avgWaitTime: number;
    avgConsultationTime: number;
  };
  workstationQueues: {
    reception: number;
    triage: number;
    coordinator: number;
    consultation: number;
    laboratory: number;
    pharmacy: number;
    cashier: number;
  };
  hourlyInflow: Array<{ time: string; patients: number; waitTime: number }>;
  deptBreakdown: Array<{ name: string; count: number; color: string }>;
  doctorRoster: Array<{
    id: number;
    name: string;
    specialty: string;
    department: string;
    isAvailable: boolean;
    status: 'Available' | 'In Consultation' | 'Off-Duty' | string;
    activeConsultations: number;
    waitingQueue: number;
  }>;
  serverTime: string;
}

interface PatientTrackerItem {
  queue_id: number;
  queue_token: string;
  token_number: number;
  priority: 'emergency' | 'urgent' | 'normal' | 'routine' | string;
  queue_status: string;
  consultation_room: string;
  service_category?: string;
  patient_id: number;
  patientMrn: string;
  first_name: string;
  last_name: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  encounter_id?: number;
  encounter_number?: string;
  department_name?: string;
  doctor_id?: number;
  doctor_name?: string;
  currentStage: 'RECEPTION' | 'TRIAGE' | 'COORDINATOR' | 'WAITING_FOR_DOCTOR' | 'CONSULTATION' | 'LAB_PHARMACY' | 'BILLING' | 'COMPLETED';
  elapsedMinutes: number;
}

export const OPDDashboardPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<OPDMetrics | null>(null);
  const [tracker, setTracker] = useState<PatientTrackerItem[]>([]);
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Modals
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    patient_id: '',
    department_id: '1',
    priority: 'normal',
    consultation_room: 'Room 1'
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  // Duplicate check modal
  const [dupCheckOpen, setDupCheckOpen] = useState(false);
  const [dupForm, setDupForm] = useState({ phone: '', firstName: '', lastName: '', dateOfBirth: '' });
  const [dupResults, setDupResults] = useState<any[]>([]);
  const [dupLoading, setDupLoading] = useState(false);

  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferItem, setTransferItem] = useState<PatientTrackerItem | null>(null);
  const [transferDept, setTransferDept] = useState('');
  const [transferRoom, setTransferRoom] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Referral modal
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [referralForm, setReferralForm] = useState({
    patient_id: '',
    referral_type: 'internal',
    urgency: 'routine',
    receiving_department_id: '',
    receiving_facility: '',
    specialty: '',
    reason: '',
    clinical_summary: ''
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString(language === 'am' ? 'am-ET' : 'en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [language]);

  // Load initial data
  const fetchData = async () => {
    try {
      const [mRes, tRes, dRes] = await Promise.all([
        api.get('/opd/dashboard-metrics'),
        api.get('/opd/live-tracker'),
        api.get('/departments').catch(() => ({ data: { data: { departments: [] } } }))
      ]);

      if (mRes.data?.success) setMetrics(mRes.data.data);
      if (tRes.data?.success) setTracker(tRes.data.data.tracker || []);
      const depts = dRes.data?.data?.departments || dRes.data?.departments || [];
      setDepartments(depts);
    } catch (err: any) {
      console.error('Failed to load OPD dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, 15000);
    return () => clearInterval(poll);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Fast Check-In / Issue Token
  const handleIssueToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.patient_id) {
      showToast(language === 'am' ? 'እባክዎ የታካሚ መታወቂያ ያስገቡ' : 'Please provide patient ID', 'error');
      return;
    }
    setTicketSubmitting(true);
    try {
      const res = await api.post('/opd', {
        patient_id: parseInt(ticketForm.patient_id, 10),
        department_id: parseInt(ticketForm.department_id, 10),
        priority: ticketForm.priority,
        consultation_room: ticketForm.consultation_room
      });

      if (res.data?.success) {
        showToast(language === 'am' ? `የተራ ቁጥር ${res.data.data.queue.queue_token} በተሳካ ሁኔታ ተሰጥቷል` : `Queue token ${res.data.data.queue.queue_token} generated`);
        setTicketModalOpen(false);
        setTicketForm({ patient_id: '', department_id: '1', priority: 'normal', consultation_room: 'Room 1' });
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to issue token', 'error');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Duplicate check
  const handleDuplicateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDupLoading(true);
    try {
      const res = await api.post('/patients/check-duplicate', {
        phone: dupForm.phone,
        first_name: dupForm.firstName,
        last_name: dupForm.lastName,
        date_of_birth: dupForm.dateOfBirth
      });
      if (res.data?.success) {
        setDupResults(res.data.data.duplicates || []);
      }
    } catch (err: any) {
      showToast('Error checking duplicates', 'error');
    } finally {
      setDupLoading(false);
    }
  };

  // Transfer patient
  const handleExecuteTransfer = async () => {
    if (!transferItem) return;
    try {
      const res = await api.post('/opd/transfer', {
        queue_id: transferItem.queue_id,
        new_department_id: transferDept ? parseInt(transferDept, 10) : undefined,
        new_room: transferRoom || undefined,
        reason: transferReason
      });
      if (res.data?.success) {
        showToast(language === 'am' ? 'ታካሚው በተሳካ ሁኔታ ተላልፏል' : 'Patient transferred successfully');
        setTransferModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Transfer failed', 'error');
    }
  };

  // Call / Recall / Skip
  const handleCallPatient = async (item: PatientTrackerItem) => {
    try {
      const res = await api.post(`/opd/${item.queue_id}/call`, {
        consultation_room: item.consultation_room || 'Room 1'
      });
      if (res.data?.success) {
        showToast(language === 'am' ? `ተራ ቁጥር ${item.queue_token} ተጠርቷል` : `Token ${item.queue_token} called`);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Call failed', 'error');
    }
  };

  const handleSkipPatient = async (item: PatientTrackerItem) => {
    try {
      const res = await api.post(`/opd/${item.queue_id}/skip`);
      if (res.data?.success) {
        showToast(`Token ${item.queue_token} skipped`);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Skip failed', 'error');
    }
  };

  // Create Referral
  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/referrals', referralForm);
      if (res.data?.success) {
        showToast(language === 'am' ? 'ሪፈራል በተሳካ ሁኔታ ተመዝግቧል' : 'Referral submitted successfully');
        setReferralModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Referral submission failed', 'error');
    }
  };

  // Filtered tracker
  const filteredTracker = useMemo(() => {
    return tracker.filter(item => {
      const matchesStage = stageFilter === 'ALL' || item.currentStage === stageFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        item.first_name.toLowerCase().includes(q) ||
        item.last_name.toLowerCase().includes(q) ||
        item.queue_token.toLowerCase().includes(q) ||
        item.patientMrn.toLowerCase().includes(q) ||
        (item.phone && item.phone.includes(q));
      return matchesStage && matchesSearch;
    });
  }, [tracker, stageFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          {language === 'am' ? 'የኦፒዲ ማዕከላዊ ዳሽቦርድ እየተጫነ ነው...' : 'Loading Outpatient Department Command Center...'}
        </p>
      </div>
    );
  }

  const kpis = metrics?.kpis || {
    totalPatientsToday: 0,
    waitingPatients: 0,
    inTriage: 0,
    inCoordinator: 0,
    waitingForDoctors: 0,
    inConsultation: 0,
    completedConsultations: 0,
    cancelledVisits: 0,
    emergencyReferrals: 0,
    availableDoctors: 0,
    totalDoctors: 0,
    avgWaitTime: 24,
    avgConsultationTime: 18
  };

  const queues = metrics?.workstationQueues || {
    reception: 0, triage: 0, coordinator: 0, consultation: 0, laboratory: 0, pharmacy: 0, cashier: 0
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-white transition-all transform animate-in fade-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* ── 1. HEADER COMMAND BANNER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded-full flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                <span>{language === 'am' ? 'ቀጥታ የኦፒዲ ኦፕሬሽን' : 'Live OPD Operation'}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentTime}</span>
              </span>
              <span className="text-xs bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-300">
                Alem Ketema Enat Hospital
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-cyan-400" />
              <span>{language === 'am' ? 'የተመላላሽ ሕክምና (OPD) ማዕከላዊ ዳሽቦርድ' : 'Outpatient Department Command Center'}</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              {language === 'am'
                ? 'ሁሉንም የተመላላሽ ሕክምና የሥራ ክፍሎች (መቀበያ፣ ትሪያጅ፣ ሀኪም፣ ላብራቶሪ፣ ፋርማሲ እና ካሸር) በአንድ የተሟላ የታካሚ ጉዞ የሚያገናኝ ማዕከል'
                : 'Central coordinator orchestrating all hospital outpatient workstations through one connected patient journey.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setTicketModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'am' ? 'ተራ ቁጥር ስጥ' : 'Fast Ticket'}</span>
            </button>
            <button
              onClick={() => setDupCheckOpen(true)}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              <span>{language === 'am' ? 'ተደጋጋሚ መርምር' : 'Find Duplicate'}</span>
            </button>
            <button
              onClick={() => navigate('/queue-management')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>{language === 'am' ? 'የተራ መቆጣጠሪያ' : 'Smart Queue'}</span>
            </button>
            <button
              onClick={() => navigate('/opd-queue-display')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium rounded-xl transition-all"
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>{language === 'am' ? 'የመጠባበቂያ ቲቪ' : 'Waiting TV'}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. TOP 10 OPERATIONAL KPI CARDS ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'ዛሬ የተመዘገቡ' : 'Total Today'}</span>
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {kpis.totalPatientsToday}
          </div>
          <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 font-medium">
            {language === 'am' ? 'አጠቃላይ የታካሚዎች ፍሰት' : 'All incoming patients'}
          </div>
        </div>

        {/* In Triage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'በትሪያጅ ላይ' : 'In Triage'}</span>
            <ClipboardCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {kpis.inTriage}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'ምልክትና ቫይታልስ መለየት' : 'Vitals & prioritization'}
          </div>
        </div>

        {/* Waiting for Doctor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'ሀኪም የሚጠብቁ' : 'Waiting for Doctor'}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">
            {kpis.waitingForDoctors}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'ክፍል ተመድቦላቸው' : 'Assigned to rooms'}
          </div>
        </div>

        {/* In Consultation */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'በምርመራ ላይ' : 'In Consultation'}</span>
            <Stethoscope className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {kpis.inConsultation}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'ከሀኪም ጋር ያሉ' : 'Active doctor sessions'}
          </div>
        </div>

        {/* Completed Consultations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'የተጠናቀቁ' : 'Completed'}</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {kpis.completedConsultations}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'የተጠናቀቀ ህክምና' : 'Discharged or treated'}
          </div>
        </div>

        {/* Emergency & Critical (P1) */}
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-xl p-4 shadow-sm relative overflow-hidden bg-red-50/20 dark:bg-red-950/10">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'አስቸኳይ (P1)' : 'Emergency (P1)'}</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400">
            {kpis.emergencyReferrals}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
            {language === 'am' ? 'ፈጣን ጣልቃገብነት' : 'Immediate intervention'}
          </div>
        </div>

        {/* Doctor Availability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'ዝግጁ ሀኪሞች' : 'Doctors Available'}</span>
            <UserCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {kpis.availableDoctors} <span className="text-sm font-normal text-slate-400">/ {kpis.totalDoctors}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'በተረኛ ክፍል ውስጥ' : 'On-duty in clinic'}
          </div>
        </div>

        {/* Average Waiting Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'አማካይ የመጠባበቂያ ጊዜ' : 'Avg Wait Time'}</span>
            <TrendingUp className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-violet-600 dark:text-violet-400">
            {kpis.avgWaitTime} <span className="text-sm font-normal text-slate-500">min</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'ከመድረስ እስከ ሀኪም' : 'Target: < 30 mins'}
          </div>
        </div>

        {/* Average Consultation Duration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'የምርመራ ቆይታ' : 'Avg Consult Time'}</span>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-600 dark:text-sky-400">
            {kpis.avgConsultationTime} <span className="text-sm font-normal text-slate-500">min</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'በአንድ ታካሚ' : 'Per patient visit'}
          </div>
        </div>

        {/* Referrals & Follow-ups */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden cursor-pointer hover:border-cyan-500 transition-colors"
          onClick={() => setReferralModalOpen(true)}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{language === 'am' ? 'ሪፈራሎች' : 'Referrals'}</span>
            <Share2 className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 flex items-center justify-between">
            <span>{kpis.emergencyReferrals}</span>
            <span className="text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 rounded font-normal">+ New</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {language === 'am' ? 'ውስጣዊና ውጫዊ ሪፈራል' : 'Internal & tertiary'}
          </div>
        </div>
      </div>

      {/* ── 3. SHARED PATIENT JOURNEY WORKSTATION PIPELINE ────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              <span>{language === 'am' ? 'የተመላላሽ ሕክምና የሥራ ጣቢያዎች እና የታካሚ ጉዞ' : 'Hospital Workstations & Patient Journey Pipeline'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'am' ? 'እያንዳንዱን የሆስፒታል የሥራ ጣቢያ በቀጥታ ይድረሱበት' : 'Connected hospital workstations. Click any station to launch its dedicated workbench.'}
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{language === 'am' ? 'ሁሉም ጣቢያዎች ክፍት ናቸው' : 'All Workstations Active'}</span>
          </span>
        </div>

        {/* Interactive Station Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* 1. Reception */}
          <div
            onClick={() => navigate('/reception-workflow')}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <span className="px-2 py-0.5 bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-bold rounded-full">
                {queues.reception}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
              {language === 'am' ? 'መቀበያና ምዝገባ' : 'Reception & Intake'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {language === 'am' ? 'አዲስ ምዝገባ፣ ተራ ቁጥርና ክፍያ' : 'Patient card, MRN & intake'}
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>{language === 'am' ? 'ግባ' : 'Launch'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* 2. Triage & Nursing */}
          <div
            onClick={() => navigate('/nurse')}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full">
                {queues.triage}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {language === 'am' ? 'ትሪያጅና ነርሲንግ' : 'Triage & Nursing'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {language === 'am' ? 'ቫይታልስ፣ አስቸኳይነት (P1-P3)' : 'BP, Temp, SpO2 & priority'}
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>{language === 'am' ? 'ግባ' : 'Launch'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* 3. OPD Coordinator */}
          <div
            onClick={() => navigate('/opd-coordinator')}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full">
                {queues.coordinator}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {language === 'am' ? 'ኦፒዲ አስተባባሪ' : 'OPD Coordinator'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {language === 'am' ? 'የክፍልና የሀኪም ምደባ' : 'Doctor & room routing'}
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
              <span>{language === 'am' ? 'ግባ' : 'Launch'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* 4. Doctor Consultation */}
          <div
            onClick={() => navigate('/consultation')}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">
                {queues.consultation}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {language === 'am' ? 'የሀኪም ምርመራ' : 'Doctor Consultation'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {language === 'am' ? 'ምርመራ፣ መድኃኒትና ላብራቶሪ' : 'Diagnosis, orders, Rx'}
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
              <span>{language === 'am' ? 'ግባ' : 'Launch'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* 5. Laboratory & Pharmacy */}
          <div
            onClick={() => navigate('/lab-dashboard')}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                5
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                {queues.laboratory + queues.pharmacy}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {language === 'am' ? 'ላብራቶሪና ፋርማሲ' : 'Lab & Pharmacy'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {language === 'am' ? 'ናሙና ምርመራና መድኃኒት መስጠት' : 'Tests & dispensing'}
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>{language === 'am' ? 'ግባ' : 'Launch'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* 6. Cashier & Billing */}
          <div
            onClick={() => navigate('/cashier-workflow')}
            className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
                6
              </div>
              <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-full">
                {queues.cashier}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {language === 'am' ? 'ካሸርና ሂሳብ' : 'Cashier & Billing'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {language === 'am' ? 'TeleBirr፣ CBE Birr፣ ጥሬ ገንዘብ' : 'Cash, TeleBirr & receipt'}
            </p>
            <div className="mt-3 flex items-center text-xs font-semibold text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">
              <span>{language === 'am' ? 'ግባ' : 'Launch'}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. DOCTOR AVAILABILITY & CONSULTATION ROOM GRID ─────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-500" />
              <span>{language === 'am' ? 'የሀኪሞች ዝግጁነትና የክፍል ሁኔታ' : 'Doctor Availability & Consulting Rooms'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'am' ? 'ዛሬ በተረኛ ክፍል ውስጥ ያሉ ሀኪሞች የቀጥታ የሥራ ጫና' : 'Real-time doctor duty presence and queue depth per consultation room'}
            </p>
          </div>
          <button
            onClick={() => navigate('/shifts')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <span>{language === 'am' ? 'ተረኛ መርሐግብር' : 'View Shift Roster'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(metrics?.doctorRoster && metrics.doctorRoster.length > 0 ? metrics.doctorRoster : [
            { id: 1, name: 'Dr. Rahul Sharma', specialty: 'General Physician', department: 'General OPD', isAvailable: true, status: 'Available', activeConsultations: 0, waitingQueue: 4 },
            { id: 2, name: 'Dr. Priya Mehta', specialty: 'Cardiologist', department: 'Cardiology', isAvailable: true, status: 'In Consultation', activeConsultations: 1, waitingQueue: 6 },
            { id: 3, name: 'Dr. Amit Verma', specialty: 'Orthopedics', department: 'Orthopedics', isAvailable: true, status: 'Available', activeConsultations: 0, waitingQueue: 2 },
            { id: 4, name: 'Dr. Neha Patel', specialty: 'Pediatrician', department: 'Pediatrics', isAvailable: true, status: 'In Consultation', activeConsultations: 1, waitingQueue: 5 }
          ]).map((doc, idx) => (
            <div
              key={doc.id || idx}
              className={`p-4 rounded-xl border transition-all ${
                doc.status === 'In Consultation'
                  ? 'border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20'
                  : doc.status === 'Available'
                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Room {idx + 1}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  doc.status === 'In Consultation'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                    : doc.status === 'Available'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {doc.status}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{doc.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{doc.specialty} • {doc.department}</p>
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>{language === 'am' ? 'የሚጠብቁ' : 'In Queue'}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{doc.waitingQueue} {language === 'am' ? 'ታካሚዎች' : 'patients'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. LIVE OPD PATIENT JOURNEY TRACKER ─────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-500" />
              <span>{language === 'am' ? 'የቀጥታ የታካሚዎች ጉዞ መከታተያ' : 'Live Patient Journey Tracking Board'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'am' ? 'የእያንዳንዱን ታካሚ ወቅታዊ ደረጃ፣ የቆይታ ጊዜና ኃላፊ ክፍል ይከታተሉ' : 'Track the real-time stage, elapsed waiting time, and assigned provider for all patients today'}
            </p>
          </div>

          {/* Search and Stage Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'am' ? 'በስም ወይም በተራ ቁጥር ፈልግ...' : 'Search name, MRN, token...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 w-52 sm:w-64"
              />
            </div>

            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="ALL">{language === 'am' ? 'ሁሉም ደረጃዎች' : 'All Stages'}</option>
              <option value="RECEPTION">{language === 'am' ? 'መቀበያ' : 'Reception'}</option>
              <option value="TRIAGE">{language === 'am' ? 'ትሪያጅ' : 'Triage'}</option>
              <option value="COORDINATOR">{language === 'am' ? 'አስተባባሪ' : 'Coordinator'}</option>
              <option value="WAITING_FOR_DOCTOR">{language === 'am' ? 'ሀኪም በመጠባበቅ' : 'Waiting for Doctor'}</option>
              <option value="CONSULTATION">{language === 'am' ? 'በምርመራ ላይ' : 'Consultation'}</option>
              <option value="COMPLETED">{language === 'am' ? 'የተጠናቀቀ' : 'Completed'}</option>
            </select>
          </div>
        </div>

        {/* Tracker Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">{language === 'am' ? 'ተራ ቁጥር' : 'Token #'}</th>
                <th className="px-4 py-3">{language === 'am' ? 'አስቸኳይነት' : 'Priority'}</th>
                <th className="px-4 py-3">{language === 'am' ? 'የታካሚ ስም / MRN' : 'Patient Name & MRN'}</th>
                <th className="px-4 py-3">{language === 'am' ? 'ወቅታዊ ደረጃ' : 'Current Stage'}</th>
                <th className="px-4 py-3">{language === 'am' ? 'የቆይታ ጊዜ' : 'Wait Time'}</th>
                <th className="px-4 py-3">{language === 'am' ? 'ክፍል / ሀኪም' : 'Room & Doctor'}</th>
                <th className="px-4 py-3 text-right">{language === 'am' ? 'እርምጃዎች' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredTracker.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {language === 'am' ? 'ምንም የታካሚ መዝገብ አልተገኘም' : 'No patients currently in this queue stage'}
                  </td>
                </tr>
              ) : (
                filteredTracker.map(item => {
                  const isLongWait = item.elapsedMinutes > 30;
                  const isEmergency = item.priority === 'emergency' || item.priority === 'critical';
                  const isUrgent = item.priority === 'urgent';

                  return (
                    <tr key={item.queue_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Token */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
                          {item.queue_token}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        {isEmergency ? (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            P1 Emergency
                          </span>
                        ) : isUrgent ? (
                          <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">
                            P2 Urgent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">
                            P3 Routine
                          </span>
                        )}
                      </td>

                      {/* Patient Name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.first_name} {item.last_name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {item.patientMrn} {item.gender ? `• ${item.gender}` : ''}
                        </div>
                      </td>

                      {/* Current Stage */}
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          item.currentStage === 'CONSULTATION'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200'
                            : item.currentStage === 'WAITING_FOR_DOCTOR'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                            : item.currentStage === 'TRIAGE'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                            : item.currentStage === 'COMPLETED'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
                        }`}>
                          {item.currentStage.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Wait Time */}
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center space-x-1 font-mono font-bold ${
                          isLongWait ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.elapsedMinutes} min</span>
                        </div>
                      </td>

                      {/* Room & Doctor */}
                      <td className="px-4 py-3">
                        <div className="text-slate-900 dark:text-white font-medium">
                          {item.consultation_room || 'Room 1'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.doctor_name || item.department_name || 'General OPD'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          {item.currentStage === 'WAITING_FOR_DOCTOR' && (
                            <button
                              onClick={() => handleCallPatient(item)}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md text-xs font-semibold shadow-sm transition-all"
                              title="Call next"
                            >
                              Call
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setTransferItem(item);
                              setTransferRoom(item.consultation_room || 'Room 1');
                              setTransferModalOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700"
                            title="Transfer department or doctor"
                          >
                            Transfer
                          </button>
                          <button
                            onClick={() => handleSkipPatient(item)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md text-xs"
                            title="Skip"
                          >
                            Skip
                          </button>
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

      {/* ── 6. FAST QUEUE TICKET GENERATOR MODAL ────────────────────────────── */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-500" />
                <span>{language === 'am' ? 'አዲስ የተራ ቁጥር ስጥ' : 'Fast OPD Queue Ticket Issue'}</span>
              </h3>
              <button
                onClick={() => setTicketModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueToken} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የታካሚ መታወቂያ (Patient ID)' : 'Patient ID (Database ID)'}
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 42"
                  value={ticketForm.patient_id}
                  onChange={e => setTicketForm({ ...ticketForm, patient_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የክሊኒክ ክፍል' : 'OPD Department'}
                </label>
                <select
                  value={ticketForm.department_id}
                  onChange={e => setTicketForm({ ...ticketForm, department_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {departments.length > 0 ? (
                    departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="1">General OPD</option>
                      <option value="2">Pediatrics</option>
                      <option value="3">Internal Medicine</option>
                      <option value="4">Orthopedics</option>
                      <option value="5">Gynecology / Obstetrics</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'am' ? 'አስቸኳይነት' : 'Triage Priority'}
                  </label>
                  <select
                    value={ticketForm.priority}
                    onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="normal">P3 Routine (Green)</option>
                    <option value="urgent">P2 Urgent (Yellow)</option>
                    <option value="emergency">P1 Emergency (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'am' ? 'የምርመራ ክፍል' : 'Room / Counter'}
                  </label>
                  <input
                    type="text"
                    value={ticketForm.consultation_room}
                    onChange={e => setTicketForm({ ...ticketForm, consultation_room: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTicketModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow"
                >
                  {ticketSubmitting ? 'Generating...' : 'Issue Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 7. DUPLICATE CHECK MODAL ───────────────────────────────────────── */}
      {dupCheckOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Search className="w-5 h-5 text-cyan-500" />
                <span>{language === 'am' ? 'ተደጋጋሚ ታካሚ መርምር' : 'Duplicate Patient Detector'}</span>
              </h3>
              <button onClick={() => setDupCheckOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleDuplicateSearch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    value={dupForm.firstName}
                    onChange={e => setDupForm({ ...dupForm, firstName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={dupForm.lastName}
                    onChange={e => setDupForm({ ...dupForm, lastName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="0911..."
                    value={dupForm.phone}
                    onChange={e => setDupForm({ ...dupForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dupForm.dateOfBirth}
                    onChange={e => setDupForm({ ...dupForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={dupLoading}
                className="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-lg hover:bg-slate-700 transition"
              >
                {dupLoading ? 'Searching...' : 'Scan Database for Matches'}
              </button>
            </form>

            {/* Results */}
            <div className="max-h-52 overflow-y-auto space-y-2 pt-2">
              {dupResults.map(p => (
                <div key={p.id} className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-amber-900 dark:text-amber-300">{p.first_name} {p.last_name}</span>
                    <span className="font-mono bg-amber-200/60 dark:bg-amber-800/60 px-1.5 py-0.5 rounded text-amber-900 dark:text-amber-200">{p.mrn}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">Phone: {p.phone || 'N/A'} • DOB: {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : 'N/A'}</div>
                  <div className="text-red-600 dark:text-red-400 font-semibold">{p.match_reasons.join(', ')}</div>
                </div>
              ))}
              {dupResults.length === 0 && !dupLoading && (
                <div className="text-center py-4 text-xs text-slate-400">Enter search criteria above to verify uniqueness.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 8. PATIENT TRANSFER MODAL ──────────────────────────────────────── */}
      {transferModalOpen && transferItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Transfer Patient: {transferItem.queue_token}
              </h3>
              <button onClick={() => setTransferModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Patient: <span className="font-bold text-slate-900 dark:text-white">{transferItem.first_name} {transferItem.last_name}</span> ({transferItem.patientMrn})
              </p>

              <div>
                <label className="block font-semibold mb-1">New Department</label>
                <select
                  value={transferDept}
                  onChange={e => setTransferDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                >
                  <option value="">Keep Current Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Target Consultation Room</label>
                <input
                  type="text"
                  value={transferRoom}
                  onChange={e => setTransferRoom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Reason for Transfer</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Specialized pediatric consultation required"
                  value={transferReason}
                  onChange={e => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteTransfer}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow"
                >
                  Transfer Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. REFERRAL MODAL ──────────────────────────────────────────────── */}
      {referralModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-500" />
                <span>Create Clinical Referral</span>
              </h3>
              <button onClick={() => setReferralModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Patient ID</label>
                  <input
                    type="number"
                    required
                    value={referralForm.patient_id}
                    onChange={e => setReferralForm({ ...referralForm, patient_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Referral Type</label>
                  <select
                    value={referralForm.referral_type}
                    onChange={e => setReferralForm({ ...referralForm, referral_type: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="internal">Internal (Inside Hospital)</option>
                    <option value="external">External (Tertiary Hospital)</option>
                  </select>
                </div>
              </div>

              {referralForm.referral_type === 'internal' ? (
                <div>
                  <label className="block font-semibold mb-1">Receiving Department</label>
                  <select
                    value={referralForm.receiving_department_id}
                    onChange={e => setReferralForm({ ...referralForm, receiving_department_id: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold mb-1">Target Healthcare Facility</label>
                  <input
                    type="text"
                    placeholder="e.g. Tikur Anbessa Specialized Hospital"
                    value={referralForm.receiving_facility}
                    onChange={e => setReferralForm({ ...referralForm, receiving_facility: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Reason for Referral</label>
                <input
                  type="text"
                  required
                  placeholder="Primary clinical diagnosis or reason"
                  value={referralForm.reason}
                  onChange={e => setReferralForm({ ...referralForm, reason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Clinical Summary & Findings</label>
                <textarea
                  rows={2}
                  value={referralForm.clinical_summary}
                  onChange={e => setReferralForm({ ...referralForm, clinical_summary: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReferralModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow"
                >
                  Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OPDDashboardPage;
