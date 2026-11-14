const LabTestModel = require('../models/LabTestModel');
const pool = require('../config/database');
const billingService = require('../services/billingService');
const socketService = require('../services/socketService');

exports.getLabTests = async (req, res) => {
  try {
    const { patient_id, status } = req.query;
    const labTests = await LabTestModel.findAll({
      patientId: patient_id,
      status,
      role: req.user.role,
      userId: req.user.id
    });
    res.json({ success: true, data: { labTests } });
  } catch (err) {
    console.error('Error fetching lab tests:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.orderLabTest = async (req, res) => {
  try {
    const { patient_id, test_name, test_type, priority, notes, encounter_id } = req.body;
    let doctorId = req.body.doctor_id;

    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) doctorId = doc.rows[0].id;
    }

    const labTest = await LabTestModel.create({
      patientId: patient_id,
      doctorId,
      testName: test_name,
      testType: test_type,
      priority,
      notes,
      encounterId: encounter_id
    });

    // Auto-billing
    const { alreadyExisted, invoice } = await billingService.billLabOrder({
      labOrderId: labTest.id,
      patientId: patient_id,
      encounterId: encounter_id || null,
      doctorId,
      testName: test_name,
      createdBy: req.user.id
    }).catch(e => {
      console.error('Lab billing error:', e.message);
      return { alreadyExisted: false, invoice: null };
    });

    // Update encounter status if applicable
    if (encounter_id) {
      await pool.query(
        `UPDATE patient_encounters SET status = 'services_ordered', updated_at = NOW()
         WHERE id = $1 AND status = 'in_consultation'`,
        [encounter_id]
      );
    }

    // Realtime notification to Laboratory
    try {
      socketService.emitToRole('lab_technician', 'new-lab-order', {
        labTest,
        patientId: patient_id,
        testName: test_name,
        priority: priority || 'routine',
        timestamp: new Date().toISOString()
      });
    } catch (sockErr) {
      console.warn('Laboratory socket notification warning:', sockErr.message);
    }

    res.status(201).json({
      success: true,
      data: { labTest, invoiceBilled: !alreadyExisted, invoice }
    });
  } catch (err) {
    console.error('Error ordering lab test:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateLabTestStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid lab status' });
    }

    const existing = await LabTestModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    const workflowStatus = status === 'pending' ? 'ordered'
      : status === 'in_progress' ? 'in_progress'
      : status === 'completed' ? 'ready'
      : status === 'cancelled' ? 'cancelled' : null;

    const updated = await LabTestModel.updateStatus(req.params.id, {
      status,
      workflowStatus,
      notes
    });

    await pool.query(
      `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
       VALUES ('lab_test', $1, $2, $3, $4, $5)`,
      [req.params.id, existing.status, status || existing.status, req.user.id, notes || null]
    );

    if (status && status !== existing.status) {
      await pool.query(
        `INSERT INTO notifications (user_id, patient_id, type, title, message, channel)
         SELECT p.user_id, p.id, 'lab_result', $1, $2, 'in_app'
         FROM patients p WHERE p.id = $3 AND p.user_id IS NOT NULL`,
        ['Lab test updated', `Your lab test status is now ${workflowStatus || status}.`, existing.patient_id]
      );
    }

    res.json({ success: true, data: { labTest: updated } });
  } catch (err) {
    console.error('Error updating lab test status:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.uploadLabResult = async (req, res) => {
  try {
    const { results, reference_range, is_abnormal, notes } = req.body;
    const result = await LabTestModel.addResult({
      labTestId: req.params.id,
      technicianId: req.user.id,
      results,
      referenceRange: reference_range,
      isAbnormal: is_abnormal,
      notes
    });

    // Notify ordering doctor & clinical team
    try {
      const testInfo = await pool.query(`
        SELECT lt.test_name, lt.doctor_id, lt.patient_id,
               p.first_name || ' ' || p.last_name AS patient_name,
               d.user_id AS doctor_user_id
        FROM lab_tests lt
        JOIN patients p ON p.id = lt.patient_id
        LEFT JOIN doctors d ON d.id = lt.doctor_id
        WHERE lt.id = $1
      `, [req.params.id]);

      if (testInfo.rows.length) {
        const info = testInfo.rows[0];
        const isAbn = Boolean(is_abnormal);
        const title = isAbn ? 'ABNORMAL Lab Result Available' : 'Lab Result Available';
        const msg = isAbn
          ? `CRITICAL/ABNORMAL result recorded for ${info.test_name} (Patient: ${info.patient_name}). Immediate clinical review advised.`
          : `Lab result for ${info.test_name} (Patient: ${info.patient_name}) is now ready for review.`;

        if (info.doctor_user_id) {
          await pool.query(
            `INSERT INTO notifications (user_id, patient_id, type, title, message, channel)
             VALUES ($1, $2, 'lab_result', $3, $4, 'in_app')`,
            [info.doctor_user_id, info.patient_id, title, msg]
          );

          socketService.emitToUser(info.doctor_user_id, 'lab-result-ready', {
            labTestId: req.params.id,
            testName: info.test_name,
            patientName: info.patient_name,
            isAbnormal: isAbn,
            results,
            message: msg
          });
        }

        if (isAbn) {
          socketService.emitToRole('doctor', 'critical-alert', {
            type: 'abnormal_lab_result',
            patientId: info.patient_id,
            patientName: info.patient_name,
            testName: info.test_name,
            severity: 'critical',
            message: msg,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (notifErr) {
      console.warn('Doctor lab result notification warning:', notifErr.message);
    }

    res.status(201).json({ success: true, data: { result } });
  } catch (err) {
    console.error('Error uploading lab result:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.analyzeRadiologyScan = async (req, res) => {
  try {
    const testId = req.params.id;
    const testCheck = await LabTestModel.findById(testId);
    if (!testCheck) {
      return res.status(404).json({ success: false, message: 'Lab test not found' });
    }

    const imageType = req.body.image_type || 'xray';
    const analysisType = req.body.analysis_type || 'pneumonia_detection';

    let prediction = "No Abnormality Detected";
    let confidence = 0.94;
    let findings = ["Clear structures observed", "No consolidation patterns", "Symmetrical alignments"];
    let recommendations = ["Regular follow-up checks", "Correlate with vitals"];
    let heatmapData = null;
    let serviceUsed = "simulated_mode_fallback";

    try {
      const form = new FormData();
      if (req.file) {
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        form.append('file', blob, req.file.originalname);
      } else {
        const blob = new Blob(['dummy'], { type: 'text/plain' });
        form.append('file', blob, 'dummy.txt');
      }
      form.append('image_type', imageType);
      form.append('analysis_type', analysisType);

      const fastApiUrl = process.env.IMAGE_ANALYSIS_URL || 'http://localhost:8001/analyze';
      const apiResponse = await fetch(fastApiUrl, {
        method: 'POST',
        body: form
      });

      if (apiResponse.ok) {
        const result = await apiResponse.json();
        prediction = result.prediction;
        confidence = result.confidence;
        findings = result.findings;
        recommendations = result.recommendations;
        heatmapData = result.heatmap_data;
        serviceUsed = "cnn_microservice_active";
      } else {
        return sendError(res, 'Medical Image Analysis Microservice returned an error. Manual radiology evaluation required.', 503);
      }
    } catch (err) {
      console.warn('Medical Image Analysis Service offline:', err.message);
      return sendError(res, 'Medical Image Analysis Service is currently offline. Please ensure the microservice is running or conduct manual evaluation.', 503);
    }

    const resultText = `AI Analysis Result: ${prediction}\nConfidence: ${(confidence * 100).toFixed(1)}%\nFindings:\n- ${findings.join('\n- ')}\nRecommendations:\n- ${recommendations.join('\n- ')}`;

    await pool.query('DELETE FROM lab_results WHERE lab_test_id = $1', [testId]);
    await pool.query(
      `INSERT INTO lab_results (lab_test_id, technician_id, results, reference_range, is_abnormal, notes, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testId, req.user.id, resultText, 'Normal appearance', confidence > 0.5, 'AI-generated analysis reports', heatmapData]
    );

    await pool.query("UPDATE lab_tests SET status = 'completed', updated_at = NOW() WHERE id = $1", [testId]);

    res.json({
      success: true,
      data: {
        prediction,
        confidence,
        findings,
        recommendations,
        heatmap_data: heatmapData,
        serviceUsed
      }
    });

  } catch (err) {
    console.error('Error analyzing radiology scan:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteLabTest = async (req, res) => {
  try {
    await pool.query('DELETE FROM lab_tests WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting lab test:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
