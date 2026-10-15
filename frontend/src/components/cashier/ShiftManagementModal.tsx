import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, X, RefreshCw
} from 'lucide-react';
import { fmt } from '../../utils/format';
import api from '../../services/api';

interface ShiftManagementModalProps {
  mode: 'open' | 'close';
  isOpen: boolean;
  onClose: () => void;
  activeShift?: any;
  onSuccess: (shiftData?: any) => void;
}

export const ShiftManagementModal: React.FC<ShiftManagementModalProps> = ({
  mode,
  isOpen,
  onClose,
  activeShift,
  onSuccess
}) => {
  const [openingCash, setOpeningCash] = useState('0');
  const [registerId, setRegisterId] = useState('REG-01');
  const [notes, setNotes] = useState('');
  
  // Close Shift states
  const [closingCashCounted, setClosingCashCounted] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [varianceReason, setVarianceReason] = useState('');
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && mode === 'close' && activeShift) {
      fetchSummary();
    }
  }, [isOpen, mode, activeShift]);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    setError('');
    try {
      const res = await api.get(`/cashier/shifts/${activeShift.id}/summary`);
      setShiftSummary(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load shift summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleOpenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cashVal = parseFloat(openingCash);
    if (isNaN(cashVal) || cashVal < 0) {
      setError('Opening cash float must be a non-negative number');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/cashier/shifts/open', {
        register_id: registerId,
        opening_cash: cashVal,
        notes
      });
      onSuccess(res.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const countedVal = parseFloat(closingCashCounted);
    if (isNaN(countedVal) || countedVal < 0) {
      setError('Please enter a valid counted physical cash amount');
      return;
    }

    const expectedCash = shiftSummary ? shiftSummary.expectedClosingCash : 0;
    const variance = countedVal - expectedCash;

    if (Math.abs(variance) > 50 && (!varianceReason || varianceReason.trim().length < 5)) {
      setError(`Cash variance (${variance.toFixed(2)} ETB) exceeds the 50 ETB threshold. A detailed explanation in the variance reason field is required.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/cashier/shifts/${activeShift.id}/close`, {
        closing_cash_counted: countedVal,
        closing_notes: closingNotes,
        variance_reason: varianceReason
      });
      onSuccess(res.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to close shift');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const expectedCash = shiftSummary ? shiftSummary.expectedClosingCash : 0;
  const countedNum = parseFloat(closingCashCounted) || 0;
  const variance = closingCashCounted !== '' ? countedNum - expectedCash : null;
  const hasPendingDigital = shiftSummary && shiftSummary.digitalStatus?.pendingCount > 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Cashier Shift Terminal
            </span>
            <h3 className="text-xl font-extrabold tracking-tight mt-1">
              {mode === 'open' ? 'Open New Cashier Shift' : 'Close Cashier Shift & Register'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {mode === 'open' ? (
          <form onSubmit={handleOpenSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Register Workstation ID
              </label>
              <select
                value={registerId}
                onChange={(e) => setRegisterId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white"
              >
                <option value="REG-01">Register Booth 01 (Main OPD Cashier)</option>
                <option value="REG-02">Register Booth 02 (Emergency Cashier)</option>
                <option value="REG-03">Register Booth 03 (Pharmacy Billing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Opening Cash Float (ETB) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-black text-slate-900 dark:text-white focus:border-emerald-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                  ETB
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Enter the physical change float placed in the register drawer before starting transactions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Opening Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Morning shift start, drawer inspected and balanced..."
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow"
              >
                {submitting ? 'Opening Shift...' : 'Open Shift & Activate Register'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCloseSubmit} className="p-6 space-y-4">
            {loadingSummary ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                Calculating live register collections...
              </div>
            ) : (
              <>
                {/* Expected Cash Banner */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Opening Cash Float:</span>
                    <span className="font-mono font-bold">{fmt(shiftSummary?.openingCash || 0)} ETB</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">+ Cash Collections:</span>
                    <span className="font-mono font-bold text-emerald-400">+{fmt(shiftSummary?.cashCollections || 0)} ETB</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Expected Drawer Cash:</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {fmt(expectedCash)} ETB
                    </span>
                  </div>
                </div>

                {/* Pending Digital Payment Alert */}
                {hasPendingDigital && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Pending Digital Payments Warning</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        There are {shiftSummary.digitalStatus.pendingCount} Telebirr/CBE transactions ({fmt(shiftSummary.digitalStatus.pending)} ETB) awaiting merchant statement verification. They are NOT included in physical cash.
                      </p>
                    </div>
                  </div>
                )}

                {/* Physical Cash Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Counted Physical Cash in Drawer *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={closingCashCounted}
                      onChange={(e) => setClosingCashCounted(e.target.value)}
                      placeholder="Enter actual counted cash"
                      required
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-black text-slate-900 dark:text-white focus:border-emerald-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      ETB
                    </span>
                  </div>
                </div>

                {/* Live Variance Calculation */}
                {variance !== null && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center justify-between font-bold ${
                    variance === 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : Math.abs(variance) <= 50
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  }`}>
                    <span>Calculated Variance:</span>
                    <span className="font-mono text-sm font-black">
                      {variance > 0 ? `+${fmt(variance)}` : fmt(variance)} ETB
                      {variance === 0 ? ' (Perfect Match ✓)' : Math.abs(variance) > 50 ? ' (Discrepancy Exceeds Threshold!)' : ' (Within tolerance)'}
                    </span>
                  </div>
                )}

                {/* Variance Reason if discrepancy */}
                {variance !== null && Math.abs(variance) > 50 && (
                  <div>
                    <label className="block text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5">
                      Mandatory Variance Explanation *
                    </label>
                    <textarea
                      value={varianceReason}
                      onChange={(e) => setVarianceReason(e.target.value)}
                      required
                      rows={2}
                      placeholder="Explain cause of shortage/overage (e.g. Change denomination discrepancy, unrecorded cash drop)..."
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Closing Remarks (Optional)
                  </label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    rows={2}
                    placeholder="General comments for the Z-report..."
                    className="w-full px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-3 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || closingCashCounted === ''}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    {submitting ? 'Closing Register...' : 'Finalize Shift & Generate Z-Report'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ShiftManagementModal;
