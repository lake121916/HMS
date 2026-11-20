import React, { useState } from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Sliders,
  RefreshCw
} from 'lucide-react';
import printerService from '../../services/printer/printerService';
import { PaperWidth, PrinterInterfaceType } from '../../services/printer/printerTypes';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({ isOpen, onClose }) => {
  const [selectedInterface, setSelectedInterface] = useState<PrinterInterfaceType>(
    printerService.getPreferredInterface()
  );
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(printerService.getPaperWidth());
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const interfaces = printerService.getAvailableInterfaces();

  const handleInterfaceChange = (type: PrinterInterfaceType) => {
    setSelectedInterface(type);
    printerService.setPreferredInterface(type);
    setTestStatus(null);
  };

  const handleWidthChange = (width: PaperWidth) => {
    setPaperWidth(width);
    printerService.setPaperWidth(width);
    setTestStatus(null);
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await printerService.testPrint();
      setTestStatus({
        success: res.success,
        message: res.message || 'Test print transmitted successfully'
      });
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err.message || 'Failed to dispatch test print'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0a1329] border border-cyan-500/25 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/15 bg-[#070e1e]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Thermal Printer Hardware Settings</h3>
              <p className="text-xs text-slate-400">ESC/POS WebUSB, Serial, Bluetooth & Fallback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Interface selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Communication Transport</span>
            </label>
            <div className="space-y-2">
              {interfaces.map((iface) => (
                <label
                  key={iface.type}
                  className={`flex items-start justify-between p-3 rounded-xl border cursor-pointer transition ${
                    selectedInterface === iface.type
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="printer_interface"
                      value={iface.type}
                      checked={selectedInterface === iface.type}
                      onChange={() => handleInterfaceChange(iface.type)}
                      className="text-cyan-500 focus:ring-cyan-500"
                    />
                    <div>
                      <div className="text-xs font-semibold">{iface.label}</div>
                      <div className="text-[10px] text-slate-500">
                        {iface.supported ? 'Supported on this device' : 'Unsupported on current browser'}
                      </div>
                    </div>
                  </div>
                  {iface.supported ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Ready
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500">
                      Unavailable
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Paper Width Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>Receipt Paper Roll Width</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['80mm', '58mm'] as const).map((width) => (
                <button
                  key={width}
                  type="button"
                  onClick={() => handleWidthChange(width)}
                  className={`p-3 rounded-xl border text-center transition ${
                    paperWidth === width
                      ? 'bg-teal-500/10 border-teal-500/50 text-white font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="text-sm">{width === '80mm' ? '80 mm (Standard)' : '58 mm (Compact)'}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {width === '80mm' ? '48 chars / line (Cashier POS)' : '32 chars / line (Wristband/Mobile)'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Test Status feedback */}
          {testStatus && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
                testStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-cyan-500/15 bg-[#070e1e]">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold transition border border-cyan-500/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Print Slip'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-xs font-bold hover:opacity-95 shadow-sm transition"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettingsModal;
