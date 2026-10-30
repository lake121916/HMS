import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, Plus, Search, Edit, Trash2, X,
  Shield, UserCheck, UserX, RefreshCw, CheckCircle,
  AlertCircle, Building2, Phone, Mail, MapPin, Eye, EyeOff,
  User, HeartHandshake, Briefcase
} from 'lucide-react';
import RoleGuard from '../components/RoleGuard';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  department_id?: number;
  department_name?: string;
  specialization?: string;
  qualification?: string;
  license_number?: string;
  consultation_fee?: number;
  experience_years?: number;
}

interface Department {
  id: number;
  name: string;
}

const ROLES = [
  'super_admin',
  'admin',
  'doctor',
  'nurse',
  'receptionist',
  'cashier',
  'lab_technician',
  'pharmacist',
  'hospital_manager',
  'patient'
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200',
  admin: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200',
  doctor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200',
  nurse: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200',
  receptionist: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200',
  cashier: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200',
  lab_technician: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200',
  pharmacist: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200',
  hospital_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  patient: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200',
};

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { can } = useRoleAccess();
  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Unified Form Data with Essential & Contact Information
  const [userFormData, setUserFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    address: '',
    emergency_contact: '',
    password: '',
    role: 'doctor',
    department_id: '',
    specialization: 'General Physician',
    qualification: 'MD',
    license_number: '',
    experience_years: '2',
    consultation_fee: '250',
    is_active: true
  });

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data.data?.departments || res.data.data || []);
    } catch (e) {
      try {
        const adminRes = await api.get('/admin/departments');
        setDepartments(adminRes.data.data?.departments || adminRes.data.data || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    }
  };

  // ── User Actions ─────────────────────────────────────────────────────────────
  const handleAddUser = () => {
    setEditingUser(null);
    setShowPassword(false);
    setUserFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: 'male',
      address: '',
      emergency_contact: '',
      password: '',
      role: 'nurse',
      department_id: departments[0]?.id ? String(departments[0].id) : '',
      specialization: 'General Physician',
      qualification: 'MD',
      license_number: '',
      experience_years: '2',
      consultation_fee: '250',
      is_active: true
    });
    setErrorMsg('');
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    if (user.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      alert('Only super administrators can edit super admin accounts.');
      return;
    }
    setEditingUser(user);
    setShowPassword(false);
    const nameParts = (user.full_name || '').split(' ');
    setUserFormData({
      first_name: user.first_name || nameParts[0] || '',
      last_name: user.last_name || nameParts.slice(1).join(' ') || '',
      email: user.email,
      phone: user.phone || '',
      gender: user.gender || 'male',
      address: user.address || '',
      emergency_contact: user.emergency_contact || '',
      password: '',
      role: user.role,
      department_id: user.department_id ? String(user.department_id) : (departments[0]?.id ? String(departments[0].id) : ''),
      specialization: user.specialization || 'General Physician',
      qualification: user.qualification || 'MD',
      license_number: user.license_number || '',
      experience_years: user.experience_years ? String(user.experience_years) : '2',
      consultation_fee: user.consultation_fee ? String(user.consultation_fee) : '250',
      is_active: user.is_active
    });
    setErrorMsg('');
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    if (currentUser?.role !== 'super_admin') {
      alert('Only super administrators have permission to delete user accounts.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user account?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      notifySuccess('User account removed successfully.');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (id: number, currentActive: boolean) => {
    const target = users.find(u => u.id === id);
    if (target?.role === 'super_admin' && currentUser?.role !== 'super_admin') {
      alert('Only super administrators can modify super admin account status.');
      return;
    }
    try {
      await api.put(`/admin/users/${id}`, { is_active: !currentActive });
      notifySuccess(`User ${!currentActive ? 'activated' : 'deactivated'} successfully.`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        email: userFormData.email,
        role: userFormData.role,
        is_active: userFormData.is_active,
        firstName: userFormData.first_name,
        lastName: userFormData.last_name,
        phone: userFormData.phone || undefined,
        gender: userFormData.gender,
        address: userFormData.address || undefined,
        emergencyContact: userFormData.emergency_contact || undefined,
        departmentId: (userFormData.role === 'doctor' || userFormData.role === 'nurse') && userFormData.department_id
          ? parseInt(userFormData.department_id)
          : null,
        specialization: userFormData.role === 'doctor' ? userFormData.specialization : undefined,
        qualification: userFormData.role === 'doctor' ? userFormData.qualification : undefined,
        licenseNumber: userFormData.role === 'doctor' ? userFormData.license_number : undefined,
        experienceYears: userFormData.role === 'doctor' ? parseInt(userFormData.experience_years || '0') : undefined,
        consultationFee: userFormData.role === 'doctor' ? parseFloat(userFormData.consultation_fee || '0') : undefined,
        ...(userFormData.password ? { password: userFormData.password } : {})
      };

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, payload);
        notifySuccess(`User ${userFormData.email} updated successfully.`);
      } else {
        await api.post('/admin/users', payload);
        notifySuccess(`New user ${userFormData.email} created successfully.`);
      }
      setShowUserModal(false);
      fetchUsers();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to save user');
    }
  };

  // Search & Filtering
  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.department_name && u.department_name.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.specialization && u.specialization.toLowerCase().includes(userSearch.toLowerCase()));

    const matchesRole = roleFilter
      ? u.role === roleFilter
      : true;

    const matchesDept = deptFilter
      ? String(u.department_id) === deptFilter
      : true;

    return matchesSearch && matchesRole && matchesDept;
  });

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                User & Staff Management
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Comprehensive personnel directory with personal details, contact information, role access, and clinical assignments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchUsers(); fetchDepartments(); }}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleAddUser}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm shadow-xs">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-sm shadow-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, role, or department..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs font-medium cursor-pointer"
          >
            <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">All Roles ({users.length})</option>
            {ROLES.filter(r => currentUser?.role === 'super_admin' || r !== 'super_admin').map(r => (
              <option key={r} value={r} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">{r.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs font-medium cursor-pointer"
          >
            <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={String(d.id)} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">{d.name}</option>
            ))}
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">User / Personnel</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">System Role</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Contact Phone</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Department / Specialization</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Registered</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loadingUsers ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading personnel accounts...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No matching user accounts found</td></tr>
                ) : (
                  filteredUsers.map(user => {
                    const displayRole = user.role;
                    return (
                      <tr key={user.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-750 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-800">
                              {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                              {(user.last_name?.[0] || '').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0]}
                              </div>
                              <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span>{user.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border ${ROLE_COLORS[displayRole] || 'bg-gray-100 text-gray-700'}`}>
                            <Shield className="w-3 h-3 mr-1 opacity-70" />
                            {displayRole.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {user.phone ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                              <Phone className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No phone</span>
                          )}
                          {user.address && (
                            <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{user.address}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {user.department_name ? (
                            <div>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                <span>{user.department_name}</span>
                              </div>
                              {user.specialization && (
                                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                                  {user.specialization}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg ${user.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            }`}>
                            {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {user.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
                              title="Edit User Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${user.is_active
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                }`}
                              title={user.is_active ? 'Deactivate User' : 'Activate User'}
                            >
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            {can('admin:delete_user') && user.id !== currentUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                title="Delete User (Super Admin only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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

        {/* ── MODAL: User / Staff Create/Edit ───────────────────────────── */}
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {editingUser ? 'Edit Personnel Account' : 'Add New Hospital Personnel'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Enter personal contact details, credentials, and role assignments.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Abebe"
                      value={userFormData.first_name}
                      onChange={e => setUserFormData({ ...userFormData, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kebede"
                      value={userFormData.last_name}
                      onChange={e => setUserFormData({ ...userFormData, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Contact Phone & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+251 91 234 5678"
                        value={userFormData.phone}
                        onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={userFormData.gender}
                      onChange={e => setUserFormData({ ...userFormData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                    >
                      <option value="male" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">Male</option>
                      <option value="female" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">Female</option>
                      <option value="other" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">Other</option>
                    </select>
                  </div>
                </div>

                {/* Address & Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Physical Address / City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Alem Ketema, Kebele 02"
                        value={userFormData.address}
                        onChange={e => setUserFormData({ ...userFormData, address: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Emergency Contact / Kin
                    </label>
                    <div className="relative">
                      <HeartHandshake className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Name & Contact (+251...)"
                        value={userFormData.emergency_contact}
                        onChange={e => setUserFormData({ ...userFormData, emergency_contact: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        disabled={!!editingUser}
                        placeholder="doctor@hospital.com"
                        value={userFormData.email}
                        onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      {editingUser ? 'New Password (leave blank to keep)' : 'Login Password *'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                        value={userFormData.password}
                        onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="w-full pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Assigned Hospital Role & Doctor's Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className={userFormData.role === 'doctor' ? '' : 'sm:col-span-2'}>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                      Assigned Hospital Role *
                    </label>
                    <div className="relative">
                      <Briefcase className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <select
                        value={userFormData.role}
                        onChange={e => {
                          const newRole = e.target.value;
                          setUserFormData({
                            ...userFormData,
                            role: newRole,
                            department_id: (newRole === 'doctor' || newRole === 'nurse') && !userFormData.department_id && departments[0]
                              ? String(departments[0].id)
                              : userFormData.department_id
                          });
                        }}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white py-1.5">
                            {r.replace(/_/g, ' ').toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {userFormData.role === 'doctor' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                        Doctor's Department *
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          required
                          value={userFormData.department_id}
                          onChange={e => setUserFormData({ ...userFormData, department_id: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
                        >
                          <option value="" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">-- Select Department --</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Status */}
                <div className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <input
                    type="checkbox"
                    id="userActive"
                    checked={userFormData.is_active}
                    onChange={e => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                  />
                  <label htmlFor="userActive" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Account is Active
                  </label>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition cursor-pointer"
                  >
                    {editingUser ? 'Save Changes' : 'Create Personnel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default UserManagementPage;
