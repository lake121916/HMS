/**
 * Central TanStack Query hooks for the HMS API.
 *
 * Query Key Convention: [resource, ...filters]
 * e.g. ['patients', { page: 1, search: 'John' }]
 *
 * All monetary values from the API are strings (PostgreSQL NUMERIC).
 * Use fmt/toNum from utils/format before displaying or computing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  blood_type: string;
  date_of_birth: string;
  address?: string;
  gender?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_number?: string;
  medical_history?: string;
}

export interface Appointment {
  id: number;
  appointment_number?: string;
  patient_name?: string;
  doctor_name?: string;
  department_name?: string;
  appointment_date: string;
  appointment_time?: string;
  type?: string;
  status: string;
  reason?: string;
  notes?: string;
  patient_id: number;
  doctor_id: number;
}

export interface Vital {
  id: number;
  patient_id: number;
  patient_name: string;
  nurse_name?: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  blood_glucose?: number;
  notes?: string;
  recorded_at: string;
}

export interface Invoice {
  id: number;
  invoice_number?: string;
  patient_name: string;
  patient_id: number;
  total_amount: number | string;
  amount_paid: number | string;
  subtotal?: number | string;
  tax?: number | string;
  discount?: number | string;
  status: string;
  due_date?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  service: string;
  quantity: number;
  unit_price: number | string;
  total: number | string;
}

export interface Prescription {
  id: number;
  patient_id: number;
  doctor_id: number;
  patient_name?: string;
  doctor_name?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  is_dispensed: boolean;
  workflow_status?: string;
  prescribed_date: string;
  encounter_id?: number;
}

export interface Doctor {
  id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  department_id?: number;
  department_name?: string;
  email?: string;
  phone?: string;
  consultation_fee?: number | string;
  is_available?: boolean;
}

export interface LabTest {
  id: number;
  patient_id: number;
  patient_name?: string;
  test_name: string;
  test_type?: string;
  status: string;
  result?: string;
  notes?: string;
  requested_at?: string;
  completed_at?: string;
  encounter_id?: number;
}

export interface Medicine {
  id: number;
  name: string;
  generic_name?: string;
  category?: string;
  unit?: string;
  unit_price: number | string;
  stock_quantity: number;
  minimum_stock?: number;
  manufacturer?: string;
  expiry_date?: string;
}

export interface Admission {
  id: number;
  patient_id: number;
  patient_name?: string;
  bed_id?: number;
  bed_number?: string;
  ward?: string;
  admission_date: string;
  discharge_date?: string;
  status: string;
  diagnosis?: string;
  notes?: string;
}

export interface DashboardStats {
  totalPatients?: number;
  todayAppointments?: number;
  occupiedBeds?: number;
  totalBeds?: number;
  pendingLabTests?: number;
  revenue?: number | string;
  [key: string]: unknown;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const qk = {
  patients:       (p?: object) => ['patients', p] as const,
  patient:        (id: number) => ['patients', id] as const,
  patientHistory: (id: number) => ['patients', id, 'history'] as const,
  appointments:   (p?: object) => ['appointments', p] as const,
  appointment:    (id: number) => ['appointments', id] as const,
  vitals:         (p?: object) => ['vitals', p] as const,
  invoices:       (p?: object) => ['invoices', p] as const,
  invoice:        (id: number) => ['invoices', id] as const,
  prescriptions:  (p?: object) => ['prescriptions', p] as const,
  doctors:        (p?: object) => ['doctors', p] as const,
  labTests:       (p?: object) => ['labTests', p] as const,
  medicines:      (p?: object) => ['medicines', p] as const,
  admissions:     (p?: object) => ['admissions', p] as const,
  dashboardStats: () => ['dashboardStats'] as const,
  beds:           (p?: object) => ['beds', p] as const,
  inventory:      (p?: object) => ['inventory', p] as const,
  auditLogs:      (p?: object) => ['auditLogs', p] as const,
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const buildParams = (obj: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  });
  return p.toString();
};

// ═══════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════

export function usePatients(params: { page?: number; search?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.patients(params),
    queryFn: async () => {
      const qs = buildParams({ page: params.page ?? 1, limit: params.limit ?? 12, search: params.search });
      const res = await api.get(`/patients?${qs}`);
      return res.data.data as { patients: Patient[]; pagination: { totalPages: number; total: number } };
    },
  });
}

export function usePatient(id: number) {
  return useQuery({
    queryKey: qk.patient(id),
    queryFn: async () => {
      const res = await api.get(`/patients/${id}`);
      return res.data.data.patient as Patient;
    },
    enabled: id > 0,
  });
}

export function usePatientHistory(id: number) {
  return useQuery({
    queryKey: qk.patientHistory(id),
    queryFn: async () => {
      const res = await api.get(`/patients/${id}/history`);
      return res.data.data;
    },
    enabled: id > 0,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/patients', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useUpdatePatient(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/patients/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: qk.patient(id) });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/patients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════

export function useAppointments(params: { status?: string; date?: string; doctor_id?: number } = {}) {
  return useQuery({
    queryKey: qk.appointments(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/appointments${qs ? '?' + qs : ''}`);
      return res.data.data as { appointments: Appointment[] };
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/appointments', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.put(`/appointments/${id}/cancel`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newDate, reason }: { id: number; newDate: string; reason: string }) =>
      api.put(`/appointments/${id}/reschedule`, { newDate, reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// VITALS
// ═══════════════════════════════════════════════════════════════════════════

export function useVitals(params: { patient_id?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: qk.vitals(params),
    queryFn: async () => {
      const qs = buildParams({ limit: params.limit ?? 50, patient_id: params.patient_id });
      const res = await api.get(`/vitals?${qs}`);
      return res.data.data.vitals as Vital[];
    },
  });
}

export function useCreateVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/vitals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vitals'] }),
  });
}

export function useUpdateVital(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/vitals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vitals'] }),
  });
}

export function useDeleteVital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/vitals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vitals'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// INVOICES
// ═══════════════════════════════════════════════════════════════════════════

export function useInvoices(params: { status?: string; patient_id?: number } = {}) {
  return useQuery({
    queryKey: qk.invoices(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/invoices${qs ? '?' + qs : ''}`);
      return res.data.data as { invoices: Invoice[] };
    },
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: qk.invoice(id),
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data.data as { invoice: Invoice; items: InvoiceItem[]; payments: unknown[] };
    },
    enabled: id > 0,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/invoices', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useRecordPayment(invoiceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post(`/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: qk.invoice(invoiceId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function usePrescriptions(params: { patient_id?: number; is_dispensed?: boolean } = {}) {
  return useQuery({
    queryKey: qk.prescriptions(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/prescriptions${qs ? '?' + qs : ''}`);
      return res.data.data.prescriptions as Prescription[];
    },
  });
}

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/prescriptions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prescriptions'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdatePrescription(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/prescriptions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

export function useDispensePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.put(`/prescriptions/${id}`, { is_dispensed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/prescriptions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCTORS
// ═══════════════════════════════════════════════════════════════════════════

export function useDoctors(params: { department_id?: number; available?: boolean } = {}) {
  return useQuery({
    queryKey: qk.doctors(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/doctors${qs ? '?' + qs : ''}`);
      return res.data.data as { doctors: Doctor[] };
    },
  });
}

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/doctors', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });
}

export function useUpdateDoctor(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/doctors/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });
}

export function useDeleteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/doctors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doctors'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// LAB TESTS
// ═══════════════════════════════════════════════════════════════════════════

export function useLabTests(params: { patient_id?: number; status?: string } = {}) {
  return useQuery({
    queryKey: qk.labTests(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/lab-tests${qs ? '?' + qs : ''}`);
      return res.data.data as { labTests: LabTest[] };
    },
  });
}

export function useCreateLabTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/lab-tests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labTests'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdateLabTest(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/lab-tests/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labTests'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MEDICINES / INVENTORY
// ═══════════════════════════════════════════════════════════════════════════

export function useMedicines(params: { search?: string; category?: string } = {}) {
  return useQuery({
    queryKey: qk.medicines(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/medicines${qs ? '?' + qs : ''}`);
      return res.data.data as { medicines: Medicine[] };
    },
  });
}

export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/medicines', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}

export function useUpdateMedicine(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put(`/medicines/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/medicines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export function useAdmissions(params: { status?: string; patient_id?: number } = {}) {
  return useQuery({
    queryKey: qk.admissions(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/admissions${qs ? '?' + qs : ''}`);
      return res.data.data as { admissions: Admission[] };
    },
  });
}

export function useCreateAdmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/admissions', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
    },
  });
}

export function useDischargePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.put(`/admissions/${id}/discharge`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admissions'] });
      qc.invalidateQueries({ queryKey: ['beds'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BEDS
// ═══════════════════════════════════════════════════════════════════════════

export function useBeds(params: { ward?: string; status?: string } = {}) {
  return useQuery({
    queryKey: qk.beds(params),
    queryFn: async () => {
      const qs = buildParams(params as Record<string, unknown>);
      const res = await api.get(`/beds${qs ? '?' + qs : ''}`);
      return res.data.data as { beds: unknown[] };
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export function useDashboardStats() {
  return useQuery({
    queryKey: qk.dashboardStats(),
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data as DashboardStats;
    },
    staleTime: 1000 * 60, // dashboard stats stay fresh 1 min
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════

export function useAuditLogs(params: { page?: number; limit?: number; action?: string } = {}) {
  return useQuery({
    queryKey: qk.auditLogs(params),
    queryFn: async () => {
      const qs = buildParams({ page: params.page ?? 1, limit: params.limit ?? 50, action: params.action });
      const res = await api.get(`/audit-logs?${qs}`);
      return res.data.data;
    },
  });
}
