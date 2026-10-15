/**
 * FinanceReportsPage — Real-Time Financial Analytics Dashboard
 *
 * Powered by /api/reports/finance — no mock data.
 * Sections:
 *  1. KPI Header    — Today / Period / Month / Year with comparison arrows
 *  2. Revenue Trend — Area chart with period switcher
 *  3. Payment Mix   — Method pie + digital provider table
 *  4. Receivables   — Outstanding + ageing buckets
 *  5. Insurance     — Claims pipeline from insurance_claims
 *  6. Services      — Top revenue-generating service lines
 *  7. Shifts        — Cashier shift reconciliation health
 */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import {
  BarChart2, ArrowLeft, TrendingUp, TrendingDown, DollarSign,
  RefreshCw, AlertTriangle, CheckCircle2, Clock, Shield,
  Banknote, Smartphone, CreditCard, Building2, BarChart3,
  Activity, FileText
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FinanceData {
  label: string;
  period: string;
  totals: {
    today: string; this_month: string; this_year: string;
    period_total: string; period_transactions: string; avg_transaction: string;
  };
  chart: { period: string; revenue: string; transactions: string }[];
  byMethod: { method: string; count: string; total: string; pct: string }[];
  byProvider: { provider: string; count: string; total: string; pending_count: string; pending_amount: string }[];
  outstanding: { unpaid: string; partial: string; unpaid_count: string; partial_count: string };
  ageing: { bucket: string; count: string; amount: string }[];
  insurance: { insurance_collected: string; insurance_txns: string; claims_pending: string; claims_approved: string; claims_paid: string };
  shifts: { total_shifts: string; open_shifts: string; closed_shifts: string; reconciled_shifts: string; avg_variance: string; high_variance_shifts: string };
  topServices: { service: string; revenue: string; count: string }[];
  dailyComparison: { today: string; yesterday: string; last_week_same_day: string; today_txns: string; yesterday_txns: string };
  refunds: { count: string; total_refunded: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number | string | undefined | null) =>
  parseFloat(String(n || 0)).toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtK = (n: number | string) => {
  const v = parseFloat(String(n || 0));
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toFixed(0);
};

const pctChange = (current: number, previous: number) => {
  if (!previous) return null;
  return ((current - previous) / previous * 100).toFixed(1);
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3.5 w-3.5" />,
  telebirr: <Smartphone className="h-3.5 w-3.5" />,
  cbe_birr: <Building2 className="h-3.5 w-3.5" />,
  bank_transfer: <Building2 className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
};

const CHART_COLORS = ['#10b981','#8b5cf6','#3b82f6','#f59e0b','#6366f1','#0ea5e9','#f43f5e','#14b8a6'];
const PERIOD_OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: '30 Days' },
  { value: 'year', label: '12 Months' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold text-slate-700 dark:text-white mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-mono">{typeof p.value === 'number' ? fmt(p.value) + ' ETB' : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────

const FinanceReportsPage: React.FC = () => {
  const [data, setData] = useState<FinanceData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/finance?period=${period}`);
      setData(res.data.data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin mr-3" />
        <span className="text-slate-500">Loading financial data…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-700 font-semibold">{error || 'No data'}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-red-600 underline">Retry</button>
      </div>
    );
  }

  const { totals, chart, byMethod, byProvider, outstanding, ageing,
          insurance, shifts, topServices, dailyComparison, refunds } = data;

  // Derived
  const todayNum      = parseFloat(totals.today);
  const yesterdayNum  = parseFloat(dailyComparison.yesterday);
  const todayChange   = pctChange(todayNum, yesterdayNum);
  const periodTotal   = parseFloat(totals.period_total);
  const outstandingTotal = parseFloat(outstanding.unpaid) + parseFloat(outstanding.partial);
  const chartData = chart.map(c => ({ period: c.period, revenue: parseFloat(c.revenue), transactions: parseInt(c.transactions) }));
  const pieData   = byMethod.map(m => ({ name: m.method.replace(/_/g, ' '), value: parseFloat(m.total), pct: parseFloat(m.pct) }));

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-2">
            <BarChart2 className="h-3 w-3" />
            Finance Reports
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Revenue, collections, receivables, and reconciliation — {data.label}
            {lastRefreshed && <span className="ml-2 text-xs text-slate-400">· Updated {lastRefreshed.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {PERIOD_OPTIONS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
                  ${period === p.value ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-500'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Today</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><DollarSign className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtK(todayNum)} ETB</div>
          {todayChange !== null && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${parseFloat(todayChange) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {parseFloat(todayChange) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(parseFloat(todayChange))}% vs yesterday
            </div>
          )}
          <div className="text-xs text-slate-400 mt-0.5">{dailyComparison.today_txns} transactions</div>
        </div>

        {/* Period total */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{data.label}</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600"><BarChart3 className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtK(periodTotal)} ETB</div>
          <div className="text-xs text-slate-400 mt-1">{totals.period_transactions} transactions</div>
          <div className="text-xs text-slate-400">Avg {fmt(totals.avg_transaction)} ETB/txn</div>
        </div>

        {/* This month */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">This Month</span>
            <div className="p-1.5 bg-violet-50 dark:bg-violet-900/30 rounded-lg text-violet-600"><TrendingUp className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{fmtK(totals.this_month)} ETB</div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">{fmt(totals.this_month)} ETB total</div>
        </div>

        {/* Outstanding */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Outstanding</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600"><AlertTriangle className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{fmtK(outstandingTotal)} ETB</div>
          <div className="text-xs text-slate-400 mt-1">{outstanding.unpaid_count} unpaid · {outstanding.partial_count} partial</div>
        </div>
      </div>

      {/* ── Revenue Trend Chart ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
          <Activity className="h-4 w-4 text-emerald-500" />
          Revenue Trend — {data.label}
        </h3>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No payment data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${fmtK(v)}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue (ETB)" stroke="#10b981" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Payment Mix + Receivables ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment method breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <CreditCard className="h-4 w-4 text-violet-500" />
            Payment Method Mix
          </h3>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
              <div className="space-y-2">
                {pieData.map((m, i) => (
                  <div key={m.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                          {METHOD_ICONS[m.name.replace(' ', '_')] || <DollarSign className="h-3.5 w-3.5" />}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 capitalize">{m.name}</span>
                      </div>
                      <span className="font-mono text-slate-900 dark:text-white">{fmt(m.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
              <PieChart width={100} height={100}>
                <Pie data={pieData} cx={45} cy={45} innerRadius={28} outerRadius={45} dataKey="value" strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </div>
          )}
        </div>

        {/* Receivables ageing */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-amber-500" />
            Receivables Ageing
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { l: 'Unpaid Invoices', v: fmt(outstanding.unpaid) + ' ETB', n: outstanding.unpaid_count, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
              { l: 'Partial Invoices', v: fmt(outstanding.partial) + ' ETB', n: outstanding.partial_count, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
            ].map(r => (
              <div key={r.l} className={`${r.bg} border rounded-xl p-3`}>
                <div className={`text-lg font-bold ${r.color}`}>{r.v}</div>
                <div className="text-xs text-slate-500">{r.n} {r.l.toLowerCase()}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {ageing.map((a, i) => {
              const colors = ['text-emerald-600', 'text-amber-600', 'text-orange-600', 'text-red-600'];
              return (
                <div key={a.bucket} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className={`font-medium ${colors[i] || 'text-slate-600'}`}>{a.bucket}</span>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{fmt(a.amount)} ETB</span>
                    <span className="text-slate-400 ml-2">({a.count} inv.)</span>
                  </div>
                </div>
              );
            })}
            {ageing.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No outstanding invoices 🎉</p>}
          </div>
        </div>
      </div>

      {/* ── Insurance + Shifts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insurance pipeline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-blue-500" />
            Insurance Claims Pipeline
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { l: 'Collected', v: insurance.insurance_collected, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { l: 'Approved', v: insurance.claims_approved,     color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
              { l: 'Pending',  v: insurance.claims_pending,      color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
            ].map(r => (
              <div key={r.l} className={`${r.bg} border rounded-xl p-3 text-center`}>
                <div className={`text-base font-bold ${r.color} font-mono`}>{fmtK(r.v)}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.l}</div>
              </div>
            ))}
          </div>
          {byProvider.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Digital Providers</div>
              {byProvider.map(p => (
                <div key={p.provider} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <span className="text-slate-700 dark:text-slate-300 capitalize">{p.provider?.replace(/_/g, ' ')}</span>
                  <div className="text-right">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{fmt(p.total)} ETB</span>
                    {parseInt(p.pending_count) > 0 && (
                      <span className="ml-2 text-amber-600">{p.pending_count} pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/insurance" className="mt-4 block text-center text-xs text-blue-600 hover:text-blue-800 font-semibold">
            Open Insurance Management →
          </Link>
        </div>

        {/* Shift reconciliation */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Shift Reconciliation — Last 30 Days
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { l: 'Total Shifts', v: shifts.total_shifts, color: 'text-slate-800 dark:text-white', bg: 'bg-slate-50 dark:bg-slate-900 border-slate-200' },
              { l: 'Reconciled', v: shifts.reconciled_shifts, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
              { l: 'Open Now', v: shifts.open_shifts, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
              { l: 'High Variance', v: shifts.high_variance_shifts, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
            ].map(r => (
              <div key={r.l} className={`${r.bg} border rounded-xl p-3 text-center`}>
                <div className={`text-xl font-bold ${r.color}`}>{r.v}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.l}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-2.5">
            <span>Avg Cash Variance:</span>
            <span className={`font-semibold ${parseFloat(shifts.avg_variance) > 50 ? 'text-red-600' : 'text-emerald-600'}`}>
              ±{fmt(shifts.avg_variance)} ETB
            </span>
          </div>
          {parseFloat(shifts.high_variance_shifts) > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {shifts.high_variance_shifts} shift{parseInt(shifts.high_variance_shifts) !== 1 ? 's' : ''} with variance &gt;50 ETB require finance review
            </div>
          )}
        </div>
      </div>

      {/* ── Top Services ───────────────────────────────────────────── */}
      {topServices.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
            <FileText className="h-4 w-4 text-slate-500" />
            Top Revenue Services — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topServices.map(s => ({ name: s.service.substring(0, 22) + (s.service.length > 22 ? '…' : ''), revenue: parseFloat(s.revenue) }))}
              margin={{ top: 4, right: 4, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => fmtK(v)} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue (ETB)" fill="#10b981" radius={[4, 4, 0, 0]}>
                {topServices.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Footer Stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: 'Annual Revenue (YTD)', v: `${fmt(totals.this_year)} ETB`, icon: <TrendingUp className="h-4 w-4 text-emerald-500" /> },
          { l: 'Refunds Issued', v: `${fmt(refunds.total_refunded)} ETB (${refunds.count} txns)`, icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
          { l: 'Insurance Claims Paid', v: `${fmt(insurance.claims_paid)} ETB`, icon: <Shield className="h-4 w-4 text-blue-500" /> },
          { l: 'Last Week Same Day', v: `${fmt(dailyComparison.last_week_same_day)} ETB`, icon: <BarChart2 className="h-4 w-4 text-violet-500" /> },
        ].map(stat => (
          <div key={stat.l} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="mb-2">{stat.icon}</div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{stat.v}</div>
            <div className="text-xs text-slate-400 mt-0.5">{stat.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinanceReportsPage;
