import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, User as AuthUser } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import api from '../services/api';
import {
  Stethoscope, Eye, EyeOff, AlertCircle, Shield, Building2, User,
  HeartPulse, Receipt, DollarSign, FlaskConical, Pill, Zap, ArrowRight,
  KeyRound, Lock
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout, setUser } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Forced password change state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  const roleRouteMap: Record<string, string> = {
    super_admin: '/dashboard',
    admin: '/dashboard',
    hospital_manager: '/dashboard',
    receptionist: '/reception',
    doctor: '/doctor',
    nurse: '/nurse',
    lab_technician: '/lab-dashboard',
    pharmacist: '/pharmacy',
    cashier: '/cashier-workflow',
    patient: '/patient-portal',
  };

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);
    try {
      const user = await login(loginEmail, loginPass);
      if (user?.mustChangePassword) {
        setPendingUser(user);
        setTempPassword(loginPass);
        setNewPassword('');
        setConfirmPassword('');
        setChangePasswordError('');
        setShowPasswordChangeModal(true);
        return;
      }
      const target = (user && roleRouteMap[user.role]) ? roleRouteMap[user.role] : '/dashboard';
      navigate(target);
    } catch (err: any) {
      const message = err.response?.data?.message
        || (err.response?.data?.errors && err.response.data.errors[0]?.message)
        || (err.request ? 'Server did not respond. Please check your network connection.' : 'Login failed. Please check your credentials.');
      setError(message);
    } finally {
      setLoading(false);
      setLoadingRole(null);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match.');
      return;
    }
    setChangePasswordLoading(true);
    setChangePasswordError('');
    try {
      await api.post('/auth/change-password', {
        oldPassword: tempPassword,
        newPassword: newPassword,
      });

      if (pendingUser) {
        const updatedUser = { ...pendingUser, mustChangePassword: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowPasswordChangeModal(false);
        const target = roleRouteMap[updatedUser.role] || '/dashboard';
        navigate(target);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password. Please check your credentials.';
      setChangePasswordError(msg);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    logout();
    setShowPasswordChangeModal(false);
    setPendingUser(null);
    setTempPassword('');
    setError('Password change is required before accessing your account.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleQuickRoleLogin = (accEmail: string, roleLabel: string) => {
    setEmail(accEmail);
    setPassword('Hospital@2024');
    setLoadingRole(roleLabel);
    performLogin(accEmail, 'Hospital@2024');
  };

  const demoAccounts = [
    { label: 'System Admin', translationKey: 'role.super_admin', email: 'admin@hospital.com', icon: Shield, color: 'hover:bg-purple-50 hover:border-purple-300 text-purple-700' },
    { label: 'Hospital Manager', translationKey: 'role.hospital_manager', email: 'manager@hospital.com', icon: Building2, color: 'hover:bg-sky-50 hover:border-sky-300 text-sky-700' },
    { label: 'Doctor', translationKey: 'role.doctor', email: 'doctor@hospital.com', icon: Stethoscope, color: 'hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700' },
    { label: 'Nurse / Triage', translationKey: 'role.nurse', email: 'nurse@hospital.com', icon: HeartPulse, color: 'hover:bg-rose-50 hover:border-rose-300 text-rose-700' },
    { label: 'Receptionist', translationKey: 'role.receptionist', email: 'reception@hospital.com', icon: Receipt, color: 'hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700' },
    { label: 'Cashier POS', translationKey: 'role.cashier', email: 'cashier@hospital.com', icon: DollarSign, color: 'hover:bg-amber-50 hover:border-amber-300 text-amber-700' },
    { label: 'Lab Tech', translationKey: 'role.lab_tech', email: 'labtech@hospital.com', icon: FlaskConical, color: 'hover:bg-cyan-50 hover:border-cyan-300 text-cyan-700' },
    { label: 'Pharmacist', translationKey: 'role.pharmacist', email: 'pharmacist@hospital.com', icon: Pill, color: 'hover:bg-teal-50 hover:border-teal-300 text-teal-700' },
    { label: 'Patient Portal', translationKey: 'role.patient', email: 'patient@hospital.com', icon: User, color: 'hover:bg-violet-50 hover:border-violet-300 text-violet-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-3 sm:px-6 py-6 sm:py-10 transition-colors">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-slate-200 dark:border-slate-800">

        {/* Brand / Illustration panel */}
        <div className="hidden lg:flex flex-col items-start justify-between p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl flex items-center justify-center shadow-lg">
                <Stethoscope className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  {language === 'am' ? 'አለም ከተማ እናት' : 'Alem Ketema Enat'}
                </h2>
                <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                  {language === 'am' ? 'የሆስፒታል አስተዳደር ሲስተም' : 'Hospital Management System'}
                </p>
              </div>
            </div>

            <div className="mt-4 max-w-sm">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-3">
                {t('auth.role_guarded', 'Role-Guarded Workbench Access')}
              </span>
              <h3 className="text-3xl font-black leading-tight text-white">
                {t('auth.portal_sign_in', 'Clinical Portal Sign In')}
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {t('auth.portal_desc', 'Seamless role switching between Doctor Consultation, Triage Nurse Desk, Reception Invoicing, Pathology Lab, Pharmacy Dispensing, and Cashier POS.')}
              </p>
            </div>
          </div>

          {/* Hospital Preview image */}
          <div className="relative z-10 w-full mt-6">
            <div className="w-full h-44 rounded-2xl overflow-hidden shadow-xl border border-emerald-500/20">
              {!imgError ? (
                <img
                  src="/images/hospital.jpg.webp"
                  alt="Alem Ketema Enat Hospital"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover block"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-300 p-4 text-center">
                  <div>
                    <p className="font-extrabold text-sm text-emerald-400">Alem Ketema Enat Hospital</p>
                    <p className="text-xs text-slate-400 mt-1">North Shoa Zone, Amhara Region</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 w-full flex items-center justify-between text-slate-400 text-[11px] pt-4 border-t border-slate-800">
            <span>© 2026 HMS Platform</span>
            <span>Version 2.4.0 (ETH)</span>
          </div>
        </div>

        {/* Form & 1-Click Actor Switcher Panel */}
        <div className="p-5 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            {/* Mobile Header Branding (Visible on mobile/tablet when left visual panel is hidden) */}
            <div className="lg:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-400/30 rounded-xl flex items-center justify-center text-emerald-500">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                    {language === 'am' ? 'አለም ከተማ እናት' : 'Alem Ketema Enat'}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    {language === 'am' ? 'የሆስፒታል አስተዳደር' : 'Hospital HMS'}
                  </p>
                </div>
              </div>
              <LanguageSwitcher variant="compact" />
            </div>

            <div className="flex items-start justify-between gap-4 mb-5 sm:mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {t('auth.login_title', 'Account Login')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('auth.login_subtitle', 'Enter your credentials or click any 1-Click Actor Account below.')}
                </p>
              </div>
              <div className="hidden lg:block">
                <LanguageSwitcher variant="pill" />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl mb-5" role="alert">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} aria-label="login form" className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.email', 'Email Address')}
                </label>
                <input
                  id="email" type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="user@hospital.com"
                  className="w-full px-4 py-2.5 sm:py-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.password', 'Password')}
                </label>
                <div className="relative">
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 sm:py-3 pr-11 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl text-sm shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && !loadingRole ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('auth.signing_in', 'Signing in...')}</>
                ) : t('auth.sign_in', 'Sign In to Dashboard')}
              </button>
            </form>

            {/* Quick Demo Actor Accounts */}
            <div className="mt-5 sm:mt-6 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-current" />
                  {t('auth.instant_actors', 'Instant 1-Click Actor Logins')}
                </p>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 self-start sm:self-auto">
                  Password: Hospital@2024
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {demoAccounts.map(acc => {
                  const Icon = acc.icon;
                  const isLoadingThis = loadingRole === acc.label;
                  const translatedLabel = t(acc.translationKey, acc.label);
                  const isSuperAdmin = acc.email === 'admin@hospital.com' || acc.email === 'superadmin@hospital.com';

                  return (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickRoleLogin(acc.email, acc.label)}
                      className={`px-3.5 py-2.5 bg-white dark:bg-slate-800 border rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between group shadow-xs hover:shadow-sm disabled:opacity-50 ${
                        isSuperAdmin
                          ? 'border-purple-300 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 hover:bg-purple-100/60 dark:hover:bg-purple-900/30'
                          : `border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 ${acc.color}`
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isSuperAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 group-hover:text-current'}`} />
                        <span className="truncate">{translatedLabel}</span>
                        {isSuperAdmin && (
                          <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-200/80 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                            Executive
                          </span>
                        )}
                      </div>
                      {isLoadingThis ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      ) : (
                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-current group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-5 sm:mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <Link to="/home" className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
              ← {t('auth.back_to_site', 'Back to Hospital Main Website')}
            </Link>
          </div>
        </div>

      </div>

      {/* Force Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {t('auth.change_password_required', 'Set New Secure Password')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('auth.first_login_policy', 'Temporary credentials detected. Hospital security policy requires updating your password before proceeding.')}
                </p>
              </div>
            </div>

            {changePasswordError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.new_password', 'New Password')} (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.confirm_new_password', 'Confirm New Password')}
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelPasswordChange}
                  disabled={changePasswordLoading}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  {t('common.cancel', 'Cancel & Sign Out')}
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {changePasswordLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  {t('auth.save_and_continue', 'Update & Enter Workbench')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
