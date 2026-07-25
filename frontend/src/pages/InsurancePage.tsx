import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const InsurancePage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Insurance Claims</h1>
        <p className="text-sm text-gray-500">Verify and manage insurance claims and approvals.</p>
      </div>
      <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md">
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </Link>
    </div>
    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-blue-600">
        <Shield className="w-6 h-6" />
        <div>
          <p className="font-semibold">Insurance workflow placeholder</p>
          <p className="text-sm text-gray-500">This module will allow insurance officers to verify claims, approve or reject cases, and review insurance status.</p>
        </div>
      </div>
    </div>
  </div>
);

export default InsurancePage;
