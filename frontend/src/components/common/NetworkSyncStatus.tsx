import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Database,
  Trash2
} from 'lucide-react';
import offlineVitalsService, { OfflineVitalsRecord } from '../../services/offlineVitalsService';

export const NetworkSyncStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [records, setRecords] = useState<OfflineVitalsRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const refreshQueue = async () => {
    const list = await offlineVitalsService.getAll();
    setRecords(list);
  };

  useEffect(() => {
    refreshQueue();

    const unsubscribe = offlineVitalsService.subscribe(() => {
      refreshQueue();
    });

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await offlineVitalsService.syncPending();
      setLastSyncTime(new Date());
      await refreshQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearSynced = async () => {
    await offlineVitalsService.clearSynced();
    await refreshQueue();
  };

  const pendingCount = records.filter(r => r.sync_status === 'PENDING').length;
  const failedCount = records.filter(r => r.sync_status === 'FAILED' || r.sync_status === 'CONFLICT').length;
  const syncedCount = records.filter(r => r.sync_status === 'SYNCED').length;

  return (
    <>
      {/* ── Status Trigger Button (Midnight Navy Styling) ── */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all border ${
          !isOnline
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            : isSyncing
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse'
            : failedCount > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            : pendingCount > 0
            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
        }`}
        title="Network & Offline Synchronization Status"
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Offline</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                {pendingCount}
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span className="hidden sm:inline">Syncing...</span>
          </>
        ) : failedCount > 0 ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Sync Alert</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
              {failedCount}
            </span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pending</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px]">
              {pendingCount}
            </span>
          </>
        ) : (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Online</span>
          </>
        )}
      </button>

      {/* ── Offline Synchronization Dashboard Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#0a1329] border border-cyan-500/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/15 bg-[#070e1e]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Offline Resilience & Synchronization
                    <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isOnline ? 'Connected to AKEH Hospital Network' : 'Working in local offline buffer mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 px-6 py-3 bg-[#0c1836] border-b border-cyan-500/10 text-center">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-lg font-bold text-cyan-400">{pendingCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">Pending Sync</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-lg font-bold text-emerald-400">{syncedCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">Synchronized</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-lg font-bold text-rose-400">{failedCount}</div>
                <div className="text-[11px] text-slate-400 font-medium">Failed / Conflict</div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-[#0a1329] border-b border-cyan-500/10 text-xs">
              <span className="text-slate-400">
                {lastSyncTime
                  ? `Last synchronized: ${lastSyncTime.toLocaleTimeString()}`
                  : 'Ready for background synchronization'}
              </span>
              <div className="flex items-center gap-2">
                {syncedCount > 0 && (
                  <button
                    onClick={handleClearSynced}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Synced</span>
                  </button>
                )}
                <button
                  onClick={handleSync}
                  disabled={!isOnline || isSyncing || pendingCount === 0}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold shadow-sm hover:opacity-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>

            {/* Records List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {records.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <Database className="w-10 h-10 mx-auto opacity-20 mb-2 text-cyan-400" />
                  <p className="font-semibold text-slate-400">No buffered offline records</p>
                  <p className="text-[11px] mt-1 text-slate-500">
                    Any vitals entered while offline will be securely queued here with idempotency tracking.
                  </p>
                </div>
              ) : (
                records.map((rec) => (
                  <div
                    key={rec.idempotency_key}
                    className="p-3.5 rounded-xl bg-[#0e1a38] border border-cyan-500/15 hover:border-cyan-500/30 transition text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rec.patient_name || 'Patient'}</span>
                        <span className="font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px]">
                          {rec.patient_mrn}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Encounter #{rec.encounter_id}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.sync_status === 'SYNCED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : rec.sync_status === 'SYNCING'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 animate-pulse'
                            : rec.sync_status === 'CONFLICT'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : rec.sync_status === 'FAILED'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {rec.sync_status}
                      </span>
                    </div>

                    {/* Vitals summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] bg-slate-900/60 p-2 rounded-lg text-slate-300">
                      <div>
                        <span className="text-slate-500">BP: </span>
                        <span className="font-mono font-medium">
                          {rec.vitals.blood_pressure_systolic || '--'}/{rec.vitals.blood_pressure_diastolic || '--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Temp: </span>
                        <span className="font-mono font-medium">{rec.vitals.temperature || '--'} °C</span>
                      </div>
                      <div>
                        <span className="text-slate-500">HR: </span>
                        <span className="font-mono font-medium">{rec.vitals.heart_rate || '--'} bpm</span>
                      </div>
                      <div>
                        <span className="text-slate-500">SpO₂: </span>
                        <span className="font-mono font-medium">{rec.vitals.oxygen_saturation || '--'}%</span>
                      </div>
                    </div>

                    {/* Timestamps & details */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Observed: {new Date(rec.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      {rec.synced_at && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Synced at {new Date(rec.synced_at).toLocaleTimeString()}</span>
                        </span>
                      )}
                    </div>

                    {rec.error_message && (
                      <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                        Error: {rec.error_message}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkSyncStatus;
