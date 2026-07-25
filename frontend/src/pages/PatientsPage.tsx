import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Plus, Search, Edit, Trash2, X, Eye, Users } from 'lucide-react';

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  blood_type: string;
  date_of_birth: string;
  address?: string;
  gender?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_number?: string;
  medical_history?: string;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const PatientsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'', bloodType:'', dateOfBirth:'',
    address:'', gender:'male', allergies:'', emergencyContactName:'',
    emergencyContactPhone:'', insuranceNumber:'', medicalHistory:''
  });

  useEffect(() => { fetchPatients(); }, [page, search]);

  const fetchPatients = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '12' });
      if (search) params.append('search', search);
      const r = await api.get(`/patients?${params}`);
      setPatients(r.data.data.patients || []);
      setTotalPages(r.data.data.pagination?.totalPages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ firstName:'', lastName:'', email:'', phone:'', bloodType:'', dateOfBirth:'',
      address:'', gender:'male', allergies:'', emergencyContactName:'',
      emergencyContactPhone:'', insuranceNumber:'', medicalHistory:'' });
    navigate('/patients/new');
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      firstName: p.first_name, lastName: p.last_name, email: p.email || '',
      phone: p.phone || '', bloodType: p.blood_type || '',
      dateOfBirth: p.date_of_birth?.split('T')[0] || '',
      address: p.address || '', gender: p.gender || 'male',
      allergies: p.allergies || '', emergencyContactName: p.emergency_contact_name || '',
      emergencyContactPhone: p.emergency_contact_phone || '',
      insuranceNumber: p.insurance_number || '', medicalHistory: p.medical_history || ''
    });
    setShowModal(true);
  };

  const openView = (p: Patient) => { setViewing(p); setViewModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/patients/${editing.id}`, form);
      } else {
        await api.post('/patients', form);
      }
      setShowModal(false);
      if (location.pathname.endsWith('/new')) navigate('/patients');
      fetchPatients();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save patient'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this patient? All related records will also be removed.')) return;
    try {
      await api.delete(`/patients/${id}`);
      fetchPatients();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete patient'); }
  };

  React.useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setEditing(null);
      setForm({ firstName:'', lastName:'', email:'', phone:'', bloodType:'', dateOfBirth:'',
        address:'', gender:'male', allergies:'', emergencyContactName:'',
        emergencyContactPhone:'', insuranceNumber:'', medicalHistory:'' });
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Patients
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {can('patients:create') ? 'Register and manage patient records' : 'View patient records'}
          </p>
        </div>
        {can('patients:create') && (
          <button onClick={openAdd}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> Add Patient
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search patients by name, email or phone..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Patient', 'Contact', 'DOB', 'Blood Type', 'Gender', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                  </td></tr>
                ))
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No patients found</p>
                </td></tr>
              ) : patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs flex-shrink-0">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-gray-400">{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.blood_type ? (
                      <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                        {p.blood_type}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{p.gender || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openView(p)} title="View Details"
                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Eye className="w-4 h-4" /></button>
                      {can('patients:edit') && (
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"><Edit className="w-4 h-4" /></button>
                      )}
                      {can('patients:delete') && (
                        <button onClick={() => handleDelete(p.id)} title="Delete"
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                ← Prev
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Patient' : 'Register New Patient'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>First Name *</label>
                  <input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Last Name *</label>
                  <input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Email *</label>
                <input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Phone *</label>
                  <input type="tel" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Date of Birth *</label>
                  <input type="date" required value={form.dateOfBirth} onChange={e=>setForm({...form,dateOfBirth:e.target.value})} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Gender *</label>
                  <select required value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className={inp}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><label className={lbl}>Blood Type</label>
                  <select value={form.bloodType} onChange={e=>setForm({...form,bloodType:e.target.value})} className={inp}>
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Address</label>
                <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Allergies</label>
                <textarea value={form.allergies} onChange={e=>setForm({...form,allergies:e.target.value})} rows={2} className={inp} placeholder="List any known allergies..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Emergency Contact Name</label>
                  <input value={form.emergencyContactName} onChange={e=>setForm({...form,emergencyContactName:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Emergency Contact Phone</label>
                  <input value={form.emergencyContactPhone} onChange={e=>setForm({...form,emergencyContactPhone:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Insurance Number</label>
                <input value={form.insuranceNumber} onChange={e=>setForm({...form,insuranceNumber:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Medical History</label>
                <textarea value={form.medicalHistory} onChange={e=>setForm({...form,medicalHistory:e.target.value})} rows={3} className={inp} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  {editing ? 'Update' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                  {viewing.first_name?.[0]}{viewing.last_name?.[0]}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{viewing.first_name} {viewing.last_name}</h2>
              </div>
              <button onClick={() => setViewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              {([
                ['Email', viewing.email],
                ['Phone', viewing.phone || '—'],
                ['Date of Birth', viewing.date_of_birth ? new Date(viewing.date_of_birth).toLocaleDateString() : '—'],
                ['Gender', viewing.gender || '—'],
                ['Blood Type', viewing.blood_type || '—'],
                ['Insurance #', viewing.insurance_number || '—'],
                ['Emergency Contact', viewing.emergency_contact_name || '—'],
                ['Emergency Phone', viewing.emergency_contact_phone || '—'],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{k}</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{v}</p>
                </div>
              ))}
              {viewing.allergies && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Allergies</p>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{viewing.allergies}</p>
                </div>
              )}
              {viewing.medical_history && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Medical History</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">{viewing.medical_history}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
