import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Public pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ServicesPage from './pages/public/ServicesPage';
import DepartmentsPage from './pages/public/DepartmentsPage';
import DoctorsPublicPage from './pages/public/DoctorsPublicPage';
import ContactPage from './pages/public/ContactPage';
import SearchResults from './pages/public/SearchResults';
import GalleryPage from './pages/public/GalleryPage';
import NewsPage from './pages/public/NewsPage';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Protected HMS pages
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import PatientsPage from './pages/PatientsPage';
import DoctorsPage from './pages/DoctorsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import VitalsPage from './pages/VitalsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import LabTestsPage from './pages/LabTestsPage';
import AdmissionsPage from './pages/AdmissionsPage';
import InvoicesPage from './pages/InvoicesPage';
import PaymentsPage from './pages/PaymentsPage';
import ReceptionPage from './pages/ReceptionPage';
import MedicinesPage from './pages/MedicinesPage';
import InventoryPage from './pages/InventoryPage';
import BedsPage from './pages/BedsPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';
import RoleDescriptionsPage from './pages/admin/RoleDescriptionsPage';
// Standalone UserManagementPage unified into AdminPage
import CashierDashboard from './pages/CashierDashboard';
import InsurancePage from './pages/InsurancePage';
import BloodBankPage from './pages/BloodBankPage';
import AuditPage from './pages/AuditPage';
import RadiologyPage from './pages/RadiologyPage';
import FinanceReportsPage from './pages/FinanceReportsPage';
import PatientPortalPage from './pages/PatientPortalPage';

// ── New workflow pages ───────────────────────────────────────────────────────
import ReceptionistWorkflow from './pages/ReceptionistWorkflow';
import TriageDashboard from './pages/TriageDashboard';
import OPDCoordinatorDashboard from './pages/OPDCoordinatorDashboard';
import DoctorConsultationPage from './pages/DoctorConsultationPage';
import LabTechDashboard from './pages/LabTechDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import CashierWorkflow from './pages/CashierWorkflow';
import ServicesAdminPage from './pages/ServicesAdminPage';
import DepartmentsAdminPage from './pages/DepartmentsAdminPage';
import OPDQueueDisplay from './pages/OPDQueueDisplay';
import DocumentVerificationPage from './pages/DocumentVerificationPage';
import DoctorShiftManagementPage from './pages/DoctorShiftManagementPage';
import InactivityLock from './components/security/InactivityLock';
import BirthCertificatesPage from './pages/board/BirthCertificatesPage';
import DeathCertificatesPage from './pages/board/DeathCertificatesPage';
import ScholarshipsPage from './pages/board/ScholarshipsPage';
import SpecializationPage from './pages/board/SpecializationPage';
import TrainingDevelopmentPage from './pages/board/TrainingDevelopmentPage';
import BoardMembersPage from './pages/board/BoardMembersPage';
import BoardMeetingsPage from './pages/board/BoardMeetingsPage';
import BoardReportsPage from './pages/board/BoardReportsPage';
import QueueCommandCenter from './pages/QueueCommandCenter';

