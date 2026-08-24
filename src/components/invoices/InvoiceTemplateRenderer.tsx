import React from 'react';
import { Invoice, BusinessProfile, InvoiceTemplateConfig, InvoiceItem } from '../../types';
import { formatCurrency, formatDate, numberToIndianWords, normalizeSignatureUrl } from '../../utils/formatters';
import { buildUpiPaymentUri, cleanUpiId } from '../../utils/upi';
import { QrCodeSvg } from '../common/QrCodeSvg';
import { ShieldCheck, Sparkles, Building, Phone, Mail, MapPin, Globe } from 'lucide-react';

interface InvoiceTemplateRendererProps {
  invoice: Invoice;
  business: BusinessProfile;
  template: InvoiceTemplateConfig;
  printCopyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';
  fitToOnePage?: boolean;
  isInteractivePreview?: boolean;
}

export const InvoiceTemplateRenderer: React.FC<InvoiceTemplateRendererProps> = ({
  invoice,
  business,
  template,
  printCopyType = 'ORIGINAL',
  fitToOnePage = false,
  isInteractivePreview = false,
}) => {
  const activeSignatureUrl = normalizeSignatureUrl(business.signatureUrl);
  const showSig = template.showSignature && (business.showSignatureOnInvoice !== false);
  const effectiveUpiId = cleanUpiId(business.upiId) || 'bharattech@okhdfcbank';
  const upiPaymentUri = buildUpiPaymentUri({
    upiId: effectiveUpiId,
    payeeName: business.tradeName || business.name,
    amount: invoice.amountDue !== undefined && invoice.amountDue > 0 ? invoice.amountDue : invoice.grandTotal,
    invoiceNumber: invoice.invoiceNumber,
    note: `Invoice ${invoice.invoiceNumber}`,
  });

  const copyLabel = printCopyType === 'ORIGINAL' 
    ? 'ORIGINAL FOR RECIPIENT' 
    : printCopyType === 'DUPLICATE' 
      ? 'DUPLICATE FOR TRANSPORTER' 
      : 'TRIPLICATE FOR SUPPLIER';

  const fontClass = template.fontFamily === 'serif'
    ? 'font-serif'
    : template.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  // Payment Method Info Helper
  const paymentInfo = (() => {
    switch (invoice.paymentMethod) {
      case 'CASH':
        return { 
          label: 'Cash Payment', 
          short: 'Cash', 
          icon: '💵', 
          code: 'CASH', 
          description: 'Settled via Counter Cash',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' 
        };
      case 'UPI':
        return { 
          label: 'UPI / QR Code', 
          short: 'UPI', 
          icon: '⚡', 
          code: 'UPI', 
          description: 'Settled via UPI Instant QR',
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300' 
        };
      case 'BANK_TRANSFER':
        return { 
          label: 'Bank Transfer (NEFT/RTGS/IMPS)', 
          short: 'Bank Transfer', 
          icon: '🏛️', 
          code: 'BANK_TRANSFER', 
          description: 'Direct Bank Remittance',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-300' 
        };
      case 'CREDIT_CARD':
        return { 
          label: 'Credit / Debit Card', 
          short: 'Card', 
          icon: '💳', 
          code: 'CARD', 
          description: 'POS Card Payment',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-300' 
        };
      case 'CHEQUE':
        return { 
          label: 'Cheque Payment', 
          short: 'Cheque', 
          icon: '📝', 
          code: 'CHEQUE', 
          description: 'Cheque Deposit',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300' 
        };
      case 'OTHER':
        return { 
          label: 'Other Mode', 
          short: 'Other', 
          icon: '🏷️', 
          code: 'OTHER', 
          description: 'Recorded Mode',
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' 
        };
      default:
        return { 
          label: 'Cash / UPI / Bank Transfer', 
          short: 'Cash / UPI / Bank', 
          icon: '💳', 
          code: 'MULTI', 
          description: 'Multiple Channels Accepted',
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' 
        };
    }
  })();

  // Format HSN Summary Table
  const hsnSummaryMap = new Map<string, {
    hsnCode: string;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
  }>();

  invoice.items.forEach(item => {
    const key = `${item.hsnCode}_${item.gstRate}`;
    const existing = hsnSummaryMap.get(key);
    if (existing) {
      existing.taxableAmount += item.taxableAmount;
      existing.cgstAmount += item.cgstAmount;
      existing.sgstAmount += item.sgstAmount;
      existing.igstAmount += item.igstAmount;
      existing.totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount);
    } else {
      hsnSummaryMap.set(key, {
        hsnCode: item.hsnCode || 'N/A',
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalTax: (item.cgstAmount + item.sgstAmount + item.igstAmount),
      });
    }
  });

  const hsnSummaryList = Array.from(hsnSummaryMap.values());

  // THERMAL POS FORMAT
  if (template.headerStyle === 'THERMAL' || template.id === 'THERMAL_POS') {
    return (
      <div className={`text-slate-900 font-mono text-[11px] leading-tight space-y-2.5 ${isInteractivePreview ? 'max-w-sm mx-auto' : ''}`}>
        <div className="text-center pb-2 border-b border-dashed border-slate-400">
          <h2 className="font-bold text-sm uppercase tracking-wide">{business.tradeName || business.name}</h2>
          <p className="text-[10px]">{business.address}, {business.city} - {business.pincode}</p>
          <p className="text-[10px] font-bold">GSTIN: {business.gstin}</p>
          <p className="text-[10px]">Ph: {business.phone}</p>
        </div>

        <div className="py-1.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="font-bold">Bill No: {invoice.invoiceNumber}</span>
            <span>{formatDate(invoice.invoiceDate)}</span>
          </div>
          <div>Customer: <span className="font-bold">{invoice.customerName}</span></div>
          {invoice.customerGstin && <div>GST: {invoice.customerGstin}</div>}
          <div>POS: {invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</div>
        </div>

        {/* Item Rows */}
        <div className="py-1.5 border-b border-dashed border-slate-400">
          <div className="flex justify-between font-bold pb-1 text-[10px] border-b border-dotted border-slate-300">
            <span>Particulars</span>
            <span>Qty x Rate</span>
            <span>Amt (₹)</span>
          </div>
          {invoice.items.map((item, idx) => (
            <div key={item.id || idx} className="py-1.5 border-b border-dotted border-slate-200 last:border-0">
              <div className="flex justify-between text-[10px]">
                <div className="truncate max-w-[130px] font-semibold">{item.name}</div>
                <div>{item.quantity} {item.unit} x ₹{item.rate}</div>
                <div className="font-bold">{formatCurrency(item.totalAmount, '')}</div>
              </div>
              <div className="text-[8.5px] text-slate-600 mt-0.5 space-y-0.5">
                {item.hsnCode && <span>HSN: {item.hsnCode} • GST: {item.gstRate}%</span>}
                {template.showSerialNumber && item.serialNumber && (
                  <div className="text-blue-800">Sr. No: {item.serialNumber}</div>
                )}
                {template.showWarranty && item.warranty && (
                  <div className="text-emerald-700">Warranty: {item.warranty}</div>
                )}
                {template.showDescription && item.description && (
                  <div className="italic text-slate-500 whitespace-pre-line">{item.description}</div>
                )}
                {template.showBatchNumber && item.batchNumber && (
                  <div>Batch: {item.batchNumber}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="py-1.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span>Taxable Value:</span>
            <span>{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
          </div>
          {invoice.isInterState ? (
            <div className="flex justify-between text-[10px]">
              <span>IGST:</span>
              <span>{formatCurrency(invoice.totalIgst, business.currencySymbol)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-[10px]">
                <span>CGST:</span>
                <span>{formatCurrency(invoice.totalCgst, business.currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>SGST:</span>
                <span>{formatCurrency(invoice.totalSgst, business.currencySymbol)}</span>
              </div>
            </>
          )}
          {invoice.roundOff !== 0 && (
            <div className="flex justify-between text-[10px]">
              <span>Round Off:</span>
              <span>{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
            <span>GRAND TOTAL:</span>
            <span>{formatCurrency(invoice.grandTotal, business.currencySymbol)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-800 font-bold pt-0.5">
            <span>Mode of Payment:</span>
            <span className="uppercase">{paymentInfo.icon} {invoice.paymentMethod ? invoice.paymentMethod.replace(/_/g, ' ') : 'CASH / UPI / BANK'}</span>
          </div>
          <div className="flex justify-between text-[10px] text-emerald-700 font-medium">
            <span>Amount Paid:</span>
            <span className="font-bold">{formatCurrency(invoice.amountPaid || 0, business.currencySymbol)}</span>
          </div>
          {invoice.amountDue > 0 && (
            <div className="flex justify-between text-[10px] text-rose-700 font-bold">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.amountDue, business.currencySymbol)}</span>
            </div>
          )}
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Payment Status:</span>
            <span className="font-bold">{invoice.status}</span>
          </div>
        </div>

        {/* UPI QR */}
        {template.showUpiQr && (
          <div className="py-2 text-center flex flex-col items-center">
            <QrCodeSvg value={upiPaymentUri} size={85} />
            <p className="text-[9px] mt-1 text-slate-600">Scan & Pay via UPI: <strong className="font-mono">{business.upiId}</strong></p>
          </div>
        )}

        <div className="text-center text-[9px] text-slate-500 pt-1 border-t border-dotted border-slate-300">
          {template.footerDeclaration || 'Thank you for your business!'}
        </div>
      </div>
    );
  }

  // ==========================================
  // AUTHENTIC INDIAN TRADE / RETAIL GST FORMAT
  // (As shown in TM Electricals & Hardware Invoices)
  // ==========================================
  if (template.headerStyle === 'TRADE_CLASSIC' || template.id === 'TRADE_CLASSIC_TM') {
    const totalQuantity = invoice.items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    const dominantUnit = invoice.items[0]?.unit || 'Pcs.';
    const copyTypeText = printCopyType === 'ORIGINAL' 
      ? 'Original Copy' 
      : printCopyType === 'DUPLICATE' 
        ? 'Duplicate Copy' 
        : 'Triplicate Copy';

    // Tax Breakdown by GST Rate
    const taxRateBreakdown = Array.from(
      invoice.items.reduce((acc, item) => {
        const rate = item.gstRate || 0;
        const existing = acc.get(rate) || {
          rate,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
        };
        existing.taxable += item.taxableAmount;
        existing.cgst += item.cgstAmount;
        existing.sgst += item.sgstAmount;
        existing.igst += item.igstAmount;
        existing.totalTax += (item.cgstAmount + item.sgstAmount + item.igstAmount);
        acc.set(rate, existing);
        return acc;
      }, new Map<number, { rate: number; taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }>())
    ).map(([_, val]) => val);

    const invoiceDateTimeStr = `${formatDate(invoice.invoiceDate)} ( ${
      invoice.createdAt
        ? new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '12:21 PM'
    } )`;

    return (
      <div className="bg-white text-black font-sans text-[11px] leading-tight border-2 border-black w-full min-h-[960px] flex flex-col justify-between select-text print:border-black print:text-black">
        {/* Top Outer Container */}
        <div>
          {/* Header Copy Type Indicator */}
          <div className="flex justify-end px-3 pt-1">
            <span className="italic font-serif text-[11px] font-semibold text-slate-800 tracking-wide">
              {copyTypeText}
            </span>
          </div>

          {/* Business Brand & Details Header */}
          <div className="px-4 pb-2 pt-0.5 relative flex items-center justify-between">
            {/* Logo Left */}
            <div className="w-20 shrink-0 flex items-center justify-start">
              {template.showLogo && business.logoUrl ? (
                <img src={business.logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-cyan-500 bg-white flex items-center justify-center text-cyan-600 font-black text-xl tracking-tighter shadow-2xs">
                  <span className="text-red-500">T</span><span className="text-cyan-600">M</span>
                </div>
              )}
            </div>

            {/* Centralized Business Details */}
            <div className="flex-1 text-center space-y-0.5 px-2">
              <div className="font-bold text-xs uppercase tracking-widest text-slate-900">
                TAX INVOICE
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black font-sans">
                {business.tradeName || business.name}
              </h1>
              <p className="text-[10px] md:text-[10.5px] font-semibold uppercase text-slate-800 max-w-xl mx-auto leading-tight">
                {business.address}, {business.city}, {business.state} ({business.stateCode})
              </p>
              <div className="flex items-center justify-center gap-2 text-[10.5px] font-bold text-black pt-0.5">
                <span>GSTIN : <span className="font-mono">{business.gstin}</span></span>
              </div>
              <div className="text-[10.5px] font-bold text-black">
                MOBILE : <span className="font-mono">{business.phone}</span>
              </div>
            </div>

            {/* Empty balance right spacer */}
            <div className="w-20 shrink-0"></div>
          </div>

          {/* Party Details & Invoice Information Split Box */}
          <div className="border-t border-b border-black grid grid-cols-12 divide-x divide-black text-[11px]">
            {/* Left Box: Party Details */}
            <div className="col-span-7 p-2.5 space-y-1">
              <div className="font-bold italic text-[11px] text-black">
                Party Details :
              </div>
              <div className="font-bold text-xs uppercase text-black">
                {invoice.customerName}
              </div>
              <div className="text-[10.5px] uppercase text-black font-medium leading-tight whitespace-pre-line">
                {invoice.customerAddress || `${invoice.customerCity || ''} ${invoice.customerState || ''}`.trim() || 'LOCAL'}
              </div>
              {invoice.customerState && invoice.customerState !== invoice.customerAddress && (
                <div className="text-[10.5px] uppercase text-black font-medium">
                  {invoice.customerState}
                </div>
              )}

              <div className="pt-2 space-y-0.5 text-[10.5px]">
                <div className="flex">
                  <span className="w-32 text-black font-medium">Party Mobile No</span>
                  <span className="mr-2">:</span>
                  <strong className="font-mono text-black">{invoice.customerPhone || 'N/A'}</strong>
                </div>
                <div className="flex">
                  <span className="w-32 text-black font-medium">GSTIN / UIN</span>
                  <span className="mr-2">:</span>
                  <strong className="font-mono text-black">{invoice.customerGstin || ''}</strong>
                </div>
              </div>
            </div>

            {/* Right Box: Invoice Metadata */}
            <div className="col-span-5 p-2.5 space-y-1.5 text-[10.5px]">
              <div className="flex items-center">
                <span className="w-28 text-black font-medium">Invoice No.</span>
                <span className="mr-2">:</span>
                <strong className="font-mono font-bold text-xs text-black">{invoice.invoiceNumber}</strong>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-black font-medium">Dated</span>
                <span className="mr-2">:</span>
                <strong className="text-black">{invoiceDateTimeStr}</strong>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-black font-medium">Place of Supply</span>
                <span className="mr-2">:</span>
                <strong className="text-black">
                  {invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})
                </strong>
              </div>
              <div className="flex items-center">
                <span className="w-28 text-black font-medium">Reverse Charge</span>
                <span className="mr-2">:</span>
                <strong className="text-black">{invoice.isReverseCharge ? 'Y' : 'N'}</strong>
              </div>
            </div>
          </div>

          {/* Continuous Full-Height Grid Table */}
          <div className="w-full">
            <table className="w-full border-collapse text-[10.5px] text-black">
              <thead>
                <tr className="border-b border-black text-black font-bold text-[10px]">
                  <th className="border-r border-black py-1.5 px-1 text-center w-8">S.N.</th>
                  <th className="border-r border-black py-1.5 px-2 text-left">Description of Goods</th>
                  <th className="border-r border-black py-1.5 px-1 text-center w-16">HSN/SAC<br />Code</th>
                  <th className="border-r border-black py-1.5 px-1 text-center w-14">Qty. Unit</th>
                  <th className="border-r border-black py-1.5 px-1.5 text-right w-20">Price</th>
                  {!invoice.isInterState ? (
                    <>
                      <th className="border-r border-black py-1.5 px-1 text-center w-12">CGST<br />Rate</th>
                      <th className="border-r border-black py-1.5 px-1 text-right w-16">CGST<br />Amount</th>
                      <th className="border-r border-black py-1.5 px-1 text-center w-12">SGST<br />Rate</th>
                      <th className="border-r border-black py-1.5 px-1 text-right w-16">SGST<br />Amount</th>
                    </>
                  ) : (
                    <>
                      <th className="border-r border-black py-1.5 px-1 text-center w-14">IGST<br />Rate</th>
                      <th className="border-r border-black py-1.5 px-1.5 text-right w-24">IGST<br />Amount</th>
                    </>
                  )}
                  <th className="py-1.5 px-2 text-right w-24">Amount(₹)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="align-top">
                    <td className="border-r border-black py-1.5 px-1 text-center font-mono">{idx + 1}.</td>
                    <td className="border-r border-black py-1.5 px-2 space-y-0.5">
                      <div className="font-bold uppercase text-[10.5px] text-black">{item.name}</div>
                      
                      {/* Sub-item Details (Model, Serial Numbers, Warranty) in authentic Trade style */}
                      {item.description && (
                        <div className="italic text-[9.5px] font-sans text-black whitespace-pre-line">{item.description}</div>
                      )}
                      {template.showSerialNumber && item.serialNumber && (
                        <div className="font-mono italic text-[9.5px] text-black">
                          {item.serialNumber}
                        </div>
                      )}
                      {template.showWarranty && item.warranty && (
                        <div className="italic uppercase text-[8.5px] font-semibold text-black">
                          {item.warranty}
                        </div>
                      )}
                      {template.showBatchNumber && item.batchNumber && (
                        <div className="italic text-[8.5px] text-black font-mono">
                          Batch: {item.batchNumber}
                        </div>
                      )}
                    </td>
                    <td className="border-r border-black py-1.5 px-1 text-center font-mono">{item.hsnCode || ''}</td>
                    <td className="border-r border-black py-1.5 px-1 text-center font-medium">
                      {Number(item.quantity).toFixed(2)} {item.unit || 'Pcs.'}
                    </td>
                    <td className="border-r border-black py-1.5 px-1.5 text-right font-mono font-medium">
                      {formatCurrency(item.rate, '')}
                    </td>
                    {!invoice.isInterState ? (
                      <>
                        <td className="border-r border-black py-1.5 px-1 text-center font-mono text-[10px]">
                          {(item.gstRate / 2).toFixed(2)} %
                        </td>
                        <td className="border-r border-black py-1.5 px-1 text-right font-mono">
                          {formatCurrency(item.cgstAmount, '')}
                        </td>
                        <td className="border-r border-black py-1.5 px-1 text-center font-mono text-[10px]">
                          {(item.gstRate / 2).toFixed(2)} %
                        </td>
                        <td className="border-r border-black py-1.5 px-1 text-right font-mono">
                          {formatCurrency(item.sgstAmount, '')}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-black py-1.5 px-1 text-center font-mono text-[10px]">
                          {item.gstRate.toFixed(2)} %
                        </td>
                        <td className="border-r border-black py-1.5 px-1.5 text-right font-mono">
                          {formatCurrency(item.igstAmount, '')}
                        </td>
                      </>
                    )}
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-black">
                      {formatCurrency(item.totalAmount, '')}
                    </td>
                  </tr>
                ))}

                {/* Vertical Column Padding to Maintain Tall Column Lines */}
                {Array.from({ length: Math.max(0, 4 - invoice.items.length) }).map((_, emptyIdx) => (
                  <tr key={`empty-${emptyIdx}`} className="h-6">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    {!invoice.isInterState ? (
                      <>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                      </>
                    )}
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand Total Row */}
          <div className="border-t border-b border-black grid grid-cols-12 text-[11px] font-bold text-black bg-white">
            <div className="col-span-4 py-1 px-3 flex justify-end items-center pr-6">
              Grand Total
            </div>
            <div className="col-span-2 py-1 px-1 text-center font-mono">
              {totalQuantity.toFixed(2)} {dominantUnit}
            </div>
            <div className="col-span-3"></div>
            <div className="col-span-3 border-l border-black py-1 px-3 flex justify-between items-center font-mono text-xs">
              <span>₹</span>
              <span className="font-bold">{formatCurrency(invoice.grandTotal, '')}</span>
            </div>
          </div>

          {/* Mini Tax Breakdown Matrix */}
          <div className="p-2 border-b border-black">
            <div className="max-w-md">
              <table className="w-full text-[10px] text-black border-collapse">
                <thead>
                  <tr className="font-bold text-[9.5px] border-b border-black text-left">
                    <th className="py-0.5 px-1">Tax Rate</th>
                    <th className="py-0.5 px-1 text-right">Taxable Amt.</th>
                    {!invoice.isInterState ? (
                      <>
                        <th className="py-0.5 px-1 text-right">CGST</th>
                        <th className="py-0.5 px-1 text-right">SGST</th>
                      </>
                    ) : (
                      <th className="py-0.5 px-1 text-right">IGST</th>
                    )}
                    <th className="py-0.5 px-1 text-right font-bold">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {taxRateBreakdown.map((tb, tIdx) => (
                    <tr key={tIdx} className="border-b border-slate-200 last:border-0">
                      <td className="py-0.5 px-1 font-sans">{tb.rate}%</td>
                      <td className="py-0.5 px-1 text-right">{formatCurrency(tb.taxable, '')}</td>
                      {!invoice.isInterState ? (
                        <>
                          <td className="py-0.5 px-1 text-right">{formatCurrency(tb.cgst, '')}</td>
                          <td className="py-0.5 px-1 text-right">{formatCurrency(tb.sgst, '')}</td>
                        </>
                      ) : (
                        <td className="py-0.5 px-1 text-right">{formatCurrency(tb.igst, '')}</td>
                      )}
                      <td className="py-0.5 px-1 text-right font-bold">{formatCurrency(tb.totalTax, '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="py-1 px-3 border-b border-black font-bold text-xs text-black">
            Rupees {numberToIndianWords(invoice.grandTotal)}
          </div>
        </div>

        {/* Bottom Dual-Box Footer: Terms on Left, Signatures on Right */}
        <div className="border-t border-black grid grid-cols-12 divide-x divide-black text-[10px] text-black">
          {/* Left Column: Terms & Conditions */}
          <div className="col-span-6 p-2 space-y-1">
            <div className="font-bold underline text-[10.5px]">Terms & Conditions</div>
            <div className="font-bold text-[10px]">E.& O.E.</div>
            <ol className="list-decimal pl-3.5 space-y-0.5 text-[9.5px] leading-tight text-slate-900">
              <li>Goods once sold will not be taken back.</li>
              <li>Interest @ 18% p.a. will be charged if the payment is not made with in the stipulated time.</li>
              <li>Subject to '{business.state || 'Local'}' Jurisdiction only.</li>
            </ol>
          </div>

          {/* Right Column: Receiver's Signature & Authorized Signatory */}
          <div className="col-span-6 flex flex-col justify-between p-2 min-h-[120px]">
            <div className="font-bold text-[10.5px]">
              Receiver's Signature :
            </div>

            {/* Signatory Box */}
            <div className="text-right space-y-1 pt-4">
              <div className="font-bold text-[10.5px]">
                for <span className="uppercase font-black">{business.tradeName || business.name}</span>
              </div>
              
              {showSig && activeSignatureUrl && (
                <div className="flex justify-end py-0.5">
                  <img src={activeSignatureUrl} alt="Signature" className="max-h-12 max-w-[130px] object-contain" />
                </div>
              )}

              <div className="font-bold text-[10.5px] pt-1">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD A4 FORMATS
  const themeHex = template.themeColor || '#1e293b';

  return (
    <div className={`relative flex flex-col justify-between h-full ${fontClass} ${fitToOnePage ? 'space-y-2 text-[11px]' : 'space-y-3.5 text-xs'} text-slate-900`}>
      {/* Watermark */}
      {template.watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none opacity-5">
          <div className="text-8xl font-black uppercase transform -rotate-45 tracking-widest text-slate-900 border-8 border-slate-900 px-8 py-4 rounded-3xl">
            {template.watermarkText}
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-3.5">
        {/* HEADER SECTION */}
        {template.headerStyle === 'BANNER' ? (
          /* Solid/Graduated Banner Header */
          <div 
            className="p-4 rounded-xl text-white shadow-xs"
            style={{ backgroundColor: themeHex }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                {template.showCopyTypeBadge && (
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/20 text-white rounded backdrop-blur-xs">
                    {copyLabel}
                  </span>
                )}
                <h1 className={`${fitToOnePage ? 'text-xl' : 'text-2xl'} font-black tracking-tight`}>
                  {business.tradeName || business.name}
                </h1>
                {template.headerTagline && (
                  <p className="text-[10px] text-white/80 font-medium italic">{template.headerTagline}</p>
                )}
                <p className="text-[10.5px] text-white/90 leading-tight max-w-md">
                  {business.address}, {business.city}, {business.state} - {business.pincode}
                </p>
                <div className="flex flex-wrap gap-x-3 text-[10px] text-white/90 pt-0.5">
                  <span>GSTIN: <strong className="font-mono">{business.gstin}</strong></span>
                  <span>State Code: <strong className="font-mono">{business.stateCode}</strong></span>
                  <span>Ph: {business.phone}</span>
                </div>
              </div>

              <div className="text-right shrink-0 bg-white/10 p-3 rounded-lg backdrop-blur-xs border border-white/20 min-w-[170px]">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                  {invoice.invoiceType.replace(/_/g, ' ')}
                </div>
                <div className={`${fitToOnePage ? 'text-base' : 'text-lg'} font-black font-mono mt-0.5`}>
                  {invoice.invoiceNumber}
                </div>
                <div className="text-[10px] text-white/90 mt-1 space-y-0.5">
                  <div>Date: <strong>{formatDate(invoice.invoiceDate)}</strong></div>
                  {invoice.dueDate && <div>Due: <strong>{formatDate(invoice.dueDate)}</strong></div>}
                </div>
              </div>
            </div>
          </div>
        ) : template.headerStyle === 'MODERN_SPLIT' ? (
          /* Modern Split Top Header */
          <div className={`flex items-start justify-between pb-3 border-b-2 gap-4`} style={{ borderColor: themeHex }}>
            <div className="space-y-1">
              {template.showCopyTypeBadge && (
                <span 
                  className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded"
                  style={{ backgroundColor: `${themeHex}15`, color: themeHex }}
                >
                  {copyLabel}
                </span>
              )}
              <h1 className={`${fitToOnePage ? 'text-xl' : 'text-2xl'} font-black tracking-tight text-slate-900`}>
                {business.tradeName || business.name}
              </h1>
              {template.headerTagline && (
                <p className="text-[10.5px] font-medium" style={{ color: themeHex }}>{template.headerTagline}</p>
              )}
              <p className="text-[11px] text-slate-600 leading-tight max-w-sm">
                {business.address}, {business.city}, {business.state} - {business.pincode}
              </p>
              <div className="flex flex-wrap gap-x-3 text-[10.5px] text-slate-600">
                <span>GSTIN: <strong className="font-mono text-slate-800">{business.gstin}</strong></span>
                <span>Ph: {business.phone}</span>
                {business.email && <span>Email: {business.email}</span>}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div 
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: themeHex }}
              >
                {invoice.invoiceType.replace(/_/g, ' ')}
              </div>
              <div className={`${fitToOnePage ? 'text-lg' : 'text-xl'} font-black font-mono text-slate-900 mt-0.5`}>
                {invoice.invoiceNumber}
              </div>
              <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                <div>Date: <strong className="text-slate-800">{formatDate(invoice.invoiceDate)}</strong></div>
                {invoice.dueDate && <div>Due: <strong className="text-slate-800">{formatDate(invoice.dueDate)}</strong></div>}
                <div className="text-[10px] text-slate-500">State Code: {business.stateCode} ({business.state})</div>
              </div>
            </div>
          </div>
        ) : (
          /* Official Minimal / Bordered Header */
          <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50/50">
            <div className="flex items-start justify-between pb-2.5 border-b border-slate-200 gap-4">
              <div>
                {template.showCopyTypeBadge && (
                  <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-slate-200 text-slate-700 rounded mb-1">
                    {copyLabel}
                  </span>
                )}
                <h1 className={`${fitToOnePage ? 'text-lg' : 'text-xl'} font-black tracking-tight text-slate-900 uppercase`}>
                  {business.tradeName || business.name}
                </h1>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {business.address}, {business.city}, {business.state} - {business.pincode}
                </p>
                <div className="flex flex-wrap gap-x-3 text-[10.5px] text-slate-600 mt-1">
                  <span>GSTIN: <strong className="font-mono text-slate-900">{business.gstin}</strong></span>
                  <span>State: <strong>{business.state} (Code: {business.stateCode})</strong></span>
                  <span>Phone: {business.phone}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-2.5 py-1 rounded border border-slate-300 bg-white shadow-2xs text-center">
                  <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    {invoice.invoiceType.replace(/_/g, ' ')}
                  </div>
                  <div className={`${fitToOnePage ? 'text-base' : 'text-lg'} font-extrabold font-mono text-slate-900`}>
                    {invoice.invoiceNumber}
                  </div>
                </div>
                <div className="text-[10.5px] text-slate-600 mt-1 space-y-0.5">
                  <div>Date: <strong className="text-slate-800">{formatDate(invoice.invoiceDate)}</strong></div>
                  {invoice.dueDate && <div>Due Date: <strong className="text-slate-800">{formatDate(invoice.dueDate)}</strong></div>}
                </div>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 flex justify-between items-center">
              <span>Reverse Charge: <strong>{invoice.isReverseCharge ? 'YES' : 'NO'}</strong></span>
              <span>Supply Type: <strong>{invoice.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)'}</strong></span>
              <span>Place of Supply: <strong>{invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</strong></span>
            </div>
          </div>
        )}

        {/* CUSTOMER BILL TO & METADATA CARDS */}
        <div className={`grid grid-cols-2 gap-3.5 ${template.tableStyle === 'BOXED' ? 'p-3 bg-slate-50/80 rounded-xl border border-slate-200' : ''}`}>
          {/* Bill To */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-2xs">
            <div 
              className="text-[9.5px] font-extrabold uppercase tracking-wider mb-1"
              style={{ color: themeHex }}
            >
              Billed To (Recipient):
            </div>
            <div className="font-bold text-slate-900 text-xs">{invoice.customerName}</div>
            <div className="text-[11px] text-slate-600 leading-snug mt-0.5">{invoice.customerAddress}</div>
            <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-0.5 text-[10px] text-slate-600">
              {invoice.customerGstin ? (
                <div>GSTIN / UIN: <strong className="font-mono text-slate-900">{invoice.customerGstin}</strong></div>
              ) : (
                <div className="text-slate-400 italic">Unregistered Consumer</div>
              )}
              {invoice.customerPhone && <div>Phone: {invoice.customerPhone}</div>}
              <div>State: <strong>{invoice.customerState} ({invoice.customerStateCode})</strong></div>
            </div>
          </div>

          {/* Shipping / Meta */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-2xs space-y-1.5">
            <div 
              className="text-[9.5px] font-extrabold uppercase tracking-wider mb-1 flex justify-between"
              style={{ color: themeHex }}
            >
              <span>{invoice.hasDifferentShippingAddress ? 'Shipped To (Delivery):' : 'Invoice & Payment Details:'}</span>
              <span className="text-[9px] font-semibold text-slate-500">POS: {invoice.placeOfSupplyStateCode}</span>
            </div>
            {invoice.hasDifferentShippingAddress ? (
              <>
                <div className="font-bold text-slate-900 text-xs">{invoice.shippingName || invoice.customerName}</div>
                <div className="text-[11px] text-slate-600 leading-snug">{invoice.shippingAddress}</div>
                <div className="text-[10px] text-slate-500">State: {invoice.shippingState} ({invoice.shippingStateCode})</div>
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <span>{paymentInfo.icon}</span>
                    <span>{paymentInfo.short}</span>
                    <span className={`ml-1 px-1.5 py-0.2 rounded text-[9px] ${invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {invoice.status}
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Place of Supply:</span>
                  <span className="font-semibold text-slate-800">{invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Supply Classification:</span>
                  <span className="font-semibold text-slate-800">{invoice.isInterState ? 'Inter-State Supply (IGST)' : 'Intra-State Supply (CGST+SGST)'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Mode of Payment:</span>
                  <span className="font-bold text-slate-900 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                    <span>{paymentInfo.icon}</span>
                    <span>{paymentInfo.label}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {invoice.status === 'PAID' ? '✅ FULLY PAID' : (invoice.status === 'PARTIALLY_PAID' ? '⚠️ PARTIALLY PAID' : '⏳ UNPAID / CREDIT')}
                  </span>
                </div>
                {invoice.paymentReference && (
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Payment Ref / UTR:</span>
                    <span className="font-mono font-bold text-slate-800">{invoice.paymentReference}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* LINE ITEMS TABLE */}
        <div className="overflow-hidden border border-slate-200 rounded-lg shadow-2xs">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr 
                className="text-white font-bold text-[10px] uppercase tracking-wider"
                style={{ backgroundColor: themeHex }}
              >
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-3">Item Description & Particulars</th>
                <th className="py-2 px-2 text-center w-20">HSN/SAC</th>
                <th className="py-2 px-2 text-center w-14">Qty</th>
                <th className="py-2 px-2 text-right w-20">Rate (₹)</th>
                <th className="py-2 px-2 text-right w-20">Taxable</th>
                <th className="py-2 px-2 text-center w-16">GST %</th>
                <th className="py-2 px-3 text-right w-24">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr 
                  key={item.id || idx}
                  className={template.tableStyle === 'STRIPED' && idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                >
                  <td className="py-2 px-2 text-center font-mono text-slate-400 align-top">{idx + 1}</td>
                  <td className="py-2 px-3 align-top space-y-0.5">
                    <div className="font-bold text-slate-900 text-[11px]">{item.name}</div>
                    
                    {/* Item Serial, Warranty, Batch, and Description Details */}
                    {(item.serialNumber || item.warranty || item.description || item.batchNumber) && (
                      <div className="text-[9.5px] space-y-0.5 pt-0.5">
                        {template.showSerialNumber && item.serialNumber && (
                          <div className="flex items-center gap-1 font-mono text-blue-700">
                            <span className="font-bold bg-blue-50 px-1 rounded">{business.itemLineSettings?.serialNumberLabel || 'Sr. No.'}:</span>
                            <span>{item.serialNumber}</span>
                          </div>
                        )}
                        {template.showWarranty && item.warranty && (
                          <div className="flex items-center gap-1 text-emerald-700">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
                            <span className="font-semibold">{business.itemLineSettings?.warrantyLabel || 'Warranty'}: {item.warranty}</span>
                          </div>
                        )}
                        {template.showDescription && item.description && (
                          <div className="italic text-slate-500 font-normal whitespace-pre-line">{item.description}</div>
                        )}
                        {template.showBatchNumber && item.batchNumber && (
                          <div className="text-slate-500">Batch: <strong className="font-mono">{item.batchNumber}</strong></div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-slate-600 align-top">{item.hsnCode || '-'}</td>
                  <td className="py-2 px-2 text-center font-medium align-top">
                    {item.quantity} <span className="text-[9px] text-slate-400">{item.unit}</span>
                  </td>
                  <td className="py-2 px-2 text-right font-mono align-top">{formatCurrency(item.rate, '')}</td>
                  <td className="py-2 px-2 text-right font-mono align-top">{formatCurrency(item.taxableAmount, '')}</td>
                  <td className="py-2 px-2 text-center align-top">
                    <span className="font-bold text-[10px]">{item.gstRate}%</span>
                    <div className="text-[8.5px] text-slate-400">
                      {invoice.isInterState ? `IGST` : `CGST+SGST`}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 align-top">
                    {formatCurrency(item.totalAmount, '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS & TAX BREAKDOWN */}
        <div className="grid grid-cols-12 gap-3.5 items-start">
          {/* Left Column: Bank Details, UPI QR, Notes & Terms */}
          <div className="col-span-7 space-y-2.5">
            {/* Amount in Words */}
            {template.showAmountInWords && (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10.5px]">
                <span className="font-bold text-slate-500 uppercase text-[9px] block">Invoice Amount in Words:</span>
                <span className="font-bold text-slate-800 capitalize">{numberToIndianWords(invoice.grandTotal)}</span>
              </div>
            )}

            {/* Bank Details & UPI QR */}
            {(template.showBankDetails || template.showUpiQr) && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                {template.showBankDetails && (
                  <div className="space-y-0.5 text-[10px]">
                    <div 
                      className="font-extrabold uppercase text-[9px] tracking-wider mb-1"
                      style={{ color: themeHex }}
                    >
                      Bank Remittance Details:
                    </div>
                    <div>Bank Name: <strong className="text-slate-800">{business.bankName}</strong></div>
                    <div>A/c No: <strong className="font-mono text-slate-800">{business.accountNumber}</strong></div>
                    <div>IFSC Code: <strong className="font-mono text-slate-800">{business.ifscCode}</strong></div>
                    <div>Branch: {business.branchName}</div>
                    {business.upiId && <div>UPI ID: <strong className="font-mono">{business.upiId}</strong></div>}
                  </div>
                )}

                {template.showUpiQr && (
                  <div className="text-center shrink-0 flex flex-col items-center">
                    <QrCodeSvg value={upiPaymentUri} size={68} />
                    <span className="text-[8px] font-bold text-slate-500 mt-0.5">Scan to Pay UPI</span>
                  </div>
                )}
              </div>
            )}

            {/* Terms & Conditions */}
            {template.showTerms && (business.defaultTerms || invoice.terms) && (
              <div className="text-[9.5px] text-slate-600 space-y-0.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[8.5px]">Terms & Conditions:</span>
                <p className="whitespace-pre-line leading-relaxed text-slate-500">
                  {invoice.terms || business.defaultTerms}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Financial Summary Table */}
          <div className="col-span-5 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
            <div className="p-2.5 space-y-1.5 text-[11px] divide-y divide-slate-100">
              <div className="flex justify-between text-slate-600 pt-0.5">
                <span>Total Taxable Amount:</span>
                <span className="font-mono font-semibold text-slate-800">{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono font-semibold text-indigo-700">{formatCurrency(invoice.totalIgst, business.currencySymbol)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(invoice.totalCgst, business.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1">
                    <span>State GST (SGST):</span>
                    <span className="font-mono font-semibold text-slate-800">{formatCurrency(invoice.totalSgst, business.currencySymbol)}</span>
                  </div>
                </>
              )}

              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 pt-1">
                  <span>Total Discount:</span>
                  <span className="font-mono font-semibold">-{formatCurrency(invoice.totalDiscount, business.currencySymbol)}</span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 pt-1">
                  <span>Round Off:</span>
                  <span className="font-mono">{invoice.roundOff > 0 ? `+${invoice.roundOff.toFixed(2)}` : invoice.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div 
                className="flex justify-between items-center pt-2 font-black text-sm text-white px-2 py-1.5 rounded"
                style={{ backgroundColor: themeHex }}
              >
                <span>Grand Total (₹):</span>
                <span className="font-mono">{formatCurrency(invoice.grandTotal, business.currencySymbol)}</span>
              </div>

              {/* Payment Summary */}
              <div className="pt-1.5 space-y-1 text-[10px]">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Mode of Payment:</span>
                  <span className="font-bold flex items-center gap-1">
                    <span>{paymentInfo.icon}</span>
                    <span>{paymentInfo.short}</span>
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Amount Paid:</span>
                  <span className="font-mono font-bold">{formatCurrency(invoice.amountPaid || 0, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(invoice.amountDue || 0, business.currencySymbol)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HSN/SAC TAX SUMMARY SUB-TABLE (If enabled in template) */}
        {template.showHsnSummaryTable && hsnSummaryList.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden text-[10px]">
            <div 
              className="px-2.5 py-1 font-extrabold uppercase text-[9px] tracking-wider text-slate-700 bg-slate-100 border-b border-slate-200"
            >
              GST Tax Slab Summary (HSN/SAC Breakdown)
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <th className="py-1 px-2 font-semibold">HSN / SAC</th>
                  <th className="py-1 px-2 text-right font-semibold">Taxable Val (₹)</th>
                  <th className="py-1 px-2 text-center font-semibold">Rate</th>
                  {invoice.isInterState ? (
                    <th className="py-1 px-2 text-right font-semibold">IGST (₹)</th>
                  ) : (
                    <>
                      <th className="py-1 px-2 text-right font-semibold">CGST (₹)</th>
                      <th className="py-1 px-2 text-right font-semibold">SGST (₹)</th>
                    </>
                  )}
                  <th className="py-1 px-2 text-right font-semibold">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[9.5px]">
                {hsnSummaryList.map((hsn, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1 px-2 font-semibold text-slate-800">{hsn.hsnCode}</td>
                    <td className="py-1 px-2 text-right">{hsn.taxableAmount.toFixed(2)}</td>
                    <td className="py-1 px-2 text-center">{hsn.gstRate}%</td>
                    {invoice.isInterState ? (
                      <td className="py-1 px-2 text-right">{hsn.igstAmount.toFixed(2)}</td>
                    ) : (
                      <>
                        <td className="py-1 px-2 text-right">{hsn.cgstAmount.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right">{hsn.sgstAmount.toFixed(2)}</td>
                      </>
                    )}
                    <td className="py-1 px-2 text-right font-bold text-slate-900">{hsn.totalTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER & AUTHORIZED SIGNATORY */}
      <div className="relative z-10 pt-3 border-t border-slate-200 mt-2">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-xs space-y-1 text-[9.5px] text-slate-500">
            <p className="font-semibold text-slate-700">Declaration & Undertaking:</p>
            <p className="leading-snug">
              {template.footerDeclaration || 'Certified that the particulars given above are true and correct, and the amount indicated represents the price actually charged.'}
            </p>
          </div>

          {/* Authorized Signature Box */}
          {showSig && (
            <div className="text-right flex flex-col items-end min-w-[200px]">
              <span className="text-[9px] font-bold text-slate-500 uppercase">
                For {business.tradeName || business.name}
              </span>
              <div className="h-14 flex items-center justify-end my-1">
                {activeSignatureUrl ? (
                  <img
                    src={activeSignatureUrl}
                    alt="Authorized Signature"
                    className="max-h-12 max-w-[170px] object-contain"
                  />
                ) : (
                  <div className="h-10 border-b border-dashed border-slate-400 w-36"></div>
                )}
              </div>
              <span className="font-bold text-[10px] text-slate-900">
                {business.signatoryName || 'Authorized Signatory'}
              </span>
              <span className="text-[9px] text-slate-500">
                {business.signatoryDesignation || 'Director / Signatory'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
