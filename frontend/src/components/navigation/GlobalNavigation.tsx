/**
 * Global Navigation Component
 * Alem Ketema Enat Hospital Management System
 *
 * Single reusable global navigation component, fully controlled by user role and screen size.
 *
 * Responsibilities:
 * - Desktop: Collapsible left sidebar with role-filtered links, workload badges, and collapse toggle.
 * - Universal: Responsive top bar with hospital branding, Ctrl+K quick search, duty status, language pill, notifications, and profile menu.
 * - Mobile: Slide-over navigation drawer with complete module hierarchy, search, duty toggle, and logout.
 * - Mobile: Bottom navigation dock with 5 high-priority touch targets (Workbench, OPD, Center Elevated Scan QR, Queue, Menu Drawer).
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';
import NetworkSyncStatus from '../common/NetworkSyncStatus';
import PrinterSettingsModal from '../common/PrinterSettingsModal';
import PatientQuickSearchModal from '../PatientQuickSearchModal';
import WristbandScannerModal from '../WristbandScannerModal';
import CriticalAlertChimeModal from '../CriticalAlertChimeModal';
import ProfileAvatar from '../ProfileAvatar';
import api from '../../services/api';
import {
  LayoutDashboard, Users, User, Stethoscope, Calendar, Clock, LogOut, Menu, X,
  Activity, Pill, FlaskConical, Bed, FileText, Shield, ShieldCheck,
  BarChart2, CreditCard, Settings, Bell,
  Palette, Sun, Moon, RefreshCw, ClipboardCheck,
  UserCheck, Building2, Receipt, Package, Scan,
  ChevronLeft, ChevronRight, Search, Printer,
  Baby, GraduationCap, BookOpen, GitBranch, Radio
} from 'lucide-react';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
  group: 'Daily Workbench' | 'Records & Schedule' | 'Duty & Account' | string;
  permission?: string;
  translationKey: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface GlobalNavigationProps {
  children?: React.ReactNode;
}

export const GlobalNavigation: React.FC<GlobalNavigationProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { language } = useLanguage();
  const { isDark, setIsDark, hue, saturation, setHue, setSaturation, resetTheme } = useTheme();
  const { can } = useRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dutyModalOpen, setDutyModalOpen] = useState(false);
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [patientScannerOpen, setPatientScannerOpen] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Live Workload & Authoritative Duty State
  const [workloadCounts, setWorkloadCounts] = useState({
    triage: 0,
    doctorQueue: 0,
    labPending: 0,
    pharmacyPending: 0,
    cashierPending: 0,
    activeAdmissions: 0
  });

  const [dutyStatus, setDutyStatus] = useState<{
    isOnDuty: boolean;
    hasScheduledShift: boolean;
    shiftId: number | null;
    shiftType: string;
    shiftLabel: string;
    startTime: string | null;
    endTime: string | null;
    department: string | null;
  } | null>(null);
  const [dutyToggling, setDutyToggling] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Keyboard shortcut Ctrl+K / Cmd+K for patient quick search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Poll notifications & duty status
  useEffect(() => {
    fetchNotifications();
    fetchDutyStatus();
    fetchWorkloadMetrics();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchDutyStatus();
      fetchWorkloadMetrics();
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notif-panel]')) setNotifOpen(false);
      if (!target.closest('[data-theme-panel]')) setThemeOpen(false);
      if (!target.closest('[data-settings-panel]')) setSettingsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      const list = res.data.data.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n: Notification) => !n.is_read).length);
    } catch {
      // offline or unauthenticated fallback
    }
  };

  const fetchDutyStatus = async () => {
    if (!user || user.role === 'patient') return;
    try {
      const res = await api.get('/shifts/my-duty-status');
      if (res.data?.success && res.data?.data) {
        setDutyStatus(res.data.data);
      }
    } catch {
      // duty endpoint fallback
    }
  };

  const fetchWorkloadMetrics = async () => {
    if (!user || user.role === 'patient') return;
    try {
      const res = await api.get('/dashboard');
      const d = res.data?.data || {};
      setWorkloadCounts({
        triage: Number(d.waitingPatients || d.triageQueue || 0),
        doctorQueue: Number(d.waitingForDoctor || 0),
        labPending: Number(d.pendingLabTests || 0),
        pharmacyPending: Number(d.pendingPrescriptions || 0),
        cashierPending: Number(d.unpaidInvoices || 0),
        activeAdmissions: Number(d.occupiedBeds || 0)
      });
    } catch {
      // dashboard offline fallback
    }
  };

  const toggleClockInOut = async () => {
    if (dutyToggling) return;
    setDutyToggling(true);
    try {
      const action = dutyStatus?.isOnDuty ? 'clock_out' : 'clock_in';
      const res = await api.post('/shifts/toggle-clock', {
        action,
        department: dutyStatus?.department || undefined
      });
      if (res.data?.success) {
        await fetchDutyStatus();
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update duty status');
    } finally {
      setDutyToggling(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const formatRoleName = (role?: string) => {
    if (!role) return '';
    if (role === 'hospital_manager') return language === 'am' ? 'ሜዲካል ዳይሬክተር' : 'Medical Director';
    if (role === 'super_admin') return language === 'am' ? 'ዋና አስተዳዳሪ' : 'Super Admin';
    if (role === 'admin') return language === 'am' ? 'አስተዳዳሪ' : 'Admin';
    if (role === 'doctor') return language === 'am' ? 'ሀኪም' : 'Doctor';
    if (role === 'nurse') return language === 'am' ? 'ነርስ' : 'Nurse';
    if (role === 'pharmacist') return language === 'am' ? 'ፋርማሲስት' : 'Pharmacist';
    if (role === 'lab_technician') return language === 'am' ? 'ላብራቶሪ ቴክኒሻን' : 'Lab Technician';
    if (role === 'cashier') return language === 'am' ? 'ገንዘብ ተቀባይ' : 'Cashier';
    if (role === 'receptionist') return language === 'am' ? 'እንግዳ ተቀባይ' : 'Receptionist';
    if (role === 'patient') return language === 'am' ? 'ታካሚ' : 'Patient';
    return role.replace(/_/g, ' ');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'hospital_manager': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
      case 'doctor': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'nurse': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300';
      case 'receptionist': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'lab_technician': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300';
      case 'pharmacist': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
      case 'cashier': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Nav building blocks
  const OPD_NAV_ITEM: NavItem = {
    id: 'opd_hub',
    name: 'OPD Command Center',
    href: '/opd',
    icon: Building2,
    group: 'Daily Workbench',
    translationKey: 'nav.opd_hub'
  };

  const QUEUE_NAV_ITEM: NavItem = {
    id: 'queue_management',
    name: 'Smart Patient Queue',
    href: '/queue-management',
    icon: Radio,
    group: 'Daily Workbench',
    translationKey: 'nav.queue_management'
  };

  const QR_SCANNER_NAV_ITEM: NavItem = {
    id: 'qr_scanner',
    name: 'Patient QR Scanner',
    href: '/qr-scanner',
    icon: Scan,
    group: 'Daily Workbench',
    translationKey: 'nav.qr_scanner'
  };

  const allBoardItems: NavItem[] = [
    { id: 'board_birth_certs', name: 'Birth Records & Certs', href: '/board/birth-certificates', icon: Baby, group: 'Duty & Account', translationKey: 'nav.birth_certs' },
    { id: 'board_death_certs', name: 'Death Records & Certs', href: '/board/death-certificates', icon: FileText, group: 'Duty & Account', translationKey: 'nav.death_certs' },
    { id: 'board_scholarships', name: 'Medical Scholarships', href: '/board/scholarships', icon: GraduationCap, group: 'Duty & Account', translationKey: 'nav.scholarships' },
    { id: 'board_specializations', name: 'Clinical Specializations', href: '/board/specializations', icon: Stethoscope, group: 'Duty & Account', translationKey: 'nav.specializations' },
    { id: 'board_training', name: 'Training & Development', href: '/board/training', icon: BookOpen, group: 'Duty & Account', translationKey: 'nav.training' },
    { id: 'board_members', name: 'Hospital Board Members', href: '/board/members', icon: Users, group: 'Duty & Account', translationKey: 'nav.board_members' },
    { id: 'board_meetings', name: 'Board Governance Meetings', href: '/board/meetings', icon: Calendar, group: 'Duty & Account', translationKey: 'nav.board_meetings' },
    { id: 'board_reports', name: 'Executive Board Reports', href: '/board/reports', icon: BarChart2, group: 'Duty & Account', translationKey: 'nav.board_reports' }
  ];

  const allUserMgmtItems: NavItem[] = [
    { id: 'user_management', name: 'Staff User Directory', href: '/admin/users', icon: Users, group: 'Records & Schedule', permission: 'users:view', translationKey: 'nav.users' },
    { id: 'role_descriptions', name: 'Staff Roles & Access', href: '/admin/roles', icon: ShieldCheck, group: 'Records & Schedule', permission: 'roles:view', translationKey: 'nav.roles' }
  ];

  const getNavigationByRole = (role: string): NavItem[] => {
    switch (role) {
      case 'receptionist':
        return [
          OPD_NAV_ITEM,
          { id: 'reception_workflow', name: 'Reception & Intake Desk', href: '/reception-workflow', icon: UserCheck, group: 'Daily Workbench', translationKey: 'nav.reception' },
          QR_SCANNER_NAV_ITEM,
          QUEUE_NAV_ITEM,
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'appointments', name: 'Appointments Schedule', href: '/appointments', icon: Calendar, group: 'Records & Schedule', permission: 'appointments:view', translationKey: 'nav.appointments' }
        ];

      case 'nurse':
        return [
          OPD_NAV_ITEM,
          { id: 'nurse_worklist', name: 'Triage & Nursing Worklist', href: '/nurse', icon: ClipboardCheck, group: 'Daily Workbench', translationKey: 'nav.triage' },
          QR_SCANNER_NAV_ITEM,
          { id: 'vitals', name: 'Vital Signs & Triage', href: '/vitals', icon: Activity, group: 'Daily Workbench', permission: 'vitals:view', translationKey: 'nav.vitals' },
          { id: 'opd_coordinator', name: 'OPD Coordinator Desk', href: '/opd-coordinator', icon: GitBranch, group: 'Daily Workbench', translationKey: 'nav.opd_coordinator' },
          QUEUE_NAV_ITEM,
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'beds', name: 'Ward & Bed Management', href: '/beds', icon: Bed, group: 'Records & Schedule', permission: 'beds:view', translationKey: 'nav.beds' },
          { id: 'admissions', name: 'Inpatient Admissions', href: '/admissions', icon: Bed, group: 'Records & Schedule', permission: 'admissions:view', translationKey: 'nav.admissions' },
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'doctor':
        return [
          OPD_NAV_ITEM,
          { id: 'consultation', name: 'Clinical Consultations', href: '/consultation', icon: Stethoscope, group: 'Daily Workbench', translationKey: 'nav.consultations' },
          QR_SCANNER_NAV_ITEM,
          QUEUE_NAV_ITEM,
          { id: 'vitals', name: 'Vital Signs & Triage', href: '/vitals', icon: Activity, group: 'Daily Workbench', permission: 'vitals:view', translationKey: 'nav.vitals' },
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'prescriptions', name: 'Prescriptions', href: '/prescriptions', icon: Pill, group: 'Records & Schedule', permission: 'prescriptions:view', translationKey: 'nav.prescriptions' },
          { id: 'lab_tests', name: 'Laboratory Orders', href: '/lab-tests', icon: FlaskConical, group: 'Records & Schedule', permission: 'lab_tests:view', translationKey: 'nav.lab_tests' },
          { id: 'radiology', name: 'Radiology & Imaging', href: '/radiology', icon: Scan, group: 'Records & Schedule', permission: 'radiology:view', translationKey: 'nav.radiology' },
          { id: 'appointments', name: 'Appointments Schedule', href: '/appointments', icon: Calendar, group: 'Records & Schedule', permission: 'appointments:view', translationKey: 'nav.appointments' },
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'lab_technician':
        return [
          OPD_NAV_ITEM,
          { id: 'lab_dashboard', name: 'Laboratory Worklist', href: '/lab-dashboard', icon: FlaskConical, group: 'Daily Workbench', translationKey: 'nav.lab' },
          QR_SCANNER_NAV_ITEM,
          { id: 'lab_tests', name: 'Laboratory Orders', href: '/lab-tests', icon: FlaskConical, group: 'Records & Schedule', permission: 'lab_tests:view', translationKey: 'nav.lab_tests' },
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'pharmacist':
        return [
          OPD_NAV_ITEM,
          { id: 'pharmacy_dashboard', name: 'Pharmacy & Dispensing', href: '/pharmacy', icon: Pill, group: 'Daily Workbench', translationKey: 'nav.pharmacy' },
          QR_SCANNER_NAV_ITEM,
          QUEUE_NAV_ITEM,
          { id: 'prescriptions', name: 'Prescriptions', href: '/prescriptions', icon: Pill, group: 'Records & Schedule', permission: 'prescriptions:view', translationKey: 'nav.prescriptions' },
          { id: 'medicines', name: 'Pharmaceutical Catalog', href: '/medicines', icon: Pill, group: 'Records & Schedule', permission: 'medicines:view', translationKey: 'nav.medicines' },
          { id: 'inventory', name: 'Stock & Inventory', href: '/inventory', icon: Package, group: 'Records & Schedule', permission: 'inventory:view', translationKey: 'nav.inventory' },
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'cashier':
        return [
          OPD_NAV_ITEM,
          { id: 'cashier_pos', name: 'Cashier POS & Register', href: '/cashier-workflow', icon: Receipt, group: 'Daily Workbench', translationKey: 'nav.cashier' },
          QR_SCANNER_NAV_ITEM,
          { id: 'invoices', name: 'Patient Invoices', href: '/invoices', icon: FileText, group: 'Records & Schedule', permission: 'invoices:view', translationKey: 'nav.invoices' },
          { id: 'payments', name: 'Payment Transactions', href: '/payments', icon: CreditCard, group: 'Records & Schedule', permission: 'payments:view', translationKey: 'nav.payments' },
          { id: 'finance_reports', name: 'Financial Reports', href: '/finance-reports', icon: BarChart2, group: 'Duty & Account', permission: 'finance_reports:view', translationKey: 'nav.finance_reports' }
        ];

      case 'hospital_manager':
        return [
          { id: 'dashboard', name: 'Hospital Overview', href: '/dashboard', icon: LayoutDashboard, group: 'Daily Workbench', translationKey: 'nav.dashboard' },
          OPD_NAV_ITEM,
          QR_SCANNER_NAV_ITEM,
          { id: 'opd_coordinator', name: 'OPD Coordinator Desk', href: '/opd-coordinator', icon: GitBranch, group: 'Daily Workbench', translationKey: 'nav.opd_coordinator' },
          QUEUE_NAV_ITEM,
          { id: 'shifts', name: 'Staff Shifts & Rosters', href: '/shifts', icon: Clock, group: 'Records & Schedule', translationKey: 'nav.shifts' },
          { id: 'departments_admin', name: 'Hospital Departments', href: '/departments-admin', icon: Building2, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.departments' },
          { id: 'admissions', name: 'Inpatient Admissions', href: '/admissions', icon: Bed, group: 'Records & Schedule', permission: 'admissions:view', translationKey: 'nav.admissions' },
          { id: 'beds', name: 'Ward & Bed Management', href: '/beds', icon: Bed, group: 'Records & Schedule', permission: 'beds:view', translationKey: 'nav.beds' },
          ...allBoardItems,
          { id: 'reports', name: 'Operational Analytics', href: '/reports', icon: BarChart2, group: 'Duty & Account', permission: 'reports:view', translationKey: 'nav.reports' },
          { id: 'finance_reports', name: 'Financial Reports', href: '/finance-reports', icon: BarChart2, group: 'Duty & Account', permission: 'finance_reports:view', translationKey: 'nav.finance_reports' }
        ];

      case 'admin':
        return [
          { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Daily Workbench', translationKey: 'nav.dashboard' },
          OPD_NAV_ITEM,
          QR_SCANNER_NAV_ITEM,
          { id: 'opd_coordinator', name: 'OPD Coordinator Desk', href: '/opd-coordinator', icon: GitBranch, group: 'Daily Workbench', translationKey: 'nav.opd_coordinator' },
          QUEUE_NAV_ITEM,
          ...allUserMgmtItems,
          { id: 'shifts', name: 'Staff Shifts & Rosters', href: '/shifts', icon: Clock, group: 'Records & Schedule', translationKey: 'nav.shifts' },
          { id: 'departments_admin', name: 'Hospital Departments', href: '/departments-admin', icon: Building2, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.departments' },
          { id: 'services_admin', name: 'Clinical Services', href: '/services-admin', icon: Package, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.services' },
          ...allBoardItems,
          { id: 'reports', name: 'Operational Analytics', href: '/reports', icon: BarChart2, group: 'Duty & Account', permission: 'reports:view', translationKey: 'nav.reports' },
          { id: 'finance_reports', name: 'Financial Reports', href: '/finance-reports', icon: BarChart2, group: 'Duty & Account', permission: 'finance_reports:view', translationKey: 'nav.finance_reports' }
        ];

      case 'super_admin':
        return [
          { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'Daily Workbench', translationKey: 'nav.dashboard' },
          OPD_NAV_ITEM,
          QR_SCANNER_NAV_ITEM,
          { id: 'opd_coordinator', name: 'OPD Coordinator Desk', href: '/opd-coordinator', icon: GitBranch, group: 'Daily Workbench', translationKey: 'nav.opd_coordinator' },
          QUEUE_NAV_ITEM,
          ...allUserMgmtItems,
          { id: 'shifts', name: 'Staff Shifts & Rosters', href: '/shifts', icon: Clock, group: 'Records & Schedule', translationKey: 'nav.shifts' },
          { id: 'departments_admin', name: 'Hospital Departments', href: '/departments-admin', icon: Building2, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.departments' },
          { id: 'services_admin', name: 'Clinical Services', href: '/services-admin', icon: Package, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.services' },
          ...allBoardItems,
          { id: 'audit', name: 'Audit Trail & Security', href: '/audit', icon: Shield, group: 'Duty & Account', permission: 'audit:view', translationKey: 'nav.audit' },
          { id: 'qr_audit', name: 'Patient QR & Safety Audit', href: '/admin/qr-audit', icon: ShieldCheck, group: 'Duty & Account', translationKey: 'nav.qr_audit' },
          { id: 'reports', name: 'Operational Analytics', href: '/reports', icon: BarChart2, group: 'Duty & Account', permission: 'reports:view', translationKey: 'nav.reports' },
          { id: 'finance_reports', name: 'Financial Reports', href: '/finance-reports', icon: BarChart2, group: 'Duty & Account', permission: 'finance_reports:view', translationKey: 'nav.finance_reports' }
        ];

      case 'patient':
      default:
        return [
          { id: 'patient_portal', name: 'My Health Portal', href: '/patient-portal', icon: LayoutDashboard, group: 'Daily Workbench', translationKey: 'nav.patient_portal' },
          { id: 'appointments', name: 'Appointments Schedule', href: '/appointments', icon: Calendar, group: 'Records & Schedule', permission: 'appointments:view', translationKey: 'nav.appointments' },
          { id: 'prescriptions', name: 'Prescriptions', href: '/prescriptions', icon: Pill, group: 'Records & Schedule', permission: 'prescriptions:view', translationKey: 'nav.prescriptions' },
          { id: 'invoices', name: 'Patient Invoices', href: '/invoices', icon: FileText, group: 'Records & Schedule', permission: 'invoices:view', translationKey: 'nav.invoices' }
        ];
    }
  };

  const getWorkloadBadge = (itemId: string, href: string): number | null => {
    const role = user?.role || '';
    if (role === 'nurse' && (itemId === 'nurse_worklist' || href === '/nurse')) {
      return workloadCounts.triage > 0 ? workloadCounts.triage : null;
    }
    if (role === 'doctor' && (itemId === 'consultation' || href === '/consultation')) {
      return workloadCounts.doctorQueue > 0 ? workloadCounts.doctorQueue : null;
    }
    if (role === 'lab_technician' && (itemId === 'lab_dashboard' || href === '/lab-dashboard')) {
      return workloadCounts.labPending > 0 ? workloadCounts.labPending : null;
    }
    if (role === 'pharmacist' && (itemId === 'pharmacy_dashboard' || href === '/pharmacy')) {
      return workloadCounts.pharmacyPending > 0 ? workloadCounts.pharmacyPending : null;
    }
    if (role === 'cashier' && (itemId === 'cashier_pos' || href === '/cashier-workflow')) {
      return workloadCounts.cashierPending > 0 ? workloadCounts.cashierPending : null;
    }
    return null;
  };

  const canScanPatientQr = !!user && [
    'super_admin', 'admin', 'hospital_manager', 'receptionist',
    'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier'
  ].includes(user.role);

  const navItems = getNavigationByRole(user?.role || 'patient').filter(item => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  const isCollapsed = sidebarCollapsed && !sidebarHovered;

  const renderNavLinks = (isDrawer = false) => {
    return (
      <nav className="p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
          const badgeCount = getWorkloadBadge(item.id, item.href);

          return (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => isDrawer && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all relative group cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800/70 border border-transparent'
              }`}
              title={isCollapsed && !isDrawer ? item.name : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-cyan-400 scale-110' : 'group-hover:text-cyan-400 group-hover:scale-105'}`} />
              {(!isCollapsed || isDrawer) && (
                <span className="truncate">{item.name}</span>
              )}
              {badgeCount !== null && (
                <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                  isActive
                    ? 'bg-cyan-500 text-white'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {badgeCount}
                </span>
              )}

              {/* Collapsed Tooltip */}
              {isCollapsed && !isDrawer && (
                <div className="hidden group-hover:flex absolute left-full ml-3 px-3 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-xl shadow-2xl border border-navy-700 whitespace-nowrap z-50 pointer-events-none items-center gap-2">
                  <span>{item.name}</span>
                  {badgeCount !== null && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500 text-white font-mono">
                      {badgeCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    );
  };

  return (
    <>
      {/* ── DESKTOP COLLAPSIBLE SIDEBAR (>= lg) ────────────────────── */}
      <aside
        onMouseEnter={() => sidebarCollapsed && setSidebarHovered(true)}
        onMouseLeave={() => sidebarCollapsed && setSidebarHovered(false)}
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-navy-950/95 backdrop-blur-md border-r border-navy-800/80 transition-all duration-300 select-none ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-navy-800/80 shrink-0">
          <Link to="/" className="flex items-center gap-3 min-w-0 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform shrink-0">
              AKEH
            </div>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <span className="block font-black text-xs text-white truncate">
                  {language === 'am' ? 'ዓለም ከተማ ሆስፒታል' : 'Alem Ketema Hospital'}
                </span>
                <span className="block text-[10px] font-bold text-cyan-400 capitalize truncate">
                  {formatRoleName(user?.role)}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {renderNavLinks(false)}
        </div>

        {/* Sidebar Footer with Collapse Toggle */}
        <div className="p-3 border-t border-navy-800/80 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(prev => !prev)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-navy-800/60 transition cursor-pointer text-xs font-semibold"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="truncate">{language === 'am' ? 'ማሳነሻ' : 'Collapse'}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── TOP NAVIGATION BAR (All screen sizes) ───────────────────── */}
      <header className={`sticky top-0 z-[80] h-14 sm:h-16 px-2.5 sm:px-6 bg-navy-950/98 backdrop-blur-md border-b border-navy-800/80 shadow-md transition-all duration-300 ${
        isCollapsed ? 'lg:pl-22' : 'lg:pl-70'
      }`}>
        <div className="h-full flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Mobile Hamburger & Hospital Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-navy-900 border border-navy-700/80 text-cyan-400 active:scale-95 transition cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 text-cyan-400" />
            </button>

            {/* Mobile Logo Brand */}
            <Link to="/" className="lg:hidden flex items-center gap-1.5 sm:gap-2 select-none shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
                AKEH
              </div>
              <span className="hidden min-[380px]:inline-block font-extrabold text-xs text-white truncate max-w-[75px] min-[420px]:max-w-[120px] sm:max-w-none">
                Alem Ketema
              </span>
            </Link>

            {/* Desktop Patient Search & QR Scanner Pill (>= sm) */}
            <div className="hidden sm:flex items-center rounded-xl border border-navy-700/80 bg-navy-900/60 p-0.5 shadow-2xs hover:border-cyan-500/50 transition">
              <button
                type="button"
                onClick={() => setQuickSearchOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 text-slate-300 hover:text-cyan-400 text-xs transition rounded-lg cursor-pointer"
                title="Search patient by Name, Phone, or MRN (Ctrl + K)"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-xs font-semibold">
                  {language === 'am' ? 'ታካሚ ፈልግ...' : 'Find patient...'}
                </span>
                <kbd className="hidden md:inline-block font-mono text-[10px] bg-navy-800 px-1.5 py-0.5 rounded border border-navy-700 text-slate-400">
                  Ctrl+K
                </kbd>
              </button>

              {canScanPatientQr && (
                <>
                  <div className="h-4 w-px bg-navy-700 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setPatientScannerOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-teal-400 hover:bg-teal-950/40 rounded-lg transition cursor-pointer"
                    title="Scan Patient QR Wristband"
                  >
                    <Scan className="h-3.5 w-3.5 text-teal-400" />
                    <span className="hidden md:inline">Scan QR</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mobile Search Button (< sm) */}
            <button
              type="button"
              onClick={() => setQuickSearchOpen(true)}
              className="sm:hidden flex items-center justify-center w-8 h-8 rounded-xl border border-navy-700/80 bg-navy-900/60 text-cyan-400 hover:bg-navy-800 transition cursor-pointer shrink-0"
              title="Search patient"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Authoritative Duty Status Pill (>= md) */}
            {['doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier'].includes(user?.role || '') && (
              <button
                type="button"
                onClick={() => setDutyModalOpen(true)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer shrink-0 ${
                  dutyStatus?.isOnDuty
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-navy-800 text-slate-400 border-navy-700'
                }`}
                title="Click to view duty details and clock in / out"
              >
                <span className={`w-2 h-2 rounded-full ${dutyStatus?.isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>
                  {dutyStatus?.isOnDuty
                    ? (dutyStatus?.shiftLabel || 'On Duty')
                    : (language === 'am' ? 'ተረኛ አይደለም' : 'Off Duty')}
                </span>
              </button>
            )}

            {/* Staff Role Badge (>= lg) */}
            <div className="hidden lg:flex items-center gap-2 pl-2 pr-3 h-9 rounded-xl bg-navy-900 border border-navy-700/80 shadow-2xs">
              <ProfileAvatar
                userId={user?.id || 0}
                hasPhoto={!!user?.profilePhotoUpdatedAt}
                photoVersion={user?.profilePhotoUpdatedAt}
                initials={(user?.firstName?.[0] || 'U').toUpperCase()}
                className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0"
              />
              <div className="text-left leading-tight min-w-0">
                <span className="block text-xs font-bold text-white truncate max-w-[120px]">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-cyan-400">
                  {formatRoleName(user?.role)}
                </span>
              </div>
            </div>

            {/* Network & Offline Synchronization Status */}
            <NetworkSyncStatus />

            {/* Language Switcher */}
            <LanguageSwitcher variant="pill" />

            {/* Theme Customizer (Visible across mobile, tablet, and desktop) */}
            <div className="relative shrink-0" data-theme-panel>
              <button
                type="button"
                onClick={() => setThemeOpen(!themeOpen)}
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 border ${
                  themeOpen
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-xs ring-2 ring-cyan-500/20'
                    : 'bg-navy-900 hover:bg-navy-800 border-navy-700/80 hover:border-cyan-500/40 text-cyan-400'
                }`}
                title="Customize Theme Accent & Appearance"
                aria-label="Customize Theme Accent & Appearance"
              >
                <Palette className="w-4 h-4 text-cyan-400" />
              </button>

              {themeOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-[#0a1329] rounded-2xl shadow-2xl border border-cyan-500/30 p-4 z-[90] text-white"
                  style={{ backgroundColor: '#0a1329' }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-navy-800 mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-cyan-400" /> Theme Accent & Mode
                    </span>
                    <button
                      type="button"
                      onClick={resetTheme}
                      className="text-[11px] font-semibold text-slate-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-cyan-400" /> Reset
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-navy-950/60 border border-navy-800">
                      <div className="flex items-center gap-2">
                        {isDark ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                        <span className="text-xs text-slate-200 font-bold">
                          {isDark ? 'Dark Mode (Active)' : 'Light Mode (Active)'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDark(!isDark)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                          isDark
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        }`}
                      >
                        {isDark ? (
                          <>
                            <Sun className="w-3.5 h-3.5 text-amber-400" />
                            <span>Light</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Dark</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300 font-medium">Color Hue</span>
                        <span className="text-xs font-mono font-bold text-cyan-300">{Math.round(hue)}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hue}
                        onChange={(e) => setHue(parseInt(e.target.value))}
                        className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300 font-medium">Saturation</span>
                        <span className="text-xs font-mono font-bold text-cyan-300">{Math.round(saturation)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={saturation}
                        onChange={(e) => setSaturation(parseInt(e.target.value))}
                        className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative shrink-0" data-notif-panel>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 border ${
                  notifOpen
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-xs'
                    : 'bg-navy-900 hover:bg-navy-800 border-navy-700/80 hover:border-cyan-500/40 text-slate-200'
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-cyan-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-[#0a1329] rounded-2xl shadow-2xl border border-cyan-500/30 z-[90] overflow-hidden text-white"
                  style={{ backgroundColor: '#0a1329' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-navy-800">
                    <span className="text-xs font-bold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[11px] text-cyan-400 hover:underline cursor-pointer">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-navy-800/80">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">No notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 text-xs ${!n.is_read ? 'bg-cyan-950/30' : ''}`}>
                          <p className="font-bold text-white">{n.title}</p>
                          <p className="text-slate-300 mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Account Settings Cog */}
            <div className="relative shrink-0" data-settings-panel>
              <button
                type="button"
                onClick={() => setSettingsOpen(prev => !prev)}
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl border transition flex items-center justify-center cursor-pointer shrink-0 ${
                  settingsOpen
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-xs ring-2 ring-cyan-500/20'
                    : 'bg-navy-900 hover:bg-navy-800 border-navy-700/80 hover:border-cyan-500/40 text-cyan-400'
                }`}
                title="Account Settings"
                aria-label="Account Settings"
              >
                <Settings className={`w-4 h-4 text-cyan-400 transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Settings Dropdown Popover */}
              {settingsOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-[#0a1329] border border-cyan-500/30 rounded-2xl shadow-2xl p-2 z-[90] text-white"
                  style={{ backgroundColor: '#0a1329' }}
                >
                  <div className="px-3 py-2.5 border-b border-navy-800 mb-1">
                    <p className="text-xs font-bold text-white truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-cyan-400/80 truncate">{user?.email}</p>
                    <span className={`mt-1.5 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase inline-block ${getRoleColor(user?.role || 'patient')}`}>
                      {formatRoleName(user?.role)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); navigate('/dashboard'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-100 hover:text-white hover:bg-navy-800/80 text-left cursor-pointer transition-colors"
                  >
                    <User className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{language === 'am' ? 'የግል መገለጫ' : 'Account Details'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); setDutyModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-100 hover:text-white hover:bg-navy-800/80 text-left cursor-pointer transition-colors"
                  >
                    <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{language === 'am' ? 'የተረኝነት ሁኔታ' : 'Duty Clock In / Out'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); setPrinterModalOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-100 hover:text-white hover:bg-navy-800/80 text-left cursor-pointer transition-colors"
                  >
                    <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{language === 'am' ? 'የፕሪንተር ማስተካከያ' : 'Thermal Printer Setup'}</span>
                  </button>

                  <div className="h-px bg-navy-800/80 my-1" />

                  <button
                    type="button"
                    onClick={() => { setSettingsOpen(false); logout(); navigate('/login'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 text-left cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{language === 'am' ? 'ውጣ' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OVER NAVIGATION DRAWER (< lg) ──────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[95] lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-navy-950 h-full flex flex-col shadow-2xl border-r border-navy-800 z-10">
            {/* Drawer Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-navy-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  AKEH
                </div>
                <span className="font-extrabold text-sm text-white truncate">
                  {language === 'am' ? 'ዓለም ከተማ ሆስፒታል' : 'Alem Ketema Hospital'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close Navigation Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer User Card */}
            <div className="px-4 py-3 border-b border-navy-800 bg-navy-900/60 flex items-center gap-3 shrink-0">
              <ProfileAvatar
                userId={user?.id || 0}
                hasPhoto={!!user?.profilePhotoUpdatedAt}
                photoVersion={user?.profilePhotoUpdatedAt}
                initials={(user?.firstName?.[0] || 'U').toUpperCase()}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs"
              />
              <div className="min-w-0 flex-1 leading-tight">
                <span className="block text-xs font-extrabold text-white truncate">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[10px] text-cyan-400 font-bold uppercase tracking-wider truncate">
                  {formatRoleName(user?.role)}
                </span>
              </div>
            </div>

            {/* Quick Actions in Drawer */}
            <div className="p-3 border-b border-navy-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setSidebarOpen(false); setQuickSearchOpen(true); }}
                className="flex-1 py-2 px-3 bg-navy-900 hover:bg-navy-800 rounded-xl text-xs font-bold text-slate-200 border border-navy-700/80 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Search</span>
              </button>
              {canScanPatientQr && (
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); setPatientScannerOpen(true); }}
                  className="flex-1 py-2 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Scan className="w-3.5 h-3.5 text-teal-400" />
                  <span>Scan QR</span>
                </button>
              )}
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-2">
              {renderNavLinks(true)}
            </div>

            {/* Drawer Theme & Appearance Quick Switcher */}
            <div className="p-3 border-t border-navy-800/80 bg-navy-900/40 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Theme & Mode</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsDark(!isDark)}
                  className="px-2.5 py-1 rounded-lg bg-navy-950 border border-navy-700 text-xs font-bold flex items-center gap-1.5 text-slate-200 hover:text-cyan-400 cursor-pointer transition-colors"
                >
                  {isDark ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Dark</span>
                    </>
                  )}
                </button>
              </div>

              {/* Thermal Printer Setup Shortcut in Drawer */}
              <button
                type="button"
                onClick={() => { setSidebarOpen(false); setPrinterModalOpen(true); }}
                className="w-full py-1.5 px-3 rounded-xl border border-navy-800 bg-navy-950/70 text-xs font-semibold text-slate-300 hover:text-cyan-400 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Thermal Printer Setup</span>
              </button>
            </div>

            {/* Drawer Footer with Duty & Logout */}
            <div className="p-3 border-t border-navy-800 space-y-2 shrink-0">
              {['doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier'].includes(user?.role || '') && (
                <button
                  type="button"
                  onClick={() => { setSidebarOpen(false); setDutyModalOpen(true); }}
                  className="w-full py-2 px-3 rounded-xl border border-navy-700 bg-navy-900 text-xs font-bold flex items-center justify-between cursor-pointer text-slate-200 hover:border-cyan-500/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dutyStatus?.isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span>Duty Shift Status</span>
                  </span>
                  <span className="text-[11px] text-cyan-400 font-extrabold">
                    {dutyStatus?.isOnDuty ? 'On Duty' : 'Off Duty'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSidebarOpen(false); logout(); navigate('/login'); }}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 border border-rose-900/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-rose-900/50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>{language === 'am' ? 'ውጣ' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT WORKSPACE WRAPPER ─────────────────────────── */}
      <div className={`transition-all duration-300 min-w-0 ${
        isCollapsed ? 'lg:pl-18' : 'lg:pl-64'
      }`}>
        {children}
      </div>

      {/* ── Universal Modals ────────────────────────────────────────── */}
      <PatientQuickSearchModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
      />

      <WristbandScannerModal
        isOpen={patientScannerOpen}
        onClose={() => setPatientScannerOpen(false)}
      />

      <CriticalAlertChimeModal />

      {/* Duty Status Modal */}
      {dutyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-500" /> Shift Duty Status
              </h3>
              <button onClick={() => setDutyModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-800">
                <span className="text-slate-500">Current Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full ${
                  dutyStatus?.isOnDuty ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-navy-800 dark:text-slate-300'
                }`}>
                  {dutyStatus?.isOnDuty ? 'Active On-Duty' : 'Off-Duty'}
                </span>
              </div>
              {dutyStatus?.shiftLabel && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-950/60 border border-slate-100 dark:border-navy-800">
                  <span className="text-slate-500">Scheduled Shift:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{dutyStatus.shiftLabel}</span>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-navy-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDutyModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={dutyToggling}
                onClick={toggleClockInOut}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer ${
                  dutyStatus?.isOnDuty
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {dutyToggling ? 'Updating...' : dutyStatus?.isOnDuty ? 'Clock Out' : 'Clock In Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── THERMAL PRINTER SETTINGS MODAL ────────────────────────── */}
      <PrinterSettingsModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
      />
    </>
  );
};

export default GlobalNavigation;
