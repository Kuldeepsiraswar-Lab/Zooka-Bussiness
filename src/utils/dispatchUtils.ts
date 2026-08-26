import { BusinessProfile, Invoice } from '../types';
import { formatDate, formatCurrency } from './formatters';
import { buildUpiPaymentUri } from './upi';

export interface DispatchTemplate {
  id: string;
  name: string;
  category: 'INVOICE_SENT' | 'PAYMENT_REMINDER' | 'PAYMENT_RECEIVED' | 'THANK_YOU';
  subject: string; // for Email
  body: string; // message template with placeholders
  isDefault?: boolean;
}

export type WhatsAppProviderType = 'META_CLOUD_API' | 'CUSTOM_WEBHOOK' | 'TWILIO' | 'DEMO_SANDBOX';

export interface MetaWhatsAppConfig {
  phoneNumberId?: string;
  accessToken?: string;
  templateName?: string;
  languageCode?: string;
}

export interface CustomWebhookConfig {
  webhookUrl?: string;
  authHeader?: string;
  customHeadersJson?: string;
  httpMethod?: 'POST' | 'PUT';
  sendPdfAs?: 'URL' | 'BASE64' | 'BOTH';
}

export interface TwilioWhatsAppConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface DispatchLogRecord {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  recipientPhone: string;
  customerName: string;
  provider: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED' | 'PENDING';
  messageId: string;
  pdfSizeBytes: number;
  pdfSizeKb: string;
  durationMs: number;
  responsePayload?: any;
  error?: string;
  source: 'DIRECT_DISPATCH' | 'WEBHOOK_EVENT';
}

export interface DispatchSettings {
  defaultChannel: 'WHATSAPP' | 'EMAIL' | 'BOTH';
  whatsappCountryCode: string; // default '+91'
  includePdfAttachmentNote: boolean;
  includePaymentLink: boolean;
  includeBankDetails: boolean;
  includeItemSummary: boolean;
  templates: DispatchTemplate[];
  defaultTemplateId: string;

  // Server-side Direct WhatsApp & Webhook Settings
  whatsappProvider?: WhatsAppProviderType;
  enableServerDirectPdf?: boolean; // if true, uses direct server-side PDF generation & WhatsApp API
  metaConfig?: MetaWhatsAppConfig;
  webhookConfig?: CustomWebhookConfig;
  twilioConfig?: TwilioWhatsAppConfig;
}

export const DEFAULT_DISPATCH_TEMPLATES: DispatchTemplate[] = [
  {
    id: 'TPL_INVOICE_STANDARD',
    name: 'Standard Invoice Delivery',
    category: 'INVOICE_SENT',
    subject: 'Tax Invoice {{invoice_number}} from {{business_name}}',
    body: `Dear {{customer_name}},

Greetings from {{business_name}}!

Your Tax Invoice *{{invoice_number}}* dated {{invoice_date}} for *{{grand_total}}* has been generated.

{{items_summary}}

*Invoice Summary:*
• Invoice No: {{invoice_number}}
• Date: {{invoice_date}}
• Total Amount: {{grand_total}}
• Amount Due: {{amount_due}}
• Due Date: {{due_date}}

{{payment_details}}

📄 *Note:* Please find your official GST Tax Invoice PDF attached directly above. Let us know if you have any questions.

Warm regards,
*{{business_name}}*
📞 {{business_phone}} | ✉️ {{business_email}}`,
    isDefault: true,
  },
  {
    id: 'TPL_PAYMENT_REMINDER',
    name: 'Gentle Payment Reminder',
    category: 'PAYMENT_REMINDER',
    subject: 'Reminder: Pending Invoice {{invoice_number}} - {{business_name}}',
    body: `Dear {{customer_name}},

This is a gentle reminder regarding payment for Tax Invoice *{{invoice_number}}* dated {{invoice_date}}.

*Outstanding Balance:* *{{amount_due}}*
*Due Date:* {{due_date}}

{{payment_details}}

If you have already processed this payment, kindly ignore this reminder or share the reference receipt.

Thank you for your partnership!

Regards,
*{{business_name}}*
📞 {{business_phone}}`,
  },
  {
    id: 'TPL_PAYMENT_RECEIVED',
    name: 'Payment Receipt & Thank You',
    category: 'PAYMENT_RECEIVED',
    subject: 'Payment Acknowledged: Invoice {{invoice_number}} - {{business_name}}',
    body: `Dear {{customer_name}},

We have received your payment for Invoice *{{invoice_number}}*. Thank you!

*Payment Status:* PAID IN FULL
*Total Settled:* {{grand_total}}

We greatly appreciate your timely business and look forward to serving you again.

Best regards,
*{{business_name}}*`,
  },
  {
    id: 'TPL_SHORT_SMS_WA',
    name: 'Quick WhatsApp Summary',
    category: 'INVOICE_SENT',
    subject: 'Invoice {{invoice_number}} - {{business_name}}',
    body: `Hi {{customer_name}}, here is your invoice *{{invoice_number}}* ({{invoice_date}}) for *{{grand_total}}*. Due: *{{amount_due}}*. {{payment_link_short}} PDF Attached! - {{business_name}}`,
  }
];

