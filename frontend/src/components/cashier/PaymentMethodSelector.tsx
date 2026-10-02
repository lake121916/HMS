import React from 'react';
import { CreditCard, Smartphone, Building2, Shield, DollarSign } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash', icon: DollarSign, color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'card', label: 'Card', icon: CreditCard, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'telebirr', label: 'Telebirr', icon: Smartphone, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'insurance', label: 'Insurance', icon: Shield, color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {paymentMethods.map((method) => {
        const Icon = method.icon;
        const isSelected = value === method.value;
        return (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            disabled={disabled}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
              isSelected
                ? `${method.color} border-current ring-2 ring-offset-1`
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-semibold">{method.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethodSelector;