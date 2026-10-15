/**
 * ThermalReceiptPrint — 80mm Thermal Receipt Display & Print
 * Renders a pixel-perfect thermal receipt format with hospital header,
 * itemised billing, QR-equivalent reference, and reprint tracking.
 */
import React, { useState, useRef } from 'react';
import api from '../../services/api';
import {
  Search, Printer, CheckCircle2, AlertTriangle,
  RefreshCw, Copy, RotateCcw
} from 'lucide-react';

interface ReceiptData {
  receipt: {
    id: number;
    receipt_number: string;
    amount: number;
    payment_method: string;
    payment_provider?: string;
    provider_reference?: string;
    verification_status: string;
    payment_date: string;
    notes?: string;
    reprint_count: number;
    last_reprinted_at?: string;
    cashier_name?: string;
    invoice_id: number;
    invoice_number?: string;
    invoice_total?: number;
    patient_name: string;
    patient_id: string;
    patient_phone?: string;
  };
  hospital: {
    hospital_name_en: string;
    hospital_name_am: string;
    address_en: string;
    telephone: string;
    tin_number: string;
    telebirr_merchant_till: string;
    cbe_account_number: string;
  };
  items: { id: number; service: string; quantity: number; unit_price: number; total: number }[];
}

const fmt = (n: number) => n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const methodLabel: Record<string, string> = {
  cash: 'Cash', card: 'Credit/Debit Card', telebirr: 'Telebirr',
  cbe_birr: 'CBE Birr', bank_transfer: 'Bank Transfer', insurance: 'Insurance',
  mobile_money: 'Mobile Money', online: 'Online', check: 'Cheque',
};

