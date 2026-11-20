import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, trend }) => {
  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-800 p-5 shadow-xs hover:border-cyan-500/30 transition-all flex flex-col justify-between min-h-[120px]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider leading-snug line-clamp-2">{label}</span>
        <div className={`p-2 rounded-xl shrink-0 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{value}</p>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
};

export default StatCard;