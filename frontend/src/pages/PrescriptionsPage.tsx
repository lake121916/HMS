import React, { useState } from 'react';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  usePrescriptions, useCreatePrescription,
  useUpdatePrescription, useDispensePrescription, useDeletePrescription,
} from '../hooks/useApi';
import { Plus, Search, Edit, Trash2, X, CheckCircle, Pill, AlertOctagon, AlertTriangle } from 'lucide-react';

interface Prescription {
  id: number; patient_id: number; doctor_id: number; patient_name: string; doctor_name: string;
  medication_name: string; dosage: string; frequency: string; duration: string;
  instructions: string; is_dispensed: boolean; prescribed_date: string;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const PrescriptionsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterDispensed, setFilterDispensed] = useState<'' | 'false' | 'true'>('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prescription | null>(null);
  const [form, setForm] = useState({ patient_id:'', diagnosis_id:'', medication_name:'', dosage:'', frequency:'', duration:'', instructions:'' });
  
  // Allergy validation state
  const [allergyModal, setAllergyModal] = useState<{
    alerts: any[];
    drugInteractions?: any[];
    uncertaintyNote?: string | null;
    hardBlocked: boolean;
    requiresOverride?: boolean;
  } | null>(null);
  const [overrideAck, setOverrideAck] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // ── TanStack Query ──────────────────────────────────────────────────────
  const dispensedParam = filterDispensed === '' ? undefined : filterDispensed === 'true';
  const { data, isLoading } = usePrescriptions({ is_dispensed: dispensedParam });
  const prescriptions = (data ?? []) as Prescription[];

  const createPrescription   = useCreatePrescription();
  const updatePrescription   = useUpdatePrescription(editing?.id ?? 0);
  const dispensePrescription = useDispensePrescription();
  const deletePrescription   = useDeletePrescription();

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this prescription?')) return;
    try { await deletePrescription.mutateAsync(id); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ patient_id:'', diagnosis_id:'', medication_name:'', dosage:'', frequency:'', duration:'', instructions:'' });
    setAllergyModal(null);
    setOverrideAck(false);
    setOverrideReason('');
    setShowModal(true);
  };

  const openEdit = (p: Prescription) => {
    setEditing(p);
    setForm({ patient_id:String(p.patient_id), diagnosis_id:'', medication_name:p.medication_name, dosage:p.dosage, frequency:p.frequency, duration:p.duration, instructions:p.instructions||'' });
    setAllergyModal(null);
    setOverrideAck(false);
    setOverrideReason('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editing && form.patient_id && form.medication_name) {
        // Pre-check clinical allergy safety
        const valRes = await api.post('/prescriptions/validate', {
          patient_id: parseInt(form.patient_id),
          medication_name: form.medication_name
        });
        const check = valRes.data.data;
        if (check.hasConflict) {
          setAllergyModal({
            alerts: check.alerts || [],
            drugInteractions: check.drugInteractions || [],
            uncertaintyNote: check.uncertaintyNote || null,
            hardBlocked: check.hardBlocked,
            requiresOverride: check.requiresOverride
          });
          return;
        }
      }

      await submitPrescriptionPayload();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const submitPrescriptionPayload = async (override?: string) => {
    const payload = {
      ...form,
      patient_id: parseInt(form.patient_id),
      diagnosis_id: form.diagnosis_id ? parseInt(form.diagnosis_id) : undefined,
      override_reason: override || null,
      override_acknowledged: Boolean(override)
    };
    if (editing) { await updatePrescription.mutateAsync(payload as Record<string, unknown>); }
    else { await createPrescription.mutateAsync(payload as Record<string, unknown>); }
    setShowModal(false);
    setAllergyModal(null);
    setOverrideAck(false);
    setOverrideReason('');
  };

  const handleConfirmPrescriptionOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert('Mandatory clinical override justification is required (minimum 5 characters).');
      return;
    }
    submitPrescriptionPayload(overrideReason.trim());
  };

  const handleDispense = async (id: number) => {
    if (!window.confirm('Mark this prescription as dispensed?')) return;
    try { await dispensePrescription.mutateAsync(id); }
    catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const filtered = prescriptions.filter(p =>
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.medication_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase())
  );



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Pill className="w-6 h-6 text-purple-600" /> Prescriptions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'doctor' && 'Create and manage your prescriptions'}
            {user?.role === 'pharmacist' && 'View and dispense prescriptions — you cannot create or delete'}
            {user?.role === 'patient' && 'Your active and past prescriptions'}
            {(user?.role === 'nurse') && 'View patient prescriptions'}
            {(user?.role === 'super_admin' || user?.role === 'admin') && 'Manage all prescriptions'}
          </p>
        </div>
        {can('prescriptions:create') && (
          <button onClick={openAdd} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold gap-2">
            <Plus className="w-4 h-4" /> New Prescription
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by patient, doctor, or medication..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500" />
        </div>
        {user?.role === 'pharmacist' && (
          <select value={filterDispensed} onChange={e => setFilterDispensed(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500">
            <option value="">All</option>
            <option value="false">Pending Dispense</option>
            <option value="true">Dispensed</option>
          </select>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Patient', 'Doctor', 'Medication', 'Dosage', 'Frequency', 'Duration', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">No prescriptions found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">{p.patient_name}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.doctor_name}</td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-sm text-purple-700 dark:text-purple-300">{p.medication_name}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.dosage}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.frequency}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">{p.duration}</td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${p.is_dispensed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.is_dispensed ? 'Dispensed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{new Date(p.prescribed_date).toLocaleDateString()}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {can('prescriptions:dispense') && !p.is_dispensed && (
                        <button onClick={() => handleDispense(p.id)} title="Mark Dispensed" className="text-green-500 hover:text-green-700">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {can('prescriptions:edit') && (
                        <button onClick={() => openEdit(p)} title="Edit" className="text-blue-500 hover:text-blue-700"><Edit className="w-4 h-4" /></button>
                      )}
                      {can('prescriptions:delete') && (
                        <button onClick={() => handleDelete(p.id)} title="Delete" className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && can('prescriptions:create') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Prescription' : 'New Prescription'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editing && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Patient ID *</label><input type="number" required value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} className={inp} /></div>
                  <div><label className={lbl}>Diagnosis ID</label><input type="number" value={form.diagnosis_id} onChange={e=>setForm({...form,diagnosis_id:e.target.value})} className={inp} placeholder="Optional" /></div>
                </div>
              )}
              <div><label className={lbl}>Medication Name *</label><input required value={form.medication_name} onChange={e=>setForm({...form,medication_name:e.target.value})} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Dosage *</label><input required value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})} className={inp} placeholder="e.g. 500mg" /></div>
                <div><label className={lbl}>Frequency *</label><input required value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})} className={inp} placeholder="e.g. Twice daily" /></div>
              </div>
              <div><label className={lbl}>Duration *</label><input required value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} className={inp} placeholder="e.g. 7 days" /></div>
              <div><label className={lbl}>Instructions</label><textarea value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} rows={3} className={inp} placeholder="Take with food, avoid alcohol..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700">{editing ? 'Update' : 'Check Safety & Prescribe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Allergy Warning & Clinical Override Modal ───────────────── */}
      {allergyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 border-2 border-red-500 animate-shake">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 rounded-2xl flex-shrink-0">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-100 dark:bg-red-950 px-2.5 py-0.5 rounded-full">
                  CLINICAL SAFETY ALERT
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  Medication Allergy & Interaction Warning
                </h3>
              </div>
            </div>

            {/* Exact Required Patient Allergy Warning Banner */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing.
              </p>
            </div>

            {/* Hard Stop Banner */}
            {allergyModal.hardBlocked && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-950 border-2 border-red-600 rounded-2xl text-xs font-black text-red-900 dark:text-red-200 flex items-start gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  HARD STOP CONTRAINDICATION: Severe allergy (Anaphylaxis) recorded. Prescribing this medication is strictly blocked by hospital policy.
                </div>
              </div>
            )}

            {/* Uncertainty Note */}
            {allergyModal.uncertaintyNote && (
              <div className="mt-2.5 p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                ℹ️ {allergyModal.uncertaintyNote}
              </div>
            )}

            {/* Conflict List */}
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {allergyModal.alerts.map((alt, idx) => (
                <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-red-900 dark:text-red-300">
                    <span>Proposed: {alt.proposedMedication}</span>
                    <span className="uppercase text-[10px] px-2 py-0.5 bg-red-200 dark:bg-red-800 rounded-full">{alt.severity}</span>
                  </div>
                  <div>Recorded Allergen: <span className="font-semibold">{alt.recordedAllergen}</span></div>
                  <div className="text-slate-600 dark:text-slate-400 italic">⚠️ {alt.reason}</div>
                </div>
              ))}

              {allergyModal.drugInteractions?.map((ddi, idx) => (
                <div key={`ddi-${idx}`} className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-purple-900 dark:text-purple-300">
                    <span>Interaction: {ddi.interactingMedication}</span>
                    <span className="uppercase text-[10px] px-2 py-0.5 bg-purple-200 dark:bg-purple-800 rounded-full">{ddi.severity}</span>
                  </div>
                  <div>Risk: {ddi.risk}</div>
                </div>
              ))}
            </div>

            {/* Override Section */}
            {!allergyModal.hardBlocked ? (
              <form onSubmit={handleConfirmPrescriptionOverride} className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Mandatory Prescriber Override Justification * (Min 5 chars)
                  </label>
                  <textarea
                    required
                    minLength={5}
                    rows={2}
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="e.g. Benefits outweigh cross-reactivity risk; observed dose"
                    className={inp}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ack-check"
                    required
                    checked={overrideAck}
                    onChange={e => setOverrideAck(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="ack-check" className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                    I acknowledge the clinical risk and assume prescribing responsibility.
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAllergyModal(null)}
                    className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!overrideAck || overrideReason.trim().length < 5}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    Authorize Override & Prescribe
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAllergyModal(null)}
                  className="px-5 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900"
                >
                  Close & Change Medication
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionsPage;