export const DEFAULT_DISPATCH_SETTINGS: DispatchSettings = {
  defaultChannel: 'WHATSAPP',
  whatsappCountryCode: '+91',
  includePdfAttachmentNote: true,
  includePaymentLink: true,
  includeBankDetails: true,
  includeItemSummary: true,
  templates: DEFAULT_DISPATCH_TEMPLATES,
  defaultTemplateId: 'TPL_INVOICE_STANDARD',
  whatsappProvider: 'DEMO_SANDBOX',
  enableServerDirectPdf: true,
  metaConfig: {
    phoneNumberId: '',
    accessToken: '',
    templateName: '',
    languageCode: 'en'
  },
  webhookConfig: {
    webhookUrl: '',
    authHeader: '',
    httpMethod: 'POST',
    sendPdfAs: 'BOTH'
  },
  twilioConfig: {
    accountSid: '',
    authToken: '',
    fromNumber: ''
  }
};

export const normalizeDispatchSettings = (settings?: Partial<DispatchSettings>): DispatchSettings => {
  if (!settings) return DEFAULT_DISPATCH_SETTINGS;
  return {
    defaultChannel: settings.defaultChannel || 'WHATSAPP',
    whatsappCountryCode: settings.whatsappCountryCode || '+91',
    includePdfAttachmentNote: settings.includePdfAttachmentNote !== false,
    includePaymentLink: settings.includePaymentLink !== false,
    includeBankDetails: settings.includeBankDetails !== false,
    includeItemSummary: settings.includeItemSummary !== false,
    templates: Array.isArray(settings.templates) && settings.templates.length > 0
      ? settings.templates
      : DEFAULT_DISPATCH_TEMPLATES,
    defaultTemplateId: settings.defaultTemplateId || 'TPL_INVOICE_STANDARD',
    whatsappProvider: settings.whatsappProvider || 'DEMO_SANDBOX',
    enableServerDirectPdf: settings.enableServerDirectPdf !== false,
    metaConfig: {
      phoneNumberId: settings.metaConfig?.phoneNumberId || '',
      accessToken: settings.metaConfig?.accessToken || '',
      templateName: settings.metaConfig?.templateName || '',
      languageCode: settings.metaConfig?.languageCode || 'en'
    },
    webhookConfig: {
      webhookUrl: settings.webhookConfig?.webhookUrl || '',
      authHeader: settings.webhookConfig?.authHeader || '',
      customHeadersJson: settings.webhookConfig?.customHeadersJson || '',
      httpMethod: settings.webhookConfig?.httpMethod || 'POST',
      sendPdfAs: settings.webhookConfig?.sendPdfAs || 'BOTH'
    },
    twilioConfig: {
      accountSid: settings.twilioConfig?.accountSid || '',
      authToken: settings.twilioConfig?.authToken || '',
      fromNumber: settings.twilioConfig?.fromNumber || ''
    }
  };
};

/**
 * Generates an items overview string for the invoice
 */
export const formatInvoiceItemsSummary = (invoice: Invoice): string => {
  if (!invoice.items || invoice.items.length === 0) return '';
  const lines = invoice.items.slice(0, 4).map((it, idx) => 
    `  ${idx + 1}. ${it.name} (${it.quantity} ${it.unit || 'PCS'})`
  );
  if (invoice.items.length > 4) {
    lines.push(`  ... and ${invoice.items.length - 4} more items`);
  }
  return `*Items Billed:*\n${lines.join('\n')}\n`;
};

