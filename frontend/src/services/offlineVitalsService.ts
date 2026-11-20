/**
 * Offline Vitals Queue & Resilience Service (IndexedDB)
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 * 
 * Strict Clinical Safety Guidelines:
 * 1. Enqueue vital signs observed during ward rounds or network drops.
 * 2. Maintain immutable capture timestamp (when clinician took vitals) vs sync timestamp.
 * 3. Enforce cryptographic idempotency keys to eliminate double-submission.
 * 4. Never automatically merge or overwrite conflicting clinical records.
 * 5. Automatic synchronization upon network reconnection with manual retry support.
 */

import api from './api';

export interface VitalsMeasurement {
  temperature?: number | string;
  blood_pressure_systolic?: number | string;
  blood_pressure_diastolic?: number | string;
  heart_rate?: number | string;
  respiratory_rate?: number | string;
  oxygen_saturation?: number | string;
  weight?: number | string;
  height?: number | string;
  pain_score?: number | string;
  blood_glucose?: number | string;
  notes?: string;
}

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';

export interface OfflineVitalsRecord {
  idempotency_key: string;      // Unique client-generated UUID
  encounter_id: number;
  patient_id: number;
  patient_name: string;
  patient_mrn: string;
  author_id?: number;
  author_name?: string;
  captured_at: string;          // ISO timestamp of clinician's direct observation
  vitals: VitalsMeasurement;
  sync_status: SyncStatus;
  retry_count: number;
  error_message?: string | null;
  synced_at?: string | null;
}

const DB_NAME = 'AKEH_OFFLINE_DB';
const DB_VERSION = 1;
const STORE_NAME = 'vitals_queue';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'akeh-vit-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in current environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'idempotency_key' });
        store.createIndex('sync_status', 'sync_status', { unique: false });
        store.createIndex('encounter_id', 'encounter_id', { unique: false });
        store.createIndex('captured_at', 'captured_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

class OfflineVitalsService {
  private syncInProgress = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[AKEH-HMS] Network restored. Triggering offline vitals sync...');
        this.syncPending();
      });
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => {
      try { l(); } catch (e) { console.error('Listener notification error:', e); }
    });
  }

  /**
   * Enqueue a new vitals entry while offline or with network instability
   */
  public async enqueue(
    record: Omit<OfflineVitalsRecord, 'idempotency_key' | 'sync_status' | 'retry_count' | 'captured_at'> & {
      captured_at?: string;
    }
  ): Promise<OfflineVitalsRecord> {
    const db = await openDB();
    const fullRecord: OfflineVitalsRecord = {
      ...record,
      idempotency_key: generateUUID(),
      captured_at: record.captured_at || new Date().toISOString(),
      sync_status: 'PENDING',
      retry_count: 0,
      error_message: null,
      synced_at: null,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(fullRecord);

      request.onsuccess = () => {
        this.notify();
        // If we are currently online, attempt immediate background flush
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.syncPending();
        }
        resolve(fullRecord);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all records currently in the local IndexedDB queue
   */
  public async getAll(): Promise<OfflineVitalsRecord[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const records: OfflineVitalsRecord[] = request.result || [];
          records.sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
          resolve(records);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  /**
   * Get only pending or failed records awaiting sync
   */
  public async getPending(): Promise<OfflineVitalsRecord[]> {
    const all = await this.getAll();
    return all.filter(r => r.sync_status === 'PENDING' || r.sync_status === 'FAILED');
  }

  /**
   * Attempt synchronization of pending records to backend
   */
  public async syncPending(): Promise<{ total: number; synced: number; failed: number }> {
    if (this.syncInProgress) {
      return { total: 0, synced: 0, failed: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { total: 0, synced: 0, failed: 0 };
    }

    const pending = await this.getPending();
    if (pending.length === 0) {
      return { total: 0, synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Format as operations for POST /api/sync/pending-operations
      const operations = pending.map(item => ({
        operation_id: item.idempotency_key,
        operation_type: 'record_vitals',
        client_timestamp: item.captured_at,
        payload: {
          encounter_id: item.encounter_id,
          patient_id: item.patient_id,
          temperature: item.vitals.temperature,
          blood_pressure_systolic: item.vitals.blood_pressure_systolic,
          blood_pressure_diastolic: item.vitals.blood_pressure_diastolic,
          heart_rate: item.vitals.heart_rate,
          respiratory_rate: item.vitals.respiratory_rate,
          oxygen_saturation: item.vitals.oxygen_saturation,
          weight: item.vitals.weight,
          height: item.vitals.height,
          pain_score: item.vitals.pain_score,
          blood_glucose: item.vitals.blood_glucose,
          notes: item.vitals.notes
        }
      }));

      const res = await api.post('/sync/pending-operations', { operations });
      const serverResults: Array<{
        operation_id: string;
        status: string;
        message?: string;
        error?: string;
      }> = res.data?.data?.results || [];

      const db = await openDB();

      for (const item of pending) {
        const result = serverResults.find(r => r.operation_id === item.idempotency_key);
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        if (result && result.status === 'applied') {
          item.sync_status = 'SYNCED';
          item.synced_at = new Date().toISOString();
          item.error_message = null;
          syncedCount++;
        } else if (result && result.status === 'conflict') {
          item.sync_status = 'CONFLICT';
          item.error_message = result.error || 'Conflict detected with current server state';
          failedCount++;
        } else {
          item.sync_status = 'FAILED';
          item.retry_count = (item.retry_count || 0) + 1;
          item.error_message = result?.error || result?.message || 'Synchronization rejected';
          failedCount++;
        }

        store.put(item);
      }
    } catch (err: any) {
      console.error('[AKEH-HMS] Sync operation error:', err);
      const db = await openDB();
      for (const item of pending) {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        item.sync_status = 'FAILED';
        item.retry_count = (item.retry_count || 0) + 1;
        item.error_message = err.response?.data?.message || err.message || 'Network error during sync';
        store.put(item);
        failedCount++;
      }
    } finally {
      this.syncInProgress = false;
      this.notify();
    }

    return { total: pending.length, synced: syncedCount, failed: failedCount };
  }

  /**
   * Remove successfully synchronized entries to free local device storage
   */
  public async clearSynced(): Promise<void> {
    const all = await this.getAll();
    const synced = all.filter(r => r.sync_status === 'SYNCED');
    const db = await openDB();

    for (const item of synced) {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(item.idempotency_key);
    }
    this.notify();
  }
}

export const offlineVitalsService = new OfflineVitalsService();
export default offlineVitalsService;
