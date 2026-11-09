const patientQrService = require('../src/services/patientQrService');

describe('Patient QR identity service', () => {
  const patient = {
    id: 12,
    user_id: 44,
    first_name: 'Lake',
    last_name: 'Awraris',
    created_at: new Date('2026-01-02T00:00:00Z')
  };
  const req = { ip: '127.0.0.1', get: () => 'test-agent' };

  test('issues a unique opaque token and records the identity audit event', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [patient] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockImplementationOnce(async (_query, params) => ({
          rows: [{ id: 31, token: params[1], created_at: new Date(), expires_at: null }]
        }))
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await patientQrService.ensurePatientQrIdentity(client, {
      patientId: patient.id,
      actorUserId: 7,
      req
    });

    const token = client.query.mock.calls[3][1][1];
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.patientId).toBe(patient.id);
    expect(result.mrn).toBe('PAT-0012');
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(client.query.mock.calls[4][1][3]).toBe('issued');
  });

  test('reuses an active identity without changing its token', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [patient] })
        .mockResolvedValueOnce({
          rows: [{ id: 31, token: 'b'.repeat(43), created_at: new Date(), expires_at: null }]
        })
        .mockResolvedValueOnce({ rows: [] })
    };

    const result = await patientQrService.ensurePatientQrIdentity(client, {
      patientId: patient.id,
      actorUserId: 7,
      req
    });

    expect(client.query).toHaveBeenCalledTimes(3);
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(client.query.mock.calls[2][1][3]).toBe('retrieved');
  });
});
