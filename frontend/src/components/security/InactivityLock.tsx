/**
 * Hospital Workstation Inactivity Lock & Patient Privacy Guard
 * Alem Ketema Enat Hospital Management System
 * Conforms to Healthcare Computer Privacy & Multi-Tab Synchronization
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Shield, Lock, AlertTriangle, KeyRound, LogOut, Clock } from 'lucide-react';

interface InactivityLockProps {
  children: React.ReactNode;
  /** Timeout in minutes (default 5, min 5, max 10) */
  timeoutMinutes?: number;
  /** Warning countdown in seconds before lock (default 60) */
  warningSeconds?: number;
}

export const InactivityLock: React.FC<InactivityLockProps> = ({
  children,
  timeoutMinutes = 5,
  warningSeconds = 60
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('hms_is_locked') === 'true';
  });
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(warningSeconds);
  const [unlockPassword, setUnlockPassword] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState<boolean>(false);

  const timeoutMs = Math.max(5, Math.min(10, timeoutMinutes)) * 60 * 1000;
  const warningMs = warningSeconds * 1000;
  const lastActivityRef = useRef<number>(Date.now());
  const timerCheckRef = useRef<any>(null);

  // Record user interaction
  const recordActivity = useCallback(() => {
    if (isLocked) return; // Do not reset timer while locked
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem('hms_last_activity', String(now));
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(warningSeconds);
    }
  }, [isLocked, showWarning, warningSeconds]);

  // Attach event listeners for user input
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const throttledHandler = () => {
      // Throttle recording to once every 2 seconds to reduce localStorage writes
      if (Date.now() - lastActivityRef.current > 2000) {
        recordActivity();
      }
    };

    events.forEach(evt => window.addEventListener(evt, throttledHandler, { passive: true }));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, throttledHandler));
    };
  }, [isAuthenticated, recordActivity]);

  // Multi-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hms_is_locked') {
        setIsLocked(e.newValue === 'true');
      } else if (e.key === 'hms_last_activity' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue, 10);
        if (showWarning) setShowWarning(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [showWarning]);

  // Periodic heartbeat checker
  useEffect(() => {
    if (!isAuthenticated) return;

    timerCheckRef.current = setInterval(() => {
      if (isLocked) return;

      const storedActivity = parseInt(localStorage.getItem('hms_last_activity') || String(Date.now()), 10);
      const effectiveLastActivity = Math.max(lastActivityRef.current, storedActivity);
      const elapsed = Date.now() - effectiveLastActivity;

      if (elapsed >= timeoutMs) {
        // Trigger lock
        setIsLocked(true);
        setShowWarning(false);
        localStorage.setItem('hms_is_locked', 'true');
      } else if (elapsed >= timeoutMs - warningMs) {
        // Trigger warning countdown
        const remaining = Math.max(1, Math.ceil((timeoutMs - elapsed) / 1000));
        setShowWarning(true);
        setSecondsRemaining(remaining);
      } else {
        if (showWarning) setShowWarning(false);
      }
    }, 1000);

    return () => {
      if (timerCheckRef.current) clearInterval(timerCheckRef.current);
    };
  }, [isAuthenticated, isLocked, timeoutMs, warningMs, showWarning]);

  // Handle password unlock
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) {
      setUnlockError('Password is required to resume workstation.');
      return;
    }

    setUnlocking(true);
    setUnlockError(null);

    try {
      await api.post('/auth/unlock', { password: unlockPassword });
      // Successful reauthentication
      setIsLocked(false);
      setShowWarning(false);
      setUnlockPassword('');
      localStorage.setItem('hms_is_locked', 'false');
      recordActivity();
    } catch (err: any) {
      setUnlockError(err.response?.data?.message || 'Invalid password. Workstation remains locked.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('hms_is_locked');
    logout();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Underlying protected content */}
      <div className={isLocked ? 'filter blur-md select-none pointer-events-none' : ''}>
        {children}
      </div>

      {/* 1. Countdown Warning Modal (60s before lock) */}
      {showWarning && !isLocked && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-2xl shadow-2xl p-5 animate-bounce">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Inactivity Privacy Alert
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                To protect patient privacy, this hospital terminal will lock in{' '}
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{secondsRemaining}s</span>.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={recordActivity}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  I'm Still Working
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Full-Screen Workstation Lock Screen */}
      {isLocked && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

            <div className="mx-auto w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-5 shadow-inner">
              <Lock className="h-8 w-8" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
              <Shield className="h-3.5 w-3.5" /> Alem Ketema Enat Hospital
            </span>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Workstation Locked
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Protected Health Information (PHI) obscured due to inactivity. Enter your password to resume.
            </p>

            {/* Staff info card */}
            <div className="mt-5 p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-left flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Authenticated Staff</p>
                <p className="text-sm font-semibold text-slate-200">{user?.email || 'Medical Practitioner'}</p>
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                {user?.role?.replace('_', ' ')}
              </span>
            </div>

            {/* Unlock Form */}
            <form onSubmit={handleUnlock} className="mt-5 space-y-4">
              <div className="relative text-left">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Re-enter Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    autoFocus
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    placeholder="Enter your login password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {unlockError && (
                <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2 text-left">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <span>{unlockError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={unlocking}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {unlocking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Unlock Workstation
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Idle auto-lock (5 min)</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-slate-400 hover:text-red-400 transition flex items-center gap-1 font-medium"
              >
                <LogOut className="h-3.5 w-3.5" />
                Switch User
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InactivityLock;
