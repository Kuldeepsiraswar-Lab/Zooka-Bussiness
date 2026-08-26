import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface ServerInvoiceItem {
  name: string;
  description?: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
  serialNumber?: string;
  batchNumber?: string;
}

export interface ServerBusinessProfile {
  name: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  upiId?: string;
  currencySymbol?: string;
}

export interface ServerInvoiceData {
  id?: string;
  invoiceNumber: string;
  invoiceType?: string;
  invoiceDate: string;
  dueDate?: string;
  status?: string;
  
  // Seller snapshot
  sellerName?: string;
  sellerGstin?: string;
  sellerState?: string;
  sellerStateCode?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerPan?: string;

  // Buyer
  customerName: string;
  customerGstin?: string;
  customerPan?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerState?: string;
  customerStateCode?: string;

  // Shipping
  hasDifferentShippingAddress?: boolean;
  shippingName?: string;
  shippingAddress?: string;
  shippingState?: string;

  // Items
  items: ServerInvoiceItem[];

  // Totals
  subtotal?: number;
  taxableAmount?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  totalTax?: number;
  discountTotal?: number;
  roundOff?: number;
  grandTotal: number;
  amountPaid?: number;
  amountDue?: number;

  notes?: string;
  termsAndConditions?: string;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  currencySymbol?: string;
}

// Convert numbers into Indian Currency words representation
export function numberToWordsIndian(num: number): string {
  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return single[n];
    if (n < 20) return teens[n - 10];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + single[unit] : '');
  };

  const convertThreeDigits = (n: number): string => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += single[hundred] + ' Hundred';
    if (rest > 0) {
      if (res) res += ' and ';
      res += convertTwoDigits(rest);
    }
    return res;
  };

  let crore = Math.floor(rounded / 10000000);
  let lakh = Math.floor((rounded % 10000000) / 100000);
  let thousand = Math.floor((rounded % 100000) / 1000);
  let remainder = rounded % 1000;

  let words = '';
  if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertThreeDigits(thousand) + ' Thousand ';
  if (remainder > 0) words += convertThreeDigits(remainder);

  return 'INR ' + words.trim() + ' Only';
}

/**
 * Server-side Vector PDF Invoice Generator using jsPDF
 * Creates a clean, crisp, GST-compliant A4 PDF document without any canvas rendering.
 */
