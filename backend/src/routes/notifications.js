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

module.exports = router;
