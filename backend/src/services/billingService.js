/**
 * Billing Service — Automatic Invoice Engine
 *
 * Every billable hospital event calls createBillingItem().
 * Duplicate protection is enforced by a DB UNIQUE constraint
 * on (source_type, source_id) in invoice_items.
 */

const pool = require('../config/database');

/**
 * Resolve or create the encounter's invoice.
 * One invoice per encounter. Returns invoice row.
 */
async function getOrCreateInvoice(client, { encounterId, patientId, doctorId }) {
  // Try to find existing invoice for this encounter
  if (encounterId) {
    const existing = await client.query(
      `SELECT * FROM invoices WHERE encounter_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [encounterId]
    );
    if (existing.rows.length) return existing.rows[0];
  }

  // Create new invoice
  const result = await client.query(
    `INSERT INTO invoices
       (patient_id, encounter_id, doctor_id, subtotal, tax, discount, total_amount, status, notes)
     VALUES ($1, $2, $3, 0, 0, 0, 0, 'pending', 'Auto-generated encounter invoice')
     RETURNING *`,
    [patientId, encounterId || null, doctorId || null]
  );
  return result.rows[0];
}

/**
 * Update invoice totals by summing all its items.
 */
async function recalculateInvoice(client, invoiceId) {
  await client.query(
    `UPDATE invoices
     SET subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM invoice_items WHERE invoice_id = $1),
         total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM invoice_items WHERE invoice_id = $1),
         updated_at = NOW()
     WHERE id = $1`,
    [invoiceId]
  );
}

/**
 * Core billing function. Call this for any billable event.
 *
 * @param {object} opts
 * @param {number} opts.patientId
 * @param {number|null} opts.encounterId
 * @param {number|null} opts.doctorId
 * @param {'prescription'|'lab_order'|'radiology_order'|'consultation'|'procedure'|'bed'|'other'} opts.sourceType
 * @param {number} opts.sourceId     - PK of the originating record
 * @param {string} opts.description  - Human-readable description
 * @param {number} opts.unitPrice
 * @param {number} [opts.quantity=1]
 * @param {number|null} [opts.serviceId]
 * @param {number|null} [opts.createdBy]
 * @returns {Promise<{invoiceItem, invoice, alreadyExisted: boolean}>}
 */
async function createBillingItem(opts) {
  const {
    patientId, encounterId = null, doctorId = null,
    sourceType, sourceId,
    description, unitPrice, quantity = 1,
    serviceId = null, createdBy = null
  } = opts;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Duplicate check ──────────────────────────────────────
    const dup = await client.query(
      `SELECT ii.*, i.id AS invoice_id FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE ii.source_type = $1 AND ii.source_id = $2`,
      [sourceType, sourceId]
    );
    if (dup.rows.length) {
      await client.query('ROLLBACK');
      return { invoiceItem: dup.rows[0], invoice: null, alreadyExisted: true };
    }

    // ── Get or create invoice ────────────────────────────────
    const invoice = await getOrCreateInvoice(client, { encounterId, patientId, doctorId });

    // ── Create line item ─────────────────────────────────────
    const itemRes = await client.query(
      `INSERT INTO invoice_items
         (invoice_id, patient_id, encounter_id, service_id,
          description, quantity, unit_price, source_type, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [invoice.id, patientId, encounterId, serviceId,
       description, quantity, unitPrice, sourceType, sourceId]
    );
    const invoiceItem = itemRes.rows[0];

    // ── Recalculate invoice total ────────────────────────────
    await recalculateInvoice(client, invoice.id);

    // ── Update invoice status if it was 'paid' somehow ──────
    await client.query(
      `UPDATE invoices SET status = 'pending', updated_at = NOW()
       WHERE id = $1 AND status = 'paid'`, [invoice.id]
    );

    // ── Create billing event audit record ────────────────────
    await client.query(
      `INSERT INTO billing_events
         (encounter_id, patient_id, invoice_id, invoice_item_id,
          event_type, event_id, amount, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [encounterId, patientId, invoice.id, invoiceItem.id,
       sourceType, sourceId, unitPrice * quantity, description, createdBy]
    );

    // ── Update encounter status to billing_generated ─────────
    if (encounterId) {
      await client.query(
        `UPDATE patient_encounters
         SET status = CASE
           WHEN status IN ('waiting_for_doctor','in_consultation','services_ordered') THEN 'billing_generated'
           ELSE status
         END, updated_at = NOW()
         WHERE id = $1`,
        [encounterId]
      );
    }

    await client.query('COMMIT');

    // Fetch refreshed invoice
    const freshInvoice = await pool.query(
      `SELECT i.*, p.first_name||' '||p.last_name AS patient_name
       FROM invoices i JOIN patients p ON p.id = i.patient_id
       WHERE i.id = $1`, [invoice.id]
    );

    return { invoiceItem, invoice: freshInvoice.rows[0], alreadyExisted: false };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Auto-bill a prescription.
 * Looks up medicine price if a service isn't specified.
 */
async function billPrescription({ prescriptionId, patientId, encounterId, doctorId, medicationName, quantity = 1, createdBy }) {
  // Try to find a service match or use 0 price (pharmacist sets actual price)
  let unitPrice = 0;
  try {
    const med = await pool.query(
      `SELECT unit_price FROM medicines WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [medicationName]
    );
    if (med.rows.length) unitPrice = parseFloat(med.rows[0].unit_price);
  } catch (_) {}

  return createBillingItem({
    patientId, encounterId, doctorId,
    sourceType: 'prescription',
    sourceId: prescriptionId,
    description: `Medication: ${medicationName} (Qty: ${quantity})`,
    unitPrice, quantity,
    createdBy
  });
}

