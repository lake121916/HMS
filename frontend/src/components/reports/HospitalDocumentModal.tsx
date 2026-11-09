import React, { useState, useEffect, useRef } from 'react';
import {
  Printer, FileSpreadsheet, X, CheckCircle,
  Building2, ShieldCheck, QrCode, Pill
} from 'lucide-react';
import api from '../../services/api';

export type HospitalDocumentType =
  | 'patient_registration'
  | 'patient_id_card'
  | 'medical_history'
  | 'doctor_consultation'
  | 'nurse_care_notes'
  | 'triage_assessment'
  | 'lab_test_request'
  | 'lab_test_result'
  | 'prescription_slip'
  | 'pharmacy_dispense'
  | 'pharmacy_inventory'
  | 'inpatient_admission'
  | 'discharge_summary'
  | 'hospital_invoice'
  | 'payment_receipt'
  | 'department_revenue'
  | 'monthly_statistics';

interface DocumentMeta {
  id: HospitalDocumentType;
  titleEn: string;
  titleAm: string;
  category: 'Patient Records' | 'Clinical' | 'Diagnostics' | 'Pharmacy' | 'Billing & Administration';
  code: string;
}

export const HOSPITAL_DOCUMENTS: DocumentMeta[] = [
  { id: 'patient_registration', titleEn: 'Patient Registration Form', titleAm: 'የታካሚ ምዝገባ ቅጽ', category: 'Patient Records', code: 'AKEH-REG-01' },
  { id: 'patient_id_card', titleEn: 'Patient Identification Card', titleAm: 'የታካሚ መታወቂያ ካርድ', category: 'Patient Records', code: 'AKEH-IDC-02' },
  { id: 'medical_history', titleEn: 'Patient Medical History Summary', titleAm: 'የሕክምና ታሪክ ማጠቃለያ', category: 'Patient Records', code: 'AKEH-MHR-03' },
  { id: 'doctor_consultation', titleEn: 'Doctor Consultation Report', titleAm: 'የሐኪም ምርመራ ሪፖርት', category: 'Clinical', code: 'AKEH-DCR-04' },
  { id: 'nurse_care_notes', titleEn: 'Nurse Care & Shift Notes', titleAm: 'የነርሶች እንክብካቤ እና ፈረቃ ማስታወሻ', category: 'Clinical', code: 'AKEH-NCN-05' },
  { id: 'triage_assessment', titleEn: 'Triage Assessment Sheet', titleAm: 'የትሪያጅ ምርመራ ወረቀት', category: 'Clinical', code: 'AKEH-TAS-06' },
  { id: 'lab_test_request', titleEn: 'Laboratory Test Request Order', titleAm: 'የላብራቶሪ ምርመራ ትዕዛዝ', category: 'Diagnostics', code: 'AKEH-LTR-07' },
  { id: 'lab_test_result', titleEn: 'Laboratory Test Result Report', titleAm: 'የላብራቶሪ ውጤት ሪፖርት', category: 'Diagnostics', code: 'AKEH-LRS-08' },
  { id: 'prescription_slip', titleEn: 'Electronic Prescription Slip', titleAm: 'የሕክምና መድኃኒት ማዘዣ', category: 'Pharmacy', code: 'AKEH-RXS-09' },
  { id: 'pharmacy_dispense', titleEn: 'Pharmacy Dispense Receipt', titleAm: 'የመድኃኒት መስጫ ደረሰኝ', category: 'Pharmacy', code: 'AKEH-PDR-10' },
  { id: 'pharmacy_inventory', titleEn: 'Pharmacy Inventory & Reorder Report', titleAm: 'የመድኃኒት ክምችት ሪፖርት', category: 'Pharmacy', code: 'AKEH-PIR-11' },
  { id: 'inpatient_admission', titleEn: 'Inpatient Ward Admission Form', titleAm: 'የሆስፒታል ተኝቶ ህክምና ቅጽ', category: 'Clinical', code: 'AKEH-IWF-12' },
  { id: 'discharge_summary', titleEn: 'Patient Discharge Summary', titleAm: 'የሆስፒታል መልቀቂያ ማጠቃለያ', category: 'Clinical', code: 'AKEH-PDS-13' },
  { id: 'hospital_invoice', titleEn: 'Official Billing Invoice (ETB)', titleAm: 'የሆስፒታል ሂሳብ ደረሰኝ', category: 'Billing & Administration', code: 'AKEH-INV-14' },
  { id: 'payment_receipt', titleEn: 'Electronic Payment Receipt (Telebirr/CBE)', titleAm: 'ክፍያ ማረጋገጫ ደረሰኝ', category: 'Billing & Administration', code: 'AKEH-RCP-15' },
  { id: 'department_revenue', titleEn: 'Department Financial & Revenue Report', titleAm: 'የክፍሎች ገቢና ፋይናንስ ሪፖርት', category: 'Billing & Administration', code: 'AKEH-DFR-16' },
  { id: 'monthly_statistics', titleEn: 'Monthly Hospital Statistical Report', titleAm: 'ወርሃዊ የሆስፒታል ስታቲስቲክስ', category: 'Billing & Administration', code: 'AKEH-MSR-17' },
];

