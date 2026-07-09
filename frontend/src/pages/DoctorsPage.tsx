import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, X, Stethoscope, Phone, Mail, Award } from 'lucide-react';
import { useRoleAccess } from '../hooks/useRoleAccess';

interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  email: string;
  phone: string;
  is_available: boolean;
  department_id?: number;
  department_name?: string;
  license_number?: string;
  qualification?: string;
  experience_years?: number;
  consultation_fee?: number;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const DoctorsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', specialization: '',
    email: '', phone: '', is_available: true,
    department_id: '', license_number: '', qualification: '',
    experience_years: '', consultation_fee: ''
  });

  useEffect(() => { fetchDoctors(); }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data.data.doctors || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAdd = () => {
    setEditingDoctor(null);
    setFormData({ first_name:'', last_name:'', specialization:'', email:'', phone:'',
      is_available:true, department_id:'', license_number:'', qualification:'',
      experience_years:'', consultation_fee:'' });
    setShowModal(true);
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      specialization: doctor.specialization,
      email: doctor.email,
      phone: doctor.phone || '',
      is_available: doctor.is_available,
      department_id: doctor.department_id?.toString() || '',
      license_number: doctor.license_number || '',
      qualification: doctor.qualification || '',
      experience_years: doctor.experience_years?.toString() || '',
      consultation_fee: doctor.consultation_fee?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this doctor? This cannot be undone.')) return;
    try {
      await api.delete(`/doctors/${id}`);
      fetchDoctors();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete doctor'); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        // The backend createDoctor uses camelCase params — send as camelCase
        firstName: formData.first_name,
        lastName: formData.last_name,
        specialization: formData.specialization,
        email: formData.email,
        phone: formData.phone,
        isAvailable: formData.is_available,
        departmentId: formData.department_id ? parseInt(formData.department_id) : null,
        licenseNumber: formData.license_number || undefined,
        qualification: formData.qualification || undefined,
        experienceYears: formData.experience_years ? parseInt(formData.experience_years) : 0,
        consultationFee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : 0,
      };
      if (editingDoctor) {
        // updateDoctor converts camelCase to snake_case via toSnakeCase()
        await api.put(`/doctors/${editingDoctor.id}`, payload);
      } else {
        await api.post('/doctors', payload);
      }
      setShowModal(false);
      fetchDoctors();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save doctor'); }
  };

  const filtered = doctors.filter(d =>
    `${d.first_name} ${d.last_name} ${d.specialization}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-green-600" /> Doctors
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {can('doctors:create') ? 'Manage doctor profiles and schedules' : 'View doctor directory'}
          </p>
        </div>
        {can('doctors:create') && (
          <button onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by name or specialization..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
              <div className="flex gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No doctors found</p>
          </div>
        ) : filtered.map(doctor => (
          <div key={doctor.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                  {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h3>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">{doctor.specialization}</p>
                  {doctor.department_name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{doctor.department_name}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {can('doctors:edit') && (
                  <button onClick={() => handleEdit(doctor)}
                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {can('doctors:delete') && (
                  <button onClick={() => handleDelete(doctor.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 mt-3">
              {doctor.email && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{doctor.email}</span>
                </div>
              )}
              {doctor.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{doctor.phone}</span>
                </div>
              )}
              {(doctor.qualification || doctor.experience_years != null) && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Award className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{doctor.qualification || ''}{doctor.qualification && doctor.experience_years ? ' · ' : ''}{doctor.experience_years ? `${doctor.experience_years}y exp` : ''}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                doctor.is_available
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {doctor.is_available ? '● Available' : '○ Unavailable'}
              </span>
              {doctor.consultation_fee != null && parseFloat(String(doctor.consultation_fee)) > 0 && (
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  ${parseFloat(String(doctor.consultation_fee)).toFixed(2)} / visit
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>First Name *</label>
                  <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Last Name *</label>
                  <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Specialization *</label>
                <input required value={formData.specialization} onChange={e => setFormData({...formData, specialization:e.target.value})} className={inp} placeholder="e.g. Cardiology" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Email *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Phone *</label>
                  <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone:e.target.value})} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>License Number</label>
                  <input value={formData.license_number} onChange={e => setFormData({...formData, license_number:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Department ID</label>
                  <input type="number" value={formData.department_id} onChange={e => setFormData({...formData, department_id:e.target.value})} className={inp} placeholder="Optional" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Qualification</label>
                  <input value={formData.qualification} onChange={e => setFormData({...formData, qualification:e.target.value})} className={inp} placeholder="e.g. MD, MBBS" /></div>
                <div><label className={lbl}>Experience (years)</label>
                  <input type="number" min="0" value={formData.experience_years} onChange={e => setFormData({...formData, experience_years:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Consultation Fee ($)</label>
                <input type="number" step="0.01" min="0" value={formData.consultation_fee} onChange={e => setFormData({...formData, consultation_fee:e.target.value})} className={inp} /></div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_available" checked={formData.is_available}
                  onChange={e => setFormData({...formData, is_available:e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <label htmlFor="is_available" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available for appointments
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">
                  {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorsPage;
