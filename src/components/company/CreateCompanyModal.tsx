import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Company, BusinessProfile } from '../../types';
import { 
  Building2, 
  X, 
  Check, 
  Plus, 
  ShieldCheck, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail, 
  KeyRound, 
  Sparkles, 
  UserPlus,
  Receipt,
  Layers,
  Lock,
  Fingerprint
} from 'lucide-react';
import { INDIAN_STATES } from '../../utils/constants';

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdCompany: Company) => void;
}

const THEME_COLORS = [
  { id: 'indigo', label: 'Indigo', class: 'bg-indigo-600' },
  { id: 'emerald', label: 'Emerald', class: 'bg-emerald-600' },
  { id: 'blue', label: 'Blue', class: 'bg-blue-600' },
  { id: 'amber', label: 'Amber', class: 'bg-amber-600' },
  { id: 'purple', label: 'Purple', class: 'bg-purple-600' },
  { id: 'rose', label: 'Rose', class: 'bg-rose-600' },
  { id: 'cyan', label: 'Cyan', class: 'bg-cyan-600' },
];

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createCompany, showToast } = useApp();

  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [businessType, setBusinessType] = useState('Private Limited • Trading & Services');
  const [state, setState] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-2027');
  const [themeColor, setThemeColor] = useState('indigo');

  // Bank details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Initial Administrator Account
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin');
  const [adminPin, setAdminPin] = useState('1111');

  if (!isOpen) return null;

  const handleGstinChange = (value: string) => {
    const upper = value.toUpperCase().trim();
    setGstin(upper);

    // Auto extract State Code from first 2 digits
    if (upper.length >= 2) {
      const code = upper.substring(0, 2);
      const matchedState = INDIAN_STATES.find(s => s.code === code);
      if (matchedState) {
        setState(matchedState.name);
        setStateCode(matchedState.code);
      }
    }

    // Auto extract PAN from digits 3-12
    if (upper.length >= 12) {
      const derivedPan = upper.substring(2, 12);
      setPan(derivedPan);
    }
  };

  const handleStateChange = (selectedStateName: string) => {
    setState(selectedStateName);
    const matched = INDIAN_STATES.find(s => s.name === selectedStateName);
    if (matched) {
      setStateCode(matched.code);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      showToast('error', 'Required Field', 'Please enter Company Legal Name.');
      return;
    }

    if (!adminName.trim()) {
      showToast('error', 'Required Field', 'Please provide an Administrator name.');
      return;
    }

    const newCompany = createCompany(
      {
        name: companyName.trim(),
        tradeName: tradeName.trim() || companyName.trim(),
        gstin: gstin.trim() || 'UNREGISTERED',
        pan: pan.trim() || (gstin.length >= 12 ? gstin.substring(2, 12) : 'PANNOTSET'),
        businessType,
        state,
        stateCode,
        city: city.trim() || 'Mumbai',
        address: address.trim() || 'Main Business Avenue',
        pincode: pincode.trim() || '400001',
        phone: phone.trim() || '+91 98000 00000',
        email: email.trim() || (adminEmail.trim() || 'accounts@company.com'),
        financialYear,
        currency: 'INR',
        currencySymbol: '₹',
        themeColor,
      },
      {
        name: adminName.trim(),
        email: adminEmail.trim() || `${adminName.toLowerCase().replace(/\s+/g, '')}@company.com`,
        password: adminPassword.trim() || 'admin',
        pin: adminPin.trim() || '1111',
      }
    );

    if (onSuccess) {
      onSuccess(newCompany);
    }
    onClose();
  };

  const handleFillDemo = () => {
    setCompanyName('Zenith Logistics & Supply Chain Pvt Ltd');
    setTradeName('Zenith Express Logistics');
    setGstin('24AABCZ8899Z1Z3');
    setPan('AABCZ8899Z');
    setBusinessType('Private Limited • Logistics & Supply');
    setState('Gujarat');
    setStateCode('24');
    setCity('Ahmedabad');
    setAddress('C-402, Titanium City Centre, Prahlad Nagar');
    setPincode('380015');
    setPhone('+91 97234 55667');
    setEmail('accounts@zenithexpress.in');
    setBankName('Axis Bank Ltd');
    setAccountNumber('921020011448899');
    setIfscCode('UTIB0000888');
    setUpiId('zenithexpress@axisbank');
    setAdminName('Kiran Patel');
    setAdminEmail('kiran@zenithexpress.in');
    setAdminPassword('admin');
    setAdminPin('1111');
    setThemeColor('emerald');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Create New Company / Business</h2>
              <p className="text-xs text-slate-300 mt-1">Multi-entity setup with isolated GST, inventory, and users</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-3 py-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-400/30 transition-all flex items-center gap-1 cursor-pointer"
              title="Auto-populate sample company details"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sample Details</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          
          {/* Section 1: Business Identity */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 border-b border-indigo-100 pb-1.5">
              <Building2 className="w-4 h-4" />
              <span>1. Company Legal & Tax Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Supplies Pvt Ltd"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trade / Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Tools & Hardware"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AAACA1234M1Z2"
                  value={gstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono uppercase bg-slate-50/50"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">State & PAN auto-extracted from GSTIN</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Permanent Account Number (PAN)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. AAACA1234M"
                  value={pan}
                  onChange={e => setPan(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono uppercase bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Constitution / Business Type
                </label>
                <select
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                >
                  <option value="Private Limited • Trading & Services">Private Limited (Trading & Services)</option>
                  <option value="Proprietorship • Retail POS">Proprietorship (Retail Store)</option>
                  <option value="Partnership • Wholesale & FMCG">Partnership (Wholesale & FMCG)</option>
                  <option value="LLP • Logistics & Consulting">Limited Liability Partnership (LLP)</option>
                  <option value="Manufacturing • Industrial Unit">Manufacturing & Assembly Unit</option>
                  <option value="Public Limited Company">Public Limited Company</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Financial Year
                </label>
                <select
                  value={financialYear}
                  onChange={e => setFinancialYear(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                >
                  <option value="2026-2027">FY 2026 - 2027 (Current)</option>
                  <option value="2025-2026">FY 2025 - 2026</option>
                  <option value="2024-2025">FY 2024 - 2025</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Address & Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 border-b border-indigo-100 pb-1.5">
              <MapPin className="w-4 h-4" />
              <span>2. Place of Business & Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State (Place of Supply) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={e => handleStateChange(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50 font-medium"
                >
                  {INDIAN_STATES.map(st => (
                    <option key={st.code} value={st.name}>
                      {st.code} - {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City / District
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pune"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 411001"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Principal Business Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot No. 12, MIDC Industrial Area, Bhosari"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Initial Administrator Credentials */}
          <div className="bg-indigo-50/40 rounded-2xl p-4 border border-indigo-100 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 border-b border-indigo-200/60 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>3. Primary Administrator Account (Default Sign-in)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rakesh Mehta"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. rakesh@company.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter password..."
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin 4-Digit PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Fingerprint className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="1111"
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Theme Color */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Company Branding Accent Color
            </label>
            <div className="flex items-center gap-3">
              {THEME_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setThemeColor(c.id)}
                  className={`w-8 h-8 rounded-xl ${c.class} flex items-center justify-center text-white transition-all cursor-pointer ${
                    themeColor === c.id ? 'ring-3 ring-slate-900 scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                >
                  {themeColor === c.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Company & Launch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
