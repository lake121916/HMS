import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, X, Edit, Trash2, AlertTriangle } from 'lucide-react';

interface Medicine {
  id: number;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  nearest_expiry: string;
  description: string;
}

const MedicinesPage: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState({
    name: '', generic_name: '', manufacturer: '', category: '', unit: '', unit_price: '', description: ''
  });
  const [stockData, setStockData] = useState({ quantity: '', reorder_level: '10', batch_number: '', expiry_date: '', location: '' });

  useEffect(() => { fetchMedicines(); }, []);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/medicines${q}`);
      setMedicines(res.data.data.medicines || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEdit = (m: Medicine) => {
    setEditingMedicine(m);
    setFormData({ name: m.name, generic_name: m.generic_name || '', manufacturer: m.manufacturer || '', category: m.category || '', unit: m.unit || '', unit_price: String(m.unit_price), description: m.description || '' });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingMedicine(null);
    setFormData({ name: '', generic_name: '', manufacturer: '', category: '', unit: '', unit_price: '', description: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, unit_price: parseFloat(formData.unit_price) };
      if (editingMedicine) {
        await api.put(`/medicines/${editingMedicine.id}`, payload);
      } else {
        await api.post('/medicines', payload);
      }
      setShowModal(false);
      fetchMedicines();
    } catch (e) { alert('Failed to save medicine'); }
  };

  const handleAddStock = (m: Medicine) => {
    setSelectedMedicine(m);
    setStockData({ quantity: '', reorder_level: '10', batch_number: '', expiry_date: '', location: '' });
    setShowStockModal(true);
  };

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory', {
        medicine_id: selectedMedicine?.id,
        quantity: parseInt(stockData.quantity),
        reorder_level: parseInt(stockData.reorder_level),
        batch_number: stockData.batch_number || undefined,
        expiry_date: stockData.expiry_date || undefined,
        location: stockData.location || undefined,
      });
      setShowStockModal(false);
      fetchMedicines();
    } catch (e) { alert('Failed to add stock'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this medicine?')) return;
    try { await api.delete(`/medicines/${id}`); fetchMedicines(); }
    catch (e) { alert('Failed to delete medicine'); }
  };

  const filtered = medicines.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medicines</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage medicine catalog and stock</p>
        </div>
        <button onClick={handleAdd} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" /> Add Medicine
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by name, generic name, or category..."
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchMedicines()}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Name', 'Generic Name', 'Category', 'Unit', 'Price', 'In Stock', 'Expiry', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No medicines found</td></tr>
              ) : filtered.map(m => {
                const isLowStock = m.stock_quantity <= 10;
                const isExpiringSoon = m.nearest_expiry && new Date(m.nearest_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</div>
                      {m.manufacturer && <div className="text-xs text-gray-500 dark:text-gray-400">{m.manufacturer}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.generic_name || '—'}</td>
                    <td className="px-4 py-3">
                      {m.category && <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{m.category}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{m.unit || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${parseFloat(String(m.unit_price)).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 text-sm font-medium ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {isLowStock && <AlertTriangle className="w-4 h-4" />}
                        {m.stock_quantity}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.nearest_expiry ? (
                        <span className={`text-xs ${isExpiringSoon ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(m.nearest_expiry).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAddStock(m)} title="Add Stock" className="text-green-600 hover:text-green-800 dark:text-green-400 text-xs font-medium">+Stock</button>
                        <button onClick={() => handleEdit(m)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{editingMedicine ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Generic Name</label>
                  <input type="text" value={formData.generic_name} onChange={e => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Manufacturer</label>
                  <input type="text" value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="e.g. Antibiotic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="e.g. Tablet, ml" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price ($) *</label>
                  <input type="number" step="0.01" required value={formData.unit_price} onChange={e => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editingMedicine ? 'Update' : 'Add Medicine'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Stock</h2>
              <button onClick={() => setShowStockModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmitStock} className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-300">{selectedMedicine.name}</p>
                <p className="text-blue-600 dark:text-blue-400">Current stock: {selectedMedicine.stock_quantity}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                  <input type="number" required value={stockData.quantity} onChange={e => setStockData({ ...stockData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level</label>
                  <input type="number" value={stockData.reorder_level} onChange={e => setStockData({ ...stockData, reorder_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number</label>
                  <input type="text" value={stockData.batch_number} onChange={e => setStockData({ ...stockData, batch_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                  <input type="date" value={stockData.expiry_date} onChange={e => setStockData({ ...stockData, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Storage Location</label>
                <input type="text" value={stockData.location} onChange={e => setStockData({ ...stockData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" placeholder="e.g. Shelf A3" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicinesPage;
