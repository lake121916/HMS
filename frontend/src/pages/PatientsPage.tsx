import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient } from '../hooks/useApi';
import type { Patient } from '../hooks/useApi';
import { Plus, Search, Edit, Trash2, X, Eye, Users, QrCode } from 'lucide-react';
import api from '../services/api';
import PatientQRCode from '../components/PatientQRCode';
import type { PatientCardData } from '../components/PatientIDCard';
import WristbandScannerModal from '../components/WristbandScannerModal';
import { DashboardHeader } from '../components/common/PremiumUI';


const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const PatientsPage: React.FC = () => {
  const { can } = useRoleAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routePatientId } = useParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [viewing, setViewing] = useState<Patient | null>(null);
  const [viewingQr, setViewingQr] = useState<PatientCardData | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handlePatientScanVerified = async (result: any) => {
    setShowScannerModal(false);
    const scanned = result?.patient;
    if (!scanned) return;
    try {
      const res = await api.get(`/patients/${scanned.id}`);
      setViewing(res.data.data);
      setViewingQr(null);
      setViewModal(true);
    } catch {
      setSearch(scanned.first_name + ' ' + scanned.last_name);
    }
  };
  const [form, setForm] = useState({
    firstName:'', lastName:'', email:'', phone:'', bloodType:'', dateOfBirth:'',
    address:'', gender:'male', allergies:'', emergencyContactName:'',
    emergencyContactPhone:'', insuranceNumber:'', medicalHistory:''
  });

  // ── TanStack Query hooks ──────────────────────────────────────────────────
  const { data, isLoading } = usePatients({ page, search });
  const patients = data?.patients ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient(editing?.id ?? 0);
  const deletePatient = useDeletePatient();

  const openAdd = () => {
    setEditing(null);
    setForm({ firstName:'', lastName:'', email:'', phone:'', bloodType:'', dateOfBirth:'',
      address:'', gender:'male', allergies:'', emergencyContactName:'',
      emergencyContactPhone:'', insuranceNumber:'', medicalHistory:'' });
    navigate('/patients/new');
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      firstName: p.first_name, lastName: p.last_name, email: p.email || '',
      phone: p.phone || '', bloodType: p.blood_type || '',
      dateOfBirth: p.date_of_birth?.split('T')[0] || '',
      address: p.address || '', gender: p.gender || 'male',
      allergies: p.allergies || '', emergencyContactName: p.emergency_contact_name || '',
      emergencyContactPhone: p.emergency_contact_phone || '',
      insuranceNumber: p.insurance_number || '', medicalHistory: p.medical_history || ''
    });
    setShowModal(true);
  };

  const openView = (p: Patient) => { setViewing(p); setViewModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updatePatient.mutateAsync(form as Record<string, unknown>);
      } else {
        const response = await createPatient.mutateAsync(form as Record<string, unknown>);
        const patient = response.data.data.patient || response.data.data;
        setViewing(patient);
        setViewingQr(response.data.data.qr || null);
        setViewModal(true);
      }
      setShowModal(false);
      if (location.pathname.endsWith('/new')) navigate('/patients');
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to save patient'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this patient? All related records will also be removed.')) return;
    try {
      await deletePatient.mutateAsync(id);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed to delete patient'); }
  };

  React.useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setEditing(null);
      setForm({ firstName:'', lastName:'', email:'', phone:'', bloodType:'', dateOfBirth:'',
        address:'', gender:'male', allergies:'', emergencyContactName:'',
        emergencyContactPhone:'', insuranceNumber:'', medicalHistory:'' });
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (!routePatientId || routePatientId === 'new') return;
    let active = true;
    api.get(`/patients/${routePatientId}`)
      .then(response => {
        if (active) {
          setViewing(response.data.data);
          setViewingQr(null);
          setViewModal(true);
        }
      })
      .catch(error => {
        if (active) alert(error.response?.data?.message || 'Unable to load patient profile');
      });
    return () => { active = false; };
  }, [routePatientId]);

  return (
    <div className="space-y-6">
      {/* ── Premium Header ─────────────────────────────────────────── */}
      <DashboardHeader
        title="Patient Medical Records Directory"
        amharicTitle="የታካሚዎች ማህደር"
        subtitle="Search hospital census, inspect longitudinal medical histories, issue wristbands, and register admissions"
        badge="Electronic Health Records"
        icon={Users}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="h-9 px-3.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Wristband</span>
            </button>
            {can('patients:create') && (
              <button
                onClick={openAdd}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Patient</span>
              </button>
            )}
          </div>
        }
      />

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient name, MRN, phone number, or email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 shadow-2xs"
        />
      </div>

      {/* Mobile Card List (< sm) */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading patient records...</div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No patients matching query
          </div>
        ) : (
          patients.map(p => (
            <div key={p.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-extrabold text-xs flex items-center justify-center border border-cyan-500/20 shrink-0">
                    {p.first_name?.[0]}{p.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{p.first_name} {p.last_name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">ID #{p.id} • {p.gender || 'N/A'}</p>
                  </div>
                </div>
                {p.blood_type && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full border border-rose-500/25">
                    Blood {p.blood_type}
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl space-y-0.5">
                <div>📞 Phone: <span className="font-semibold text-slate-800 dark:text-slate-200">{p.phone || 'None'}</span></div>
                {p.email && <div>✉️ Email: <span>{p.email}</span></div>}
                {p.date_of_birth && <div>🎂 DOB: <span>{new Date(p.date_of_birth).toLocaleDateString()}</span></div>}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => openView(p)}
                  className="flex-1 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> View Profile
                </button>
                {can('patients:edit') && (
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                {can('patients:delete') && (
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="py-1.5 px-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= sm) */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {['Patient', 'Contact', 'DOB', 'Blood Type', 'Gender', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {isLoading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className="animate-pulse h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  </td></tr>
                ))
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No patients found</p>
                </td></tr>
              ) : patients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-500/20">
                        {p.first_name?.[0]}{p.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{p.first_name} {p.last_name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">ID #{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.blood_type ? (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full border border-rose-500/20">
                        {p.blood_type}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">{p.gender || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openView(p)} title="View Details"
                        className="p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><Eye className="w-4 h-4" /></button>
                      {can('patients:edit') && (
                        <button onClick={() => openEdit(p)} title="Edit"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><Edit className="w-4 h-4" /></button>
                      )}
                      {can('patients:delete') && (
                        <button onClick={() => handleDelete(p.id)} title="Delete"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                ← Prev
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editing ? 'Edit Patient' : 'Register New Patient'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>First Name *</label>
                  <input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Last Name *</label>
                  <input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Email *</label>
                <input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Phone *</label>
                  <input type="tel" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Date of Birth *</label>
                  <input type="date" required value={form.dateOfBirth} onChange={e=>setForm({...form,dateOfBirth:e.target.value})} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Gender *</label>
                  <select required value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} className={inp}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div><label className={lbl}>Blood Type</label>
                  <select value={form.bloodType} onChange={e=>setForm({...form,bloodType:e.target.value})} className={inp}>
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Address</label>
                <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Allergies</label>
                <textarea value={form.allergies} onChange={e=>setForm({...form,allergies:e.target.value})} rows={2} className={inp} placeholder="List any known allergies..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Emergency Contact Name</label>
                  <input value={form.emergencyContactName} onChange={e=>setForm({...form,emergencyContactName:e.target.value})} className={inp} /></div>
                <div><label className={lbl}>Emergency Contact Phone</label>
                  <input value={form.emergencyContactPhone} onChange={e=>setForm({...form,emergencyContactPhone:e.target.value})} className={inp} /></div>
              </div>
              <div><label className={lbl}>Insurance Number</label>
                <input value={form.insuranceNumber} onChange={e=>setForm({...form,insuranceNumber:e.target.value})} className={inp} /></div>
              <div><label className={lbl}>Medical History</label>
                <textarea value={form.medicalHistory} onChange={e=>setForm({...form,medicalHistory:e.target.value})} rows={3} className={inp} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  {editing ? 'Update' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold">
                  {viewing.first_name?.[0]}{viewing.last_name?.[0]}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{viewing.first_name} {viewing.last_name}</h2>
              </div>
              <button
                onClick={() => {
                  setViewModal(false);
                  if (routePatientId) navigate('/patients');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              {([
                ['Email', viewing.email],
                ['Phone', viewing.phone || '—'],
                ['Date of Birth', viewing.date_of_birth ? new Date(viewing.date_of_birth).toLocaleDateString() : '—'],
                ['Gender', viewing.gender || '—'],
                ['Blood Type', viewing.blood_type || '—'],
                ['Insurance #', viewing.insurance_number || '—'],
                ['Emergency Contact', viewing.emergency_contact_name || '—'],
                ['Emergency Phone', viewing.emergency_contact_phone || '—'],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{k}</p>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{v}</p>
                </div>
              ))}
              {viewing.allergies && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Allergies</p>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{viewing.allergies}</p>
                </div>
              )}
              {viewing.medical_history && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Medical History</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">{viewing.medical_history}</p>
                </div>
              )}
              <div className="col-span-2">
                <PatientQRCode
                  key={viewing.id}
                  patientId={viewing.id}
                  initialQr={viewingQr}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── QR Scanner Modal ── */}
      {showScannerModal && (
        <WristbandScannerModal
          isOpen={showScannerModal}
          onClose={() => setShowScannerModal(false)}
          onPatientVerified={handlePatientScanVerified}
          continueLabel="Open Patient Record"
        />
      )}
    </div>
  );
};

export default PatientsPage;