interface DemoPatient {
  id: number;
  mrn: string;
  name: string;
  nameAm: string;
  age: number;
  gender: string;
  phone: string;
  blood: string;
  allergies: string;
  address: string;
  emergencyContact: string;
  qrToken: string;
}

const DEMO_PATIENTS: DemoPatient[] = [
  { id: 1, mrn: 'PAT-0001', name: 'Lake Awraris', nameAm: 'ላቀ አውራሪስ', age: 26, gender: 'Male', phone: '0947807133', blood: 'O+', allergies: 'Penicillin (Severe anaphylaxis)', address: 'Kebele 01, Alem Ketema, Amhara', emergencyContact: '+251 91 199 0000', qrToken: 'AKEH-PAT-0001-QR-SECURE-TOKEN-LAKE' },
  { id: 2, mrn: 'PAT-0002', name: 'Azanaw Nega', nameAm: 'አዛናው ነጋ', age: 48, gender: 'Male', phone: '0911223344', blood: 'A+', allergies: 'None known', address: 'Kebele 02, Alem Ketema, Amhara', emergencyContact: '+251 92 123 4567', qrToken: 'AKEH-PAT-0002-QR-SECURE-TOKEN-AZANAW' },
  { id: 3, mrn: 'PAT-0003', name: 'Selamawit Tesfaye', nameAm: 'ሰላማዊት ተስፋዬ', age: 31, gender: 'Female', phone: '0922334455', blood: 'B+', allergies: 'Sulfa drugs', address: 'Kebele 03, Alem Ketema, Amhara', emergencyContact: '+251 93 234 5678', qrToken: 'AKEH-PAT-0003-QR-SECURE-TOKEN-SELAM' },
  { id: 4, mrn: 'PAT-0004', name: 'Bethlehem Tadesse', nameAm: 'ቤተልሔም ታደሰ', age: 29, gender: 'Female', phone: '0933445566', blood: 'O-', allergies: 'Aspirin', address: 'Kebele 01, Alem Ketema, Amhara', emergencyContact: '+251 94 345 6789', qrToken: 'AKEH-PAT-0004-QR-SECURE-TOKEN-BETH' },
  { id: 5, mrn: 'PAT-0005', name: 'Henok Mekonnen', nameAm: 'ሄኖክ መኮንን', age: 35, gender: 'Male', phone: '0944556677', blood: 'AB+', allergies: 'None known', address: 'Kebele 02, Alem Ketema, Amhara', emergencyContact: '+251 95 456 7890', qrToken: 'AKEH-PAT-0005-QR-SECURE-TOKEN-HENOK' },
];

interface HospitalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocument?: HospitalDocumentType;
  patientId?: number;
}

