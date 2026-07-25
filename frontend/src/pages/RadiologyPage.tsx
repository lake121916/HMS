import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, ArrowLeft } from 'lucide-react';

const RadiologyPage: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Radiology</h1>
        <p className="text-sm text-gray-500">Manage imaging requests, upload reports, and share findings with doctors.</p>
      </div>
      <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md">
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </Link>
    </div>
    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 text-sky-600">
        <FlaskConical className="w-6 h-6" />
        <div>
          <p className="font-semibold">Radiology module placeholder</p>
          <p className="text-sm text-gray-500">This module will let radiologists manage imaging requests and upload X-ray/MRI/CT/ultrasound reports.</p>
        </div>
      </div>
    </div>
  </div>
);

export default RadiologyPage;
