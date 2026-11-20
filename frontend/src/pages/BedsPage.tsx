import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, X, Edit2, Trash2, Bed, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { DashboardHeader, StatisticCard } from '../components/common/PremiumUI';

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

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  available:   { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  occupied:    { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  maintenance: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  reserved:    { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
};

const inp = 'w-full px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-sm focus:ring-2 focus:ring-cyan-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none transition';
const lbl = 'block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5';

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

  const filtered = beds.filter(b =>
    b.ward?.toLowerCase().includes(search.toLowerCase()) ||
    b.bed_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Bed Capacity & Ward Grid"
        amharicTitle="የሆስፒታል አልጋዎች እና የዋርድ ቁጥጥር"
        badge="Ward Operations"
        icon={Bed}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBeds}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-navy-700/80 bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:border-cyan-500/40 transition disabled:opacity-50 cursor-pointer"
              title="Refresh Beds"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bed</span>
            </button>
          </div>
        }
      />

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatisticCard
          title="Available Beds"
          value={stats?.available ?? 0}
          subtitle="Ready for admission"
          icon={CheckCircle2}
          variant="teal"
        />
        <StatisticCard
          title="Occupied Beds"
          value={stats?.occupied ?? 0}
          subtitle="Current inpatients"
          icon={Bed}
          variant="rose"
        />
        <StatisticCard
          title="Under Maintenance"
          value={stats?.maintenance ?? 0}
          subtitle="Cleaning / repair"
          icon={AlertTriangle}
          variant="amber"
        />
        <StatisticCard
          title="Reserved Beds"
          value={stats?.reserved ?? 0}
          subtitle="Pre-booked transfers"
          icon={Clock}
          variant="blue"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ward name or bed number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700/80 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none transition cursor-pointer"
        >
          <option value="">All Statuses ({beds.length})</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
          <option value="reserved">Reserved</option>
        </select>
      </div>

      {/* Mobile Bed Cards (< sm) */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-500" />
            Loading beds...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-8 text-center text-slate-400">
            <Bed className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-500" />
            No beds found
          </div>
        ) : (
          filtered.map(bed => {
            const conf = statusConfig[bed.status] || statusConfig.available;
            return (
              <div
                key={bed.id}
                className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-black text-sm flex items-center justify-center shrink-0">
                      {bed.bed_number}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {bed.ward}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {bed.bed_type} Ward Bed
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 text-[11px] font-bold rounded-full border capitalize ${conf.bg} ${conf.text} ${conf.border}`}>
                    {bed.status}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-navy-950/60 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400">Daily Rate:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bed.daily_rate} ETB/day</span>
                  </div>
                  {bed.current_patient && (
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-navy-800">
                      <span className="text-slate-400">Occupant:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">{bed.current_patient}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-navy-800">
                  <button
                    onClick={() => handleEdit(bed)}
                    className="flex-1 py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 rounded-xl hover:bg-cyan-100 transition text-center cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  {bed.status !== 'occupied' && (
                    <button
                      onClick={() => handleDelete(bed.id)}
                      className="flex-1 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl hover:bg-rose-100 transition text-center cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Data Table (>= sm) */}
      <div className="hidden sm:block bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-navy-950/60 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-navy-800">
              <tr>
                {['Ward', 'Bed Number', 'Type', 'Daily Rate (ETB)', 'Current Patient', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-cyan-500 opacity-60" />
                    Loading bed grid...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Bed className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-500" />
                    No beds matched your criteria
                  </td>
                </tr>
              ) : (
                filtered.map(bed => {
                  const conf = statusConfig[bed.status] || statusConfig.available;
                  return (
                    <tr key={bed.id} className="hover:bg-slate-50/70 dark:hover:bg-navy-800/40 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-slate-900 dark:text-white">
                        {bed.ward}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          {bed.bed_number}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                        {bed.bed_type}
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {bed.daily_rate} ETB
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {bed.current_patient || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full border capitalize ${conf.bg} ${conf.text} ${conf.border}`}>
                          {bed.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(bed)}
                            className="p-1.5 rounded-lg text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                            title="Edit Bed"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {bed.status !== 'occupied' && (
                            <button
                              onClick={() => handleDelete(bed.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete Bed"
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

      {/* Bed Edit / Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-navy-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Bed className="w-5 h-5 text-cyan-500" /> {editingBed ? 'Edit Bed Configuration' : 'Add New Hospital Bed'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className={lbl}>Ward Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surgical Ward, ICU, Maternity"
                  value={formData.ward}
                  onChange={e => setFormData({ ...formData, ward: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Bed Identification Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B-101, ICU-04"
                  value={formData.bed_number}
                  onChange={e => setFormData({ ...formData, bed_number: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Bed Classification Type</label>
                <select
                  value={formData.bed_type}
                  onChange={e => setFormData({ ...formData, bed_type: e.target.value })}
                  className={inp}
                >
                  <option value="general">General</option>
                  <option value="icu">ICU</option>
                  <option value="maternity">Maternity</option>
                  <option value="pediatric">Pediatric</option>
                  <option value="vip">VIP Suite</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Daily Rate (ETB)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 350.00"
                  value={formData.daily_rate}
                  onChange={e => setFormData({ ...formData, daily_rate: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Operational Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={inp}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-navy-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingBed ? 'Update Bed' : 'Create Bed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedsPage;