// ── Role permission map ──────────────────────────────────────────────────────
const ALL_PAGES = [
  'dashboard', 'doctor-dashboard', 'patients', 'doctors', 'appointments',
  'vitals', 'prescriptions', 'lab-tests', 'admissions', 'invoices', 'payments',
  'reception', 'medicines', 'inventory', 'beds', 'reports', 'admin',
  'user-management', 'admin', 'departments-admin', 'cashier', 'insurance', 'blood-bank', 'audit', 'radiology',
  'finance-reports', 'patient-portal', 'reception-workflow', 'triage',
  'assignment', 'opd-coordinator', 'consultation', 'lab-dashboard', 'pharmacy', 'cashier-workflow',
  'services-admin', 'shifts', 'queue-management',
  'birth-certificates', 'death-certificates', 'scholarships', 'specializations',
  'training', 'board-members', 'board-meetings', 'board-reports'
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin:      ALL_PAGES,
  admin: [
    'dashboard', 'doctor-dashboard', 'patients', 'doctors', 'appointments',
    'vitals', 'prescriptions', 'lab-tests', 'admissions', 'invoices', 'payments',
    'reception', 'medicines', 'inventory', 'beds', 'reports',
    'user-management', 'departments-admin', 'cashier', 'insurance', 'blood-bank', 'radiology',
    'finance-reports', 'patient-portal', 'reception-workflow', 'triage',
    'assignment', 'opd-coordinator', 'consultation', 'lab-dashboard', 'pharmacy', 'cashier-workflow',
    'services-admin', 'shifts', 'queue-management',
  'birth-certificates', 'death-certificates', 'scholarships', 'specializations',
  'training', 'board-members', 'board-meetings', 'board-reports'
  ],
  hospital_manager: [
    'dashboard',
    'assignment',
    'opd-coordinator',
    'queue-management',
    'departments-admin',
    'doctors',
    'admissions',
    'beds',
    'finance-reports',
    'reports',
    'services-admin',
    'shifts',
    'birth-certificates', 'death-certificates', 'scholarships', 'specializations',
    'training', 'board-members', 'board-meetings', 'board-reports'
  ],
  receptionist:     ['dashboard', 'patients', 'appointments', 'admissions', 'reception', 'reception-workflow', 'vitals', 'queue-management'],
  doctor:           ['dashboard', 'shifts', 'doctor-dashboard', 'patients', 'doctors', 'appointments', 'vitals', 'prescriptions', 'lab-tests', 'admissions', 'radiology', 'consultation', 'medicines', 'queue-management'],
  nurse:            ['dashboard', 'shifts', 'patients', 'appointments', 'vitals', 'admissions', 'beds', 'triage', 'nurse', 'assignment', 'opd-coordinator', 'queue-management'],
  lab_technician:   ['dashboard', 'shifts', 'lab-tests', 'lab-dashboard', 'patients'],
  pharmacist:       ['dashboard', 'shifts', 'prescriptions', 'medicines', 'inventory', 'pharmacy', 'queue-management'],
  cashier:          ['dashboard', 'invoices', 'payments', 'cashier', 'cashier-dashboard', 'finance-reports', 'cashier-workflow'],
  patient:          ['patient-portal', 'appointments', 'prescriptions', 'invoices'],
};

const DEFAULT_ROUTE_BY_ROLE: Record<string, string> = {
  super_admin: '/dashboard',
  admin: '/dashboard',
  hospital_manager: '/dashboard',
  receptionist: '/reception-workflow',
  doctor: '/consultation',
  nurse: '/nurse',
  lab_technician: '/lab-dashboard',
  pharmacist: '/pharmacy',
  cashier: '/cashier-workflow',
  patient: '/patient-portal',
};