/**
 * Builds payment instruction text with UPI intent link and bank coordinates
 */
export const formatPaymentInstructions = (
  invoice: Invoice,
  business: BusinessProfile,
  settings: DispatchSettings
): string => {
  const parts: string[] = [];

  const upiUri = buildUpiPaymentUri({
    upiId: business.upiId,
    payeeName: business.tradeName || business.name,
    amount: invoice.amountDue > 0 ? invoice.amountDue : invoice.grandTotal,
    invoiceNumber: invoice.invoiceNumber,
    note: `Invoice ${invoice.invoiceNumber}`
  });

  if (settings.includePaymentLink && business.upiId) {
    parts.push(`*Pay Instantly via UPI:*`);
    parts.push(`• UPI VPA: ${business.upiId}`);
    if (upiUri) {
      parts.push(`• UPI Intent Link: ${upiUri}`);
    }
  }

  if (settings.includeBankDetails && (business.accountNumber || business.bankName)) {
    parts.push(`\n*Direct Bank Transfer:*`);
    if (business.bankName) parts.push(`• Bank: ${business.bankName}${business.branchName ? ` (${business.branchName})` : ''}`);
    if (business.accountNumber) parts.push(`• A/C No: ${business.accountNumber}`);
    if (business.ifscCode) parts.push(`• IFSC Code: ${business.ifscCode}`);
    parts.push(`• Beneficiary: ${business.tradeName || business.name}`);
  }

  return parts.join('\n');
};

/**
 * Interpolates template placeholders with invoice & business dynamic data
 */
export const interpolateDispatchMessage = (
  template: string,
  invoice: Invoice,
  business: BusinessProfile,
  settings: DispatchSettings
): string => {
  const currency = business.currencySymbol || '₹';
  const grandTotal = formatCurrency(invoice.grandTotal, currency);
  const amountDue = formatCurrency(invoice.amountDue, currency);
  const amountPaid = formatCurrency(invoice.amountPaid, currency);
  const taxable = formatCurrency(invoice.subTotalTaxable, currency);
  const tax = formatCurrency(invoice.totalTax, currency);

  const itemsSummary = settings.includeItemSummary ? formatInvoiceItemsSummary(invoice) : '';
  const paymentDetails = formatPaymentInstructions(invoice, business, settings);

  const upiUri = buildUpiPaymentUri({
    upiId: business.upiId,
    payeeName: business.tradeName || business.name,
    amount: invoice.amountDue > 0 ? invoice.amountDue : invoice.grandTotal,
    invoiceNumber: invoice.invoiceNumber,
    note: `Invoice ${invoice.invoiceNumber}`
  });

  const replacements: Record<string, string> = {
    '{{customer_name}}': invoice.customerName || 'Valued Customer',
    '{{customer_phone}}': invoice.customerPhone || '',
    '{{customer_email}}': invoice.customerEmail || '',
    '{{customer_gstin}}': invoice.customerGstin || 'Unregistered',
    '{{invoice_number}}': invoice.invoiceNumber,
    '{{invoice_date}}': formatDate(invoice.invoiceDate),
    '{{due_date}}': formatDate(invoice.dueDate),
    '{{grand_total}}': grandTotal,
    '{{amount_due}}': amountDue,
    '{{amount_paid}}': amountPaid,
    '{{taxable_amount}}': taxable,
    '{{tax_amount}}': tax,
    '{{business_name}}': business.tradeName || business.name,
    '{{business_phone}}': business.phone || '',
    '{{business_email}}': business.email || '',
    '{{business_gstin}}': business.gstin || '',
    '{{business_upi}}': business.upiId || '',
    '{{bank_name}}': business.bankName || '',
    '{{account_number}}': business.accountNumber || '',
    '{{ifsc_code}}': business.ifscCode || '',
    '{{items_summary}}': itemsSummary,
    '{{payment_details}}': paymentDetails,
    '{{payment_link}}': upiUri || `UPI ID: ${business.upiId || 'N/A'}`,
    '{{payment_link_short}}': business.upiId ? `Pay UPI: ${business.upiId}` : '',
  };

  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }

  // Clean double blank lines
  return result.replace(/\n{3,}/g, '\n\n').trim();
};

