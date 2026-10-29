import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  getPendingOperations,
  syncOfflineOperations,
  PendingOperation
} from '../services/offlineSyncService';

const OfflineStatusBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshQueue = () => {
    setPendingOps(getPendingOperations());
  };

  useEffect(() => {
    refreshQueue();

    const handleOnline = async () => {
      setIsOffline(false);
      // Auto-sync upon reconnection
      const queue = getPendingOperations();
      if (queue.length > 0) {
        setSyncing(true);
        const res = await syncOfflineOperations();
        setSyncing(false);
        refreshQueue();
        if (res.syncedCount > 0) {
          setSyncMessage(`Reconnected: Automatically synced ${res.syncedCount} buffered operations.`);
          setTimeout(() => setSyncMessage(null), 5000);
        }
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check for local buffer updates
    const interval = setInterval(refreshQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    const res = await syncOfflineOperations();
    setSyncing(false);
    refreshQueue();
    setSyncMessage(res.message);
    setTimeout(() => setSyncMessage(null), 5000);
  };

  if (!isOffline && pendingOps.length === 0 && !syncMessage) {
    return null;
  }

  const hasEmergencyOp = pendingOps.some(o => o.is_emergency);

  return (
    <div className="w-full z-40">
      {/* Critical Offline Emergency Warning */}
      {hasEmergencyOp && (
        <div className="bg-red-600 text-white px-4 py-2.5 text-xs font-black flex items-center justify-between flex-wrap gap-2 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>
              CRITICAL SAFETY WARNING: Offline Emergency Alert cannot be dispatched digitally to doctor stations while disconnected. Send a physical runner immediately to notify clinical staff!
            </span>
          </div>
        </div>
      )}

      {/* Standard Offline or Buffered Sync Banner */}
      <div className={`px-4 py-2 text-xs flex items-center justify-between flex-wrap gap-3 shadow-md border-b ${
        isOffline 
          ? 'bg-amber-500 text-slate-950 font-bold border-amber-600'
          : 'bg-indigo-900 text-indigo-100 font-semibold border-indigo-950'
      }`}>
        <div className="flex items-center gap-2.5">
          {isOffline ? (
            <WifiOff className="w-4 h-4 flex-shrink-0 text-slate-950" />
          ) : (
            <RefreshCw className="w-4 h-4 flex-shrink-0 text-indigo-300" />
          )}

          <span>
            {isOffline 
              ? `Safe Offline Mode Active • Server connection offline. ${pendingOps.length} drafts buffered locally on this terminal.`
              : syncMessage || `${pendingOps.length} offline operations buffered locally and ready to synchronize.`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pendingOps.length > 0 && !isOffline && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="px-3 py-1 bg-white text-indigo-900 rounded-lg text-xs font-black hover:bg-indigo-50 shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronizing...' : `Sync Now (${pendingOps.length})`}
            </button>
          )}

          {isOffline && (
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 bg-black/20 rounded-md">
              Offline Protection
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineStatusBanner;
