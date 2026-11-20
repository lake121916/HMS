# Progressive Web App (PWA) & Offline Resilience Guide
## Alem Ketema Enat General Hospital Management System (AKEH-HMS)

### 1. Overview
In hospital environments, mobile ward nurses and triage officers frequently operate in areas with fluctuating Wi-Fi coverage or intermittent telecom connectivity. AKEH-HMS implements a **Progressive Web App (PWA)** architecture with an **Idempotent IndexedDB Offline Queue** to ensure clinical continuity without compromising data safety.

---

### 2. PWA Manifest & App Shell Caching

* **Manifest Location**: `frontend/public/manifest.json`
  - Name: `AKEH Hospital Management System`
  - Short Name: `AKEH-HMS`
  - Display: `standalone`
  - Theme Color: `#070e1e` (Midnight Navy)
  - Background Color: `#070e1e`
* **Service Worker**: `frontend/public/sw.js` (Cache: `akeh-hms-shell-v2`)
  - **Static Shell Assets**: Caches HTML shell, static CSS, JS chunks, SVG icons, and fonts for immediate offline boot.
  - **Navigation Fallback**: Uncached navigation routes fallback to `/index.html` to allow client-side React Router navigation.

#### ⚠️ Strict Healthcare Data Protection Rule:
```javascript
// Never cache API endpoints or WebSockets in browser HTTP caches
if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
  return;
}
```
**Reasoning**: Patient medical history, laboratory findings, medication charts, and auth tokens must never be written to unencrypted HTTP browser caches.

---

### 3. Offline Vital Signs Queue (`offlineVitalsService.ts`)

When a nurse or physician records vital signs without active network connectivity:
1. **Local Buffering**: The entry is persisted into IndexedDB (`AKEH_OFFLINE_DB` / `vitals_queue`).
2. **Cryptographic Idempotency Key**: A unique client-side UUID is generated (`akeh-vit-...`) to guarantee that retransmissions never create duplicate database rows.
3. **Capture Timestamp Integrity**:
   - `captured_at`: Direct clinical observation time recorded by the clinician.
   - `recorded_at`: Server timestamp applied upon physical database synchronization.
4. **Clinical Safety Safeguards**:
   - Offline prescribing, billing finalization, and emergency discharges are **strictly prohibited** in offline mode.
   - If an encounter on the server has already transitioned past the vitals stage, the server rejects silent overwrites and flags the record as `CONFLICT` for manual clinician review.

---

### 4. User Interface: Network Indicator & Synchronization Dashboard

* **Header Status Chip**: Located on `GlobalNavigation.tsx`:
  - **Online** (Green badge): Direct server connection verified.
  - **Offline** (Amber badge): Disconnected, buffering locally.
  - **Syncing...** (Cyan spinning badge): Transmitting queued records.
  - **Sync Alert** (Rose badge): Server reported conflict or schema validation issue.
* **Synchronization Dashboard Modal**:
  - Displays: Pending count, successfully synced count, and conflicts.
  - Itemized preview of patient MRN, vital values, and observation timestamp.
  - Manual **Sync Now** trigger and **Clear Synced** storage maintenance.

---

### 5. Backend Synchronization Endpoint

* **Endpoint**: `POST /api/sync/pending-operations`
* **Protection**: Authenticated (`authenticate`), Authoritative RBAC check.
* **Payload Structure**:
  ```json
  {
    "operations": [
      {
        "operation_id": "c1f7a8b2-3e4d-4a11-8902-123456789abc",
        "operation_type": "record_vitals",
        "client_timestamp": "2026-11-20T06:15:00.000Z",
        "payload": {
          "encounter_id": 301,
          "patient_id": 42,
          "temperature": 37.4,
          "blood_pressure_systolic": 120,
          "blood_pressure_diastolic": 80,
          "heart_rate": 78,
          "respiratory_rate": 18,
          "oxygen_saturation": 98,
          "notes": "Patient resting comfortably"
        }
      }
    ]
  }
  ```
* **Audit Trail**: Every synchronized batch is logged in the PostgreSQL `offline_sync_logs` table with `status IN ('applied', 'conflict', 'rejected')`.
