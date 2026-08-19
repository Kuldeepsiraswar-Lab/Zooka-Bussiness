import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  CreditCard, 
  FileText, 
  QrCode, 
  Database, 
  Save, 
  RotateCcw, 
  Upload, 
  Download, 
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Lock,
  Globe,
  Phone,
  Mail,
  MapPin,
  PenTool,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Check,
  FileSignature
} from 'lucide-react';
import { STATE_CODE_LIST } from '../../utils/constants';
import { DEFAULT_SIGNATURE_DATA_URL, DEFAULT_SIGNATURE_2_DATA_URL, normalizeSignatureUrl } from '../../utils/formatters';
import { CreateCompanyModal } from '../company/CreateCompanyModal';
import { Company } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    business, 
    updateBusiness, 
    resetAllData, 
    exportDatabaseJSON, 
    importDatabaseJSON, 
    showToast,
    companies,
    currentCompany,
    currentCompanyId,
    switchCompany,
    deleteCompany,
    setActiveTab: setGlobalActiveTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'companies' | 'signature' | 'banking' | 'invoicing' | 'backup'>('profile');
  const [formData, setFormData] = useState({ ...business });
  const [importFileContent, setImportFileContent] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // Digital Signature Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a'>('#1e3a8a');
  const [signatureFileName, setSignatureFileName] = useState<string | null>(null);

  // Synchronize when business changes
  useEffect(() => {
    setFormData({ ...business });
  }, [business]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'state') {
      const found = STATE_CODE_LIST.find(s => s.name === value);
      setFormData(prev => ({
        ...prev,
        state: value,
        stateCode: found ? found.code : prev.stateCode
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateBusiness(formData);
    showToast('success', 'Settings Saved', 'Business profile & signature preferences updated successfully.');
  };

  // JPG / Image Upload Handler
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)/i)) {
        showToast('error', 'Invalid File Type', 'Please upload a JPG, JPEG, or PNG signature image.');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        showToast('warning', 'File Size Too Large', 'Signature image should be under 2MB for optimal performance.');
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          signatureUrl: base64Data,
          showSignatureOnInvoice: true
        }));
        setSignatureFileName(file.name);
        // Persist immediately to global business profile & localStorage
        updateBusiness({
          ...formData,
          signatureUrl: base64Data,
          showSignatureOnInvoice: true
        });
        showToast('success', 'Signature Uploaded & Saved', `Loaded and saved "${file.name}" as authorized signature.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    setFormData(prev => ({
      ...prev,
      signatureUrl: undefined
    }));
    setSignatureFileName(null);
    updateBusiness({
      ...formData,
      signatureUrl: undefined
    });
    showToast('info', 'Signature Removed', 'Authorized signature image has been removed.');
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      showToast('warning', 'Canvas Empty', 'Please draw a signature on the pad first.');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setFormData(prev => ({
      ...prev,
      signatureUrl: dataUrl,
      showSignatureOnInvoice: true
    }));
    setSignatureFileName('Digital_Signature_Pad.png');
    updateBusiness({
      ...formData,
      signatureUrl: dataUrl,
      showSignatureOnInvoice: true
    });
    showToast('success', 'Signature Adopted & Saved', 'Drawn digital signature saved as authorized signature.');
  };

  // Sample Preset Signatures
  const applyPresetSignature = (type: 1 | 2) => {
    const chosenUrl = type === 1 ? DEFAULT_SIGNATURE_DATA_URL : DEFAULT_SIGNATURE_2_DATA_URL;
    
    setFormData(prev => ({
      ...prev,
      signatureUrl: chosenUrl,
      showSignatureOnInvoice: true
    }));
    setSignatureFileName(type === 1 ? 'Executive_Blue_Cursive.jpg' : 'Classic_Black_Script.jpg');
    updateBusiness({
      ...formData,
      signatureUrl: chosenUrl,
      showSignatureOnInvoice: true
    });
    showToast('success', 'Preset Signature Applied & Saved', `Loaded Sample Signature ${type}.`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setImportFileContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleImportSubmit = () => {
    if (!importFileContent) return;
    const success = importDatabaseJSON(importFileContent);
    if (success) {
      setImportFileContent('');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Company Profile & System Settings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure GSTIN, Authorized Signatures (JPG/PNG), Banking, UPI QR Code, and backups.
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Business & GSTIN
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'companies'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>Multi-Company / Entities ({companies.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('signature')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'signature'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSignature className="w-4 h-4 text-indigo-600" />
          <span>Authorized Signature (JPG)</span>
        </button>
        <button
          onClick={() => setActiveTab('banking')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'banking'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Bank & UPI QR Code
        </button>
        <button
          onClick={() => setActiveTab('invoicing')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'invoicing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Invoice Numbering & Terms
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Backup & Data Management
        </button>
        <button
          type="button"
          onClick={() => setGlobalActiveTab('users')}
          className="px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-indigo-600 hover:text-indigo-800 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ml-auto bg-indigo-50/60 rounded-xl"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Users & Role Permissions (RBAC)</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Business Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Company Legal Entity Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Legal Company Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Trade Name (Brand / Doing Business As)</label>
                <input
                  type="text"
                  name="tradeName"
                  value={formData.tradeName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">GSTIN (15 Digits) *</label>
                <div className="relative">
                  <input
                    type="text"
                    name="gstin"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 font-mono font-bold uppercase border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <ShieldCheck className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Permanent Account Number (PAN) *</label>
                <input
                  type="text"
                  name="pan"
                  maxLength={10}
                  value={formData.pan}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone / Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Registered Business Address *</label>
                <textarea
                  name="address"
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {STATE_CODE_LIST.map(st => (
                    <option key={st.code} value={st.name}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">PIN Code *</label>
                <input
                  type="text"
                  name="pincode"
                  maxLength={6}
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Website URL</label>
                <input
                  type="text"
                  name="website"
                  placeholder="https://example.com"
                  value={formData.website || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: MULTI-COMPANY & ENTITIES */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            {/* Header / Intro Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-cyan-300 text-xs font-semibold border border-cyan-400/30">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Multi-Entity Architecture</span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  Multi-Business & Company Management
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Run multiple distinct business companies, retail branches, and sister organizations with completely isolated GSTIN numbers, product catalogs, invoice series, and user roles.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateCompanyOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>+ Register New Company</span>
              </button>
            </div>

            {/* Registered Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map(comp => {
                const isActive = comp.id === currentCompanyId;

                return (
                  <div
                    key={comp.id}
                    className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                      isActive
                        ? 'bg-indigo-50/40 border-indigo-300 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                              {comp.gstin.substring(0, 2)} • {comp.state}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">
                              {comp.tradeName || comp.name}
                            </h4>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-indigo-600 text-white rounded-full uppercase tracking-wider">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded-full">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      {/* Legal Name & Address */}
                      <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Legal Name:</span>
                          <span className="font-medium text-slate-800 truncate max-w-[170px]">{comp.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">GSTIN:</span>
                          <span className="font-mono font-bold text-indigo-700">{comp.gstin}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">PAN:</span>
                          <span className="font-mono text-slate-700">{comp.pan}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Type:</span>
                          <span className="text-slate-700 truncate max-w-[170px]">{comp.businessType || 'GST Entity'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Location:</span>
                          <span className="text-slate-700 truncate max-w-[170px]">{comp.city}, {comp.state}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {isActive ? (
                        <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Current Active Workspace</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => switchCompany(comp.id)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Switch to this Business</span>
                        </button>
                      )}

                      {companies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCompanyToDelete(comp)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Company Workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AUTHORIZED SIGNATURE (JPG / DRAW / PREVIEW) */}
        {activeTab === 'signature' && (
          <div className="space-y-6">
            {/* Top Info Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
                <FileSignature className="w-5 h-5" />
              </div>
              <div className="text-xs text-indigo-950 space-y-1">
                <p className="font-bold">
                  Authorized Signatory Image & Digital Stamp Setup
                </p>
                <p className="text-indigo-800 leading-relaxed">
                  Upload a scanned photo or JPG/PNG image of your authorized signature, or draw one digitally. This signature will automatically appear on all generated GST Tax Invoices, Quotations, and Client Account Statements.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Upload & Signatory Config (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Upload Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-indigo-600" />
                      Upload Signature Image (JPG / JPEG / PNG)
                    </span>
                    {formData.signatureUrl && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Signature Active
                      </span>
                    )}
                  </h3>

                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 group">
                    <input
                      type="file"
                      id="signature-file-upload"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="signature-file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Click to Browse or Drag & Drop JPG Signature Photo
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Supports standard JPG, JPEG, PNG or WebP images (Max 2MB)
                      </p>
                    </label>
                  </div>

                  {formData.signatureUrl && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-slate-700 truncate">
                          {signatureFileName || 'Authorized_Signature.jpg'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Digital Drawing Canvas Pad */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-indigo-600" />
                      Or Draw Signature Digitally
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-semibold">Ink:</span>
                      <button
                        type="button"
                        onClick={() => setPenColor('#1e3a8a')}
                        className={`w-5 h-5 rounded-full bg-blue-900 transition-all ${penColor === '#1e3a8a' ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-60'}`}
                        title="Executive Blue Ink"
                      />
                      <button
                        type="button"
                        onClick={() => setPenColor('#0f172a')}
                        className={`w-5 h-5 rounded-full bg-slate-900 transition-all ${penColor === '#0f172a' ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-60'}`}
                        title="Classic Black Ink"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={130}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 touch-none cursor-crosshair bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Clear Pad
                    </button>

                    <button
                      type="button"
                      onClick={saveDrawnSignature}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow transition-all cursor-pointer"
                    >
                      Adopt Drawn Signature
                    </button>
                  </div>
                </div>

                {/* Preset Sample Signatures */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-xs space-y-2">
                  <span className="font-bold text-slate-700 block">Quick Demo Signatures:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetSignature(1)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-indigo-900">Sample 1 (Blue Cursive)</div>
                        <div className="text-[10px] text-slate-500">Executive Script</div>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPresetSignature(2)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">Sample 2 (Classic Black)</div>
                        <div className="text-[10px] text-slate-500">Director Signature</div>
                      </div>
                      <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Signatory Details & Live Invoice Footer Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Signatory Text Details */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 text-xs">
                  <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-indigo-600" />
                    Signatory Name & Designation
                  </h3>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Authorised Signatory Name
                    </label>
                    <input
                      type="text"
                      name="signatoryName"
                      placeholder="e.g. Rajesh K. Sharma"
                      value={formData.signatoryName || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Designation / Role
                    </label>
                    <input
                      type="text"
                      name="signatoryDesignation"
                      placeholder="e.g. Director / Proprietor / Partner"
                      value={formData.signatoryDesignation || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        name="showSignatureOnInvoice"
                        checked={formData.showSignatureOnInvoice !== false}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800">
                        Print Signature Image on Invoices & Bills
                      </span>
                    </label>
                  </div>
                </div>

                {/* Live Invoice Preview Box */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      Live Invoice Footer Preview
                    </span>
                    <span className="text-[10px] text-indigo-600 font-mono font-semibold">
                      Exact Print View
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-300 bg-slate-50/50 flex flex-col items-end text-right min-h-[160px] justify-between">
                    <div className="font-bold text-xs text-slate-900">
                      For {formData.tradeName || formData.name}
                    </div>

                    <div className="my-2 py-1 flex items-center justify-center">
                      {formData.signatureUrl && formData.showSignatureOnInvoice !== false ? (
                        <img
                          src={formData.signatureUrl}
                          alt="Authorized Signature"
                          className="h-14 max-w-[170px] object-contain"
                        />
                      ) : (
                        <div className="h-12 w-36 border-b border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Signature space)
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-400 pt-1 text-center min-w-[150px]">
                      <div className="text-[11px] font-bold text-slate-900">
                        {formData.signatoryName || 'Authorized Signatory'}
                      </div>
                      {formData.signatoryDesignation && (
                        <div className="text-[9px] text-slate-500 font-medium">
                          {formData.signatoryDesignation}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    This authorized block will be rendered automatically on all generated GST Tax Invoices and receipts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Bank & UPI QR */}
        {activeTab === 'banking' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Settlement Bank Account & Dynamic UPI QR
            </h3>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
              💡 These bank details and UPI ID will be rendered directly onto all printed Tax Invoices and POS receipts with a dynamic scan-and-pay UPI QR code.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Name *</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Account Number *</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">IFSC Code *</label>
                <input
                  type="text"
                  name="ifscCode"
                  maxLength={11}
                  value={formData.ifscCode}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 font-mono uppercase font-bold border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Branch Name</label>
                <input
                  type="text"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">UPI ID / VPA (for Instant QR Payments) *</label>
                <div className="relative">
                  <input
                    type="text"
                    name="upiId"
                    placeholder="yourcompany@okhdfcbank"
                    value={formData.upiId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 font-mono font-bold text-indigo-700 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <QrCode className="w-4 h-4 text-indigo-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Invoice Preferences */}
        {activeTab === 'invoicing' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Invoice Prefix, Sequence & Default Terms
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  name="invoicePrefix"
                  value={formData.invoicePrefix}
                  onChange={handleChange}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Example: INV-2026-</p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Next Serial Number</label>
                <input
                  type="number"
                  name="nextInvoiceNumber"
                  value={formData.nextInvoiceNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 font-mono font-bold border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Default Terms & Conditions</label>
                <textarea
                  name="defaultTerms"
                  rows={3}
                  value={formData.defaultTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Default Footer Notes</label>
                <textarea
                  name="defaultNotes"
                  rows={2}
                  value={formData.defaultNotes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Backup & Reset */}
        {activeTab === 'backup' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Database Backup, Restore & Reset
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Export Backup */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between space-y-3">
                <div>
                  <div className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                    <Download className="w-4 h-4 text-indigo-600" />
                    Export Full System Backup
                  </div>
                  <p className="text-indigo-800 text-[11px]">
                    Download a full JSON snapshot of all your invoices, products, stock levels, vendor purchase bills, journal vouchers, authorized signature, and company profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportDatabaseJSON}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors cursor-pointer w-fit"
                >
                  Download JSON Backup
                </button>
              </div>

              {/* Import Backup */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Upload className="w-4 h-4 text-slate-600" />
                    Restore from JSON Backup
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Upload a previously exported VyaparFlow backup JSON file.
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="mt-2 text-xs text-slate-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={!importFileContent}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-40 rounded-xl shadow transition-colors cursor-pointer w-fit"
                >
                  Restore Data
                </button>
              </div>
            </div>

            {/* Dangerous Reset Area */}
            <div className="pt-6 border-t border-slate-200">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Reset to Factory Demo Data
                  </div>
                  <p className="text-rose-700 text-[11px] mt-0.5">
                    Erases local modifications and reloads sample GST invoices, items, and parties.
                  </p>
                </div>

                {!showResetConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 hover:bg-rose-100 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    Reset Demo Data
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetAllData();
                        setShowResetConfirm(false);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow cursor-pointer whitespace-nowrap"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={(newComp) => {
          showToast('success', 'Company Registered', `Workspace initialized for ${newComp.tradeName || newComp.name}`);
        }}
      />

      {/* Delete Company Confirmation Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Delete Company Workspace?</h3>
                <p className="text-xs text-slate-500">{companyToDelete.tradeName || companyToDelete.name}</p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-xs text-rose-900 leading-relaxed">
              <p className="font-semibold mb-1">Warning: Irreversible Data Removal</p>
              <p className="text-rose-700 text-[11px]">
                Deleting this company workspace will permanently erase its isolated books, products, invoices, and vouchers from this device.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCompany(companyToDelete.id);
                  setCompanyToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
