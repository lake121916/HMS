import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, X, LogOut } from 'lucide-react';
import RoleGuard from '../components/RoleGuard';

interface Admission {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  specialization: string;
  bed_number: string;
  ward: string;
  bed_type: string;
  admission_date: string;
  discharge_date: string;
  status: string;
  diagnosis: string;
  treatment_plan: string;
  total_charges: number;
}

const statusColors: Record<string, string> = {
  admitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  discharged: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  transferred: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const AdmissionsPage: React.FC = () => {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('admitted');
  const [showModal, setShowModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [formData, setFormData] = useState({
    patient_id: '', bed_id: '', admitting_doctor_id: '', diagnosis: '', treatment_plan: ''
  });
  const [dischargeData, setDischargeData] = useState({ discharge_summary: '', total_charges: '' });

  useEffect(() => { fetchAdmissions(); }, [statusFilter]);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/admissions${params}`);
      setAdmissions(res.data.data.admissions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admissions', {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        bed_id: formData.bed_id ? parseInt(formData.bed_id) : undefined,
        admitting_doctor_id: formData.admitting_doctor_id ? parseInt(formData.admitting_doctor_id) : undefined,
      });
      setShowModal(false);
      fetchAdmissions();
    } catch (e) { alert('Failed to create admission'); }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admissions/${selectedAdmission?.id}/discharge`, {
        discharge_summary: dischargeData.discharge_summary,
        total_charges: dischargeData.total_charges ? parseFloat(dischargeData.total_charges) : 0
      });
      setShowDischargeModal(false);
      fetchAdmissions();
    } catch (e) { alert('Failed to discharge patient'); }
  };

  const filtered = admissions.filter(a =>
    a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.ward?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'doctor', 'nurse', 'receptionist']}>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admissions</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage patient admissions and bed assignments</p>
        </div>
        <button onClick={() => { setFormData({ patient_id: '', bed_id: '', admitting_doctor_id: '', diagnosis: '', treatment_plan: '' }); setShowModal(true); }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Admit Patient
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient or ward..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
          <option value="">All</option>
          <option value="admitted">Admitted</option>
          <option value="discharged">Discharged</option>
          <option value="transferred">Transferred</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Patient', 'Doctor', 'Bed / Ward', 'Admitted', 'Diagnosis', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No admissions found</td></tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{a.patient_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.patient_phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 dark:text-white">{a.doctor_name || '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.specialization}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{a.bed_number ? `Bed ${a.bed_number}` : '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{a.ward} {a.bed_type && `(${a.bed_type})`}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">{new Date(a.admission_date).toLocaleDateString()}</div>
                    {a.discharge_date && <div className="text-xs text-green-600 dark:text-green-400">Discharged: {new Date(a.discharge_date).toLocaleDateString()}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={a.diagnosis}>{a.diagnosis || '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[a.status] || 'bg-gray-100 text-gray-800'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {a.status === 'admitted' && (
                        <button onClick={() => { setSelectedAdmission(a); setDischargeData({ discharge_summary: '', total_charges: String(a.total_charges || '') }); setShowDischargeModal(true); }}
                          title="Discharge" className="flex items-center text-xs text-red-600 hover:text-red-800 dark:text-red-400 font-medium">
                          <LogOut className="w-4 h-4 mr-1" /> Discharge
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

      {/* Admit Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admit Patient</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Patient ID *</label>
                  <input type="number" required value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bed ID</label>
                  <input type="number" value={formData.bed_id} onChange={e => setFormData({ ...formData, bed_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admitting Doctor ID</label>
                <input type="number" value={formData.admitting_doctor_id} onChange={e => setFormData({ ...formData, admitting_doctor_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diagnosis</label>
                <textarea value={formData.diagnosis} onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Treatment Plan</label>
                <textarea value={formData.treatment_plan} onChange={e => setFormData({ ...formData, treatment_plan: e.target.value })} rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Admit Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Modal */}
      {showDischargeModal && selectedAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Discharge Patient</h2>
              <button onClick={() => setShowDischargeModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleDischarge} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">{selectedAdmission.patient_name}</p>
                <p className="text-blue-600 dark:text-blue-400">Admitted: {new Date(selectedAdmission.admission_date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discharge Summary</label>
                <textarea value={dischargeData.discharge_summary} onChange={e => setDischargeData({ ...dischargeData, discharge_summary: e.target.value })} rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the patient's discharge condition and instructions..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Charges ($)</label>
                <input type="number" step="0.01" value={dischargeData.total_charges} onChange={e => setDischargeData({ ...dischargeData, total_charges: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowDischargeModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm Discharge</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </RoleGuard>
  );
};

export default AdmissionsPage;
