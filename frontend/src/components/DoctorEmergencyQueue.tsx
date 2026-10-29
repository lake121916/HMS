import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getHospitalSocket } from '../services/socket';
import { playEmergencyAlertSound, setEmergencyMuted, isEmergencyMuted } from '../utils/emergencyAudio';
import {
  AlertOctagon, Clock, Volume2, VolumeX, ArrowUpRight,
  Wifi, WifiOff, Stethoscope, Check, X
} from 'lucide-react';

export interface EmergencyAlertItem {
  id: number;
  encounter_id: number;
  encounter_number: string;
  patient_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  blood_type?: string;
  department_id?: number;
  department_name?: string;
  priority: 'emergency' | 'critical' | 'resuscitation';
  reason: string;
  status: 'active' | 'acknowledged' | 'in_assessment' | 'escalated' | 'resolved';
  escalation_level: number;
  last_escalated_at?: string;
  acknowledged_by?: number;
  acknowledged_by_name?: string;
  acknowledged_at?: string;
  in_assessment_by?: number;
  in_assessment_by_name?: string;
  in_assessment_at?: string;
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  chief_complaint?: string;
  preliminary_observations?: string;
  created_at: string;
}

interface Props {
  onSelectEncounter?: (encounterId: number) => void;
  activeEncounterId?: number;
}

