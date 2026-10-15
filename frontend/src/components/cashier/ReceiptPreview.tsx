import React, { useState } from 'react';
import {
  Printer, Download, RefreshCw, Settings, Info, X
} from 'lucide-react';
import { toNum, fmt } from '../../utils/format';

export interface ReceiptItem {
  id?: number | string;
  service: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
  total?: number;
}

export interface HospitalConfig {
  hospital_name_en?: string;
  hospital_name_am?: string;
  address_en?: string;
  address_am?: string;
  telephone?: string;
  tin_number?: string;
  telebirr_merchant_till?: string;
  cbe_account_number?: string;
  cbe_account_name?: string;
  cbe_branch?: string;
  default_paper_width?: string;
}

export interface ReceiptData {
  id?: number;
  receipt_number: string;
  invoice_number: string;
  invoice_total?: number;
  invoice_subtotal?: number;
  invoice_discount?: number;
  invoice_tax?: number;
  patient_name: string;
  patient_id: string;
  patient_phone?: string;
  amount: number;
  payment_method: string;
  payment_provider?: string;
  provider_reference?: string;
  payment_date: string;
  cashier_name: string;
  register_id?: string;
  verification_status?: string;
  reprint_count?: number;
  is_reprint?: boolean;
  items?: ReceiptItem[];
}

