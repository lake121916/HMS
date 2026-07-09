import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, AlertTriangle, Edit, X } from 'lucide-react';

interface InventoryItem {
  id: number;
  medicine_id: number;
  medicine_name: string;
  generic_name: string;
  category: string;
  unit: string;
  unit_price: number;
  quantity: number;
  reorder_level: number;
  batch_number: string;
  expiry_date: string;
  location: string;
  last_restocked_date: string;
}

const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editData, setEditData] = useState({ quantity: '', reorder_level: '', location: '' });
  const [filterLow, setFilterLow] = useState(false);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory');
      setInventory(res.data.data.inventory || []);
      setLowStockCount(res.data.data.lowStockCount || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditData({ quantity: String(item.quantity), reorder_level: String(item.reorder_level), location: item.location || '' });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/inventory/${editingItem?.id}`, {
        quantity: parseInt(editData.quantity),
        reorder_level: parseInt(editData.reorder_level),
        location: editData.location || undefined,
      });
      setShowEditModal(false);
      fetchInventory();
    } catch (e) { alert('Failed to update inventory'); }
  };

  const filtered = inventory.filter(item => {
    const matchSearch = item.medicine_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.batch_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase());
    const matchLow = !filterLow || item.quantity <= item.reorder_level;
    return matchSearch && matchLow;
  });

  const today = new Date();
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Medicine stock levels and inventory tracking</p>
      </div>

      {/* Alert banner for low stock */}
      {lowStockCount > 0 && (
        <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} below reorder level</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Please restock these items to avoid shortages.</p>
          </div>
          <button onClick={() => setFilterLow(!filterLow)} className={`ml-auto text-xs font-medium px-3 py-1 rounded-lg transition-colors ${filterLow ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
            {filterLow ? 'Show All' : 'Show Low Stock'}
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Search by medicine name, batch number, or location..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Medicine', 'Category', 'Quantity', 'Reorder Level', 'Status', 'Batch', 'Expiry', 'Location', 'Last Restocked', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No inventory items found</td></tr>
              ) : filtered.map(item => {
                const isLow = item.quantity <= item.reorder_level;
                const expDate = item.expiry_date ? new Date(item.expiry_date) : null;
                const isExpired = expDate && expDate < today;
                const isExpiringSoon = expDate && expDate >= today && expDate <= thirtyDays;

                return (
                  <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${isLow ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.medicine_name}</div>
                      {item.generic_name && <div className="text-xs text-gray-500 dark:text-gray-400">{item.generic_name}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {item.category && <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">{item.category}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1 text-sm font-bold ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                        {isLow && <AlertTriangle className="w-3.5 h-3.5" />}
                        {item.quantity} {item.unit}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.reorder_level}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isLow ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                        {isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.batch_number || '—'}</td>
                    <td className="px-4 py-3">
                      {expDate ? (
                        <span className={`text-xs font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {isExpired && '⚠️ '}{expDate.toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.location || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {item.last_restocked_date ? new Date(item.last_restocked_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Edit className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Inventory</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900 dark:text-white">{editingItem.medicine_name}</p>
                <p className="text-gray-500 dark:text-gray-400">Batch: {editingItem.batch_number || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" required value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level</label>
                <input type="number" value={editData.reorder_level} onChange={e => setEditData({ ...editData, reorder_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Storage Location</label>
                <input type="text" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
