import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  FileText, 
  Download, 
  Smartphone, 
  QrCode, 
  Settings2, 
  Sparkles,
  RefreshCw,
  Phone,
  Layers,
  Building2,
  DollarSign,
  Zap,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Invoice, BusinessProfile } from '../../types';
import { 
  DispatchSettings, 
  DispatchTemplate,
  WhatsAppProviderType,
  normalizeDispatchSettings,
  interpolateDispatchMessage,
  buildWhatsAppShareUrl,
  buildMailtoUrl,
  sanitizeWhatsAppPhone,
  sendDirectWhatsAppInvoice,
  downloadServerGeneratedPdf,
  DispatchLogRecord
} from '../../utils/dispatchUtils';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { buildUpiPaymentUri } from '../../utils/upi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface ShareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  business: BusinessProfile;
  onUpdateDispatchSettings?: (newSettings: DispatchSettings) => void;
  invoiceRenderRef?: React.RefObject<HTMLDivElement>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const ShareInvoiceModal: React.FC<ShareInvoiceModalProps> = ({
  isOpen,
  onClose,
  invoice,
  business,
  onUpdateDispatchSettings,
  invoiceRenderRef,
  showToast
}) => {
  const dispatchSettings: DispatchSettings = normalizeDispatchSettings(business?.dispatchSettings);

  const [activeChannel, setActiveChannel] = useState<'DIRECT_WHATSAPP' | 'MANUAL_WHATSAPP' | 'EMAIL'>('DIRECT_WHATSAPP');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    dispatchSettings.defaultTemplateId || dispatchSettings.templates[0]?.id || 'TPL_INVOICE_STANDARD'
  );

  const [customPhone, setCustomPhone] = useState<string>(invoice?.customerPhone || '');
  const [customEmail, setCustomEmail] = useState<string>(invoice?.customerEmail || '');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');

  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingDirectWhatsApp, setIsSendingDirectWhatsApp] = useState(false);
  const [directDispatchResult, setDirectDispatchResult] = useState<DispatchLogRecord | null>(null);
  const [showPayloadDetails, setShowPayloadDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'CONFIG' | 'LOGS'>('DISPATCH');

  // Local settings editor for modal
  const [localSettings, setLocalSettings] = useState<DispatchSettings>(dispatchSettings);

  const currentTemplate = localSettings.templates.find(t => t.id === selectedTemplateId) || localSettings.templates[0];

  // Re-generate interpolated text whenever template or settings change
  useEffect(() => {
    if (!invoice || !currentTemplate) return;
    const bodyText = interpolateDispatchMessage(currentTemplate.body, invoice, business, localSettings);
    const subjectText = interpolateDispatchMessage(currentTemplate.subject, invoice, business, localSettings);
    setCustomMessage(bodyText);
    setCustomSubject(subjectText);
  }, [invoice, selectedTemplateId, localSettings, business]);

  useEffect(() => {
    if (invoice) {
      setCustomPhone(invoice.customerPhone || '');
      setCustomEmail(invoice.customerEmail || '');
      setDirectDispatchResult(null);
    }
  }, [invoice]);

  const upiIntentUri = invoice ? buildUpiPaymentUri({
    upiId: business?.upiId || '',
    payeeName: business?.tradeName || business?.name || '',
    amount: (invoice.amountDue ?? 0) > 0 ? invoice.amountDue : invoice.grandTotal,
    invoiceNumber: invoice.invoiceNumber,
    note: `Invoice ${invoice.invoiceNumber}`
  }) : '';

  if (!isOpen || !invoice) return null;

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopiedText(true);
      showToast('success', 'Message Copied', 'Formatted invoice dispatch message copied to clipboard.');
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy message to clipboard.');
    }
  };

  const handleCopyPaymentLink = async () => {
    try {
      const linkToCopy = upiIntentUri || `UPI ID: ${business.upiId}`;
      await navigator.clipboard.writeText(linkToCopy);
      setCopiedLink(true);
      showToast('success', 'Payment Link Copied', 'Direct UPI payment intent link copied.');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      showToast('error', 'Copy Failed', 'Could not copy payment link.');
    }
  };

  const handleSendManualWhatsApp = () => {
    const waUrl = buildWhatsAppShareUrl(customPhone, customMessage, localSettings.whatsappCountryCode);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showToast('info', 'Opening WhatsApp', `Dispatching invoice ${invoice.invoiceNumber} to ${customPhone || 'customer'}...`);
  };

  const handleSendEmail = () => {
    const mailUrl = buildMailtoUrl(customEmail, customSubject, customMessage);
    window.location.href = mailUrl;
    showToast('info', 'Opening Mail App', `Composing tax invoice email to ${customEmail || 'customer'}...`);
  };

  // 🚀 DIRECT SERVER-SIDE PDF ATTACHMENT DISPATCH VIA WHATSAPP WEBHOOK / CLOUD API
  const handleDirectServerWhatsAppDispatch = async () => {
    if (!customPhone) {
      showToast('warning', 'Missing Phone', 'Please provide a valid recipient WhatsApp phone number.');
      return;
    }

    setIsSendingDirectWhatsApp(true);
    showToast('info', 'Generating Vector PDF', 'Rendering crisp server-side GST PDF & connecting to WhatsApp Webhook API...');

    try {
      const result = await sendDirectWhatsAppInvoice({
        recipientPhone: customPhone,
        customerName: invoice.customerName,
        invoice,
        business,
        messageText: customMessage,
        provider: localSettings.whatsappProvider,
        metaConfig: localSettings.metaConfig,
        webhookConfig: localSettings.webhookConfig,
        twilioConfig: localSettings.twilioConfig
      });

      if (result.success && result.log) {
        setDirectDispatchResult(result.log);
        showToast(
          'success',
          'PDF Dispatched via WhatsApp',
          `Direct PDF attachment sent to ${customPhone} (Msg ID: ${result.log.messageId.substring(0, 16)}...)`
        );
      } else {
        showToast('error', 'Dispatch Failed', result.error || 'Could not send PDF invoice via WhatsApp API.');
        if (result.log) {
          setDirectDispatchResult(result.log);
        }
      }
    } catch (err: any) {
      showToast('error', 'API Dispatch Error', err.message || 'Network error executing WhatsApp webhook');
    } finally {
      setIsSendingDirectWhatsApp(false);
    }
  };

  // Instant vector PDF download from server (no canvas needed)
  const handleDownloadServerPdf = async () => {
    setIsGeneratingPdf(true);
    showToast('info', 'Server PDF Rendering', 'Fetching high-precision vector GST Invoice PDF from server...');

    try {
      await downloadServerGeneratedPdf(invoice, business);
      showToast('success', 'PDF Downloaded', `Invoice_${invoice.invoiceNumber}.pdf downloaded successfully.`);
    } catch (err) {
      console.warn('Server PDF fallback to client:', err);
      // Fallback to client-side jsPDF
      try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text(`TAX INVOICE - ${invoice.invoiceNumber}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Customer: ${invoice.customerName}`, 14, 28);
        doc.text(`Date: ${formatDate(invoice.invoiceDate)}`, 14, 34);
        doc.text(`Amount: ${formatCurrency(invoice.grandTotal, business.currencySymbol)}`, 14, 40);
        doc.text(`Due: ${formatCurrency(invoice.amountDue, business.currencySymbol)}`, 14, 46);
        doc.save(`Tax-Invoice-${invoice.invoiceNumber.replace(/\//g, '_')}.pdf`);
        showToast('success', 'PDF Ready', 'Invoice PDF generated.');
      } catch (e) {
        showToast('error', 'PDF Error', 'Failed to generate PDF.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveSettings = () => {
    if (onUpdateDispatchSettings) {
      onUpdateDispatchSettings(localSettings);
      showToast('success', 'Settings Saved', 'WhatsApp webhook credentials and dispatch templates updated.');
    }
    setActiveTab('DISPATCH');
  };

  const getProviderBadge = (provider?: WhatsAppProviderType) => {
    switch (provider) {
      case 'META_CLOUD_API':
        return { label: 'Meta WhatsApp Cloud API', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'CUSTOM_WEBHOOK':
        return { label: 'Custom WhatsApp Webhook Gateway', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'TWILIO':
        return { label: 'Twilio WhatsApp API', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      default:
        return { label: 'Live Server Sandbox Gateway', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
  };

  const providerBadge = getProviderBadge(localSettings.whatsappProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  WhatsApp Direct PDF Dispatch
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-mono">
                  {invoice.invoiceNumber}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${providerBadge.color}`}>
                  {providerBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-side vector PDF generation & automated WhatsApp Webhook delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('DISPATCH')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'DISPATCH'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Dispatch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CONFIG')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === 'CONFIG'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>API Settings</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'DISPATCH' ? (
            <>
              {/* Channel Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Direct Server WhatsApp with PDF Attachment */}
                <button
                  type="button"
                  onClick={() => setActiveChannel('DIRECT_WHATSAPP')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
                    activeChannel === 'DIRECT_WHATSAPP'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChannel === 'DIRECT_WHATSAPP' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Direct PDF Webhook</span>
                      {activeChannel === 'DIRECT_WHATSAPP' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                    </div>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Direct PDF Attachment
                    </p>
                  </div>
                </button>

                {/* 2. Manual WhatsApp Web Share */}
                <button
                  type="button"
                  onClick={() => setActiveChannel('MANUAL_WHATSAPP')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    activeChannel === 'MANUAL_WHATSAPP'
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 shadow-xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChannel === 'MANUAL_WHATSAPP' ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>WhatsApp Web Link</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Opens chat in wa.me
                    </p>
                  </div>
                </button>

                {/* 3. Email Delivery */}
                <button
                  type="button"
                  onClick={() => setActiveChannel('EMAIL')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    activeChannel === 'EMAIL'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeChannel === 'EMAIL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Email Delivery</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {customEmail || 'No email set'}
                    </p>
                  </div>
                </button>
              </div>

              {/* PDF Vector Attachment Highlight Box (for Direct WhatsApp Mode) */}
              {activeChannel === 'DIRECT_WHATSAPP' && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Server-Side Vector GST Invoice PDF
                        </span>
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                          Auto-Attached
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Generated directly on server backend with GST tables, UPI QR Code & bank details without client canvas lag.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadServerPdf}
                    disabled={isGeneratingPdf}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isGeneratingPdf ? 'Rendering...' : 'Download Sample PDF'}</span>
                  </button>
                </div>
              )}

              {/* Recipient & Template Selector Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                {activeChannel !== 'EMAIL' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Recipient WhatsApp Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="e.g. 9876543210 or +919876543210"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Recipient Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Message Template Preset
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {localSettings.templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeChannel === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              {/* Message Preview & Customization Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Message Caption & Body</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      • Attached along with the PDF document
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTemplate) {
                        setCustomMessage(interpolateDispatchMessage(currentTemplate.body, invoice, business, localSettings));
                        setCustomSubject(interpolateDispatchMessage(currentTemplate.subject, invoice, business, localSettings));
                        showToast('info', 'Template Reset', 'Message refreshed from template definition.');
                      }
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset to Template</span>
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-none shadow-inner"
                />
              </div>

              {/* Direct Dispatch Real-Time Delivery Result Card */}
              {directDispatchResult && (
                <div className={`p-4 rounded-2xl border transition-all ${
                  directDispatchResult.status === 'DELIVERED' || directDispatchResult.status === 'SENT'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      {directDispatchResult.status === 'DELIVERED' || directDispatchResult.status === 'SENT' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold">
                          {directDispatchResult.status === 'DELIVERED'
                            ? '✅ PDF Successfully Dispatched via WhatsApp Webhook'
                            : '⚠️ Dispatch Acknowledged / Sent'}
                        </div>
                        <div className="text-[11px] opacity-80 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Recipient: +{directDispatchResult.recipientPhone}</span>
                          <span>•</span>
                          <span>PDF Size: {directDispatchResult.pdfSizeKb}</span>
                          <span>•</span>
                          <span>Time: {directDispatchResult.durationMs}ms</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPayloadDetails(!showPayloadDetails)}
                      className="text-[11px] font-semibold underline flex items-center gap-1 cursor-pointer opacity-90 hover:opacity-100"
                    >
                      <span>{showPayloadDetails ? 'Hide Details' : 'View Payload'}</span>
                      {showPayloadDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {showPayloadDetails && (
                    <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 text-[10px] font-mono bg-white/70 dark:bg-slate-900/80 p-3 rounded-xl overflow-x-auto space-y-1">
                      <div><strong>Message ID:</strong> {directDispatchResult.messageId}</div>
                      <div><strong>Provider:</strong> {directDispatchResult.provider}</div>
                      <div><strong>Timestamp:</strong> {directDispatchResult.timestamp}</div>
                      {directDispatchResult.responsePayload && (
                        <div>
                          <strong>Webhook Response:</strong>
                          <pre className="mt-1 p-2 bg-slate-100 dark:bg-slate-950 rounded text-[9.5px]">
                            {JSON.stringify(directDispatchResult.responsePayload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Link Quick-Bar */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      Payment Link & UPI Intent
                    </div>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300 truncate max-w-xs sm:max-w-md">
                      {upiIntentUri || `VPA: ${business.upiId || 'Not configured in Banking Settings'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyPaymentLink}
                    className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy UPI Link'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* CONFIG TAB: WhatsApp Webhook Credentials & Templates */
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* WhatsApp Provider Selector */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Webhook & API Provider</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                    localSettings.whatsappProvider === 'DEMO_SANDBOX'
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Sandbox Gateway</span>
                      <input
                        type="radio"
                        name="waProvider"
                        value="DEMO_SANDBOX"
                        checked={localSettings.whatsappProvider === 'DEMO_SANDBOX'}
                        onChange={() => setLocalSettings(prev => ({ ...prev, whatsappProvider: 'DEMO_SANDBOX' }))}
                        className="text-emerald-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Zero-setup server testing with real PDF generation & delivery logging
                    </p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                    localSettings.whatsappProvider === 'CUSTOM_WEBHOOK'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Custom Webhook</span>
                      <input
                        type="radio"
                        name="waProvider"
                        value="CUSTOM_WEBHOOK"
                        checked={localSettings.whatsappProvider === 'CUSTOM_WEBHOOK'}
                        onChange={() => setLocalSettings(prev => ({ ...prev, whatsappProvider: 'CUSTOM_WEBHOOK' }))}
                        className="text-emerald-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      WATI, Interakt, UltraMsg, Zapier, n8n, or your custom WhatsApp bot
                    </p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                    localSettings.whatsappProvider === 'META_CLOUD_API'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Meta Cloud API</span>
                      <input
                        type="radio"
                        name="waProvider"
                        value="META_CLOUD_API"
                        checked={localSettings.whatsappProvider === 'META_CLOUD_API'}
                        onChange={() => setLocalSettings(prev => ({ ...prev, whatsappProvider: 'META_CLOUD_API' }))}
                        className="text-emerald-600"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Official Meta WhatsApp Business Graph API
                    </p>
                  </label>
                </div>
              </div>

              {/* Provider Config Fields */}
              {localSettings.whatsappProvider === 'CUSTOM_WEBHOOK' && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Custom Webhook Gateway Configuration
                  </h5>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      WhatsApp Webhook URL (POST Endpoint)
                    </label>
                    <input
                      type="url"
                      placeholder="https://api.your-whatsapp-gateway.com/v1/send-document"
                      value={localSettings.webhookConfig?.webhookUrl || ''}
                      onChange={(e) => setLocalSettings(prev => ({
                        ...prev,
                        webhookConfig: { ...prev.webhookConfig, webhookUrl: e.target.value }
                      }))}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Authorization Bearer Token / API Key
                      </label>
                      <input
                        type="password"
                        placeholder="Bearer secret_token_xyz"
                        value={localSettings.webhookConfig?.authHeader || ''}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          webhookConfig: { ...prev.webhookConfig, authHeader: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        PDF Delivery Format in Payload
                      </label>
                      <select
                        value={localSettings.webhookConfig?.sendPdfAs || 'BOTH'}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          webhookConfig: { ...prev.webhookConfig, sendPdfAs: e.target.value as any }
                        }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        <option value="BOTH">Both Public PDF URL & Base64 Payload</option>
                        <option value="URL">Direct PDF Download URL Only</option>
                        <option value="BASE64">Base64 Encoded PDF Payload Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {localSettings.whatsappProvider === 'META_CLOUD_API' && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    Meta WhatsApp Cloud API Credentials
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10982348572394"
                        value={localSettings.metaConfig?.phoneNumberId || ''}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          metaConfig: { ...prev.metaConfig, phoneNumberId: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Permanent System User Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="EAA..."
                        value={localSettings.metaConfig?.accessToken || ''}
                        onChange={(e) => setLocalSettings(prev => ({
                          ...prev,
                          metaConfig: { ...prev.metaConfig, accessToken: e.target.value }
                        }))}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Template list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Configured Message Templates
                </h4>

                <div className="space-y-2.5">
                  {localSettings.templates.map((tpl, index) => (
                    <div 
                      key={tpl.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{tpl.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {tpl.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={tpl.body}
                        onChange={(e) => {
                          const updated = [...localSettings.templates];
                          updated[index] = { ...updated[index], body: e.target.value };
                          setLocalSettings(prev => ({ ...prev, templates: updated }));
                        }}
                        className="w-full p-2.5 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-between gap-3">
          {activeTab === 'DISPATCH' ? (
            <>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedText ? 'Copied' : 'Copy Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {activeChannel === 'DIRECT_WHATSAPP' ? (
                  <button
                    type="button"
                    onClick={handleDirectServerWhatsAppDispatch}
                    disabled={isSendingDirectWhatsApp}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-60"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{isSendingDirectWhatsApp ? 'Generating & Dispatching PDF...' : '🚀 Dispatch PDF to WhatsApp'}</span>
                  </button>
                ) : activeChannel === 'MANUAL_WHATSAPP' ? (
                  <button
                    type="button"
                    onClick={handleSendManualWhatsApp}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:scale-95 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-teal-600/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Open in WhatsApp</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Compose Email</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setActiveTab('DISPATCH')}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Back to Dispatch
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Check className="w-4 h-4" />
                <span>Save API Settings</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
