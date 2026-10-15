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

// ── GET Comprehensive Finance Analytics ───────────────────────────────────────
router.get('/finance', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'finance_officer', 'cashier'), async (req, res) => {
  try {
    const { period = 'month', from, to } = req.query;

    // Date range setup
    let groupBy, dateFilter, label;
    if (period === 'week') {
      groupBy = `TO_CHAR(payment_date, 'Dy')`;
      dateFilter = `payment_date >= NOW() - INTERVAL '7 days'`;
      label = 'Last 7 Days';
    } else if (period === 'year') {
      groupBy = `TO_CHAR(payment_date, 'Mon YYYY')`;
      dateFilter = `payment_date >= NOW() - INTERVAL '12 months'`;
      label = 'Last 12 Months';
    } else if (from && to) {
      groupBy = `TO_CHAR(payment_date, 'DD Mon')`;
      dateFilter = `payment_date BETWEEN '${from}'::date AND '${to}'::date + INTERVAL '1 day'`;
      label = `${from} – ${to}`;
    } else {
      groupBy = `TO_CHAR(payment_date, 'DD Mon')`;
      dateFilter = `payment_date >= NOW() - INTERVAL '30 days'`;
      label = 'Last 30 Days';
    }

    const [
      totals, chart, byMethod, byProvider,
      outstanding, ageing, insurance, shifts,
      topServices, dailyComparison, refunds
    ] = await Promise.all([

      // Revenue totals
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN amount END), 0)::numeric AS today,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', NOW()) THEN amount END), 0)::numeric AS this_month,
          COALESCE(SUM(CASE WHEN DATE_TRUNC('year', payment_date) = DATE_TRUNC('year', NOW()) THEN amount END), 0)::numeric AS this_year,
          COALESCE(SUM(CASE WHEN ${dateFilter} THEN amount END), 0)::numeric AS period_total,
          COUNT(CASE WHEN ${dateFilter} THEN 1 END) AS period_transactions,
          COALESCE(AVG(CASE WHEN ${dateFilter} THEN amount END), 0)::numeric AS avg_transaction
        FROM payments
        WHERE verification_status != 'REJECTED'`
      ),

      // Revenue trend chart
      pool.query(`
        SELECT ${groupBy} AS period,
               COALESCE(SUM(amount), 0)::numeric AS revenue,
               COUNT(*) AS transactions
        FROM payments
        WHERE ${dateFilter} AND verification_status != 'REJECTED'
        GROUP BY ${groupBy}, DATE_TRUNC('day', payment_date)
        ORDER BY MIN(payment_date)`
      ),

      // Payment method breakdown
      pool.query(`
        SELECT
          COALESCE(payment_method, 'cash') AS method,
          COUNT(*) AS count,
          COALESCE(SUM(amount), 0)::numeric AS total,
          ROUND(COALESCE(SUM(amount), 0) * 100.0 /
            NULLIF(SUM(SUM(amount)) OVER (), 0), 1) AS pct
        FROM payments
        WHERE ${dateFilter} AND verification_status != 'REJECTED'
        GROUP BY payment_method
        ORDER BY total DESC`
      ),

      // Payment provider digital breakdown
      pool.query(`
        SELECT
          COALESCE(payment_provider, payment_method) AS provider,
          COUNT(*) AS count,
          COALESCE(SUM(amount), 0)::numeric AS total,
          COUNT(CASE WHEN verification_status = 'PENDING' THEN 1 END) AS pending_count,
          COALESCE(SUM(CASE WHEN verification_status = 'PENDING' THEN amount END), 0)::numeric AS pending_amount
        FROM payments
        WHERE ${dateFilter} AND payment_method IN ('telebirr','cbe_birr','bank_transfer','card')
        GROUP BY COALESCE(payment_provider, payment_method)
        ORDER BY total DESC`
      ),

      // Outstanding receivables
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN LOWER(status) IN ('unpaid','pending') THEN total_amount END), 0)::numeric AS unpaid,
          COALESCE(SUM(CASE WHEN LOWER(status) = 'partial' THEN total_amount - amount_paid END), 0)::numeric AS partial,
          COUNT(CASE WHEN LOWER(status) IN ('unpaid','pending') THEN 1 END) AS unpaid_count,
          COUNT(CASE WHEN LOWER(status) = 'partial' THEN 1 END) AS partial_count
        FROM invoices`
      ),

      // Ageing buckets (days since invoice created)
      pool.query(`
        SELECT
          CASE
            WHEN NOW() - created_at < INTERVAL '7 days'  THEN '0–7 days'
            WHEN NOW() - created_at < INTERVAL '30 days' THEN '8–30 days'
            WHEN NOW() - created_at < INTERVAL '60 days' THEN '31–60 days'
            ELSE '60+ days'
          END AS bucket,
          COUNT(*) AS count,
          COALESCE(SUM(total_amount - COALESCE(amount_paid,0)), 0)::numeric AS amount
        FROM invoices
        WHERE LOWER(status) IN ('unpaid','pending','partial')
        GROUP BY 1 ORDER BY MIN(created_at)`
      ),

      // Insurance collections
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN payment_method='insurance' THEN amount END), 0)::numeric AS insurance_collected,
          COUNT(CASE WHEN payment_method='insurance' THEN 1 END) AS insurance_txns,
          COALESCE((SELECT SUM(claim_amount) FROM insurance_claims WHERE status='pending'), 0)::numeric AS claims_pending,
          COALESCE((SELECT SUM(approved_amount) FROM insurance_claims WHERE status IN ('approved','partially_approved')), 0)::numeric AS claims_approved,
          COALESCE((SELECT SUM(payment_amount) FROM insurance_claims WHERE status='paid'), 0)::numeric AS claims_paid
        FROM payments
        WHERE ${dateFilter} AND verification_status != 'REJECTED'`
      ),

      // Shift reconciliation summary
      pool.query(`
        SELECT
          COUNT(*) AS total_shifts,
          COUNT(CASE WHEN status='OPEN' THEN 1 END) AS open_shifts,
          COUNT(CASE WHEN status='CLOSED' THEN 1 END) AS closed_shifts,
          COUNT(CASE WHEN status='RECONCILED' THEN 1 END) AS reconciled_shifts,
          COALESCE(AVG(ABS(cash_variance)), 0)::numeric AS avg_variance,
          COALESCE(SUM(CASE WHEN ABS(cash_variance) > 50 THEN 1 END), 0) AS high_variance_shifts
        FROM cashier_shifts
        WHERE opened_at >= NOW() - INTERVAL '30 days'`
      ),

      // Top revenue-generating services
      pool.query(`
        SELECT
          COALESCE(ii.description, 'General Service') AS service,
          SUM(ii.subtotal)::numeric AS revenue,
          COUNT(*) AS count
        FROM invoice_items ii
        JOIN invoices i ON ii.invoice_id = i.id
        JOIN payments p ON p.invoice_id = i.id
        WHERE p.payment_date >= NOW() - INTERVAL '30 days'
          AND p.verification_status != 'REJECTED'
        GROUP BY COALESCE(ii.description, 'General Service')
        ORDER BY revenue DESC LIMIT 8`
      ),

      // Daily comparison: today vs yesterday vs same day last week
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN amount END), 0)::numeric AS today,
          COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE - 1 THEN amount END), 0)::numeric AS yesterday,
          COALESCE(SUM(CASE WHEN DATE(payment_date) = CURRENT_DATE - 7 THEN amount END), 0)::numeric AS last_week_same_day,
          COUNT(CASE WHEN DATE(payment_date) = CURRENT_DATE THEN 1 END) AS today_txns,
          COUNT(CASE WHEN DATE(payment_date) = CURRENT_DATE - 1 THEN 1 END) AS yesterday_txns
        FROM payments WHERE verification_status != 'REJECTED'`
      ),

      // Refunds/adjustments
      pool.query(`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(ABS(amount)), 0)::numeric AS total_refunded
        FROM payments
        WHERE amount < 0 AND ${dateFilter}`
      ),
    ]);

    res.json({
      success: true,
      data: {
        label,
        period,
        totals: totals.rows[0],
        chart: chart.rows,
        byMethod: byMethod.rows,
        byProvider: byProvider.rows,
        outstanding: outstanding.rows[0],
        ageing: ageing.rows,
        insurance: insurance.rows[0],
        shifts: shifts.rows[0],
        topServices: topServices.rows,
        dailyComparison: dailyComparison.rows[0],
        refunds: refunds.rows[0],
      }
    });
  } catch (error) {
    console.error('Error fetching finance analytics:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;
