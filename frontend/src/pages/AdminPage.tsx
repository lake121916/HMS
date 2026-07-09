import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, Plus, Search, Trash2, X, Shield,
  CheckCircle, XCircle, RefreshCw, Building2, Key, Edit
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number; email: string; role: string;
  is_active: boolean; last_login: string;
  created_at: string; full_name: string;
}
interface Department { id: number; name: string; description: string; head_doctor_name: string; doctor_count: number; }
interface Stats { totalUsers: number; activeUsers: number; byRole: {role: string; count: string}[]; totalPatients: number; totalDoctors: number; totalDepartments: number; }

const ROLES = ['admin','receptionist','doctor','nurse','lab_technician','pharmacist','cashier','hospital_manager'];
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700',
  doctor: 'bg-green-100 text-green-700', nurse: 'bg-teal-100 text-teal-700',
  receptionist: 'bg-orange-100 text-orange-700', pharmacist: 'bg-indigo-100 text-indigo-700',
  cashier: 'bg-yellow-100 text-yellow-700', lab_technician: 'bg-cyan-100 text-cyan-700',
  hospital_manager: 'bg-red-100 text-red-700', patient: 'bg-gray-100 text-gray-600',
};

const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'users' | 'staff' | 'departments'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [, setShowStaffModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [staffForm, setStaffForm] = useState({ firstName:'', lastName:'', email:'', password:'', role:'receptionist', phone:'', specialization:'', licenseNumber:'', departmentId:'' });
  const [deptForm, setDeptForm] = useState({ name:'', description:'' });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Merged User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    role: 'nurse',
    is_active: true
  });

  useEffect(() => { fetchAll(); }, [tab]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.allSettled([
        api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`),
        api.get('/admin/stats'),
      ]);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data.users || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data);
      if (tab === 'departments') {
        const deptRes = await api.get('/admin/departments');
        setDepartments(deptRes.data.data.departments || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleToggleActive = async (u: User) => {
    try {
      await api.put(`/auth/toggle-active/${u.id}`);
      showSuccess(`${u.email} ${u.is_active ? 'deactivated' : 'activated'}`);
      fetchAll();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Delete user "${u.email}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      showSuccess('User deleted'); fetchAll();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    try {
      await api.post('/auth/create-staff', {
        ...staffForm,
        departmentId: staffForm.departmentId ? parseInt(staffForm.departmentId) : undefined,
      });
      setShowStaffModal(false);
      showSuccess('Staff account created'); fetchAll();
    } catch (e: any) { setFormError(e.response?.data?.message || 'Failed to create staff'); }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    try {
      await api.post('/admin/departments', deptForm);
      setShowDeptModal(false); showSuccess('Department created'); fetchAll();
    } catch (e: any) { setFormError(e.response?.data?.message || 'Failed'); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${selectedUser?.id}/reset-password`, { newPassword });
      setShowResetModal(false); showSuccess('Password reset successfully');
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleAddUserClick = () => {
    setEditingUser(null);
    setUserForm({
      email: '',
      password: '',
      role: 'nurse',
      is_active: true
    });
    setFormError('');
    setShowUserModal(true);
  };

  const handleEditUserClick = (u: User) => {
    setEditingUser(u);
    setUserForm({
      email: u.email,
      password: '',
      role: u.role,
      is_active: u.is_active
    });
    setFormError('');
    setShowUserModal(true);
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
        showSuccess('User updated successfully');
      } else {
        await api.post('/admin/users', userForm);
        showSuccess('User created successfully');
      }
      setShowUserModal(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );
  // const staffUsers = filtered.filter(u => u.role !== 'patient');
  // const patientUsers = filtered.filter(u => u.role === 'patient');

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" /> System Administration
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Manage users, roles, and high-level system configuration from a secure administrative console.</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/50 p-4 text-sm text-blue-700 dark:text-blue-200">
            <p className="font-semibold">Super Admin focus areas:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>Manage user accounts, roles, and access rights.</li>
              <li>Configure departments, system settings, and administrative workflows.</li>
              <li>Review system reports and high-level usage metrics.</li>
            </ul>
          </div>
        </div>
        <button onClick={fetchAll} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Active Users', value: stats.activeUsers },
            { label: 'Total Patients', value: stats.totalPatients },
            { label: 'Total Doctors', value: stats.totalDoctors },
            { label: 'Departments', value: stats.totalDepartments },
            { label: 'Staff Roles', value: stats.byRole.length },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
              <p className="text-2xl font-extrabold text-blue-600">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Role distribution */}
      {stats?.byRole && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Users by Role</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byRole.map(r => (
              <span key={r.role} className={`px-3 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[r.role] || 'bg-gray-100 text-gray-600'}`}>
                {r.role.replace(/_/g, ' ')} ({r.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'users', label: 'All Users', icon: Users },
          { id: 'staff', label: 'Create Staff', icon: Plus },
          { id: 'departments', label: 'Departments', icon: Building2 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex flex-1 gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by email or name..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setTimeout(fetchAll, 0); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500">
                <option value="">All Roles</option>
                {['super_admin','admin','receptionist','doctor','nurse','lab_technician','pharmacist','cashier','hospital_manager','patient'].map(r => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <button onClick={handleAddUserClick} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {['Name / Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${!u.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                          {u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleActive(u)}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                            className={`${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}>
                            {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleEditUserClick(u)}
                            title="Edit User" className="text-gray-500 hover:text-gray-700">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedUser(u); setNewPassword(''); setShowResetModal(true); }}
                            title="Reset Password" className="text-blue-500 hover:text-blue-700">
                            <Key className="w-4 h-4" />
                          </button>
                          {currentUser?.role === 'super_admin' && u.id !== currentUser.id && (
                            <button onClick={() => handleDeleteUser(u)} title="Delete" className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Tab */}
      {tab === 'staff' && (
        <div className="max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><Plus className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Create Staff Account</h3>
                <p className="text-xs text-gray-500">Only admins can create staff accounts. Patients register themselves.</p>
              </div>
            </div>
            {formError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-600">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{formError}
              </div>
            )}
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                  <input required value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} className={inputClass} placeholder="Alem" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                  <input required value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} className={inputClass} placeholder="Tesfaye" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" required value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} className={inputClass} placeholder="staff@hospital.et" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input type="password" required minLength={6} value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className={inputClass} placeholder="Min. 6 chars" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select required value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className={inputClass}>
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} className={inputClass} placeholder="+251 91 234 5678" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department ID</label>
                  <input type="number" value={staffForm.departmentId} onChange={e => setStaffForm({...staffForm, departmentId: e.target.value})} className={inputClass} placeholder="Optional" /></div>
              </div>
              {(staffForm.role === 'doctor') && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specialization</label>
                    <input value={staffForm.specialization} onChange={e => setStaffForm({...staffForm, specialization: e.target.value})} className={inputClass} placeholder="e.g. Pediatrics" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">License Number</label>
                    <input value={staffForm.licenseNumber} onChange={e => setStaffForm({...staffForm, licenseNumber: e.target.value})} className={inputClass} /></div>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                The staff member will use their email and the password you set to log in. Share credentials securely.
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm">
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {tab === 'departments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setDeptForm({ name:'', description:'' }); setFormError(''); setShowDeptModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Department
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <p className="text-gray-400 text-sm">Loading...</p> :
              departments.map(d => (
                <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-400">{d.doctor_count} doctors</span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mt-3">{d.name}</h3>
                  {d.description && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{d.description}</p>}
                  {d.head_doctor_name && <p className="text-xs text-blue-600 mt-2 font-medium">Head: {d.head_doctor_name}</p>}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Reset Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Setting new password for: <strong>{selectedUser.email}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min. 6 chars)" className={inputClass} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Add Department</h3>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {formError && <p className="text-sm text-red-500 mb-3">{formError}</p>}
            <form onSubmit={handleCreateDept} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input required value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} className={inputClass} placeholder="e.g. Cardiology" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={deptForm.description} onChange={e => setDeptForm({...deptForm, description: e.target.value})} rows={2} className={inputClass} /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {formError && <p className="text-sm text-red-500 mb-3">{formError}</p>}
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" required value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className={inputClass} disabled={!!editingUser} />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password *</label>
                  <input type="password" required value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className={inputClass} />
                </div>
              )}
              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password (leave blank to keep current)</label>
                  <input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className={inputClass} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                <select required value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className={inputClass}>
                  {['super_admin', 'admin', 'receptionist', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier', 'hospital_manager', 'patient'].map(role => (
                    <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="userIsActive" checked={userForm.is_active} onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="userIsActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">{editingUser ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
