import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, ArrowLeft } from 'lucide-react';

const FinanceReportsPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Finance Reports</h1>
        <p className="text-sm text-gray-500">Review daily cash, revenue, and billing performance metrics.</p>
      </div>
      <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md">
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </Link>
    </div>
    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-green-600">
        <BarChart2 className="w-6 h-6" />
        <div>
          <p className="font-semibold">Finance reports placeholder</p>
          <p className="text-sm text-gray-500">This module will include exports, register closings, insurance payments, and financial summaries.</p>
        </div>
      </div>
    </div>
  </div>
);

export default FinanceReportsPage;
