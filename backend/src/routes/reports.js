const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET revenue report
router.get('/revenue', authenticate, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let groupBy, dateFilter;
    if (period === 'week') {
      groupBy = `TO_CHAR(payment_date, 'Dy')`;
      dateFilter = `payment_date >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'year') {
      groupBy = `TO_CHAR(payment_date, 'Mon')`;
      dateFilter = `payment_date >= NOW() - INTERVAL '1 year'`;
    } else {
      groupBy = `TO_CHAR(payment_date, 'DD Mon')`;
      dateFilter = `payment_date >= NOW() - INTERVAL '30 days'`;
    }

    const result = await pool.query(
      `SELECT ${groupBy} AS period, COALESCE(SUM(amount), 0) AS revenue
       FROM payments WHERE ${dateFilter}
       GROUP BY ${groupBy} ORDER BY MIN(payment_date)`
    );

    const totals = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN amount END), 0) AS today,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', NOW()) THEN amount END), 0) AS this_month,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('year', payment_date) = DATE_TRUNC('year', NOW()) THEN amount END), 0) AS this_year
       FROM payments`
    );

    res.json({ success: true, data: { chart: result.rows, totals: totals.rows[0] } });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET patients report
router.get('/patients', authenticate, async (req, res) => {
  try {
    const [total, gender, monthly] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM patients'),
      pool.query(`SELECT gender, COUNT(*) AS count FROM patients GROUP BY gender`),
      pool.query(
        `SELECT TO_CHAR(created_at, 'Mon') AS month, COUNT(*) AS count
         FROM patients WHERE created_at >= NOW() - INTERVAL '6 months'
         GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at)`
      )
    ]);

    res.json({
      success: true,
      data: {
        totalPatients: parseInt(total.rows[0].total),
        byGender: gender.rows,
        monthly: monthly.rows
      }
    });
  } catch (error) {
    console.error('Error fetching patient report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET dashboard summary stats
router.get('/dashboard-stats', authenticate, async (req, res) => {
  try {
    const [patients, doctors, todayAppts, beds, invoices, admissions] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM patients'),
      pool.query('SELECT COUNT(*) AS count FROM doctors WHERE is_available = true'),
      pool.query(`SELECT COUNT(*) AS count FROM appointments WHERE DATE(appointment_date) = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) AS count FROM beds WHERE status = 'available'`),
      pool.query(`SELECT COUNT(*) AS count FROM invoices WHERE status IN ('pending','overdue')`),
      pool.query(`SELECT COUNT(*) AS count FROM admissions WHERE status = 'admitted'`)
    ]);

    const revenueRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS today_revenue FROM payments WHERE DATE(payment_date) = CURRENT_DATE`
    );

    res.json({
      success: true,
      data: {
        totalPatients: parseInt(patients.rows[0].count),
        activeDoctors: parseInt(doctors.rows[0].count),
        todayAppointments: parseInt(todayAppts.rows[0].count),
        availableBeds: parseInt(beds.rows[0].count),
        pendingInvoices: parseInt(invoices.rows[0].count),
        currentAdmissions: parseInt(admissions.rows[0].count),
        todayRevenue: parseFloat(revenueRes.rows[0].today_revenue)
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET appointment stats by status
router.get('/appointments', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) AS count FROM appointments GROUP BY status`
    );
    const monthly = await pool.query(
      `SELECT TO_CHAR(appointment_date, 'Mon') AS month, COUNT(*) AS count
       FROM appointments WHERE appointment_date >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(appointment_date, 'Mon'), DATE_TRUNC('month', appointment_date)
       ORDER BY DATE_TRUNC('month', appointment_date)`
    );
    res.json({ success: true, data: { byStatus: result.rows, monthly: monthly.rows } });
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET diseases/diagnoses report
router.get('/diseases', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT disease_name, COUNT(*) AS count FROM diagnoses GROUP BY disease_name ORDER BY count DESC LIMIT 10`
    );
    res.json({ success: true, data: { topDiseases: result.rows } });
  } catch (error) {
    console.error('Error fetching disease report:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET department performance
router.get('/department-performance', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dep.name,
        COUNT(DISTINCT doc.id) AS doctor_count,
        COUNT(DISTINCT a.id) AS appointment_count,
        COUNT(DISTINCT diag.id) AS diagnosis_count
       FROM departments dep
       LEFT JOIN doctors doc ON doc.department_id = dep.id
       LEFT JOIN appointments a ON a.doctor_id = doc.id AND a.appointment_date >= NOW() - INTERVAL '30 days'
       LEFT JOIN diagnoses diag ON diag.doctor_id = doc.id AND diag.diagnosis_date >= NOW() - INTERVAL '30 days'
       GROUP BY dep.id, dep.name ORDER BY appointment_count DESC`
    );
    res.json({ success: true, data: { departments: result.rows } });
  } catch (error) {
    console.error('Error fetching department performance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
