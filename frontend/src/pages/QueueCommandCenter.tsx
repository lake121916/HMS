/**
 * Smart Queue & Token Management Center / TV Command Center
 * Alem Ketema Enat Hospital Management System
 * Inspired by Drittech Queue Hospital Command Center Model
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Volume2, VolumeX, Megaphone, Users, Clock, Hourglass, CheckCircle2,
  Tv, RefreshCw, Radio, Stethoscope, Pill, Building, ArrowUpRight
} from 'lucide-react';

interface WaitingToken {
  token: string;
  counter: string;
  service?: string;
  priority?: string;
}

interface NowServing {
  token: string;
  counter: string;
  service: string;
  calledAt?: string;
}

interface DoctorQueueRow {
  doctor: string;
  department: string;
  waiting: number;
  avgWaitTime: string;
}

interface DepartmentBreakdown {
  name: string;
  count: number;
  percent: number;
  color: string;
}

interface PharmacyCounterRow {
  id: number;
  counter: string;
  status: 'Serving' | 'Idle' | 'Closed' | string;
  token: string;
  waitTime: string;
}

interface HourlyPoint {
  time: string;
  waitTime: number;
}

interface ServiceCounter {
  id: number;
  counter_name: string;
  counter_type: string;
  current_token?: string;
  status: string;
  wait_time_minutes?: number;
}

export const QueueCommandCenter: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Live Data States
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [connected, setConnected] = useState(false);
  const [locationName, setLocationName] = useState('Alem Ketema Enat Hospital');

  // Hero Section
  const [nowServing, setNowServing] = useState<NowServing>({
    token: 'A-042',
    counter: 'COUNTER 3',
    service: 'General OPD'
  });

  const [waitingTokens, setWaitingTokens] = useState<WaitingToken[]>([
    { token: 'A-043', counter: 'Counter 2', service: 'General OPD' },
    { token: 'B-118', counter: 'Counter 5', service: 'Neurology' },
    { token: 'A-044', counter: 'Counter 1', service: 'General OPD' },
    { token: 'B-119', counter: 'Counter 5', service: 'Neurology' },
    { token: 'A-045', counter: 'Counter 4', service: 'Orthopedics' },
    { token: 'B-120', counter: 'Counter 6', service: 'Dermatology' },
    { token: 'A-046', counter: 'Counter 2', service: 'Cardiology' },
    { token: 'C-007', counter: 'Counter 1', service: 'Pediatrics' },
    { token: 'A-047', counter: 'Counter 3', service: 'General OPD' },
    { token: 'C-008', counter: 'Counter 2', service: 'Pediatrics' }
  ]);

  // KPIs
  const [kpis, setKpis] = useState({
    totalPatientsToday: 142,
    servedToday: 42,
    waitingNow: 68,
    avgWaitTime: 28
  });

  // Charts & Tables
  const [hourlyCurve, setHourlyCurve] = useState<HourlyPoint[]>([
    { time: '08 AM', waitTime: 12 },
    { time: '09 AM', waitTime: 20 },
    { time: '10 AM', waitTime: 28 },
    { time: '11 AM', waitTime: 45 },
    { time: '12 PM', waitTime: 38 },
    { time: '01 PM', waitTime: 25 },
    { time: '02 PM', waitTime: 18 }
  ]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Today' | 'Week' | 'Month'>('Today');

  const [queueByDoctor, setQueueByDoctor] = useState<DoctorQueueRow[]>([
    { doctor: 'Dr. Rahul Sharma', department: 'General Physician', waiting: 14, avgWaitTime: '22 min' },
    { doctor: 'Dr. Priya Mehta', department: 'Cardiology', waiting: 9, avgWaitTime: '18 min' },
    { doctor: 'Dr. Amit Verma', department: 'Orthopedics', waiting: 7, avgWaitTime: '25 min' },
    { doctor: 'Dr. Neha Patel', department: 'Dermatology', waiting: 5, avgWaitTime: '15 min' },
    { doctor: 'Dr. Sandeep Agarwal', department: 'Neurology', waiting: 8, avgWaitTime: '30 min' }
  ]);

  const [deptQueue, setDeptQueue] = useState<{ total: number; breakdown: DepartmentBreakdown[] }>({
    total: 142,
    breakdown: [
      { name: 'General OPD', count: 68, percent: 48, color: '#06b6d4' },
      { name: 'Cardiology', count: 22, percent: 15, color: '#3b82f6' },
      { name: 'Orthopedics', count: 18, percent: 13, color: '#6366f1' },
      { name: 'Dermatology', count: 12, percent: 8, color: '#f59e0b' },
      { name: 'Neurology', count: 10, percent: 7, color: '#10b981' },
      { name: 'Others', count: 12, percent: 8, color: '#94a3b8' }
    ]
  });

  const [pharmacyCounters, setPharmacyCounters] = useState<PharmacyCounterRow[]>([
    { id: 1, counter: 'Pharmacy 1', status: 'Serving', token: 'P-032', waitTime: '10 min' },
    { id: 2, counter: 'Pharmacy 2', status: 'Serving', token: 'P-033', waitTime: '12 min' },
    { id: 3, counter: 'Pharmacy 3', status: 'Idle', token: '—', waitTime: '—' },
    { id: 4, counter: 'Pharmacy 4', status: 'Serving', token: 'P-034', waitTime: '8 min' }
  ]);

  const [allCounters, setAllCounters] = useState<ServiceCounter[]>([]);

  // Audio / Announcement Settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioVoiceLang, setAudioVoiceLang] = useState<'en' | 'am'>('en');
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callingInProgress, setCallingInProgress] = useState(false);

  // Call form
  const [callForm, setCallForm] = useState({
    token: '',
    counter_name: 'Counter 3',
    service_category: 'General OPD'
  });

  // Live Clock
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentDayStr, setCurrentDayStr] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setCurrentDateStr(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
      setCurrentDayStr(now.toLocaleDateString('en-US', { weekday: 'long' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
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
      // High note: E5 (659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Low note: C5 (523.25Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.25);
      gain2.gain.setValueAtTime(0.3, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.0);
    } catch (e) {
      console.error('Audio chime error:', e);
    }
  };

  // Bilingual Speech Synthesis (English + Amharic)
  const speakTokenAnnouncement = (token: string, counter: string, lang = audioVoiceLang) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      let text = '';
      if (lang === 'am') {
        text = `ቶከን ቁጥር ${token}፣ እባክዎ ወደ ${counter} ይሂዱ።`;
      } else {
        text = `Token number ${token}, please proceed to ${counter}.`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = lang === 'am' ? 'am-ET' : 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  // Fetch summary from backend
  const fetchSummary = async () => {
    try {
      const res = await api.get('/opd/summary');
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        if (d.hero?.nowServing) setNowServing(d.hero.nowServing);
        if (d.hero?.waitingTokens?.length) setWaitingTokens(d.hero.waitingTokens);
        if (d.kpis) setKpis(d.kpis);
        if (d.hourlyWaitCurve?.length) setHourlyCurve(d.hourlyWaitCurve);
        if (d.queueByDoctor?.length) setQueueByDoctor(d.queueByDoctor);
        if (d.departmentQueue) setDeptQueue(d.departmentQueue);
        if (d.pharmacyCounters?.length) setPharmacyCounters(d.pharmacyCounters);
        if (d.counters?.length) setAllCounters(d.counters);
        setLastUpdated(d.lastUpdated || new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch OPD summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  // WebSockets Setup
  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('opd-patient-called', (event: any) => {
      if (event?.queueToken) {
        setNowServing({
          token: event.queueToken,
          counter: (event.counterRoom || event.consultationRoom || 'Counter 1').toUpperCase(),
          service: event.departmentName || 'General OPD'
        });
        // Remove from waiting tokens if present
        setWaitingTokens(prev => prev.filter(t => t.token !== event.queueToken));

        if (audioEnabled) {
          playHospitalChime();
          setTimeout(() => {
            speakTokenAnnouncement(event.queueToken, event.counterRoom || event.consultationRoom || 'Counter 1');
          }, 600);
        }
      }
    });

    socket.on('opd-queue-update', () => {
      fetchSummary();
    });

    return () => {
      socket.disconnect();
    };
  }, [audioEnabled, audioVoiceLang]);

  // Handle Calling Next Token
  const handleCallTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!callForm.token.trim()) return;

    setCallingInProgress(true);
    try {
      const res = await api.post('/opd/call-counter-token', {
        token: callForm.token.trim().toUpperCase(),
        counter_name: callForm.counter_name,
        service_category: callForm.service_category
      });

      if (res.data?.success) {
        setNowServing({
          token: callForm.token.trim().toUpperCase(),
          counter: callForm.counter_name.toUpperCase(),
          service: callForm.service_category
        });
        setWaitingTokens(prev => prev.filter(t => t.token !== callForm.token.trim().toUpperCase()));
        setCallModalOpen(false);

        if (audioEnabled) {
          playHospitalChime();
          setTimeout(() => {
            speakTokenAnnouncement(callForm.token.trim().toUpperCase(), callForm.counter_name);
          }, 600);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to call token');
    } finally {
      setCallingInProgress(false);
    }
  };

  // Quick call from waiting list
  const handleQuickCall = async (tokenItem: WaitingToken) => {
    try {
      await api.post('/opd/call-counter-token', {
        token: tokenItem.token,
        counter_name: tokenItem.counter,
        service_category: tokenItem.service || 'General OPD'
      });
      setNowServing({
        token: tokenItem.token,
        counter: tokenItem.counter.toUpperCase(),
        service: tokenItem.service || 'General OPD'
      });
      setWaitingTokens(prev => prev.filter(t => t.token !== tokenItem.token));
      if (audioEnabled) {
        playHospitalChime();
        setTimeout(() => {
          speakTokenAnnouncement(tokenItem.token, tokenItem.counter);
        }, 600);
      }
    } catch (e: any) {
      console.error('Quick call failed:', e);
    }
  };

  // Toggle pharmacy counter status
  const handleTogglePharmacyCounter = async (counterItem: PharmacyCounterRow) => {
    const nextStatus = counterItem.status.toLowerCase() === 'serving' ? 'idle' : 'serving';
    try {
      await api.put(`/opd/counters/${counterItem.id}`, {
        status: nextStatus,
        current_token: nextStatus === 'serving' ? `P-${Math.floor(100 + Math.random() * 900)}` : null,
        wait_time_minutes: nextStatus === 'serving' ? 10 : 0
      });
      fetchSummary();
    } catch (e) {
      console.error('Toggle counter error:', e);
    }
  };

  // Donut Chart SVG calculations
  const donutSegments = useMemo(() => {
    const total = deptQueue.total || 142;
    let accumulatedAngle = 0;
    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    return deptQueue.breakdown.map(item => {
      const slicePercentage = item.count / total;
      const strokeDasharray = `${slicePercentage * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += slicePercentage;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [deptQueue]);

  // Hourly curve SVG points
  const curveSvgPath = useMemo(() => {
    if (!hourlyCurve || hourlyCurve.length === 0) return { path: '', area: '' };
    const width = 500;
    const height = 180;
    const paddingX = 40;
    const paddingY = 30;
    const maxVal = 60; // 0 to 60 mins

    const points = hourlyCurve.map((pt, i) => {
      const x = paddingX + (i / (hourlyCurve.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - (pt.waitTime / maxVal) * (height - 2 * paddingY);
      return { x, y, pt };
    });

    // Build smooth cubic bezier curve
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    // Area path down to baseline
    const baselineY = height - paddingY;
    const area = `${d} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

    return { path: d, area, points };
  }, [hourlyCurve]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 lg:p-6 space-y-6">

      {/* ── Top Command Bar ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-600 rounded-xl text-white shadow-md shadow-cyan-600/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {locationName}
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                connected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                {connected ? (language === 'am' ? 'የቀጥታ ስርጭት' : 'Live WebSocket') : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {language === 'am' ? 'የቶከን እና የተራ መቆጣጠሪያ ማዕከል' : 'Smart Queue & Patient Calling Command Center'}
            </p>
          </div>
        </div>

        {/* Right Command Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioEnabled(prev => !prev)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              audioEnabled
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title="Toggle Audio Chime"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{audioEnabled ? (language === 'am' ? 'ድምፅ በርቷል' : 'Chime ON') : (language === 'am' ? 'ድምፅ ጠፍቷል' : 'Muted')}</span>
          </button>

          {/* Test Sound */}
          <button
            onClick={() => {
              playHospitalChime();
              setTimeout(() => speakTokenAnnouncement(nowServing.token, nowServing.counter), 600);
            }}
            className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition-colors"
          >
            {language === 'am' ? 'ድምፅ ሞክር' : 'Test Chime'}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setAudioVoiceLang(l => (l === 'en' ? 'am' : 'en'))}
            className="px-2.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-600"
            title="Switch Announcement Voice Language"
          >
            {audioVoiceLang === 'en' ? 'EN Voice' : 'አማርኛ ድምፅ'}
          </button>

          {/* Call Token Button */}
          <button
            onClick={() => setCallModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Megaphone className="w-4 h-4" />
            <span>{language === 'am' ? 'ቶከን ጥራ' : 'Call Next Token'}</span>
          </button>

          {/* Public TV View Button */}
          <button
            onClick={() => navigate('/queue-display')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            title="Open Large Waiting Room TV Display"
          >
            <Tv className="w-4 h-4 text-cyan-400" />
            <span>{language === 'am' ? 'የቲቪ ማሳያ' : 'TV Display'}</span>
          </button>

          {/* Location Selector */}
          <div className="hidden md:block">
            <select
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              aria-label="Hospital Location"
              className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <option value="Alem Ketema Enat Hospital">Alem Ketema Enat Hospital</option>
              <option value="Main OPD Center">Main OPD Center</option>
              <option value="Emergency & Trauma Wing">Emergency & Trauma Wing</option>
              <option value="Maternal & Pediatric Wing">Maternal & Pediatric Wing</option>
            </select>
          </div>

          {/* User Profile */}
          <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs border border-cyan-300 dark:border-cyan-800">
              {user?.firstName ? user.firstName[0] : 'A'}
            </div>
            <div className="text-left text-xs leading-tight">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {user ? `Dr. ${user.firstName} ${user.lastName || ''}` : 'Dr. Admin'}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {user?.role?.replace('_', ' ') || 'Medical Director'}
              </div>
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchSummary}
            className="p-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 1. HERO CALLING BANNER (Exact dark UI matching screenshot) ── */}
      <div className="bg-[#0b1626] border border-cyan-900/60 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">

          {/* Left Column: NOW SERVING */}
          <div className="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:pr-6">
            <div>
              <p className="text-cyan-400 font-semibold tracking-wider text-xs uppercase mb-2">
                NOW SERVING
              </p>
              <div className="flex items-baseline space-x-2">
                <span className="text-6xl sm:text-7xl font-extrabold text-white tracking-tight drop-shadow-[0_0_20px_rgba(6,182,212,0.45)]">
                  {nowServing.token}
                </span>
              </div>
              <p className="text-slate-400 font-medium text-xs tracking-widest uppercase my-1">
                AT
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-cyan-300 tracking-wide">
                {nowServing.counter}
              </h2>
              <p className="text-slate-300 text-sm font-medium mt-1">
                {nowServing.service}
              </p>
            </div>

            {/* Megaphone Graphic */}
            <div className="pt-6 flex items-center space-x-3 text-cyan-400">
              <div className="relative">
                <Megaphone className="w-12 h-12 stroke-[1.5] text-cyan-400" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                </span>
              </div>
              <div className="text-xs text-slate-400">
                <span className="text-cyan-300 font-semibold">Active Broadcast Channel</span>
                <p>Calling patients across counters</p>
              </div>
            </div>
          </div>

          {/* Middle Column: WAITING TOKENS */}
          <div className="lg:col-span-5 flex flex-col justify-start border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-6 lg:pb-0 lg:px-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400 font-semibold tracking-wider text-xs uppercase">
                WAITING TOKENS
              </p>
              <span className="text-xs text-cyan-400 font-medium">
                {waitingTokens.length} in queue
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {waitingTokens.slice(0, 10).map((t, idx) => (
                <div
                  key={`${t.token}-${idx}`}
                  onClick={() => handleQuickCall(t)}
                  className="flex items-center justify-between group cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
                  title={`Click to call ${t.token} to ${t.counter}`}
                >
                  <span className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {t.token}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-600/50 text-cyan-300 group-hover:border-cyan-400 transition-all">
                    {t.counter}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: TIME & GREETING */}
          <div className="lg:col-span-3 flex flex-col items-center justify-between text-center lg:pl-4">
            <div className="flex flex-col items-center pt-2">
              <div className="p-2.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-cyan-400 mb-2">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
                {currentTimeStr || '10:24 AM'}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {currentDateStr}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {currentDayStr}
              </p>
            </div>

            <div className="w-full border-t border-slate-800/80 my-4" />

            <div className="flex flex-col items-center pb-2">
              <div className="p-2 rounded-full bg-cyan-950/60 text-cyan-400 mb-2">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-cyan-400 tracking-wider">
                THANK YOU!
              </h4>
              <p className="text-xs text-slate-400 mt-0.5 max-w-[170px] leading-relaxed">
                Please keep your token ready
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* ── 2. MIDDLE SECTION: LIVE OVERVIEW & AVERAGE WAIT TIME ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Live Overview Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Overview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last updated: {lastUpdated || '10:24:30 AM'}
              </p>
            </div>
            <button
              onClick={fetchSummary}
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sync</span>
            </button>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Total Patients */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {kpis.totalPatientsToday}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Total Patients
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Today</span>
            </div>

            {/* 2. Served Today */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {kpis.servedToday}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Served
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Today</span>
            </div>

            {/* 3. Waiting Now */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <Hourglass className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {kpis.waitingNow}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Waiting
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Now</span>
            </div>

            {/* 4. Avg Wait Time */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/60 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {kpis.avgWaitTime} <span className="text-sm font-semibold">min</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Avg. Wait Time
              </p>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Today</span>
            </div>
          </div>
        </div>

        {/* Right: Average Wait Time Chart Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Average Wait Time
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Peak wait times across peak clinic hours
              </p>
            </div>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              <option value="Today">Today</option>
              <option value="Week">This Week</option>
              <option value="Month">This Month</option>
            </select>
          </div>

          {/* SVG Smooth Curve Area Chart */}
          <div className="relative w-full h-44 pt-2">
            <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="waitCurveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Axis Gridlines & Labels */}
              {[60, 45, 30, 15, 0].map((val) => {
                const y = 180 - 30 - (val / 60) * (180 - 60);
                return (
                  <g key={val}>
                    <line
                      x1="40"
                      y1={y}
                      x2="460"
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeDasharray="2,3"
                    />
                    <text
                      x="32"
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Minutes Y-Axis Label */}
              <text
                x="14"
                y="100"
                textAnchor="middle"
                transform="rotate(-90 14 100)"
                className="text-[9px] fill-slate-400 dark:fill-slate-500 tracking-wider"
              >
                Minutes
              </text>

              {/* Area Under Curve */}
              {curveSvgPath.area && (
                <path d={curveSvgPath.area} fill="url(#waitCurveGradient)" />
              )}

              {/* Main Curve Line */}
              {curveSvgPath.path && (
                <path
                  d={curveSvgPath.path}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Data Points */}
              {curveSvgPath.points?.map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill="#06b6d4"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform group-hover:scale-125"
                  />
                  {/* Tooltip on hover */}
                  <title>{`${pt.pt.time}: ${pt.pt.waitTime} mins`}</title>
                  {/* X Axis Time Labels */}
                  <text
                    x={pt.x}
                    y="172"
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                  >
                    {pt.pt.time}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

      </div>

      {/* ── 3. BOTTOM TRI-PANEL SECTION ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 3.1 Queue by Doctor */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Stethoscope className="w-4 h-4 text-cyan-500" />
              <span>Queue by Doctor</span>
            </h3>
            <span className="text-xs text-slate-400">
              Active Clinicians
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2">Doctor</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-center">Waiting</th>
                  <th className="pb-2 text-right">Avg. Wait Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {queueByDoctor.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {row.doctor}
                    </td>
                    <td className="py-2.5 text-slate-500 dark:text-slate-400">
                      {row.department}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        {String(row.waiting).padStart(2, '0')}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-600 dark:text-slate-300">
                      {row.avgWaitTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3.2 Department Queue (Donut Chart) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-500" />
              <span>Department Queue</span>
            </h3>
          </div>

          {/* SVG Donut Chart */}
          <div className="flex items-center justify-center my-3 relative">
            <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
              {donutSegments.map((seg, i) => (
                <circle
                  key={i}
                  cx="80"
                  cy="80"
                  r="60"
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="24"
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  className="transition-all duration-500 hover:opacity-80"
                />
              ))}
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {deptQueue.total}
              </span>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Total
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {deptQueue.breakdown.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.count} ({item.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3.3 Pharmacy Counters */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Pill className="w-4 h-4 text-cyan-500" />
              <span>Pharmacy Counters</span>
            </h3>
            <button
              onClick={() => navigate('/pharmacy')}
              className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2">Counter</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-center">Token</th>
                  <th className="pb-2 text-right">Wait Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {pharmacyCounters.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleTogglePharmacyCounter(row)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    title="Click to toggle status"
                  >
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {row.counter}
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        row.status.toLowerCase() === 'serving'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-900 dark:text-white">
                      {row.token}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      {row.waitTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>Click any counter to toggle Serving/Idle</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">4 Active Counters</span>
          </div>
        </div>

      </div>

      {/* ── 4. ALL ACTIVE SERVICE STATIONS & COUNTERS ───────────────── */}
      {allCounters.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-cyan-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {language === 'am' ? 'ሁሉም ንቁ የጥሪ ቆጣሪዎች' : 'All Active Calling Stations & Counters'}
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {allCounters.length} {language === 'am' ? 'የተመደቡ ቆጣሪዎች' : 'Configured Counters'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {allCounters.map((ctr) => (
              <div
                key={ctr.id}
                onClick={() => {
                  setCallForm(prev => ({ ...prev, counter_name: ctr.counter_name.split(' ')[0] + ' ' + (ctr.counter_name.split(' ')[1] || '1') }));
                  setCallModalOpen(true);
                }}
                className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:border-cyan-400 dark:hover:border-cyan-600 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                    {ctr.counter_name}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    ctr.status === 'serving' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs text-slate-400 uppercase">
                    {ctr.counter_type}
                  </span>
                  <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                    {ctr.current_token || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CALL TOKEN MODAL ───────────────────────────────────────── */}
      {callModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-cyan-600" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {language === 'am' ? 'የታካሚ ቶከን መጥሪያ' : 'Call Token Announcement'}
                </h3>
              </div>
              <button
                onClick={() => setCallModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCallTokenSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የቶከን ቁጥር' : 'Token Number (e.g. A-042)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A-043, B-118, P-032"
                  value={callForm.token}
                  onChange={(e) => setCallForm({ ...callForm, token: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የተመደበበት ቆጣሪ / ክፍል' : 'Service Counter / Station'}
                </label>
                <select
                  value={callForm.counter_name}
                  onChange={(e) => setCallForm({ ...callForm, counter_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Counter 1">Counter 1 (General OPD)</option>
                  <option value="Counter 2">Counter 2 (Cardiology)</option>
                  <option value="Counter 3">Counter 3 (General OPD)</option>
                  <option value="Counter 4">Counter 4 (Orthopedics)</option>
                  <option value="Counter 5">Counter 5 (Neurology)</option>
                  <option value="Counter 6">Counter 6 (Dermatology)</option>
                  <option value="Pharmacy 1">Pharmacy 1 (Dispensing)</option>
                  <option value="Pharmacy 2">Pharmacy 2 (Dispensing)</option>
                  <option value="Pharmacy 3">Pharmacy 3 (Consultation)</option>
                  <option value="Pharmacy 4">Pharmacy 4 (Fast Track)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የአገልግሎት ዘርፍ' : 'Service Category'}
                </label>
                <select
                  value={callForm.service_category}
                  onChange={(e) => setCallForm({ ...callForm, service_category: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="General OPD">General OPD</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Pharmacy">Pharmacy</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={callingInProgress}
                  className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center space-x-1.5"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>{callingInProgress ? 'Broadcasting...' : (language === 'am' ? 'በቀጥታ ጥራ እና አሰማ' : 'Broadcast Call Announcement')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCallModalOpen(false)}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default QueueCommandCenter;
