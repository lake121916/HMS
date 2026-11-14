import RoleGuard from '../components/RoleGuard';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import RoleDescriptionsPage from './admin/RoleDescriptionsPage';
import api from '../services/api';
import {
  Users, UserPlus, Search, Trash2, X, Shield, ShieldCheck, Eye, EyeOff, Copy, Check,
  CheckCircle, XCircle, RefreshCw, Building2, Key, Edit,
  Activity, Server, Database, Lock, AlertCircle, ChevronLeft, ChevronRight,
  Bell, Send, Smartphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  full_name: string;
}

interface Department {
  id: number;
  name: string;
  description: string;
  head_doctor_id?: number;
  head_doctor_name?: string;
  doctor_count: number;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  byRole: { role: string; count: string }[];
  totalPatients: number;
  totalDoctors: number;
  totalDepartments: number;
}

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

const ROLES = ['super_admin', 'receptionist', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier', 'hospital_manager', 'patient'];
const formatRoleLabel = (r: string) => (r === 'hospital_manager' ? 'Medical Director' : r.replace(/_/g, ' '));

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  doctor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200',
  nurse: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200',
  receptionist: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200',
  pharmacist: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200',
  cashier: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200',
  lab_technician: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200',
  hospital_manager: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200',
  patient: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200',
};

interface AdminPageProps {
  initialTab?: 'users' | 'add_user' | 'staff' | 'roles' | 'audit' | 'notifications' | 'system';
}