// ── Auth guard ───────────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; page?: string }> = ({ children, page }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Page-level role check: redirect to dashboard instead of unauthorized page
  if (page && user) {
    const allowed = ROLE_PERMISSIONS[user.role] || [];
    if (!allowed.includes(page)) {
      const fallback =
        user.role === 'patient' ? '/patient-portal' :
        user.role === 'nurse' ? '/nurse' :
        user.role === 'doctor' ? '/doctor' :
        user.role === 'receptionist' ? '/reception' :
        '/dashboard';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};

const DefaultLandingRoute: React.FC = () => {
  const { user } = useAuth();
  const target = DEFAULT_ROUTE_BY_ROLE[user?.role || ''] || '/dashboard';
  return <Navigate to={target} replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
          {/* ── Public website ── */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/our-doctors" element={<DoctorsPublicPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/news" element={<NewsPage />} />

          {/* ── Public Document Verification ── */}
          <Route path="/verify/:token" element={<DocumentVerificationPage />} />

          {/* ── Public OPD Waiting Room TV Display ── */}
          <Route path="/queue-display" element={<OPDQueueDisplay />} />
          <Route path="/opd-display" element={<OPDQueueDisplay />} />

          {/* ── Auth ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── Protected HMS portal (role-guarded with Inactivity Lock) ── */}
          <Route path="/" element={
            <ProtectedRoute>
              <InactivityLock timeoutMinutes={5} warningSeconds={60}>
                <Layout />
              </InactivityLock>
            </ProtectedRoute>
          }>
            <Route index element={<DefaultLandingRoute />} />
            <Route path="dashboard" element={
              <ProtectedRoute page="dashboard"><DashboardPage /></ProtectedRoute>
            } />
            <Route path="patient-portal" element={
              <ProtectedRoute page="patient-portal"><PatientPortalPage /></ProtectedRoute>
            } />
            <Route path="doctor" element={
              <ProtectedRoute page="doctor-dashboard"><DoctorDashboardPage /></ProtectedRoute>
            } />
            <Route path="patients" element={
              <ProtectedRoute page="patients"><PatientsPage /></ProtectedRoute>
            } />
            <Route path="patients/new" element={
              <ProtectedRoute page="patients"><PatientsPage /></ProtectedRoute>
            } />
            <Route path="doctors" element={
              <ProtectedRoute page="doctors"><DoctorsPage /></ProtectedRoute>
            } />
            <Route path="appointments" element={
              <ProtectedRoute page="appointments"><AppointmentsPage /></ProtectedRoute>
            } />
            <Route path="appointments/new" element={
              <ProtectedRoute page="appointments"><AppointmentsPage /></ProtectedRoute>
            } />
            <Route path="vitals" element={
              <ProtectedRoute page="vitals"><VitalsPage /></ProtectedRoute>
            } />
            <Route path="prescriptions" element={
              <ProtectedRoute page="prescriptions"><PrescriptionsPage /></ProtectedRoute>
            } />
            <Route path="lab-tests" element={
              <ProtectedRoute page="lab-tests"><LabTestsPage /></ProtectedRoute>
            } />
            <Route path="admissions" element={
              <ProtectedRoute page="admissions"><AdmissionsPage /></ProtectedRoute>
            } />
            <Route path="invoices" element={
              <ProtectedRoute page="invoices"><InvoicesPage /></ProtectedRoute>
            } />
            <Route path="invoices/new" element={
              <ProtectedRoute page="invoices"><InvoicesPage /></ProtectedRoute>
            } />
            <Route path="reception" element={
              <ProtectedRoute page="reception"><ReceptionPage /></ProtectedRoute>
            } />
            <Route path="payments" element={
              <ProtectedRoute page="payments"><PaymentsPage /></ProtectedRoute>
            } />
            <Route path="cashier" element={
              <ProtectedRoute page="cashier"><CashierDashboard /></ProtectedRoute>
            } />
            <Route path="cashier-dashboard" element={
              <ProtectedRoute page="cashier-dashboard"><CashierDashboard /></ProtectedRoute>
            } />
            <Route path="insurance" element={
              <ProtectedRoute page="insurance"><InsurancePage /></ProtectedRoute>
            } />
            <Route path="blood-bank" element={
              <ProtectedRoute page="blood-bank"><BloodBankPage /></ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute page="audit"><AuditPage /></ProtectedRoute>
            } />
            <Route path="radiology" element={
              <ProtectedRoute page="radiology"><RadiologyPage /></ProtectedRoute>
            } />
            <Route path="finance-reports" element={
              <ProtectedRoute page="finance-reports"><FinanceReportsPage /></ProtectedRoute>
            } />
            <Route path="medicines" element={
              <ProtectedRoute page="medicines"><MedicinesPage /></ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute page="inventory"><InventoryPage /></ProtectedRoute>
            } />
            <Route path="beds" element={
              <ProtectedRoute page="beds"><BedsPage /></ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute page="reports"><ReportsPage /></ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute page="admin"><AdminPage /></ProtectedRoute>
            } />
            <Route path="admin/users" element={
              <ProtectedRoute page="admin"><AdminPage initialTab="users" /></ProtectedRoute>
            } />
            <Route path="admin/roles" element={
              <ProtectedRoute page="admin"><RoleDescriptionsPage /></ProtectedRoute>
            } />
            <Route path="user-management" element={
              <ProtectedRoute page="admin"><AdminPage initialTab="users" /></ProtectedRoute>
            } />
            <Route path="user-management/roles" element={
              <ProtectedRoute page="admin"><RoleDescriptionsPage /></ProtectedRoute>
            } />
            <Route path="departments-admin" element={
              <ProtectedRoute page="departments-admin"><DepartmentsAdminPage /></ProtectedRoute>
            } />

            {/* ── New Workflow Routes ──────────────────────────────── */}
            <Route path="reception-workflow" element={
              <ProtectedRoute page="reception-workflow"><ReceptionistWorkflow /></ProtectedRoute>
            } />
            <Route path="nurse" element={
              <ProtectedRoute page="nurse"><TriageDashboard /></ProtectedRoute>
            } />
            <Route path="triage" element={
              <ProtectedRoute page="triage"><TriageDashboard /></ProtectedRoute>
            } />
            <Route path="assignment" element={
              <ProtectedRoute page="assignment"><OPDCoordinatorDashboard /></ProtectedRoute>
            } />
            <Route path="opd-coordinator" element={
              <ProtectedRoute page="opd-coordinator"><OPDCoordinatorDashboard /></ProtectedRoute>
            } />
            <Route path="queue-management" element={
              <ProtectedRoute page="queue-management"><QueueCommandCenter /></ProtectedRoute>
            } />
            <Route path="consultation" element={
              <ProtectedRoute page="consultation"><DoctorConsultationPage /></ProtectedRoute>
            } />
            <Route path="lab-dashboard" element={
              <ProtectedRoute page="lab-dashboard"><LabTechDashboard /></ProtectedRoute>
            } />
            <Route path="pharmacy" element={
              <ProtectedRoute page="pharmacy"><PharmacyDashboard /></ProtectedRoute>
            } />
            <Route path="cashier-workflow" element={
              <ProtectedRoute page="cashier-workflow"><CashierWorkflow /></ProtectedRoute>
            } />
            <Route path="shifts" element={
              <ProtectedRoute page="shifts"><DoctorShiftManagementPage /></ProtectedRoute>
            } />
            <Route path="services-admin" element={
              <ProtectedRoute page="services-admin"><ServicesAdminPage /></ProtectedRoute>
            } />

            {/* ── Board & Administrative Services Routes ────────── */}
            <Route path="board/birth-certificates" element={
              <ProtectedRoute page="birth-certificates"><BirthCertificatesPage /></ProtectedRoute>
            } />
            <Route path="board/death-certificates" element={
              <ProtectedRoute page="death-certificates"><DeathCertificatesPage /></ProtectedRoute>
            } />
            <Route path="board/scholarships" element={
              <ProtectedRoute page="scholarships"><ScholarshipsPage /></ProtectedRoute>
            } />
            <Route path="board/specializations" element={
              <ProtectedRoute page="specializations"><SpecializationPage /></ProtectedRoute>
            } />
            <Route path="board/training" element={
              <ProtectedRoute page="training"><TrainingDevelopmentPage /></ProtectedRoute>
            } />
            <Route path="board/members" element={
              <ProtectedRoute page="board-members"><BoardMembersPage /></ProtectedRoute>
            } />
            <Route path="board/meetings" element={
              <ProtectedRoute page="board-meetings"><BoardMeetingsPage /></ProtectedRoute>
            } />
            <Route path="board/reports" element={
              <ProtectedRoute page="board-reports"><BoardReportsPage /></ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
