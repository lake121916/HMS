const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET notifications for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const { unread_only, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT n.*
      FROM notifications n
      WHERE n.user_id = $1
    `;
    const params = [req.user.id];
    let idx = 2;

    if (unread_only === 'true') {
      query += ` AND n.is_read = false`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const countRes = await pool.query(
      `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_read = false) AS unread
       FROM notifications WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows,
        total: parseInt(countRes.rows[0].total),
        unread: parseInt(countRes.rows[0].unread),
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT mark ALL notifications as read for the user (must be before /:id/read)
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({ success: true, message: `${result.rowCount} notification(s) marked as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT mark a specific notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read', data: { notification: result.rows[0] } });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create a notification (admin/system use)
router.post('/', authenticate, authorize('super_admin', 'admin', 'doctor', 'nurse'), async (req, res) => {
  try {
    const { user_id, patient_id, type, title, message } = req.body;

    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ success: false, message: 'user_id, type, title, and message are required' });
    }

    const validTypes = ['appointment', 'prescription', 'lab_result', 'payment', 'admission', 'discharge', 'system', 'alert'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${validTypes.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO notifications (user_id, patient_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, patient_id || null, type, title, message]
    );

    res.status(201).json({ success: true, data: { notification: result.rows[0] } });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE a notification
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Notification Outbox & Telegram Integration (Priority 3) ───────────────────
const notificationService = require('../services/notificationService');

// GET /api/notifications/queue (Audit & Outbox Monitoring)
router.get('/queue', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT nq.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM notification_queue nq
      LEFT JOIN patients p ON p.id = nq.patient_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) {
      query += ` AND nq.status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY nq.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM notification_queue ${status ? 'WHERE status = $1' : ''}`,
      status ? [status] : []
    );

    res.json({
      success: true,
      data: {
        queue: result.rows,
        total: parseInt(countRes.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching notification queue:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notification queue' });
  }
});

// POST /api/notifications/queue/process (Trigger queue worker)
router.post('/queue/process', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await notificationService.processNotificationQueue({ batchSize: 20 });
    res.json({ success: true, message: 'Notification queue processed successfully' });
  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({ success: false, message: 'Failed to process notification queue' });
  }
});

// POST /api/notifications/telegram/start (Initiate Telegram Verification Code)
router.post('/telegram/start', authenticate, async (req, res) => {
  try {
    const { patient_id } = req.body;
    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id is required' });
    }

    // Generate random 6-digit numeric verification code
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

    // Remove any older unverified codes for this patient
    await pool.query('DELETE FROM patient_telegram_verifications WHERE patient_id = $1 AND is_verified = false', [patient_id]);

    const result = await pool.query(`
      INSERT INTO patient_telegram_verifications (patient_id, verification_code, is_verified)
      VALUES ($1, $2, false)
      RETURNING id, patient_id, verification_code, created_at
    `, [patient_id, verificationCode]);

    res.status(201).json({
      success: true,
      message: 'Telegram verification code generated',
      data: {
        patient_id,
        verification_code: verificationCode,
        bot_username: process.env.TELEGRAM_BOT_USERNAME || 'AlemKetemaHospitalBot',
        instructions: `Send this 6-digit code to @${process.env.TELEGRAM_BOT_USERNAME || 'AlemKetemaHospitalBot'} to enable Telegram hospital notifications.`
      }
    });
  } catch (error) {
    console.error('Error starting telegram verification:', error);
    res.status(500).json({ success: false, message: 'Server error starting Telegram verification' });
  }
});

// POST /api/notifications/telegram/verify (Confirm code and link chat ID)
router.post('/telegram/verify', async (req, res) => {
  try {
    const { patient_id, verification_code, telegram_chat_id, telegram_username } = req.body;

    if (!patient_id || !verification_code || !telegram_chat_id) {
      return res.status(400).json({
        success: false,
        message: 'patient_id, verification_code, and telegram_chat_id are required'
      });
    }

    const verifyResult = await notificationService.verifyTelegramChat(
      patient_id,
      verification_code,
      telegram_chat_id,
      telegram_username
    );

    if (!verifyResult.success) {
      return res.status(400).json(verifyResult);
    }

    res.json({
      success: true,
      message: verifyResult.message
    });
  } catch (error) {
    console.error('Error verifying telegram chat:', error);
    res.status(500).json({ success: false, message: 'Server error verifying Telegram chat' });
  }
});

module.exports = router;
