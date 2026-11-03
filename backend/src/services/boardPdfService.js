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
    doc.registerFont('Ethiopic', 'Helvetica');
    doc.registerFont('Ethiopic-Bold', 'Helvetica-Bold');
  }
}

// Draw Hospital Formal Header
async function drawOfficialHeader(doc, titleEn, titleAm, docRef, qrDataUrl, colorTheme = '#1e3a8a') {
  // Top decorative bar
  doc.rect(0, 0, 595.28, 10).fill(colorTheme);

  const startY = 28;

  // Hospital Name Bilingual
  doc.font('Ethiopic-Bold').fontSize(14).fillColor(colorTheme)
    .text('ዓለም ከተማ እናት ሆስፒታል', 45, startY, { align: 'left' });
  
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a')
    .text('ALEM KETEMA ENAT SPECIALIZED HOSPITAL', 45, startY + 18, { align: 'left' });

  doc.font('Ethiopic').fontSize(8.5).fillColor('#475569')
    .text('ሰሜን ሸዋ፣ አማራ ክልል፣ ኢትዮጵያ · North Shewa, Amhara Region, Ethiopia', 45, startY + 34, { align: 'left' });

  doc.font('Helvetica').fontSize(8).fillColor('#64748b')
    .text('Governing Board & Directorate of Clinical & Administrative Services · Tel: +251 58 226 0111', 45, startY + 46, { align: 'left' });

  // QR Code top right
  if (qrDataUrl) {
    doc.image(qrDataUrl, 470, startY - 2, { width: 75, height: 75 });
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(colorTheme)
      .text('VERIFIED BY AGY', 470, startY + 74, { width: 75, align: 'center' });
  }

  // Divider
  doc.moveTo(45, startY + 84).lineTo(550, startY + 84).lineWidth(1.2).strokeColor('#cbd5e1').stroke();

  // Document Title Banner
  const bannerY = startY + 92;
  doc.rect(45, bannerY, 505, 26).fill(colorTheme === '#1e3a8a' ? '#eff6ff' : '#f8fafc');
  doc.rect(45, bannerY, 505, 26).strokeColor(colorTheme).lineWidth(0.8).stroke();

  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(colorTheme)
    .text(titleEn.toUpperCase(), 55, bannerY + 4, { align: 'left' });
  doc.font('Ethiopic-Bold').fontSize(9).fillColor('#334155')
    .text(titleAm, 55, bannerY + 15, { align: 'left' });

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
    .text(`Doc Ref: ${docRef}`, 340, bannerY + 8, { width: 200, align: 'right' });

  return bannerY + 36;
}

