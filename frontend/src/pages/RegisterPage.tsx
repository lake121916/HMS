import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', dateOfBirth: '', gender: 'female', address: '', bloodType: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validateStep1 = () => {
    if (!form.firstName || !form.lastName) return 'First and last name are required.';
    if (!form.email.includes('@')) return 'Please enter a valid email.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const validateStep2 = () => {
    if (!form.phone) return 'Phone number is required.';
    if (!form.dateOfBirth) return 'Date of birth is required.';
    if (!form.gender) return 'Gender is required.';
    return '';
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: form.address || undefined,
        bloodType: form.bloodType || undefined,
      });

      // Registration successful - redirect to login with message
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3 shadow-lg">
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Alem Ketema Enat Hospital</h1>
          <p className="text-sm text-blue-600 font-medium mt-0.5">Patient Registration Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Step indicator */}
          <div className="bg-blue-600 px-6 py-4 flex items-center gap-4">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step > s ? 'bg-green-400 text-white' : step === s ? 'bg-white text-blue-600' : 'bg-blue-500 text-blue-200'
                }`}>
                  {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                <span className={`text-xs font-medium ${step === s ? 'text-white' : 'text-blue-300'}`}>
                  {s === 1 ? 'Account Details' : 'Personal Info'}
                </span>
                {s < 2 && <div className="flex-1 h-0.5 bg-blue-500 mx-2" />}
              </div>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* ── Step 1: Account ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Create Your Account</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input name="firstName" type="text" required value={form.firstName} onChange={handleChange}
                      className={inputClass} placeholder="Abebe" />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input name="lastName" type="text" required value={form.lastName} onChange={handleChange}
                      className={inputClass} placeholder="Girma" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email Address *</label>
                  <input name="email" type="email" required value={form.email} onChange={handleChange}
                    className={inputClass} placeholder="abebe@email.com" />
                </div>
                <div>
                  <label className={labelClass}>Password *</label>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} required value={form.password} onChange={handleChange}
                      className={inputClass + ' pr-10'} placeholder="Min. 6 characters" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="flex gap-1 mt-1.5">
                      {['weak', 'fair', 'good', 'strong'].map((level, i) => (
                        <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${
                          form.password.length > i * 3
                            ? ['bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][i]
                            : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Confirm Password *</label>
                  <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange}
                    className={inputClass + (form.confirmPassword && form.confirmPassword !== form.password ? ' border-red-400' : '')}
                    placeholder="Repeat password" />
                  {form.confirmPassword && form.confirmPassword !== form.password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
                <button type="button" onClick={handleNext}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm mt-2">
                  Continue →
                </button>
              </div>
            )}

            {/* ── Step 2: Personal Info ── */}
            {step === 2 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Phone Number *</label>
                    <input name="phone" type="tel" required value={form.phone} onChange={handleChange}
                      className={inputClass} placeholder="+251 91 234 5678" />
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth *</label>
                    <input name="dateOfBirth" type="date" required value={form.dateOfBirth} onChange={handleChange}
                      max={new Date().toISOString().split('T')[0]} className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Gender *</label>
                    <select name="gender" required value={form.gender} onChange={handleChange} className={inputClass}>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Blood Type</label>
                    <select name="bloodType" value={form.bloodType} onChange={handleChange} className={inputClass}>
                      <option value="">Unknown</option>
                      {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Home Address</label>
                  <input name="address" type="text" value={form.address} onChange={handleChange}
                    className={inputClass} placeholder="Street, Kebele, City" />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  By registering, you agree to share your health information with Enketema Enat Hospital for the purpose of receiving medical care. Your data is kept confidential.
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-sm">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60 flex-1">
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                    ) : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="text-center mt-5 space-y-2">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
          </p>
          <p className="text-xs text-gray-400">
            Staff member?{' '}
            <span className="text-gray-500">Contact your administrator for login credentials.</span>
          </p>
          <Link to="/home" className="text-xs text-blue-500 hover:underline block">← Back to Hospital Website</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
