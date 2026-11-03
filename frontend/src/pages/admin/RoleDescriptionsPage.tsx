import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Shield, ShieldCheck, Users, Activity, Stethoscope, ClipboardCheck,
  UserCheck, Receipt, FlaskConical, Pill, Building2, CheckCircle2,
  Search, RefreshCw, ArrowRight
} from 'lucide-react';

interface RoleStat {
  role: string;
  count: string | number;
}

interface RoleInfo {
  id: string;
  roleKey: string;
  titleEn: string;
  titleAm: string;
  hospitalTitle: string;
  category: 'clinical' | 'diagnostic' | 'frontline' | 'governance';
  icon: React.ElementType;
  colorScheme: {
    badge: string;
    border: string;
    bgGlow: string;
    accent: string;
    text: string;
  };
  summaryEn: string;
  summaryAm: string;
  ethiopianScope: string;
  responsibilities: string[];
  keyPermissions: string[];
  accessLevel: 'Full Control' | 'High' | 'Clinical Clinical' | 'Operational' | 'Standard';
}

const HOSPITAL_ROLES: RoleInfo[] = [
  {
    id: 'super_admin',
    roleKey: 'super_admin',
    titleEn: 'Super Administrator',
    titleAm: 'ዋና አስተዳዳሪ',
    hospitalTitle: 'Chief System & Security Architect',
    category: 'governance',
    icon: Shield,
    colorScheme: {
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200',
      border: 'border-purple-200 dark:border-purple-800/50',
      bgGlow: 'from-purple-500/10 to-transparent',
      accent: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-700 dark:text-purple-300'
    },
    summaryEn: 'Complete administrative, architectural, and security governance across all hospital subsystems.',
    summaryAm: 'በሆስፒታሉ የቴክኖሎጂ እና የመረጃ ስርዓቶች ላይ ሙሉ ቁጥጥር እና የደህንነት አመራር።',
    ethiopianScope: 'National e-Health standard governance, master security policies, database backup schedules, and immutable clinical audit logs.',
    responsibilities: [
      'Master system configuration and environment security management',
      'Staff account lifecycle: creation, authorization, credential resets, and lockout',
      'System-wide role definition and dynamic permission policy enforcement',
      'Comprehensive security audit trail inspection and tamper-proof CSV exports',
      'Infrastructure maintenance, database migrations, and disaster recovery'
    ],
    keyPermissions: [
      'All System Permissions (*)',
      'Security Audit Logs (Full Read/Export)',
      'Permanent User Deactivation & Account Lockout',
      'System Backups & Database Maintenance',
      'Administrative Override on Locked Encounters'
    ],
    accessLevel: 'Full Control'
  },
  {
    id: 'admin',
    roleKey: 'admin',
    titleEn: 'Hospital Administrator',
    titleAm: 'አስተዳዳሪ',
    hospitalTitle: 'Operations & Infrastructure Administrator',
    category: 'governance',
    icon: Building2,
    colorScheme: {
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200',
      border: 'border-blue-200 dark:border-blue-800/50',
      bgGlow: 'from-blue-500/10 to-transparent',
      accent: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-700 dark:text-blue-300'
    },
    summaryEn: 'Day-to-day administrative operations, staff onboarding, department structure, and clinical tariffs.',
    summaryAm: 'የዕለት ተዕለት የሆስፒታል አስተዳደራዊ ሥራዎች፣ የሰራተኞች ምዝገባ እና የክፍሎች መዋቅር።',
    ethiopianScope: 'Hospital operational management in alignment with Ethiopian Ministry of Health (MOH) administrative guidelines.',
    responsibilities: [
      'Staff onboarding with temporary credential provisioning and forced first-login password change',
      'Departmental hierarchy setup and head doctor assignment',
      'Clinical service pricing and billing catalog administration',
      'Hospital-wide duty roster review and staff shift scheduling',
      'Patient notification outbox monitoring and communication management'
    ],
    keyPermissions: [
      'User Management (Create, Edit, Status Toggle)',
      'Department Configuration & Head Physician Assignment',
      'Clinical Services & Fee Catalog Management',
      'Shift Rostering & Staff Scheduling',
      'Operational Analytics & Financial Summaries'
    ],
    accessLevel: 'High'
  },
  {
    id: 'hospital_manager',
    roleKey: 'hospital_manager',
    titleEn: 'Medical Director',
    titleAm: 'ሜዲካል ዳይሬክተር',
    hospitalTitle: 'Chief Medical Officer & Clinical Governance Director',
    category: 'governance',
    icon: Activity,
    colorScheme: {
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200',
      border: 'border-rose-200 dark:border-rose-800/50',
      bgGlow: 'from-rose-500/10 to-transparent',
      accent: 'text-rose-600 dark:text-rose-400',
      text: 'text-rose-700 dark:text-rose-300'
    },
    summaryEn: 'Clinical leadership, bed occupancy supervision, department healthcare outcomes, and board governance.',
    summaryAm: 'የህክምና አገልግሎት ጥራት አመራር፣ የአልጋ አጠቃቀም ክትትል እና የቦርድ ኮሚቴ ውሳኔዎች።',
    ethiopianScope: 'Chief Medical Officer statutory responsibility under Ethiopian Regional Health Bureau and MOH standards.',
    responsibilities: [
      'Executive monitoring of inpatient bed occupancy, ward turnover, and admission pipelines',
      'Clinical performance auditing across OPD, Emergency, Inpatient, and Specialized Clinics',
      'Approval of hospital-certified birth documentation and clinical causes of death',
      'Chairing Board & Administrative committees for staff scholarships and clinical specializations',
      'Supervision of medical equipment utilization, referral rates, and physician workloads'
    ],
    keyPermissions: [
      'Hospital Overview & Real-Time Executive KPI Dashboard',
      'Inpatient Admissions & Ward Bed Management (Read/Oversight)',
      'Board & Administrative Services (Full Approval Privileges)',
      'Departmental Performance Analytics & Financial Aggregations',
      'Clinical Quality Audit & Mortality Review Oversight'
    ],
    accessLevel: 'High'
  },
  {
    id: 'doctor',
    roleKey: 'doctor',
    titleEn: 'Doctor / Physician',
    titleAm: 'ሀኪም',
    hospitalTitle: 'Consultant / Attending Physician (OPD & IPD)',
    category: 'clinical',
    icon: Stethoscope,
    colorScheme: {
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200',
      border: 'border-emerald-200 dark:border-emerald-800/50',
      bgGlow: 'from-emerald-500/10 to-transparent',
      accent: 'text-emerald-600 dark:text-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-300'
    },
    summaryEn: 'Clinical encounters, ICD-10 diagnosis, electronic prescriptions, and diagnostic orders.',
    summaryAm: 'የህክምና ምርመራ፣ የበሽታ መመርመሪያ (ICD-10)፣ ዲጂታል መድሃኒት ማዘዣ እና የላብራቶሪ ትዕዛዞች።',
    ethiopianScope: 'Licensed medical practitioner registered with the Ethiopian Medical Association and Food and Drug Authority (EFDA).',
    responsibilities: [
      'Conduct OPD/IPD consultations with structured SOAP clinical notes and history',
      'Diagnostic ICD-10 coding and clinical encounter completion',
      'Electronic prescription writing with automated drug-allergy and drug-drug safety validation',
      'Ordering laboratory and radiology investigations and certifying clinical findings',
      'Authorizing inpatient admissions, treatment protocols, and formal patient discharges',
      'Documenting official medical causes of death for hospital records'
    ],
    keyPermissions: [
      'Clinical Consultations & Encounter Notes (Create/Edit)',
      'Electronic Prescriptions (Create/Authorize)',
      'Laboratory & Radiology Orders (Create/View)',
      'Inpatient Admission & Discharge Authorization',
      'Patient Clinical History & Vitals (Full Clinical Access)'
    ],
    accessLevel: 'Clinical Clinical'
  },
  {
    id: 'nurse',
    roleKey: 'nurse',
    titleEn: 'Nurse',
    titleAm: 'ነርስ',
    hospitalTitle: 'Clinical Triage & Inpatient Care Nurse',
    category: 'clinical',
    icon: ClipboardCheck,
    colorScheme: {
      badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200',
      border: 'border-teal-200 dark:border-teal-800/50',
      bgGlow: 'from-teal-500/10 to-transparent',
      accent: 'text-teal-600 dark:text-teal-400',
      text: 'text-teal-700 dark:text-teal-300'
    },
    summaryEn: '3-tier emergency triage, vital signs acquisition, inpatient ward management, and bedside care.',
    summaryAm: 'የድንገተኛ ደረጃ መለያ (Triage)፣ የህይወት ምልክቶች (Vitals) መለካት እና የዎርድ ክትትል።',
    ethiopianScope: 'Frontline clinical triage and ward care following Ethiopian Standard Treatment Guidelines (STG).',
    responsibilities: [
      'Execute 3-tier clinical triage (Emergency / Urgent / Routine) upon patient arrival',
      'Accurate vital signs recording (BP, Heart Rate, Temperature, SpO2, Respiratory Rate, Glucose)',
      'Ward bed occupancy tracking, patient bed allocation, and bed turnover updates',
      'Inpatient medication administration and routine clinical progress monitoring',
      'Nursing shift handovers, patient assignment logs, and bedside handover records'
    ],
    keyPermissions: [
      'Vital Signs & Triage Assessments (Create/Record)',
      'Nursing Worklist & Waiting Queue Management',
      'Ward Bed Allocation & Occupancy Status Updates',
      'Inpatient Admissions (Intake & Bed Assignment)',
      'Patient Clinical Notes (View/Contribute)'
    ],
    accessLevel: 'Operational'
  },
  {
    id: 'receptionist',
    roleKey: 'receptionist',
    titleEn: 'Receptionist',
    titleAm: 'እንግዳ ተቀባይ',
    hospitalTitle: 'Patient Intake & Front Desk Officer',
    category: 'frontline',
    icon: UserCheck,
    colorScheme: {
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200',
      border: 'border-amber-200 dark:border-amber-800/50',
      bgGlow: 'from-amber-500/10 to-transparent',
      accent: 'text-amber-600 dark:text-amber-400',
      text: 'text-amber-700 dark:text-amber-300'
    },
    summaryEn: 'Patient registration, Medical Record Number (MRN) assignment, queue management, and appointments.',
    summaryAm: 'አዲስ ታካሚ መመዝገብ፣ የህክምና መዝገብ ቁጥር (MRN) መስጠት፣ የሰልፍ እና የቀጠሮ መርሃ ግብር።',
    ethiopianScope: 'Front-desk patient reception, demographic documentation, and outpatient queue routing.',
    responsibilities: [
      'Register new patients with complete demographic, contact, and emergency details',
      'Generate and issue unique Medical Record Numbers (MRN) for patient identification',
      'Schedule outpatient visits, follow-up clinics, and doctor consultation appointments',
      'Manage waiting room check-in and queue dispatching to nursing triage',
      'Update patient contact information and verify health insurance eligibility'
    ],
    keyPermissions: [
      'Patient Directory (Register & View Demographic Records)',
      'Appointment Scheduling (Create, Reschedule, Cancel)',
      'Reception & Intake Desk Queue Routing',
      'Patient Verification & Medical Record Lookup',
      'Read-Only Access to Non-Clinical Patient Information'
    ],
    accessLevel: 'Standard'
  },
  {
    id: 'cashier',
    roleKey: 'cashier',
    titleEn: 'Cashier',
    titleAm: 'ገንዘብ ተቀባይ',
    hospitalTitle: 'POS Billing Officer & Payment Reconciliation Specialist',
    category: 'frontline',
    icon: Receipt,
    colorScheme: {
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200',
      border: 'border-yellow-200 dark:border-yellow-800/50',
      bgGlow: 'from-yellow-500/10 to-transparent',
      accent: 'text-yellow-600 dark:text-yellow-400',
      text: 'text-yellow-700 dark:text-yellow-300'
    },
    summaryEn: 'Patient billing, POS register, dynamic Telebirr / CBE Birr QR payments, and official receipt issuance.',
    summaryAm: 'የክፍያ መጠየቂያ ማዘጋጀት፣ የቴሌብር እና ሲቢኢ ብር (Telebirr/CBE Birr) ክፍያ ማረጋገጥ እና ደረሰኝ መስጠት።',
    ethiopianScope: 'Complies with Ethiopian Ministry of Revenues electronic invoicing and National Bank of Ethiopia digital payments.',
    responsibilities: [
      'Generate patient invoices for consultations, medications, laboratory tests, and bed stays',
      'Generate dynamic Telebirr and Commercial Bank of Ethiopia (CBE Birr) QR codes for digital payments',
      'Verify mobile banking transaction reference IDs against merchant payment webhooks',
      'Collect cash payments, calculate insurance copays, and print official VAT-compliant receipts',
      'Reconcile daily cash register drawers and submit shift revenue close-out reports'
    ],
    keyPermissions: [
      'Patient Invoices (Create, View, Apply Payments)',
      'Cashier POS Register & Digital QR Processing',
      'Telebirr & CBE Birr Payment Reconciliation',
      'Official Stamped Receipt Generation & Reprinting',
      'Daily Cash Drawer & Shift Financial Reporting'
    ],
    accessLevel: 'Operational'
  },
  {
    id: 'lab_technician',
    roleKey: 'lab_technician',
    titleEn: 'Laboratory Technician',
    titleAm: 'ላብራቶሪ ቴክኒሻን',
    hospitalTitle: 'Diagnostic Laboratory Technologist',
    category: 'diagnostic',
    icon: FlaskConical,
    colorScheme: {
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200',
      border: 'border-cyan-200 dark:border-cyan-800/50',
      bgGlow: 'from-cyan-500/10 to-transparent',
      accent: 'text-cyan-600 dark:text-cyan-400',
      text: 'text-cyan-700 dark:text-cyan-300'
    },
    summaryEn: 'Specimen intake, diagnostic test execution, result verification, and critical lab values notification.',
    summaryAm: 'የናሙና መቀበል፣ የላብራቶሪ ምርመራ ማካሄድ እና የተረጋገጠ የውጤት ሪፖርት መስጠት።',
    ethiopianScope: 'Operates in accordance with Ethiopian Public Health Institute (EPHI) clinical laboratory standards.',
    responsibilities: [
      'Receive, verify, and log clinical specimens (blood, urine, sputum, CSF, tissue biopsies)',
      'Perform hematology, clinical chemistry, parasitology, microbiology, and serology assays',
      'Enter quantitative and qualitative diagnostic values against standardized biological reference ranges',
      'Flag panic/critical test values for emergency medical team notification',
      'Maintain lab equipment calibration records and reagent inventory log'
    ],
    keyPermissions: [
      'Laboratory Worklist & Test Order Queue',
      'Specimen Status Updates (Sample Collected, In Processing, Completed)',
      'Diagnostic Result Entry & Digital Certification',
      'Reagent Inventory & Equipment Quality Calibration',
      'Patient Record Lookup for Diagnostic Correlation'
    ],
    accessLevel: 'Operational'
  },
  {
    id: 'pharmacist',
    roleKey: 'pharmacist',
    titleEn: 'Pharmacist',
    titleAm: 'ፋርማሲስት',
    hospitalTitle: 'Clinical Pharmacist & Dispensary Manager',
    category: 'diagnostic',
    icon: Pill,
    colorScheme: {
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200',
      border: 'border-indigo-200 dark:border-indigo-800/50',
      bgGlow: 'from-indigo-500/10 to-transparent',
      accent: 'text-indigo-600 dark:text-indigo-400',
      text: 'text-indigo-700 dark:text-indigo-300'
    },
    summaryEn: 'Prescription dispensing, medication counseling, drug inventory batch tracking, and expiry alerts.',
    summaryAm: 'የታዘዘ መድሃኒት ማከፋፈል፣ የመድሃኒት አጠቃቀም ምክር፣ ክምችት እና የአገልግሎት ጊዜ ክትትል።',
    ethiopianScope: 'Complies with Ethiopian Food and Drug Authority (EFDA) pharmaceutical regulation and FEFO inventory principles.',
    responsibilities: [
      'Verify incoming electronic prescriptions for correct dosage, duration, and patient safety',
      'Dispense prescribed pharmaceutical items and provide bilingual patient administration counseling',
      'Maintain medicine stock levels using First-Expiry-First-Out (FEFO) batch tracking',
      'Monitor and record narcotics and controlled substances in locked pharmacy register',
      'Track near-expiry medications and low-stock alerts to initiate procurement requisitions'
    ],
    keyPermissions: [
      'Prescription Queue & Dispensing Confirmation',
      'Pharmaceutical Inventory & Medicine Catalog (Edit/Stock Levels)',
      'Batch Expiry & Low Stock Automated Alerts',
      'Dispensing Log & Narcotic Register Maintenance',
      'Read-Only Access to Relevant Patient Allergies & Prescriptions'
    ],
    accessLevel: 'Operational'
  }
];

