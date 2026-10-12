import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  Stethoscope, Eye, EyeOff, AlertCircle, Shield, UserCheck,
  HeartPulse, Receipt, DollarSign, FlaskConical, Pill, Zap, ArrowRight
} from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [imgError, setImgError] = useState(false);

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
    { label: 'Super Admin', translationKey: 'role.super_admin', email: 'superadmin@hospital.com', icon: Shield, color: 'hover:bg-purple-50 hover:border-purple-300 text-purple-700' },
    { label: 'Admin', translationKey: 'role.admin', email: 'admin@hospital.et', icon: UserCheck, color: 'hover:bg-blue-50 hover:border-blue-300 text-blue-700' },
    { label: 'Doctor', translationKey: 'role.doctor', email: 'doctor@hospital.com', icon: Stethoscope, color: 'hover:bg-emerald-50 hover:border-emerald-300 text-emerald-700' },
    { label: 'Nurse / Triage', translationKey: 'role.nurse', email: 'nurse@gmail.com', icon: HeartPulse, color: 'hover:bg-rose-50 hover:border-rose-300 text-rose-700' },
    { label: 'Receptionist', translationKey: 'role.receptionist', email: 'reception@hospital.com', icon: Receipt, color: 'hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700' },
    { label: 'Cashier POS', translationKey: 'role.cashier', email: 'cashier@hospital.com', icon: DollarSign, color: 'hover:bg-amber-50 hover:border-amber-300 text-amber-700' },
    { label: 'Lab Tech', translationKey: 'role.lab_tech', email: 'labtech@hospital.com', icon: FlaskConical, color: 'hover:bg-cyan-50 hover:border-cyan-300 text-cyan-700' },
    { label: 'Pharmacist', translationKey: 'role.pharmacist', email: 'pharmacist@hospital.com', icon: Pill, color: 'hover:bg-teal-50 hover:border-teal-300 text-teal-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-4 py-10 transition-colors">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 border border-slate-200 dark:border-slate-800">

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
        <div className="p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  {t('auth.login_title', 'Account Login')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('auth.login_subtitle', 'Enter your credentials or click any 1-Click Actor Account below.')}
                </p>
              </div>
              <LanguageSwitcher variant="pill" />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl mb-5" role="alert">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-red-600 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.email', 'Email Address')}
                </label>
                <input
                  id="email" type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="user@hospital.com"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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
                    className="w-full px-4 py-3 pr-11 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium dark:bg-slate-800 dark:text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl text-sm shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && !loadingRole ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t('auth.signing_in', 'Signing in...')}</>
                ) : t('auth.sign_in', 'Sign In to Dashboard')}
              </button>
            </form>

            {/* Quick Demo Actor Accounts */}
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-current" />
                  {t('auth.instant_actors', 'Instant 1-Click Actor Logins')}
                </p>
                <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                  Password: Hospital@2024
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map(acc => {
                  const Icon = acc.icon;
                  const isLoadingThis = loadingRole === acc.label;
                  const translatedLabel = t(acc.translationKey, acc.label);
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickRoleLogin(acc.email, acc.label)}
                      className={`px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-all text-left flex items-center justify-between group shadow-sm ${acc.color} disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-4 h-4 text-slate-400 group-hover:text-current transition-colors flex-shrink-0" />
                        <span className="truncate">{translatedLabel}</span>
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
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <Link to="/home" className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
              ← {t('auth.back_to_site', 'Back to Hospital Main Website')}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
