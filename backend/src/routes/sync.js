/**
 * Offline Synchronization & Idempotency Routes
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * POST /api/sync/pending-operations
 * Processes buffered offline clinical & administrative operations with idempotency protection
 */
router.post('/pending-operations', authenticate, async (req, res) => {
  const { operations } = req.body;

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'operations array is required and must not be empty'
    });
  }

  const client = await pool.connect();
  const results = [];

  try {
    for (const op of operations) {
      const { operation_id, operation_type, payload, client_timestamp } = op;

      if (!operation_id || !operation_type) {
        results.push({
          operation_id: operation_id || 'unknown',
          status: 'rejected',
          reason: 'Missing operation_id or operation_type'
        });
        continue;
      }

      // 1. Idempotency Check: Was this operation already processed?
      const existingOp = await client.query(
        'SELECT * FROM offline_sync_logs WHERE operation_id = $1',
        [operation_id]
      );

      if (existingOp.rows.length > 0) {
        const row = existingOp.rows[0];
        results.push({
          operation_id,
          status: row.status,
          server_entity_id: row.server_entity_id,
          is_duplicate: true,
          message: 'Operation was already applied in previous sync'
        });
        continue;
      }

      await client.query('BEGIN');

      try {
        let serverEntityId = null;

        // 2. Process by Operation Type
        if (operation_type === 'patient_registration') {
          const {
            first_name, last_name, date_of_birth, gender,
            phone, email, blood_type, address, allergies
          } = payload;

          if (!first_name || !last_name) {
            throw new Error('first_name and last_name are required for offline patient registration');
          }

          const patRes = await client.query(
            `INSERT INTO patients (
              first_name, last_name, date_of_birth, gender,
              phone, email, blood_type, address, allergies, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamp, NOW()))
            RETURNING id`,
            [
              first_name,
              last_name,
              date_of_birth || null,
              gender || 'male',
              phone || null,
              email || null,
              blood_type || null,
              address || null,
              allergies || null,
              client_timestamp || null
            ]
          );
          serverEntityId = patRes.rows[0].id;

        } else if (operation_type === 'triage_assessment') {
          const {
            encounter_id, priority, temperature, blood_pressure_systolic,
            blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation
          } = payload;

          if (!encounter_id) {
            throw new Error('encounter_id is required for offline triage assessment');
          }

          const triageRes = await client.query(
            `INSERT INTO triage_assessments (
              encounter_id, triage_nurse_id, priority, temperature,
              blood_pressure_systolic, blood_pressure_diastolic, heart_rate,
              respiratory_rate, oxygen_saturation, assessed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamp, NOW()))
            RETURNING id`,
            [
              encounter_id,
              req.user.id,
              priority || 'yellow',
              temperature || null,
              blood_pressure_systolic || null,
              blood_pressure_diastolic || null,
              heart_rate || null,
              respiratory_rate || null,
              oxygen_saturation || null,
              client_timestamp || null
            ]
          );
          serverEntityId = triageRes.rows[0].id;

          // If Code Red / Emergency, flag alert delayed by offline state
          if (String(priority).toLowerCase() === 'red') {
            await client.query(
              `INSERT INTO emergency_queue (
                encounter_id, patient_id, priority, reason, status, created_at
              )
              SELECT $1, patient_id, 'red', 'Synced from offline triage draft (Immediate clinical review required)', 'active', NOW()
              FROM patient_encounters WHERE id = $1
              ON CONFLICT DO NOTHING`,
              [encounter_id]
            );
          }

        } else {
          // Generic draft log
          serverEntityId = null;
        }

        // 3. Record in offline_sync_logs
        await client.query(
          `INSERT INTO offline_sync_logs (
            operation_id, user_id, operation_type, payload,
            status, server_entity_id, created_at
          )
          VALUES ($1, $2, $3, $4, 'applied', $5, NOW())`,
          [
            operation_id,
            req.user.id,
            operation_type,
            JSON.stringify(payload),
            serverEntityId
          ]
        );

        await client.query('COMMIT');

        results.push({
          operation_id,
          status: 'applied',
          server_entity_id: serverEntityId,
          message: 'Successfully synchronized and applied to clinical database'
        });

      } catch (innerError) {
        await client.query('ROLLBACK');

        // Record conflict/rejection in sync logs for traceability
        await client.query(
          `INSERT INTO offline_sync_logs (
            operation_id, user_id, operation_type, payload,
            status, conflict_reason, created_at
          )
          VALUES ($1, $2, $3, $4, 'conflict', $5, NOW())
          ON CONFLICT (operation_id) DO NOTHING`,
          [
            operation_id,
            req.user.id,
            operation_type,
            JSON.stringify(payload),
            innerError.message
          ]
        );

        results.push({
          operation_id,
          status: 'conflict',
          error: innerError.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Offline synchronization completed',
      data: {
        totalReceived: operations.length,
        applied: results.filter(r => r.status === 'applied').length,
        conflicts: results.filter(r => r.status === 'conflict').length,
        results
      }
    });

  } catch (error) {
    console.error('Fatal sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// GET /api/sync/logs — Review offline sync history
router.get('/logs', authenticate, authorize('admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  try {
    const logsRes = await pool.query(`
      SELECT osl.*, u.email AS user_email
      FROM offline_sync_logs osl
      LEFT JOIN users u ON u.id = osl.user_id
      ORDER BY osl.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, data: { logs: logsRes.rows } });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
