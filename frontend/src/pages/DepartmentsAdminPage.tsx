import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Building2, Plus, Search, Edit, Trash2, Users,
  CheckCircle, AlertCircle, X, RefreshCw, Stethoscope, ShieldCheck
} from 'lucide-react';
import RoleGuard from '../components/RoleGuard';

interface Department {
  id: number;
  name: string;
  description: string;
  head_doctor_id?: number | null;
  head_doctor_name?: string | null;
  doctor_count: number | string;
}

interface DoctorOption {
  id: number;
  name: string;
  specialization?: string;
}

const DepartmentsAdminPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctorsList, setDoctorsList] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    headDoctorId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [deptRes, docRes] = await Promise.allSettled([
        api.get('/admin/departments'),
        api.get('/doctors?limit=100')
      ]);

      if (deptRes.status === 'fulfilled') {
        setDepartments(deptRes.value.data.data?.departments || deptRes.value.data.data || []);
      }
      if (docRes.status === 'fulfilled') {
        const raw = docRes.value.data.data?.doctors || docRes.value.data.data || [];
        setDoctorsList(
          raw.map((d: any) => ({
            id: d.id,
            name: `${d.first_name} ${d.last_name}`,
            specialization: d.specialization
          }))
        );
      }
    } catch (e: any) {
      setErrorMsg('Failed to load department data.');
    } finally {
      setLoading(false);
    }
  };

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({ name: '', description: '', headDoctorId: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      headDoctorId: dept.head_doctor_id ? String(dept.head_doctor_id) : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (dept: Department) => {
    if (!window.confirm(`Are you sure you want to delete "${dept.name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/departments/${dept.id}`);
      notifySuccess(`Department "${dept.name}" removed successfully.`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete department. Make sure no records depend on it.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        head_doctor_id: formData.headDoctorId ? parseInt(formData.headDoctorId) : null
      };

      if (editingDept) {
        await api.put(`/admin/departments/${editingDept.id}`, payload);
        notifySuccess(`Department "${payload.name}" updated successfully.`);
      } else {
        await api.post('/admin/departments', payload);
        notifySuccess(`Department "${payload.name}" created successfully.`);
      }

      setShowModal(false);
      setEditingDept(null);
      fetchData();
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || 'Error saving department.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.description && d.description.toLowerCase().includes(search.toLowerCase())) ||
    (d.head_doctor_name && d.head_doctor_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalDoctors = departments.reduce((acc, d) => acc + (parseInt(String(d.doctor_count)) || 0), 0);
  const withHead = departments.filter(d => d.head_doctor_name || d.head_doctor_id).length;

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'hospital_manager']}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Building2 className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Department Management
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure hospital clinical and operational departments, appoint Head Doctors, and track staffing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Departments</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{departments.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Heads Appointed</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {withHead} <span className="text-sm font-normal text-gray-400">/ {departments.length}</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Assigned Doctors</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalDoctors}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments by name, description, or head doctor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-xs"
          />
        </div>

        {/* Department Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse space-y-4">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No departments found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or create a new department.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(dept => (
              <div
                key={dept.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold flex-shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">
                          {dept.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                          <Users className="w-3.5 h-3.5" />
                          {dept.doctor_count || 0} {Number(dept.doctor_count) === 1 ? 'Doctor' : 'Doctors'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 min-h-[32px]">
                    {dept.description || 'No specific description provided for this department.'}
                  </p>

                  <div className="bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-gray-100 dark:border-gray-700 mb-4">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                      Head of Department
                    </span>
                    {dept.head_doctor_name ? (
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="truncate">Dr. {dept.head_doctor_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs italic text-amber-600 dark:text-amber-400">
                        No Head Doctor appointed
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleOpenEdit(dept)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(dept)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingDept ? 'Edit Department' : 'Create New Department'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiology, Pediatrics, Emergency..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Head of Department (Lead Physician)
                  </label>
                  <select
                    value={formData.headDoctorId}
                    onChange={e => setFormData({ ...formData, headDoctorId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- No Head Doctor Assigned --</option>
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Description & Ward Location
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide department duties, location (e.g., Block B, 2nd Floor), or notes..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    {editingDept ? 'Update Department' : 'Create Department'}
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

export default DepartmentsAdminPage;
