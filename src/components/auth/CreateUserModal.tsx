import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AppUser, RoleType, UserPermissions } from '../../types';
import { ROLE_DEFINITIONS, getUserEffectivePermissions } from '../../utils/rbacRules';
import { 
  X, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Building, 
  Briefcase, 
  Sliders, 
  Check, 
  Save,
  HelpCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: AppUser | null;
}

const BG_AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-teal-600',
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { createUser, updateUser, deleteUser, currentUser, showToast } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    name: userToEdit?.name || '',
    email: userToEdit?.email || '',
    phone: userToEdit?.phone || '',
    department: userToEdit?.department || 'Operations & Accounts',
    roleTitle: userToEdit?.roleTitle || '',
    role: (userToEdit?.role || 'SALESPERSON') as RoleType,
    avatarBg: userToEdit?.avatarBg || 'bg-indigo-600',
    isActive: userToEdit?.isActive ?? true,
    password: userToEdit?.password || (userToEdit?.role === 'ADMIN' ? 'admin' : 'sales'),
    pin: userToEdit?.pin || '1234',
  });

  const [customPerms, setCustomPerms] = useState<UserPermissions>(() => {
    return getUserEffectivePermissions(userToEdit);
  });

  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);
  const [activePermModule, setActivePermModule] = useState<keyof UserPermissions>('invoices');

  if (!isOpen) return null;

  const handleRoleChange = (newRole: RoleType) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      roleTitle: prev.roleTitle || ROLE_DEFINITIONS[newRole]?.name || ''
    }));
    // Sync permissions from role defaults
    const defaults = ROLE_DEFINITIONS[newRole]?.defaultPermissions || ROLE_DEFINITIONS.SALESPERSON.defaultPermissions;
    setCustomPerms(JSON.parse(JSON.stringify(defaults)));
  };

  const handleTogglePerm = (module: keyof UserPermissions, key: string) => {
    setCustomPerms(prev => {
      const mod = { ...(prev[module] as any) };
      mod[key] = !mod[key];
      return {
        ...prev,
        [module]: mod,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('error', 'Validation Error', 'Please enter user full name.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      showToast('error', 'Validation Error', 'Please enter a valid work email address.');
      return;
    }

    const initials = formData.name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';

    if (userToEdit) {
      updateUser(userToEdit.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        roleTitle: formData.roleTitle.trim(),
        role: formData.role,
        avatarBg: formData.avatarBg,
        avatarText: initials,
        isActive: formData.isActive,
        password: formData.password.trim() || 'admin',
        pin: formData.pin.trim() || '1234',
        customPermissions: customPerms,
      });
    } else {
      createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department.trim(),
        roleTitle: formData.roleTitle.trim() || ROLE_DEFINITIONS[formData.role].name,
        role: formData.role,
        avatarBg: formData.avatarBg,
        avatarText: initials,
        isActive: formData.isActive,
        password: formData.password.trim() || 'admin',
        pin: formData.pin.trim() || '1234',
        customPermissions: customPerms,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {userToEdit ? 'Edit User Profile & Permissions' : 'Add New Team Member'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure role access levels, department, and granular authorization rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@bharattech.in"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Branch
                </label>
                <input
                  type="text"
                  placeholder="Sales, Accounts, Warehouse, etc."
                  value={formData.department}
                  onChange={e => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
              </div>
            </div>

            {/* Avatar Color Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Profile Badge Theme
              </label>
              <div className="flex items-center gap-2">
                {BG_AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, avatarBg: color })}
                    className={`w-6 h-6 rounded-full ${color} transition-transform cursor-pointer ${
                      formData.avatarBg === color ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Role Selection */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> Assigned System Role
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(ROLE_DEFINITIONS) as RoleType[]).map(rKey => {
                const roleDef = ROLE_DEFINITIONS[rKey];
                const isSelected = formData.role === rKey;

                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => handleRoleChange(rKey)}
                    className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900">{roleDef.name}</span>
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded ${roleDef.badgeBg} ${roleDef.badgeText}`}>
                          {rKey}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {roleDef.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="mt-2 text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected Role
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Security Credentials (Password & PIN) */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" /> Login Credentials & Security
              </h3>
              <button
                type="button"
                onClick={() => {
                  const randomPwd = Math.random().toString(36).slice(-6);
                  const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                  setFormData(prev => ({ ...prev, password: randomPwd, pin: randomPin }));
                }}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer hover:underline"
              >
                Generate Random
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User Account Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. admin123"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">Used for browser login and session unlocking</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quick 4-Digit PIN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 1234"
                  value={formData.pin}
                  onChange={e => setFormData({ ...formData, pin: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">For fast counter POS & quick screen unlocking</p>
              </div>
            </div>
          </div>

          {/* Section 4: Granular Permission Customization Accordion */}
          <div className="pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Fine-tune Granular Permissions (Module & Action Level)</span>
              </div>
              {showAdvancedPerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedPerms && (
              <div className="mt-3 p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
                {/* Module Selector Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {(Object.keys(customPerms) as (keyof UserPermissions)[]).map(modKey => (
                    <button
                      key={modKey}
                      type="button"
                      onClick={() => setActivePermModule(modKey)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl capitalize shrink-0 transition-all cursor-pointer ${
                        activePermModule === modKey
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {modKey.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {/* Active Module Permissions List */}
                <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
                    {activePermModule.replace(/_/g, ' ')} Capabilities
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {Object.entries((customPerms[activePermModule] || {}) as Record<string, boolean>).map(([permKey, isAllowed]) => (
                      <label
                        key={permKey}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 border border-slate-100 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => handleTogglePerm(activePermModule, permKey)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 font-medium capitalize">
                          {permKey.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit & Delete */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {userToEdit && userToEdit.id !== currentUser.id && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-600 font-bold">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const success = deleteUser(userToEdit.id);
                        if (success) {
                          onClose();
                        }
                      }}
                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete User</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{userToEdit ? 'Save Changes' : 'Create User & Send Invite'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