export const DoctorEmergencyQueue: React.FC<Props> = ({ onSelectEncounter, activeEncounterId }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<EmergencyAlertItem[]>([]);
  const [isMuted, setIsMuted] = useState(isEmergencyMuted());
  const [socketConnected, setSocketConnected] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<EmergencyAlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Timer to update elapsed seconds continuously
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchActiveAlerts = async () => {
    try {
      const res = await api.get('/emergency/active');
      if (res.data?.success) {
        setAlerts(res.data.data || []);
      }
    } catch (err) {
      console.warn('Could not load emergency alerts:', err);
    }
  };

  useEffect(() => {
    fetchActiveAlerts();
    // Fallback polling every 12 seconds in case socket drops
    const pollInterval = setInterval(fetchActiveAlerts, 12000);

    const socket = getHospitalSocket(user);
    if (socket) {
      setSocketConnected(socket.connected);

      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);

      const onEmergencyAlert = () => {
        playEmergencyAlertSound();
        fetchActiveAlerts();
      };

      const onEmergencyUpdated = () => {
        fetchActiveAlerts();
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('emergency:alert', onEmergencyAlert);
      socket.on('emergency:acknowledged', onEmergencyUpdated);
      socket.on('emergency:in_assessment', onEmergencyUpdated);
      socket.on('emergency:escalated', onEmergencyAlert);
      socket.on('emergency:resolved', onEmergencyUpdated);

      return () => {
        clearInterval(pollInterval);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('emergency:alert', onEmergencyAlert);
        socket.off('emergency:acknowledged', onEmergencyUpdated);
        socket.off('emergency:in_assessment', onEmergencyUpdated);
        socket.off('emergency:escalated', onEmergencyAlert);
        socket.off('emergency:resolved', onEmergencyUpdated);
      };
    }

    return () => clearInterval(pollInterval);
  }, [user]);

  const handleAcknowledge = async (alertId: number) => {
    setActionLoading(alertId);
    try {
      await api.put(`/emergency/alerts/${alertId}/acknowledge`);
      await fetchActiveAlerts();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBeginAssessment = async (alertItem: EmergencyAlertItem) => {
    setActionLoading(alertItem.id);
    try {
      await api.put(`/emergency/alerts/${alertItem.id}/begin-assessment`);
      if (onSelectEncounter) {
        onSelectEncounter(alertItem.encounter_id);
      }
      await fetchActiveAlerts();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Failed to begin assessment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async (alertId: number) => {
    const reason = prompt('State clinical reason for escalating this emergency alert:', 'Condition deteriorating / immediate senior assistance required');
    if (!reason) return;

    setActionLoading(alertId);
    try {
      await api.put(`/emergency/alerts/${alertId}/escalate`, { reason });
      await fetchActiveAlerts();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Failed to escalate emergency alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert || !resolutionNotes.trim()) return;

    setActionLoading(resolvingAlert.id);
    try {
      await api.put(`/emergency/alerts/${resolvingAlert.id}/resolve`, {
        resolution_notes: resolutionNotes.trim()
      });
      setResolvingAlert(null);
      setResolutionNotes('');
      await fetchActiveAlerts();
    } catch (err: any) {
      window.alert(err.response?.data?.message || 'Failed to resolve emergency alert');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setEmergencyMuted(next);
    if (!next) {
      playEmergencyAlertSound();
    }
  };

  const formatElapsed = (isoTime: string) => {
    const diffMs = Math.max(0, now - new Date(isoTime).getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const unacknowledgedCount = alerts.filter(a => a.status === 'active' || a.status === 'escalated').length;

  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl px-5 py-3.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider">Emergency Status: Normal</span>
          <span className="text-emerald-600 dark:text-emerald-400">· 0 active Code Red emergencies in hospital queue</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            {socketConnected ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-amber-500" />}
            {socketConnected ? 'Live Connection' : 'Polling'}
          </span>
          <button
            onClick={toggleMute}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-gray-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
            {isMuted ? 'Alarm Muted' : 'Alarm Active'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl p-5 shadow-xl border-2 border-red-500 animate-pulse-subtle">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <AlertOctagon className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-wide uppercase">
                🚨 Emergency / Code Red Queue — ድንገተኛ
              </h2>
              {unacknowledgedCount > 0 && (
                <span className="bg-white text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm">
                  {unacknowledgedCount} UNACKNOWLEDGED
                </span>
              )}
            </div>
            <p className="text-xs text-white/80">
              Immediate physician intervention required. Bypasses standard OPD queue.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1 rounded-lg">
            {socketConnected ? <Wifi className="w-3.5 h-3.5 text-green-300" /> : <WifiOff className="w-3.5 h-3.5 text-amber-300" />}
            <span>{socketConnected ? 'WebSocket Online' : 'Polling Safe-Mode'}</span>
          </span>
          <button
            onClick={toggleMute}
            className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl font-medium transition-colors"
            title={isMuted ? 'Unmute Emergency Siren' : 'Mute Emergency Siren'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-amber-200" /> : <Volume2 className="w-4 h-4 text-green-200" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        </div>
      </div>

      {/* Emergency List */}
      <div className="mt-3.5 space-y-3">
        {alerts.map((alert) => {
          const isSelected = activeEncounterId === alert.encounter_id;
          const isUnack = alert.status === 'active' || alert.status === 'escalated';

          return (
            <div
              key={alert.id}
              className={`bg-white text-gray-900 rounded-xl p-4 shadow-md transition-all ${
                isSelected ? 'ring-4 ring-yellow-300' : ''
              } ${isUnack ? 'border-l-8 border-red-600' : 'border-l-8 border-amber-500'}`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                {/* Patient & Alert Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {alert.priority}
                    </span>
                    {alert.escalation_level > 0 && (
                      <span className="bg-purple-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Level {alert.escalation_level} Escalated
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      alert.status === 'active' ? 'bg-red-100 text-red-800' :
                      alert.status === 'acknowledged' ? 'bg-blue-100 text-blue-800' :
                      alert.status === 'in_assessment' ? 'bg-green-100 text-green-800' :
                      alert.status === 'escalated' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Status: {alert.status.replace(/_/g, ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3" /> Waiting: {formatElapsed(alert.created_at)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-base font-black text-gray-900 leading-tight">
                      {alert.first_name} {alert.last_name}
                    </h3>
                    <span className="text-xs font-mono text-gray-500">
                      [{alert.encounter_number}]
                    </span>
                    {alert.blood_type && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Blood: {alert.blood_type}
                      </span>
                    )}
                    {alert.gender && (
                      <span className="text-xs text-gray-500">· {alert.gender}</span>
                    )}
                    {alert.phone && (
                      <span className="text-xs text-gray-500">· {alert.phone}</span>
                    )}
                    {alert.department_name && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        Dept: {alert.department_name}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs font-medium text-gray-800 line-clamp-1">
                    <span className="font-bold text-red-700">Reason / Chief Complaint: </span>
                    {alert.reason || alert.chief_complaint || 'Critical presentation flagged in triage'}
                  </p>

                  {/* Vitals snapshot */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-600 font-medium">
                    {alert.blood_pressure_systolic && alert.blood_pressure_diastolic && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        BP: <strong className="text-gray-900">{alert.blood_pressure_systolic}/{alert.blood_pressure_diastolic}</strong> mmHg
                      </span>
                    )}
                    {alert.heart_rate && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        Pulse: <strong className="text-gray-900">{alert.heart_rate}</strong> bpm
                      </span>
                    )}
                    {alert.oxygen_saturation && (
                      <span className={`px-2 py-0.5 rounded ${alert.oxygen_saturation < 92 ? 'bg-red-100 text-red-800 font-bold' : 'bg-gray-100'}`}>
                        SpO₂: <strong className="text-gray-900">{alert.oxygen_saturation}%</strong>
                      </span>
                    )}
                    {alert.temperature && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        Temp: <strong className="text-gray-900">{alert.temperature}</strong>°C
                      </span>
                    )}
                  </div>

                  {/* Clinician acknowledgment note */}
                  {alert.acknowledged_by_name && (
                    <p className="mt-1 text-[10px] text-gray-500 italic">
                      ✓ Acknowledged by Dr./Staff: {alert.acknowledged_by_name} at {new Date(alert.acknowledged_at || '').toLocaleTimeString()}
                    </p>
                  )}
                  {alert.in_assessment_by_name && (
                    <p className="text-[10px] text-emerald-600 font-bold">
                      ⚕ Under assessment by: {alert.in_assessment_by_name}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-shrink-0 w-full lg:w-auto">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={actionLoading === alert.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Acknowledge
                    </button>
                  )}

                  <button
                    onClick={() => handleBeginAssessment(alert)}
                    disabled={actionLoading === alert.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Stethoscope className="w-4 h-4" /> Open & Treat
                  </button>

                  <button
                    onClick={() => handleEscalate(alert.id)}
                    disabled={actionLoading === alert.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    title="Escalate to Chief of Emergency / Senior Physician"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                  </button>

                  <button
                    onClick={() => {
                      setResolvingAlert(alert);
                      setResolutionNotes('');
                    }}
                    disabled={actionLoading === alert.id}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolution Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b">
              <h3 className="text-base font-bold text-gray-900">
                Close & Resolve Emergency Alert
              </h3>
              <button
                onClick={() => setResolvingAlert(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-4">
              <div className="p-3 bg-red-50 text-red-900 rounded-xl text-xs">
                <strong>Patient:</strong> {resolvingAlert.first_name} {resolvingAlert.last_name} ({resolvingAlert.encounter_number})
                <br />
                <strong>Initial Reason:</strong> {resolvingAlert.reason}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Clinical Disposition / Resolution Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Patient stabilized, admitted to ICU, or acute symptoms treated with normal vitals resumed."
                  className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 border text-xs font-semibold rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === resolvingAlert.id || !resolutionNotes.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
