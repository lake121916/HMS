import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import {
  LayoutDashboard, Users, Stethoscope, Calendar, LogOut, Menu, X,
  Activity, Pill, FlaskConical, Bed, FileText, Shield,
  BarChart2, CreditCard, Settings, Bell, MapPin,
  Palette, Sun, Moon, RefreshCw, ClipboardCheck,
  UserCheck, Building2, Receipt, Package, Scan,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  group?: string;
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
  const { hue, saturation, isDark, setHue, setSaturation, setIsDark, resetTheme } = useTheme();

  // Fetch notifications on mount and poll every 30s
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
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

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

  // Mobile swipe-to-open/close sidebar gesture
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
      // Only register horizontal swipes (not vertical scrolling)
      if (dy > 60) return;
      // Swipe right from left edge (≤ 40px) → open sidebar
      if (dx > 60 && touchStartX <= 40) setSidebarOpen(true);
      // Swipe left when sidebar is open → close sidebar
      if (dx < -60 && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [sidebarOpen]);

  const getNavigationByRole = (role: string): NavItem[] => {
    const dashboardHrefMap: Record<string, string> = {
      super_admin:      '/dashboard',
      admin:            '/dashboard',
      hospital_manager: '/dashboard',
      receptionist:     '/reception-workflow',
      doctor:           '/consultation',
      nurse:            '/nurse',
      lab_technician:   '/lab-dashboard',
      pharmacist:       '/pharmacy',
      cashier:          '/cashier-workflow',
      patient:          '/patient-portal',
    };
    const dashboardHref = dashboardHrefMap[role] || '/dashboard';

    const allItems: NavItem[] = [
      // ── Home / Role Entry Points (no group — always at top) ────────
      { name: 'Dashboard',          href: dashboardHref,         icon: LayoutDashboard },
      { name: 'Patient Portal',     href: '/patient-portal',     icon: LayoutDashboard },
      { name: 'Reception Workflow', href: '/reception-workflow',  icon: UserCheck       },
      { name: 'Triage Worklist',    href: '/nurse',              icon: ClipboardCheck  },
      { name: 'Assign Queue',       href: '/assignment',         icon: Building2       },
      { name: 'My Consultations',   href: '/consultation',       icon: Stethoscope     },
      { name: 'Lab Dashboard',      href: '/lab-dashboard',      icon: FlaskConical    },
      { name: 'Pharmacy',           href: '/pharmacy',           icon: Pill            },
      { name: 'Cashier POS',        href: '/cashier-workflow',   icon: Receipt         },
      // ── PATIENTS group ─────────────────────────────────────────────
      { name: 'Patients',           href: '/patients',           icon: Users,          group: 'PATIENTS'  },
      { name: 'Doctors',            href: '/doctors',            icon: Stethoscope,    group: 'PATIENTS'  },
      { name: 'Appointments',       href: '/appointments',       icon: Calendar,       group: 'PATIENTS'  },
      { name: 'Admissions',         href: '/admissions',         icon: Bed,            group: 'PATIENTS'  },
      // ── CLINICAL group ─────────────────────────────────────────────
      { name: 'Vitals',             href: '/vitals',             icon: Activity,       group: 'CLINICAL'  },
      { name: 'Prescriptions',      href: '/prescriptions',      icon: Pill,           group: 'CLINICAL'  },
      { name: 'Lab Tests',          href: '/lab-tests',          icon: FlaskConical,   group: 'CLINICAL'  },
      { name: 'Radiology',          href: '/radiology',          icon: Scan,           group: 'CLINICAL'  },
      { name: 'Beds',               href: '/beds',               icon: Bed,            group: 'CLINICAL'  },
      { name: 'Blood Bank',         href: '/blood-bank',         icon: MapPin,         group: 'CLINICAL'  },
      { name: 'Medicines',          href: '/medicines',          icon: Pill,           group: 'CLINICAL'  },
      { name: 'Inventory',          href: '/inventory',          icon: Package,        group: 'CLINICAL'  },
      // ── FINANCIALS group ───────────────────────────────────────────
      { name: 'Invoices',           href: '/invoices',           icon: FileText,       group: 'FINANCIALS' },
      { name: 'Payments',           href: '/payments',           icon: CreditCard,     group: 'FINANCIALS' },
      { name: 'Insurance',          href: '/insurance',          icon: Shield,         group: 'FINANCIALS' },
      { name: 'Finance Reports',    href: '/finance-reports',    icon: BarChart2,      group: 'FINANCIALS' },
      { name: 'Reports',            href: '/reports',            icon: BarChart2,      group: 'FINANCIALS' },
      // ── SYSTEM group ───────────────────────────────────────────────
      { name: 'System Admin',       href: '/admin',              icon: Settings,       group: 'SYSTEM'    },
      { name: 'Users',              href: '/user-management',    icon: Users,          group: 'SYSTEM'    },
      { name: 'Services',           href: '/services-admin',     icon: Package,        group: 'SYSTEM'    },
      { name: 'Audit Logs',         href: '/audit',              icon: Shield,         group: 'SYSTEM'    },
    ];

    const roleMap: Record<string, string[]> = {
      super_admin:      ['Dashboard','Patients','Doctors','Appointments','Admissions','Vitals','Prescriptions','Lab Tests','Radiology','Beds','Blood Bank','Medicines','Inventory','Invoices','Payments','Insurance','Finance Reports','Reports','Audit Logs','System Admin','Users','Services','Assign Queue'],
      admin:            ['Dashboard','Patients','Doctors','Appointments','Admissions','Vitals','Prescriptions','Lab Tests','Radiology','Beds','Blood Bank','Medicines','Inventory','Invoices','Payments','Insurance','Finance Reports','Reports','Audit Logs','System Admin','Users','Services','Cashier POS','Assign Queue'],
      hospital_manager: ['Dashboard','Patients','Doctors','Appointments','Admissions','Beds','Invoices','Payments','Insurance','Finance Reports','Reports','Radiology','Blood Bank'],
      receptionist:     ['Reception Workflow','Patients','Appointments','Admissions','Invoices'],
      doctor:           ['Dashboard','My Consultations','Patients','Appointments','Vitals','Prescriptions','Lab Tests','Radiology','Admissions'],
      nurse:            ['Triage Worklist','Patients','Appointments','Vitals','Admissions','Beds'],
      lab_technician:   ['Lab Dashboard','Lab Tests','Patients'],
      pharmacist:       ['Pharmacy','Prescriptions','Medicines','Inventory'],
      cashier:          ['Cashier POS','Invoices','Payments','Finance Reports'],
      patient:          ['Patient Portal','Appointments','Invoices','Prescriptions'],
    };

    const allowedItems = roleMap[role] || [];
    return allItems.filter(item => allowedItems.includes(item.name));
  };

  const { can } = useRoleAccess();
  const navigation = getNavigationByRole(user?.role || 'patient')
    .filter(item => {
      // map nav item name to a permission check where applicable
      const nameToPermission: Record<string, string | null> = {
        'Patients':        'patients:view',
        'Doctors':         'doctors:view',
        'Appointments':    'appointments:view',
        'Vitals':          'vitals:view',
        'Prescriptions':   'prescriptions:view',
        'Lab Tests':       'lab_tests:view',
        'Radiology':       'radiology:view',
        'Admissions':      'admissions:view',
        'Beds':            'beds:view',
        'Invoices':        'invoices:view',
        'Payments':        'payments:view',
        'Insurance':       'insurance:view',
        'Blood Bank':      'blood_bank:view',
        'Medicines':       'medicines:view',
        'Inventory':       'inventory:view',
        'Finance Reports': 'finance_reports:view',
        'Reports':         'reports:view',
        'Audit Logs':      'audit:view',
        'System Admin':    'admin:departments',
        'Users':           'admin:users',
      };
      const perm = nameToPermission[item.name] || null;
      if (!perm) return true; // no guard for workflow/role entry items
      return can(perm);
    });

  const navTranslationMap: Record<string, string> = {
    'Dashboard':          'nav.dashboard',
    'Patient Portal':     'nav.patient_portal',
    'Patients':           'nav.patients',
    'Doctors':            'nav.doctors',
    'Appointments':       'nav.appointments',
    'Reception Workflow': 'nav.reception',
    'Triage Worklist':    'nav.triage',
    'Assign Queue':       'nav.assign_queue',
    'My Consultations':   'nav.consultations',
    'Lab Dashboard':      'nav.lab',
    'Pharmacy':           'nav.pharmacy',
    'Cashier POS':        'nav.cashier',
    'Vitals':             'nav.vitals',
    'Prescriptions':      'nav.prescriptions',
    'Lab Tests':          'nav.lab_tests',
    'Radiology':          'nav.radiology',
    'Admissions':         'nav.admissions',
    'Beds':               'nav.beds',
    'Invoices':           'nav.invoices',
    'Payments':           'nav.payments',
    'Insurance':          'cashier.insurance',
    'Blood Bank':         'nav.blood_bank',
    'Medicines':          'nav.medicines',
    'Inventory':          'nav.inventory',
    'Finance Reports':    'nav.finance_reports',
    'Reports':            'nav.reports',
    'Audit Logs':         'nav.audit',
    'System Admin':       'nav.admin',
    'Users':              'nav.users',
    'Services':           'nav.services',
  };

  // Pre-compute grouped nav for sidebar rendering
  // isExpanded = full sidebar visible (either not collapsed, OR collapsed but mouse is hovering)
  const isExpanded = !sidebarCollapsed || sidebarHovered;
  const showGroups = navigation.length >= 7;
  const groupedNav = navigation.reduce<{ group: string; items: NavItem[] }[]>((acc, item) => {
    const g = item.group || '';
    const existing = acc.find(x => x.group === g);
    if (existing) { existing.items.push(item); return acc; }
    acc.push({ group: g, items: [item] });
    return acc;
  }, []);

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

          {/* ── Logo + Collapse Toggle ─────────────────────────────── */}
          <div className={`flex items-center h-16 border-b border-white/10 bg-secondary/95 px-3 flex-shrink-0
            ${isExpanded ? 'justify-between' : 'justify-center'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <img
                src="/images/hospital.jpg.webp"
                alt="Alem Ketema Enat Hospital"
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              />
              {isExpanded && (
                <span className="text-sm font-bold text-white leading-tight truncate">
                  {language === 'am' ? 'አለም ከተማ እናት ሆስፒታል' : 'Alem Ketema Enat'}
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Desktop collapse/expand toggle — only when not in hover-fly-out mode */}
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
                {/* Mobile close */}
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* ── Role Identity Strip ────────────────────────────────── */}
          {isExpanded ? (
            <div className={`mx-3 mt-3 rounded-xl px-3 py-2 border flex-shrink-0 ${getRoleColor(user?.role || 'patient')}`}>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-widest truncate">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mt-3 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${getRoleColor(user?.role || 'patient')}`}>
                {(user?.role || 'G')[0].toUpperCase()}
              </div>
            </div>
          )}

          {/* ── Navigation ────────────────────────────────────────── */}
          <nav className={`flex-1 py-3 overflow-y-auto overflow-x-hidden ${isExpanded ? 'px-2' : 'px-1.5'}`}>
            {groupedNav.map(({ group, items }) => (
              <div key={group || 'main'}>
                {/* Section group header — only when fully expanded and nav is large */}
                {showGroups && group && isExpanded && (
                  <div className="flex items-center gap-2 px-2 pt-4 pb-1.5">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">{group}</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                {items.map(item => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
                  const translatedLabel = t(navTranslationMap[item.name] || item.name, item.name);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      title={!isExpanded ? translatedLabel : undefined}
                      onClick={() => { setSidebarOpen(false); setSidebarHovered(false); }}
                      className={`relative flex items-center rounded-xl transition-all duration-200 my-0.5 group
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

                      {/* Trailing dot for active item */}
                      {isExpanded && isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 flex-shrink-0 shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* ── User Card & Logout ────────────────────────────────── */}
          <div className={`border-t border-white/10 bg-black/20 flex-shrink-0 ${isExpanded ? 'p-4' : 'p-2'}`}>
            {isExpanded ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ring-2 ring-white/10">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold capitalize ${getRoleColor(user?.role || 'patient')}`}>
                      {user?.role?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.logout', 'Sign Out')}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ring-2 ring-white/10">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 lg:flex items-center hidden">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString(language === 'am' ? 'am-ET' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher variant="pill" />

            {/* Theme Customizer Popover */}
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
                    {/* Theme Presets */}
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

                    {/* Hue Adjustment Slider */}
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

                    {/* Saturation Adjustment Slider */}
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

                    {/* Dark/Light Mode */}
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

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300 capitalize">{user?.role?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
