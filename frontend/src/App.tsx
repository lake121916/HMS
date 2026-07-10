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

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Protected HMS pages
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import DoctorsPage from './pages/DoctorsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import VitalsPage from './pages/VitalsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import LabTestsPage from './pages/LabTestsPage';
import AdmissionsPage from './pages/AdmissionsPage';
import InvoicesPage from './pages/InvoicesPage';
import PaymentsPage from './pages/PaymentsPage';
import MedicinesPage from './pages/MedicinesPage';
import InventoryPage from './pages/InventoryPage';
import BedsPage from './pages/BedsPage';
import ReportsPage from './pages/ReportsPage';
import AdminPage from './pages/AdminPage';
import UserManagementPage from './pages/UserManagementPage';
import CashierDashboard from './pages/CashierDashboard';

// ── Role permission map ──────────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['dashboard','patients','doctors','appointments','vitals','prescriptions','lab-tests','reports','admin','user-management'],
  admin:       ['dashboard','patients','doctors','appointments','admissions','beds','invoices','payments','medicines','inventory','reports','admin','user-management'],
  hospital_manager: ['dashboard','patients','doctors','appointments','admissions','beds','invoices','payments','reports'],
  receptionist:['dashboard','patients','appointments','admissions','invoices','payments'],
  doctor:      ['dashboard','patients','appointments','vitals','prescriptions','lab-tests','admissions'],
  nurse:       ['dashboard','patients','appointments','vitals','admissions','beds'],
  lab_technician: ['dashboard','lab-tests'],
  pharmacist:  ['dashboard','prescriptions','medicines','inventory'],
  cashier:     ['dashboard','invoices','payments'],
  patient:     ['dashboard','appointments'],
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

          {/* ── Auth ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* ── Protected HMS portal (role-guarded) ── */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={
              <ProtectedRoute page="dashboard"><DashboardPage /></ProtectedRoute>
            } />
            <Route path="patients" element={
              <ProtectedRoute page="patients"><PatientsPage /></ProtectedRoute>
            } />
            <Route path="doctors" element={
              <ProtectedRoute page="doctors"><DoctorsPage /></ProtectedRoute>
            } />
            <Route path="appointments" element={
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
            <Route path="payments" element={
              <ProtectedRoute page="payments"><PaymentsPage /></ProtectedRoute>
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
            <Route path="cashier" element={
              <ProtectedRoute page="payments"><CashierDashboard /></ProtectedRoute>
            } />
            <Route path="admin" element={
              <ProtectedRoute page="admin"><AdminPage /></ProtectedRoute>
            } />
            <Route path="user-management" element={
              <ProtectedRoute page="user-management"><UserManagementPage /></ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
