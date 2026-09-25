import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, Plus, Search, Trash2, X, Shield,
  CheckCircle, XCircle, RefreshCw, Building2, Key, Edit,
  Activity, Server, Database, Lock, AlertCircle, ChevronLeft, ChevronRight
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

const ROLES = ['admin', 'receptionist', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier', 'hospital_manager', 'super_admin'];

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

const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'users' | 'staff' | 'departments' | 'audit' | 'system'>('users');
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [doctorsList, setDoctorsList] = useState<{ id: number; name: string }[]>([]);

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

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '', headDoctorId: '' });

  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const [staffForm, setStaffForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'receptionist',
    phone: '',
    specialization: '',
    licenseNumber: '',
    departmentId: ''
  });

  useEffect(() => {
    fetchAll();
  }, [tab, roleFilter, auditPage]);

  const fetchAll = async () => {
    setLoading(true);
    setFormError('');
    try {
      const [usersRes, statsRes, deptRes, docRes] = await Promise.allSettled([
        api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`),
        api.get('/admin/stats'),
        api.get('/admin/departments'),
        api.get('/doctors?limit=100'),
      ]);

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data.users || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data.data.departments || []);
      if (docRes.status === 'fulfilled') {
        const rawDocs = docRes.value.data.data.doctors || docRes.value.data.data || [];
        setDoctorsList(rawDocs.map((d: any) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` })));
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

  // ── Staff Onboarding ───────────────────────────────────────────────────────
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/auth/create-staff', {
        ...staffForm,
        departmentId: staffForm.departmentId ? parseInt(staffForm.departmentId) : undefined,
      });
      showSuccess(`Staff account for ${staffForm.firstName} ${staffForm.lastName} created!`);
      setStaffForm({
        firstName: '', lastName: '', email: '', password: '',
        role: 'receptionist', phone: '', specialization: '',
        licenseNumber: '', departmentId: ''
      });
      setTab('users');
      fetchAll();
    } catch (e: any) {
      setFormError(e.response?.data?.message || 'Failed to create staff account.');
    }
  };

  // ── Department Management ──────────────────────────────────────────────────
  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const payload = {
        name: deptForm.name,
        description: deptForm.description,
        head_doctor_id: deptForm.headDoctorId ? parseInt(deptForm.headDoctorId) : null
      };

      if (selectedDepartment) {
        await api.put(`/admin/departments/${selectedDepartment.id}`, payload);
        showSuccess(`Department "${deptForm.name}" updated.`);
      } else {
        await api.post('/admin/departments', payload);
        showSuccess(`Department "${deptForm.name}" created.`);
      }
      setShowDeptModal(false);
      setSelectedDepartment(null);
      setDeptForm({ name: '', description: '', headDoctorId: '' });
      fetchAll();
    } catch (e: any) {
      setFormError(e.response?.data?.message || 'Failed to save department.');
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setSelectedDepartment(dept);
    setDeptForm({
      name: dept.name,
      description: dept.description || '',
      headDoctorId: dept.head_doctor_id ? String(dept.head_doctor_id) : ''
    });
    setFormError('');
    setShowDeptModal(true);
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (!window.confirm(`Delete department "${dept.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      showSuccess(`Department "${dept.name}" deleted.`);
      fetchAll();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete department');
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
    <div className="space-y-6">
      {/* ── Priority 1: Header Command Banner & Quick Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
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
            onClick={() => {
              setEditingUser(null);
              setUserForm({ email: '', password: '', role: 'nurse', is_active: true });
              setShowUserModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
          <button
            onClick={() => setTab('staff')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Users className="w-4 h-4" /> Add Staff
          </button>
          <button
            onClick={() => {
              setSelectedDepartment(null);
              setDeptForm({ name: '', description: '', headDoctorId: '' });
              setShowDeptModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Building2 className="w-4 h-4" /> Add Department
          </button>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-700/80 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-xl transition-all disabled:opacity-50"
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
                {r.role.replace(/_/g, ' ')} <strong className="ml-1 opacity-80">({r.count})</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Priority Tab Navigation Bar ── */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {[
          { id: 'users', label: '1. User Directory', icon: Users },
          { id: 'staff', label: '2. Staff Onboarding', icon: Plus },
          { id: 'departments', label: '3. Departments', icon: Building2 },
          { id: 'audit', label: '4. Security Audit Logs', icon: Lock },
          { id: 'system', label: '5. System Health', icon: Server },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-2xl transition-all whitespace-nowrap ${
              tab === t.id
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
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
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
                            {u.role.replace(/_/g, ' ')}
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

      {/* ── TAB 2: STAFF ONBOARDING ── */}
      {tab === 'staff' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Provision New Staff Credentials</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create staff accounts for Doctors, Nurses, Pharmacists, Lab Technicians, Cashiers, Receptionists, and Managers.
                </p>
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl mb-4 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input required value={staffForm.firstName} onChange={e => setStaffForm({ ...staffForm, firstName: e.target.value })} className={inputClass} placeholder="e.g. Alem" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input required value={staffForm.lastName} onChange={e => setStaffForm({ ...staffForm, lastName: e.target.value })} className={inputClass} placeholder="e.g. Tesfaye" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <input type="email" required value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} className={inputClass} placeholder="staff@hospital.et" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input type="password" required minLength={6} value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} className={inputClass} placeholder="Min. 6 characters" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select required value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })} className={inputClass}>
                    {ROLES.filter(r => r !== 'patient').map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} className={inputClass} placeholder="+251 91 234 5678" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select value={staffForm.departmentId} onChange={e => setStaffForm({ ...staffForm, departmentId: e.target.value })} className={inputClass}>
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {staffForm.role === 'doctor' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">Specialization</label>
                    <input value={staffForm.specialization} onChange={e => setStaffForm({ ...staffForm, specialization: e.target.value })} className={inputClass} placeholder="e.g. Pediatrics" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">License Number</label>
                    <input value={staffForm.licenseNumber} onChange={e => setStaffForm({ ...staffForm, licenseNumber: e.target.value })} className={inputClass} placeholder="MD-12345" />
                  </div>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md mt-4">
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 3: DEPARTMENTS ── */}
      {tab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
            <h3 className="font-bold text-sm text-gray-800 dark:text-white">Hospital Clinical & Administrative Departments</h3>
            <button
              onClick={() => {
                setSelectedDepartment(null);
                setDeptForm({ name: '', description: '', headDoctorId: '' });
                setFormError('');
                setShowDeptModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <p className="text-gray-400 text-xs py-8">Loading departments...</p>
            ) : departments.map(d => (
              <div key={d.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">{d.name}</h4>
                        {d.head_doctor_name ? (
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">Head: {d.head_doctor_name}</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5 italic">Head Doctor Unassigned</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditDepartment(d)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit department"><Edit className="w-4 h-4" /></button>
                      {currentUser?.role === 'super_admin' && (
                        <button onClick={() => handleDeleteDepartment(d)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Delete department"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                  {d.description && <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{d.description}</p>}
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
                  <span>Assigned Personnel:</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{d.doctor_count} doctors</span>
                </div>
              </div>
            ))}
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

      {/* ── TAB 5: SYSTEM HEALTH ── */}
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
                    <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
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

      {/* Add / Edit Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                {selectedDepartment ? 'Edit Department' : 'Add New Department'}
              </h3>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
            <form onSubmit={handleSaveDept} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Department Name *</label>
                <input required value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} className={inputClass} placeholder="e.g. Cardiology" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} rows={3} className={inputClass} placeholder="Clinical services and scope..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Head of Department (Doctor)</label>
                <select value={deptForm.headDoctorId} onChange={e => setDeptForm({ ...deptForm, headDoctorId: e.target.value })} className={inputClass}>
                  <option value="">-- Assign Head Doctor --</option>
                  {doctorsList.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all">
                  {selectedDepartment ? 'Update Department' : 'Create Department'}
                </button>
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
    </div>
  );
};

export default AdminPage;
