import React, { useState, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  Mail, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Phone, 
  Globe, 
  ShieldCheck, 
  RotateCcw,
  Sliders,
  Layers,
  Zap,
  Key,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Code,
  FileText
} from 'lucide-react';
import { BusinessProfile } from '../../types';
import { 
  DispatchSettings, 
  DispatchTemplate, 
  WhatsAppProviderType,
  DEFAULT_DISPATCH_SETTINGS, 
  DEFAULT_DISPATCH_TEMPLATES, 
  normalizeDispatchSettings,
  testWhatsAppApiConnection,
  fetchServerDispatchLogs,
  DispatchLogRecord
} from '../../utils/dispatchUtils';

interface DispatchSettingsTabProps {
  formData: BusinessProfile;
  setFormData: React.Dispatch<React.SetStateAction<BusinessProfile>>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const DispatchSettingsTab: React.FC<DispatchSettingsTabProps> = ({
  formData,
  setFormData,
  showToast
}) => {
  const currentSettings: DispatchSettings = normalizeDispatchSettings(formData.dispatchSettings);

  const [activeTemplateId, setActiveTemplateId] = useState<string>(
    currentSettings.defaultTemplateId || currentSettings.templates[0]?.id || 'TPL_INVOICE_STANDARD'
  );

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await fetchServerDispatchLogs();
      setDispatchLogs(data.dispatchLogs || []);
    } catch (e) {
      // ignore
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const updateDispatchSettings = (updater: (prev: DispatchSettings) => DispatchSettings) => {
    setFormData(prev => {
      const existing = normalizeDispatchSettings(prev.dispatchSettings);
      const updated = updater(existing);
      return {
        ...prev,
        dispatchSettings: updated
      };
    });
  };

  const handleToggleOption = (key: keyof DispatchSettings, value: any) => {
    updateDispatchSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUpdateMetaConfig = (key: string, value: string) => {
    updateDispatchSettings(prev => ({
      ...prev,
      metaConfig: {
        ...(prev.metaConfig || {}),
        [key]: value
      }
    }));
  };

  const handleUpdateWebhookConfig = (key: string, value: any) => {
    updateDispatchSettings(prev => ({
      ...prev,
      webhookConfig: {
        ...(prev.webhookConfig || {}),
        [key]: value
      }
    }));
  };

  const handleUpdateTemplate = (id: string, field: keyof DispatchTemplate, value: any) => {
    updateDispatchSettings(prev => ({
      ...prev,
      templates: prev.templates.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const handleAddTemplate = () => {
    const newId = `TPL_CUSTOM_${Date.now()}`;
    const newTemplate: DispatchTemplate = {
      id: newId,
      name: 'Custom Template',
      category: 'INVOICE_SENT',
      subject: 'Tax Invoice {{invoice_number}} from {{business_name}}',
      body: `Hello {{customer_name}},\n\nYour invoice {{invoice_number}} for {{grand_total}} is ready.\n\n{{payment_details}}\n\nThank you,\n{{business_name}}`,
    };

    updateDispatchSettings(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
    setActiveTemplateId(newId);
    showToast('success', 'Template Created', 'New dispatch message template added.');
  };

  const handleDeleteTemplate = (id: string) => {
    if (currentSettings.templates.length <= 1) {
      showToast('error', 'Cannot Delete', 'At least one dispatch message template is required.');
      return;
    }

    updateDispatchSettings(prev => {
      const filtered = prev.templates.filter(t => t.id !== id);
      return {
        ...prev,
        templates: filtered,
        defaultTemplateId: prev.defaultTemplateId === id ? filtered[0].id : prev.defaultTemplateId
      };
    });

    const remaining = currentSettings.templates.filter(t => t.id !== id);
    if (remaining.length > 0) {
      setActiveTemplateId(remaining[0].id);
    }
    showToast('info', 'Template Removed', 'Dispatch message template deleted.');
  };

  const handleResetDefaults = () => {
    updateDispatchSettings(() => DEFAULT_DISPATCH_SETTINGS);
    setActiveTemplateId('TPL_INVOICE_STANDARD');
    showToast('info', 'Reset to Defaults', 'All dispatch templates and settings restored to factory defaults.');
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result = await testWhatsAppApiConnection({
        provider: currentSettings.whatsappProvider || 'DEMO_SANDBOX',
        webhookUrl: currentSettings.webhookConfig?.webhookUrl,
        authHeader: currentSettings.webhookConfig?.authHeader,
        metaConfig: currentSettings.metaConfig
      });

      setTestResult(result);
      if (result.success) {
        showToast('success', 'Connection Verified', result.message);
      } else {
        showToast('error', 'Connection Error', result.message);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed' });
      showToast('error', 'Test Failed', e.message || 'Could not connect to API endpoint');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const selectedTemplate = currentSettings.templates.find(t => t.id === activeTemplateId) || currentSettings.templates[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Direct WhatsApp Webhook & PDF Dispatch
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                Server-Side PDF
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Send vector-rendered GST tax invoice PDF attachments directly to customer WhatsApp via Meta Cloud API or Webhooks.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* 1. WhatsApp Provider & API Gateway Configuration */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp Webhook & API Provider Integration</span>
          </h4>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
            <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
            currentSettings.whatsappProvider === 'DEMO_SANDBOX'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Sandbox / Demo Gateway</span>
                <input
                  type="radio"
                  name="tabWaProvider"
                  value="DEMO_SANDBOX"
                  checked={currentSettings.whatsappProvider === 'DEMO_SANDBOX'}
                  onChange={() => handleToggleOption('whatsappProvider', 'DEMO_SANDBOX')}
                  className="text-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Instant test simulation. Renders full server PDF with realistic delivery receipts and status callbacks.
              </p>
            </div>
            <span className="mt-3 text-[10px] font-bold text-amber-700 dark:text-amber-400">
              No API Keys Required
            </span>
          </label>

          <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
            currentSettings.whatsappProvider === 'CUSTOM_WEBHOOK'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Custom Webhook Gateway</span>
                <input
                  type="radio"
                  name="tabWaProvider"
                  value="CUSTOM_WEBHOOK"
                  checked={currentSettings.whatsappProvider === 'CUSTOM_WEBHOOK'}
                  onChange={() => handleToggleOption('whatsappProvider', 'CUSTOM_WEBHOOK')}
                  className="text-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Connect WATI, Interakt, UltraMsg, Gupshup, Zapier, Make, n8n, or your own custom WhatsApp bot webhook.
              </p>
            </div>
            <span className="mt-3 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
              Supports URL & Base64 PDF
            </span>
          </label>

          <label className={`p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all ${
            currentSettings.whatsappProvider === 'META_CLOUD_API'
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Meta WhatsApp Cloud API</span>
                <input
                  type="radio"
                  name="tabWaProvider"
                  value="META_CLOUD_API"
                  checked={currentSettings.whatsappProvider === 'META_CLOUD_API'}
                  onChange={() => handleToggleOption('whatsappProvider', 'META_CLOUD_API')}
                  className="text-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Official Meta Business Graph API. Direct document message dispatch with permanent access token.
              </p>
            </div>
            <span className="mt-3 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              Official Meta Business API
            </span>
          </label>
        </div>

        {/* Test Result Message Banner */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            testResult.success 
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="font-semibold">{testResult.message}</span>
          </div>
        )}

        {/* Provider Specific Configuration Forms */}
        {currentSettings.whatsappProvider === 'CUSTOM_WEBHOOK' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              <span>Custom Webhook Endpoint Parameters</span>
            </h5>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Webhook POST URL
              </label>
              <input
                type="url"
                placeholder="https://api.your-whatsapp-gateway.com/v1/dispatch"
                value={currentSettings.webhookConfig?.webhookUrl || ''}
                onChange={(e) => handleUpdateWebhookConfig('webhookUrl', e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Authorization Header / API Key
                </label>
                <input
                  type="password"
                  placeholder="Bearer token_secret..."
                  value={currentSettings.webhookConfig?.authHeader || ''}
                  onChange={(e) => handleUpdateWebhookConfig('authHeader', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  PDF Payload Format
                </label>
                <select
                  value={currentSettings.webhookConfig?.sendPdfAs || 'BOTH'}
                  onChange={(e) => handleUpdateWebhookConfig('sendPdfAs', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="BOTH">Both Public PDF URL & Base64 Document</option>
                  <option value="URL">Direct PDF Download URL Only</option>
                  <option value="BASE64">Base64 Encoded PDF Payload Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentSettings.whatsappProvider === 'META_CLOUD_API' && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span>Meta WhatsApp Cloud API Credentials</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10982348572394"
                  value={currentSettings.metaConfig?.phoneNumberId || ''}
                  onChange={(e) => handleUpdateMetaConfig('phoneNumberId', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Permanent System User Access Token
                </label>
                <input
                  type="password"
                  placeholder="EAA..."
                  value={currentSettings.metaConfig?.accessToken || ''}
                  onChange={(e) => handleUpdateMetaConfig('accessToken', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Inbound Webhook Listener Info */}
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5" />
                <span>Inbound Delivery Webhook Listener URL:</span>
              </div>
              <code className="block p-1.5 bg-white dark:bg-slate-900 rounded font-mono text-[10px] text-slate-800 dark:text-slate-200 break-all">
                {window.location.origin}/api/dispatch/webhook
              </code>
              <div className="text-[10px] opacity-80">
                Verify Token: <code className="font-mono font-bold">vyaparflow_webhook_secret</code>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Global Channel & Inclusion Preferences */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Dispatch Preferences & Automatic Inclusions</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Share Channel
            </label>
            <select
              value={currentSettings.defaultChannel}
              onChange={(e) => handleToggleOption('defaultChannel', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="WHATSAPP">WhatsApp (Primary)</option>
              <option value="EMAIL">Email (Primary)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              WhatsApp Country Code
            </label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={currentSettings.whatsappCountryCode}
                onChange={(e) => handleToggleOption('whatsappCountryCode', e.target.value)}
                placeholder="+91"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Default Template Preset
            </label>
            <select
              value={currentSettings.defaultTemplateId}
              onChange={(e) => handleToggleOption('defaultTemplateId', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {currentSettings.templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Inclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includePaymentLink}
              onChange={(e) => handleToggleOption('includePaymentLink', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">UPI Payment Link</div>
              <div className="text-[10px] text-slate-400">Direct intent URL in message</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includeBankDetails}
              onChange={(e) => handleToggleOption('includeBankDetails', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Bank Details</div>
              <div className="text-[10px] text-slate-400">A/C No, IFSC, Branch</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includeItemSummary}
              onChange={(e) => handleToggleOption('includeItemSummary', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Billed Items</div>
              <div className="text-[10px] text-slate-400">Item names & quantities</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
            <input
              type="checkbox"
              checked={currentSettings.includePdfAttachmentNote}
              onChange={(e) => handleToggleOption('includePdfAttachmentNote', e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">PDF Note</div>
              <div className="text-[10px] text-slate-400">Reminds customer of PDF</div>
            </div>
          </label>
        </div>
      </div>

      {/* 3. Template Management & Customization */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Manage Message Templates ({currentSettings.templates.length})</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a template below to edit its text, subject, or variables
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddTemplate}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {currentSettings.templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setActiveTemplateId(tpl.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                tpl.id === activeTemplateId
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{tpl.name}</span>
              {tpl.id === currentSettings.defaultTemplateId && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                  tpl.id === activeTemplateId ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Default
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Selected Template Editor */}
        {selectedTemplate && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={selectedTemplate.name}
                  onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Category / Purpose
                </label>
                <select
                  value={selectedTemplate.category}
                  onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'category', e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                >
                  <option value="INVOICE_SENT">Invoice Delivery (General)</option>
                  <option value="PAYMENT_REMINDER">Gentle Payment Reminder</option>
                  <option value="PAYMENT_RECEIVED">Payment Settled / Thank You</option>
                  <option value="THANK_YOU">Customer Appreciation</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Subject Line
              </label>
              <input
                type="text"
                value={selectedTemplate.subject}
                onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'subject', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Message Body & Placeholders
                </label>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span>Use variables:</span>
                  <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">&#123;&#123;invoice_number&#125;&#125;</code>
                  <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">&#123;&#123;grand_total&#125;&#125;</code>
                  <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded">&#123;&#123;payment_details&#125;&#125;</code>
                </div>
              </div>
              <textarea
                rows={9}
                value={selectedTemplate.body}
                onChange={(e) => handleUpdateTemplate(selectedTemplate.id, 'body', e.target.value)}
                className="w-full p-3 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleToggleOption('defaultTemplateId', selectedTemplate.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentSettings.defaultTemplateId === selectedTemplate.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{currentSettings.defaultTemplateId === selectedTemplate.id ? 'Is Primary Default' : 'Set as Default'}</span>
              </button>

              {currentSettings.templates.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Template</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Live Server WhatsApp Dispatch & Webhook Delivery Logs */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Live WhatsApp Dispatch & Webhook Receipts ({dispatchLogs.length})
            </h4>
          </div>

          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoadingLogs}
            className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {dispatchLogs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No recent WhatsApp dispatches logged yet
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Open any invoice and click &quot;Dispatch PDF to WhatsApp&quot; to send server-rendered PDF attachments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Recipient</th>
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">PDF Size</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dispatchLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900 dark:text-white font-mono">
                      {log.invoiceNumber}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">
                      +{log.recipientPhone}
                    </td>
                    <td className="py-2.5 text-[11px] text-slate-500">
                      {log.provider}
                    </td>
                    <td className="py-2.5 text-[11px] font-mono text-slate-500">
                      {log.pdfSizeKb}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : log.status === 'SENT'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
