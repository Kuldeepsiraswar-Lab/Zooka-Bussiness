import { ServerInvoiceData, ServerBusinessProfile, generateInvoicePdfBuffer } from './pdfGenerator';

export interface WhatsAppDispatchOptions {
  recipientPhone: string;
  customerName?: string;
  invoice: ServerInvoiceData;
  business?: ServerBusinessProfile;
  messageText: string;
  provider?: 'META_CLOUD_API' | 'CUSTOM_WEBHOOK' | 'TWILIO' | 'DEMO_SANDBOX';
  
  // Meta Cloud API Credentials
  metaConfig?: {
    phoneNumberId?: string;
    accessToken?: string;
    templateName?: string;
    languageCode?: string;
  };

  // Custom Webhook Gateway Credentials
  webhookConfig?: {
    webhookUrl?: string;
    authHeader?: string;
    customHeaders?: Record<string, string>;
    httpMethod?: 'POST' | 'PUT';
    sendPdfAs?: 'URL' | 'BASE64' | 'BOTH';
  };

  // Twilio Credentials
  twilioConfig?: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
  };

  publicBaseUrl?: string;
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

export interface WebhookEventRecord {
  id: string;
  timestamp: string;
  event: string;
  messageId?: string;
  recipient?: string;
  status: string;
  rawPayload: any;
}

// In-memory ring buffer for recent dispatch logs and webhook events
const MAX_LOGS = 100;
export const dispatchLogsRingBuffer: DispatchLogRecord[] = [];
export const webhookEventsRingBuffer: WebhookEventRecord[] = [];

// Cache of generated invoice PDFs in memory for direct download / WhatsApp media streaming
const invoicePdfCache = new Map<string, { buffer: Buffer; filename: string; timestamp: number }>();

export function cacheInvoicePdf(invoiceId: string, buffer: Buffer, filename: string) {
  invoicePdfCache.set(invoiceId, {
    buffer,
    filename,
    timestamp: Date.now()
  });

  // Prune cache if over 200 items
  if (invoicePdfCache.size > 200) {
    const oldestKey = invoicePdfCache.keys().next().value;
    if (oldestKey) invoicePdfCache.delete(oldestKey);
  }
}

export function getCachedInvoicePdf(invoiceId: string): { buffer: Buffer; filename: string } | null {
  return invoicePdfCache.get(invoiceId) || null;
}

/**
 * Normalizes and formats recipient phone numbers for WhatsApp
 */
export function formatPhoneForWhatsApp(phone: string, defaultCountryCode = '91'): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // If local 10 digit Indian number without country code
  if (cleaned.length === 10) {
    const code = defaultCountryCode.replace(/[^0-9]/g, '') || '91';
    cleaned = code + cleaned;
  }
  return cleaned;
}

/**
 * Dispatches PDF Invoice directly to customer via server-side WhatsApp Webhook or Meta Cloud API
 */
