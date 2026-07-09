import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, X, Edit, Trash2, Bed } from 'lucide-react';

interface BedRecord {
  id: number;
  ward: string;
  bed_number: string;
  bed_type: string;
  status: string;
  daily_rate: number;
  current_patient?: string;
}

interface BedStats { available: number; occupied: number; maintenance: number; reserved: number; }

const statusColors: Record<string, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  occupied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  reserved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const BedsPage: React.FC = () => {
  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [stats, setStats] = useState<BedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBed, setEditingBed] = useState<BedRecord | null>(null);
  const [formData, setFormData] = useState({ ward: '', bed_number: '', bed_type: 'general', daily_rate: '', status: 'available' });

  useEffect(() => { fetchBeds(); }, [statusFilter]);

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/beds${params}`);
      setBeds(res.data.data.beds || []);
      setStats(res.data.data.stats || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEdit = (bed: BedRecord) => {
    setEditingBed(bed);
    setFormData({ ward: bed.ward, bed_number: bed.bed_number, bed_type: bed.bed_type, daily_rate: String(bed.daily_rate), status: bed.status });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingBed(null);
    setFormData({ ward: '', bed_number: '', bed_type: 'general', daily_rate: '', status: 'available' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, daily_rate: parseFloat(formData.daily_rate) || 0 };
      if (editingBed) {
        await api.put(`/beds/${editingBed.id}`, payload);
      } else {
        await api.post('/beds', payload);
      }
      setShowModal(false);
      fetchBeds();
    } catch (e) { alert('Failed to save bed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this bed? (Cannot delete occupied beds)')) return;
    try { await api.delete(`/beds/${id}`); fetchBeds(); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed to delete bed'); }
  };

  const statCards = [
    { label: 'Available', value: stats?.available ?? 0, color: 'bg-green-500' },
    { label: 'Occupied', value: stats?.occupied ?? 0, color: 'bg-red-500' },
    { label: 'Maintenance', value: stats?.maintenance ?? 0, color: 'bg-yellow-500' },
    { label: 'Reserved', value: stats?.reserved ?? 0, color: 'bg-blue-500' },
  ];

  const filtered = beds.filter(b =>
    b.ward?.toLowerCase().includes(search.toLowerCase()) ||
    b.bed_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Beds Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Track bed availability and assignments</p>
        </div>
        <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Add Bed
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.color}`}><Bed className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by ward or bed number..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
          <option value="reserved">Reserved</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Ward', 'Bed #', 'Type', 'Daily Rate', 'Status', 'Current Patient', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No beds found</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{b.ward}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{b.bed_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{b.bed_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">${parseFloat(String(b.daily_rate)).toFixed(2)}/day</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[b.status]}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{b.current_patient || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(b)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{editingBed ? 'Edit Bed' : 'Add Bed'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ward *</label>
                  <input type="text" required value={formData.ward} onChange={e => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="e.g. General Ward A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bed Number *</label>
                  <input type="text" required value={formData.bed_number} onChange={e => setFormData({ ...formData, bed_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="e.g. A101" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bed Type *</label>
                  <select value={formData.bed_type} onChange={e => setFormData({ ...formData, bed_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
                    <option value="general">General</option>
                    <option value="private">Private</option>
                    <option value="icu">ICU</option>
                    <option value="emergency">Emergency</option>
                    <option value="pediatric">Pediatric</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Rate ($)</label>
                  <input type="number" step="0.01" value={formData.daily_rate} onChange={e => setFormData({ ...formData, daily_rate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {editingBed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reserved">Reserved</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingBed ? 'Update' : 'Add Bed'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedsPage;
