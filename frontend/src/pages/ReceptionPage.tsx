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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reception • Front Desk</h1>
          <p className="text-sm text-gray-500">Quick access to patients, appointments, and billing actions.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/appointments/new" className="px-4 py-2 bg-blue-600 text-white rounded-md">New Appointment</Link>
          <Link to="/invoices/new" className="px-4 py-2 border border-gray-200 rounded-md">Create Invoice</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700">Search patients</label>
            <div className="mt-2 flex">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, ID or phone"
                className="w-full px-3 py-2 border rounded-l-md"
              />
              <button onClick={() => setSearch('')} className="px-3 bg-gray-100 border-l rounded-r-md">Clear</button>
            </div>

            <div className="mt-4">
              {loading ? (
                <p className="text-sm text-gray-500">Loading patients...</p>
              ) : filteredPatients.length === 0 ? (
                <p className="text-sm text-gray-500">No matching patients.</p>
              ) : (
                <ul className="divide-y">
                  {filteredPatients.slice(0, 20).map(p => (
                    <li key={p.id} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.first_name} {p.last_name}</div>
                        <div className="text-xs text-gray-500">ID: #{p.id} • {p.phone || '—'}</div>
                      </div>
                      <div className="flex gap-2">
                        <Link to={`/patients/${p.id}`} className="text-sm text-blue-600">View</Link>
                        <Link to={`/appointments/new?patient=${p.id}`} className="text-sm text-green-600">Book</Link>
                        <Link to={`/invoices/new?patient=${p.id}`} className="text-sm text-yellow-600">Invoice</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold">Today's tasks</h2>
            <p className="text-xs text-gray-500">Quick links and summaries for the day.</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Link to="/appointments" className="p-3 bg-blue-50 rounded-md text-center">Appointments<br/><span className="font-bold">—</span></Link>
              <Link to="/invoices" className="p-3 bg-yellow-50 rounded-md text-center">Invoices<br/><span className="font-bold">{outstanding.length}</span></Link>
              <Link to="/payments" className="p-3 bg-green-50 rounded-md text-center">Payments<br/><span className="font-bold">—</span></Link>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold">Outstanding invoices</h3>
            <div className="mt-3 space-y-2 text-sm">
              {outstanding.slice(0,6).map(inv => (
                <div key={inv.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{inv.patient_name}</div>
                    <div className="text-xs text-gray-500">#{inv.id} • ${inv.total_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <Link to={`/invoices/${inv.id}`} className="text-sm text-blue-600">Open</Link>
                  </div>
                </div>
              ))}
              {outstanding.length === 0 && <p className="text-xs text-gray-500">No outstanding invoices</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold">Quick actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/patients/new" className="px-3 py-2 border rounded-md text-sm">New Patient</Link>
              <Link to="/appointments/new" className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm">New Appointment</Link>
              <Link to="/invoices/new" className="px-3 py-2 border rounded-md text-sm">Create Invoice</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ReceptionPage;
