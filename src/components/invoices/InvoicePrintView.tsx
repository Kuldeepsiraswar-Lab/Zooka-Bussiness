import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';
import { getTemplateById } from '../../utils/invoiceTemplates';
import { InvoiceTemplateRenderer } from './InvoiceTemplateRenderer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { 
  Printer, 
  Download, 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Check, 
  FileSignature, 
  Image as ImageIcon
} from 'lucide-react';
import { Invoice } from '../../types';

interface InvoicePrintViewProps {
  invoiceId: string;
  onBack: () => void;
  onEdit?: (invoice: Invoice) => void;
}

export const InvoicePrintView: React.FC<InvoicePrintViewProps> = ({ invoiceId, onBack, onEdit }) => {
  const { invoices, business, updateBusiness, showToast } = useApp();
  const [printCopyType, setPrintCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>('ORIGINAL');
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);
  const [fitToOnePage, setFitToOnePage] = useState(false);

  const activeTemplate = useMemo(() => {
    return getTemplateById(business.defaultTemplateId || 'OFFICIAL_GST', business.customTemplates);
  }, [business.defaultTemplateId, business.customTemplates]);

  const isSignatureVisible = business.showSignatureOnInvoice !== false;
  const invoiceRef = useRef<HTMLDivElement>(null);

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

  const isThermal = activeTemplate.headerStyle === 'THERMAL' || activeTemplate.id === 'THERMAL_POS';

  const handlePrint = () => {
    if (!invoiceRef.current) {
      window.print();
      return;
    }

    try {
      showToast('info', 'Opening Print Dialog', 'Preparing document for printing...');

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
                  size: ${isThermal ? '80mm auto' : 'A4 portrait'};
                  margin: ${isThermal ? '2mm' : '6mm 8mm'};
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
          } catch (e) {
            console.error('Print iframe error:', e);
            window.print();
          }
        }, 300);
      }
    } catch (err) {
      console.error('Print failed:', err);
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingPdf(true);
    showToast('info', 'Generating PDF', 'Rendering high-resolution vector PDF document...');

    try {
      const element = invoiceRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: isThermal ? 360 : 1024,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      if (isThermal) {
        const imgWidth = 80;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [imgWidth, imgHeight + 10]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`POS-Receipt-${invoice.invoiceNumber}.pdf`);
      } else {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 5;
        const printableWidth = pdfWidth - (margin * 2);
        const imgHeight = (canvas.height * printableWidth) / canvas.width;

        if (imgHeight <= pdfHeight - (margin * 2)) {
          pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, imgHeight);
        } else {
          let heightLeft = imgHeight;
          let position = margin;

          pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
          heightLeft -= (pdfHeight - (margin * 2));

          while (heightLeft > 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', margin, position, printableWidth, imgHeight);
            heightLeft -= pdfHeight;
          }
        }

        pdf.save(`Tax-Invoice-${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
      }
      showToast('success', 'PDF Ready', 'Invoice PDF downloaded successfully.');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      showToast('error', 'PDF Export Failed', 'Could not generate PDF. Please try printing to PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadJpg = async () => {
    if (!invoiceRef.current) return;
    setIsGeneratingJpg(true);
    showToast('info', 'Generating A4 JPG', 'Rendering high-resolution A4 invoice image...');

    try {
      const element = invoiceRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: isThermal ? 360 : 1024,
      });

      let finalCanvas = canvas;

      if (!isThermal) {
        // Create standard A4 dimensions canvas (210mm x 297mm ratio = 1 : 1.4142)
        const a4Canvas = document.createElement('canvas');
        const a4Width = Math.max(canvas.width, 2480); // 300 DPI A4 width
        const standardA4Height = Math.round(a4Width * (297 / 210)); // Exactly 3508px for 2480px A4
        
        const margin = Math.round(a4Width * 0.02);
        const targetWidth = a4Width - (margin * 2);
        const scale = targetWidth / canvas.width;
        const targetHeight = canvas.height * scale;

        // Ensure full content is accommodated while preserving A4 ratio minimum
        const finalA4Height = Math.max(standardA4Height, Math.round(targetHeight + (margin * 2)));

        a4Canvas.width = a4Width;
        a4Canvas.height = finalA4Height;
        const ctx = a4Canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, a4Width, finalA4Height);
          ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, margin, margin, targetWidth, targetHeight);
          finalCanvas = a4Canvas;
        }
      }

      const imgData = finalCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `Tax-Invoice-${invoice.invoiceNumber.replace(/\//g, '_')}-A4.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('success', 'JPG Ready', 'Invoice downloaded successfully in A4 JPG format.');
    } catch (error) {
      console.error('JPG Generation Error:', error);
      showToast('error', 'JPG Export Failed', 'Could not generate JPG. Please try downloading PDF.');
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{invoice.invoiceNumber}</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                GST Compliant
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {invoice.customerName} • {formatDate(invoice.invoiceDate)}
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

          {/* Fit to 1 Page Toggle (for A4) */}
          {!isThermal && (
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
              updateBusiness({ showSignatureOnInvoice: newStatus }, true);
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
            disabled={isGeneratingPdf || isGeneratingJpg}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title="Download formatted A4 PDF file"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Exporting PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Download JPG (A4) Button */}
          <button
            onClick={handleDownloadJpg}
            disabled={isGeneratingJpg || isGeneratingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Download invoice as High Quality A4 JPG image format"
          >
            {isGeneratingJpg ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Exporting JPG...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Download JPG (A4)</span>
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
            isThermal
              ? 'w-[320px] p-4 font-mono text-[11px] leading-tight border border-slate-300 rounded-lg shadow-md print:shadow-none print:border-0'
              : `a4-sheet w-[794px] max-w-full min-h-[1123px] bg-white border border-slate-300 rounded-lg shadow-xl print:shadow-none print:border-0 ${
                  fitToOnePage ? 'p-5 text-[11px]' : 'p-8 text-xs'
                }`
          }`}
          style={
            !isThermal 
              ? { width: '794px', minHeight: fitToOnePage ? 'auto' : '1123px' } 
              : undefined
          }
        >
          <InvoiceTemplateRenderer
            invoice={invoice}
            business={business}
            template={activeTemplate}
            printCopyType={printCopyType}
            fitToOnePage={fitToOnePage}
          />
        </div>
      </div>
    </div>
  );
};
