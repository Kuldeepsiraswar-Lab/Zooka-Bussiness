import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, Company } from '../../types';
import { ROLE_DEFINITIONS, DEFAULT_SUPER_ADMIN } from '../../utils/rbacRules';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ArrowRight,
  ArrowLeft,
  Building2,
  Receipt,
  Plus,
  Fingerprint,
  MapPin,
  Briefcase,
  ChevronRight,
  Users,
  ShieldAlert,
  Crown,
  Sun,
  Moon
} from 'lucide-react';
import { CreateCompanyModal } from '../company/CreateCompanyModal';

export const LoginScreen: React.FC = () => {
  const { 
    companies,
    currentCompany,
    currentCompanyId,
    switchCompany,
    users, 
    currentUser, 
    authenticateAndSwitchUser, 
    loginAsSuperAdmin,
    showToast,
    theme,
    resolvedTheme,
    toggleTheme
  } = useApp();

  // Screen Flow Step: defaults to 'select_company' when opening the app
  const [loginStep, setLoginStep] = useState<'select_company' | 'login_credentials'>('select_company');
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const admin = users.find(u => u.role === 'ADMIN' && u.isActive);
    return admin ? admin.id : (users[0]?.id || DEFAULT_SUPER_ADMIN.id);
  });
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);

  // Sync selected user when switching company
  useEffect(() => {
    if (users.length > 0) {
      // Pick first active admin or first active user
      const admin = users.find(u => u.role === 'ADMIN' && u.isActive);
      setSelectedUserId(admin ? admin.id : users[0].id);
    }
  }, [users, currentCompanyId]);

  const targetUser: AppUser = users.find(u => u.id === selectedUserId) || DEFAULT_SUPER_ADMIN;
  const roleMeta = ROLE_DEFINITIONS[targetUser?.role] || ROLE_DEFINITIONS.ADMIN;

  const handleChooseCompany = (comp: Company) => {
    switchCompany(comp.id);
    setPasswordInput('');
    setErrorMessage(null);
    setLoginStep('login_credentials');
  };

  const handleSelectUser = (user: AppUser) => {
    setSelectedUserId(user.id);
    setPasswordInput('');
    setErrorMessage(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!passwordInput.trim()) {
      setErrorMessage(authMode === 'password' ? 'Please enter the account password.' : 'Please enter the 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = authenticateAndSwitchUser(selectedUserId, passwordInput.trim());
      setIsLoading(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify password/PIN.');
      } else {
        setPasswordInput('');
        setErrorMessage(null);
      }
    }, 150);
  };

  const handleQuickSuperAdminLogin = () => {
    loginAsSuperAdmin();
  };

  const handleAutoFill = () => {
    if (authMode === 'password') {
      setPasswordInput(targetUser?.password || (targetUser?.role === 'SUPER_ADMIN' ? 'superadmin' : 'admin'));
    } else {
      setPasswordInput(targetUser?.pin || (targetUser?.role === 'SUPER_ADMIN' ? '9999' : '1111'));
    }
    setErrorMessage(null);
  };

  const getCompanyGradient = (color?: string) => {
    switch (color) {
      case 'emerald': return 'from-emerald-600 via-emerald-700 to-teal-800';
      case 'blue': return 'from-blue-600 via-cyan-700 to-slate-900';
      case 'amber': return 'from-amber-600 via-orange-700 to-slate-900';
      case 'purple': return 'from-purple-600 via-indigo-700 to-slate-900';
      case 'rose': return 'from-rose-600 via-pink-700 to-slate-900';
      case 'cyan': return 'from-cyan-600 via-teal-700 to-slate-900';
      default: return 'from-indigo-600 via-blue-700 to-slate-900';
    }
  };

  const getThemeBg = (color?: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-600';
      case 'blue': return 'bg-blue-600';
      case 'amber': return 'bg-amber-600';
      case 'purple': return 'bg-purple-600';
      case 'rose': return 'bg-rose-600';
      case 'cyan': return 'bg-cyan-600';
      default: return 'bg-indigo-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden font-sans text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Lighting */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top App Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 ring-2 ring-white/10">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">Zooka Business</h1>
              <span className="text-[10px] uppercase font-extrabold bg-indigo-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full border border-cyan-400/30">
                Multi-Company
              </span>
            </div>
            <p className="text-xs text-slate-400">Enterprise GST Accounting & Multi-Business Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
            title={`Toggle Theme Mode (Current: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-300" />
            )}
          </button>

          {loginStep === 'login_credentials' && (
            <button
              type="button"
              onClick={() => setLoginStep('select_company')}
              className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Business</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateCompanyOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 hover:from-purple-800 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-purple-500/30"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span>+ Create Business</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        
        {/* ======================================================================= */}
        {/* STEP 1: COMPANY SELECTION (FIRST SCREEN ON OPENING APP)                 */}
        {/* ======================================================================= */}
        {loginStep === 'select_company' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 max-w-5xl mx-auto w-full">
            
            {/* Step 1 Title & Description */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-cyan-300 text-xs font-bold">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Select Company to Begin</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Select Your Business / Company
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Choose the business workspace you wish to access. Each company possesses its own isolated GSTIN, products, invoices, and user permissions.
              </p>
            </div>

            {/* Super Admin Quick Launch Banner */}
            <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-slate-900/90 border border-purple-800/50 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-600/30 shrink-0 ring-2 ring-white/10">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white leading-tight">Super Administrator Control</h3>
                    <span className="text-[9px] font-extrabold uppercase bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/40">
                      Supreme Role
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    <strong>Vikram Singhania</strong> • Supreme authority to create & provision new business entities across the platform.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Business</span>
                </button>
                <button
                  type="button"
                  onClick={handleQuickSuperAdminLogin}
                  className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Direct sign in as Super Admin"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  <span>Super Admin Login</span>
                </button>
              </div>
            </div>

            {/* Companies Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {companies.map(comp => {
                const isSelected = comp.id === currentCompanyId;

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleChooseCompany(comp)}
                    className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500 rounded-3xl p-5 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-xl transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.99]"
                  >
                    {/* Top Glow Accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getCompanyGradient(comp.themeColor)}`} />

                    <div>
                      {/* Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className={`w-11 h-11 rounded-2xl ${getThemeBg(comp.themeColor)} text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 transition-transform`}>
                          <Building2 className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-lg border border-slate-700">
                            State: {comp.gstin.substring(0, 2)}
                          </span>
                        </div>
                      </div>

                      {/* Trade / Brand Name */}
                      <h3 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                        {comp.tradeName || comp.name}
                      </h3>

                      {/* Legal Name */}
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {comp.name}
                      </p>

                      {/* Info Chips */}
                      <div className="space-y-1.5 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">GSTIN:</span>
                          <span className="font-mono font-bold text-slate-200">{comp.gstin}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Location:</span>
                          <span className="text-slate-300 truncate max-w-[170px]">{comp.city}, {comp.state}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Type:</span>
                          <span className="text-slate-300 truncate max-w-[170px]">{comp.businessType || 'GST Entity'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        FY {comp.financialYear || '2026-2027'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">
                        <span>Select Company</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Add New Company Card */}
              <button
                type="button"
                onClick={() => setIsCreateCompanyOpen(true)}
                className="group border-2 border-dashed border-purple-900/60 hover:border-purple-500 bg-purple-950/20 hover:bg-purple-950/40 rounded-3xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[240px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Crown className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Register New Company
                  </h4>
                  <p className="text-xs text-purple-300/80 mt-1 max-w-[200px]">
                    Requires Super Admin credentials to provision new business workspace
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* STEP 2: ROLE SELECTION & LOGIN FOR CHOSEN COMPANY                       */}
        {/* ======================================================================= */}
        {loginStep === 'login_credentials' && (
          <div className="animate-in fade-in zoom-in-95 duration-200 space-y-5">
            
            {/* Active Company Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl ${getThemeBg(currentCompany.themeColor)} text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white leading-tight">
                      {currentCompany.tradeName || currentCompany.name}
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Active Workspace
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono">{currentCompany.gstin}</span>
                    <span>•</span>
                    <span>{currentCompany.city}, {currentCompany.state}</span>
                    <span>•</span>
                    <span>FY {currentCompany.financialYear || '2026-2027'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCompanyOpen(true)}
                  className="px-3 py-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-600/40 text-purple-200 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>+ New Business</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoginStep('select_company')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Switch Company</span>
                </button>
              </div>
            </div>

            {/* Login & Role Selection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Role Selector in Selected Company */}
              <div className="lg:col-span-7 space-y-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Select User Role</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Choose Your Role Account
                  </h3>
                  <p className="text-xs text-slate-400">
                    Select a designated persona configured for this business entity and authenticate.
                  </p>
                </div>

                {/* Role Account Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {users.filter(u => u.isActive).map(user => {
                    const isSelected = user.id === selectedUserId;
                    const uRoleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.ADMIN;
                    const isSuper = user.role === 'SUPER_ADMIN';

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                          isSelected
                            ? isSuper
                              ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30 shadow-xl shadow-purple-500/10'
                              : 'bg-slate-900/90 border-indigo-500 ring-2 ring-indigo-500/30 shadow-xl shadow-indigo-500/10'
                            : isSuper
                              ? 'bg-purple-950/40 border-purple-900/60 hover:bg-purple-950/70 hover:border-purple-700'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-xl ${user.avatarBg} text-white font-bold text-xs flex items-center justify-center shadow-md shrink-0`}>
                                {isSuper ? <Crown className="w-4 h-4 text-amber-300" /> : user.avatarText}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {user.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {user.roleTitle || uRoleMeta.name}
                                </div>
                              </div>
                            </div>

                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border shrink-0 ${uRoleMeta.badgeBg} ${uRoleMeta.badgeText}`}>
                              {user.role}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {uRoleMeta.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Password: <strong className="text-slate-300">{user.password || (isSuper ? 'superadmin' : 'admin')}</strong></span>
                          <span>PIN: <strong className="text-slate-300">{user.pin || (isSuper ? '9999' : '1111')}</strong></span>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Password / PIN Login Form */}
              <div className="lg:col-span-5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
                  
                  {/* Selected User Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <div className={`w-11 h-11 rounded-2xl ${targetUser?.avatarBg} text-white font-black text-sm flex items-center justify-center shadow-md shrink-0 ring-2 ring-slate-700`}>
                      {targetUser?.role === 'SUPER_ADMIN' ? <Crown className="w-5 h-5 text-amber-300" /> : targetUser?.avatarText}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm truncate">{targetUser?.name}</h3>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}>
                          {targetUser?.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {targetUser?.department} • {currentCompany.tradeName || currentCompany.name}
                      </p>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* Mode Selector (Password vs PIN) */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('password');
                          setPasswordInput('');
                          setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          authMode === 'password'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('pin');
                          setPasswordInput('');
                          setErrorMessage(null);
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          authMode === 'pin'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Fingerprint className="w-3.5 h-3.5" />
                        <span>4-Digit PIN</span>
                      </button>
                    </div>

                    {/* Password / PIN Input Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-300">
                          {authMode === 'password' ? 'Account Password' : '4-Digit Counter PIN'}
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoFill}
                          className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1 font-mono"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Auto-fill: {authMode === 'password' ? targetUser?.password || (targetUser?.role === 'SUPER_ADMIN' ? 'superadmin' : 'admin') : targetUser?.pin || (targetUser?.role === 'SUPER_ADMIN' ? '9999' : '1111')}</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordInput}
                          onChange={(e) => {
                            setPasswordInput(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder={authMode === 'password' ? 'Enter password...' : '••••'}
                          maxLength={authMode === 'pin' ? 6 : 50}
                          autoFocus
                          className={`w-full px-4 py-2.5 pr-11 text-xs bg-slate-950 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all placeholder:text-slate-600 ${
                            errorMessage ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-800'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {errorMessage && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-medium animate-in fade-in">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Submit Action Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl shadow-lg shadow-indigo-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Authenticating...
                        </span>
                      ) : (
                        <>
                          <span>Login to {currentCompany.tradeName || currentCompany.name}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Security Policy Footnote */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Encrypted Session</span>
                    </span>
                    <span className="text-indigo-400 font-semibold">
                      Ind AS & GST Compliant
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer Note */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© 2026 Zooka Bussiness Enterprise Multi-Business Accounting • All rights reserved</p>
        <p className="flex items-center gap-3">
          <span>DESIGN AND DEVELOPED BY</span>
          <span>•</span>
          <span>KULDEEP SIRASWAR</span>
          <span>•</span>
          <span>E-Invoicing Ready</span>
        </p>
      </footer>

      {/* Create Company Modal */}
      <CreateCompanyModal
        isOpen={isCreateCompanyOpen}
        onClose={() => setIsCreateCompanyOpen(false)}
        onSuccess={(createdComp) => {
          showToast('success', 'Company Registered', `Workspace created for ${createdComp.tradeName || createdComp.name}.`);
          setLoginStep('login_credentials');
        }}
      />
    </div>
  );
};
