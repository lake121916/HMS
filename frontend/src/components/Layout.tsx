import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import PatientQuickSearchModal from './PatientQuickSearchModal';
import api from '../services/api';
import OfflineStatusBanner from './OfflineStatusBanner';
import {
  LayoutDashboard, Users, Stethoscope, Calendar, Clock, LogOut, Menu, X,
  Activity, Pill, FlaskConical, Bed, FileText, Shield,
  BarChart2, CreditCard, Settings, Bell,
  Palette, Sun, Moon, RefreshCw, ClipboardCheck,
  UserCheck, Building2, Receipt, Package, Scan,
  ChevronLeft, ChevronRight, User, Key, Eye, EyeOff,
  CheckCircle2, AlertCircle, Search, Loader2,
  Baby, GraduationCap, BookOpen, BarChart3
} from 'lucide-react';

interface NavItem {
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

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarHovered, setSidebarHovered] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = React.useState(false);

  // Live Workload & Authoritative Duty State (Phase 3 & Phase 4)
  const [workloadCounts, setWorkloadCounts] = React.useState({
    triage: 0,
    doctorQueue: 0,
    labPending: 0,
    pharmacyPending: 0,
    cashierPending: 0,
    activeAdmissions: 0
  });
  const [dutyStatus, setDutyStatus] = React.useState<{
    isOnDuty: boolean;
    hasScheduledShift: boolean;
    shiftId: number | null;
    shiftType: string;
    shiftLabel: string;
    startTime: string | null;
    endTime: string | null;
    department: string | null;
  } | null>(null);
  const [dutyModalOpen, setDutyModalOpen] = React.useState(false);
  const [dutyToggling, setDutyToggling] = React.useState(false);

  // Universal Quick-Search State (Phase 5)
  const [quickSearchOpen, setQuickSearchOpen] = React.useState(false);

  // Change password form state
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showOldPass, setShowOldPass] = React.useState(false);
  const [showNewPass, setShowNewPass] = React.useState(false);
  const [showConfirmPass, setShowConfirmPass] = React.useState(false);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordSuccess, setPasswordSuccess] = React.useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword.length < 6) {
      setPasswordError(language === 'am' ? 'አዲሱ የይለፍ ቃል ቢያንስ 6 ፊደላት መሆን አለበት' : 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'am' ? 'አዲሶቹ የይለፍ ቃሎች አይዛመዱም' : 'New passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setPasswordSuccess(language === 'am' ? 'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል!' : 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setChangePasswordModalOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || (language === 'am' ? 'የይለፍ ቃል መቀየር አልተሳካም' : 'Failed to change password'));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Close settings dropdown on outside click
  React.useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-settings-panel]')) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  const { hue, saturation, isDark, setHue, setSaturation, setIsDark, resetTheme } = useTheme();

  // Fetch notifications
  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/notifications?limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unread || 0);
        }
      } catch (_) {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Workload Summary & Authoritative Duty Status (Phase 3 & Phase 4)
  const fetchWorkloadSummary = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await api.get('/workload/summary');
      if (res.data?.success) {
        setWorkloadCounts(res.data.data.counts || {});
        setDutyStatus(res.data.data.dutyStatus || null);
      }
    } catch (_) {}
  }, []);

  React.useEffect(() => {
    fetchWorkloadSummary();
    const interval = setInterval(fetchWorkloadSummary, 20000);
    return () => clearInterval(interval);
  }, [fetchWorkloadSummary]);

  // Global Keyboard Shortcut: Ctrl + K (or Cmd + K) for Universal Quick Search
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Duty Toggle Handler
  const handleToggleDuty = async () => {
    setDutyToggling(true);
    try {
      const res = await api.post('/workload/duty-toggle');
      if (res.data?.success) {
        setDutyStatus(prev => prev ? {
          ...prev,
          isOnDuty: res.data.data.isOnDuty
        } : null);
      }
    } catch (err) {
      console.error('Failed to toggle duty:', err);
    } finally {
      setDutyToggling(false);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  // Close notification dropdown on outside click
  React.useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notif-panel]')) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  // Close theme dropdown on outside click
  React.useEffect(() => {
    if (!themeOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-theme-panel]')) setThemeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [themeOpen]);

  // Mobile swipe gestures
  React.useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
      if (dy > 60) return;
      if (dx > 60 && touchStartX <= 40) setSidebarOpen(true);
      if (dx < -60 && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [sidebarOpen]);

  // ══════════════════════════════════════════════════════════════
  // ROLE-BASED NAVIGATION WITH STRICT GROUP ARCHITECTURE
  // 1. Daily Workbench   2. Records & Schedule   3. Board & Administrative Services   4. Duty & Account
  // ══════════════════════════════════════════════════════════════
  const BOARD_NAV_ITEMS: Record<string, NavItem> = {
    birth_certificates: { id: 'birth_certificates', name: 'Birth Certificates', href: '/board/birth-certificates', icon: Baby, group: 'Board & Administrative Services', translationKey: 'nav.birth_certificates' },
    death_certificates: { id: 'death_certificates', name: 'Death Certificates', href: '/board/death-certificates', icon: FileText, group: 'Board & Administrative Services', translationKey: 'nav.death_certificates' },
    scholarships: { id: 'scholarships', name: 'Scholarships', href: '/board/scholarships', icon: GraduationCap, group: 'Board & Administrative Services', translationKey: 'nav.scholarships' },
    specializations: { id: 'specializations', name: 'Medical Specialization', href: '/board/specializations', icon: Stethoscope, group: 'Board & Administrative Services', translationKey: 'nav.specializations' },
    training: { id: 'training', name: 'Training & Development', href: '/board/training', icon: BookOpen, group: 'Board & Administrative Services', translationKey: 'nav.training' },
    board_members: { id: 'board_members', name: 'Board Members', href: '/board/members', icon: Users, group: 'Board & Administrative Services', translationKey: 'nav.board_members' },
    board_meetings: { id: 'board_meetings', name: 'Board Meetings', href: '/board/meetings', icon: Calendar, group: 'Board & Administrative Services', translationKey: 'nav.board_meetings' },
    board_reports: { id: 'board_reports', name: 'Reports & Statistics', href: '/board/reports', icon: BarChart3, group: 'Board & Administrative Services', translationKey: 'nav.board_reports' }
  };

  const allBoardItems = Object.values(BOARD_NAV_ITEMS);

  const getNavigationByRole = (role: string): NavItem[] => {
    switch (role) {
      case 'receptionist':
        return [
          { id: 'reception_workflow', name: 'Reception & Intake Desk', href: '/reception-workflow', icon: UserCheck, group: 'Daily Workbench', translationKey: 'nav.reception' },
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'appointments', name: 'Appointments Schedule', href: '/appointments', icon: Calendar, group: 'Records & Schedule', permission: 'appointments:view', translationKey: 'nav.appointments' }
        ];

      case 'nurse':
        return [
          { id: 'nurse_worklist', name: 'Triage & Nursing Worklist', href: '/nurse', icon: ClipboardCheck, group: 'Daily Workbench', translationKey: 'nav.triage' },
          { id: 'vitals', name: 'Vital Signs & Triage', href: '/vitals', icon: Activity, group: 'Daily Workbench', permission: 'vitals:view', translationKey: 'nav.vitals' },
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'beds', name: 'Ward & Bed Management', href: '/beds', icon: Bed, group: 'Records & Schedule', permission: 'beds:view', translationKey: 'nav.beds' },
          { id: 'admissions', name: 'Inpatient Admissions', href: '/admissions', icon: Bed, group: 'Records & Schedule', permission: 'admissions:view', translationKey: 'nav.admissions' },
          BOARD_NAV_ITEMS.birth_certificates,
          BOARD_NAV_ITEMS.scholarships,
          BOARD_NAV_ITEMS.specializations,
          BOARD_NAV_ITEMS.training,
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'doctor':
        return [
          { id: 'consultation', name: 'Clinical Consultations', href: '/consultation', icon: Stethoscope, group: 'Daily Workbench', translationKey: 'nav.consultations' },
          { id: 'vitals', name: 'Vital Signs & Triage', href: '/vitals', icon: Activity, group: 'Daily Workbench', permission: 'vitals:view', translationKey: 'nav.vitals' },
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          { id: 'prescriptions', name: 'Prescriptions', href: '/prescriptions', icon: Pill, group: 'Records & Schedule', permission: 'prescriptions:view', translationKey: 'nav.prescriptions' },
          { id: 'lab_tests', name: 'Laboratory Orders', href: '/lab-tests', icon: FlaskConical, group: 'Records & Schedule', permission: 'lab_tests:view', translationKey: 'nav.lab_tests' },
          { id: 'radiology', name: 'Radiology & Imaging', href: '/radiology', icon: Scan, group: 'Records & Schedule', permission: 'radiology:view', translationKey: 'nav.radiology' },
          { id: 'appointments', name: 'Appointments Schedule', href: '/appointments', icon: Calendar, group: 'Records & Schedule', permission: 'appointments:view', translationKey: 'nav.appointments' },
          BOARD_NAV_ITEMS.birth_certificates,
          BOARD_NAV_ITEMS.death_certificates,
          BOARD_NAV_ITEMS.scholarships,
          BOARD_NAV_ITEMS.specializations,
          BOARD_NAV_ITEMS.training,
          BOARD_NAV_ITEMS.board_reports,
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'lab_technician':
        return [
          { id: 'lab_dashboard', name: 'Laboratory Worklist', href: '/lab-dashboard', icon: FlaskConical, group: 'Daily Workbench', translationKey: 'nav.lab' },
          { id: 'lab_tests', name: 'Laboratory Orders', href: '/lab-tests', icon: FlaskConical, group: 'Records & Schedule', permission: 'lab_tests:view', translationKey: 'nav.lab_tests' },
          { id: 'patients', name: 'Patient Directory', href: '/patients', icon: Users, group: 'Records & Schedule', permission: 'patients:view', translationKey: 'nav.patients' },
          BOARD_NAV_ITEMS.scholarships,
          BOARD_NAV_ITEMS.training,
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'pharmacist':
        return [
          { id: 'pharmacy_dashboard', name: 'Pharmacy & Dispensing', href: '/pharmacy', icon: Pill, group: 'Daily Workbench', translationKey: 'nav.pharmacy' },
          { id: 'prescriptions', name: 'Prescriptions', href: '/prescriptions', icon: Pill, group: 'Records & Schedule', permission: 'prescriptions:view', translationKey: 'nav.prescriptions' },
          { id: 'medicines', name: 'Pharmaceutical Catalog', href: '/medicines', icon: Pill, group: 'Records & Schedule', permission: 'medicines:view', translationKey: 'nav.medicines' },
          { id: 'inventory', name: 'Stock & Inventory', href: '/inventory', icon: Package, group: 'Records & Schedule', permission: 'inventory:view', translationKey: 'nav.inventory' },
          BOARD_NAV_ITEMS.scholarships,
          BOARD_NAV_ITEMS.training,
          { id: 'shifts', name: 'Staff Shifts & Roster', href: '/shifts', icon: Clock, group: 'Duty & Account', translationKey: 'nav.shifts' }
        ];

      case 'cashier':
        return [
          { id: 'cashier_pos', name: 'Cashier POS & Register', href: '/cashier-workflow', icon: Receipt, group: 'Daily Workbench', translationKey: 'nav.cashier' },
          { id: 'invoices', name: 'Patient Invoices', href: '/invoices', icon: FileText, group: 'Records & Schedule', permission: 'invoices:view', translationKey: 'nav.invoices' },
          { id: 'payments', name: 'Payment Transactions', href: '/payments', icon: CreditCard, group: 'Records & Schedule', permission: 'payments:view', translationKey: 'nav.payments' },
          BOARD_NAV_ITEMS.training,
          { id: 'finance_reports', name: 'Financial Reports', href: '/finance-reports', icon: BarChart2, group: 'Duty & Account', permission: 'finance_reports:view', translationKey: 'nav.finance_reports' }
        ];

      case 'hospital_manager':
        return [
          { id: 'dashboard', name: 'Hospital Overview', href: '/dashboard', icon: LayoutDashboard, group: 'Daily Workbench', translationKey: 'nav.dashboard' },
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
          { id: 'admin', name: 'Admin Control Center', href: '/admin', icon: Settings, group: 'Daily Workbench', permission: 'admin:departments', translationKey: 'nav.admin' },
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
          { id: 'admin', name: 'Super Admin Center', href: '/admin', icon: Settings, group: 'Daily Workbench', permission: 'admin:departments', translationKey: 'nav.admin' },
          { id: 'shifts', name: 'Staff Shifts & Rosters', href: '/shifts', icon: Clock, group: 'Records & Schedule', translationKey: 'nav.shifts' },
          { id: 'departments_admin', name: 'Hospital Departments', href: '/departments-admin', icon: Building2, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.departments' },
          { id: 'services_admin', name: 'Clinical Services', href: '/services-admin', icon: Package, group: 'Records & Schedule', permission: 'admin:departments', translationKey: 'nav.services' },
          ...allBoardItems,
          { id: 'audit', name: 'Audit Trail & Security', href: '/audit', icon: Shield, group: 'Duty & Account', permission: 'audit:view', translationKey: 'nav.audit' },
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

  const { can } = useRoleAccess();
  const navigation = getNavigationByRole(user?.role || 'patient')
    .filter(item => {
      if (!item.permission) return true;
      return can(item.permission);
    });

  const getGroupTitle = (groupName: string): string => {
    if (groupName === 'Daily Workbench') return language === 'am' ? 'ዕለታዊ የሥራ ጠረጴዛ' : 'Daily Workbench';
    if (groupName === 'Records & Schedule') return language === 'am' ? 'መዛግብት እና መርሃ ግብር' : 'Records & Schedule';
    if (groupName === 'Board & Administrative Services') return language === 'am' ? 'የቦርድ እና አስተዳደራዊ አገልግሎቶች' : 'Board & Administrative Services';
    if (groupName === 'Duty & Account') return language === 'am' ? 'ተረኝነት እና መለያ' : 'Duty & Account';
    return groupName;
  };

  const groupedNav = React.useMemo(() => {
    const groups: { name: string; items: NavItem[] }[] = [];
    const orderedGroups = ['Daily Workbench', 'Records & Schedule', 'Board & Administrative Services', 'Duty & Account'];

    orderedGroups.forEach(gName => {
      const matchingItems = navigation.filter(item => item.group === gName);
      if (matchingItems.length > 0) {
        groups.push({ name: gName, items: matchingItems });
      }
    });

    return groups;
  }, [navigation]);

  // Live workload badge count helper
  const getItemBadge = (itemId: string, href: string): number | null => {
    const role = user?.role || '';
    if (role === 'nurse' && (itemId === 'nurse_worklist' || href === '/nurse')) {
      return workloadCounts.triage > 0 ? workloadCounts.triage : null;
    }
    if (role === 'doctor' && (itemId === 'consultation' || href === '/consultation')) {
      return workloadCounts.doctorQueue > 0 ? workloadCounts.doctorQueue : null;
    }
    if (role === 'lab_technician' && (itemId === 'lab_dashboard' || href === '/lab-dashboard' || href === '/lab-tests')) {
      return workloadCounts.labPending > 0 ? workloadCounts.labPending : null;
    }
    if (role === 'pharmacist' && (itemId === 'pharmacy_dashboard' || href === '/pharmacy' || href === '/prescriptions')) {
      return workloadCounts.pharmacyPending > 0 ? workloadCounts.pharmacyPending : null;
    }
    if (role === 'cashier' && (itemId === 'cashier_pos' || href === '/cashier-workflow' || href === '/invoices')) {
      return workloadCounts.cashierPending > 0 ? workloadCounts.cashierPending : null;
    }
    if ((role === 'hospital_manager' || role === 'admin') && href === '/admissions') {
      return workloadCounts.activeAdmissions > 0 ? workloadCounts.activeAdmissions : null;
    }
    return null;
  };

  // isExpanded = full sidebar visible
  const isExpanded = !sidebarCollapsed || sidebarHovered;

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      doctor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      nurse: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      receptionist: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      pharmacist: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      cashier: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      lab_technician: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      hospital_manager: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      patient: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[role] || colors.patient;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        onMouseEnter={() => sidebarCollapsed && setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 bg-secondary text-white transform transition-all duration-300 ease-in-out lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isExpanded ? 'w-64' : 'w-16'}
          ${sidebarCollapsed && sidebarHovered ? 'shadow-[4px_0_32px_rgba(0,0,0,0.45)]' : 'shadow-2xl'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between h-14 px-3 border-b border-white/10 flex-shrink-0">
            {isExpanded ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xs font-black tracking-tight leading-tight truncate text-white">
                    {language === 'am' ? 'አለም ከተማ እናት' : 'ALEM KETEMA ENAT'}
                  </h1>
                  <p className="text-[10px] text-white/50 font-medium tracking-wider uppercase leading-none truncate">
                    {language === 'am' ? 'ጠቅላላ ሆስፒታል' : 'GENERAL HOSPITAL'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
                  <Activity className="w-4 h-4 text-white" />
                </div>
              </div>
            )}

            {/* Collapse / Close toggle buttons */}
            <div className="flex items-center">
              {isExpanded && (
                <>
                  {!sidebarHovered && (
                    <button
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title={sidebarCollapsed ? 'Pin Sidebar Open' : 'Collapse Sidebar'}
                    >
                      {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                  )}
                  {sidebarHovered && (
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      title="Pin sidebar open"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Navigation List (Grouped into exactly 3 Sections) ────────── */}
          <nav className={`flex-1 py-3 overflow-y-auto overflow-x-hidden ${isExpanded ? 'px-2' : 'px-1.5'}`}>
            {groupedNav.map((group, gIdx) => {
              const groupTitle = getGroupTitle(group.name);
              return (
                <div key={group.name} className={gIdx > 0 ? 'mt-3.5 pt-2.5 border-t border-white/[0.08]' : ''}>
                  {isExpanded ? (
                    <div className="px-3 pb-1.5 pt-0.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40 select-none">
                      <span>{groupTitle}</span>
                      <span className="text-[9px] font-mono text-white/30">{group.items.length}</span>
                    </div>
                  ) : (
                    gIdx > 0 && <div className="h-[1px] bg-white/10 my-2 mx-1" />
                  )}

                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const isActive = location.pathname === item.href ||
                        (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
                      const translatedLabel = t(item.translationKey, item.name);
                      const badgeCount = getItemBadge(item.id, item.href);

                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          title={!isExpanded ? `${groupTitle}: ${translatedLabel}` : undefined}
                          onClick={() => { setSidebarOpen(false); setSidebarHovered(false); }}
                          className={`relative flex items-center rounded-xl transition-all duration-200 group
                            ${isExpanded ? 'px-3 py-2.5 gap-3' : 'justify-center p-2.5'}
                            ${
                              isActive
                                ? 'bg-gradient-to-r from-white/[0.18] to-white/[0.08] text-white ring-1 ring-inset ring-white/[0.15] shadow-[0_2px_12px_rgba(0,0,0,0.15)]'
                                : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
                            }`}
                        >
                          {/* Active left accent bar */}
                          {isActive && isExpanded && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/80 rounded-r-full" />
                          )}
                          {/* Active icon glow dot for collapsed */}
                          {isActive && !isExpanded && (
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/90" />
                          )}

                          <item.icon
                            className={`flex-shrink-0 transition-all duration-200
                              ${isExpanded ? 'w-4 h-4' : 'w-5 h-5'}
                              ${isActive
                                ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]'
                                : 'text-white/50 group-hover:text-white/90'
                              }`}
                          />

                          {isExpanded && (
                            <span className={`truncate text-sm flex-1 transition-colors duration-200
                              ${isActive ? 'font-semibold' : 'font-medium'}`}>
                              {translatedLabel}
                            </span>
                          )}

                          {/* Live Workload Counter Badge (Phase 3) */}
                          {badgeCount !== null && (
                            <span
                              className={`${isExpanded ? 'ml-auto' : 'absolute -top-1 -right-1'} px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none bg-amber-400 text-slate-950 shadow-sm animate-pulse`}
                              title={`${badgeCount} pending`}
                            >
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}

                          {/* Trailing dot for active item when no badge */}
                          {isExpanded && isActive && badgeCount === null && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top Navigation Bar (Phase 4 & Phase 5) */}
        <div className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Universal Patient Quick Search Trigger (Phase 5) */}
            <button
              onClick={() => setQuickSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs transition-colors"
              title="Search patients (Ctrl + K)"
            >
              <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-xs">
                {language === 'am' ? 'ታካሚ ፈልግ... (Ctrl + K)' : 'Search patient... (Ctrl + K)'}
              </span>
              <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-400">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Authoritative Duty Status Pill (Phase 4.2) */}
            {['doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier'].includes(user?.role || '') && (
              <button
                type="button"
                onClick={() => setDutyModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  dutyStatus?.isOnDuty
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-200'
                }`}
                title="Click to view duty details and clock in / out"
              >
                <span className={`w-2 h-2 rounded-full ${dutyStatus?.isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="hidden sm:inline">
                  {dutyStatus?.isOnDuty
                    ? (dutyStatus?.shiftLabel || 'On Duty')
                    : (language === 'am' ? 'ተረኛ አይደለም' : 'Off Duty')}
                </span>
                <span className="sm:hidden">
                  {dutyStatus?.isOnDuty ? 'On Duty' : 'Off Duty'}
                </span>
              </button>
            )}

            {/* Staff Full Name & Primary Role Badge (Phase 4.1) */}
            <div className="hidden md:flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                {(user?.firstName?.[0] || 'U').toUpperCase()}
              </div>
              <div className="text-left leading-tight min-w-0">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[120px]">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher variant="pill" />

            {/* Theme Customizer */}
            <div className="relative" data-theme-panel>
              <button
                onClick={() => setThemeOpen(!themeOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Customize Colors"
                title="Customize Theme"
              >
                <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
              </button>

              {themeOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 mb-3">
                    <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-blue-600" /> Customize Theme
                    </span>
                    <button
                      onClick={resetTheme}
                      className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 flex items-center gap-1"
                      title="Reset to Default"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reset
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-2">Preset Themes</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: 'Blue', hue: 221.2, sat: 83.2, color: 'bg-blue-600' },
                          { name: 'Green', hue: 142.1, sat: 76.2, color: 'bg-emerald-600' },
                          { name: 'Purple', hue: 262.1, sat: 83.3, color: 'bg-purple-600' },
                          { name: 'Teal', hue: 174.7, sat: 83.9, color: 'bg-teal-600' },
                          { name: 'Orange', hue: 24.6, sat: 95.0, color: 'bg-orange-600' },
                          { name: 'Rose', hue: 346.8, sat: 87.2, color: 'bg-rose-600' },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => { setHue(preset.hue); setSaturation(preset.sat); }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 w-full"
                          >
                            <span className={`w-3 h-3 rounded-full ${preset.color} shrink-0`} />
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Custom Color Hue</span>
                        <span className="text-xs text-gray-400 font-mono">{Math.round(hue)}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hue}
                        onChange={(e) => setHue(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        style={{
                          background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ec4899, #ef4444)'
                        }}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Color Saturation</span>
                        <span className="text-xs text-gray-400 font-mono">{Math.round(saturation)}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="100"
                        value={saturation}
                        onChange={(e) => setSaturation(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Dark Appearance</span>
                      <button
                        type="button"
                        onClick={() => setIsDark(!isDark)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-gray-500" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative" data-notif-panel>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-6">No notifications</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <p className={`text-xs font-semibold mb-0.5 ${!n.is_read ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Account Settings Dropdown */}
            <div className="relative shrink-0" data-settings-panel>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsOpen(prev => !prev);
                }}
                className={`w-9 h-9 rounded-xl border transition-colors flex items-center justify-center cursor-pointer select-none shrink-0 ${
                  settingsOpen
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
                title={language === 'am' ? 'መቼቶች' : 'Settings (Profile, Change Password, Sign Out)'}
                aria-label="Account Settings"
              >
                <Settings className={`w-5 h-5 transition-transform duration-200 ${settingsOpen ? 'rotate-90 text-emerald-500' : ''}`} />
              </button>

              {settingsOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-slate-800 dark:text-white"
                  style={{ opacity: 1, visibility: 'visible' }}
                >
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-black truncate text-slate-900 dark:text-white">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{user?.email}</p>
                    <span className={`mt-1.5 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block ${getRoleColor(user?.role || 'patient')}`}>
                      {user?.role?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{t('auth.profile', 'Profile')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      setChangePasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <Key className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{t('auth.change_password', 'Change Password')}</span>
                  </button>

                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{t('nav.logout', 'Sign Out')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <OfflineStatusBanner />
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* ── Universal Patient Quick-Search Modal (Phase 5) ──────────── */}
      <PatientQuickSearchModal
        isOpen={quickSearchOpen}
        onClose={() => setQuickSearchOpen(false)}
      />

      {/* ── Duty Status Modal (Phase 4.3) ───────────────────────────── */}
      {dutyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setDutyModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {language === 'am' ? 'የተረኝነት ሁኔታ' : 'Authoritative Duty Status'}
                </h3>
              </div>
              <button
                onClick={() => setDutyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full ${
                  dutyStatus?.isOnDuty
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {dutyStatus?.isOnDuty ? '🟢 Active On Duty' : '⚪ Off Duty'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Scheduled Shift:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dutyStatus?.shiftLabel || 'Standard Hospital Schedule'}
                </span>
              </div>

              {dutyStatus?.startTime && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Shift Hours:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {dutyStatus.startTime} - {dutyStatus.endTime}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dutyStatus?.department || 'Alem Ketema Enat Hospital'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={dutyToggling}
                onClick={handleToggleDuty}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  dutyStatus?.isOnDuty
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {dutyToggling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : dutyStatus?.isOnDuty ? (
                  'Clock Out / Go Off Duty'
                ) : (
                  'Clock In / Go On Duty'
                )}
              </button>

              {user?.role !== 'receptionist' && (
                <Link
                  to="/shifts"
                  onClick={() => setDutyModalOpen(false)}
                  className="text-center text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 py-1"
                >
                  View Full Hospital Roster →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── User Profile Modal ────────────────────────────────────── */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black text-lg shadow-md">
                  {(user?.firstName?.[0] || 'U').toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    {t('common.role', 'Assigned Role')}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getRoleColor(user?.role || 'patient')}`}>
                    {user?.role?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                    {t('common.status', 'Account Status')}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Facility Location:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Alem Ketema Enat Hospital</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Zone / Region:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">North Shewa, Amhara, Ethiopia</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">User ID:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">USR-{String(user?.id || '').padStart(5, '0')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ──────────────────────────────────── */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 font-bold shadow-md">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {t('auth.change_password', 'Change Password')}
                  </h3>
                  <p className="text-xs text-slate-400">Update your system credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.current_password', 'Current Password')}
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.new_password', 'New Password')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.confirm_password', 'Confirm New Password')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 pr-10"
                    placeholder="Re-type new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {passwordLoading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                  ) : (
                    t('common.save', 'Save Changes')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
