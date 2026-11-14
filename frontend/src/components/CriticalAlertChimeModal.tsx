import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getHospitalSocket } from '../services/socket';
import { AlertTriangle, BellRing, Check, Clock, X } from 'lucide-react';

interface CriticalAlertData {
  type: string;
  patientId: number;
  patientName: string;
  testName?: string;
  vitalType?: string;
  vitalValue?: string | number;
  threshold?: string | number;
  severity: string;
  message: string;
  timestamp: string;
}

// Generates an audible clinical alert chime using HTML5 Web Audio API
const playClinicalAlertTone = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.35); // D6
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.35);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (e) {
    console.warn('Audio tone not allowed or supported:', e);
  }
};

export const CriticalAlertChimeModal: React.FC = () => {
  const { user } = useAuth();
  const [activeAlert, setActiveAlert] = useState<CriticalAlertData | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    // Only clinical roles need the high-priority critical alerts
    const clinicalRoles = ['doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager'];
    if (!user || !clinicalRoles.includes(user.role)) return;

    const socket = getHospitalSocket(user);

    const handleCriticalAlert = (data: CriticalAlertData) => {
      console.log('CRITICAL ALERT RECEIVED:', data);
      setActiveAlert(data);
      setAcknowledged(false);
      playClinicalAlertTone();
    };

    socket.on('critical-alert', handleCriticalAlert);

    return () => {
      socket.off('critical-alert', handleCriticalAlert);
    };
  }, [user]);

  if (!activeAlert) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-red-600 dark:bg-red-950 text-white rounded-2xl shadow-2xl border-2 border-red-400 p-4 relative overflow-hidden ring-4 ring-red-500/30">
        {/* Pulsing indicator strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-red-300 to-amber-300 animate-pulse" />

        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white/20 rounded-xl shrink-0 animate-bounce">
            <AlertTriangle className="w-6 h-6 text-amber-200" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-red-800/80 px-2 py-0.5 rounded text-amber-200 inline-flex items-center gap-1">
                <BellRing className="w-3 h-3 animate-ping" /> CRITICAL CLINICAL ALERT
              </span>
              <span className="text-[11px] text-red-100 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {new Date(activeAlert.timestamp || Date.now()).toLocaleTimeString()}
              </span>
            </div>

            <h4 className="font-extrabold text-sm sm:text-base text-white mt-1.5 leading-snug">
              {activeAlert.message || 'Critical laboratory result or physiological vital threshold breached.'}
            </h4>

            <div className="mt-2 text-xs bg-red-700/60 dark:bg-red-900/60 rounded-xl p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-red-200">Patient:</span>
                <span className="font-bold text-white">{activeAlert.patientName} (ID: #{activeAlert.patientId})</span>
              </div>
              {activeAlert.testName && (
                <div className="flex items-center justify-between">
                  <span className="text-red-200">Investigation:</span>
                  <span className="font-bold text-amber-200">{activeAlert.testName}</span>
                </div>
              )}
              {activeAlert.vitalType && (
                <div className="flex items-center justify-between">
                  <span className="text-red-200">{activeAlert.vitalType}:</span>
                  <span className="font-bold text-amber-200">{activeAlert.vitalValue} (Threshold: {activeAlert.threshold})</span>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAcknowledged(true);
                  setTimeout(() => setActiveAlert(null), 300);
                }}
                className="px-4 py-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-black rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {acknowledged ? 'Acknowledged ✓' : 'Acknowledge Clinical Alert'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveAlert(null)}
            className="text-white/60 hover:text-white transition p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CriticalAlertChimeModal;