export async function generateInvoicePdfBuffer(
  invoice: ServerInvoiceData,
  business?: ServerBusinessProfile
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2); // 186mm

  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [16, 185, 129]; // Emerald 500
  const textDark = [30, 41, 59]; // Slate 800
  const textMuted = [100, 116, 139]; // Slate 500
  const borderLight = [226, 232, 240]; // Slate 200

  const sym = invoice.currencySymbol || business?.currencySymbol || 'Rs. ';

  // 1. Top Header Banner
  doc.setFillColor(15, 23, 42); // Dark Navy / Slate 900
  doc.rect(margin, margin, contentWidth, 24, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  const sellerTitle = invoice.sellerName || business?.tradeName || business?.name || 'VyaparFlow Enterprise';
  doc.text(sellerTitle.substring(0, 40), margin + 6, margin + 10);

  // Subtitle / Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const gstText = (invoice.sellerGstin || business?.gstin) ? `GSTIN: ${invoice.sellerGstin || business?.gstin}` : 'Registered Taxpayer';
  const panText = (invoice.sellerPan || business?.pan) ? ` | PAN: ${invoice.sellerPan || business?.pan}` : '';
  doc.text(`${gstText}${panText}`, margin + 6, margin + 16);

  // Document Type Header Box on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(16, 185, 129); // Emerald
  const docTypeLabel = (invoice.invoiceType || 'TAX INVOICE').replace(/_/g, ' ').toUpperCase();
  doc.text(docTypeLabel, pageWidth - margin - 6, margin + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('ORIGINAL FOR RECIPIENT', pageWidth - margin - 6, margin + 16, { align: 'right' });

  let curY = margin + 28;

  // 2. Metadata Grid (Seller Address, Invoice Info, Buyer Info)
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.rect(margin, curY, contentWidth, 38);

  // Vertical Separators
  const col1W = 62;
  const col2W = 62;
  const col3W = contentWidth - col1W - col2W; // 62mm

  doc.line(margin + col1W, curY, margin + col1W, curY + 38);
  doc.line(margin + col1W + col2W, curY, margin + col1W + col2W, curY + 38);

  // Column 1: Billed By (Seller details)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('SUPPLIER / BILLED BY:', margin + 4, curY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const sellerAddr = invoice.sellerAddress || business?.address || 'Headquarters';
  const sellerCity = business?.city ? `${business.city}, ` : '';
  const sellerState = invoice.sellerState || business?.state || 'India';
  const sellerPhone = invoice.sellerPhone || business?.phone || '';
  const sellerEmail = invoice.sellerEmail || business?.email || '';

  const sellerAddrLines = doc.splitTextToSize(sellerAddr, col1W - 8);
  let addrY = curY + 9;
  doc.text(sellerAddrLines.slice(0, 2), margin + 4, addrY);
  addrY += (Math.min(sellerAddrLines.length, 2) * 3.5);
  doc.text(`${sellerCity}${sellerState} (Code: ${invoice.sellerStateCode || business?.stateCode || '07'})`, margin + 4, addrY);
  if (sellerPhone) {
    addrY += 3.5;
    doc.text(`Ph: ${sellerPhone}`, margin + 4, addrY);
  }
  if (sellerEmail) {
    addrY += 3.5;
    doc.text(`Email: ${sellerEmail}`, margin + 4, addrY);
  }

  // Column 2: Invoice Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('INVOICE DETAILS:', margin + col1W + 4, curY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  let metaY = curY + 9;

  const drawMetaRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(label, margin + col1W + 4, metaY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(value, margin + col1W + col2W - 4, metaY, { align: 'right' });
    metaY += 4.5;
  };

  drawMetaRow('Invoice No:', invoice.invoiceNumber);
  drawMetaRow('Invoice Date:', invoice.invoiceDate);
  drawMetaRow('Due Date:', invoice.dueDate || invoice.invoiceDate);
  drawMetaRow('Place of Supply:', invoice.placeOfSupply || invoice.customerState || 'Intra-State');
  drawMetaRow('Reverse Charge:', invoice.reverseCharge ? 'Yes' : 'No');

  // Column 3: Billed To (Buyer details)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('BILLED TO (BUYER):', margin + col1W + col2W + 4, curY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customerName.substring(0, 32), margin + col1W + col2W + 4, curY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  let buyerY = curY + 14;
  const buyerAddrLines = doc.splitTextToSize(invoice.customerAddress || 'Customer Address', col3W - 8);
  doc.text(buyerAddrLines.slice(0, 2), margin + col1W + col2W + 4, buyerY);
  buyerY += (Math.min(buyerAddrLines.length, 2) * 3.5);
  doc.text(`State: ${invoice.customerState || 'Local'} (${invoice.customerStateCode || '07'})`, margin + col1W + col2W + 4, buyerY);
  if (invoice.customerGstin) {
    buyerY += 3.5;
    doc.text(`GSTIN: ${invoice.customerGstin}`, margin + col1W + col2W + 4, buyerY);
  }
  if (invoice.customerPhone) {
    buyerY += 3.5;
    doc.text(`Ph: ${invoice.customerPhone}`, margin + col1W + col2W + 4, buyerY);
  }

  curY += 42;

  // 3. Itemized Products / Services Table
  const tableHeaderY = curY;
  const tableHeaderH = 7;

  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(margin, tableHeaderY, contentWidth, tableHeaderH, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.rect(margin, tableHeaderY, contentWidth, tableHeaderH, 'S');

  // Column definitions (Total 186mm)
  const cols = [
    { label: '#', x: margin + 2, w: 7, align: 'left' },
    { label: 'Item & Description', x: margin + 9, w: 72, align: 'left' },
    { label: 'HSN/SAC', x: margin + 81, w: 18, align: 'center' },
    { label: 'Qty', x: margin + 99, w: 16, align: 'center' },
    { label: 'Rate', x: margin + 115, w: 18, align: 'right' },
    { label: 'Disc', x: margin + 133, w: 14, align: 'right' },
    { label: 'Taxable', x: margin + 147, w: 20, align: 'right' },
    { label: 'Total', x: margin + 167, w: 19, align: 'right' },
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  cols.forEach(c => {
    const textX = c.align === 'right' ? c.x + c.w : (c.align === 'center' ? c.x + (c.w / 2) : c.x);
    doc.text(c.label, textX, tableHeaderY + 4.8, { align: c.align as any });
  });

  curY += tableHeaderH;

  // Render Table Rows
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      name: 'General Consulting / Goods',
      hsnCode: '998311',
      quantity: 1,
      unit: 'NOS',
      rate: invoice.grandTotal,
      taxableAmount: invoice.grandTotal,
      gstRate: 18,
      totalAmount: invoice.grandTotal
    }
  ];

  let isAlternate = false;
  items.forEach((item, index) => {
    const rowH = item.serialNumber || item.description ? 9.5 : 7.2;

    // Alternate background row
    if (isAlternate) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, curY, contentWidth, rowH, 'F');
    }
    isAlternate = !isAlternate;

    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(margin, curY + rowH, margin + contentWidth, curY + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    // Index
    doc.text((index + 1).toString(), margin + 2, curY + 4.8);

    // Item Title
    doc.setFont('helvetica', 'bold');
    doc.text(item.name.substring(0, 38), margin + 9, curY + 4.8);

    // Extra subtitle / serial
    if (item.serialNumber || item.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const sub = item.serialNumber ? `Sr/IMEI: ${item.serialNumber}` : (item.description || '');
      doc.text(sub.substring(0, 42), margin + 9, curY + 8.2);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    // HSN
    doc.text(item.hsnCode || '-', margin + 81 + 9, curY + 4.8, { align: 'center' });

    // Qty
    doc.text(`${item.quantity} ${item.unit || 'PCS'}`, margin + 99 + 8, curY + 4.8, { align: 'center' });

    // Rate
    doc.text(item.rate.toFixed(2), margin + 115 + 18, curY + 4.8, { align: 'right' });

    // Discount
    const disc = (item.discountAmount ?? 0) > 0 ? `${item.discountAmount?.toFixed(1)}` : '-';
    doc.text(disc, margin + 133 + 14, curY + 4.8, { align: 'right' });

    // Taxable
    doc.text((item.taxableAmount || (item.quantity * item.rate)).toFixed(2), margin + 147 + 20, curY + 4.8, { align: 'right' });

    // Total Amount
    doc.setFont('helvetica', 'bold');
    doc.text(item.totalAmount.toFixed(2), margin + 167 + 19, curY + 4.8, { align: 'right' });

    curY += rowH;
  });

  curY += 3;

  // 4. Bottom Block: Left (Bank & UPI QR Code + In Words) | Right (Totals Summary Box)
  const bottomStart = curY;
  const leftColW = 108;
  const rightColW = contentWidth - leftColW - 4; // 74mm

  // Generate UPI QR Code URL for direct payment
  const upiId = business?.upiId || '';
  const payee = business?.tradeName || business?.name || 'VyaparFlow';
  const payAmt = (invoice.amountDue ?? 0) > 0 ? invoice.amountDue : invoice.grandTotal;
  const upiIntentUri = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${payAmt?.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Inv ' + invoice.invoiceNumber)}` : '';

  let qrDataUrl: string | null = null;
  if (upiIntentUri) {
    try {
      qrDataUrl = await QRCode.toDataURL(upiIntentUri, {
        margin: 1,
        width: 140,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
    } catch (e) {
      // Ignore QR failure
    }
  }

  // Left Box: Total In Words & Payment Bank Details
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, bottomStart, leftColW, 46, 'F');
  doc.rect(margin, bottomStart, leftColW, 46, 'S');

  // Words Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('TOTAL AMOUNT IN WORDS:', margin + 3, bottomStart + 5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const wordsStr = numberToWordsIndian(invoice.grandTotal);
  const wordsLines = doc.splitTextToSize(wordsStr, leftColW - 6);
  doc.text(wordsLines.slice(0, 2), margin + 3, bottomStart + 9.5);

  // Bank & UPI QR Split
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(margin + 3, bottomStart + 16, margin + leftColW - 3, bottomStart + 16);

  // Bank Coordinates
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('BANK & PAYMENT DETAILS:', margin + 3, bottomStart + 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const bName = business?.bankName || 'HDFC Bank Ltd';
  const bAcct = business?.bankAccountNumber || '50200012345678';
  const bIfsc = business?.bankIfsc || 'HDFC0001234';
  const bUpi = business?.upiId || 'merchant@okaxis';

  doc.text(`Bank Name: ${bName}`, margin + 3, bottomStart + 25);
  doc.text(`A/C No: ${bAcct}`, margin + 3, bottomStart + 29);
  doc.text(`IFSC Code: ${bIfsc}`, margin + 3, bottomStart + 33);
  doc.text(`UPI ID: ${bUpi}`, margin + 3, bottomStart + 37);

  // UPI QR Code thumbnail on bottom-right of bank box
  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin + leftColW - 25, bottomStart + 18, 22, 22);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('SCAN TO PAY', margin + leftColW - 14, bottomStart + 42, { align: 'center' });
    } catch (e) {
      // Skip QR image if format fails
    }
  }

  // Right Box: Financial Totals Breakdown
  const rightX = margin + leftColW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.rect(rightX, bottomStart, rightColW, 46, 'F');
  doc.rect(rightX, bottomStart, rightColW, 46, 'S');

  let totY = bottomStart + 5.5;
  const drawTotLine = (lbl: string, val: number, isBold = false, isGreen = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 8.5 : 7.5);
    if (isGreen) {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    }
    doc.text(lbl, rightX + 4, totY);
    doc.text(`${sym}${val.toFixed(2)}`, rightX + rightColW - 4, totY, { align: 'right' });
    totY += 4.8;
  };

  const taxableVal = invoice.taxableAmount || (invoice.grandTotal - (invoice.totalTax || 0));
  drawTotLine('Taxable Amount:', taxableVal);

  if ((invoice.cgstTotal ?? 0) > 0) {
    drawTotLine('CGST:', invoice.cgstTotal || 0);
  }
  if ((invoice.sgstTotal ?? 0) > 0) {
    drawTotLine('SGST:', invoice.sgstTotal || 0);
  }
  if ((invoice.igstTotal ?? 0) > 0) {
    drawTotLine('IGST:', invoice.igstTotal || 0);
  }
  if ((invoice.discountTotal ?? 0) > 0) {
    drawTotLine('Discount Total:', -(invoice.discountTotal || 0), false, true);
  }
  if ((invoice.roundOff ?? 0) !== 0) {
    drawTotLine('Round Off:', invoice.roundOff || 0);
  }

  // Grand Total Highlight Bar
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(rightX, bottomStart + 35, rightColW, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', rightX + 4, bottomStart + 42);
  doc.text(`${sym}${invoice.grandTotal.toFixed(2)}`, rightX + rightColW - 4, bottomStart + 42, { align: 'right' });

  curY = bottomStart + 50;

  // 5. Terms & Conditions and Authorized Signatory
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('TERMS & CONDITIONS:', margin, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const defaultTerms = invoice.termsAndConditions || '1. Goods once sold will not be taken back or exchanged.\n2. Payment due strictly on or before invoice due date.\n3. Subject to local jurisdiction only.';
  const termsLines = doc.splitTextToSize(defaultTerms, 110);
  doc.text(termsLines.slice(0, 3), margin, curY + 8);

  // Authorized Signatory Box on Right
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.rect(pageWidth - margin - 55, curY, 55, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`For ${sellerTitle.substring(0, 24)}`, pageWidth - margin - 27.5, curY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Authorized Signatory', pageWidth - margin - 27.5, curY + 19, { align: 'center' });

  // Bottom Footer Stamp
  doc.setFontSize(6);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('This is a computer generated tax invoice generated by VyaparFlow suite. No physical signature required.', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Output as standard Node.js Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