interface RoleDescriptionsPageProps {
  embedded?: boolean;
}

const RoleDescriptionsPage: React.FC<RoleDescriptionsPageProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    byRole: RoleStat[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'clinical' | 'diagnostic' | 'frontline' | 'governance'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'cards' | 'matrix'>('cards');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch role statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getRoleUserCount = (roleKey: string): number => {
    if (!stats?.byRole) return 0;
    const match = stats.byRole.find(r => r.role === roleKey);
    return match ? Number(match.count) : 0;
  };

  const totalRegisteredAccounts = stats?.totalUsers || HOSPITAL_ROLES.reduce((acc, r) => acc + getRoleUserCount(r.roleKey), 0);

  const filteredRoles = HOSPITAL_ROLES.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch =
      r.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.titleAm.includes(searchQuery) ||
      r.hospitalTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.summaryEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.responsibilities.some(resp => resp.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`space-y-6 animate-fadeIn ${embedded ? 'pt-2' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto'}`}>
      {/* ── Page Header ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-xs font-semibold backdrop-blur-md border border-white/15">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'am' ? 'የስርዓት ሚናዎች እና የፈቃድ መመሪያ' : 'System Roles & Access Governance'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {language === 'am' ? 'የስርዓት ሚናዎች ዝርዝር እና ስርጭት' : 'Hospital System Roles & Clinical Distribution'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {language === 'am'
                ? 'የአለም ከተማ እናት ጠቅላላ ሆስፒታል የሰራተኞች የስራ ድርሻ፣ የተሰጡ ፈቃዶች፣ እና በኢትዮጵያ የጤና ሚኒስቴር መመሪያ መሰረት የተዘጋጁ የክሊኒካል የስራ ሃላፊነቶች።'
                : 'Role definitions, responsibilities, permission matrix, and active user distribution across Alem Ketema Enat Hospital in alignment with Ethiopian Healthcare standards.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{language === 'am' ? 'ተጠቃሚዎችን አስተዳድር' : 'Manage All Users'}</span>
            </button>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh counts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'am' ? 'የተገለጹ ሚናዎች' : 'Defined Roles'}
            </span>
            <p className="text-2xl font-black text-white mt-1">9</p>
            <span className="text-[10px] text-emerald-400 font-medium">100% RBAC Protected</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'am' ? 'ጠቅላላ አካውንቶች' : 'Total Accounts'}
            </span>
            <p className="text-2xl font-black text-white mt-1">{totalRegisteredAccounts}</p>
            <span className="text-[10px] text-blue-300 font-medium">Registered Staff</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'am' ? 'ንቁ አካውንቶች' : 'Active Accounts'}
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats?.activeUsers ?? 0}</p>
            <span className="text-[10px] text-slate-300 font-medium">Authorized on duty</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'am' ? 'የህክምና ሚናዎች' : 'Clinical Scope'}
            </span>
            <p className="text-2xl font-black text-teal-300 mt-1">4 Roles</p>
            <span className="text-[10px] text-slate-300 font-medium">MD, Nurse, Lab, Pharm</span>
          </div>
        </div>
      </div>

      {/* ── View Mode Selector & Search ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cards'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            {language === 'am' ? 'የሚና ካርዶች እና ዝርዝር' : 'Role Descriptions & Cards'}
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            {language === 'am' ? 'የፈቃዶች ሰንጠረዥ (Matrix)' : 'Permissions Matrix'}
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={language === 'am' ? 'ሚና ወይም ተግባር ፈልግ...' : 'Search role, responsibility...'}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Category Filters (for Cards View) ── */}
      {activeTab === 'cards' && (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', labelEn: 'All Roles (9)', labelAm: 'ሁሉም ሚናዎች (9)' },
            { id: 'clinical', labelEn: 'Clinical Care (Doctor, Nurse)', labelAm: 'የህክምና አገልግሎት' },
            { id: 'diagnostic', labelEn: 'Diagnostics & Pharmacy (Lab, Pharm)', labelAm: 'ምርመራ እና ፋርማሲ' },
            { id: 'frontline', labelEn: 'Frontline & Finance (Reception, Cashier)', labelAm: 'እንግዳ ተቀባይና ገንዘብ' },
            { id: 'governance', labelEn: 'Executive & Admin (Super Admin, Director, Admin)', labelAm: 'አመራርና አስተዳደር' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
            >
              {language === 'am' ? cat.labelAm : cat.labelEn}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB 1: ROLE CARDS & DISTRIBUTION ── */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRoles.map(role => {
            const userCount = getRoleUserCount(role.roleKey);
            const percentage = totalRegisteredAccounts > 0 ? Math.round((userCount / totalRegisteredAccounts) * 100) : 0;
            const Icon = role.icon;

            return (
              <div
                key={role.id}
                className={`bg-white dark:bg-gray-800 rounded-3xl border ${role.colorScheme.border} shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden relative group`}
              >
                {/* Header glow */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${role.colorScheme.bgGlow}`} />

                <div className="p-5 space-y-4">
                  {/* Top Bar: Icon, Role Name & Active Count Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-2xl border ${role.colorScheme.badge} flex-shrink-0 shadow-inner`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                          {language === 'am' ? role.titleAm : role.titleEn}
                        </h3>
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                          {role.hospitalTitle}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${role.colorScheme.badge}`}>
                      {role.accessLevel}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {language === 'am' ? role.summaryAm : role.summaryEn}
                  </p>

                  {/* Staff Distribution Metric */}
                  <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-gray-500 dark:text-gray-400">
                        {language === 'am' ? 'የተመደቡ ሰራተኞች' : 'Assigned Staff Accounts'}
                      </span>
                      <span className="font-black text-gray-900 dark:text-white">
                        {userCount} <span className="text-[10px] font-medium text-gray-400">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${role.colorScheme.badge.split(' ')[0]}`}
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>

                  {/* Responsibilities */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {language === 'am' ? 'ዋና ዋና ኃላፊነቶች' : 'Key Responsibilities'}
                    </span>
                    <ul className="space-y-1">
                      {role.responsibilities.slice(0, 3).map((resp, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-2">
                          <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${role.colorScheme.accent}`} />
                          <span className="line-clamp-2">{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ethiopian MOH Regulatory Scope Note */}
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Ethiopian MOH Context: </span>
                    {role.ethiopianScope}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700/60 mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-gray-400">
                    role: <code className="font-bold text-gray-600 dark:text-gray-300">{role.roleKey}</code>
                  </span>
                  <button
                    onClick={() => navigate(`/admin?role=${role.roleKey}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                  >
                    <span>{language === 'am' ? 'ተጠቃሚዎችን ይመልከቱ' : 'Filter Users'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: PERMISSIONS MATRIX ── */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-black text-gray-900 dark:text-white">
              {language === 'am' ? 'የሚናዎች እና የፈቃዶች ሙሉ ሰንጠረዥ (Role-Permission Matrix)' : 'System Role vs Permissions Access Matrix'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Authoritative mapping of clinical, operational, and administrative capabilities enforced on backend API endpoints.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3.5 font-bold text-gray-700 dark:text-gray-300 min-w-[200px]">
                    Functional Domain / Action
                  </th>
                  {HOSPITAL_ROLES.map(r => (
                    <th key={r.id} className="p-3.5 text-center font-bold min-w-[100px]">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${r.colorScheme.badge}`}>
                        {r.titleEn}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { domain: 'Patient Directory: View & Search', allowed: ['super_admin','admin','hospital_manager','receptionist','doctor','nurse','lab_technician'] },
                  { domain: 'Patient Intake: Register New Patient', allowed: ['super_admin','admin','receptionist'] },
                  { domain: 'Appointments: Book & Schedule', allowed: ['super_admin','admin','receptionist','doctor'] },
                  { domain: 'Vital Signs: Record Triage Vitals', allowed: ['super_admin','admin','nurse','doctor'] },
                  { domain: 'Consultations: Clinical SOAP Notes', allowed: ['super_admin','admin','doctor'] },
                  { domain: 'Prescriptions: Issue Electronic Rx', allowed: ['super_admin','admin','doctor'] },
                  { domain: 'Pharmacy: Dispense Medication', allowed: ['super_admin','admin','pharmacist'] },
                  { domain: 'Lab Tests: Order Diagnostics', allowed: ['super_admin','admin','doctor'] },
                  { domain: 'Lab Tests: Process & Certify Results', allowed: ['super_admin','admin','lab_technician'] },
                  { domain: 'Inpatient Beds: Allocate & Assign', allowed: ['super_admin','admin','hospital_manager','nurse'] },
                  { domain: 'Inpatient: Authorize Discharge', allowed: ['super_admin','admin','hospital_manager','doctor'] },
                  { domain: 'Cashier POS & Invoice Generation', allowed: ['super_admin','admin','cashier'] },
                  { domain: 'Telebirr / CBE Birr QR Reconcile', allowed: ['super_admin','admin','cashier'] },
                  { domain: 'Birth Certificates: Verify & Issue', allowed: ['super_admin','admin','hospital_manager','doctor'] },
                  { domain: 'Death Documentation: Certify Cause', allowed: ['super_admin','admin','hospital_manager','doctor'] },
                  { domain: 'Scholarship & Specialization Boards', allowed: ['super_admin','admin','hospital_manager'] },
                  { domain: 'Audit Logs & Security Trail Inspection', allowed: ['super_admin'] },
                  { domain: 'User Management & Role Assignment', allowed: ['super_admin','admin'] },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                    <td className="p-3.5 font-semibold text-gray-800 dark:text-gray-200">
                      {row.domain}
                    </td>
                    {HOSPITAL_ROLES.map(r => {
                      const isAllowed = row.allowed.includes(r.roleKey);
                      return (
                        <td key={r.id} className="p-3.5 text-center">
                          {isAllowed ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleDescriptionsPage;
