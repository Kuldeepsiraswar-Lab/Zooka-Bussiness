import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser } from '../../types';
import { ROLE_DEFINITIONS } from '../../utils/rbacRules';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  X, 
  Check, 
  AlertCircle, 
  Sparkles, 
  User, 
  ChevronRight,
  Fingerprint,
  HelpCircle
} from 'lucide-react';

export const UserAuthModal: React.FC = () => {
  const { 
    users, 
    currentUser, 
    isAuthModalOpen, 
    authModalTargetUser, 
    closeAuthModal, 
    authenticateAndSwitchUser,
    business 
  } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(
    authModalTargetUser ? authModalTargetUser.id : currentUser.id
  );
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync selected user when auth modal opens with a specific target
  useEffect(() => {
    if (authModalTargetUser) {
      setSelectedUserId(authModalTargetUser.id);
    } else {
      setSelectedUserId(currentUser.id);
    }
    setPasswordInput('');
    setErrorMessage(null);
    setShowPassword(false);
  }, [authModalTargetUser, isAuthModalOpen, currentUser]);

  if (!isAuthModalOpen) return null;

  const targetUser: AppUser = users.find(u => u.id === selectedUserId) || currentUser;
  const roleMeta = ROLE_DEFINITIONS[targetUser.role] || ROLE_DEFINITIONS.CUSTOM;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!passwordInput.trim()) {
      setErrorMessage(authMode === 'password' ? 'Please enter the user password.' : 'Please enter the 4-digit PIN.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = authenticateAndSwitchUser(selectedUserId, passwordInput.trim());
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      } else {
        setPasswordInput('');
      }
    }, 150);
  };

  const handleQuickDemoFill = () => {
    if (authMode === 'password') {
      setPasswordInput(targetUser.password || 'admin');
    } else {
      setPasswordInput(targetUser.pin || '1111');
    }
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with gradient badge */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-cyan-300 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>User Role Authentication</span>
              </h2>
              <p className="text-xs text-slate-300">
                Secure login to {business.tradeName || business.name}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* User Account Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select User Account / Role
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {users.filter(u => u.isActive).map(u => {
                const isSelected = u.id === selectedUserId;
                const uRoleMeta = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.CUSTOM;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setPasswordInput('');
                      setErrorMessage(null);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl ${u.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}>
                        {u.avatarText}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.id === currentUser.id && (
                            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100/70 px-1.5 py-0.2 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {u.roleTitle || uRoleMeta.name}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${uRoleMeta.badgeBg} ${uRoleMeta.badgeText}`}>
                      {u.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Role Highlights Card */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-bold text-slate-800">{roleMeta.name}</span>
                <p className="text-[10px] text-slate-500 truncate max-w-[240px]">{roleMeta.description}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">Demo: </span>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                title="Click to autofill demo credentials"
              >
                Auto-fill
              </button>
            </div>
          </div>

          {/* Auth Mode Toggle (Password vs PIN) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('password');
                setPasswordInput('');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'password'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password ({targetUser.password || 'admin'})</span>
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
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>4-Digit PIN ({targetUser.pin || '1111'})</span>
            </button>
          </div>

          {/* Password / PIN Input Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>{authMode === 'password' ? 'Enter Password' : 'Enter 4-Digit PIN'}</span>
                <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Fill Default</span>
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
                placeholder={authMode === 'password' ? 'Enter password (e.g. admin, acc, sales)' : '••••'}
                maxLength={authMode === 'pin' ? 6 : 50}
                autoFocus
                className={`w-full px-4 py-2.5 pr-11 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono ${
                  errorMessage ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-2 font-medium animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={closeAuthModal}
              className="w-1/3 py-2.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-2/3 py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-lg shadow-indigo-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Authenticate & Switch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
