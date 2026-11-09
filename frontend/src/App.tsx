import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

// Layout & Security components
import Layout from './components/Layout';
import InactivityLock from './components/security/InactivityLock';

// Page loading fallback
const PageFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
    <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading module…</p>
  </div>
);

// Public pages
const HomePage = lazy(() => import('./pages/public/HomePage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ServicesPage = lazy(() => import('./pages/public/ServicesPage'));
const DepartmentsPage = lazy(() => import('./pages/public/DepartmentsPage'));
const DoctorsPublicPage = lazy(() => import('./pages/public/DoctorsPublicPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const SearchResults = lazy(() => import('./pages/public/SearchResults'));
const GalleryPage = lazy(() => import('./pages/public/GalleryPage'));
const NewsPage = lazy(() => import('./pages/public/NewsPage'));

// Auth pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));

// Protected HMS pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage'));
const PatientsPage = lazy(() => import('./pages/PatientsPage'));
const DoctorsPage = lazy(() => import('./pages/DoctorsPage'));
const AppointmentsPage = lazy(() => import('./pages/AppointmentsPage'));
const VitalsPage = lazy(() => import('./pages/VitalsPage'));
const PrescriptionsPage = lazy(() => import('./pages/PrescriptionsPage'));
const LabTestsPage = lazy(() => import('./pages/LabTestsPage'));
const AdmissionsPage = lazy(() => import('./pages/AdmissionsPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const ReceptionPage = lazy(() => import('./pages/ReceptionPage'));
const MedicinesPage = lazy(() => import('./pages/MedicinesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const BedsPage = lazy(() => import('./pages/BedsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const RoleDescriptionsPage = lazy(() => import('./pages/admin/RoleDescriptionsPage'));
const CashierDashboard = lazy(() => import('./pages/CashierDashboard'));
const InsurancePage = lazy(() => import('./pages/InsurancePage'));
const BloodBankPage = lazy(() => import('./pages/BloodBankPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const RadiologyPage = lazy(() => import('./pages/RadiologyPage'));
const FinanceReportsPage = lazy(() => import('./pages/FinanceReportsPage'));
const PatientPortalPage = lazy(() => import('./pages/PatientPortalPage'));

// ── New workflow pages ───────────────────────────────────────────────────────
const ReceptionistWorkflow = lazy(() => import('./pages/ReceptionistWorkflow'));
const TriageDashboard = lazy(() => import('./pages/TriageDashboard'));
const OPDCoordinatorDashboard = lazy(() => import('./pages/OPDCoordinatorDashboard'));
const DoctorConsultationPage = lazy(() => import('./pages/DoctorConsultationPage'));
const LabTechDashboard = lazy(() => import('./pages/LabTechDashboard'));
const PharmacyDashboard = lazy(() => import('./pages/PharmacyDashboard'));
const CashierWorkflow = lazy(() => import('./pages/CashierWorkflow'));
const ServicesAdminPage = lazy(() => import('./pages/ServicesAdminPage'));
const DepartmentsAdminPage = lazy(() => import('./pages/DepartmentsAdminPage'));
const OPDQueueDisplay = lazy(() => import('./pages/OPDQueueDisplay'));
const DocumentVerificationPage = lazy(() => import('./pages/DocumentVerificationPage'));
const DoctorShiftManagementPage = lazy(() => import('./pages/DoctorShiftManagementPage'));
const BirthCertificatesPage = lazy(() => import('./pages/board/BirthCertificatesPage'));
const DeathCertificatesPage = lazy(() => import('./pages/board/DeathCertificatesPage'));
const ScholarshipsPage = lazy(() => import('./pages/board/ScholarshipsPage'));
const SpecializationPage = lazy(() => import('./pages/board/SpecializationPage'));
const TrainingDevelopmentPage = lazy(() => import('./pages/board/TrainingDevelopmentPage'));
const BoardMembersPage = lazy(() => import('./pages/board/BoardMembersPage'));
const BoardMeetingsPage = lazy(() => import('./pages/board/BoardMeetingsPage'));
const BoardReportsPage = lazy(() => import('./pages/board/BoardReportsPage'));
const QueueCommandCenter = lazy(() => import('./pages/QueueCommandCenter'));
const PatientQRScannerPage = lazy(() => import('./pages/PatientQRScannerPage'));

// ── Role permission map ──────────────────────────────────────────────────────
const ALL_PAGES = [
  'dashboard', 'doctor-dashboard', 'patients', 'doctors', 'appointments',
  'vitals', 'prescriptions', 'lab-tests', 'admissions', 'invoices', 'payments',
  'reception', 'medicines', 'inventory', 'beds', 'reports', 'admin',
  'user-management', 'admin', 'departments-admin', 'cashier', 'insurance', 'blood-bank', 'audit', 'radiology',
  'finance-reports', 'patient-portal', 'reception-workflow', 'triage',
  'assignment', 'opd-coordinator', 'consultation', 'lab-dashboard', 'pharmacy', 'cashier-workflow',
  'services-admin', 'shifts', 'queue-management', 'qr-scanner',
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
    'services-admin', 'shifts', 'queue-management', 'qr-scanner',
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
    'qr-scanner',
    'birth-certificates', 'death-certificates', 'scholarships', 'specializations',
    'training', 'board-members', 'board-meetings', 'board-reports'
  ],
  receptionist:     ['dashboard', 'patients', 'appointments', 'admissions', 'reception', 'reception-workflow', 'vitals', 'queue-management', 'qr-scanner'],
  doctor:           ['dashboard', 'shifts', 'doctor-dashboard', 'patients', 'doctors', 'appointments', 'vitals', 'prescriptions', 'lab-tests', 'admissions', 'radiology', 'consultation', 'medicines', 'queue-management', 'qr-scanner'],
  nurse:            ['dashboard', 'shifts', 'patients', 'appointments', 'vitals', 'admissions', 'beds', 'triage', 'nurse', 'assignment', 'opd-coordinator', 'queue-management', 'qr-scanner'],
  lab_technician:   ['dashboard', 'shifts', 'lab-tests', 'lab-dashboard', 'patients', 'qr-scanner'],
  pharmacist:       ['dashboard', 'shifts', 'prescriptions', 'medicines', 'inventory', 'pharmacy', 'queue-management', 'qr-scanner'],
  cashier:          ['dashboard', 'invoices', 'payments', 'cashier', 'cashier-dashboard', 'finance-reports', 'cashier-workflow', 'qr-scanner'],
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
          <Suspense fallback={<PageFallback />}>
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
            <Route path="patients/:id" element={
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
            <Route path="qr-scanner" element={
              <ProtectedRoute page="qr-scanner"><PatientQRScannerPage /></ProtectedRoute>
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
          </Suspense>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
