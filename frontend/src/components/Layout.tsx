import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard, Users, Stethoscope, Calendar, LogOut, Menu, X,
  Activity, Pill, FlaskConical, Bed, FileText, Shield,
  BarChart2, CreditCard, Settings, Bell, MapPin,
  Palette, Sun, Moon, RefreshCw
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const { hue, saturation, isDark, setHue, setSaturation, setIsDark, resetTheme } = useTheme();

  // Fetch notifications on mount
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
    const interval = setInterval(fetchNotifications, 60000); // refresh every 60s
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

  const getNavigationByRole = (role: string): NavItem[] => {
    const common: NavItem[] = [];

    const allItems: NavItem[] = [
      { name: 'Patients', href: '/patients', icon: Users },
      { name: 'Doctors', href: '/doctors', icon: Stethoscope },
      { name: 'Appointments', href: '/appointments', icon: Calendar },
        { name: 'Reception', href: '/reception', icon: Calendar },
        { name: 'Cashier Dashboard', href: '/cashier', icon: CreditCard },
        { name: 'Vitals', href: '/vitals', icon: Activity },
        { name: 'Prescriptions', href: '/prescriptions', icon: Pill },
        { name: 'Lab Tests', href: '/lab-tests', icon: FlaskConical },
        { name: 'Radiology', href: '/radiology', icon: FlaskConical },
        { name: 'Admissions', href: '/admissions', icon: Bed },
        { name: 'Beds', href: '/beds', icon: Bed },
        { name: 'Invoices', href: '/invoices', icon: FileText },
        { name: 'Payments', href: '/payments', icon: CreditCard },
        { name: 'Insurance', href: '/insurance', icon: Shield },
        { name: 'Blood Bank', href: '/blood-bank', icon: MapPin },
        { name: 'Finance Reports', href: '/finance-reports', icon: BarChart2 },
        { name: 'Reports', href: '/reports', icon: BarChart2 },
        { name: 'Audit Logs', href: '/audit', icon: Shield },
        { name: 'System Admin', href: '/admin', icon: Settings },
        { name: 'Users', href: '/user-management', icon: Shield },
      ];

      const roleMap: Record<string, string[]> = {
      super_admin: ['Dashboard','Patients','Doctors','Appointments','Radiology','Insurance','Blood Bank','Reports','Finance Reports','Audit Logs','System Admin','Users'],
      admin: ['Dashboard','Patients','Doctors','Appointments','Admissions','Beds','Invoices','Payments','Medicines','Inventory','Radiology','Insurance','Blood Bank','Reports','Finance Reports','Audit Logs','System Admin','Users','Cashier Dashboard'],
      hospital_manager: ['Dashboard','Patients','Doctors','Appointments','Admissions','Beds','Invoices','Payments','Reports','Finance Reports','Radiology','Insurance','Blood Bank','Cashier Dashboard'],
      receptionist: ['Dashboard','Patients','Appointments','Admissions','Invoices','Payments','Reception'],
      doctor: ['Dashboard','Patients','Appointments','Vitals','Prescriptions','Lab Tests','Admissions','Radiology'],
      nurse: ['Dashboard','Patients','Appointments','Vitals','Admissions','Beds'],
      lab_technician: ['Lab Tests'],
      pharmacist: ['Prescriptions','Medicines','Inventory'],
      cashier: ['Dashboard','Invoices','Payments','Cashier Dashboard','Finance Reports'],
    };

    const allowedItems = roleMap[role] || [];
    return [...common, ...allItems.filter(item => allowedItems.includes(item.name))];
  };

  const { can } = useRoleAccess();
  const navigation = getNavigationByRole(user?.role || 'patient')
    .filter(item => {
      // map nav item name to a permission check where applicable
      const nameToPermission: Record<string, string | null> = {
        'Patients': 'patients:view',
        'Doctors': 'doctors:view',
        'Appointments': 'appointments:view',
        'Reception': 'reception:view',
        'Cashier Dashboard': 'cashier:view',
        'Vitals': 'vitals:view',
        'Prescriptions': 'prescriptions:view',
        'Lab Tests': 'lab_tests:view',
        'Radiology': 'radiology:view',
        'Admissions': 'admissions:view',
        'Beds': 'beds:view',
        'Invoices': 'invoices:view',
        'Payments': 'payments:view',
        'Insurance': 'insurance:view',
        'Blood Bank': 'blood_bank:view',
        'Finance Reports': 'finance_reports:view',
        'Reports': 'reports:view',
        'Audit Logs': 'audit:view',
        'System Admin': 'admin:departments',
        'Users': 'admin:users',
      };
      const perm = nameToPermission[item.name] || null;
      if (!perm) return true; // no guard for this item
      return can(perm);
    });

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-5 border-b border-gray-200 dark:border-gray-700 bg-slate-900">
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-teal-400" />
              </div>
                <span className="text-base font-bold text-white leading-tight">Alem Ketema Enat Hospital</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                              ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/10 dark:text-teal-400 border-l-4 border-teal-500 rounded-r-lg shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-teal-600 dark:text-teal-400' : ''}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${getRoleColor(user?.role || 'patient')}`}>
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
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
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
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
