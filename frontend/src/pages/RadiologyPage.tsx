import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import {
  FlaskConical, Plus, Search, Trash2, X, Upload, CheckCircle,
  AlertCircle, Activity, Play, Eye, EyeOff, Sliders
} from 'lucide-react';

interface LabTest {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  test_name: string;
  test_type: string;
  status: string;
  priority: string;
  requested_date: string;
  notes: string;
  results?: string;
  is_abnormal?: boolean;
  result_date?: string;
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  normal: 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const RadiologyPage: React.FC = () => {
  const { can } = useRoleAccess();
  const { user } = useAuth();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);

  // Forms state
  const [orderForm, setOrderForm] = useState({
    patient_id: '',
    test_name: 'Chest X-Ray',
    test_type: 'radiology',
    priority: 'normal',
    notes: ''
  });

  const [analysisForm, setAnalysisForm] = useState({
    analysis_type: 'pneumonia_detection',
    image_type: 'xray'
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // AI analysis results state
  const [analysisResult, setAnalysisResult] = useState<{
    prediction: string;
    confidence: number;
    findings: string[];
    recommendations: string[];
    heatmap_data: string | null;
    serviceUsed: string;
  } | null>(null);

  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(50); // 0-100
  const [showHeatmap, setShowHeatmap] = useState(true);

  useEffect(() => {
    fetchRadiologyTests();
  }, [statusFilter]);

  const fetchRadiologyTests = async () => {
    try {
      const p = statusFilter ? `?status=${statusFilter}` : '';
      const r = await api.get(`/lab-tests${p}`);
      // Filter out only radiology/imaging type tests
      const allTests: LabTest[] = r.data.data.labTests || [];
      const radiologyTests = allTests.filter(t => 
        t.test_type === 'radiology' ||
        ['xray', 'mri', 'ct', 'ultrasound', 'radiology'].includes(t.test_type?.toLowerCase()) ||
        t.test_name.toLowerCase().includes('x-ray') ||
        t.test_name.toLowerCase().includes('mri') ||
        t.test_name.toLowerCase().includes('ct') ||
        t.test_name.toLowerCase().includes('scan')
      );
      setTests(radiologyTests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lab-tests', {
        ...orderForm,
        patient_id: parseInt(orderForm.patient_id, 10)
      });
      setShowOrderModal(false);
      fetchRadiologyTests();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to submit radiology order.');
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await api.put(`/lab-tests/${id}`, { status });
      fetchRadiologyTests();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunAIAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest) return;
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('image_type', analysisForm.image_type);
      formData.append('analysis_type', analysisForm.analysis_type);

      const res = await api.post(`/lab-tests/${selectedTest.id}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setAnalysisResult(res.data.data);
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'AI CNN Service communication failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this radiology order?')) return;
    try {
      await api.delete(`/lab-tests/${id}`);
      fetchRadiologyTests();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete order.');
    }
  };

  const filteredTests = tests.filter(t =>
    t.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.test_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.doctor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-sky-600" /> Radiology & Medical Imaging
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Order scans, track status, and perform deep CNN image classifications with Grad-CAM localization heatmaps.
          </p>
        </div>
        {can('lab_tests:create') && (
          <button
            onClick={() => {
              setOrderForm({ patient_id: '', test_name: 'Chest X-Ray', test_type: 'radiology', priority: 'normal', notes: '' });
              setShowOrderModal(true);
            }}
            className="flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold gap-2 transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Order Scan
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient, scan type, or ordering doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading imaging scans...</div>
        ) : filteredTests.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No radiology scans matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-left border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Patient</th>
                  <th className="px-5 py-3.5 font-semibold">Scan Details</th>
                  <th className="px-5 py-3.5 font-semibold">Requested By</th>
                  <th className="px-5 py-3.5 font-semibold">Priority</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      {test.patient_name}
                      <span className="block text-xs font-normal text-gray-400">ID: #{test.patient_id}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{test.test_name}</span>
                      <span className="block text-xs text-gray-400">Requested: {new Date(test.requested_date).toLocaleDateString()}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                      Dr. {test.doctor_name || 'System Admin'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${PRIORITY_COLORS[test.priority] || ''}`}>
                        {test.priority}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[test.status] || ''}`}>
                        {test.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {test.status === 'pending' && user?.role === 'lab_technician' && (
                          <button
                            onClick={() => handleStatusUpdate(test.id, 'in_progress')}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg text-xs font-semibold"
                          >
                            Accept Request
                          </button>
                        )}

                        {test.status === 'in_progress' && user?.role === 'lab_technician' && (
                          <button
                            onClick={() => {
                              setSelectedTest(test);
                              setAnalysisResult(null);
                              setSelectedFile(null);
                              setFilePreview(null);
                              setAnalysisForm({
                                analysis_type: test.test_name.toLowerCase().includes('pneumonia') || test.test_name.toLowerCase().includes('chest') ? 'pneumonia_detection' : test.test_name.toLowerCase().includes('fracture') || test.test_name.toLowerCase().includes('bone') ? 'fracture_detection' : 'tumor_detection',
                                image_type: test.test_name.toLowerCase().includes('mri') ? 'mri' : test.test_name.toLowerCase().includes('ct') ? 'ct' : test.test_name.toLowerCase().includes('ultrasound') ? 'ultrasound' : 'xray'
                              });
                              setShowAnalysisModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold"
                          >
                            <Play className="w-3 h-3" /> Run AI CNN
                          </button>
                        )}

                        {test.status === 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedTest(test);
                              setShowViewModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Findings
                          </button>
                        )}

                        {can('lab_tests:delete') && (
                          <button
                            onClick={() => handleDelete(test.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Order Scan */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">Order Radiology Scan</span>
              <button onClick={() => setShowOrderModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleOrderSubmit} className="p-5 space-y-4">
              <div>
                <label className={lbl}>Patient ID</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1"
                  value={orderForm.patient_id}
                  onChange={(e) => setOrderForm({ ...orderForm, patient_id: e.target.value })}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Scan Type</label>
                <select
                  value={orderForm.test_name}
                  onChange={(e) => setOrderForm({ ...orderForm, test_name: e.target.value })}
                  className={inp}
                >
                  <option value="Chest X-Ray">Chest X-Ray</option>
                  <option value="Brain MRI">Brain MRI</option>
                  <option value="Abdominal CT Scan">Abdominal CT Scan</option>
                  <option value="Limb X-Ray (Fracture Check)">Limb X-Ray (Fracture Check)</option>
                  <option value="Pelvic Ultrasound">Pelvic Ultrasound</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Priority</label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                  className={inp}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent / Emergency</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Clinical Notes / Symptoms</label>
                <textarea
                  rows={3}
                  placeholder="Describe patient condition and imaging requests..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className={inp}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm"
              >
                Submit Imaging Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Run AI CNN Diagnosis */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="font-bold text-gray-900 dark:text-white block">AI CNN Medical Image Analysis</span>
                <span className="text-xs text-gray-400">Radiology ID: #{selectedTest?.id} - {selectedTest?.test_name} for {selectedTest?.patient_name}</span>
              </div>
              <button onClick={() => { setShowAnalysisModal(false); fetchRadiologyTests(); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
              {/* Left Column: Form & Scan Upload */}
              <div className="p-5 space-y-4">
                <form onSubmit={handleRunAIAnalysis} className="space-y-4">
                  <div>
                    <label className={lbl}>Select Scan File (DICOM / JPEG / PNG)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition-colors">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                          <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-semibold text-blue-600 hover:text-blue-500">
                            <span>Upload a file</span>
                            <input type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, BMP up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Imaging Source</label>
                      <select
                        value={analysisForm.image_type}
                        onChange={(e) => setAnalysisForm({ ...analysisForm, image_type: e.target.value })}
                        className={inp}
                      >
                        <option value="xray">X-Ray</option>
                        <option value="mri">MRI Scan</option>
                        <option value="ct">CT Scan</option>
                        <option value="ultrasound">Ultrasound</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Target Analysis</label>
                      <select
                        value={analysisForm.analysis_type}
                        onChange={(e) => setAnalysisForm({ ...analysisForm, analysis_type: e.target.value })}
                        className={inp}
                      >
                        <option value="pneumonia_detection">Pneumonia Check</option>
                        <option value="fracture_detection">Fracture Check</option>
                        <option value="tumor_detection">Tumor Check</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={analyzing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-95"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing CNN Classifier...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Run Deep Learning Analysis
                      </>
                    )}
                  </button>
                </form>

                {/* Upload Preview */}
                {filePreview && (
                  <div className="relative border border-gray-150 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 p-2 text-center">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Uploaded Scan Input</p>
                    <img src={filePreview} alt="Uploaded Scan" className="max-h-48 mx-auto rounded-lg object-contain bg-black" />
                  </div>
                )}
              </div>

              {/* Right Column: AI Analysis Output */}
              <div className="p-5 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col justify-between">
                {!analysisResult && !analyzing && (
                  <div className="flex flex-col items-center justify-center text-center h-full py-12 text-gray-400 dark:text-gray-500">
                    <Activity className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-700" />
                    <p className="font-semibold text-sm">Awaiting AI Execution</p>
                    <p className="text-xs max-w-xs mt-1">Upload a scan and select the diagnostic classifier to render neural net predictions.</p>
                  </div>
                )}

                {analyzing && (
                  <div className="flex flex-col items-center justify-center text-center h-full py-12">
                    <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">Segmenting Scan Structures...</p>
                    <p className="text-xs text-gray-500 mt-1 animate-pulse">Running forward propagation and generating heatmaps...</p>
                  </div>
                )}

                {analysisResult && (
                  <div className="space-y-4 h-full flex flex-col justify-between">
                    <div>
                      {/* Prediction Title */}
                      <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 shadow-sm mb-3">
                        <AlertCircle className={`w-5 h-5 ${analysisResult.confidence > 0.5 && analysisResult.prediction.includes('Detected') ? 'text-red-500' : 'text-green-500'}`} />
                        <div>
                          <span className="text-xs text-gray-400 block font-semibold uppercase">Classification Prediction</span>
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{analysisResult.prediction}</span>
                        </div>
                      </div>

                      {/* Confidence Score bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-gray-500 dark:text-gray-400">CNN Model Confidence</span>
                          <span className="text-blue-600 dark:text-blue-400">{(analysisResult.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div className="bg-sky-600 h-full transition-all duration-1000" style={{ width: `${analysisResult.confidence * 100}%` }} />
                        </div>
                      </div>

                      {/* Bullet points for findings */}
                      <div className="space-y-2.5">
                        <div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">Key Diagnostic Findings</span>
                          <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
                            {analysisResult.findings.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-1">Clinical Recommendations</span>
                          <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1">
                            {analysisResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Grad-CAM Heatmap Visualization Panel */}
                    {analysisResult.heatmap_data && (
                      <div className="mt-4 border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5 text-blue-600" /> Grad-CAM Heatmap
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                          >
                            {showHeatmap ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Toggle</>}
                          </button>
                        </div>
                        
                        {showHeatmap && (
                          <div className="space-y-2">
                            {/* Blended Stack Layer container */}
                            <div className="relative w-full aspect-square max-w-[200px] mx-auto bg-black rounded-lg overflow-hidden border border-gray-200">
                              {/* Bottom: original image */}
                              {filePreview && (
                                <img src={filePreview} alt="Base scan" className="absolute inset-0 w-full h-full object-contain" />
                              )}
                              {/* Top: heatmap layer with dynamic opacity blend */}
                              <img
                                src={`data:image/jpeg;base64,${analysisResult.heatmap_data}`}
                                alt="Grad-CAM"
                                className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity"
                                style={{ opacity: heatmapOpacity / 100 }}
                              />
                            </div>
                            
                            {/* Opacity slider */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-semibold uppercase">Blend Opacity</span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={heatmapOpacity}
                                onChange={(e) => setHeatmapOpacity(parseInt(e.target.value))}
                                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                              />
                              <span className="text-[10px] text-gray-400 font-mono w-6 text-right">{heatmapOpacity}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-[10px] text-gray-400 flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2 mt-3">
                      <span>Source: {analysisResult.serviceUsed === 'cnn_microservice_active' ? 'FastAPI CNN' : 'Simulated CNN'}</span>
                      <span>Ready for Radiologist validation</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/30 px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => { setShowAnalysisModal(false); fetchRadiologyTests(); }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Findings */}
      {showViewModal && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="font-bold text-gray-900 dark:text-white block">Imaging Results</span>
                <span className="text-xs text-gray-400">Radiology ID: #{selectedTest.id}</span>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">Patient Name</span>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedTest.patient_name}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">Requested Scan</span>
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{selectedTest.test_name}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">Physician Notes</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700">
                  "{selectedTest.notes || 'No notes provided.'}"
                </p>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Diagnostic Report Findings</span>
                <div className="text-sm text-gray-800 dark:text-gray-200 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100/50 dark:border-blue-900/30 whitespace-pre-line font-mono text-xs">
                  {selectedTest.results || 'No report findings uploaded.'}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadiologyPage;
