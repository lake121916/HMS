import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  MapPin, Plus, Search, CheckCircle, AlertCircle, Heart,
  Users, Layers, Award, Droplet
} from 'lucide-react';

interface BloodDonor {
  id: number;
  name: string;
  blood_type: string;
  age: number;
  gender: string;
  phone: string;
  last_donation_date: string;
  status: string;
}

interface BloodInventory {
  id: number;
  blood_type: string;
  units_available: number;
  last_updated: string;
}

const inp = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BloodBankPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  
  const [inventory, setInventory] = useState<BloodInventory[]>([]);
  const [donors, setDonors] = useState<BloodDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDonor, setSearchDonor] = useState('');
  
  // Modals / Panels toggles
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Forms
  const [registerForm, setRegisterForm] = useState({
    name: '',
    blood_type: 'O+',
    age: '',
    gender: 'male',
    phone: ''
  });

  const [issueForm, setIssueForm] = useState({
    blood_type: 'O+',
    units: '1',
    patient_id: '',
    purpose: 'Emergency surgery'
  });

  useEffect(() => {
    fetchBloodBankData();
  }, []);

  const fetchBloodBankData = async () => {
    setLoading(true);
    try {
      const [invRes, donorsRes] = await Promise.all([
        api.get('/blood-bank/inventory'),
        api.get('/blood-bank/donors')
      ]);
      setInventory(invRes.data.data.inventory || []);
      setDonors(donorsRes.data.data.donors || []);
    } catch (err) {
      console.error('Failed to fetch blood bank details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/blood-bank/donors', {
        ...registerForm,
        age: parseInt(registerForm.age, 10) || null
      });
      if (res.data.success) {
        setShowRegisterModal(false);
        setRegisterForm({ name: '', blood_type: 'O+', age: '', gender: 'male', phone: '' });
        fetchBloodBankData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register blood donor.');
    }
  };

  const handleIssueBlood = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/blood-bank/request', {
        ...issueForm,
        units: parseInt(issueForm.units, 10) || 1,
        patient_id: issueForm.patient_id ? parseInt(issueForm.patient_id, 10) : null
      });
      if (res.data.success) {
        setShowIssueModal(false);
        setIssueForm({ blood_type: 'O+', units: '1', patient_id: '', purpose: 'Emergency surgery' });
        fetchBloodBankData();
        alert(res.data.message || 'Blood units issued successfully.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to issue blood units.');
    }
  };

  const filteredDonors = donors.filter(d =>
    d.name?.toLowerCase().includes(searchDonor.toLowerCase()) ||
    d.blood_type?.toLowerCase().includes(searchDonor.toLowerCase()) ||
    d.phone?.includes(searchDonor)
  );

  const getBloodTypeColor = (bt: string) => {
    if (bt.includes('+')) return 'bg-red-500 text-white';
    return 'bg-red-700 text-white';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" /> Blood Bank & Donation Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track blood unit inventory levels, register voluntary donors, and issue blood requests for surgical emergencies.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can('reception:view') && (
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Register Donor
            </button>
          )}
          {can('doctors:view') && (
            <button
              onClick={() => setShowIssueModal(true)}
              className="flex items-center px-4 py-2.5 bg-gray-800 hover:bg-gray-950 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-sm font-semibold gap-2 transition-colors"
            >
              <Droplet className="w-4 h-4 text-red-400 fill-red-400" /> Issue Blood
            </button>
          )}
        </div>
      </div>

      {/* Grid: Blood Type Stocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {BLOOD_TYPES.map((bt) => {
          const matched = inventory.find(i => i.blood_type === bt);
          const units = matched ? matched.units_available : 0;
          return (
            <div key={bt} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-center relative overflow-hidden group hover:scale-[1.03] transition-all">
              <div className="absolute top-0 right-0 w-8 h-8 bg-red-50 dark:bg-red-950/20 rounded-bl-2xl flex items-center justify-center">
                <Droplet className="w-4 h-4 text-red-500 fill-red-500" />
              </div>
              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-black mb-2 ${getBloodTypeColor(bt)} shadow-sm`}>
                {bt}
              </span>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{units}</div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Units Available</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Donors List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-red-500" /> Voluntary Blood Donors
                </span>
                <span className="text-xs text-gray-400">Total registered voluntary donors database</span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or blood..."
                  value={searchDonor}
                  onChange={(e) => setSearchDonor(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500 py-8 text-center">Loading donor registry...</p>
            ) : filteredDonors.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No donors found in the database registry.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Donor Name</th>
                      <th className="px-4 py-3 font-semibold">Blood Type</th>
                      <th className="px-4 py-3 font-semibold">Age/Gender</th>
                      <th className="px-4 py-3 font-semibold">Contact Phone</th>
                      <th className="px-4 py-3 font-semibold">Last Donation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                    {filteredDonors.map((donor) => (
                      <tr key={donor.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3.5 font-semibold text-gray-950 dark:text-white">{donor.name}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${getBloodTypeColor(donor.blood_type)}`}>
                            {donor.blood_type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 capitalize">{donor.age} yrs / {donor.gender}</td>
                        <td className="px-4 py-3.5 font-mono text-xs">{donor.phone || 'N/A'}</td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">
                          {donor.last_donation_date ? new Date(donor.last_donation_date).toLocaleDateString() : 'Today'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Eligibility Rules & Guidelines */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
            <span className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-1.5">
              <Award className="w-5 h-5 text-red-500" /> Donor Eligibility Rules
            </span>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-3">
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <p><strong>Age Limits:</strong> Donors must be between 18 and 65 years old to donate blood.</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <p><strong>Weight Limits:</strong> Minimum weight limit is 50kg (110 lbs) for medical safety.</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <p><strong>Interval:</strong> At least 56 days (8 weeks) must have elapsed since their last donation.</p>
              </div>
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p><strong>Exclusions:</strong> Exclude donors with active infections, low hemoglobin, or taking antibiotics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Register Donor */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Register Blood Donor</span>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRegisterDonor} className="p-5 space-y-4">
              <div>
                <label className={lbl}>Donor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className={inp}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Blood Type</label>
                  <select
                    value={registerForm.blood_type}
                    onChange={(e) => setRegisterForm({ ...registerForm, blood_type: e.target.value })}
                    className={inp}
                  >
                    {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Age (years)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 28"
                    value={registerForm.age}
                    onChange={(e) => setRegisterForm({ ...registerForm, age: e.target.value })}
                    className={inp}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Gender</label>
                  <select
                    value={registerForm.gender}
                    onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
                    className={inp}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +251..."
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                    className={inp}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm"
              >
                Register Donor & Add 1 Unit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Blood */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Issue Blood Units</span>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleIssueBlood} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Blood Type Required</label>
                  <select
                    value={issueForm.blood_type}
                    onChange={(e) => setIssueForm({ ...issueForm, blood_type: e.target.value })}
                    className={inp}
                  >
                    {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Quantity (units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={issueForm.units}
                    onChange={(e) => setIssueForm({ ...issueForm, units: e.target.value })}
                    className={inp}
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>Patient ID (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 1 (optional)"
                  value={issueForm.patient_id}
                  onChange={(e) => setIssueForm({ ...issueForm, patient_id: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Clinical Purpose / Ward</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. ICU surgery, trauma response..."
                  value={issueForm.purpose}
                  onChange={(e) => setIssueForm({ ...issueForm, purpose: e.target.value })}
                  className={inp}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl text-sm"
              >
                Deduct Inventory & Issue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankPage;
