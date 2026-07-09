import { useAuth } from '../contexts/AuthContext';

// Centralised role-permission matrix
const PERMISSIONS: Record<string, string[]> = {
  // Patients
  'patients:view':   ['super_admin','admin','hospital_manager','receptionist','doctor','nurse'],
  'patients:create': ['receptionist'],
  'patients:edit':   ['super_admin','admin','receptionist','doctor','nurse'],
  'patients:delete': ['super_admin','admin'],

  // Doctors
  'doctors:view':    ['super_admin','admin','hospital_manager','receptionist','doctor','nurse'],
  'doctors:create':  ['super_admin','admin'],
  'doctors:edit':    ['super_admin','admin'],
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
  'admissions:create':   ['admin','receptionist','doctor','nurse'],
  'admissions:edit':     ['admin','doctor','nurse'],
  'admissions:discharge':['admin','doctor'],

  // Beds
  'beds:view':   ['super_admin','admin','hospital_manager','nurse','receptionist','doctor'],
  'beds:create': ['admin'],
  'beds:edit':   ['admin','nurse'],
  'beds:delete': ['admin'],

  // Invoices
  'invoices:view':   ['super_admin','admin','hospital_manager','cashier','receptionist'],
  'invoices:create': ['receptionist'],
  'invoices:edit':   ['super_admin','admin','cashier'],
  'invoices:delete': ['super_admin','admin'],
  'invoices:payment':['super_admin','admin','cashier'],

  // Payments
  'payments:view':   ['super_admin','admin','hospital_manager','cashier','receptionist'],
  'payments:create': ['receptionist'],

  // Medicines
  'medicines:view':   ['super_admin','admin','pharmacist','doctor','nurse'],
  'medicines:create': ['admin','pharmacist'],
  'medicines:edit':   ['admin','pharmacist'],
  'medicines:delete': ['super_admin','admin'],
  'medicines:stock':  ['admin','pharmacist'],

  // Inventory
  'inventory:view':   ['super_admin','admin','pharmacist','hospital_manager'],
  'inventory:edit':   ['admin','pharmacist'],

  // Reports
  'reports:view':     ['super_admin','admin','hospital_manager'],
  'reports:revenue':  ['super_admin','admin','hospital_manager','cashier'],

  // Admin panel
  'admin:users':       ['super_admin','admin'],
  'admin:create_staff':['super_admin','admin'],
  'admin:delete_user': ['super_admin'],
  'admin:departments': ['super_admin','admin'],
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
