import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowLeft } from 'lucide-react';

const BloodBankPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Blood Bank</h1>
        <p className="text-sm text-gray-500">Manage donors, donations, inventory and blood unit allocation.</p>
      </div>
      <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md">
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </Link>
    </div>
    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-red-600">
        <MapPin className="w-6 h-6" />
        <div>
          <p className="font-semibold">Blood bank management placeholder</p>
          <p className="text-sm text-gray-500">This module will help blood bank staff register donors, track inventory, and issue blood units.</p>
        </div>
      </div>
    </div>
  </div>
);

export default BloodBankPage;
