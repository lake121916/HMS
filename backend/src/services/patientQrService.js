const crypto = require('crypto');
const QRCode = require('qrcode');

const QR_PREFIX = 'AKEH:PATIENT:';

const createToken = () => crypto.randomBytes(32).toString('base64url');

const formatMrn = (patientId) => `PAT-${String(patientId).padStart(4, '0')}`;

const buildQrDataUrl = (token) => QRCode.toDataURL(`${QR_PREFIX}${token}`, {
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 320
});

const logQrAction = async (client, { patientId = null, identityId = null, actorUserId, action, req }) => {
  await client.query(
    `INSERT INTO patient_qr_audit_logs (patient_id, identity_id, actor_user_id, action, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [patientId, identityId, actorUserId, action, req.ip || null, req.get('user-agent') || null]
  );
};

const ensurePatientQrIdentity = async (client, { patientId, actorUserId, req, regenerate = false }) => {
  const patientResult = await client.query(
    `SELECT id, user_id, first_name, last_name, created_at
     FROM patients WHERE id = $1 FOR UPDATE`,
    [patientId]
  );
  if (!patientResult.rows.length) return null;

  const patient = patientResult.rows[0];
  let identity;
  let action = 'retrieved';
  if (!regenerate) {
    const identityResult = await client.query(
      `SELECT id, token, expires_at, created_at
       FROM patient_qr_identities
       WHERE patient_id = $1 AND is_active = true
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       LIMIT 1`,
      [patient.id]
    );
    identity = identityResult.rows[0];
  }

  if (!identity) {
    await client.query(
      `UPDATE patient_qr_identities
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $1 AND is_active = true`,
      [patient.id]
    );
    action = regenerate ? 'regenerated' : 'issued';

    const result = await client.query(
      `INSERT INTO patient_qr_identities (patient_id, token, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, token, expires_at, created_at`,
      [patient.id, createToken(), actorUserId]
    );
    identity = result.rows[0];
  }

  await logQrAction(client, {
    patientId: patient.id,
    identityId: identity.id,
    actorUserId,
    action,
    req
  });

  return {
    patientId: patient.id,
    patientUserId: patient.user_id,
    fullName: `${patient.first_name} ${patient.last_name}`,
    mrn: formatMrn(patient.id),
    issuedAt: identity.created_at,
    expiresAt: identity.expires_at,
    qrCodeDataUrl: await buildQrDataUrl(identity.token)
  };
};

module.exports = {
  QR_PREFIX,
  buildQrDataUrl,
  ensurePatientQrIdentity,
  formatMrn,
  logQrAction
};
