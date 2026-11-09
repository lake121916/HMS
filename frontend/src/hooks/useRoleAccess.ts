import { useAuth } from '../contexts/AuthContext';

// Centralised role-permission matrix
const PERMISSIONS: Record<string, string[]> = {
  // Patients
  'patients:view':   ['super_admin','admin','hospital_manager','receptionist','doctor','nurse','lab_technician'],
  'patients:create': ['receptionist'],
  'patients:edit':   ['super_admin','admin','receptionist','doctor','nurse'],
  'patients:delete': ['super_admin'],

  // Doctors
  'doctors:view':    ['super_admin','admin','hospital_manager','receptionist','doctor','nurse'],
  'doctors:create':  ['super_admin','admin','hospital_manager'],
  'doctors:edit':    ['super_admin','admin','hospital_manager'],
  'doctors:delete':  ['super_admin','admin'],

  // Appointments
  'appointments:view':   ['super_admin','admin','hospital_manager','receptionist','doctor','nurse','patient'],
  'appointments:create': ['super_admin','admin','receptionist','doctor','patient'],
  'appointments:edit':   ['super_admin','admin','receptionist','doctor'],
  'appointments:cancel': ['super_admin','admin','receptionist','doctor','patient'],

  // Vitals — only nurses record; doctors and nurses view
  'vitals:view':   ['super_admin','admin','doctor','nurse','patient'],
  'vitals:create': ['super_admin','admin','nurse','doctor'],
  'vitals:edit':   ['super_admin','admin','nurse','doctor'],
  'vitals:delete': ['super_admin','admin'],

  // Prescriptions — only doctor creates/edits; pharmacist marks dispensed
  'prescriptions:view':     ['super_admin','admin','doctor','nurse','pharmacist','patient'],
  'prescriptions:create':   ['super_admin','admin','doctor'],
  'prescriptions:edit':     ['super_admin','admin','doctor'],
  'prescriptions:dispense': ['super_admin','admin','pharmacist'],
  'prescriptions:delete':   ['super_admin','admin','doctor'],

  // Lab tests — doctor orders; lab_technician processes/uploads result
  'lab_tests:view':          ['super_admin','admin','doctor','nurse','lab_technician','patient'],
  'lab_tests:create':        ['super_admin','admin','doctor'],
  'lab_tests:update_status': ['super_admin','admin','lab_technician'],
  'lab_tests:upload_result': ['super_admin','admin','lab_technician'],
  'lab_tests:delete':        ['super_admin','admin'],

  // Admissions
  'admissions:view':     ['super_admin','admin','hospital_manager','doctor','nurse','receptionist'],
  'admissions:create':   ['super_admin','admin','hospital_manager','receptionist','doctor','nurse'],
  'admissions:edit':     ['super_admin','admin','hospital_manager','doctor','nurse'],
  'admissions:discharge':['super_admin','admin','hospital_manager','doctor'],

  // Beds
  'beds:view':   ['super_admin','admin','hospital_manager','nurse','receptionist','doctor'],
  'beds:create': ['super_admin','admin','hospital_manager'],
  'beds:edit':   ['super_admin','admin','hospital_manager','nurse'],
  'beds:delete': ['super_admin','admin','hospital_manager'],

  // Invoices
  'invoices:view':   ['super_admin','admin','hospital_manager','cashier'],
  'invoices:create': ['super_admin','admin','cashier'],
  'invoices:edit':   ['super_admin','admin','cashier'],
  'invoices:delete': ['super_admin'],
  'invoices:payment':['super_admin','admin','cashier'],

  // Payments
  'payments:view':   ['super_admin','admin','hospital_manager','cashier'],
  'payments:create': ['super_admin','admin','cashier'],

  // New portal access
  'reception:view':    ['super_admin','admin','hospital_manager','receptionist'],
  'cashier:view':      ['super_admin','admin','hospital_manager','cashier'],
  'insurance:view':    ['super_admin','admin'],
  'blood_bank:view':   ['super_admin','admin'],
  'audit:view':        ['super_admin'],
  'radiology:view':    ['super_admin','admin','doctor'],
  'finance_reports:view': ['super_admin','admin','hospital_manager','cashier'],

  // Medicines
  'medicines:view':   ['super_admin','admin','pharmacist','doctor','nurse'],
  'medicines:create': ['super_admin','admin','pharmacist'],
  'medicines:edit':   ['super_admin','admin','pharmacist'],
  'medicines:delete': ['super_admin','admin'],
  'medicines:stock':  ['super_admin','admin','pharmacist'],

  // Inventory
  'inventory:view':   ['super_admin','admin','pharmacist','hospital_manager'],
  'inventory:edit':   ['super_admin','admin','pharmacist'],

  // Reports
  'reports:view':     ['super_admin','admin','hospital_manager'],
  'reports:revenue':  ['super_admin','admin','hospital_manager','cashier'],

  // QR Scanner
  'qr_scanner:view': ['super_admin','admin','hospital_manager','receptionist','doctor','nurse','lab_technician','pharmacist','cashier'],

  // Admin panel
  'admin:users':       ['super_admin','admin'],
  'admin:create_staff':['super_admin','admin'],
  'admin:delete_user': ['super_admin'],
  'admin:departments': ['super_admin','admin','hospital_manager'],
  'admin:system_settings': ['super_admin'],
};

export const useRoleAccess = () => {
  const { user } = useAuth();
  const role = user?.role || '';

  const can = (permission: string): boolean => {
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(role);
  };

  const canAny = (...permissions: string[]): boolean =>
    permissions.some(p => can(p));

  return { can, canAny, role };
};
