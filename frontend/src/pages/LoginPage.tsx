import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Stethoscope, Eye, EyeOff, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message
        || (err.request ? 'Server did not respond. Please check your network connection.' : 'Login failed. Please check your credentials.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">

        {/* Brand / Illustration panel */}
        <div className="hidden lg:flex flex-col items-start justify-center gap-6 p-10 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-teal-400/10 rounded-2xl flex items-center justify-center">
              <Stethoscope className="w-7 h-7 text-teal-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Alem Ketema Enat</h2>
              <p className="text-xs text-slate-300">Hospital Management System</p>
            </div>
          </div>

          <div className="mt-4 max-w-sm">
            <h3 className="text-3xl font-extrabold leading-tight">Welcome back</h3>
            <p className="mt-3 text-slate-300">Sign in to access the hospital dashboard, appointments, and patient records. If you are a new patient, create an account below.</p>
          </div>

          <div className="mt-6 w-full">
            <div className="w-full h-48 bg-slate-700 rounded-lg opacity-90 flex items-center justify-center text-slate-200">
              <span className="text-sm">Illustration / Hospital image</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="p-8 lg:p-12">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl mb-5" role="alert" aria-live="polite">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" aria-label="Login form">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password" type={showPassword ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-gray-700">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" aria-label="Remember me" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-teal-600 hover:underline">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Patient registration CTA */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-gray-800">New Patient?</p>
            <p className="text-xs text-gray-500 mt-1 mb-3">Create your patient account to manage your health records.</p>
            <Link to="/register"
              className="block w-full py-2.5 border-2 border-teal-500 text-teal-600 font-semibold rounded-xl text-sm hover:bg-teal-500 hover:text-white transition-all">
              Register as a Patient
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Staff accounts are created by the hospital administrator only.</p>
          <Link to="/home" className="block text-teal-600 hover:underline mt-2">← Back to Hospital Website</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
