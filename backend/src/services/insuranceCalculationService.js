/**
 * Insurance Co-pay & Benefit Calculation Engine
 * Alem Ketema Enat Hospital Management System
 * 
 * Supports:
 * - Ethiopian CBHI (Community-Based Health Insurance) standard rules (85% coverage / 15% co-pay)
 * - Private & corporate insurance providers (EIC, Nyala, Awash, United, Nile)
 * - Service & item-level exclusion rules
 * - Pre-authorization verification & approved ceiling caps
 * - Strict financial math with 2-decimal rounding to prevent floating-point drift
 */

const pool = require('../config/database');

/**
 * Round financial amounts safely to 2 decimal places
 */
function roundMoney(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

/**
 * Calculates insurance coverage and patient co-pay for an invoice.
 */
async function calculateInvoiceCoPay({ invoiceId, policyId, preAuthId = null, dbClient = null }) {
  const db = dbClient || pool;

  // 1. Fetch Invoice & Items
  const invRes = await db.query(
    `SELECT i.*, p.first_name, p.last_name
     FROM invoices i
     JOIN patients p ON p.id = i.patient_id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (!invRes.rows.length) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }
  const invoice = invRes.rows[0];
  const totalInvoiceAmount = roundMoney(invoice.total_amount);

  const itemsRes = await db.query(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
    [invoiceId]
  );
  const items = itemsRes.rows;

  // 2. Fetch Policy & Insurance Provider
  const polRes = await db.query(
    `SELECT pip.*, ip.name_en AS provider_name, ip.code AS provider_code, ip.provider_type
     FROM patient_insurance_policies pip
     JOIN insurance_providers ip ON ip.id = pip.provider_id
     WHERE pip.id = $1`,
    [policyId]
  );

  if (!polRes.rows.length) {
    throw new Error(`Insurance policy #${policyId} not found`);
  }
  const policy = polRes.rows[0];

  // Validate policy dates
  const today = new Date().toISOString().split('T')[0];
  const isExpired = policy.expiry_date && policy.expiry_date < today;
  if (!policy.is_active || isExpired) {
    return {
      success: false,
      isCovered: false,
      reason: isExpired ? 'POLICY_EXPIRED' : 'POLICY_INACTIVE',
      message: isExpired ? `Insurance policy expired on ${policy.expiry_date}` : 'Insurance policy is currently deactivated',
      totalInvoiceAmount,
      patientPayableBalance: totalInvoiceAmount,
      approvedInsuranceContribution: 0.00,
      patientCoPay: totalInvoiceAmount,
      eligibleAmount: 0.00,
      ineligibleAmount: totalInvoiceAmount
    };
  }

  // 3. Fetch Coverage Rules for this Provider & Plan
  const rulesRes = await db.query(
    `SELECT * FROM insurance_coverage_rules 
     WHERE provider_id = $1 AND is_active = true
     ORDER BY (service_category = 'all') ASC, id ASC`,
    [policy.provider_id]
  );
  const rules = rulesRes.rows;

  // Default coverage fallback
  let defaultCoveragePercent = policy.provider_type === 'cbhi' ? 85.00 : (100.00 - Number(policy.copay_percentage || 15.00));
  let defaultCopayPercent = 100.00 - defaultCoveragePercent;
  let fixedCopay = Number(policy.copay_fixed || 0.00);
  let requiresPreAuth = false;
  let excludedItemNames = [];

  if (rules.length > 0) {
    const generalRule = rules.find(r => r.service_category === 'all') || rules[0];
    defaultCoveragePercent = Number(generalRule.coverage_percentage);
    defaultCopayPercent = Number(generalRule.patient_copay_percent);
    fixedCopay = Number(generalRule.fixed_copay_amount || fixedCopay);
    requiresPreAuth = generalRule.requires_preauth;
    excludedItemNames = (generalRule.excluded_items || []).map(x => String(x).toLowerCase().trim());
  }

  // 4. Pre-Authorization Evaluation
  let preAuthRecord = null;
  let preAuthStatus = 'not_required';
  let preAuthCap = null;

  if (requiresPreAuth || preAuthId) {
    if (preAuthId) {
      const paRes = await db.query(
        `SELECT * FROM pre_authorization_requests WHERE id = $1 AND policy_id = $2`,
        [preAuthId, policyId]
      );
      if (paRes.rows.length > 0) {
        preAuthRecord = paRes.rows[0];
        preAuthStatus = preAuthRecord.status;
        if (preAuthRecord.status === 'approved' || preAuthRecord.status === 'partially_approved') {
          preAuthCap = Number(preAuthRecord.approved_amount);
        }
      } else {
        preAuthStatus = 'missing_record';
      }
    } else {
      preAuthStatus = 'required_pending';
    }
  }

  // 5. Item-Level Eligibility & Co-Pay Calculation
  let eligibleAmount = 0.00;
  let ineligibleAmount = 0.00;
  const processedItems = [];

  for (const item of items) {
    const itemSubtotal = roundMoney(item.subtotal || (Number(item.quantity || 1) * Number(item.unit_price || 0)));
    const itemNameLower = String(item.description || '').toLowerCase().trim();

    // Check if item is explicitly excluded
    const isExcluded = excludedItemNames.some(ex => itemNameLower.includes(ex));

    if (isExcluded) {
      ineligibleAmount = roundMoney(ineligibleAmount + itemSubtotal);
      processedItems.push({
        id: item.id,
        description: item.description,
        amount: itemSubtotal,
        isEligible: false,
        exclusionReason: 'Explicitly excluded from insurer coverage formulary',
        insuranceCovered: 0.00,
        patientCopay: itemSubtotal
      });
    } else {
      eligibleAmount = roundMoney(eligibleAmount + itemSubtotal);
      const itemInsuranceShare = roundMoney(itemSubtotal * (defaultCoveragePercent / 100));
      const itemPatientShare = roundMoney(itemSubtotal - itemInsuranceShare);
      processedItems.push({
        id: item.id,
        description: item.description,
        amount: itemSubtotal,
        isEligible: true,
        insuranceCovered: itemInsuranceShare,
        patientCopay: itemPatientShare
      });
    }
  }

  // 6. Aggregate Coverage Calculation
  let calculatedInsuranceShare = roundMoney(eligibleAmount * (defaultCoveragePercent / 100));

  // Apply Pre-Authorization approved ceiling if applicable
  if (preAuthCap !== null && preAuthCap > 0 && calculatedInsuranceShare > preAuthCap) {
    calculatedInsuranceShare = preAuthCap;
  } else if (requiresPreAuth && preAuthStatus !== 'approved' && preAuthStatus !== 'partially_approved') {
    // If pre-auth required but not approved, insurance pays 0
    calculatedInsuranceShare = 0.00;
  }

  // Cap at remaining policy benefit
  const remainingBenefit = policy.remaining_benefit !== null ? Number(policy.remaining_benefit) : null;
  if (remainingBenefit !== null && calculatedInsuranceShare > remainingBenefit) {
    calculatedInsuranceShare = roundMoney(Math.max(0, remainingBenefit));
  }

  // Calculate patient co-pay & balance
  let calculatedPatientCopay = roundMoney((totalInvoiceAmount - calculatedInsuranceShare) + fixedCopay);
  if (calculatedPatientCopay > totalInvoiceAmount) {
    calculatedPatientCopay = totalInvoiceAmount;
  }

  const approvedInsuranceContribution = roundMoney(totalInvoiceAmount - calculatedPatientCopay);

  return {
    success: true,
    isCovered: true,
    invoiceId,
    patientId: invoice.patient_id,
    patientName: `${invoice.first_name} ${invoice.last_name}`,
    policyId: policy.id,
    providerId: policy.provider_id,
    providerName: policy.provider_name,
    providerCode: policy.provider_code,
    providerType: policy.provider_type,
    policyNumber: policy.policy_number,
    planName: policy.plan_name || (policy.provider_type === 'cbhi' ? 'Standard CBHI' : 'Comprehensive Care'),
    totalInvoiceAmount,
    eligibleAmount,
    ineligibleAmount,
    coveragePercentage: defaultCoveragePercent,
    copayPercentage: defaultCopayPercent,
    fixedCopay,
    approvedInsuranceContribution,
    patientCoPay: calculatedPatientCopay,
    patientPayableBalance: calculatedPatientCopay,
    remainingBenefitAfterClaim: remainingBenefit !== null ? roundMoney(Math.max(0, remainingBenefit - approvedInsuranceContribution)) : null,
    preAuthRequired: requiresPreAuth,
    preAuthStatus,
    preAuthCap,
    itemsBreakdown: processedItems
  };
}

module.exports = {
  roundMoney,
  calculateInvoiceCoPay
};
