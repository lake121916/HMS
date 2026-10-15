/**
 * Public OPD Waiting Room TV Display & Patient Calling System
 * Alem Ketema Enat Hospital Management System
 * High-Contrast Large-Screen Dashboard with Real-Time WebSockets, Audio Chime & Speech Synthesizer
 */

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import io from 'socket.io-client';
import {
  Volume2, VolumeX, Maximize2, Minimize2, Radio,
  Clock, Shield, UserCheck, Stethoscope
} from 'lucide-react';

interface QueueItem {
  id: number;
  queue_token: string;
  token_number: number;
  status: 'waiting' | 'next' | 'called' | 'in_consultation' | 'completed';
  priority: 'emergency' | 'urgent' | 'normal';
  consultation_room: string;
  department_name: string;
  doctor_name?: string;
  called_at?: string;
}

interface CallEvent {
  eventId: string;
  queueToken: string;
  tokenNumber: number;
  departmentName: string;
  doctorName: string;
  consultationRoom: string;
  calledAt: string;
}

export const OPDQueueDisplay: React.FC = () => {
  const [currentlyCalled, setCurrentlyCalled] = useState<QueueItem[]>([]);
  const [inConsultation, setInConsultation] = useState<QueueItem[]>([]);
  const [nextPatients, setNextPatients] = useState<QueueItem[]>([]);
  const [waitingList, setWaitingList] = useState<QueueItem[]>([]);
  const [departmentTitle, setDepartmentTitle] = useState<string>('Outpatient Department');
  const [connected, setConnected] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Audio settings
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<'chime_and_voice' | 'chime_only' | 'muted'>('chime_and_voice');
  const [lastAnnouncedCall, setLastAnnouncedCall] = useState<CallEvent | null>(null);

  const processedEventsRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial queue data
  const fetchQueueData = async () => {
    try {
      const res = await api.get('/opd/display');
      const data = res.data.data;
      setCurrentlyCalled(data.currentlyCalled || []);
      setInConsultation(data.inConsultation || []);
      setNextPatients(data.nextPatients || []);
      setWaitingList(data.waitingList || []);
      if (data.department) setDepartmentTitle(data.department);
    } catch (err) {
      console.error('Failed to fetch OPD display data:', err);
    }
  };

  useEffect(() => {
    fetchQueueData();
    // 8-second polling fallback
    const pollInterval = setInterval(fetchQueueData, 8000);
    return () => clearInterval(pollInterval);
  }, []);

  // Web Audio Hospital Dual-Tone Chime Synthesizer
  const playHospitalChime = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1: High note (659.25 Hz - E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: Harmonious lower note (523.25 Hz - C5) after 0.25s
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.25);
      gain2.gain.setValueAtTime(0.35, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.0);
    } catch (err) {
      console.error('Web Audio error:', err);
    }
  };

  // Browser Voice Synthesizer
  const speakAnnouncement = (call: CallEvent) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const text = `Token number ${call.tokenNumber}, please proceed to ${call.consultationRoom}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  };

  // Trigger announcement with deduplication
  const triggerCallAnnouncement = (call: CallEvent) => {
    if (!call.eventId || processedEventsRef.current.has(call.eventId)) {
      return;
    }
    processedEventsRef.current.add(call.eventId);
    setLastAnnouncedCall(call);

    if (!audioEnabled || audioMode === 'muted') return;

    // Play chime first
    playHospitalChime();

    // If chime and voice mode, speak after chime finishes
    if (audioMode === 'chime_and_voice') {
      setTimeout(() => {
        speakAnnouncement(call);
      }, 700);
    }
  };

  // Socket.io Real-Time connection
  useEffect(() => {
    const socketUrl = ((window as any).REACT_APP_API_URL || window.location.origin).replace(':3000', ':5000').replace('/api', '');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      setConnected(true);
      console.log('OPD Display connected to hospital WebSocket network');
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Listen for call event
    socket.on('opd-patient-called', (event: CallEvent) => {
      console.log('Patient called event received:', event);
      triggerCallAnnouncement(event);
      fetchQueueData();
    });

    // Listen for general queue updates
    socket.on('opd-queue-update', () => {
      fetchQueueData();
    });

    return () => {
      socket.disconnect();
    };
  }, [audioEnabled, audioMode]);

  // Enable audio button (fulfills browser user-interaction autoplay requirement)
  const handleEnableAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setAudioEnabled(true);
    // Play test chime so staff confirms sound works
    playHospitalChime();
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* ── Top TV Header Bar ────────────────────────────────────────── */}
      <header className="px-8 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
              Alem Ketema Enat Hospital
            </h1>
            <p className="text-xs md:text-sm text-blue-400 font-semibold tracking-wider uppercase">
              {departmentTitle} — Outpatient Department Queue
            </p>
          </div>
        </div>

        {/* Status Indicators & TV Controls */}
        <div className="flex items-center gap-5">
          {/* Audio controls */}
          {!audioEnabled ? (
            <button
              onClick={handleEnableAudio}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition animate-pulse"
            >
              <VolumeX className="h-4 w-4" />
              <span>Click to Enable Audio</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 text-xs text-slate-300">
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <select
                value={audioMode}
                onChange={(e) => setAudioMode(e.target.value as any)}
                className="bg-transparent border-none text-white text-xs font-medium focus:outline-none"
              >
                <option value="chime_and_voice" className="bg-slate-900">Chime + Voice</option>
                <option value="chime_only" className="bg-slate-900">Chime Only</option>
                <option value="muted" className="bg-slate-900">Muted</option>
              </select>
            </div>
          )}

          {/* Connection status */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
              {connected ? 'Live Network' : 'Reconnecting...'}
            </span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white">
            <Clock className="h-4 w-4 text-blue-400" />
            <span>{currentTime}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ── Main TV Content Area ────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-8 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Left Column: CURRENTLY CALLED / ACTIVE CONSULTATIONS (Cols 1-8) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Top Banner: LATEST CALLED PATIENT (Big Calling Alert) */}
          {lastAnnouncedCall && (
            <div className="p-6 bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-slate-900 border-2 border-blue-500 rounded-3xl shadow-2xl flex items-center justify-between animate-pulse">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-blue-300 mb-1">
                  <Radio className="h-4 w-4 text-blue-400" /> NOW CALLING PATIENT
                </span>
                <div className="text-5xl md:text-6xl font-black tracking-tight text-white">
                  {lastAnnouncedCall.queueToken}
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  {lastAnnouncedCall.doctorName} — {lastAnnouncedCall.departmentName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-widest text-blue-300 font-bold block mb-1">
                  PROCEED TO
                </span>
                <div className="text-3xl md:text-4xl font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-6 py-2.5 rounded-2xl">
                  {lastAnnouncedCall.consultationRoom}
                </div>
              </div>
            </div>
          )}

          {/* Consultation Rooms Grid */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-emerald-400" />
                In Consultation & Called
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {currentlyCalled.length + inConsultation.length} Rooms Active
              </span>
            </div>

            {currentlyCalled.length === 0 && inConsultation.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Stethoscope className="h-16 w-16 text-slate-700 mb-3" />
                <p className="text-lg font-bold text-slate-400">No Patients In Consultation</p>
                <p className="text-xs text-slate-500 mt-1">Physicians will call the next ticket momentarily.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                {/* Currently Called Cards */}
                {currentlyCalled.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-gradient-to-br from-blue-950/70 to-slate-900 border-2 border-blue-500 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-blue-600 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-bl-xl text-white">
                      CALLED
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        TICKET NUMBER
                      </span>
                      <div className="text-4xl font-black text-white tracking-tight my-0.5">
                        {item.queue_token}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.doctor_name || 'Duty Physician'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
                        ROOM
                      </span>
                      <div className="text-2xl font-black text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-xl border border-amber-500/30">
                        {item.consultation_room}
                      </div>
                    </div>
                  </div>
                ))}

                {/* In Consultation Cards */}
                {inConsultation.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 bg-slate-800/60 border border-slate-700/80 rounded-2xl shadow-md flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        IN SESSION
                      </span>
                      <div className="text-3xl font-black text-slate-200 tracking-tight my-0.5">
                        {item.queue_token}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.doctor_name || 'Doctor'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
                        ROOM
                      </span>
                      <div className="text-xl font-bold text-slate-200 bg-slate-700/50 px-3.5 py-1 rounded-xl">
                        {item.consultation_room}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: NEXT IN LINE & WAITING QUEUE (Cols 9-12) */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Next Up Box */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <UserCheck className="h-4 w-4" /> Next Up
              </h3>
              <span className="text-xs text-slate-500 font-medium">Please be ready</span>
            </div>

            {nextPatients.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">No assigned next patient.</p>
            ) : (
              <div className="space-y-2.5">
                {nextPatients.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                    <span className="text-xl font-black text-white">{item.queue_token}</span>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">
                      {item.consultation_room}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waiting List Queue Grid */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">
                Waiting Queue
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {waitingList.length} Waiting
              </span>
            </div>

            {waitingList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
                <p className="text-sm font-medium">Lobby Queue Empty</p>
                <p className="text-xs text-slate-600 mt-0.5">All checked-in patients have been seen.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2.5">
                  {waitingList.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border text-center transition
                        ${item.priority === 'emergency'
                          ? 'bg-red-950/40 border-red-800 text-red-200'
                          : item.priority === 'urgent'
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300'}`}
                    >
                      <div className="text-lg font-black">{item.queue_token}</div>
                      <span className="text-[10px] text-slate-400 font-medium capitalize">
                        {item.priority !== 'normal' ? `${item.priority} priority` : 'Waiting'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Footer Guidance Ticker ───────────────────────────────────── */}
      <footer className="px-8 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Please hold your printed ticket until called by your token number.</span>
        </div>
        <div className="text-slate-500">
          Alem Ketema Enat Hospital Information System • OPD Screen v2.0
        </div>
      </footer>
    </div>
  );
};

export default OPDQueueDisplay;
