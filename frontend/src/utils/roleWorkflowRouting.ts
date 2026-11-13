/**
 * Role-appropriate patient workflow destination router.
 * Ensures that whenever a patient is scanned or looked up,
 * staff is directed straight to their clinical role's workbench with
 * active patient context.
 */

export const getRolePatientWorkflowUrl = (role: string, patientId: number): string => {
  switch (role) {
    case 'receptionist':
      return `/reception-workflow?patient_id=${patientId}`;
    case 'nurse':
      return `/nurse?patient_id=${patientId}`;
    case 'doctor':
      return `/consultation?patient_id=${patientId}`;
    case 'lab_technician':
      return `/lab-dashboard?patient_id=${patientId}`;
    case 'pharmacist':
      return `/pharmacy?patient_id=${patientId}`;
    case 'cashier':
      return `/cashier-workflow?patient_id=${patientId}`;
    case 'hospital_manager':
    case 'admin':
    case 'super_admin':
      return `/patients/${patientId}`;
    default:
      return `/patients/${patientId}`;
  }
};

export const getRoleWorkflowLabel = (role: string): string => {
  switch (role) {
    case 'receptionist':
      return 'Reception Desk';
    case 'nurse':
      return 'Triage & Vitals';
    case 'doctor':
      return 'Doctor Consultation';
    case 'lab_technician':
      return 'Laboratory';
    case 'pharmacist':
      return 'Pharmacy';
    case 'cashier':
      return 'Cashier Billing';
    default:
      return 'Patient Record';
  }
};