export const HospitalDocumentModal: React.FC<HospitalDocumentModalProps> = ({
  isOpen,
  onClose,
  initialDocument = 'patient_id_card',
  patientId = 1
}) => {
  const [selectedDoc, setSelectedDoc] = useState<HospitalDocumentType>(initialDocument);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(patientId);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedDoc(initialDocument);
  }, [initialDocument]);

  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    }
  }, [patientId]);

  // Load real cryptographic QR code for current patient
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    api.get(`/patients/${selectedPatientId}/qr`)
      .then(res => {
        if (isMounted && res.data?.data?.qrCodeDataUrl) {
          setQrCodeUrl(res.data.data.qrCodeDataUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Fallback SVG QR code data URI
          setQrCodeUrl(null);
        }
      });
    return () => { isMounted = false; };
  }, [isOpen, selectedPatientId]);

  if (!isOpen) return null;

  const currentPatient = DEMO_PATIENTS.find(p => p.id === selectedPatientId) || DEMO_PATIENTS[0];
  const docMeta = HOSPITAL_DOCUMENTS.find(d => d.id === selectedDoc) || HOSPITAL_DOCUMENTS[0];
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const referenceNumber = `REF-${docMeta.code}-${new Date().getFullYear()}-${String(currentPatient.id).padStart(4, '0')}`;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `ALEM KETEMA ENAT HOSPITAL - ${docMeta.titleEn} (${docMeta.titleAm})\n`;
    csvContent += `Document Code: ${docMeta.code}, Reference: ${referenceNumber}, Date: ${currentDate}\n`;
    csvContent += `Patient MRN: ${currentPatient.mrn}, Name: ${currentPatient.name}, Phone: ${currentPatient.phone}\n\n`;

    if (selectedDoc === 'hospital_invoice') {
      csvContent += 'Item,Description,Qty,Unit Price (ETB),Total Amount (ETB)\n';
      csvContent += '1,General OPD Consultation,1,200.00,200.00\n';
      csvContent += '2,Laboratory Diagnostic Panel,1,150.00,150.00\n';
      csvContent += '3,Prescription Medication (Coartem),2,65.00,130.00\n';
      csvContent += ',,,Total Due (ETB),480.00\n';
    } else if (selectedDoc === 'pharmacy_inventory') {
      csvContent += 'Item Code,Medicine Name,Category,Batch Number,Stock Qty,Unit Price (ETB),Status\n';
      csvContent += 'MED-01,Paracetamol 500mg,Analgesics,BATCH-ET-1024,3200,15.00,Optimal\n';
      csvContent += 'MED-02,Coartem (Artemether-Lumefantrine),Antimalarials,BATCH-ET-4819,1850,65.00,Optimal\n';
      csvContent += 'MED-03,Amoxicillin 500mg,Antibiotics,BATCH-ET-3021,2100,35.00,Optimal\n';
      csvContent += 'MED-04,Salbutamol Inhaler,Bronchodilators,BATCH-ET-9182,420,160.00,Reorder Required\n';
    } else {
      csvContent += 'Field,Value\n';
      csvContent += `Patient Name,${currentPatient.name}\n`;
      csvContent += `Patient MRN,${currentPatient.mrn}\n`;
      csvContent += `Date of Birth / Age,${currentPatient.age} Years\n`;
      csvContent += `Blood Group,${currentPatient.blood}\n`;
      csvContent += `Known Allergies,${currentPatient.allergies}\n`;
      csvContent += `Address,${currentPatient.address}\n`;
      csvContent += `Attending Doctor,Dr. Dawit Kebede (General Practitioner)\n`;
      csvContent += `Hospital Department,General Medicine / Outpatient\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${docMeta.code}_${currentPatient.mrn}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none">
        
        {/* Controls Toolbar (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Official Hospital Document Viewer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                  {docMeta.code}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ዓለም ከተማ እናት ሆስፒታል / Alem Ketema Enat Hospital
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Document Selector */}
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value as HospitalDocumentType)}
              className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HOSPITAL_DOCUMENTS.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.code} - {doc.titleEn}
                </option>
              ))}
            </select>

            {/* Patient Selector */}
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEMO_PATIENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mrn} - {p.name}
                </option>
              ))}
            </select>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow transition-colors"
              title="Print document or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors"
              title="Export table data to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              CSV
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printAreaRef} className="p-6 sm:p-10 font-sans text-slate-900 bg-white overflow-y-auto max-h-[80vh] print:max-h-none print:p-4 print:overflow-visible">
          
          {/* 1. Official Ethiopian Hospital Bilingual Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center font-black text-2xl shadow-md border-2 border-amber-400 shrink-0">
                  <span>AKEH</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase font-ethiopic">
                    ዓለም ከተማ እናት ሆስፒታል
                  </h1>
                  <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-blue-900 uppercase">
                    ALEM KETEMA ENAT GENERAL HOSPITAL
                  </h2>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Federal Democratic Republic of Ethiopia | Amhara Regional Health Bureau
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    North Shewa Zone, Alem Ketema | Tel: +251 11 896 1234 | Emergency: 911 | TIN: 0048192734
                  </p>
                </div>
              </div>

              {/* Verified Security Seal & Document Code */}
              <div className="text-right shrink-0">
                <div className="inline-block border-2 border-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-center mb-1">
                  <span className="block text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                    Official Verified
                  </span>
                  <span className="block text-xs font-mono font-bold text-emerald-700">
                    {referenceNumber}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Issued: <strong>{currentDate}</strong>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2 rounded-lg">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block font-ethiopic">
                  {docMeta.titleAm}
                </span>
                <span className="text-base sm:text-lg font-black text-blue-950 uppercase tracking-wide block">
                  {docMeta.titleEn}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-blue-900 text-white">
                {docMeta.category}
              </span>
            </div>
          </div>

          {/* 2. Patient Identification Section (Common to Clinical/Patient forms) */}
          <div className="mb-6 p-4 rounded-xl border border-slate-300 bg-slate-50/50">
            <div className="text-[11px] font-black uppercase tracking-wider text-blue-900 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              Patient Demographic & Clinical Identification
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Patient MRN</span>
                <span className="font-mono font-bold text-blue-900 text-sm">{currentPatient.mrn}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Full Name</span>
                <span className="font-bold text-slate-900">{currentPatient.name}</span>
                <span className="block text-[10px] text-slate-500 font-ethiopic">{currentPatient.nameAm}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Age / Gender</span>
                <span className="font-bold text-slate-900">{currentPatient.age} Yrs / {currentPatient.gender}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Blood Group</span>
                <span className="font-mono font-bold text-rose-700">{currentPatient.blood}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Phone Number</span>
                <span className="font-mono font-bold text-slate-800">{currentPatient.phone}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Known Allergies</span>
                <span className="font-bold text-rose-700">{currentPatient.allergies}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-slate-500 text-[10px] font-semibold uppercase">Residential Address</span>
                <span className="font-medium text-slate-800">{currentPatient.address}</span>
              </div>
            </div>
          </div>

          {/* 3. Document-Specific Body Templates */}

          {/* Template A: Patient ID Card */}
          {selectedDoc === 'patient_id_card' && (
            <div className="my-6 p-6 rounded-2xl border-2 border-blue-900 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 max-w-lg mx-auto shadow-md">
              <div className="flex items-center justify-between pb-3 border-b-2 border-blue-900 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-sm">
                    AKEH
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase text-blue-950 font-ethiopic">ዓለም ከተማ እናት ሆስፒታል</div>
                    <div className="text-[10px] font-bold tracking-wider text-blue-800 uppercase">HOSPITAL PATIENT ID CARD</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xs text-blue-900">{currentPatient.mrn}</span>
                </div>
              </div>

              <div className="flex gap-4 items-center mb-4">
                <div className="w-24 h-24 rounded-xl border border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-center p-1 shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-lg mb-1">
                    {currentPatient.name.charAt(0)}
                  </div>
                  <span className="text-[8px] font-bold uppercase text-slate-500">Photo ID</span>
                </div>

                <div className="space-y-1 text-xs flex-1">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Name:</span>
                    <strong className="text-sm text-slate-900">{currentPatient.name}</strong>
                    <span className="text-[11px] text-slate-600 block font-ethiopic">{currentPatient.nameAm}</span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Age:</span>
                      <strong>{currentPatient.age} Yrs</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Sex:</span>
                      <strong>{currentPatient.gender}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Blood:</span>
                      <strong className="text-rose-700">{currentPatient.blood}</strong>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">Phone:</span>
                    <strong className="font-mono">{currentPatient.phone}</strong>
                  </div>
                </div>

                {/* Scannable Cryptographic QR Token Display */}
                <div className="w-24 text-center shrink-0">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Patient QR Code" className="w-20 h-20 mx-auto border border-slate-300 rounded p-1 bg-white" />
                  ) : (
                    <div className="w-20 h-20 mx-auto border border-dashed border-slate-400 rounded flex flex-col items-center justify-center bg-white p-1">
                      <QrCode className="w-12 h-12 text-blue-900" />
                      <span className="text-[7px] font-mono font-bold text-slate-500">SCANNABLE QR</span>
                    </div>
                  )}
                  <span className="text-[8px] font-mono text-slate-500 block mt-0.5">Dual-Device Scan</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-600 flex justify-between items-center">
                <span>Emergency Contact: <strong>{currentPatient.emergencyContact}</strong></span>
                <span>Allergies: <strong className="text-rose-600">{currentPatient.allergies}</strong></span>
              </div>
            </div>
          )}

          {/* Template B: Hospital Invoice & Billing Statement */}
          {selectedDoc === 'hospital_invoice' && (
            <div className="my-6 space-y-4">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 p-2 text-left w-12">#</th>
                    <th className="border border-slate-300 p-2 text-left">Service / Item Description</th>
                    <th className="border border-slate-300 p-2 text-left">Department</th>
                    <th className="border border-slate-300 p-2 text-center w-16">Qty</th>
                    <th className="border border-slate-300 p-2 text-right w-28">Unit Price (ETB)</th>
                    <th className="border border-slate-300 p-2 text-right w-28">Amount (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 text-center">1</td>
                    <td className="border border-slate-300 p-2 font-medium">Outpatient Medical Doctor Consultation Fee</td>
                    <td className="border border-slate-300 p-2 text-slate-600">General Medicine</td>
                    <td className="border border-slate-300 p-2 text-center">1</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">200.00</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold">200.00</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 text-center">2</td>
                    <td className="border border-slate-300 p-2 font-medium">Complete Blood Count (CBC) & Blood Film Investigation</td>
                    <td className="border border-slate-300 p-2 text-slate-600">Central Laboratory</td>
                    <td className="border border-slate-300 p-2 text-center">1</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">150.00</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold">150.00</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 text-center">3</td>
                    <td className="border border-slate-300 p-2 font-medium">Coartem 20/120mg (Artemether-Lumefantrine) - 24 Tabs</td>
                    <td className="border border-slate-300 p-2 text-slate-600">Pharmacy</td>
                    <td className="border border-slate-300 p-2 text-center">2</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">65.00</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold">130.00</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="border border-slate-300 p-2 text-right font-bold">Subtotal:</td>
                    <td colSpan={2} className="border border-slate-300 p-2 text-right font-mono font-bold">480.00 ETB</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="border border-slate-300 p-2 text-right font-bold">Government Value Added Tax (VAT 0% Healthcare Exemption):</td>
                    <td colSpan={2} className="border border-slate-300 p-2 text-right font-mono">0.00 ETB</td>
                  </tr>
                  <tr className="bg-blue-50 text-blue-950">
                    <td colSpan={4} className="border border-slate-300 p-2 text-right font-black text-sm">TOTAL AMOUNT DUE (ETB):</td>
                    <td colSpan={2} className="border border-slate-300 p-2 text-right font-mono font-black text-base text-blue-900">480.00 ETB</td>
                  </tr>
                </tfoot>
              </table>
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong>Payment Instructions:</strong> Accepted via CBE Birr, Telebirr merchant ID <strong>589120</strong>, or cash at Hospital Cash Desk counter.
              </div>
            </div>
          )}

          {/* Template C: Payment Receipt */}
          {selectedDoc === 'payment_receipt' && (
            <div className="my-6 p-6 rounded-2xl border-2 border-emerald-600 bg-emerald-50/30 max-w-xl mx-auto space-y-4">
              <div className="text-center pb-3 border-b border-emerald-300">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  PAYMENT VERIFIED & SETTLED
                </span>
                <div className="text-2xl font-black text-emerald-900 font-mono mt-1">480.00 ETB</div>
                <div className="text-[11px] text-slate-500 font-mono">Receipt No: REC-ETH-2024-00192 | Txn: TXN-ET-89124091</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Payment Provider</span>
                  <strong className="text-slate-800">Telebirr SuperApp / CBE Birr</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Settlement Status</span>
                  <strong className="text-emerald-700 font-bold">100% Cleared (Cashier Counter)</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Payer Name</span>
                  <strong className="text-slate-800">{currentPatient.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Received By Cashier</span>
                  <strong className="text-slate-800">Mulugeta Kassaye (Senior Cashier)</strong>
                </div>
              </div>
            </div>
          )}

          {/* Template D: Doctor Consultation / Clinical Encounters */}
          {selectedDoc === 'doctor_consultation' && (
            <div className="my-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Chief Complaint & History of Present Illness:</h4>
                <p className="text-slate-700 leading-relaxed">
                  Patient presents with high-grade intermittent fever, chills, rigors, headache, and generalized body malaise for 3 consecutive days. Denies cough or hemoptysis. Appetite markedly reduced.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-1">Physical Examination:</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-700">
                    <li>Temp: <strong>39.2 °C</strong> | Pulse: <strong>104 bpm</strong> | BP: <strong>118/76 mmHg</strong></li>
                    <li>HEENT: Sclera slightly icteric, conjunctiva pale.</li>
                    <li>Abdomen: Soft, mild splenomegaly palpated 2cm below costal margin.</li>
                    <li>Chest: Clear to auscultation bilaterally.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-blue-50/50">
                  <h4 className="font-bold text-blue-900 uppercase tracking-wider text-[11px] mb-1">Clinical Diagnosis & ICD-10:</h4>
                  <div className="text-sm font-bold text-slate-900">Acute Plasmodium Falciparum Malaria</div>
                  <div className="text-[11px] text-blue-800 font-mono mt-0.5">ICD-10 Code: B50.9 (Uncomplicated)</div>
                  <div className="mt-2 text-slate-700">Treatment Plan: Coartem (Artemether-Lumefantrine) 6-dose regimen + Paracetamol PRN.</div>
                </div>
              </div>
            </div>
          )}

          {/* Template E: Laboratory Test Result Report */}
          {selectedDoc === 'lab_test_result' && (
            <div className="my-6 space-y-4">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 p-2 text-left">Test Parameter</th>
                    <th className="border border-slate-300 p-2 text-left">Observed Value</th>
                    <th className="border border-slate-300 p-2 text-left">Standard Reference Range</th>
                    <th className="border border-slate-300 p-2 text-center w-24">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-medium">Blood Film for Malaria Parasites (BF)</td>
                    <td className="border border-slate-300 p-2 font-bold text-rose-700">P. falciparum ring forms (3+ positive)</td>
                    <td className="border border-slate-300 p-2 text-slate-600">No parasites detected</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">ABNORMAL</span></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-medium">Hemoglobin (Hb)</td>
                    <td className="border border-slate-300 p-2 font-mono font-bold text-amber-700">11.2 g/dL</td>
                    <td className="border border-slate-300 p-2 text-slate-600">13.5 - 17.5 g/dL (Adult Male)</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">LOW</span></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-medium">White Blood Cells (WBC)</td>
                    <td className="border border-slate-300 p-2 font-mono">6,800 / uL</td>
                    <td className="border border-slate-300 p-2 text-slate-600">4,000 - 11,000 / uL</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">NORMAL</span></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-medium">Random Blood Sugar (RBS)</td>
                    <td className="border border-slate-300 p-2 font-mono">104 mg/dL</td>
                    <td className="border border-slate-300 p-2 text-slate-600">70 - 140 mg/dL</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">NORMAL</span></td>
                  </tr>
                </tbody>
              </table>
              <div className="text-xs text-slate-600 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <strong>Laboratory Supervisor Note:</strong> Slide reviewed and verified microscopically by Senior Medical Laboratory Technologist Kidus Daniel.
              </div>
            </div>
          )}

          {/* Template F: Electronic Prescription Slip */}
          {selectedDoc === 'prescription_slip' && (
            <div className="my-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="flex items-center gap-2 font-bold text-blue-950 text-sm mb-2">
                  <Pill className="w-4 h-4 text-blue-700" />
                  Prescribed Pharmaceutical Medications:
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-2 text-left">Medication Name</th>
                      <th className="border border-slate-300 p-2 text-left">Dosage & Strength</th>
                      <th className="border border-slate-300 p-2 text-left">Frequency</th>
                      <th className="border border-slate-300 p-2 text-left">Duration</th>
                      <th className="border border-slate-300 p-2 text-center w-24">Dispensed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">Coartem (Artemether-Lumefantrine)</td>
                      <td className="border border-slate-300 p-2">20mg / 120mg (4 tablets)</td>
                      <td className="border border-slate-300 p-2">Twice daily with fatty meal</td>
                      <td className="border border-slate-300 p-2">3 Days (Total 24 Tabs)</td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">YES</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-2 font-bold text-slate-900">Paracetamol (EPHARM)</td>
                      <td className="border border-slate-300 p-2">500mg tablets</td>
                      <td className="border border-slate-300 p-2">1 tablet every 8 hours PRN fever</td>
                      <td className="border border-slate-300 p-2">3 Days</td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">YES</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <strong>Pharmacist Safety Warning:</strong> Complete the full antimalarial course even if fever resolves completely. Take immediately with milk or food.
              </div>
            </div>
          )}

          {/* Template G: Pharmacy Inventory & Stock Report */}
          {selectedDoc === 'pharmacy_inventory' && (
            <div className="my-6 space-y-4">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 p-2 text-left">Item Name</th>
                    <th className="border border-slate-300 p-2 text-left">Generic Molecule</th>
                    <th className="border border-slate-300 p-2 text-left">Manufacturer</th>
                    <th className="border border-slate-300 p-2 text-right">In Stock</th>
                    <th className="border border-slate-300 p-2 text-right">Reorder Level</th>
                    <th className="border border-slate-300 p-2 text-right">Unit Price (ETB)</th>
                    <th className="border border-slate-300 p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Paracetamol 500mg</td>
                    <td className="border border-slate-300 p-2">Paracetamol</td>
                    <td className="border border-slate-300 p-2 text-slate-600">EPHARM Ethiopia</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700">3,200</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">500</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">15.00</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">OPTIMAL</span></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Coartem (Artemether-Lumefantrine)</td>
                    <td className="border border-slate-300 p-2">Artemether 20 / Lumefantrine 120</td>
                    <td className="border border-slate-300 p-2 text-slate-600">Novartis / MoH</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700">1,850</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">300</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">65.00</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">OPTIMAL</span></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Amoxicillin 500mg</td>
                    <td className="border border-slate-300 p-2">Amoxicillin Trihydrate</td>
                    <td className="border border-slate-300 p-2 text-slate-600">Cadila Pharmaceuticals Ethiopia</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-emerald-700">2,100</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">400</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">35.00</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">OPTIMAL</span></td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Salbutamol Inhaler 100mcg</td>
                    <td className="border border-slate-300 p-2">Salbutamol Sulfate</td>
                    <td className="border border-slate-300 p-2 text-slate-600">GlaxoSmithKline</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold text-amber-700">420</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">200</td>
                    <td className="border border-slate-300 p-2 text-right font-mono">160.00</td>
                    <td className="border border-slate-300 p-2 text-center"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">REORDER SOON</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Template H: Monthly Hospital Statistical Report */}
          {selectedDoc === 'monthly_statistics' && (
            <div className="my-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Total Outpatient Visits</span>
                  <span className="text-xl font-black text-blue-900 font-mono">1,420</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Admissions (Inpatient)</span>
                  <span className="text-xl font-black text-emerald-800 font-mono">186</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Laboratory Investigations</span>
                  <span className="text-xl font-black text-purple-900 font-mono">2,840</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Monthly Revenue (ETB)</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">486,200</span>
                </div>
              </div>
            </div>
          )}

          {/* Default Fallback for other clinical forms (Triage, Registration, Admission, etc.) */}
          {['patient_registration', 'medical_history', 'nurse_care_notes', 'triage_assessment', 'lab_test_request', 'pharmacy_dispense', 'inpatient_admission', 'discharge_summary', 'department_revenue'].includes(selectedDoc) && (
            <div className="my-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/50">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Clinical & Administrative Assessment Details:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-bold">Assigned Department</span>
                    <strong className="text-slate-900">General Medicine / OPD</strong>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-bold">Attending Clinician</span>
                    <strong className="text-slate-900">Dr. Dawit Kebede (GP)</strong>
                  </div>
                  <div>
                    <span className="block text-slate-500 text-[10px] uppercase font-bold">Triage Acuity Priority</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                      URGENT (Category 2)
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-slate-700 leading-relaxed">
                  Patient registered under national hospital guidelines. Vital signs, triage evaluation, laboratory orders, and clinical medication dispensing recorded into the smart hospital electronic database.
                </p>
              </div>
            </div>
          )}

          {/* 4. Official Signatures, Verification Stamp & Watermark */}
          <div className="mt-10 pt-6 border-t-2 border-slate-800 grid grid-cols-3 gap-6 text-xs">
            {/* Attending Physician Signature */}
            <div className="text-center">
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                <span className="font-serif italic font-bold text-blue-900 text-sm">Dr. Dawit Kebede, MD</span>
              </div>
              <span className="block font-bold text-slate-800 text-[11px] mt-1">Dr. Dawit Kebede, MD</span>
              <span className="block text-[10px] text-slate-500">Medical Director / Senior Clinician</span>
            </div>

            {/* Official Hospital Seal */}
            <div className="text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-rose-600 border-dashed p-1 flex flex-col items-center justify-center text-rose-700 rotate-[-8deg] shadow-inner">
                <span className="text-[7px] font-black uppercase tracking-tighter">ALEM KETEMA ENAT</span>
                <span className="text-[8px] font-black uppercase text-rose-800">OFFICIAL SEAL</span>
                <span className="text-[6px] font-mono font-bold text-rose-600">{currentDate}</span>
                <span className="text-[7px] font-black uppercase tracking-tighter">HOSPITAL</span>
              </div>
              <span className="text-[9px] font-bold text-rose-700 mt-1 uppercase tracking-wider">
                Official Verification Stamp
              </span>
            </div>

            {/* Senior Officer / Cashier / Nurse Signature */}
            <div className="text-center">
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                <span className="font-serif italic font-bold text-slate-800 text-sm">Sr. Selamawit T. / Mulugeta K.</span>
              </div>
              <span className="block font-bold text-slate-800 text-[11px] mt-1">Authorized Department Officer</span>
              <span className="block text-[10px] text-slate-500">Hospital Records & Registry Bureau</span>
            </div>
          </div>

          {/* Watermark Notice */}
          <div className="mt-6 text-center text-[10px] text-slate-400 font-mono tracking-widest uppercase border-t border-slate-200 pt-2">
            *** OFFICIAL MEDICAL RECORD - ALEM KETEMA ENAT HOSPITAL - DEBRE BERHAN UNIVERSITY DEFENSE DEMONSTRATION ***
          </div>
        </div>

      </div>
    </div>
  );
};

export default HospitalDocumentModal;