/**
 * Cleans phone numbers into E.164 / WhatsApp format
 */
export const sanitizeWhatsAppPhone = (phone?: string, defaultCountryCode = '+91'): string => {
  if (!phone) return '';
  let digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // If already starts with 91 and has 12 digits (India)
  if (digits.length === 10) {
    const cleanCC = defaultCountryCode.replace(/[^0-9]/g, '') || '91';
    return `${cleanCC}${digits}`;
  }

  return digits;
};

/**
 * Creates direct WhatsApp Web/App intent link
 */
export const buildWhatsAppShareUrl = (phone: string | undefined, message: string, defaultCC = '+91'): string => {
  const cleanPhone = sanitizeWhatsAppPhone(phone, defaultCC);
  const encodedText = encodeURIComponent(message);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
};

/**
 * Creates mailto link with encoded subject & body
 */
export const buildMailtoUrl = (email: string | undefined, subject: string, body: string): string => {
  const cleanEmail = (email || '').trim();
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return `mailto:${cleanEmail}${query}`;
};

// ============================================================================
// SERVER-SIDE DISPATCH & PDF CLIENT-SIDE API HELPERS
// ============================================================================

export interface DirectWhatsAppPayload {
  recipientPhone: string;
  customerName?: string;
  invoice: Invoice;
  business: BusinessProfile;
  messageText: string;
  provider?: WhatsAppProviderType;
  metaConfig?: MetaWhatsAppConfig;
  webhookConfig?: CustomWebhookConfig;
  twilioConfig?: TwilioWhatsAppConfig;
}

/**
 * Sends real server-side generated PDF invoice via server WhatsApp Webhook / Meta Cloud API
 */
export async function sendDirectWhatsAppInvoice(
  payload: DirectWhatsAppPayload
): Promise<{ success: boolean; log?: DispatchLogRecord; error?: string }> {
  try {
    const response = await fetch('/api/dispatch/whatsapp-direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientPhone: payload.recipientPhone,
        customerName: payload.customerName || payload.invoice.customerName,
        invoice: payload.invoice,
        business: payload.business,
        messageText: payload.messageText,
        provider: payload.provider || payload.business.dispatchSettings?.whatsappProvider || 'DEMO_SANDBOX',
        metaConfig: payload.metaConfig || payload.business.dispatchSettings?.metaConfig,
        webhookConfig: payload.webhookConfig || payload.business.dispatchSettings?.webhookConfig,
        twilioConfig: payload.twilioConfig || payload.business.dispatchSettings?.twilioConfig
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error || `Server responded with ${response.status}` };
    }

    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error connecting to dispatch server' };
  }
}

/**
 * Downloads crisp vector PDF generated directly on the server (no canvas required)
 */
export async function downloadServerGeneratedPdf(
  invoice: Invoice,
  business: BusinessProfile
): Promise<void> {
  const response = await fetch('/api/dispatch/generate-invoice-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      invoice,
      business
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to download server generated PDF');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Invoice_${(invoice.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Tests WhatsApp Webhook or Meta Cloud API Connection
 */
export async function testWhatsAppApiConnection(params: {
  provider: WhatsAppProviderType;
  webhookUrl?: string;
  authHeader?: string;
  metaConfig?: MetaWhatsAppConfig;
}): Promise<{ success: boolean; message: string; status?: number; metaDetails?: any }> {
  try {
    const res = await fetch('/api/dispatch/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to communicate with test endpoint' };
  }
}

/**
 * Fetches recent dispatch logs and webhook delivery callback receipts
 */
export async function fetchServerDispatchLogs(): Promise<{
  dispatchLogs: DispatchLogRecord[];
  webhookEvents: any[];
}> {
  try {
    const res = await fetch('/api/dispatch/logs');
    if (!res.ok) return { dispatchLogs: [], webhookEvents: [] };
    const data = await res.json();
    return {
      dispatchLogs: data.dispatchLogs || [],
      webhookEvents: data.webhookEvents || []
    };
  } catch (e) {
    return { dispatchLogs: [], webhookEvents: [] };
  }
}
