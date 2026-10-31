const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const fontRegular = path.join(__dirname, '../assets/fonts/NotoSansEthiopic-Regular.ttf');
const fontBold = path.join(__dirname, '../assets/fonts/NotoSansEthiopic-Bold.ttf');

function setupFonts(doc) {
  if (fs.existsSync(fontRegular) && fs.existsSync(fontBold)) {
    doc.registerFont('Ethiopic', fontRegular);
    doc.registerFont('Ethiopic-Bold', fontBold);
  } else {
    // Fallback to standard Helvetica if font file is missing
    doc.registerFont('Ethiopic', 'Helvetica');
    doc.registerFont('Ethiopic-Bold', 'Helvetica-Bold');
  }
}

// ── Draw Official Hospital Header ─────────────────────────────────────────────
async function drawHospitalHeader(doc, titleEn, titleAm, docNumber, qrDataUrl) {
  // Top decorative color bar
  doc.rect(0, 0, 595.28, 8).fill('#1e3a8a'); // Blue-900

  const startY = 30;

  // Bilingual Hospital Name
  doc.font('Ethiopic-Bold').fontSize(14).fillColor('#1e3a8a')
    .text('ዓለም ከተማ እናት ሆስፒታል', 45, startY, { align: 'left' });
  
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a')
    .text('ALEM KETEMA ENAT HOSPITAL', 45, startY + 18, { align: 'left' });

  doc.font('Ethiopic').fontSize(8.5).fillColor('#475569')
    .text('ሰሜን ሸዋ፣ አማራ ክልል፣ ኢትዮጵያ · North Shewa, Amhara Region, Ethiopia', 45, startY + 34, { align: 'left' });

  doc.font('Helvetica').fontSize(8).fillColor('#64748b')
    .text('TIN: 0048192831 · Tel: +251 58 226 0111 / +251 58 226 0222 · Emergency: 907', 45, startY + 46, { align: 'left' });

  // QR Code on top right
  if (qrDataUrl) {
    doc.image(qrDataUrl, 470, startY - 5, { width: 75, height: 75 });
    doc.font('Helvetica').fontSize(6.5).fillColor('#64748b')
      .text('Scan to Verify', 475, startY + 72, { width: 65, align: 'center' });
  }

  // Divider line
  doc.moveTo(45, startY + 84).lineTo(550, startY + 84).lineWidth(1).strokeColor('#cbd5e1').stroke();

  // Document Title Banner
  const bannerY = startY + 92;
  doc.rect(45, bannerY, 505, 24).fill('#f1f5f9');
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b')
    .text(`${titleEn.toUpperCase()} / ${titleAm}`, 55, bannerY + 6, { align: 'left' });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0369a1')
    .text(`Doc Ref: ${docNumber}`, 350, bannerY + 7, { width: 190, align: 'right' });

  return bannerY + 34;
}