interface ReceiptPreviewProps {
  receipt: ReceiptData;
  hospital?: HospitalConfig;
  onPrint?: () => void;
  onReprint?: () => Promise<void> | void;
  onDownload?: (receiptData?: ReceiptData) => void;
  onClose?: () => void;
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  receipt,
  hospital,
  onPrint,
  onReprint,
  onDownload,
  onClose
}) => {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm' | 'standard'>('80mm');
  const [isReprinting, setIsReprinting] = useState(false);
  const [showDriverHelp, setShowDriverHelp] = useState(false);

  // Hospital official identifiers
  const hospNameEn = hospital?.hospital_name_en || 'Alem Ketema Enat Hospital';
  const hospNameAm = hospital?.hospital_name_am || 'አለም ከተማ እናት ጠቅላላ ሆስፒታል';
  const hospAddressEn = hospital?.address_en || 'Alem Ketema, North Shewa Zone, Amhara Region, Ethiopia';
  const hospAddressAm = hospital?.address_am || 'ዓለም ከተማ፣ ሰሜን ሸዋ ዞን፣ አማራ ክልል፣ ኢትዮጵያ';
  const hospTel = hospital?.telephone || '+251 58 226 0123 / +251 91 123 4567';
  const hospTin = hospital?.tin_number || '0012938475';
  const telebirrTill = hospital?.telebirr_merchant_till || '654321';
  const cbeAccount = hospital?.cbe_account_number || '1000189922341';

  const safeAmount = toNum(receipt.amount);
  const subtotal = toNum(receipt.invoice_subtotal || receipt.amount);
  const discount = toNum(receipt.invoice_discount || 0);
  const tax = toNum(receipt.invoice_tax || 0);
  const totalDue = toNum(receipt.invoice_total || receipt.amount);
  const balance = Math.max(0, totalDue - safeAmount);

  const formattedDate = receipt.payment_date
    ? new Date(receipt.payment_date).toLocaleString('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short'
      })
    : new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });

  const isReprint = Boolean(receipt.is_reprint || (receipt.reprint_count && receipt.reprint_count > 0));
  const reprintCount = receipt.reprint_count || 1;

  const handlePrintTrigger = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const handleReprintTrigger = async () => {
    if (!onReprint) return;
    try {
      setIsReprinting(true);
      await onReprint();
    } finally {
      setIsReprinting(false);
    }
  };

  const handleDownloadTrigger = () => {
    if (onDownload) {
      onDownload(receipt);
    } else {
      // Default download HTML
      const html = generateReceiptDownloadHtml(receipt, hospital, paperWidth);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${receipt.receipt_number || 'thermal'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar & Thermal Configuration (Screen Only) ──────────────── */}
      <div className="no-print bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300">Thermal Roll Width:</span>
          <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                paperWidth === '80mm'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              80 mm (POS)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                paperWidth === '58mm'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              58 mm (Mini)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('standard')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                paperWidth === 'standard'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              A4 / Full
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDriverHelp(!showDriverHelp)}
            className="text-xs font-semibold text-slate-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
          >
            <Info className="w-3.5 h-3.5" /> Printer Guide
          </button>

          <button
            type="button"
            onClick={handleDownloadTrigger}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>

          {onReprint && (
            <button
              type="button"
              onClick={handleReprintTrigger}
              disabled={isReprinting}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReprinting ? 'animate-spin' : ''}`} />
              Authorized Reprint
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintTrigger}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all"
          >
            <Printer className="w-4 h-4" /> Print Thermal Slip
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Printer Driver Note */}
      {showDriverHelp && (
        <div className="no-print bg-blue-950/60 border border-blue-800/80 rounded-2xl p-3.5 text-xs text-blue-200 space-y-1">
          <p className="font-extrabold text-blue-300 flex items-center gap-1.5">
            <Info className="w-4 h-4" /> Thermal Receipt Printer Setup Notice:
          </p>
          <p>
            In your system print dialog (Chrome/Edge/Firefox), ensure paper size is set to{' '}
            <strong className="text-white">80mm (or 58mm roll)</strong> and margins are set to{' '}
            <strong className="text-white">None</strong>. Disable "Headers and Footers" to prevent browser URL printing on thermal slips.
          </p>
        </div>
      )}

      {/* ── Printable Thermal Isolation Wrapper ────────────────────────── */}
      <div className="receipt-print-wrapper flex justify-center bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div
          className={`thermal-receipt-container shadow-2xl rounded-sm border border-slate-300 dark:border-slate-700 bg-white text-slate-950 ${
            paperWidth === '80mm'
              ? 'paper-80mm'
              : paperWidth === '58mm'
              ? 'paper-58mm'
              : 'paper-standard'
          }`}
        >
          {/* Header */}
          <div className="receipt-header">
            <div className="hospital-title-am font-amharic">{hospNameAm}</div>
            <div className="hospital-title-en">{hospNameEn}</div>
            <div className="hospital-contact">
              <span className="block font-amharic">{hospAddressAm}</span>
              <span className="block">{hospAddressEn}</span>
              <span className="block font-semibold">TIN: {hospTin} | Tel: {hospTel}</span>
            </div>
            <div className="receipt-type-badge">
              Official Payment Receipt — ይፋዊ የክፍያ ደረሰኝ
            </div>
          </div>

          {/* Reprint Notice Banner */}
          {isReprint && (
            <div className="receipt-reprint-banner">
              *** REPRINT / ድጋሚ የታተመ (COPY #{reprintCount}) ***
            </div>
          )}

          {/* Receipt Meta Data */}
          <div className="receipt-divider" />
          <div className="receipt-meta-row">
            <span className="label">RECEIPT NO / ደረሰኝ:</span>
            <span className="val font-mono">{receipt.receipt_number || 'PENDING'}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="label">INVOICE REF / መጠየቂያ:</span>
            <span className="val font-mono">{receipt.invoice_number || 'N/A'}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="label">DATE & TIME / ቀን:</span>
            <span className="val">{formattedDate}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="label">CASHIER / ገንዘብ ተቀባይ:</span>
            <span className="val">{receipt.cashier_name || 'Hospital Cashier'}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="label">REGISTER / ሬጅስተር:</span>
            <span className="val">{receipt.register_id || 'REG-01'}</span>
          </div>

          {/* Patient Details */}
          <div className="receipt-divider" />
          <div className="receipt-meta-row">
            <span className="label">PATIENT / ታካሚ:</span>
            <span className="val font-bold">{receipt.patient_name || 'Walk-in Patient'}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="label">PATIENT ID (MRN):</span>
            <span className="val font-mono">{receipt.patient_id || 'N/A'}</span>
          </div>
          {receipt.patient_phone && (
            <div className="receipt-meta-row">
              <span className="label">PHONE / ስልክ:</span>
              <span className="val">{receipt.patient_phone}</span>
            </div>
          )}

          {/* Itemized Table */}
          <div className="receipt-divider-double" />
          <table className="receipt-items-table">
            <thead>
              <tr>
                <th>ITEM / አገልግሎት</th>
                <th className="text-center">QTY</th>
                <th className="text-right">PRICE</th>
                <th className="text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items && receipt.items.length > 0 ? (
                receipt.items.map((item, idx) => {
                  const qty = item.quantity || 1;
                  const price = toNum(item.unit_price || item.amount || 0);
                  const lineTotal = toNum(item.total || qty * price);
                  return (
                    <tr key={idx}>
                      <td>{item.service}</td>
                      <td className="text-center">{qty}</td>
                      <td className="text-right font-mono">{fmt(price)}</td>
                      <td className="text-right font-mono font-bold">{fmt(lineTotal)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td>General Hospital Clinical Care</td>
                  <td className="text-center">1</td>
                  <td className="text-right font-mono">{fmt(safeAmount)}</td>
                  <td className="text-right font-mono font-bold">{fmt(safeAmount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="receipt-totals">
            <div className="total-row">
              <span className="label">SUBTOTAL:</span>
              <span className="val font-mono">{fmt(subtotal)} ETB</span>
            </div>
            {discount > 0 && (
              <div className="total-row">
                <span className="label">DISCOUNT / ቅናሽ:</span>
                <span className="val font-mono">-{fmt(discount)} ETB</span>
              </div>
            )}
            {tax > 0 && (
              <div className="total-row">
                <span className="label">TAX:</span>
                <span className="val font-mono">{fmt(tax)} ETB</span>
              </div>
            )}
            <div className="grand-total-row">
              <span>TOTAL DUE / ጠቅላላ:</span>
              <span className="font-mono">{fmt(totalDue)} ETB</span>
            </div>
            <div className="total-row" style={{ fontWeight: 800 }}>
              <span className="label">PAID / የተከፈለ:</span>
              <span className="val font-mono text-emerald-800">{fmt(safeAmount)} ETB (ብር)</span>
            </div>
            <div className="total-row">
              <span className="label">BALANCE / ቀሪ ሂሳብ:</span>
              <span className="val font-mono">{fmt(balance)} ETB</span>
            </div>
          </div>

          {/* Payment Method & Transaction Reference */}
          <div className="receipt-divider" />
          <div className="receipt-meta-row">
            <span className="label">PAYMENT METHOD / ዘዴ:</span>
            <span className="val uppercase font-bold">
              {(receipt.payment_method || 'cash').replace('_', ' ')}
            </span>
          </div>

          {receipt.provider_reference && (
            <div className="receipt-meta-row">
              <span className="label">TXN REF / ማጣቀሻ:</span>
              <span className="val font-mono font-bold">{receipt.provider_reference}</span>
            </div>
          )}

          {receipt.payment_method === 'telebirr' && (
            <div className="receipt-meta-row">
              <span className="label">TELEBIRR TILL:</span>
              <span className="val font-mono">{telebirrTill}</span>
            </div>
          )}

          {(receipt.payment_method === 'cbe_birr' || receipt.payment_method === 'bank_transfer') && (
            <div className="receipt-meta-row">
              <span className="label">CBE A/C:</span>
              <span className="val font-mono">{cbeAccount}</span>
            </div>
          )}

          <div className="receipt-meta-row">
            <span className="label">STATUS / ሁኔታ:</span>
            <span className="val font-bold">
              {receipt.verification_status === 'VERIFIED'
                ? 'PAID & VERIFIED (ተረጋግጧል) ✓'
                : 'PENDING RECONCILIATION (በማጣራት ላይ)'}
            </span>
          </div>

          {/* Signatures */}
          <div className="receipt-signatures">
            <div className="sign-line">
              <span>Cashier Signature / ፊርማ:</span>
              <span>_________________</span>
            </div>
            <div className="sign-line">
              <span>Patient Acknowledgment:</span>
              <span>_________________</span>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="receipt-divider" />
          <div className="receipt-footer-notes font-amharic">
            <p className="font-bold">እናመሰግናለን! / THANK YOU FOR CHOOSING US</p>
            <p>አለም ከተማ እናት ጠቅላላ ሆስፒታል</p>
            <p style={{ fontSize: '0.85em', color: '#555555' }}>
              Computer-generated official hospital receipt. No alterations permitted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Generates standalone downloadable HTML formatted for thermal rolls
 */
function generateReceiptDownloadHtml(
  receipt: ReceiptData,
  hospital?: HospitalConfig,
  paperWidth: '80mm' | '58mm' | 'standard' = '80mm'
): string {
  const hospNameEn = hospital?.hospital_name_en || 'Alem Ketema Enat Hospital';
  const hospNameAm = hospital?.hospital_name_am || 'አለም ከተማ እናት ጠቅላላ ሆስፒታል';
  const hospAddressEn = hospital?.address_en || 'Alem Ketema, North Shewa, Amhara Region, Ethiopia';
  const hospAddressAm = hospital?.address_am || 'ዓለም ከተማ፣ ሰሜን ሸዋ፣ አማራ ክልል';
  const hospTel = hospital?.telephone || '+251 58 226 0123';
  const hospTin = hospital?.tin_number || '0012938475';

  const widthCss = paperWidth === '58mm' ? '56mm' : paperWidth === '80mm' ? '76mm' : '450px';

  return `<!DOCTYPE html>
<html lang="am">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${receipt.receipt_number || 'Thermal'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;700;800&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page { margin: 0; size: auto; }
    body {
      margin: 0;
      padding: 6px;
      font-family: 'Noto Sans Ethiopic', 'Courier Prime', Courier, monospace;
      color: #000;
      background: #fff;
      width: ${widthCss};
      box-sizing: border-box;
      font-size: ${paperWidth === '58mm' ? '9px' : '11px'};
      line-height: 1.25;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: 800; }
    .border-b { border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
    .border-t { border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px; }
    .row { display: flex; justify-content: space-between; margin: 1.5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th { border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: left; padding: 2px 0; }
    td { padding: 2px 0; }
  </style>
</head>
<body>
  <div class="text-center border-b">
    <div class="bold" style="font-size: 1.2em;">${hospNameAm}</div>
    <div class="bold">${hospNameEn}</div>
    <div>${hospAddressAm}</div>
    <div>${hospAddressEn}</div>
    <div>TIN: ${hospTin} | Tel: ${hospTel}</div>
    <div class="bold border-t" style="margin-top: 3px;">OFFICIAL RECEIPT — ይፋዊ ደረሰኝ</div>
  </div>

  ${receipt.is_reprint || (receipt.reprint_count && receipt.reprint_count > 0) ? `
  <div class="text-center bold" style="border: 1px solid #000; padding: 2px; margin: 3px 0;">
    *** REPRINT / ድጋሚ የታተመ (COPY #${receipt.reprint_count || 1}) ***
  </div>` : ''}

  <div class="row"><span>RECEIPT NO:</span><span class="bold">${receipt.receipt_number || 'N/A'}</span></div>
  <div class="row"><span>INVOICE REF:</span><span>${receipt.invoice_number || 'N/A'}</span></div>
  <div class="row"><span>DATE:</span><span>${new Date(receipt.payment_date || Date.now()).toLocaleString()}</span></div>
  <div class="row"><span>CASHIER:</span><span>${receipt.cashier_name || 'Hospital Cashier'}</span></div>
  <div class="row"><span>PATIENT:</span><span class="bold">${receipt.patient_name || 'Walk-in'}</span></div>
  <div class="row"><span>MRN:</span><span>${receipt.patient_id || 'N/A'}</span></div>

  <div class="border-t"></div>
  <table>
    <thead><tr><th>ITEM</th><th class="text-center">QTY</th><th class="text-right">TOTAL</th></tr></thead>
    <tbody>
      ${receipt.items && receipt.items.length > 0 ? receipt.items.map(i => `
        <tr><td>${i.service}</td><td class="text-center">${i.quantity || 1}</td><td class="text-right bold">${fmt(toNum(i.total || i.amount || 0))}</td></tr>
      `).join('') : `<tr><td>Clinical Services</td><td class="text-center">1</td><td class="text-right bold">${fmt(toNum(receipt.amount))}</td></tr>`}
    </tbody>
  </table>

  <div class="border-t">
    <div class="row bold" style="font-size: 1.15em;"><span>TOTAL PAID:</span><span>${fmt(toNum(receipt.amount))} ETB</span></div>
    <div class="row"><span>METHOD:</span><span class="bold">${(receipt.payment_method || 'cash').toUpperCase()}</span></div>
    ${receipt.provider_reference ? `<div class="row"><span>REF CODE:</span><span class="bold">${receipt.provider_reference}</span></div>` : ''}
    <div class="row"><span>STATUS:</span><span class="bold">PAID & CONFIRMED ✓</span></div>
  </div>

  <div style="margin-top: 14px; border-top: 1px dashed #000; padding-top: 2px;">
    <div>Cashier Signature: __________________</div>
    <div style="margin-top: 10px;">Patient Signature: __________________</div>
  </div>

  <div class="text-center border-t" style="margin-top: 8px;">
    <div class="bold">እናመሰግናለን! / THANK YOU</div>
    <div>Alem Ketema Enat General Hospital</div>
  </div>
</body>
</html>`;
}

export default ReceiptPreview;