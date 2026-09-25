const LabTestModel = require('../src/models/LabTestModel');

jest.mock('../src/config/database', () => ({
  query: jest.fn()
}));

const pool = require('../src/config/database');

describe('LabTestModel Data Access Layer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should query all lab tests with correct join parameters', async () => {
    const mockRows = [
      { id: 1, test_name: 'Blood Culture', status: 'pending', patient_name: 'John Doe' }
    ];
    pool.query.mockResolvedValueOnce({ rows: mockRows });

    const results = await LabTestModel.findAll({ patientId: 10, status: 'pending', role: 'admin' });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(results).toEqual(mockRows);
  });

  it('should find lab test by ID', async () => {
    const mockLabTest = { id: 5, test_name: 'Chest X-Ray', status: 'completed' };
    pool.query.mockResolvedValueOnce({ rows: [mockLabTest] });

    const result = await LabTestModel.findById(5);

    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM lab_tests WHERE id = $1', [5]);
    expect(result).toEqual(mockLabTest);
  });

  it('should create a new lab test record', async () => {
    const mockCreated = { id: 12, patient_id: 1, test_name: 'MRI Brain', status: 'pending' };
    pool.query.mockResolvedValueOnce({ rows: [mockCreated] });

    const result = await LabTestModel.create({
      patientId: 1,
      doctorId: 2,
      testName: 'MRI Brain',
      testType: 'radiology',
      priority: 'high',
      notes: 'Urgent scan'
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockCreated);
  });
});