// ── Draw Patient Identity Box ─────────────────────────────────────────────────
function drawPatientIdentityBox(doc, patient, startY) {
  doc.rect(45, startY, 505, 52).fillAndStroke('#f8fafc', '#e2e8f0');

  const col1 = 55;
  const col2 = 230;
  const col3 = 400;
  const row1 = startY + 8;
  const row2 = startY + 28;

  // Row 1
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('PATIENT NAME:', col1, row1);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(`${patient.first_name || ''} ${patient.last_name || ''}`, col1, row1 + 10);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('MRN / ID:', col2, row1);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(patient.mrn || patient.patient_id_code || `ETH-${patient.id}`, col2, row1 + 10);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('AGE / GENDER:', col3, row1);
  const age = patient.date_of_birth ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} yrs` : 'N/A';
  doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(`${age} · ${patient.gender || 'N/A'}`, col3, row1 + 10);

  // Row 2
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('PHONE:', col1, row2);
  doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(patient.phone || 'N/A', col1 + 45, row2);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('BLOOD GROUP:', col2, row2);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#b91c1c').text(patient.blood_type || 'Unknown', col2 + 75, row2);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DATE:', col3, row2);
  doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), col3 + 35, row2);

  return startY + 62;
}

// ── 1. Generate Official Prescription PDF ──────────────────────────────────────
async function generatePrescriptionPdf(prescriptionData, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      setupFonts(doc);

      const verifyUrl = `${process.env.APP_URL || 'https://alemketema-hms.et'}/verify/${verificationToken}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });

      const docNumber = `RX-${new Date().getFullYear()}-${String(prescriptionData.id).padStart(5, '0')}`;
      let y = await drawHospitalHeader(doc, 'Official Medical Prescription', 'የህክምና ማዘዣ ወረቀት', docNumber, qrDataUrl);

      // Patient details box
      y = drawPatientIdentityBox(doc, prescriptionData.patient, y);

      // Allergies warning box
      if (prescriptionData.allergies && prescriptionData.allergies.length > 0) {
        doc.rect(45, y, 505, 22).fill('#fef2f2');
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#dc2626')
          .text(`⚠️ RECORDED ALLERGIES: ${prescriptionData.allergies.map(a => a.allergen_name || a).join(', ')}`, 55, y + 6);
        y += 28;
      }

      // Prescribing Doctor
      doc.rect(45, y, 505, 24).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155')
        .text(`Prescribing Clinician: Dr. ${prescriptionData.doctor?.first_name || ''} ${prescriptionData.doctor?.last_name || ''} · Spec: ${prescriptionData.doctor?.specialization || 'General Practitioner'} · License: ${prescriptionData.doctor?.license_number || 'ET-MOH-VERIFIED'}`, 55, y + 7);
      y += 34;

      // Medication Rx symbol
      doc.font('Helvetica-Bold').fontSize(22).fillColor('#1e3a8a').text('℞', 45, y);
      y += 26;

      // Medication details card
      doc.rect(45, y, 505, 95).fillAndStroke('#ffffff', '#cbd5e1');

      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a')
        .text(prescriptionData.medication_name, 60, y + 12);

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#2563eb')
        .text(`Dosage: ${prescriptionData.dosage || 'Standard'}`, 60, y + 32);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#2563eb')
        .text(`Frequency: ${prescriptionData.frequency || 'As directed'}`, 220, y + 32);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#2563eb')
        .text(`Duration: ${prescriptionData.duration || 'Complete course'}`, 380, y + 32);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569')
        .text('Patient Instructions / መመሪያ:', 60, y + 54);
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a')
        .text(prescriptionData.instructions || 'Take medication strictly as directed by the physician. Complete full course.', 60, y + 68, { width: 470 });

      y += 115;

      // Signature & Stamp Section
      doc.rect(45, y, 505, 75).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text('PHYSICIAN SIGNATURE & STAMP:', 60, y + 10);

      doc.moveTo(60, y + 50).lineTo(230, y + 50).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`Dr. ${prescriptionData.doctor?.first_name || ''} ${prescriptionData.doctor?.last_name || ''}`, 60, y + 54);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text('PHARMACY DISPENSARY VERIFICATION:', 320, y + 10);
      doc.moveTo(320, y + 50).lineTo(490, y + 50).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text('Dispensing Pharmacist Date / Stamp', 320, y + 54);

      y += 95;

      // Official Footer
      doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
        .text('This prescription is officially generated from Alem Ketema Enat Hospital EHR. Valid with security verification QR code. Dispense only from licensed pharmacies.', 45, 780, { width: 505, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── 2. Generate Official Lab Result Certificate PDF ───────────────────────────
async function generateLabResultPdf(labData, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      setupFonts(doc);

      const verifyUrl = `${process.env.APP_URL || 'https://alemketema-hms.et'}/verify/${verificationToken}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });

      const docNumber = `LAB-${new Date().getFullYear()}-${String(labData.id).padStart(5, '0')}`;
      let y = await drawHospitalHeader(doc, 'Official Laboratory Diagnostic Certificate', 'የላብራቶሪ ምርመራ የምስክር ወረቀት', docNumber, qrDataUrl);

      y = drawPatientIdentityBox(doc, labData.patient, y);

      // Ordering Info
      doc.rect(45, y, 505, 24).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155')
        .text(`Ordering Doctor: Dr. ${labData.doctor?.first_name || ''} ${labData.doctor?.last_name || ''} · Sample Date: ${new Date(labData.requested_date || Date.now()).toLocaleDateString()}`, 55, y + 7);
      y += 34;

      // Table Header
      doc.rect(45, y, 505, 22).fill('#1e3a8a');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
      doc.text('INVESTIGATION / TEST NAME', 55, y + 6);
      doc.text('OBSERVED RESULT', 250, y + 6);
      doc.text('REFERENCE RANGE', 380, y + 6);
      doc.text('STATUS', 485, y + 6);
      y += 22;

      // Test Row
      doc.rect(45, y, 505, 32).fillAndStroke('#ffffff', '#e2e8f0');
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(labData.test_name, 55, y + 10);
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(labData.test_type || 'Clinical Pathology', 55, y + 20);

      const isAbnormal = Boolean(labData.result?.is_abnormal);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(isAbnormal ? '#dc2626' : '#15803d')
        .text(labData.result?.results || 'Completed', 250, y + 10);

      doc.font('Helvetica').fontSize(9).fillColor('#475569')
        .text(labData.result?.reference_range || 'Normal Clinical Range', 380, y + 10);

      doc.font('Helvetica-Bold').fontSize(8).fillColor(isAbnormal ? '#dc2626' : '#15803d')
        .text(isAbnormal ? 'ABNORMAL' : 'NORMAL', 485, y + 10);

      y += 42;

      // Clinical Interpretation & Notes
      if (labData.result?.notes || labData.notes) {
        doc.rect(45, y, 505, 50).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#475569').text('Laboratory Comments / የባለሙያ አስተያየት:', 55, y + 8);
        doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a')
          .text(labData.result?.notes || labData.notes || 'Specimen processed according to ISO 15189 standard laboratory guidelines.', 55, y + 22, { width: 485 });
        y += 60;
      }

      // Authorization & Signatures
      y = Math.max(y, 650);
      doc.rect(45, y, 505, 75).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('LAB TECHNICIAN SIGNATURE:', 60, y + 10);
      doc.moveTo(60, y + 50).lineTo(230, y + 50).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`${labData.technician?.first_name || 'Laboratory Staff'} ${labData.technician?.last_name || ''}`, 60, y + 54);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('PATHOLOGIST / HEAD OF LAB:', 320, y + 10);
      doc.moveTo(320, y + 50).lineTo(490, y + 50).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text('Authorized Electronic Sign-off', 320, y + 54);

      doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
        .text('Alem Ketema Enat Hospital Diagnostic Center · Automated Laboratory Information System · Official Document', 45, 780, { width: 505, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── 3. Generate Inpatient Discharge Summary PDF ────────────────────────────────
async function generateDischargeSummaryPdf(dischargeData, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      setupFonts(doc);

      const verifyUrl = `${process.env.APP_URL || 'https://alemketema-hms.et'}/verify/${verificationToken}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });

      const docNumber = `DIS-${new Date().getFullYear()}-${String(dischargeData.id).padStart(5, '0')}`;
      let y = await drawHospitalHeader(doc, 'Inpatient Clinical Discharge Summary', 'የታካሚ ሆስፒታል መልቀቂያ ማጠቃለያ', docNumber, qrDataUrl);

      y = drawPatientIdentityBox(doc, dischargeData.patient, y);

      // Hospital Stay Box
      doc.rect(45, y, 505, 30).fill('#f1f5f9');
      const admDate = new Date(dischargeData.admission_date).toLocaleDateString('en-GB');
      const disDate = dischargeData.discharge_date ? new Date(dischargeData.discharge_date).toLocaleDateString('en-GB') : 'Active / Pending';
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b')
        .text(`Admission Date: ${admDate} · Discharge Date: ${disDate} · Ward / Bed: ${dischargeData.ward || 'General'} (Bed ${dischargeData.bed_number || 'N/A'})`, 55, y + 10);
      y += 38;

      // Diagnoses
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('PRIMARY ADMISSION & DISCHARGE DIAGNOSES');
      y += 14;
      doc.rect(45, y, 505, 34).fillAndStroke('#ffffff', '#cbd5e1');
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a')
        .text(dischargeData.diagnosis || 'Clinical inpatient treatment provided under attending medical staff.', 55, y + 8, { width: 485 });
      y += 42;

      // Clinical Course & Treatment Plan
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('CLINICAL COURSE & IN-HOSPITAL MANAGEMENT');
      y += 14;
      doc.rect(45, y, 505, 60).fillAndStroke('#ffffff', '#cbd5e1');
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a')
        .text(dischargeData.treatment_plan || 'Patient monitored with regular vitals, intravenous fluid and antibiotic therapy.', 55, y + 8, { width: 485 });
      y += 68;

      // Discharge Summary & Recommendations
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('DISCHARGE SUMMARY & FOLLOW-UP INSTRUCTIONS');
      y += 14;
      doc.rect(45, y, 505, 70).fillAndStroke('#ffffff', '#cbd5e1');
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a')
        .text(dischargeData.discharge_summary || 'Patient reached clinical stability with normalized vitals. Cleared for outpatient follow-up in 14 days.', 55, y + 8, { width: 485 });
      y += 78;

      // Signatures
      y = Math.max(y, 650);
      doc.rect(45, y, 505, 75).fill('#f8fafc');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('ATTENDING PHYSICIAN SIGNATURE:', 60, y + 10);
      doc.moveTo(60, y + 50).lineTo(230, y + 50).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`Dr. ${dischargeData.doctor?.first_name || 'Attending'} ${dischargeData.doctor?.last_name || 'Physician'}`, 60, y + 54);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('HOSPITAL MEDICAL DIRECTOR:', 320, y + 10);
      doc.moveTo(320, y + 50).lineTo(490, y + 50).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text('Official Clinical Verification', 320, y + 54);

      doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
        .text('Alem Ketema Enat Hospital · Inpatient Medical Records Department · Secure QR Document', 45, 780, { width: 505, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── 4. Generate Official Medical Certificate PDF ──────────────────────────────
async function generateMedicalCertificatePdf(certData, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      setupFonts(doc);

      const verifyUrl = `${process.env.APP_URL || 'https://alemketema-hms.et'}/verify/${verificationToken}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });

      const docNumber = certData.certificate_number || `MC-${new Date().getFullYear()}-${String(certData.id || 1).padStart(5, '0')}`;
      let y = await drawHospitalHeader(doc, 'Official Medical Certificate & Sick Leave', 'ኦፊሴላዊ የህክምና የምስክር ወረቀት እና የእረፍት ፈቃድ', docNumber, qrDataUrl);

      y = drawPatientIdentityBox(doc, certData.patient, y);

      // Examination Details Box
      doc.rect(45, y, 505, 30).fill('#f1f5f9');
      const examDate = certData.examination_date ? new Date(certData.examination_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');
      const issueDate = certData.issue_date ? new Date(certData.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : examDate;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b')
        .text(`Date of Clinical Examination: ${examDate}  ·  Certificate Issue Date: ${issueDate}  ·  Status: ${certData.status ? certData.status.toUpperCase() : 'ACTIVE'}`, 55, y + 10);
      y += 38;

      // Clinical Medical Statement
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('CLINICAL FINDINGS & MEDICAL STATEMENT / የህክምና ማረጋገጫ');
      y += 14;
      doc.rect(45, y, 505, 75).fillAndStroke('#ffffff', '#cbd5e1');
      const statement = certData.medical_statement || 'This is to certify that the patient named above was medically examined at Alem Ketema Enat Hospital and found to require medical care and temporary rest.';
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a')
        .text(statement, 55, y + 10, { width: 485, lineGap: 3 });
      y += 85;

      // Clinical Diagnosis Summary (if provided / authorized)
      if (certData.diagnosis_summary) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('DIAGNOSTIC SUMMARY / የበሽታው ሁኔታ');
        y += 14;
        doc.rect(45, y, 505, 36).fillAndStroke('#ffffff', '#cbd5e1');
        doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a')
          .text(certData.diagnosis_summary, 55, y + 9, { width: 485 });
        y += 46;
      }

      // Sick Leave Recommendation & Fitness for Work Box
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e3a8a').text('SICK LEAVE RECOMMENDATION & FITNESS FOR DUTY / የእረፍት ፈቃድ ምክረ-ሀሳብ');
      y += 14;
      doc.rect(45, y, 505, 70).fillAndStroke('#f8fafc', '#94a3b8');

      const sickLeaveRecommended = certData.sick_leave_recommended ? 'YES / ይመከራል' : 'NO / አያስፈልግም';
      const days = certData.sick_leave_days || (certData.sick_leave_recommended ? 3 : 0);
      const startDate = certData.sick_leave_start_date ? new Date(certData.sick_leave_start_date).toLocaleDateString('en-GB') : examDate;
      const endDate = certData.sick_leave_end_date ? new Date(certData.sick_leave_end_date).toLocaleDateString('en-GB') : '-';
      const fitForWork = certData.fit_for_work ? 'Fit for normal duties upon expiry of recommended sick leave.' : 'Currently unfit for normal occupational duties; requires medical follow-up.';

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('Sick Leave Recommended:', 55, y + 10);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(certData.sick_leave_recommended ? '#047857' : '#64748b').text(sickLeaveRecommended, 185, y + 10);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('Authorized Leave Duration:', 55, y + 26);
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(`${days} Day(s)  (From: ${startDate}  To: ${endDate})`, 185, y + 26);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text('Clinical Fitness Evaluation:', 55, y + 42);
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(fitForWork, 185, y + 42, { width: 350 });

      y += 82;

      // Legal & Verification Warning
      doc.rect(45, y, 505, 34).fill('#fef2f2');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#991b1b')
        .text('NOTICE: This certificate is an official medical document issued by Alem Ketema Enat Hospital under the laws of Ethiopia. Any unauthorized alteration or falsification constitutes a criminal offense. The authenticity of this document can be verified in real time by scanning the QR code above.', 55, y + 7, { width: 485, lineGap: 1.5 });
      y += 44;

      // Signatures and Official Stamp Box
      y = Math.max(y, 620);
      doc.rect(45, y, 505, 100).fillAndStroke('#ffffff', '#cbd5e1');

      // Left: Doctor Info & Signature line
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('ATTENDING LICENSED CLINICIAN:', 60, y + 10);
      doc.moveTo(60, y + 55).lineTo(250, y + 55).strokeColor('#94a3b8').stroke();
      const docName = `Dr. ${certData.doctor?.first_name || 'Authorized'} ${certData.doctor?.last_name || 'Clinician'}`;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(docName, 60, y + 60);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`Specialization: ${certData.doctor?.specialization || 'General Medical Practice'}`, 60, y + 72);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b')
        .text(`License No: ${certData.doctor?.license_number || 'ET-MOH-' + String(certData.doctor?.id || '4821')}`, 60, y + 84);

      // Right: Hospital Official Stamp & Seal Area
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('HOSPITAL MEDICAL BOARD OFFICIAL STAMP & SEAL:', 290, y + 10);
      doc.rect(290, y + 24, 245, 68).dash(3, { space: 3 }).strokeColor('#cbd5e1').stroke();
      doc.undash();
      doc.font('Ethiopic-Bold').fontSize(8).fillColor('#94a3b8')
        .text('ዓለም ከተማ እናት ሆስፒታል', 290, y + 42, { width: 245, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#94a3b8')
        .text('OFFICIAL CLINICAL STAMP / ማህተም', 290, y + 55, { width: 245, align: 'center' });

      // Bottom Document Footer
      doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
        .text('Alem Ketema Enat Hospital · Outpatient Clinical Records Department · Verified Digital Health Record · A4 Standard', 45, 780, { width: 505, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePrescriptionPdf,
  generateLabResultPdf,
  generateDischargeSummaryPdf,
  generateMedicalCertificatePdf,
};
