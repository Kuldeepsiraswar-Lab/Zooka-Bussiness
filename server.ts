import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  generateInvoicePdfBuffer, 
  ServerInvoiceData, 
  ServerBusinessProfile 
} from './server/pdfGenerator';
import { 
  dispatchInvoicePdfViaWhatsApp, 
  handleIncomingWebhook, 
  getCachedInvoicePdf, 
  dispatchLogsRingBuffer, 
  webhookEventsRingBuffer 
} from './server/whatsappService';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON with extended body limit for invoice data & base64
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request logger for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // 1. Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VyaparFlow Server & WhatsApp Dispatch Engine',
      time: new Date().toISOString()
    });
  });

  // 2. Generate Server-Side Vector PDF Invoice
  app.post('/api/dispatch/generate-invoice-pdf', async (req, res) => {
    try {
      const { invoice, business, format } = req.body as {
        invoice: ServerInvoiceData;
        business?: ServerBusinessProfile;
        format?: 'buffer' | 'base64' | 'json';
      };

      if (!invoice || !invoice.invoiceNumber) {
        res.status(400).json({ error: 'Valid invoice data with invoiceNumber is required.' });
        return;
      }

      const pdfBuffer = await generateInvoicePdfBuffer(invoice, business);
      const filename = `Invoice_${(invoice.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;

      if (format === 'base64' || format === 'json') {
        res.json({
          success: true,
          filename,
          sizeBytes: pdfBuffer.length,
          sizeKb: (pdfBuffer.length / 1024).toFixed(1) + ' KB',
          base64: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf'
        });
        return;
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error generating server PDF:', error);
      res.status(500).json({ error: error.message || 'Failed to generate invoice PDF' });
    }
  });

  // 3. Direct Streaming / Public Access for Cached Invoice PDF (Used by WhatsApp Media Download)
  app.get('/api/dispatch/invoice/:invoiceId/pdf', async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const cached = getCachedInvoicePdf(invoiceId);

      if (cached) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${cached.filename}"`);
        res.setHeader('Content-Length', cached.buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(cached.buffer);
        return;
      }

      // If not cached, generate a standard fallback response
      res.status(404).json({
        error: `Invoice PDF for ID ${invoiceId} not found in recent cache. Please trigger direct dispatch to regenerate.`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to retrieve invoice PDF' });
    }
  });

  // 4. Direct Server-Side WhatsApp Dispatch Endpoint
  app.post('/api/dispatch/whatsapp-direct', async (req, res) => {
    try {
      const {
        recipientPhone,
        customerName,
        invoice,
        business,
        messageText,
        provider,
        metaConfig,
        webhookConfig,
        twilioConfig
      } = req.body;

      if (!recipientPhone) {
        res.status(400).json({ error: 'Recipient phone number is required.' });
        return;
      }

      if (!invoice || !invoice.invoiceNumber) {
        res.status(400).json({ error: 'Invoice data is required for dispatch.' });
        return;
      }

      // Determine public base URL for self-referential media download links
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const publicBaseUrl = process.env.APP_URL || `${protocol}://${host}`;

      const logRecord = await dispatchInvoicePdfViaWhatsApp({
        recipientPhone,
        customerName,
        invoice,
        business,
        messageText: messageText || `Your invoice ${invoice.invoiceNumber} is attached.`,
        provider,
        metaConfig,
        webhookConfig,
        twilioConfig,
        publicBaseUrl
      });

      res.json({
        success: logRecord.status !== 'FAILED',
        log: logRecord
      });
    } catch (error: any) {
      console.error('Error in WhatsApp direct dispatch:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error during WhatsApp dispatch'
      });
    }
  });

  // 5. Incoming WhatsApp Webhook Handlers (Meta & Custom Gateways)
  // GET: Webhook verification challenge (Meta Cloud API)
  app.get('/api/dispatch/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'vyaparflow_webhook_secret';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Webhook] Meta Webhook verified successfully!');
      res.status(200).send(challenge);
    } else {
      res.status(403).json({ error: 'Webhook verification token mismatch' });
    }
  });

  // POST: Webhook notification events (Status receipts: sent, delivered, read, failed)
  app.post('/api/dispatch/webhook', (req, res) => {
    try {
      const records = handleIncomingWebhook(req.body);
      console.log(`[Webhook] Processed ${records.length} delivery status events.`);
      res.status(200).json({ status: 'success', received: records.length });
    } catch (error: any) {
      console.error('[Webhook] Error handling incoming webhook payload:', error);
      res.status(500).json({ error: error.message || 'Webhook processing failed' });
    }
  });

  // 6. Fetch Recent Dispatch & Webhook Delivery Logs
  app.get('/api/dispatch/logs', (req, res) => {
    res.json({
      success: true,
      dispatchLogs: dispatchLogsRingBuffer,
      webhookEvents: webhookEventsRingBuffer,
      serverTime: new Date().toISOString()
    });
  });

  // 7. Test Connection & Diagnostic Ping
  app.post('/api/dispatch/test-connection', async (req, res) => {
    try {
      const { provider, webhookUrl, authHeader, metaConfig } = req.body;

      if (provider === 'CUSTOM_WEBHOOK') {
        if (!webhookUrl) {
          res.status(400).json({ success: false, message: 'Webhook URL is required for testing.' });
          return;
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'VyaparFlow-Ping/1.0'
        };
        if (authHeader) {
          headers['Authorization'] = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
        }

        const pingResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: 'ping.diagnostic',
            test: true,
            timestamp: new Date().toISOString(),
            message: 'VyaparFlow WhatsApp Webhook Connectivity Test'
          })
        });

        res.json({
          success: pingResponse.ok,
          status: pingResponse.status,
          statusText: pingResponse.statusText,
          message: pingResponse.ok ? 'Webhook endpoint responded successfully!' : `Endpoint returned error code ${pingResponse.status}`
        });
        return;
      }

      if (provider === 'META_CLOUD_API') {
        const phoneId = metaConfig?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        const token = metaConfig?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

        if (!phoneId || !token) {
          res.status(400).json({
            success: false,
            message: 'Phone Number ID and Access Token are required for Meta Cloud API.'
          });
          return;
        }

        const testRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const metaData = await testRes.json();

        res.json({
          success: testRes.ok,
          metaDetails: metaData,
          message: testRes.ok ? 'Meta WhatsApp Cloud API credentials verified!' : (metaData.error?.message || 'Verification failed')
        });
        return;
      }

      // Default sandbox
      res.json({
        success: true,
        message: 'Sandbox / Demo Simulation Gateway is active and ready.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
    }
  });

  // =========================================================================
  // VITE & STATIC SPA SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VyaparFlow Server with WhatsApp Dispatch Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