// ── 1. Generate Birth Certificate PDF ─────────────────────────────────────────
async function generateBirthCertificatePdf(birthData, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      setupFonts(doc);

      // QR Code
      const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-document?token=${verificationToken || 'DEMO'}`;
      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
      } catch (e) {
        console.warn('QR code generation failed:', e.message);
      }

      const docNumber = birthData.certificate_number || birthData.registration_number || 'BRC-2026-PENDING';
      let currentY = await drawOfficialHeader(
        doc,
        'Official Hospital Medical Birth Certificate',
        'የሆስፒታል የህክምና የልደት ምስክር ወረቀት',
        docNumber,
        qrDataUrl,
        '#047857' // Emerald theme
      );

      // Legal Notice Disclaimer Banner
      doc.rect(45, currentY, 505, 26).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#065f46')
        .text('HOSPITAL MEDICAL RECORD NOTICE:', 52, currentY + 4);
      doc.font('Helvetica').fontSize(7).fillColor('#047857')
        .text('This certificate is an official clinical birth verification record issued by Alem Ketema Enat Hospital confirming institutional delivery under medical supervision. Under Ethiopian law, civil registration must also be completed with the Vital Events Registration Agency (VERA).', 52, currentY + 13, { width: 490 });
      
      currentY += 34;

      // Section 1: Newborn Identity Box
      doc.rect(45, currentY, 505, 18).fill('#047857');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text('1. NEWBORN CHILD DETAILS / የህፃኑ መረጃ', 52, currentY + 5);
      currentY += 18;

      doc.rect(45, currentY, 505, 78).fillAndStroke('#ffffff', '#cbd5e1');

      const col1 = 55;
      const col2 = 225;
      const col3 = 390;

      // Row 1
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('BABY FULL NAME:', col1, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(birthData.baby_name || 'Baby of ' + birthData.mother_name, col1, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('GENDER:', col2, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#047857').text(String(birthData.gender).toUpperCase(), col2, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DATE & TIME OF BIRTH:', col3, currentY + 6);
      const dobFormatted = birthData.date_of_birth ? new Date(birthData.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`${dobFormatted} at ${birthData.time_of_birth || 'N/A'}`, col3, currentY + 16);

      // Row 2
      const row2Y = currentY + 40;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('BIRTH WEIGHT:', col1, row2Y);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(`${birthData.birth_weight} kg (${Math.round(birthData.birth_weight * 1000)} grams)`, col1, row2Y + 10);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DELIVERY TYPE:', col2, row2Y);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(birthData.delivery_type || 'Spontaneous Vaginal', col2, row2Y + 10);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('GESTATIONAL AGE & APGAR:', col3, row2Y);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a')
        .text(`${birthData.gestational_age_weeks || 39} wks · Apgar: ${birthData.apgar_score_1min || 8}/${birthData.apgar_score_5min || 9}`, col3, row2Y + 10);

      currentY += 86;

      // Section 2: Parental Identity Box
      doc.rect(45, currentY, 505, 18).fill('#047857');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text('2. PARENTAL INFORMATION / የወላጆች መረጃ', 52, currentY + 5);
      currentY += 18;

      doc.rect(45, currentY, 505, 68).fillAndStroke('#ffffff', '#cbd5e1');

      // Mother
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text("MOTHER'S FULL NAME:", col1, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(birthData.mother_name || 'N/A', col1, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text("MOTHER'S PATIENT MRN:", col2, currentY + 6);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(`PAT-${birthData.mother_id}`, col2, currentY + 16);

      // Father
      const fRowY = currentY + 36;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text("FATHER'S FULL NAME:", col1, fRowY);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(birthData.father_name || 'Not Recorded', col1, fRowY + 10);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text("FATHER'S NATIONAL ID / PHONE:", col2, fRowY);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(`${birthData.father_national_id || 'N/A'} · ${birthData.father_phone || 'N/A'}`, col2, fRowY + 10);

      currentY += 76;

      // Section 3: Delivery Location & Attending Clinical Team
      doc.rect(45, currentY, 505, 18).fill('#047857');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text('3. PLACE OF BIRTH & ATTENDING CLINICIAN / የልደት ቦታ እና አዋላጅ ሀኪም', 52, currentY + 5);
      currentY += 18;

      doc.rect(45, currentY, 505, 60).fillAndStroke('#ffffff', '#cbd5e1');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('PLACE OF BIRTH:', col1, currentY + 6);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(birthData.place_of_birth || 'Alem Ketema Enat Hospital', col1, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('ATTENDING CLINICIAN:', col1, currentY + 32);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a')
        .text(`${birthData.attending_clinician_name || 'Authorized Hospital Clinician'} (${birthData.clinician_role || 'Obstetrician/Midwife'})`, col1, currentY + 42);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('REGISTRATION NUMBER:', col3, currentY + 32);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#047857').text(birthData.registration_number, col3, currentY + 42);

      currentY += 74;

      // Section 4: Authorized Signatures & Hospital Seal
      doc.rect(45, currentY, 505, 110).fillAndStroke('#f8fafc', '#cbd5e1');

      const sigCol1 = 65;
      const sigCol2 = 330;
      const sigY = currentY + 14;

      // Left Signature: Attending Physician/Midwife
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('ATTENDING PHYSICIAN / MIDWIFE', sigCol1, sigY);
      doc.moveTo(sigCol1, sigY + 50).lineTo(sigCol1 + 180, sigY + 50).lineWidth(0.8).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Signature & Date', sigCol1, sigY + 54);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text(birthData.attending_clinician_name || 'Licensed Clinician', sigCol1, sigY + 66);

      // Right Signature: Hospital Director / Registrar
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('HOSPITAL REGISTRAR / MEDICAL DIRECTOR', sigCol2, sigY);
      doc.moveTo(sigCol2, sigY + 50).lineTo(sigCol2 + 180, sigY + 50).lineWidth(0.8).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Authorized Seal & Signature', sigCol2, sigY + 54);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a').text('Directorate of Medical Services', sigCol2, sigY + 66);

      // Center Official Stamp Box
      doc.circle(297, currentY + 55, 30).lineWidth(1).strokeColor('#047857').stroke();
      doc.circle(297, currentY + 55, 27).lineWidth(0.5).strokeColor('#047857').stroke();
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#047857')
        .text('ALEM KETEMA ENAT', 270, currentY + 45, { width: 55, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#047857')
        .text('★ OFFICIAL SEAL ★', 270, currentY + 53, { width: 55, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(5).fillColor('#047857')
        .text('CERTIFIED MEDICAL RECORD', 268, currentY + 60, { width: 58, align: 'center' });

      // Footer
      const footerY = 780;
      doc.moveTo(45, footerY).lineTo(550, footerY).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
        .text(`Issued by Alem Ketema Enat Hospital · Verification Token: ${verificationToken || 'Valid'} · System Generated on ${new Date().toISOString()}`, 45, footerY + 5, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── 2. Generate Death Certificate PDF ─────────────────────────────────────────
async function generateDeathCertificatePdf(deathData, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      setupFonts(doc);

      // QR Code
      const verifyUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-document?token=${verificationToken || 'DEMO'}`;
      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
      } catch (e) {
        console.warn('QR code generation failed:', e.message);
      }

      const docNumber = deathData.document_number || deathData.record_number || 'DOC-DTH-PENDING';
      let currentY = await drawOfficialHeader(
        doc,
        'Medical Certificate of Cause of Death',
        'የሆስፒታል የህክምና የሞት ማረጋገጫ ሰነድ',
        docNumber,
        qrDataUrl,
        '#334155' // Slate theme
      );

      // Legal Notice Disclaimer Banner
      doc.rect(45, currentY, 505, 26).fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e293b')
        .text('OFFICIAL CLINICAL DOCUMENTATION NOTICE:', 52, currentY + 4);
      doc.font('Helvetica').fontSize(7).fillColor('#475569')
        .text('This is an Official Hospital Medical Certificate of Cause of Death completed by an authorized medical practitioner of Alem Ketema Enat Hospital in accordance with WHO guidelines for clinical mortality statistics. It does not replace the official civil death certificate issued by civil registration authorities.', 52, currentY + 13, { width: 490 });
      
      currentY += 34;

      // Section 1: Deceased Patient Identity Box
      doc.rect(45, currentY, 505, 18).fill('#334155');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text('1. DECEASED PATIENT IDENTITY / የሟቹ ታካሚ መረጃ', 52, currentY + 5);
      currentY += 18;

      doc.rect(45, currentY, 505, 68).fillAndStroke('#ffffff', '#cbd5e1');

      const col1 = 55;
      const col2 = 230;
      const col3 = 400;

      // Row 1
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('PATIENT FULL NAME:', col1, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(deathData.patient_name || 'N/A', col1, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('AGE / GENDER:', col2, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`${deathData.age_years || 'N/A'} yrs · ${deathData.gender || 'N/A'}`, col2, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('MRN / PATIENT ID:', col3, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(deathData.mrn || `ETH-PAT-${deathData.patient_id}`, col3, currentY + 16);

      // Row 2
      const dRow2 = currentY + 36;
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DATE & TIME OF DEATH:', col1, dRow2);
      const dodFormatted = deathData.date_of_death ? new Date(deathData.date_of_death).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(`${dodFormatted} at ${deathData.time_of_death || 'N/A'}`, col1, dRow2 + 10);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DEPARTMENT / LOCATION:', col2, dRow2);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(deathData.department_name || deathData.place_of_death || 'Inpatient Ward', col2, dRow2 + 10);

      currentY += 76;

      // Section 2: WHO Standard Cause of Death
      doc.rect(45, currentY, 505, 18).fill('#334155');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text('2. MEDICAL CAUSE OF DEATH (WHO STANDARD) / የሞቱ የህክምና ምክንያቶች', 52, currentY + 5);
      currentY += 18;

      doc.rect(45, currentY, 505, 114).fillAndStroke('#ffffff', '#cbd5e1');

      // Part I
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
        .text('PART I. Disease or condition directly leading to death:', 55, currentY + 6);
      
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text('(a) Immediate Cause:', 60, currentY + 18);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#b91c1c')
        .text(deathData.immediate_cause || 'Cardiorespiratory Arrest', 180, currentY + 18);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text('(b) Antecedent Cause:', 60, currentY + 34);
      doc.font('Helvetica').fontSize(9).fillColor('#0f172a')
        .text(deathData.antecedent_cause || 'None Stated', 180, currentY + 34);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
        .text('(c) Underlying Cause:', 60, currentY + 50);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a')
        .text(`${deathData.underlying_cause || 'N/A'} ${deathData.icd10_code ? `[ICD-10: ${deathData.icd10_code}]` : ''}`, 180, currentY + 50);

      // Part II
      doc.moveTo(55, currentY + 66).lineTo(540, currentY + 66).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0f172a')
        .text('PART II. Other significant conditions contributing to death:', 55, currentY + 72);
      doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
        .text(deathData.contributing_conditions || 'None reported', 60, currentY + 84, { width: 470 });

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b')
        .text(`Autopsy Performed / Requested: ${deathData.autopsy_requested ? 'YES' : 'NO'}`, 60, currentY + 98);

      currentY += 122;

      // Section 3: Next of Kin Information
      doc.rect(45, currentY, 505, 18).fill('#334155');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
        .text('3. NEXT OF KIN / የቅርብ ቤተሰብ መረጃ', 52, currentY + 5);
      currentY += 18;

      doc.rect(45, currentY, 505, 48).fillAndStroke('#ffffff', '#cbd5e1');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('NEXT OF KIN NAME:', col1, currentY + 6);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text(deathData.next_of_kin_name || 'N/A', col1, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('RELATIONSHIP:', col2, currentY + 6);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(deathData.next_of_kin_relation || 'N/A', col2, currentY + 16);

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('CONTACT PHONE:', col3, currentY + 6);
      doc.font('Helvetica').fontSize(9.5).fillColor('#0f172a').text(deathData.next_of_kin_phone || 'N/A', col3, currentY + 16);

      currentY += 56;

      // Section 4: Attending Physician Certification & Stamp
      doc.rect(45, currentY, 505, 100).fillAndStroke('#f8fafc', '#cbd5e1');

      const sigCol1 = 65;
      const sigCol2 = 330;
      const sigY = currentY + 12;

      // Left Signature: Attending Doctor
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('ATTENDING CERTIFYING PHYSICIAN', sigCol1, sigY);
      doc.moveTo(sigCol1, sigY + 45).lineTo(sigCol1 + 180, sigY + 45).lineWidth(0.8).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Signature & Medical Stamp', sigCol1, sigY + 49);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text(deathData.attending_doctor_name || 'Authorized Physician', sigCol1, sigY + 60);

      // Right Signature: Medical Director
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('MEDICAL DIRECTOR / MORTUARY REGISTRAR', sigCol2, sigY);
      doc.moveTo(sigCol2, sigY + 45).lineTo(sigCol2 + 180, sigY + 45).lineWidth(0.8).strokeColor('#94a3b8').stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text('Hospital Seal & Verification', sigCol2, sigY + 49);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0f172a').text('Directorate of Medical Services', sigCol2, sigY + 60);

      // Center Official Stamp Box
      doc.circle(297, currentY + 50, 28).lineWidth(1).strokeColor('#334155').stroke();
      doc.circle(297, currentY + 50, 25).lineWidth(0.5).strokeColor('#334155').stroke();
      doc.font('Helvetica-Bold').fontSize(5.5).fillColor('#334155')
        .text('ALEM KETEMA ENAT', 270, currentY + 40, { width: 55, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(5).fillColor('#334155')
        .text('★ CLINICAL SEAL ★', 270, currentY + 48, { width: 55, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(5).fillColor('#334155')
        .text('MORTUARY & RECORDS', 268, currentY + 56, { width: 58, align: 'center' });

      // Footer
      const footerY = 780;
      doc.moveTo(45, footerY).lineTo(550, footerY).lineWidth(0.5).strokeColor('#cbd5e1').stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
        .text(`Issued by Alem Ketema Enat Hospital · Verification Token: ${verificationToken || 'Valid'} · Generated on ${new Date().toISOString()}`, 45, footerY + 5, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateBirthCertificatePdf,
  generateDeathCertificatePdf
};
