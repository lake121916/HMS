import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Patient {
  id: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  dob?: string;
}

interface InvoiceSummary {
  id: number;
  patient_name: string;
  total_amount: number;
  amount_paid: number;
  status: string;
}

const ReceptionPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [patientsRes, invoicesRes] = await Promise.allSettled([
        api.get('/patients'),
        api.get('/invoices'),
      ]);
      if (patientsRes.status === 'fulfilled') setPatients(patientsRes.value.data.data.patients || []);
      if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value.data.data.invoices || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    const q = search.toLowerCase();
    const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    return name.includes(q) || String(p.id).includes(q) || (p.phone || '').includes(q);
  });

  const outstanding = invoices.filter(i => i.status === 'pending' || i.status === 'partial');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">Reception Desk</span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Front Desk Operations</h1>
          <p className="mt-1 text-sm text-gray-500">Manage patient intake, appointments, and billing follow-up.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/patients/new" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Register Patient</Link>
          <Link to="/appointments/new" className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium">New Appointment</Link>
          <Link to="/invoices/new" className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium">Create Invoice</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700">Search patients</label>
            <div className="mt-2 flex">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID or phone"
                className="w-full px-3 py-2 border border-gray-200 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button onClick={() => setSearch('')} className="px-3 bg-gray-100 border border-l-0 border-gray-200 rounded-r-md text-sm text-gray-600">Clear</button>
            </div>

            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-gray-500">Loading patients...</p>
              ) : filteredPatients.length === 0 ? (
                <p className="text-sm text-gray-500">No matching patients found.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredPatients.slice(0, 12).map(p => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-800">{p.first_name || 'Unknown'} {p.last_name || ''}</div>
                        <div className="text-xs text-gray-500">ID: #{p.id} • {p.phone || 'No phone'}</div>
                      </div>

                      <div className="flex gap-2 text-xs">
                        <Link to="/patients" className="text-blue-600 hover:underline">View</Link>
                        <Link to={`/appointments/new?patient=${p.id}`} className="text-green-600 hover:underline">Book</Link>
                        <Link to={`/invoices/new?patient=${p.id}`} className="text-yellow-600 hover:underline">Invoice</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Reception tasks</h2>
              <span className="text-xs text-gray-500">Daily workflow</span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link to="/patients" className="rounded-md border border-gray-200 bg-blue-50 p-3 text-center text-sm font-medium text-blue-700">Patient List</Link>
              <Link to="/appointments" className="rounded-md border border-gray-200 bg-green-50 p-3 text-center text-sm font-medium text-green-700">Appointments</Link>
              <Link to="/admissions" className="rounded-md border border-gray-200 bg-purple-50 p-3 text-center text-sm font-medium text-purple-700">Admissions</Link>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-gray-900">{patients.length}</div>
              <div className="text-xs text-gray-500">Patients</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-gray-900">{outstanding.length}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xl font-bold text-gray-900">{filteredPatients.length}</div>
              <div className="text-xs text-gray-500">Matches</div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800">Outstanding invoices</h3>
            <div className="mt-3 space-y-2 text-sm">
              {outstanding.slice(0, 6).map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 p-2">
                  <div>
                    <div className="font-medium text-gray-800">{inv.patient_name}</div>
                    <div className="text-xs text-gray-500">#{inv.id} • ${inv.total_amount.toFixed(2)}</div>
                  </div>
                  <Link to="/invoices" className="text-sm text-blue-600 hover:underline">Open</Link>
                </div>
              ))}
              {outstanding.length === 0 && <p className="text-xs text-gray-500">No outstanding invoices</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ReceptionPage;
