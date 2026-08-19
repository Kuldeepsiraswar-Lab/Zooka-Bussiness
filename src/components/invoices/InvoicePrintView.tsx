import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate, numberToIndianWords, normalizeSignatureUrl } from '../../utils/formatters';
import { QrCodeSvg } from '../common/QrCodeSvg';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  ShieldCheck, 
  Loader2, 
  FileText, 
  Maximize2, 
  Minimize2,
  Sparkles,
  Check,
  FileSignature,
  Upload
} from 'lucide-react';

interface InvoicePrintViewProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoiceId, onBack }) => {
  const { invoices, business, updateBusiness, showToast } = useApp();
  const [printCopyType, setPrintCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');
  const [templateStyle, setTemplateStyle] = useState<'OFFICIAL_GST' | 'MODERN_CLEAN' | 'THERMAL_POS'>('OFFICIAL_GST');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [fitToOnePage, setFitToOnePage] = useState(false);

  // Normalized active signature URL
  const activeSignatureUrl = normalizeSignatureUrl(business.signatureUrl);
  const isSignatureVisible = business.showSignatureOnInvoice !== false;

  const invoiceRef = useRef<HTMLDivElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  const invoice = invoices.find(i => i.id === invoiceId);

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500">Invoice not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer">
          Go Back
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    if (!invoiceRef.current) {
      window.print();
      return;
    }

    try {
      showToast('info', 'Opening Print Dialog', 'Preparing document for printing...');

      // Clean up any existing print iframe
      const oldFrame = document.getElementById('print-invoice-iframe');
      if (oldFrame) oldFrame.remove();

      const printIframe = document.createElement('iframe');
      printIframe.id = 'print-invoice-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = '0';
      printIframe.style.visibility = 'hidden';
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (iframeDoc) {
        // Collect existing stylesheets & tailwind font styles
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(el => el.outerHTML)
          .join('\n');

        const invoiceHtml = invoiceRef.current.outerHTML;

        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Invoice #${invoice.invoiceNumber} - ${business.tradeName || business.name}</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              ${styles}
              <style>
                @page {
                  size: ${templateStyle === 'THERMAL_POS' ? '80mm auto' : 'A4 portrait'};
                  margin: ${templateStyle === 'THERMAL_POS' ? '2mm' : '6mm 8mm'};
                }
                body {
                  background: #ffffff !important;
                  color: #0f172a !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .a4-sheet {
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
              </style>
            </head>
            <body>
              ${invoiceHtml}
            </body>
          </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
          try {
            printIframe.contentWindow?.focus();
            printIframe.contentWindow?.print();
          } catch (err) {
            console.warn('Iframe print failed, falling back to window.print', err);
            window.print();
          }
        }, 350);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Print error, falling back to standard print', e);
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);

    try {
      showToast('info', 'Generating A4 PDF', 'Rendering high-resolution invoice document...');
      
      const element = invoiceRef.current;
      
      // Render canvas with high pixel ratio for print clarity
      const canvas = await html2canvas(element, {
        scale: 3, // Crisp 300+ DPI print quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: templateStyle === 'THERMAL_POS' ? 380 : 794 // Exact standard A4 width in px (96 DPI)
      });

      const imgData = canvas.toDataURL('image/png');

      if (templateStyle === 'THERMAL_POS') {
        // 80mm continuous thermal receipt format
        const pdfWidth = 80;
        const pdfHeight = Math.max(110, (canvas.height * pdfWidth) / canvas.width);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`Receipt_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`);
      } else {
        // Exact A4 Dimensions (210mm x 297mm)
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const a4Width = 210;
        const a4Height = 297;
        const margin = 5; // 5mm safe printable margins
        const printableWidth = a4Width - (margin * 2);
        const imgHeight = (canvas.height * printableWidth) / canvas.width;

        if (imgHeight <= (a4Height - margin * 2) || fitToOnePage) {
          // Fit cleanly on a single A4 page
          const finalHeight = Math.min(imgHeight, a4Height - margin * 2);
          pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, finalHeight, undefined, 'FAST');
        } else {
          // Multi-page A4 pagination
          const pageContentHeight = a4Height - (margin * 2);
          let heightLeft = imgHeight;
          let position = 0;

          // Page 1
          pdf.addImage(imgData, 'PNG', margin, margin + position, printableWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pageContentHeight;

          // Subsequent pages
          while (heightLeft > 0) {
            position = position - pageContentHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, margin + position, printableWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageContentHeight;
          }
        }

        pdf.save(`Invoice_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}_A4.pdf`);
      }

      showToast('success', 'A4 PDF Downloaded', `Invoice ${invoice.invoiceNumber} saved successfully in A4 format.`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
      showToast('error', 'Download Failed', 'Could not generate PDF. Please try browser print.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isB2B = !!invoice.customerGstin;
  const upiPaymentUri = `upi://pay?pa=${business.upiId}&pn=${encodeURIComponent(business.name)}&am=${invoice.amountDue}&cu=INR&tn=Invoice_${invoice.invoiceNumber}`;

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Back to Invoice List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{invoice.invoiceNumber}</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                A4 Standard Compliant
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tax Invoice • {formatDate(invoice.invoiceDate)} • {templateStyle === 'THERMAL_POS' ? '80mm POS Slip' : 'A4 Size (210 × 297 mm)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Selector */}
          <select
            value={printCopyType}
            onChange={(e) => setPrintCopyType(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ORIGINAL">Original for Recipient</option>
            <option value="DUPLICATE">Duplicate for Transporter</option>
            <option value="TRIPLICATE">Triplicate for Supplier</option>
          </select>

          {/* Template format */}
          <select
            value={templateStyle}
            onChange={(e) => setTemplateStyle(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none cursor-pointer font-medium"
          >
            <option value="OFFICIAL_GST">Official GST Tax Invoice (A4)</option>
            <option value="MODERN_CLEAN">Modern Corporate (A4)</option>
            <option value="THERMAL_POS">Thermal POS Receipt (80mm)</option>
          </select>

          {/* Fit to 1 Page Toggle (for A4) */}
          {templateStyle !== 'THERMAL_POS' && (
            <button
              onClick={() => setFitToOnePage(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                fitToOnePage 
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Compact rows to ensure complete invoice fits in 1 single A4 sheet"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{fitToOnePage ? 'Fit to 1 A4: ON' : 'Fit to 1 A4'}</span>
              {fitToOnePage && <Check className="w-3 h-3 text-indigo-600" />}
            </button>
          )}

          {/* Quick Signature Toggle */}
          <button
            type="button"
            onClick={() => {
              const newStatus = !isSignatureVisible;
              updateBusiness({ showSignatureOnInvoice: newStatus });
              showToast('info', newStatus ? 'Signature Enabled' : 'Signature Hidden', newStatus ? 'Authorized signature is now visible on sales invoices.' : 'Signature hidden on print.');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              isSignatureVisible 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                : 'bg-slate-100 border-slate-300 text-slate-500'
            }`}
            title="Toggle Authorized Signature image on invoice"
          >
            <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
            <span>Signature: {isSignatureVisible ? 'ON' : 'OFF'}</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Download formatted A4 PDF file"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Exporting A4...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Download A4 PDF</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoice Document Canvas */}
      <div className="flex justify-center w-full overflow-x-auto pb-8">
        <div 
          ref={invoiceRef}
          className={`bg-white text-slate-900 transition-all ${
            templateStyle === 'THERMAL_POS'
              ? 'w-[320px] p-4 font-mono text-[11px] leading-tight border border-slate-300 rounded-lg shadow-md print:shadow-none print:border-0'
              : `a4-sheet w-[794px] max-w-full min-h-[1123px] bg-white border border-slate-300 rounded-lg shadow-xl print:shadow-none print:border-0 ${
                  fitToOnePage ? 'p-5 text-[11px]' : 'p-8 text-xs'
                }`
          }`}
          style={
            templateStyle !== 'THERMAL_POS' 
              ? { width: '794px', minHeight: fitToOnePage ? 'auto' : '1123px' } 
              : undefined
          }
        >
          {templateStyle === 'THERMAL_POS' ? (
            /* Thermal POS Receipt 80mm format */
            <div>
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="font-bold text-sm uppercase">{business.tradeName || business.name}</h2>
                <p className="text-[10px]">{business.address}, {business.city}</p>
                <p className="text-[10px]">GSTIN: {business.gstin}</p>
                <p className="text-[10px]">Ph: {business.phone}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Bill No: {invoice.invoiceNumber}</span>
                  <span>{formatDate(invoice.invoiceDate)}</span>
                </div>
                <div>Cust: {invoice.customerName}</div>
                {invoice.customerGstin && <div>GST: {invoice.customerGstin}</div>}
              </div>

              {/* Items */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold pb-1 text-[10px]">
                  <span>Item</span>
                  <span>Qty x Rate</span>
                  <span>Amt</span>
                </div>
                {invoice.items.map(item => (
                  <div key={item.id} className="flex justify-between py-0.5 text-[10px]">
                    <div className="truncate max-w-[120px]">{item.name}</div>
                    <div>{item.quantity} x {item.rate}</div>
                    <div className="font-bold">{formatCurrency(item.totalAmount, '')}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total GST:</span>
                  <span>{formatCurrency(invoice.totalTax, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-slate-300">
                  <span>NET TOTAL:</span>
                  <span>{formatCurrency(invoice.grandTotal, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Status / Method:</span>
                  <span>{invoice.status} ({invoice.paymentMethod || 'CASH'})</span>
                </div>
              </div>

              {/* QR Code for Instant UPI Payment */}
              <div className="py-3 text-center flex flex-col items-center">
                <QrCodeSvg value={upiPaymentUri} size={90} />
                <p className="text-[9px] mt-1 text-slate-500">Scan & Pay via UPI: {business.upiId}</p>
              </div>

              <div className="text-center text-[9px] text-slate-500 pt-1">
                Thank you for shopping with us!
              </div>
            </div>
          ) : templateStyle === 'MODERN_CLEAN' ? (
            /* Modern Corporate A4 Format */
            <div className="flex flex-col justify-between h-full space-y-4">
              <div>
                {/* Header */}
                <div className={`flex items-start justify-between border-b border-slate-200 gap-4 ${fitToOnePage ? 'pb-3' : 'pb-5'}`}>
                  <div>
                    <div className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 rounded border border-indigo-100 mb-1.5">
                      {printCopyType === 'ORIGINAL' ? 'Original for Recipient' : printCopyType === 'DUPLICATE' ? 'Duplicate for Transporter' : 'Triplicate for Supplier'}
                    </div>
                    <h1 className={`${fitToOnePage ? 'text-xl' : 'text-2xl'} font-black tracking-tight text-slate-900`}>
                      {business.tradeName || business.name}
                    </h1>
                    <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm">
                      {business.address}, {business.city} - {business.pincode} • GSTIN: <span className="font-mono font-bold text-slate-800">{business.gstin}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                      {invoice.invoiceType.replace(/_/g, ' ')}
                    </div>
                    <div className={`${fitToOnePage ? 'text-lg' : 'text-xl'} font-extrabold font-mono text-slate-900 mt-0.5`}>
                      #{invoice.invoiceNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Date: <strong className="text-slate-800 font-medium">{formatDate(invoice.invoiceDate)}</strong>
                      {invoice.dueDate && <span> • Due: <strong className="text-slate-800 font-medium">{formatDate(invoice.dueDate)}</strong></span>}
                    </div>
                  </div>
                </div>

                {/* Bill To & Details */}
                <div className={`grid grid-cols-2 gap-4 border-b border-slate-100 ${fitToOnePage ? 'py-3 text-[11px]' : 'py-4 text-xs'}`}>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Billed To (Customer):</div>
                    <div className="font-bold text-slate-900">{invoice.customerName}</div>
                    <div className="text-slate-600">{invoice.customerAddress}</div>
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 space-y-0.5 text-[10px]">
                      {invoice.customerGstin && (
                        <div className="font-mono"><strong>GSTIN:</strong> {invoice.customerGstin}</div>
                      )}
                      <div><strong>Place of Supply:</strong> {invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-[11px]">
                    <div className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">Invoice Meta:</div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Status:</span>
                      <span className="font-bold text-slate-800">{invoice.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Supply Type:</span>
                      <span className="font-semibold text-slate-800">{invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reverse Charge:</span>
                      <span className="font-semibold text-slate-800">{invoice.isReverseCharge ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className={fitToOnePage ? 'py-2' : 'py-3'}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px]">
                        <th className="py-2 px-2 text-center w-6">#</th>
                        <th className="py-2 px-2">Item Description</th>
                        <th className="py-2 px-2 text-center">HSN</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-right">Rate</th>
                        <th className="py-2 px-2 text-right">Taxable</th>
                        <th className="py-2 px-2 text-right">GST %</th>
                        <th className="py-2 px-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      {invoice.items.map((item, idx) => (
                        <tr key={item.id} className="avoid-break">
                          <td className="py-1.5 px-2 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-1.5 px-2">
                            <span className="font-bold text-slate-900">{item.name}</span>
                            {item.batchNumber && (
                              <span className="block text-[9px] text-slate-400">
                                Batch: {item.batchNumber} {item.expiryDate ? `• Exp: ${item.expiryDate}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[10px]">{item.hsnCode}</td>
                          <td className="py-1.5 px-2 text-center font-semibold text-slate-800">{item.quantity} {item.unit}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-600">{formatCurrency(item.rate, '')}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-medium text-slate-800">{formatCurrency(item.taxableAmount, '')}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-slate-600">{item.gstRate}%</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalAmount, '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary */}
                <div className={`grid grid-cols-2 gap-4 border-t border-slate-200 avoid-break ${fitToOnePage ? 'pt-2' : 'pt-3'}`}>
                  <div className="space-y-2">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Amount in Words:</span>
                      <div className="font-bold text-slate-900 text-[11px] mt-0.5">{numberToIndianWords(invoice.grandTotal)}</div>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                      <div className="space-y-0.5 text-[10px]">
                        <div className="font-bold text-indigo-600">UPI / Bank Payment:</div>
                        <div>A/C: {business.accountNumber} ({business.ifscCode})</div>
                        <div className="font-mono text-slate-700">UPI: {business.upiId}</div>
                      </div>
                      <div className="shrink-0">
                        <QrCodeSvg value={upiPaymentUri} size={50} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-500">Taxable Subtotal:</span>
                      <span className="font-mono font-bold">{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
                    </div>
                    {!invoice.isInterState ? (
                      <>
                        <div className="flex justify-between py-0.5 border-b border-slate-100">
                          <span className="text-slate-500">CGST Total:</span>
                          <span className="font-mono">{formatCurrency(invoice.totalCgst, business.currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between py-0.5 border-b border-slate-100">
                          <span className="text-slate-500">SGST Total:</span>
                          <span className="font-mono">{formatCurrency(invoice.totalSgst, business.currencySymbol)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-0.5 border-b border-slate-100">
                        <span className="text-slate-500">IGST Total:</span>
                        <span className="font-mono">{formatCurrency(invoice.totalIgst, business.currencySymbol)}</span>
                      </div>
                    )}
                    {invoice.roundOff !== 0 && (
                      <div className="flex justify-between py-0.5 border-b border-slate-100 text-slate-400 text-[10px]">
                        <span>Round Off:</span>
                        <span className="font-mono">{invoice.roundOff > 0 ? '+' : ''}{invoice.roundOff}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 px-2.5 bg-indigo-600 text-white rounded-lg font-extrabold text-xs shadow-xs">
                      <span>Grand Total (INR):</span>
                      <span className="font-mono text-sm">{formatCurrency(invoice.grandTotal, '₹')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className={`grid grid-cols-2 gap-4 border-t border-slate-200 avoid-break ${fitToOnePage ? 'pt-2 text-[10px]' : 'pt-4 text-[11px]'}`}>
                <div>
                  <div className="font-bold text-slate-800 uppercase text-[9px] mb-0.5">Terms & Conditions:</div>
                  <p className="text-slate-500 whitespace-pre-line leading-snug">
                    {invoice.terms || business.defaultTerms}
                  </p>
                </div>
                <div className="flex flex-col justify-end items-end text-right">
                  <div className="font-bold text-slate-900 text-xs">For {business.tradeName || business.name}</div>
                  {isSignatureVisible ? (
                    <div className="my-1 py-0.5 flex flex-col items-center justify-center min-h-[44px]">
                      <img
                        src={activeSignatureUrl}
                        alt="Authorized Signature"
                        className="h-12 max-w-[160px] object-contain block mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="h-9" />
                  )}
                  <div className="text-[10px] font-bold text-slate-900 border-t border-slate-300 pt-0.5 min-w-[140px] text-center">
                    {business.signatoryName || 'Authorized Signatory'}
                  </div>
                  {business.signatoryDesignation && (
                    <div className="text-[9px] text-slate-500 text-center min-w-[140px]">
                      {business.signatoryDesignation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standard Official GST Tax Invoice A4 Format */
            <div className="flex flex-col justify-between h-full space-y-3">
              <div>
                {/* Top Bar with Copy Identifier & Title */}
                <div className="flex items-center justify-between pb-2 border-b-2 border-slate-900">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                      {printCopyType === 'ORIGINAL' ? 'Original for Recipient' : printCopyType === 'DUPLICATE' ? 'Duplicate for Transporter' : 'Triplicate for Supplier'}
                    </span>
                  </div>
                  <div className="text-right">
                    <h1 className={`${fitToOnePage ? 'text-base' : 'text-lg'} font-extrabold tracking-tight uppercase text-slate-900`}>
                      {invoice.invoiceType.replace(/_/g, ' ')}
                    </h1>
                    <p className="text-[9px] text-slate-500 font-semibold">(Issued under Section 31 of CGST Act, 2017)</p>
                  </div>
                </div>

                {/* Seller & Customer 2-Column Details */}
                <div className={`grid grid-cols-2 gap-3 border-b border-slate-300 ${fitToOnePage ? 'py-2 text-[11px]' : 'py-3 text-xs'}`}>
                  {/* Left: Seller Details */}
                  <div className="space-y-0.5 pr-2">
                    <div className="text-[9px] font-bold uppercase text-slate-400">Sold By / Supplier:</div>
                    <div className="font-extrabold text-slate-900">{business.tradeName || business.name}</div>
                    <p className="text-slate-700 leading-snug">{business.address}, {business.city} - {business.pincode}</p>
                    <div className="font-mono text-slate-900"><strong>GSTIN:</strong> {business.gstin}</div>
                    <div className="text-slate-700"><strong>State & Code:</strong> {business.state} ({business.stateCode})</div>
                    <div className="text-slate-700"><strong>Phone & Email:</strong> {business.phone} | {business.email}</div>
                  </div>

                  {/* Right: Invoice Meta & Customer Details */}
                  <div className="space-y-1 border-l border-slate-300 pl-3">
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200 mb-1 text-[10px]">
                      <div>
                        <span className="text-slate-500">Invoice No:</span>
                        <div className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Invoice Date:</span>
                        <div className="font-semibold text-slate-900">{formatDate(invoice.invoiceDate)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Place of Supply:</span>
                        <div className="font-semibold text-slate-900">{invoice.placeOfSupplyState} ({invoice.placeOfSupplyStateCode})</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Reverse Charge:</span>
                        <div className="font-semibold text-slate-900">{invoice.isReverseCharge ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    <div className="text-[9px] font-bold uppercase text-slate-400">Billed To / Buyer:</div>
                    <div className="font-bold text-slate-900">{invoice.customerName}</div>
                    <p className="text-slate-700 leading-snug">{invoice.customerAddress}</p>
                    {invoice.customerGstin ? (
                      <div className="font-mono text-slate-900"><strong>GSTIN / UIN:</strong> {invoice.customerGstin}</div>
                    ) : (
                      <div className="text-slate-500 italic">Unregistered / Consumer</div>
                    )}
                    <div className="text-slate-700"><strong>State:</strong> {invoice.customerState} ({invoice.customerStateCode})</div>
                  </div>
                </div>

                {/* Items Table */}
                <div className={fitToOnePage ? 'py-1.5' : 'py-2.5'}>
                  <table className="w-full text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-[10px]">
                        <th className="py-1 px-1.5 border-r border-slate-300 text-center w-6">#</th>
                        <th className="py-1 px-2 border-r border-slate-300">Item Description</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-center">HSN</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-center">Qty</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-right">Rate</th>
                        <th className="py-1 px-1.5 border-r border-slate-300 text-right">Taxable</th>
                        {!invoice.isInterState ? (
                          <>
                            <th className="py-1 px-1.5 border-r border-slate-300 text-right">CGST</th>
                            <th className="py-1 px-1.5 border-r border-slate-300 text-right">SGST</th>
                          </>
                        ) : (
                          <th className="py-1 px-1.5 border-r border-slate-300 text-right">IGST</th>
                        )}
                        <th className="py-1 px-2 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px]">
                      {invoice.items.map((item, idx) => (
                        <tr key={item.id} className="text-slate-800 avoid-break">
                          <td className="py-1 px-1.5 border-r border-slate-300 text-center">{idx + 1}</td>
                          <td className="py-1 px-2 border-r border-slate-300 font-medium">
                            {item.name}
                            {item.batchNumber && (
                              <span className="block text-[9px] text-slate-500 font-normal">
                                Batch: {item.batchNumber} {item.expiryDate ? `• Exp: ${item.expiryDate}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono text-[10px]">{item.hsnCode}</td>
                          <td className="py-1 px-1.5 border-r border-slate-300 text-center font-semibold">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono">
                            {formatCurrency(item.rate, '')}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono font-medium">
                            {formatCurrency(item.taxableAmount, '')}
                          </td>
                          {!invoice.isInterState ? (
                            <>
                              <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono text-[10px]">
                                {formatCurrency(item.cgstAmount, '')} ({item.cgstRate}%)
                              </td>
                              <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono text-[10px]">
                                {formatCurrency(item.sgstAmount, '')} ({item.sgstRate}%)
                              </td>
                            </>
                          ) : (
                            <td className="py-1 px-1.5 border-r border-slate-300 text-right font-mono text-[10px]">
                              {formatCurrency(item.igstAmount, '')} ({item.igstRate}%)
                            </td>
                          )}
                          <td className="py-1 px-2 text-right font-mono font-bold">
                            {formatCurrency(item.totalAmount, '')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Amount in words & Invoice Summary Table */}
                <div className={`grid grid-cols-2 gap-3 border-t border-slate-300 avoid-break ${fitToOnePage ? 'py-1.5' : 'py-2'}`}>
                  <div className="space-y-2">
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Total Amount in Words:</span>
                      <p className="font-bold text-slate-900 text-[11px] mt-0.5">
                        {numberToIndianWords(invoice.grandTotal)}
                      </p>
                    </div>

                    {/* Bank details & UPI QR */}
                    <div className="p-2 border border-slate-300 rounded flex items-center justify-between gap-2">
                      <div className="space-y-0.5 text-[10px]">
                        <div className="font-bold text-slate-900">Bank Transfer & UPI Details:</div>
                        <div><strong>Bank:</strong> {business.bankName}</div>
                        <div className="font-mono"><strong>A/C:</strong> {business.accountNumber}</div>
                        <div className="font-mono"><strong>IFSC:</strong> {business.ifscCode}</div>
                        <div className="font-mono text-indigo-700"><strong>UPI:</strong> {business.upiId}</div>
                      </div>
                      <div className="text-center shrink-0">
                        <QrCodeSvg value={upiPaymentUri} size={50} />
                        <span className="text-[7px] text-slate-500 block">Scan to Pay</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculations Box */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <div className="divide-y divide-slate-200 text-[11px]">
                      <div className="flex justify-between p-1.5">
                        <span className="text-slate-600">Total Taxable Value:</span>
                        <span className="font-mono font-semibold">{formatCurrency(invoice.subTotalTaxable, business.currencySymbol)}</span>
                      </div>
                      {!invoice.isInterState ? (
                        <>
                          <div className="flex justify-between p-1.5">
                            <span className="text-slate-600">Total CGST:</span>
                            <span className="font-mono">{formatCurrency(invoice.totalCgst, business.currencySymbol)}</span>
                          </div>
                          <div className="flex justify-between p-1.5">
                            <span className="text-slate-600">Total SGST:</span>
                            <span className="font-mono">{formatCurrency(invoice.totalSgst, business.currencySymbol)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between p-1.5">
                          <span className="text-slate-600">Total IGST:</span>
                          <span className="font-mono">{formatCurrency(invoice.totalIgst, business.currencySymbol)}</span>
                        </div>
                      )}
                      {invoice.roundOff !== 0 && (
                        <div className="flex justify-between p-1 text-slate-500 text-[10px]">
                          <span>Round Off:</span>
                          <span className="font-mono">{invoice.roundOff > 0 ? '+' : ''}{invoice.roundOff}</span>
                        </div>
                      )}
                      <div className="flex justify-between p-2 bg-slate-100 font-extrabold text-xs text-slate-900">
                        <span>Grand Total:</span>
                        <span className="font-mono text-sm">{formatCurrency(invoice.grandTotal, business.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions and Signature */}
              <div className={`grid grid-cols-2 gap-3 border-t border-slate-300 avoid-break ${fitToOnePage ? 'pt-2 text-[10px]' : 'pt-3 text-[11px]'}`}>
                <div>
                  <div className="font-bold text-slate-800 uppercase text-[9px] mb-0.5">Terms & Conditions:</div>
                  <p className="text-slate-600 whitespace-pre-line leading-snug">
                    {invoice.terms || business.defaultTerms}
                  </p>
                </div>

                <div className="flex flex-col justify-end items-end text-right min-h-[70px]">
                  <div className="font-bold text-slate-900 text-xs">
                    For {business.tradeName || business.name}
                  </div>
                  {isSignatureVisible ? (
                    <div className="my-1 py-0.5 flex flex-col items-center justify-center min-h-[44px]">
                      <img
                        src={activeSignatureUrl}
                        alt="Authorized Signature"
                        className="h-12 max-w-[160px] object-contain block mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="h-9" />
                  )}
                  <div className="text-[10px] font-bold text-slate-900 border-t border-slate-400 pt-0.5 min-w-[140px] text-center">
                    {business.signatoryName || 'Authorized Signatory'}
                  </div>
                  {business.signatoryDesignation && (
                    <div className="text-[9px] text-slate-500 text-center min-w-[140px]">
                      {business.signatoryDesignation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