/**
 * Auto-bill a lab test order.
 */
async function billLabOrder({ labOrderId, patientId, encounterId, doctorId, testName, createdBy }) {
  // Look up service price from catalog
  let unitPrice = 0;
  let serviceId = null;
  try {
    const svc = await pool.query(
      `SELECT id, unit_price FROM services
       WHERE category = 'lab_test' AND LOWER(name) ILIKE $1 LIMIT 1`,
      [`%${testName.split(' ')[0]}%`]
    );
    if (svc.rows.length) {
      unitPrice = parseFloat(svc.rows[0].unit_price);
      serviceId = svc.rows[0].id;
    }
  } catch (_) {}

  return createBillingItem({
    patientId, encounterId, doctorId,
    sourceType: 'lab_order',
    sourceId: labOrderId,
    description: `Lab Test: ${testName}`,
    unitPrice, quantity: 1, serviceId,
    createdBy
  });
}

/**
 * Auto-bill a radiology order.
 */
async function billRadiologyOrder({ radiologyOrderId, patientId, encounterId, doctorId, studyType, bodyPart, createdBy }) {
  let unitPrice = 0;
  let serviceId = null;
  try {
    const svc = await pool.query(
      `SELECT id, unit_price FROM services
       WHERE category = 'radiology' AND LOWER(name) ILIKE $1 LIMIT 1`,
      [`%${studyType.split(' ')[0]}%`]
    );
    if (svc.rows.length) {
      unitPrice = parseFloat(svc.rows[0].unit_price);
      serviceId = svc.rows[0].id;
    }
  } catch (_) {}

  return createBillingItem({
    patientId, encounterId, doctorId,
    sourceType: 'radiology_order',
    sourceId: radiologyOrderId,
    description: `Radiology: ${studyType}${bodyPart ? ` (${bodyPart})` : ''}`,
    unitPrice, quantity: 1, serviceId,
    createdBy
  });
}

/**
 * Auto-bill a procedure.
 */
async function billProcedure({ procedureOrderId, patientId, encounterId, doctorId, procedureName, createdBy }) {
  let unitPrice = 0;
  let serviceId = null;
  try {
    const svc = await pool.query(
      `SELECT id, unit_price FROM services WHERE category = 'procedure' AND LOWER(name) ILIKE $1 LIMIT 1`,
      [`%${procedureName.split(' ')[0]}%`]
    );
    if (svc.rows.length) {
      unitPrice = parseFloat(svc.rows[0].unit_price);
      serviceId = svc.rows[0].id;
    }
  } catch (_) {}

  return createBillingItem({
    patientId, encounterId, doctorId,
    sourceType: 'procedure',
    sourceId: procedureOrderId,
    description: `Procedure: ${procedureName}`,
    unitPrice, quantity: 1, serviceId,
    createdBy
  });
}

/**
 * Auto-bill a consultation.
 */
async function billConsultation({ consultationId, patientId, encounterId, doctorId, consultationType = 'General Consultation', createdBy }) {
  let unitPrice = 500;
  let serviceId = null;
  try {
    const svc = await pool.query(
      `SELECT id, unit_price FROM services WHERE category = 'consultation' AND name = $1 LIMIT 1`,
      [consultationType]
    );
    if (svc.rows.length) {
      unitPrice = parseFloat(svc.rows[0].unit_price);
      serviceId = svc.rows[0].id;
    }
  } catch (_) {}

  return createBillingItem({
    patientId, encounterId, doctorId,
    sourceType: 'consultation',
    sourceId: consultationId,
    description: `Consultation: ${consultationType}`,
    unitPrice, quantity: 1, serviceId,
    createdBy
  });
}

/**
 * Get full invoice with items for an encounter.
 */
async function getEncounterBilling(encounterId) {
  const invoiceRes = await pool.query(
    `SELECT i.*,
            p.first_name||' '||p.last_name AS patient_name,
            d.first_name||' '||d.last_name AS doctor_name,
            COALESCE(SUM(py.amount), 0)     AS amount_paid
     FROM invoices i
     JOIN patients p ON p.id = i.patient_id
     LEFT JOIN doctors d ON d.id = i.doctor_id
     LEFT JOIN payments py ON py.invoice_id = i.id
     WHERE i.encounter_id = $1
     GROUP BY i.id, p.first_name, p.last_name, d.first_name, d.last_name
     ORDER BY i.created_at ASC
     LIMIT 1`,
    [encounterId]
  );
  if (!invoiceRes.rows.length) return null;

  const invoice = invoiceRes.rows[0];
  const itemsRes = await pool.query(
    `SELECT ii.*, s.name AS service_name
     FROM invoice_items ii
     LEFT JOIN services s ON s.id = ii.service_id
     WHERE ii.invoice_id = $1
     ORDER BY ii.created_at ASC`,
    [invoice.id]
  );

  return { invoice, items: itemsRes.rows };
}

module.exports = {
  createBillingItem,
  billPrescription,
  billLabOrder,
  billRadiologyOrder,
  billProcedure,
  billConsultation,
  getEncounterBilling,
  getOrCreateInvoice,
  recalculateInvoice
};
