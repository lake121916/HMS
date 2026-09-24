import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Public pages
import HomePage from './pages/public/HomePage';
import AboutPage from './pages/public/AboutPage';
import ServicesPage from './pages/public/ServicesPage';
import DepartmentsPage from './pages/public/DepartmentsPage';
import DoctorsPublicPage from './pages/public/DoctorsPublicPage';
import ContactPage from './pages/public/ContactPage';
import SearchResults from './pages/public/SearchResults';

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
import UserManagementPage from './pages/UserManagementPage';
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
import AssignmentDashboard from './pages/AssignmentDashboard';
import DoctorConsultationPage from './pages/DoctorConsultationPage';
import LabTechDashboard from './pages/LabTechDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import CashierWorkflow from './pages/CashierWorkflow';

// ── Role permission map ──────────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin:      ['dashboard','patients','doctors','appointments','vitals','prescriptions','lab-tests','reports','admin','user-management','insurance','blood-bank','audit','radiology','finance-reports','assignment','services-admin'],
  admin:            ['dashboard','patients','doctors','appointments','admissions','beds','invoices','payments','medicines','inventory','reports','admin','user-management','insurance','blood-bank','audit','radiology','finance-reports','cashier','assignment','services-admin'],
  hospital_manager: ['dashboard','patients','doctors','appointments','admissions','beds','invoices','payments','reports','insurance','blood-bank','radiology','finance-reports','cashier'],
  receptionist:     ['patients','appointments','admissions','invoices','reception','reception-workflow'],
  doctor:           ['dashboard','doctor-dashboard','patients','appointments','vitals','prescriptions','lab-tests','admissions','radiology','consultation'],
  nurse:            ['patients','appointments','vitals','admissions','beds','triage'],
  lab_technician:   ['lab-tests','lab-dashboard'],
  pharmacist:       ['prescriptions','medicines','inventory','pharmacy'],
  cashier:          ['invoices','payments','cashier','finance-reports','cashier-workflow'],
  patient:          ['patient-portal','appointments'],
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

  // Page-level role check
  if (page && user) {
    const allowed = ROLE_PERMISSIONS[user.role] || [];
    if (!allowed.includes(page)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Root → home page */}
          <Route index element={<Navigate to="/home" replace />} />

          {/* ── Public website ── */}
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/our-doctors" element={<DoctorsPublicPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/search" element={<SearchResults />} />

          {/* ── Auth ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── Protected HMS portal (role-guarded) ── */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
            <Route path="user-management" element={
              <ProtectedRoute page="user-management"><UserManagementPage /></ProtectedRoute>
            } />

            {/* ── New Workflow Routes ──────────────────────────────── */}
            <Route path="reception-workflow" element={
              <ProtectedRoute page="reception-workflow"><ReceptionistWorkflow /></ProtectedRoute>
            } />
            <Route path="triage" element={
              <ProtectedRoute page="triage"><TriageDashboard /></ProtectedRoute>
            } />
            <Route path="assignment" element={
              <ProtectedRoute page="assignment"><AssignmentDashboard /></ProtectedRoute>
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
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