export async function dispatchInvoicePdfViaWhatsApp(
  options: WhatsAppDispatchOptions
): Promise<DispatchLogRecord> {
  const startTime = Date.now();
  const {
    recipientPhone,
    customerName = 'Valued Customer',
    invoice,
    business,
    messageText,
    provider = 'DEMO_SANDBOX',
    metaConfig,
    webhookConfig,
    publicBaseUrl = ''
  } = options;

  const normalizedPhone = formatPhoneForWhatsApp(recipientPhone);
  const invoiceNum = invoice.invoiceNumber || 'INV-000';
  const filename = `Invoice_${invoiceNum.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

  // Step 1: Generate pristine Vector PDF on server
  const pdfBuffer = await generateInvoicePdfBuffer(invoice, business);
  const pdfSizeBytes = pdfBuffer.length;
  const pdfSizeKb = (pdfSizeBytes / 1024).toFixed(1) + ' KB';

  // Cache for public / webhook retrieval
  const invoiceId = invoice.id || invoiceNum;
  cacheInvoicePdf(invoiceId, pdfBuffer, filename);

  const directPdfUrl = `${publicBaseUrl.replace(/\/$/, '')}/api/dispatch/invoice/${encodeURIComponent(invoiceId)}/pdf`;
  const base64Pdf = pdfBuffer.toString('base64');

  let resultStatus: 'DELIVERED' | 'SENT' | 'FAILED' = 'SENT';
  let messageId = `wamid.VF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let responseData: any = null;
  let errorMessage: string | undefined = undefined;

  try {
    // 1. Meta WhatsApp Cloud API
    if (provider === 'META_CLOUD_API') {
      const phoneNumberId = metaConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = metaConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken) {
        throw new Error('Meta WhatsApp Cloud API requires Phone Number ID and Access Token. Please configure in Dispatch Settings.');
      }

      const graphApiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'document',
        document: {
          link: directPdfUrl,
          caption: messageText,
          filename: filename
        }
      };

      const response = await fetch(graphApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData?.error?.message || `WhatsApp API error (${response.status})`);
      }

      if (responseData.messages && responseData.messages[0]?.id) {
        messageId = responseData.messages[0].id;
        resultStatus = 'DELIVERED';
      }
    }
    
    // 2. Custom Webhook Gateway (WATI, Interakt, UltraMsg, Zapier, n8n, Custom Bot)
    else if (provider === 'CUSTOM_WEBHOOK') {
      const webhookUrl = webhookConfig?.webhookUrl || process.env.WHATSAPP_CUSTOM_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('Custom Webhook URL is missing. Please configure your WhatsApp gateway URL.');
      }

      const sendAs = webhookConfig?.sendPdfAs || 'BOTH';
      const webhookPayload: any = {
        event: 'whatsapp.invoice.dispatch',
        recipientPhone: normalizedPhone,
        customerName: customerName,
        invoiceNumber: invoiceNum,
        grandTotal: invoice.grandTotal,
        currency: invoice.currencySymbol || business?.currencySymbol || 'INR',
        message: messageText,
        pdfFilename: filename,
        pdfSizeBytes: pdfSizeBytes,
        timestamp: new Date().toISOString(),
        invoiceMetadata: {
          id: invoiceId,
          date: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          itemsCount: invoice.items?.length || 0
        }
      };

      if (sendAs === 'URL' || sendAs === 'BOTH') {
        webhookPayload.pdfUrl = directPdfUrl;
      }
      if (sendAs === 'BASE64' || sendAs === 'BOTH') {
        webhookPayload.pdfBase64 = base64Pdf;
        webhookPayload.mimeType = 'application/pdf';
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'VyaparFlow-WhatsApp-Webhook/1.0',
        ...(webhookConfig?.customHeaders || {})
      };

      if (webhookConfig?.authHeader) {
        headers['Authorization'] = webhookConfig.authHeader.startsWith('Bearer ')
          ? webhookConfig.authHeader
          : `Bearer ${webhookConfig.authHeader}`;
      }

      const response = await fetch(webhookUrl, {
        method: webhookConfig?.httpMethod || 'POST',
        headers,
        body: JSON.stringify(webhookPayload)
      });

      const textRes = await response.text();
      try {
        responseData = JSON.parse(textRes);
      } catch (e) {
        responseData = { responseText: textRes.substring(0, 500) };
      }

      if (!response.ok) {
        throw new Error(`Webhook gateway returned status ${response.status}: ${textRes.substring(0, 200)}`);
      }

      resultStatus = 'DELIVERED';
      if (responseData?.id || responseData?.messageId) {
        messageId = responseData.id || responseData.messageId;
      }
    }

    // 3. Demo / Sandbox Simulation Mode
    else {
      // Simulates realistic instant server generation & WhatsApp Cloud API delivery acknowledgment
      resultStatus = 'DELIVERED';
      responseData = {
        mode: 'SANDBOX_SIMULATION',
        success: true,
        whatsappProvider: 'Meta Cloud API (Simulated)',
        destinationNumber: `+${normalizedPhone}`,
        attachment: {
          filename,
          sizeKb: pdfSizeKb,
          format: 'application/pdf',
          vectorRendered: true,
          directDownloadUrl: directPdfUrl
        },
        messageCaption: messageText.substring(0, 100) + '...',
        status: 'delivered',
        acknowledgedAt: new Date().toISOString()
      };
    }
  } catch (err: any) {
    resultStatus = 'FAILED';
    errorMessage = err.message || 'Failed to dispatch invoice via WhatsApp API';
    responseData = { error: errorMessage };
  }

  const durationMs = Date.now() - startTime;

  const logRecord: DispatchLogRecord = {
    id: `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    invoiceNumber: invoiceNum,
    recipientPhone: normalizedPhone,
    customerName,
    provider,
    status: resultStatus,
    messageId,
    pdfSizeBytes,
    pdfSizeKb,
    durationMs,
    responsePayload: responseData,
    error: errorMessage,
    source: 'DIRECT_DISPATCH'
  };

  // Add to in-memory ring buffer
  dispatchLogsRingBuffer.unshift(logRecord);
  if (dispatchLogsRingBuffer.length > MAX_LOGS) {
    dispatchLogsRingBuffer.pop();
  }

  return logRecord;
}

/**
 * Handles incoming WhatsApp webhook events (delivery receipts, status updates)
 */
export function handleIncomingWebhook(payload: any): WebhookEventRecord[] {
  const records: WebhookEventRecord[] = [];
  const now = new Date().toISOString();

  try {
    // Meta WhatsApp Cloud API format
    if (payload?.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          const value = change.value;
          for (const status of value?.statuses || []) {
            const rec: WebhookEventRecord = {
              id: `WH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              timestamp: now,
              event: `whatsapp.status.${status.status}`,
              messageId: status.id,
              recipient: status.recipient_id,
              status: status.status,
              rawPayload: status
            };
            records.push(rec);
            webhookEventsRingBuffer.unshift(rec);
          }
        }
      }
    } else {
      // Generic gateway format
      const rec: WebhookEventRecord = {
        id: `WH_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        event: payload?.event || 'generic.webhook',
        messageId: payload?.messageId || payload?.id,
        recipient: payload?.phone || payload?.recipient,
        status: payload?.status || 'received',
        rawPayload: payload
      };
      records.push(rec);
      webhookEventsRingBuffer.unshift(rec);
    }
  } catch (e) {
    // ignore parse error
  }

  if (webhookEventsRingBuffer.length > MAX_LOGS) {
    webhookEventsRingBuffer.length = MAX_LOGS;
  }

  return records;
}
