import React from 'react';
import { CreditCard, Smartphone, Building2, Shield, DollarSign } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', sublabel: 'Physical', icon: DollarSign, color: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700' },
  { value: 'card', label: 'Card', sublabel: 'POS Terminal', icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700' },
  { value: 'telebirr', label: 'Telebirr', sublabel: 'QR / Mobile', icon: Smartphone, color: 'bg-purple-50 text-purple-700 border-purple-400 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-600', badge: 'Telebirr' },
  { value: 'bank_transfer', label: 'CBE Birr', sublabel: 'Direct Bank', icon: Building2, color: 'bg-amber-50 text-amber-800 border-amber-400 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600', badge: 'CBE' },
  { value: 'insurance', label: 'Insurance', sublabel: 'Coverage', icon: Shield, color: 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-700' },
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
      {paymentMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = value === method.value;
        return (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            disabled={disabled}
            className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
              isSelected
                ? `${method.color} border-current ring-2 ring-emerald-500/20 shadow-md scale-[1.02]`
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {method.badge && (
              <span className={`absolute -top-2.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase rounded-full shadow-sm ${
                method.value === 'telebirr'
                  ? 'bg-purple-600 text-white'
                  : 'bg-amber-500 text-slate-950'
              }`}>
                {method.badge}
              </span>
            )}
            <div className={`p-2 rounded-xl mb-1 ${isSelected ? 'bg-white/60 dark:bg-black/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold leading-tight">{method.label}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{method.sublabel}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethodSelector;