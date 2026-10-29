/**
 * Client-Side Offline Data Buffering & Synchronization Service
 * Alem Ketema Enat Hospital Management System
 */

import api from './api';

export interface PendingOperation {
  operation_id: string;
  operation_type: 'patient_registration' | 'triage_assessment' | 'generic_draft';
  payload: Record<string, any>;
  client_timestamp: string;
  is_emergency?: boolean;
}

const STORAGE_KEY = 'alemketema_offline_operations_queue_v1';

export const getPendingOperations = (): PendingOperation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline operations queue:', e);
    return [];
  }
};

export const savePendingOperations = (operations: PendingOperation[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
  } catch (e) {
    console.error('Failed to write offline operations queue:', e);
  }
};

export const queueOfflineOperation = (
  type: PendingOperation['operation_type'],
  payload: Record<string, any>,
  isEmergency = false
): PendingOperation => {
  const op: PendingOperation = {
    operation_id: `OP-${type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    operation_type: type,
    payload,
    client_timestamp: new Date().toISOString(),
    is_emergency: isEmergency
  };

  const queue = getPendingOperations();
  queue.push(op);
  savePendingOperations(queue);
  return op;
};

export const syncOfflineOperations = async (): Promise<{
  success: boolean;
  syncedCount: number;
  conflictsCount: number;
  message: string;
}> => {
  const queue = getPendingOperations();
  if (queue.length === 0) {
    return { success: true, syncedCount: 0, conflictsCount: 0, message: 'No operations pending sync' };
  }

  try {
    const res = await api.post('/sync/pending-operations', {
      operations: queue.map(q => ({
        operation_id: q.operation_id,
        operation_type: q.operation_type,
        payload: q.payload,
        client_timestamp: q.client_timestamp
      }))
    });

    if (res.data.success) {
      const results = res.data.data.results || [];
      const appliedIds = new Set(
        results.filter((r: any) => r.status === 'applied' || r.is_duplicate).map((r: any) => r.operation_id)
      );

      // Keep only unapplied or conflict operations for manual review
      const remaining = queue.filter(q => !appliedIds.has(q.operation_id));
      savePendingOperations(remaining);

      return {
        success: true,
        syncedCount: res.data.data.applied,
        conflictsCount: res.data.data.conflicts,
        message: `Synced ${res.data.data.applied} buffered operations successfully.`
      };
    }

    return { success: false, syncedCount: 0, conflictsCount: 0, message: 'Server returned failure response' };
  } catch (error: any) {
    console.error('Offline sync failed:', error);
    return {
      success: false,
      syncedCount: 0,
      conflictsCount: 0,
      message: error.response?.data?.message || error.message || 'Network sync failed'
    };
  }
};
