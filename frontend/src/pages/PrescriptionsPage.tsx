import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Edit, Trash2, X, CheckCircle, Pill } from 'lucide-react';

interface Prescription {
  id: number; patient_id: number; doctor_id: number; patient_name: string; doctor_name: string;
  medication_name: string; dosage: string; frequency: string; duration: string;
  instructions: string; is_dispensed: boolean; prescribed_date: string;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const PrescriptionsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDispensed, setFilterDispensed] = useState<'' | 'false' | 'true'>('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [form, setForm] = useState({ patient_id:'', diagnosis_id:'', medication_name:'', dosage:'', frequency:'', duration:'', instructions:'' });

  useEffect(() => { fetchPrescriptions(); }, [filterDispensed]);

  const fetchPrescriptions = async () => {
    try {
      const params = filterDispensed ? `?is_dispensed=${filterDispensed}` : '';
      const r = await api.get(`/prescriptions${params}`);
      setPrescriptions(r.data.data.prescriptions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ patient_id:'', diagnosis_id:'', medication_name:'', dosage:'', frequency:'', duration:'', instructions:'' });
    setShowModal(true);
  };

  const openEdit = (p: Prescription) => {
    setEditing(p);
    setForm({ patient_id:String(p.patient_id), diagnosis_id:'', medication_name:p.medication_name, dosage:p.dosage, frequency:p.frequency, duration:p.duration, instructions:p.instructions||'' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, patient_id: parseInt(form.patient_id), diagnosis_id: form.diagnosis_id ? parseInt(form.diagnosis_id) : undefined };
      if (editing) { await api.put(`/prescriptions/${editing.id}`, payload); }
      else { await api.post('/prescriptions', payload); }
      setShowModal(false); fetchPrescriptions();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleDispense = async (id: number) => {
    if (!window.confirm('Mark this prescription as dispensed?')) return;
    try {
      await api.put(`/prescriptions/${id}`, { is_dispensed: true });
      fetchPrescriptions();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this prescription?')) return;
    try { await api.delete(`/prescriptions/${id}`); fetchPrescriptions(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = prescriptions.filter(p =>
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.medication_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pill className="w-6 h-6 text-purple-600" /> Prescriptions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'doctor' && 'Create and manage your prescriptions'}
            {user?.role === 'pharmacist' && 'View and dispense prescriptions — you cannot create or delete'}
            {user?.role === 'patient' && 'Your active and past prescriptions'}
            {(user?.role === 'nurse') && 'View patient prescriptions'}
            {(user?.role === 'super_admin' || user?.role === 'admin') && 'Manage all prescriptions'}
          </p>
        </div>
        {can('prescriptions:create') && (
          <button onClick={openAdd} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> New Prescription
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient, doctor, or medication..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        {user?.role === 'pharmacist' && (
          <select value={filterDispensed} onChange={e => setFilterDispensed(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            <option value="false">Pending Dispense</option>
            <option value="true">Dispensed</option>
          </select>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Patient', 'Doctor', 'Medication', 'Dosage', 'Frequency', 'Duration', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No prescriptions found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.patient_name}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.doctor_name}</td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">{p.medication_name}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.dosage}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.frequency}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.duration}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${p.is_dispensed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.is_dispensed ? 'Dispensed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{new Date(p.prescribed_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {can('prescriptions:dispense') && !p.is_dispensed && (
                        <button onClick={() => handleDispense(p.id)} title="Mark Dispensed" className="text-green-500 hover:text-green-700">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {can('prescriptions:edit') && (
                        <button onClick={() => openEdit(p)} title="Edit" className="text-blue-500 hover:text-blue-700"><Edit className="w-4 h-4" /></button>
                      )}
                      {can('prescriptions:delete') && (
                        <button onClick={() => handleDelete(p.id)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && can('prescriptions:create') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Prescription' : 'New Prescription'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editing && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Patient ID *</label><input type="number" required value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} className={inp} /></div>
                  <div><label className={lbl}>Diagnosis ID</label><input type="number" value={form.diagnosis_id} onChange={e=>setForm({...form,diagnosis_id:e.target.value})} className={inp} placeholder="Optional" /></div>
                </div>
              )}
              <div><label className={lbl}>Medication Name *</label><input required value={form.medication_name} onChange={e=>setForm({...form,medication_name:e.target.value})} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Dosage *</label><input required value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className={inp} placeholder="e.g. 500mg" /></div>
                <div><label className={lbl}>Frequency *</label><input required value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} className={inp} placeholder="e.g. Twice daily" /></div>
              </div>
              <div><label className={lbl}>Duration *</label><input required value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} className={inp} placeholder="e.g. 7 days" /></div>
              <div><label className={lbl}>Instructions</label><textarea value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} rows={3} className={inp} placeholder="Take with food, avoid alcohol..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsPage;