export const ThermalReceiptPrint: React.FC = () => {
  const [query, setQuery] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reprinting, setReprinting] = useState(false);
  const [reprintReason, setReprintReason] = useState('Patient requested additional copy');
  const [showReprintModal, setShowReprintModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const thermalRef = useRef<HTMLDivElement>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/cashier/receipt/${query.trim()}`);
      setReceipt(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Receipt not found');
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = thermalRef.current?.innerHTML;
    if (!content || !receipt) return;
    const w = window.open('', '_blank', 'width=320,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt ${receipt.receipt.receipt_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          width: 80mm;
          margin: 0 auto;
          padding: 4mm;
          color: #000;
          background: #fff;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .large { font-size: 14px; }
        .xlarge { font-size: 18px; }
        .divider { border-top: 1px dashed #555; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; padding: 1px 0; }
        .items-table { width: 100%; margin-top: 4px; }
        .items-table th { text-align: left; font-size: 9px; border-bottom: 1px solid #000; padding-bottom: 2px; }
        .items-table td { font-size: 10px; padding: 1px 0; vertical-align: top; }
        .amount-col { text-align: right; }
        .total-row { border-top: 1px solid #000; padding-top: 3px; font-weight: bold; }
        .reprint-note { background: #fef3c7; padding: 3px; font-size: 9px; text-align: center; margin-top: 4px; }
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { width: 80mm; }
        }
      </style></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const handleReprint = async () => {
    if (!receipt) return;
    setReprinting(true);
    try {
      await api.post(`/cashier/receipts/${receipt.receipt.id}/reprint`, {
        reason: reprintReason,
      });
      // Refresh receipt with updated reprint_count
      const refreshed = await api.get(`/cashier/receipt/${receipt.receipt.receipt_number}`);
      setReceipt(refreshed.data.data);
      setShowReprintModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reprint failed');
    } finally {
      setReprinting(false);
    }
  };

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const r = receipt?.receipt;
  const h = receipt?.hospital;
  const isReprint = (r?.reprint_count ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Reprint modal */}
      {showReprintModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Confirm Reprint — Audit Record
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              This reprint will be logged in the financial audit trail. Copy #{(r?.reprint_count ?? 0) + 1}.
            </p>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Reason for Reprint *</label>
            <input
              value={reprintReason}
              onChange={e => setReprintReason(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowReprintModal(false)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-100">
                Cancel
              </button>
              <button onClick={handleReprint} disabled={reprinting || !reprintReason.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50">
                <RotateCcw className="h-3.5 w-3.5" />
                {reprinting ? 'Processing…' : 'Confirm Reprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <form onSubmit={lookup} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter receipt number (e.g. RCP-2026-001005) or payment ID…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Look Up
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {receipt && r && h && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* ── 80mm Thermal Preview ─────────────────── */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">80mm Thermal Preview</div>
            <div className="bg-white border-2 border-slate-200 rounded-xl shadow-inner overflow-hidden" style={{ width: '100%', maxWidth: 320 }}>
              <div
                ref={thermalRef}
                className="px-4 py-4"
                style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 11, lineHeight: 1.5, color: '#111' }}
              >
                {/* Reprint banner */}
                {isReprint && (
                  <div className="center reprint-note"
                    style={{ textAlign: 'center', background: '#fef3c7', padding: '3px', fontSize: 9, marginBottom: 6 }}>
                    *** COPY #{r.reprint_count} — NOT ORIGINAL ***
                  </div>
                )}

                {/* Hospital header */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 13 }}>{h.hospital_name_en}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>{h.hospital_name_am}</div>
                  <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{h.address_en}</div>
                  <div style={{ fontSize: 9, color: '#666' }}>Tel: {h.telephone}</div>
                  <div style={{ fontSize: 9, color: '#666' }}>TIN: {h.tin_number}</div>
                </div>

                <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

                {/* Receipt title */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13, letterSpacing: 2 }}>
                  OFFICIAL RECEIPT
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#555', marginBottom: 4 }}>
                  {r.receipt_number}
                </div>

                <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

                {/* Patient info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#555' }}>Patient:</span>
                  <span style={{ fontWeight: 600 }}>{r.patient_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#555' }}>ID:</span>
                  <span>{r.patient_id}</span>
                </div>
                {r.patient_phone && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: '#555' }}>Phone:</span>
                    <span>{r.patient_phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#555' }}>Invoice:</span>
                  <span>{r.invoice_number || `INV-${r.invoice_id}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: '#555' }}>Date:</span>
                  <span>{new Date(r.payment_date).toLocaleString('en-ET')}</span>
                </div>
                {r.cashier_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: '#555' }}>Cashier:</span>
                    <span>{r.cashier_name}</span>
                  </div>
                )}

                <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />

                {/* Line items */}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', fontSize: 9, borderBottom: '1px solid #333', paddingBottom: 2 }}>ITEM</th>
                      <th style={{ textAlign: 'center', fontSize: 9, borderBottom: '1px solid #333' }}>QTY</th>
                      <th style={{ textAlign: 'right', fontSize: 9, borderBottom: '1px solid #333' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: 10, paddingTop: 2, paddingBottom: 1, maxWidth: 140, wordBreak: 'break-word' }}>{item.service}</td>
                        <td style={{ fontSize: 10, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ fontSize: 10, textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ borderTop: '2px solid #000', marginTop: 6, paddingTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 13 }}>
                    <span>AMOUNT PAID</span>
                    <span>{fmt(r.amount)} ETB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10 }}>
                    <span style={{ color: '#555' }}>Payment Method:</span>
                    <span style={{ fontWeight: 600 }}>{methodLabel[r.payment_method] || r.payment_method}</span>
                  </div>
                  {r.provider_reference && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555' }}>
                      <span>Ref:</span>
                      <span style={{ fontFamily: 'monospace' }}>{r.provider_reference}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 2 }}>
                    <span style={{ color: '#555' }}>Status:</span>
                    <span style={{ fontWeight: 600 }}>{r.verification_status}</span>
                  </div>
                </div>

                {/* Digital payment instructions */}
                {['telebirr', 'cbe_birr', 'bank_transfer'].includes(r.payment_method) && (
                  <>
                    <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
                    <div style={{ fontSize: 9, textAlign: 'center', color: '#555' }}>
                      {r.payment_method === 'telebirr'
                        ? `Telebirr Till: *127*6*${h.telebirr_merchant_till}#`
                        : `CBE Account: ${h.cbe_account_number}`}
                    </div>
                  </>
                )}

                <div style={{ borderTop: '1px dashed #999', margin: '6px 0' }} />
                <div style={{ textAlign: 'center', fontSize: 9, color: '#888' }}>
                  Thank you for choosing {h.hospital_name_en}
                </div>
                <div style={{ textAlign: 'center', fontSize: 8, color: '#aaa', marginTop: 2 }}>
                  Keep this receipt for your records
                </div>
              </div>
            </div>
          </div>

          {/* ── Actions + Details ────────────────────── */}
          <div className="space-y-4">
            {/* Verification status badge */}
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
              r.verification_status === 'VERIFIED'
                ? 'bg-emerald-50 border border-emerald-200'
                : r.verification_status === 'PENDING'
                ? 'bg-amber-50 border border-amber-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {r.verification_status === 'VERIFIED'
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                : <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />}
              <div>
                <div className={`font-semibold text-sm ${
                  r.verification_status === 'VERIFIED' ? 'text-emerald-800' :
                  r.verification_status === 'PENDING' ? 'text-amber-800' : 'text-red-800'
                }`}>Payment {r.verification_status}</div>
                {r.verification_status === 'PENDING' && (
                  <div className="text-xs text-amber-700 mt-0.5">Awaiting transaction reference reconciliation</div>
                )}
              </div>
            </div>

            {/* Reprint history */}
            {isReprint && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                <div className="font-semibold">Reprint History</div>
                <div className="text-xs mt-1">
                  Printed {r.reprint_count} additional time{r.reprint_count !== 1 ? 's' : ''}.
                  Last reprinted: {r.last_reprinted_at ? new Date(r.last_reprinted_at).toLocaleString('en-ET') : '—'}
                </div>
              </div>
            )}

            {/* Reference copy */}
            {r.provider_reference && (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3">
                <div className="text-xs text-slate-500 mb-1">Transaction Reference</div>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm text-slate-900 dark:text-white flex-1">{r.provider_reference}</code>
                  <button onClick={() => copyRef(r.provider_reference!)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition shadow">
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button onClick={() => setShowReprintModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-amber-300 hover:bg-amber-50 text-amber-700 text-sm font-semibold rounded-xl transition">
                <RotateCcw className="h-4 w-4" />
                Reprint (Log Copy #{(r.reprint_count ?? 0) + 1})
              </button>
            </div>
          </div>
        </div>
      )}

      {!receipt && !loading && !error && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 p-12 text-center">
          <Printer className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Search for a receipt number or payment ID above</p>
          <p className="text-slate-400 text-xs mt-1">Format: RCP-YYYY-NNNNNN or numeric payment ID</p>
        </div>
      )}
    </div>
  );
};

export default ThermalReceiptPrint;
