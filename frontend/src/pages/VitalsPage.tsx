import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Plus, Search, Edit, Trash2, X, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Vital {
  id: number; patient_id: number; patient_name: string; nurse_name: string;
  recorded_at: string; temperature: number; blood_pressure_systolic: number;
  blood_pressure_diastolic: number; heart_rate: number; respiratory_rate: number;
  oxygen_saturation: number; weight: number; height: number; blood_glucose: number; notes: string;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const VitalsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vital | null>(null);
  const [form, setForm] = useState({ patient_id:'', temperature:'', blood_pressure_systolic:'',
    blood_pressure_diastolic:'', heart_rate:'', respiratory_rate:'',
    oxygen_saturation:'', weight:'', height:'', blood_glucose:'', notes:'' });

  useEffect(() => { fetchVitals(); }, []);

  const fetchVitals = async () => {
    try {
      const r = await api.get('/vitals');
      setVitals(r.data.data.vitals || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ patient_id:'',temperature:'',blood_pressure_systolic:'',blood_pressure_diastolic:'',
      heart_rate:'',respiratory_rate:'',oxygen_saturation:'',weight:'',height:'',blood_glucose:'',notes:'' });
    setShowModal(true);
  };

  const openEdit = (v: Vital) => {
    setEditing(v);
    setForm({
      patient_id: String(v.patient_id), temperature: String(v.temperature||''),
      blood_pressure_systolic: String(v.blood_pressure_systolic||''),
      blood_pressure_diastolic: String(v.blood_pressure_diastolic||''),
      heart_rate: String(v.heart_rate||''), respiratory_rate: String(v.respiratory_rate||''),
      oxygen_saturation: String(v.oxygen_saturation||''), weight: String(v.weight||''),
      height: String(v.height||''), blood_glucose: String(v.blood_glucose||''), notes: v.notes||''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    ['temperature','blood_pressure_systolic','blood_pressure_diastolic','heart_rate',
     'respiratory_rate','oxygen_saturation','weight','height','blood_glucose','patient_id']
      .forEach(k => { if (payload[k] !== '') payload[k] = parseFloat(payload[k]); else delete payload[k]; });
    try {
      if (editing) { await api.put(`/vitals/${editing.id}`, payload); }
      else { await api.post('/vitals', payload); }
      setShowModal(false); fetchVitals();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this vital record?')) return;
    try { await api.delete(`/vitals/${id}`); fetchVitals(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = vitals.filter(v =>
    v.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.nurse_name?.toLowerCase().includes(search.toLowerCase())
  );

  const isPatient = user?.role === 'patient';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" /> Vitals
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {can('vitals:create') ? 'Record and track patient vital signs' : 'View vital sign records'}
          </p>
        </div>
        {can('vitals:create') && (
          <button onClick={openAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> Record Vitals
          </button>
        )}
      </div>

      {!isPatient && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient or nurse name..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
      )}

      {/* Role info banner */}
      {user?.role === 'nurse' && (
        <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl text-sm text-teal-700 dark:text-teal-300">
          <strong>Nurse role:</strong> You can record and edit vitals for patients. Only admins can delete records.
        </div>
      )}
      {user?.role === 'doctor' && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-sm text-blue-700 dark:text-blue-300">
          <strong>Doctor role:</strong> You can view all vitals and record vitals if needed. Typically recorded by nurses.
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {[isPatient?'Recorded By':'Patient', 'Date', 'Temp °C', 'BP', 'HR', 'O₂%', 'Weight kg', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No vitals recorded</td></tr>
              ) : filtered.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-3 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{isPatient ? (v.nurse_name||'Staff') : v.patient_name}</div>
                    {!isPatient && v.nurse_name && <div className="text-xs text-gray-400">by {v.nurse_name}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{new Date(v.recorded_at).toLocaleString()}</td>
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{v.temperature||'—'}</td>
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {v.blood_pressure_systolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}` : '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{v.heart_rate||'—'}</td>
                  <td className="px-3 py-3">
                    {v.oxygen_saturation && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${parseFloat(String(v.oxygen_saturation)) < 95 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {v.oxygen_saturation}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">{v.weight||'—'}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 max-w-[120px] truncate">{v.notes||'—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {can('vitals:edit') && (
                        <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700"><Edit className="w-4 h-4" /></button>
                      )}
                      {can('vitals:delete') && (
                        <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Vitals' : 'Record Vitals'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editing && (
                <div><label className={lbl}>Patient ID *</label>
                  <input type="number" required value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} className={inp} placeholder="Enter patient ID" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Temperature (°C)</label><input type="number" step="0.1" value={form.temperature} onChange={e=>setForm({...form,temperature:e.target.value})} className={inp} placeholder="37.0" /></div>
                <div><label className={lbl}>Heart Rate (bpm)</label><input type="number" value={form.heart_rate} onChange={e=>setForm({...form,heart_rate:e.target.value})} className={inp} placeholder="72" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>BP Systolic (mmHg)</label><input type="number" value={form.blood_pressure_systolic} onChange={e=>setForm({...form,blood_pressure_systolic:e.target.value})} className={inp} placeholder="120" /></div>
                <div><label className={lbl}>BP Diastolic (mmHg)</label><input type="number" value={form.blood_pressure_diastolic} onChange={e=>setForm({...form,blood_pressure_diastolic:e.target.value})} className={inp} placeholder="80" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Respiratory Rate</label><input type="number" value={form.respiratory_rate} onChange={e=>setForm({...form,respiratory_rate:e.target.value})} className={inp} placeholder="16" /></div>
                <div><label className={lbl}>O₂ Saturation (%)</label><input type="number" step="0.1" max="100" value={form.oxygen_saturation} onChange={e=>setForm({...form,oxygen_saturation:e.target.value})} className={inp} placeholder="98" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Weight (kg)</label><input type="number" step="0.1" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Height (cm)</label><input type="number" step="0.1" value={form.height} onChange={e=>setForm({...form,height:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Blood Glucose (mmol/L)</label><input type="number" step="0.1" value={form.blood_glucose} onChange={e=>setForm({...form,blood_glucose:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} className={inp} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">{editing ? 'Update' : 'Save Vitals'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsPage;
