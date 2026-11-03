/**
 * Drittech Queue — Hospital Queue Management Dashboard
 * Pixel-perfect recreation of the City Care Hospital Queue Dashboard.
 *
 * Components:
 * 1. Window & Browser Frame with tab & URL bar (app.drittech.in/queue)
 * 2. Deep Navy Left Navigation Sidebar with icons & location selector
 * 3. Clean White Header with Hospital Title, Search, Notifications, and Dr. Admin Profile
 * 4. Hero "Now Serving" Glowing Display Card with Tokens, Counters & Clock
 * 5. Live Overview (Total Patients, Served, Waiting, Avg Wait Time)
 * 6. Average Wait Time Area Chart with Y/X axes and smooth cyan curve
 * 7. Queue by Doctor Table with real-time patient loads
 * 8. Department Queue Donut Chart with exact percentages and color legend
 * 9. Pharmacy Counters Table with Serving/Idle badges
 */

import React, { useState, useEffect } from 'react';
import {
  Home, Tv, Layers, Calendar, Users, Stethoscope,
  Building2, Pill, BarChart3, Settings, Plug, ChevronDown,
  Headphones, Search, Bell, Clock, Megaphone,
  UserCheck, Hourglass, ArrowLeft, ArrowRight, RotateCw,
  Star, Puzzle, Minus, Square, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

// Average wait time data matching the chart in screenshot
const waitTimeData = [
  { time: '08 AM', minutes: 14 },
  { time: '09 AM', minutes: 21 },
  { time: '10 AM', minutes: 28 },
  { time: '11 AM', minutes: 46 },
  { time: '11 AM ', minutes: 40 },
  { time: '01 PM', minutes: 22 },
  { time: '02 PM', minutes: 12 },
];

// Department breakdown matching the donut chart in screenshot
const departmentData = [
  { name: 'General OPD', value: 68, percent: '48%', color: '#06b6d4' },
  { name: 'Cardiology', value: 22, percent: '15%', color: '#3b82f6' },
  { name: 'Orthopedics', value: 18, percent: '13%', color: '#8b5cf6' },
  { name: 'Dermatology', value: 12, percent: '8%', color: '#f97316' },
  { name: 'Neurology', value: 10, percent: '7%', color: '#eab308' },
  { name: 'Others', value: 12, percent: '8%', color: '#94a3b8' },
];

export const DrittechQueueDashboard: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [hospitalName, setHospitalName] = useState('City Care Hospital');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [timeFilter, setTimeFilter] = useState('Today');
  const [showBrowserBar, setShowBrowserBar] = useState(true);

  // Digital clock
  const [currentTime, setCurrentTime] = useState('10:24 AM');
  const [currentSecondsTime, setCurrentSecondsTime] = useState('10:24:30 AM');
  const [currentDate] = useState('24 May 2025');
  const [currentDay] = useState('Saturday');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
      setCurrentSecondsTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    // Sync initially or keep exact screenshot time
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Left sidebar menu items
  const sidebarNavItems = [
    { name: 'Dashboard', icon: Home },
    { name: 'Live Display', icon: Tv },
    { name: 'Queue Management', icon: Layers },
    { name: 'Appointments', icon: Calendar },
    { name: 'Patients', icon: Users },
    { name: 'Doctors', icon: Stethoscope },
    { name: 'Departments', icon: Building2 },
    { name: 'Pharmacy', icon: Pill },
    { name: 'Reports', icon: BarChart3 },
    { name: 'Settings', icon: Settings },
    { name: 'Integrations', icon: Plug },
  ];

  // Doctors queue list
  const doctorQueueList = [
    { doctor: 'Dr. Rahul Sharma', department: 'General Physician', waiting: '14', waitTime: '22 min' },
    { doctor: 'Dr. Priya Mehta', department: 'Cardiology', waiting: '09', waitTime: '18 min' },
    { doctor: 'Dr. Amit Verma', department: 'Orthopedics', waiting: '07', waitTime: '25 min' },
    { doctor: 'Dr. Neha Patel', department: 'Dermatology', waiting: '05', waitTime: '15 min' },
    { doctor: 'Dr. Sandeep Agarwal', department: 'Neurology', waiting: '08', waitTime: '30 min' },
  ];

  // Pharmacy counters list
  const pharmacyCountersList = [
    { counter: 'Pharmacy 1', status: 'Serving', token: 'P-032', waitTime: '10 min', isServing: true },
    { counter: 'Pharmacy 2', status: 'Serving', token: 'P-033', waitTime: '12 min', isServing: true },
    { counter: 'Pharmacy 3', status: 'Idle', token: '—', waitTime: '—', isServing: false },
    { counter: 'Pharmacy 4', status: 'Serving', token: 'P-034', waitTime: '8 min', isServing: true },
  ];

  // Waiting tokens grid matching screenshot exactly
  const waitingTokensCol1 = [
    { token: 'A-043', counter: 'Counter 2' },
    { token: 'A-044', counter: 'Counter 1' },
    { token: 'A-045', counter: 'Counter 4' },
    { token: 'A-046', counter: 'Counter 2' },
    { token: 'A-047', counter: 'Counter 3' },
  ];

  const waitingTokensCol2 = [
    { token: 'B-118', counter: 'Counter 5' },
    { token: 'B-119', counter: 'Counter 5' },
    { token: 'B-120', counter: 'Counter 6' },
    { token: 'C-007', counter: 'Counter 1' },
    { token: 'C-008', counter: 'Counter 2' },
  ];

  return (
    <div className="min-h-screen bg-[#1e293b] flex flex-col font-sans select-none antialiased">
      
      {/* ── BROWSER WINDOW HEADER & CHROME SHELL ── */}
      {showBrowserBar && (
        <div className="bg-[#1e222b] text-slate-300 text-xs border-b border-[#2d3342] flex flex-col">
          {/* Top Title & Tab Row */}
          <div className="flex items-center justify-between px-3 pt-2 pb-1.5 bg-[#181a20]">
            <div className="flex items-center gap-2">
              {/* Window dots */}
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
              </div>

              {/* Tab */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-[#272b35] text-slate-200 text-xs font-medium border-t border-x border-[#3b4252]">
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 flex items-center justify-center text-[9px] text-white font-bold">
                  +
                </div>
                <span>Drittech Queue — Dashboard</span>
                <X className="w-3 h-3 text-slate-400 hover:text-white cursor-pointer ml-2" />
              </div>
              <div className="text-slate-500 px-1.5 cursor-pointer hover:text-slate-300 font-bold">+</div>
            </div>

            {/* Window control buttons */}
            <div className="flex items-center gap-3 text-slate-400 pr-1">
              <Minus className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
              <Square className="w-3 h-3 cursor-pointer hover:text-white" />
              <X className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* Navigation & Address Bar Row */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-[#272b35] border-t border-[#181a20]">
            <div className="flex items-center gap-2 text-slate-400">
              <ArrowLeft className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
              <ArrowRight className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
              <RotateCw className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
            </div>

            {/* URL Input Bar */}
            <div className="flex-1 flex items-center gap-2 px-3 py-1 bg-[#1a1d24] rounded-full text-slate-300 text-xs border border-[#3b4252]/60">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">https://</span>
              <span className="text-white font-semibold">app.drittech.in/queue</span>
              <div className="ml-auto flex items-center gap-2 text-slate-400">
                <Star className="w-3 h-3 hover:text-amber-400 cursor-pointer" />
                <Puzzle className="w-3 h-3 hover:text-white cursor-pointer" />
              </div>
            </div>

            {/* Toggle Fullscreen / Hide Browser Bar button */}
            <button
              onClick={() => setShowBrowserBar(false)}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300"
              title="Hide Browser Shell"
            >
              Hide Bar
            </button>
          </div>
        </div>
      )}

      {/* Floating control to restore browser shell if hidden */}
      {!showBrowserBar && (
        <button
          onClick={() => setShowBrowserBar(true)}
          className="fixed top-2 right-2 z-50 px-2 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] rounded-lg shadow-lg backdrop-blur-sm border border-slate-700 transition"
        >
          Show Browser Bar
        </button>
      )}

      {/* ── MAIN APPLICATION LAYOUT ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ── 1. LEFT NAVIGATION SIDEBAR ── */}
        <aside className="w-60 bg-[#0c1427] text-slate-300 flex flex-col justify-between shrink-0 border-r border-[#1a233a]">
          {/* Top Logo & Menu */}
          <div>
            {/* Brand Logo */}
            <div className="px-5 py-5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <span className="text-white font-black text-base leading-none">+</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-base tracking-tight leading-tight">
                  Drittech
                </span>
                <span className="text-[10px] text-cyan-400/90 font-semibold tracking-wider -mt-0.5">
                  Queue
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="px-3 space-y-1 mt-1">
              {sidebarNavItems.map(item => {
                const IconComponent = item.icon;
                const isActive = activeMenu === item.name;
                return (
                  <button
                    key={item.name}
                    onClick={() => setActiveMenu(item.name)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-[#1b253b] text-white shadow-xs font-bold border-l-2 border-cyan-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#131d33]'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar: Location & Support */}
          <div className="p-4 border-t border-[#1a233a] space-y-3">
            {/* Location selector */}
            <div className="relative">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Location
              </span>
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#141d33] border border-[#232f4d] rounded-xl text-xs text-white hover:border-cyan-500/50 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate font-medium">{hospitalName}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Location Dropdown */}
              {showLocationDropdown && (
                <div className="absolute bottom-full left-0 w-full mb-1 bg-[#141d33] border border-[#232f4d] rounded-xl shadow-xl overflow-hidden py-1 z-50 text-xs">
                  {['City Care Hospital', 'Alem Ketema Enat Hospital', 'Main Campus OPD', 'Emergency Center'].map(h => (
                    <div
                      key={h}
                      onClick={() => { setHospitalName(h); setShowLocationDropdown(false); }}
                      className={`px-3 py-2 cursor-pointer hover:bg-[#1b253b] ${hospitalName === h ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Support Link */}
            <div className="flex items-center gap-2.5 pt-1 text-slate-400 hover:text-white cursor-pointer transition">
              <Headphones className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold text-slate-200">Need Help?</div>
                <div className="text-[10px] text-slate-400">Contact Support</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── 2. MAIN VIEW CONTAINER ── */}
        <div className="flex-1 flex flex-col bg-[#f4f7fb] overflow-y-auto">
          
          {/* ── TOP HEADER BAR ── */}
          <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 shadow-xs">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {hospitalName}
            </h1>

            {/* Header Right Actions */}
            <div className="flex items-center gap-5">
              {/* Search button */}
              <button className="text-slate-400 hover:text-slate-600 transition p-1.5">
                <Search className="w-4 h-4" />
              </button>

              {/* Notification Bell with red badge */}
              <div className="relative cursor-pointer text-slate-500 hover:text-slate-700 transition">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  1
                </span>
              </div>

              {/* User Profile */}
              <div className="flex items-center gap-2.5 pl-2 cursor-pointer">
                {/* Doctor Avatar Image */}
                <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&h=100&fit=crop&crop=faces"
                    alt="Dr. Admin"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback if network image unavailable
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-bold text-slate-700">DA</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-tight">Dr. Admin</span>
                  <span className="text-[10px] text-slate-400 font-medium">Administrator</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </header>

          {/* ── MAIN DASHBOARD CONTENT AREA ── */}
          <main className="p-6 md:p-7 space-y-6 max-w-[1600px] w-full mx-auto">
            
            {/* ══════════════════════════════════════════════════════════
                1. HERO NOW SERVING DISPLAY CARD (DARK GLOWING SCREEN)
               ══════════════════════════════════════════════════════════ */}
            <div className="bg-[#09122c] rounded-3xl p-7 text-white shadow-xl border border-blue-950/60 relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
                
                {/* ── Segment 1: NOW SERVING (4 cols) ── */}
                <div className="md:col-span-4 flex flex-col justify-center">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#00f5ff] mb-1">
                    NOW SERVING
                  </span>

                  {/* Giant Token */}
                  <div className="text-6xl sm:text-7xl font-black text-white tracking-tight leading-none my-1 font-mono">
                    A-042
                  </div>

                  <span className="text-xs font-semibold text-slate-400 tracking-wider mt-1">
                    AT
                  </span>

                  {/* Counter Line with Megaphone */}
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Megaphone className="w-5 h-5 text-[#00f5ff]" />
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-[#00f5ff] tracking-wide">
                      COUNTER 3
                    </span>
                  </div>

                  <div className="text-sm font-medium text-slate-300 mt-1 pl-12">
                    General OPD
                  </div>
                </div>

                {/* ── Segment 2: WAITING TOKENS (5 cols) ── */}
                <div className="md:col-span-5 flex flex-col">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-[#00f5ff] mb-3 text-center">
                    WAITING TOKENS
                  </div>

                  {/* Two column grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {/* Col 1 */}
                    <div className="space-y-2">
                      {waitingTokensCol1.map(item => (
                        <div key={item.token} className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white font-mono">{item.token}</span>
                          <span className="text-xs font-semibold text-[#00f5ff] px-2 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-950/20">
                            {item.counter}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Col 2 */}
                    <div className="space-y-2">
                      {waitingTokensCol2.map(item => (
                        <div key={item.token} className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white font-mono">{item.token}</span>
                          <span className="text-xs font-semibold text-[#00f5ff] px-2 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-950/20">
                            {item.counter}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Segment 3: TIME & THANK YOU (3 cols) ── */}
                <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-slate-800/80 md:pl-8 flex flex-col items-center justify-center text-center space-y-4">
                  {/* Clock & Date */}
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full border border-cyan-400/40 flex items-center justify-center mb-1 text-cyan-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-2xl font-black text-white tracking-tight">
                      {currentTime}
                    </div>
                    <div className="text-xs font-semibold text-slate-300">
                      {currentDate}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {currentDay}
                    </div>
                  </div>

                  {/* Thank You Note */}
                  <div className="flex flex-col items-center pt-1">
                    <div className="flex items-center gap-1 text-cyan-400 mb-1">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-extrabold tracking-wider text-[#00f5ff]">
                      THANK YOU!
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Please keep your token ready
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                2. ROW 2: LIVE OVERVIEW & AVERAGE WAIT TIME
               ══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Card 1: Live Overview (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-slate-900">Live Overview</h2>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Last updated: {currentSecondsTime}
                  </span>
                </div>

                {/* 4 horizontal stat columns */}
                <div className="grid grid-cols-4 gap-2 text-center items-start">
                  {/* Stat 1: Total Patients */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 leading-tight">142</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-1">
                      Total Patients<br />Today
                    </span>
                  </div>

                  {/* Stat 2: Served Today */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 leading-tight">42</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-1">
                      Served<br />Today
                    </span>
                  </div>

                  {/* Stat 3: Waiting Now */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-2">
                      <Hourglass className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 leading-tight">68</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-1">
                      Waiting<br />Now
                    </span>
                  </div>

                  {/* Stat 4: Avg Wait Time */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-2">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="text-2xl font-black text-slate-900 leading-tight">28 min</span>
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-1">
                      Avg. Wait Time<br />Today
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Average Wait Time Chart (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-900">Average Wait Time</h2>
                  
                  {/* Today Dropdown */}
                  <div className="relative">
                    <select
                      value={timeFilter}
                      onChange={e => setTimeFilter(e.target.value)}
                      className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl focus:outline-none cursor-pointer"
                    >
                      <option value="Today">Today</option>
                      <option value="Yesterday">Yesterday</option>
                      <option value="This Week">This Week</option>
                    </select>
                  </div>
                </div>

                {/* Recharts Area Chart */}
                <div className="h-44 w-full relative -ml-3">
                  <span className="absolute left-2 top-0 text-[10px] text-slate-400 font-medium -rotate-90 origin-top-left">
                    Minutes
                  </span>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waitTimeData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <YAxis
                        ticks={[0, 15, 30, 45, 60]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="minutes"
                        stroke="#06b6d4"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#cyanGradient)"
                        dot={{ r: 3.5, fill: '#06b6d4', stroke: '#fff', strokeWidth: 1.5 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════
                3. ROW 3: THREE CARDS (Doctor, Department & Pharmacy)
               ══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ── CARD 1: Queue by Doctor ── */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Queue by Doctor</h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                        <th className="pb-2.5 font-semibold">Doctor</th>
                        <th className="pb-2.5 font-semibold">Department</th>
                        <th className="pb-2.5 font-semibold text-center">Waiting</th>
                        <th className="pb-2.5 font-semibold text-right">Avg. Wait Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {doctorQueueList.map(row => (
                        <tr key={row.doctor} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 font-bold text-slate-800">{row.doctor}</td>
                          <td className="py-2.5 text-slate-500 font-medium">{row.department}</td>
                          <td className="py-2.5 text-center">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e6f8f5] text-[#0d9488]">
                              {row.waiting}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-medium text-slate-600">{row.waitTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── CARD 2: Department Queue (Donut Chart) ── */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <h2 className="text-sm font-bold text-slate-900 mb-4">Department Queue</h2>

                <div className="flex items-center justify-between gap-4 my-auto">
                  {/* Donut Chart representation */}
                  <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      {/* Background circle */}
                      <circle cx="18" cy="18" r="14" fill="transparent" stroke="#f1f5f9" strokeWidth="4.5" />
                      
                      {/* Segment 1: General OPD 48% */}
                      <circle
                        cx="18" cy="18" r="14" fill="transparent"
                        stroke="#06b6d4" strokeWidth="4.5"
                        strokeDasharray="42 100" strokeDashoffset="0"
                      />
                      {/* Segment 2: Cardiology 15% */}
                      <circle
                        cx="18" cy="18" r="14" fill="transparent"
                        stroke="#3b82f6" strokeWidth="4.5"
                        strokeDasharray="15 100" strokeDashoffset="-42"
                      />
                      {/* Segment 3: Orthopedics 13% */}
                      <circle
                        cx="18" cy="18" r="14" fill="transparent"
                        stroke="#8b5cf6" strokeWidth="4.5"
                        strokeDasharray="13 100" strokeDashoffset="-57"
                      />
                      {/* Segment 4: Dermatology 8% */}
                      <circle
                        cx="18" cy="18" r="14" fill="transparent"
                        stroke="#f97316" strokeWidth="4.5"
                        strokeDasharray="8 100" strokeDashoffset="-70"
                      />
                      {/* Segment 5: Neurology 7% */}
                      <circle
                        cx="18" cy="18" r="14" fill="transparent"
                        stroke="#eab308" strokeWidth="4.5"
                        strokeDasharray="7 100" strokeDashoffset="-78"
                      />
                      {/* Segment 6: Others 8% */}
                      <circle
                        cx="18" cy="18" r="14" fill="transparent"
                        stroke="#94a3b8" strokeWidth="4.5"
                        strokeDasharray="8 100" strokeDashoffset="-85"
                      />
                    </svg>

                    {/* Donut Hole Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-slate-900 leading-none">142</span>
                      <span className="text-[11px] text-slate-400 font-medium mt-0.5">Total</span>
                    </div>
                  </div>

                  {/* Legend on right */}
                  <div className="space-y-1.5 flex-1 pl-2">
                    {departmentData.map(dept => (
                      <div key={dept.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                          <span className="text-slate-600 font-medium truncate max-w-[90px]">{dept.name}</span>
                        </div>
                        <span className="text-slate-800 font-bold ml-1 text-right">
                          {dept.value} <span className="text-slate-400 font-normal">({dept.percent})</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── CARD 3: Pharmacy Counters ── */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900">Pharmacy Counters</h2>
                  <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition">
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                        <th className="pb-2.5 font-semibold">Counter</th>
                        <th className="pb-2.5 font-semibold">Status</th>
                        <th className="pb-2.5 font-semibold">Token</th>
                        <th className="pb-2.5 font-semibold text-right">Wait Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {pharmacyCountersList.map(row => (
                        <tr key={row.counter} className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 font-bold text-slate-800">{row.counter}</td>
                          <td className="py-2.5">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                              row.isServing
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono font-bold text-slate-700">{row.token}</td>
                          <td className="py-2.5 text-right font-medium text-slate-600">{row.waitTime}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </main>
        </div>

      </div>
    </div>
  );
};

export default DrittechQueueDashboard;