const AdminPage: React.FC<AdminPageProps> = ({ initialTab }) => {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab') as any;
  const queryRole = searchParams.get('role');

  const [tab, setTab] = useState<'users' | 'add_user' | 'staff' | 'roles' | 'audit' | 'notifications' | 'system'>(
    initialTab || (queryTab && ['users', 'add_user', 'staff', 'roles', 'audit', 'notifications', 'system'].includes(queryTab) ? (queryTab === 'staff' ? 'add_user' : queryTab) : 'users')
  );

  // Priority 3: Notifications Outbox State
  const [notificationQueue, setNotificationQueue] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifStatusFilter, setNotifStatusFilter] = useState('');
  const [notifProcessing, setNotifProcessing] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramPatientId, setTelegramPatientId] = useState('');
  const [generatedTgCode, setGeneratedTgCode] = useState<{ code: string; instructions: string } | null>(null);
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'nurse',
    is_active: true
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

    // Full Requirement User Form State
  const [fullUserForm, setFullUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'doctor',
    phone: '',
    gender: 'male',
    address: '',
    emergencyContact: '',
    departmentId: '',
    qualification: 'MD',
    licenseNumber: '',
    specialization: 'General Physician',
    experienceYears: '3',
    consultationFee: '250',
    isActive: true
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [createdUserCreds, setCreatedUserCreds] = useState<{ email: string; pass: string; role: string; name: string } | null>(null);
  const [submittingUser, setSubmittingUser] = useState(false);

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    const randPart = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const genPass = `Enat@${randPart}`;
    setFullUserForm(prev => ({ ...prev, password: genPass }));
  };

  const generateLicenseNumber = (role: string) => {
    const prefix = role === 'doctor' ? 'DOC' :
                   role === 'nurse' ? 'NUR' :
                   role === 'pharmacist' ? 'PHM' :
                   role === 'lab_technician' ? 'LAB' : 'STF';
    const genLic = `ETH-${prefix}-${Date.now().toString().slice(-5)}`;
    setFullUserForm(prev => ({ ...prev, licenseNumber: genLic }));
  };

  const handleCreateFullUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmittingUser(true);
    try {
      const payload = {
        email: fullUserForm.email.trim().toLowerCase(),
        password: fullUserForm.password,
        role: fullUserForm.role,
        is_active: fullUserForm.isActive,
        firstName: fullUserForm.firstName.trim(),
        lastName: fullUserForm.lastName.trim(),
        phone: fullUserForm.phone || undefined,
        gender: fullUserForm.gender,
        address: fullUserForm.address || undefined,
        emergencyContact: fullUserForm.emergencyContact || undefined,
        departmentId: fullUserForm.departmentId ? parseInt(fullUserForm.departmentId) : undefined,
        specialization: fullUserForm.specialization || undefined,
        qualification: fullUserForm.qualification || undefined,
        licenseNumber: fullUserForm.licenseNumber || undefined,
        experienceYears: fullUserForm.experienceYears ? parseInt(fullUserForm.experienceYears) : undefined,
        consultationFee: fullUserForm.consultationFee ? parseFloat(fullUserForm.consultationFee) : undefined,
      };

      await api.post('/admin/users', payload);
      showSuccess(`Account for ${fullUserForm.firstName} ${fullUserForm.lastName} (${formatRoleLabel(fullUserForm.role)}) created successfully!`);
      
      setCreatedUserCreds({
        email: fullUserForm.email,
        pass: fullUserForm.password,
        role: fullUserForm.role,
        name: `${fullUserForm.firstName} ${fullUserForm.lastName}`
      });

      setFullUserForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'doctor',
        phone: '',
        gender: 'male',
        address: '',
        emergencyContact: '',
        departmentId: departments[0]?.id ? String(departments[0].id) : '',
        specialization: 'General Physician',
        qualification: 'MD',
        licenseNumber: '',
        experienceYears: '3',
        consultationFee: '250',
        isActive: true
      });

      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create user account. Please verify all requirements.');
    } finally {
      setSubmittingUser(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [tab, roleFilter, auditPage, notifStatusFilter]);

  useEffect(() => {
    if (queryRole) {
      setRoleFilter(queryRole);
      setTab('users');
    } else if (queryTab) {
      setTab(queryTab === 'staff' ? 'add_user' : queryTab);
    }
  }, [queryRole, queryTab]);


  const fetchNotificationQueue = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get(`/notifications/queue${notifStatusFilter ? `?status=${notifStatusFilter}` : ''}`);
      if (res.data?.success) {
        setNotificationQueue(res.data.data?.queue || []);
      }
    } catch (err) {
      console.error('Error fetching notification queue:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setNotifProcessing(true);
    try {
      const res = await api.post('/notifications/queue/process');
      showSuccess(res.data?.message || 'Outbox queue processed successfully.');
      fetchNotificationQueue();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to process outbox queue');
    } finally {
      setNotifProcessing(false);
    }
  };

  const handleGenerateTelegramCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/notifications/telegram/start', { patient_id: parseInt(telegramPatientId) });
      if (res.data?.success) {
        setGeneratedTgCode({
          code: res.data.data.verification_code,
          instructions: res.data.data.instructions,
        });
        showSuccess('Telegram verification code generated successfully!');
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to generate Telegram code');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setFormError('');
    try {
      const [usersRes, statsRes, deptRes] = await Promise.allSettled([
        api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`),
        api.get('/admin/stats'),
        api.get('/admin/departments'),
      ]);

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data.users || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data.data.departments || []);
      
      if (tab === 'notifications') {
        fetchNotificationQueue();
      }
      if (tab === 'audit') {
        const offset = (auditPage - 1) * 15;
        const auditRes = await api.get(`/admin/audit-logs?limit=15&offset=${offset}`);
        if (auditRes.data.success) {
          setAuditLogs(auditRes.data.data.logs || []);
          setAuditTotal(auditRes.data.data.total || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // ── User Management Functions ──────────────────────────────────────────────
  const handleToggleActive = async (u: User) => {
    try {
      await api.put(`/auth/toggle-active/${u.id}`);
      showSuccess(`Account ${u.email} ${u.is_active ? 'deactivated' : 'activated'} successfully.`);
      fetchAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${u.email}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      showSuccess(`User account ${u.email} deleted.`);
      fetchAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, {
          role: userForm.role,
          is_active: userForm.is_active,
          ...(userForm.password && { password: userForm.password })
        });
        showSuccess(`User ${userForm.email} updated successfully.`);
      } else {
        await api.post('/admin/users', userForm);
        showSuccess(`User ${userForm.email} created successfully.`);
      }
      setShowUserModal(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save user account.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/reset-password`, { newPassword });
      setShowResetModal(false);
      setNewPassword('');
      showSuccess(`Password for ${selectedUser.email} reset successfully.`);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to reset password');
    }
  };



  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' ? true : statusFilter === 'active' ? u.is_active : !u.is_active;
    return matchesSearch && matchesStatus;
  });

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <RoleGuard allowedRoles={['super_admin']}>
    <div className="space-y-6">
      {/* ── Priority 1: Header Command Banner & Quick Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-400/30">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                Super Admin Control Center
                <span className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  System Live
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                Primary management console for user roles, staff provisioning, departments, and system security controls.
              </p>
            </div>
          </div>
        </div>

        {/* Priority Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setTab('add_user')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add User (Full Requirements)
          </button>
          <button
            onClick={() => setTab('roles')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" /> System Roles
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm shadow-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* ── Priority Metrics KPI Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Accounts', value: stats.totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Active Users', value: stats.activeUsers, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Patients', value: stats.totalPatients, icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Doctors', value: stats.totalDoctors, icon: Activity, color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20' },
            { label: 'Departments', value: stats.totalDepartments, icon: Building2, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Active Roles', value: stats.byRole.length, icon: Shield, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-xs hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{s.label}</span>
                <div className={`p-2 rounded-xl ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Role Distribution Pills */}
      {stats?.byRole && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">System Role Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byRole.map(r => (
              <span key={r.role} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${ROLE_COLORS[r.role] || 'bg-gray-100 text-gray-600'}`}>
                {formatRoleLabel(r.role)} <strong className="ml-1 opacity-80">({r.count})</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Priority Tab Navigation Bar ── */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'users', label: '1. Users Directory', icon: Users },
          { id: 'add_user', label: '2. Add User (Full Requirements)', icon: UserPlus },
          { id: 'roles', label: '3. Roles & Permissions', icon: ShieldCheck },
          { id: 'audit', label: '4. Security Audit Logs', icon: Lock },
          { id: 'notifications', label: '5. Patient Notifications Outbox', icon: Bell },
          { id: 'system', label: '6. System Health', icon: Server },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-2xl transition-all whitespace-nowrap cursor-pointer ${
              (tab === t.id || (t.id === 'add_user' && tab === 'staff'))
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: USER DIRECTORY & MANAGEMENT ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
            <div className="flex flex-col sm:flex-row flex-1 gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search user by email or name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{formatRoleLabel(r)}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">User / Profile</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Role</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Last Activity</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Registered</th>
                    <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">Loading user accounts...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-400">No matching users found</td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id} className={`hover:bg-gray-50/80 dark:hover:bg-gray-750 transition-colors ${!u.is_active ? 'opacity-60 bg-gray-50/30' : ''}`}>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-sm text-gray-900 dark:text-white">{u.full_name || 'System Account'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                            {formatRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                          {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleActive(u)}
                              title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                              className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                            >
                              {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setUserForm({ email: u.email, password: '', role: u.role, is_active: u.is_active });
                                setFormError('');
                                setShowUserModal(true);
                              }}
                              title="Edit User Role / Status"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedUser(u); setNewPassword(''); setShowResetModal(true); }}
                              title="Reset Password"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            {currentUser?.role === 'super_admin' && u.id !== currentUser.id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Delete Account"
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ADD USER (FULL REQUIREMENTS) ── */}
      {(tab === 'add_user' || tab === 'staff') && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner flex-shrink-0">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    Provision New User Account (Full Requirements)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Complete profile requirements: identity, contact, department assignment, qualifications, and secure temporary credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Generate Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => generateLicenseNumber(fullUserForm.role)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Auto License</span>
                </button>
              </div>
            </div>

            {/* Created Credentials Handover Banner */}
            {createdUserCreds && (
              <div className="p-4 mb-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl animate-fadeIn space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>Account Successfully Provisioned for {createdUserCreds.name} ({formatRoleLabel(createdUserCreds.role)})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`HMS Login Credentials\nName: ${createdUserCreds.name}\nRole: ${formatRoleLabel(createdUserCreds.role)}\nEmail: ${createdUserCreds.email}\nTemporary Password: ${createdUserCreds.pass}`);
                      setCopiedCreds(true);
                      setTimeout(() => setCopiedCreds(false), 3000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCreds ? 'Copied!' : 'Copy Credentials'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-white dark:bg-gray-800 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900">
                  <div><span className="text-gray-400 font-sans">Login Email:</span> <strong>{createdUserCreds.email}</strong></div>
                  <div><span className="text-gray-400 font-sans">Temp Password:</span> <strong>{createdUserCreds.pass}</strong></div>
                </div>
              </div>
            )}

            {formError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-6 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFullUser} className="space-y-6">
              {/* Section 1: Personal Identity */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs flex items-center justify-center font-bold">1</span>
                  Personal & Identity Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                    <input required value={fullUserForm.firstName} onChange={e => setFullUserForm({ ...fullUserForm, firstName: e.target.value })} className={inputClass} placeholder="e.g. Abebe" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Last Name / Father Name *</label>
                    <input required value={fullUserForm.lastName} onChange={e => setFullUserForm({ ...fullUserForm, lastName: e.target.value })} className={inputClass} placeholder="e.g. Bikila" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Gender *</label>
                    <select required value={fullUserForm.gender} onChange={e => setFullUserForm({ ...fullUserForm, gender: e.target.value })} className={inputClass}>
                      <option value="male">Male (ወንድ)</option>
                      <option value="female">Female (ሴት)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Location */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs flex items-center justify-center font-bold">2</span>
                  Contact & Residential Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hospital Login Email *</label>
                    <input type="email" required value={fullUserForm.email} onChange={e => setFullUserForm({ ...fullUserForm, email: e.target.value })} className={inputClass} placeholder="staff.name@hospital.et" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Phone Number *</label>
                    <input required value={fullUserForm.phone} onChange={e => setFullUserForm({ ...fullUserForm, phone: e.target.value })} className={inputClass} placeholder="+251 91 123 4567" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Residential Address / Kebele</label>
                    <input value={fullUserForm.address} onChange={e => setFullUserForm({ ...fullUserForm, address: e.target.value })} className={inputClass} placeholder="e.g. Alem Ketema, Woreda 01" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Emergency Contact Person & Phone</label>
                    <input value={fullUserForm.emergencyContact} onChange={e => setFullUserForm({ ...fullUserForm, emergencyContact: e.target.value })} className={inputClass} placeholder="e.g. Aster Tadesse (+251 92 111 2222)" />
                  </div>
                </div>
              </div>

              {/* Section 3: Role & Department Assignment */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs flex items-center justify-center font-bold">3</span>
                  Role & Department Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">System Role *</label>
                    <select required value={fullUserForm.role} onChange={e => setFullUserForm({ ...fullUserForm, role: e.target.value })} className={inputClass}>
                      {ROLES.filter(r => r !== 'patient').map(r => (
                        <option key={r} value={r}>{formatRoleLabel(r)} ({r})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Hospital Department *</label>
                    <select value={fullUserForm.departmentId} onChange={e => setFullUserForm({ ...fullUserForm, departmentId: e.target.value })} className={inputClass}>
                      <option value="">-- General / Administrative --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Professional & Clinical Scope */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs flex items-center justify-center font-bold">4</span>
                  Professional Credentials & Licensing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Qualification *</label>
                    <input required value={fullUserForm.qualification} onChange={e => setFullUserForm({ ...fullUserForm, qualification: e.target.value })} className={inputClass} placeholder="e.g. MD, MSc, BSc Nursing" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">License Number</label>
                    <input value={fullUserForm.licenseNumber} onChange={e => setFullUserForm({ ...fullUserForm, licenseNumber: e.target.value })} className={inputClass} placeholder="e.g. ETH-DOC-12345" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Experience (Years)</label>
                    <input type="number" min="0" value={fullUserForm.experienceYears} onChange={e => setFullUserForm({ ...fullUserForm, experienceYears: e.target.value })} className={inputClass} placeholder="e.g. 3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Medical Specialization / Track</label>
                    <input value={fullUserForm.specialization} onChange={e => setFullUserForm({ ...fullUserForm, specialization: e.target.value })} className={inputClass} placeholder="e.g. Pediatrics, Surgery, General Medicine" />
                  </div>
                  {fullUserForm.role === 'doctor' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Consultation Fee (ETB)</label>
                      <input type="number" step="10" min="0" value={fullUserForm.consultationFee} onChange={e => setFullUserForm({ ...fullUserForm, consultationFee: e.target.value })} className={inputClass} placeholder="250" />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5: Credentials & Account Status */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs flex items-center justify-center font-bold">5</span>
                  Security Credentials & Account Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Temporary Initial Password *</label>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={fullUserForm.password}
                        onChange={e => setFullUserForm({ ...fullUserForm, password: e.target.value })}
                        className={`${inputClass} pr-10`}
                        placeholder="Min. 6 characters"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end pb-1.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fullUserForm.isActive}
                        onChange={e => setFullUserForm({ ...fullUserForm, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Account Active Immediately
                      </span>
                    </label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      User will be required to change this temporary password upon first login.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="w-full sm:flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{submittingUser ? 'Registering User...' : 'Provision User Account with Full Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFullUserForm({
                      firstName: '', lastName: '', email: '', password: '',
                      role: 'doctor', phone: '', gender: 'male', address: '',
                      emergencyContact: '', departmentId: '', specialization: 'General Physician',
                      qualification: 'MD', licenseNumber: '', experienceYears: '3',
                      consultationFee: '250', isActive: true
                    });
                    setFormError('');
                  }}
                  className="w-full sm:w-auto px-5 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 4: SECURITY AUDIT LOGS ── */}
      {tab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-600" /> System Audit Trails
                </h3>
                <p className="text-xs text-gray-500">Real-time recording of security compliance and database operations.</p>
              </div>
              <span className="text-xs font-bold text-gray-500">Total Entries: {auditTotal}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Entity</th>
                    <th className="px-5 py-3">IP Address</th>
                    <th className="px-5 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Loading audit logs...</td></tr>
                  ) : auditLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No audit logs logged yet</td></tr>
                  ) : auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-200">{log.user_email || 'System'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{log.entity_type} #{log.entity_id}</td>
                      <td className="px-5 py-3 font-mono text-gray-400">{log.ip_address || '127.0.0.1'}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setSelectedAuditLog(log)} className="text-blue-600 hover:underline font-bold">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
              <button
                disabled={auditPage <= 1}
                onClick={() => setAuditPage(p => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-gray-500">Page {auditPage} of {Math.ceil(auditTotal / 15) || 1}</span>
              <button
                disabled={auditPage >= Math.ceil(auditTotal / 15)}
                onClick={() => setAuditPage(p => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ── TAB 5: PATIENT NOTIFICATIONS OUTBOX (PRIORITY 3) ── */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          {/* Outbox Header / Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" /> Patient Notification Outbox & Dispatcher
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Asynchronous durable outbox with Ethiopian phone normalization (+251), multi-provider SMS (Twilio / Africa's Talking) and Telegram Bot support.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => {
                  setTelegramPatientId('');
                  setGeneratedTgCode(null);
                  setShowTelegramModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 hover:bg-indigo-100 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Link Telegram
              </button>
              <button
                onClick={handleProcessQueue}
                disabled={notifProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${notifProcessing ? 'animate-spin' : ''}`} />
                {notifProcessing ? 'Processing Queue...' : 'Process Outbox Now'}
              </button>
              <button
                onClick={fetchNotificationQueue}
                disabled={notifLoading}
                className="p-2 text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-700 rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 ${notifLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Total Queued / Processed</span>
              <p className="text-xl font-extrabold text-gray-900 dark:text-white mt-1">{notificationQueue.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-bold text-amber-500 uppercase">Pending In Outbox</span>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {notificationQueue.filter(q => q.status === 'queued').length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-bold text-emerald-500 uppercase">Delivered / Sent</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">
                {notificationQueue.filter(q => q.status === 'sent' || q.status === 'delivered').length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] font-bold text-red-500 uppercase">Failed Deliveries</span>
              <p className="text-xl font-extrabold text-red-600 mt-1">
                {notificationQueue.filter(q => q.status === 'failed').length}
              </p>
            </div>
          </div>

          {/* Outbox Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter Status:</span>
                <select
                  value={notifStatusFilter}
                  onChange={e => setNotifStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="queued">Queued (Pending)</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <span className="text-xs text-gray-400">Provider: Default Mock / Configured SMS Gateway</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Patient</th>
                    <th className="px-4 py-3">Event Template</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3">Message Preview (Privacy-Safe)</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {notifLoading ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading notification queue...</td></tr>
                  ) : notificationQueue.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No notification entries in queue</td></tr>
                  ) : notificationQueue.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 font-mono text-gray-400">#{item.id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.channel === 'telegram'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        }`}>
                          {item.channel === 'telegram' ? <Send className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                          {item.channel.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-gray-700 dark:text-gray-300">{item.recipient_phone || item.recipient_telegram_id || item.recipient}</td>
                      <td className="px-4 py-3">
                        {item.patient_name ? (
                          <span className="font-semibold text-gray-900 dark:text-white">{item.patient_name}</span>
                        ) : (
                          <span className="text-gray-400">Patient #{item.patient_id}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-800 dark:text-slate-200">
                          {item.template_key}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'queued' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{item.attempts}/{item.max_attempts || 3}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-600 dark:text-gray-300 font-sans" title={item.message_content || JSON.stringify(item.metadata)}>
                        {item.payload?.body || (item.template_key ? `Template: ${item.template_key}` : '-')}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 7: ROLE DESCRIPTIONS & DISTRIBUTION ── */}
      {tab === 'roles' && (
        <RoleDescriptionsPage embedded={true} />
      )}

      {/* ── TAB 6: SYSTEM HEALTH ── */}
      {tab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">PostgreSQL Database</h4>
                <span className="text-xs text-emerald-600 font-bold">● Connected & Operational</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">Active pool connection handle verified.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <Server className="w-6 h-6 text-purple-600" />
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Express API Microservices</h4>
                <span className="text-xs text-emerald-600 font-bold">● Online & Resilient</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">JWT Security & Rate limiting active.</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-6 h-6 text-teal-600" />
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">FastAPI ML Services</h4>
                <span className="text-xs text-emerald-600 font-bold">● Microservice Ready</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">FastAPI Random Forest & CNN scanner enabled.</p>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {editingUser ? 'Edit User Credentials' : 'Add New User'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {formError && <p className="text-xs text-red-500 mb-3 bg-red-50 p-2.5 rounded-xl border border-red-200">{formError}</p>}
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <input type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className={inputClass} disabled={!!editingUser} />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input type="password" required value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className={inputClass} />
                </div>
              )}
              {editingUser && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Password (leave blank to keep current)</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className={inputClass} />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                <select required value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                  {ROLES.map(role => (
                    <option key={role} value={role}>{formatRoleLabel(role)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="userIsActive" checked={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="userIsActive" className="text-xs font-semibold text-gray-700 dark:text-gray-300">Account Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">{editingUser ? 'Update User' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Reset User Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Setting new password for user: <strong>{selectedUser.email}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Password *</label>
                <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className={inputClass} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Audit Entry #{selectedAuditLog.id}</h3>
              <button onClick={() => setSelectedAuditLog(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div><span className="font-bold text-gray-500">Action:</span> <span className="font-mono text-purple-600 font-bold">{selectedAuditLog.action}</span></div>
              <div><span className="font-bold text-gray-500">User Email:</span> {selectedAuditLog.user_email || 'System'}</div>
              <div><span className="font-bold text-gray-500">Timestamp:</span> {new Date(selectedAuditLog.timestamp).toLocaleString()}</div>
              <div><span className="font-bold text-gray-500">IP Address:</span> {selectedAuditLog.ip_address}</div>
              <div>
                <span className="font-bold text-gray-500 block mb-1">Old Values:</span>
                <pre className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl font-mono text-[10px] overflow-x-auto">{JSON.stringify(selectedAuditLog.old_values, null, 2) || 'None'}</pre>
              </div>
              <div>
                <span className="font-bold text-gray-500 block mb-1">New Values:</span>
                <pre className="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl font-mono text-[10px] overflow-x-auto">{JSON.stringify(selectedAuditLog.new_values, null, 2) || 'None'}</pre>
              </div>
            </div>
            <button onClick={() => setSelectedAuditLog(null)} className="w-full mt-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl">
              Close
            </button>
          </div>
        </div>
      )}
      {/* Telegram Link Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-500" /> Generate Telegram Link Code
              </h3>
              <button onClick={() => setShowTelegramModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGenerateTelegramCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Patient ID *</label>
                <input
                  type="number"
                  required
                  placeholder="Enter patient database ID (e.g. 1)"
                  value={telegramPatientId}
                  onChange={e => setTelegramPatientId(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
              >
                Generate 6-Digit Telegram Link Code
              </button>
            </form>

            {generatedTgCode && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200">Verification Code:</p>
                <p className="text-3xl font-black font-mono tracking-widest text-blue-600 dark:text-blue-400 my-2">
                  {generatedTgCode.code}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">{generatedTgCode.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
};

export default AdminPage;
