import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  Shield, Search, X, Calendar, Activity, ChevronLeft, ChevronRight, Info
} from 'lucide-react';

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string;
  user_agent: string;
  timestamp: string;
}

const AuditPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const LIMIT = 15;

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * LIMIT;
      const res = await api.get(`/admin/audit-logs?limit=${LIMIT}&offset=${offset}`);
      if (res.data.success) {
        setLogs(res.data.data.logs || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (act: string) => {
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400';
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('REGISTER')) return 'text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400';
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400';
  };

  // Filter logs locally based on search term
  const filteredLogs = logs.filter(log =>
    log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-yellow-600" /> System Audit Logs
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Authorized monitoring of security compliance events, login timestamps, and changes to database states.
        </p>
      </div>

      {/* Search Filter */}
      <div className="flex bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by action type, entity table, or user email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading system compliance logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No security audit logs found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3 font-semibold">Timestamp</th>
                  <th className="px-5 py-3 font-semibold">Authorized User</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Target Entity</th>
                  <th className="px-5 py-3 font-semibold">Client IP</th>
                  <th className="px-5 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      {log.user_email || 'anonymous'}
                      <span className="block text-[10px] font-normal text-gray-400">User ID: #{log.user_id || 0}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-600 dark:text-gray-400">
                      <span className="capitalize">{log.entity_type || 'N/A'}</span>
                      {log.entity_id && <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded ml-1">#{log.entity_id}</span>}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-250 dark:hover:bg-gray-600 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300"
                      >
                        <Info className="w-3.5 h-3.5 text-blue-600" /> Diffs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50">
          <span className="text-xs text-gray-500">
            Showing Page {page} of {totalPages} ({total} entries total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: View Change Diff details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <div>
                <span className="font-bold text-gray-900 dark:text-white block">Audit Event details</span>
                <span className="text-xs text-gray-400">Log ID: #{selectedLog.id} • Action: {selectedLog.action}</span>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-semibold uppercase">Authorized User</span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.user_email || 'System'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase">Entity Modification</span>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{selectedLog.entity_type} ID: {selectedLog.entity_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase">Client IP Address</span>
                  <p className="font-mono text-gray-800 dark:text-gray-200">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-semibold uppercase">System Browser Agent</span>
                  <p className="text-gray-800 dark:text-gray-200 truncate" title={selectedLog.user_agent}>{selectedLog.user_agent}</p>
                </div>
              </div>

              {/* Diffs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                {/* Old value JSON */}
                <div>
                  <span className="text-xs font-bold text-red-500 block mb-1.5">Pre-Existing values (Old)</span>
                  <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100/50 dark:border-red-950/40 p-3 rounded-xl font-mono text-xs overflow-x-auto max-h-56">
                    {selectedLog.old_values ? (
                      <pre>{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                    ) : (
                      <span className="italic text-gray-400">None / Insert statement</span>
                    )}
                  </div>
                </div>

                {/* New value JSON */}
                <div>
                  <span className="text-xs font-bold text-green-500 block mb-1.5">Updated values (New)</span>
                  <div className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-100/50 dark:border-green-950/40 p-3 rounded-xl font-mono text-xs overflow-x-auto max-h-56">
                    {selectedLog.new_values ? (
                      <pre>{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                    ) : (
                      <span className="italic text-gray-400">None / Delete statement</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/30 px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPage;
