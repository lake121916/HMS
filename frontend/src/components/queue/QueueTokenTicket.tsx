/**
 * Queue Token Ticket Printable Component
 * Alem Ketema Enat Hospital Management System
 * Optimized for Thermal 80mm/58mm Slip & Standard Printers
 */

import React from 'react';
import { Printer, RefreshCw, X, CheckCircle2 } from 'lucide-react';

export interface QueueTicketData {
  id: number;
  queue_token: string;
  token_number: number;
  patient_name: string;
  department_name: string;
  patient_id?: number;
  encounter_id?: number;
  doctor_name?: string;
  consultation_room?: string;
  queue_date: string;
  created_at: string;
  ticket_printed_count?: number;
}

interface QueueTokenTicketProps {
  ticket: QueueTicketData;
  onClose?: () => void;
  onReprint?: (id: number) => void;
}

export const QueueTokenTicket: React.FC<QueueTokenTicketProps> = ({
  ticket,
  onClose,
  onReprint
}) => {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(ticket.queue_date || ticket.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedTime = new Date(ticket.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* On-screen modal card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
        {/* Modal Top Bar (Hidden during print) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>OPD Ticket Issued</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Printable Slip Area ──────────────────────────────── */}
        <div className="p-6 bg-white text-black font-mono text-center flex flex-col items-center" id="opd-ticket-print-area">
          {/* Header */}
          <div className="border-b-2 border-dashed border-gray-400 pb-3 w-full">
            <h2 className="text-sm font-black tracking-wider uppercase">
              ALEM KETEMA ENAT HOSPITAL
            </h2>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">
              Outpatient Department (OPD)
            </p>
            <p className="text-[11px] font-bold mt-1 text-gray-800">
              {ticket.department_name}
            </p>
          </div>

          {/* Token Big Callout */}
          <div className="my-5 w-full py-2 bg-gray-50 border border-gray-300 rounded-xl">
            <span className="text-[10px] tracking-widest text-gray-500 uppercase font-sans">
              TOKEN NUMBER
            </span>
            <div className="text-4xl font-black text-black tracking-tight my-1">
              {ticket.queue_token}
            </div>
            <div className="text-xs font-semibold text-gray-700">
              Queue #{ticket.token_number}
            </div>
          </div>

          {/* Visit & Assignment Details */}
          <div className="w-full text-left text-xs border-b-2 border-dashed border-gray-400 pb-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Date:</span>
              <span className="font-bold">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time:</span>
              <span className="font-semibold">{formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Patient:</span>
              <span className="font-bold">{ticket.patient_name}</span>
            </div>
            {ticket.doctor_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Doctor:</span>
                <span className="font-semibold">{ticket.doctor_name}</span>
              </div>
            )}
            {ticket.consultation_room && (
              <div className="flex justify-between">
                <span className="text-gray-500">Room:</span>
                <span className="font-black text-gray-900">{ticket.consultation_room}</span>
              </div>
            )}
            {(ticket.ticket_printed_count || 1) > 1 && (
              <div className="flex justify-between text-[10px] text-amber-700 font-bold pt-1">
                <span>Duplicate / Reprint:</span>
                <span>Copy #{ticket.ticket_printed_count}</span>
              </div>
            )}
          </div>

          {/* Patient Instructions */}
          <div className="mt-4 text-[10px] text-gray-600 leading-tight">
            <p className="font-bold text-gray-800 uppercase mb-1">
              Please Watch The Queue Screen
            </p>
            <p>
              Listen for your token number and chime. Proceed to the designated consultation room when called.
            </p>
            <p className="mt-2 text-[9px] text-gray-400">
              Alem Ketema, North Shewa, Ethiopia
            </p>
          </div>
        </div>

        {/* ── Modal Bottom Actions (Hidden during print) ─────── */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Printer className="h-4 w-4" />
            Print Slip (80mm)
          </button>
          {onReprint && (
            <button
              onClick={() => onReprint(ticket.id)}
              className="py-2.5 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
              title="Record authorized reprint"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reprint
            </button>
          )}
        </div>
      </div>

      {/* Embedded print stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #opd-ticket-print-area, #opd-ticket-print-area * {
            visibility: visible;
          }
          #opd-ticket-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QueueTokenTicket;
