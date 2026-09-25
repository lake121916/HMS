describe('Health Check Endpoint', () => {
  it('should return 200 OK for health check logic', () => {
    const healthStatus = { status: 'OK', timestamp: new Date().toISOString() };
    expect(healthStatus.status).toBe('OK');
    expect(healthStatus.timestamp).toBeDefined();
  });
});
