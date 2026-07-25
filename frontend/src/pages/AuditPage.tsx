import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const AuditPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-gray-500">Review system activity, security events, and compliance reports.</p>
      </div>
      <Link to="/admin" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md">
        <ArrowLeft className="w-4 h-4" /> Back to admin
      </Link>
    </div>
    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-yellow-600">
        <Shield className="w-6 h-6" />
        <div>
          <p className="font-semibold">Audit module placeholder</p>
          <p className="text-sm text-gray-500">This module will show log events, user actions, and security metrics for auditors.</p>
        </div>
      </div>
    </div>
  </div>
);

export default AuditPage;
