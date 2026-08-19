import React from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { ROLE_DEFINITIONS } from '../../utils/rbacRules';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  QrCode, 
  Package, 
  Users, 
  Truck, 
  BookOpenCheck, 
  Calculator, 
  Settings, 
  Receipt,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Lock,
  UserCheck,
  ShieldAlert,
  LogOut
} from 'lucide-react';

interface SidebarItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  description: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, products, currentUser, can, lockSession, openAuthModal, logout } = useApp();

  const lowStockCount = products.filter(p => !p.isService && p.currentStock <= p.minStockAlert).length;

  const menuItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & KPIs'
    },
    {
      id: 'invoices',
      label: 'Invoices & Billing',
      icon: FileText,
      description: 'Tax Invoices & Estimates'
    },
    {
      id: 'payments',
      label: 'Payments & Receipts',
      icon: Receipt,
      badge: 'Money In/Out',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      description: 'Payment In, Out & Contra'
    },
    {
      id: 'pos_billing',
      label: 'POS Counter Billing',
      icon: ShoppingCart,
      badge: 'Fast',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      description: 'Instant retail billing'
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800',
      description: 'Products, HSN & Batches'
    },
    {
      id: 'parties',
      label: 'Customers & Vendors',
      icon: Users,
      description: 'Ledgers & GSTIN CRM'
    },
    {
      id: 'purchases',
      label: 'Purchases & Expenses',
      icon: Truck,
      description: 'Vendor bills & ITC input'
    },
    {
      id: 'accounting',
      label: 'Accounting & Reports',
      icon: BookOpenCheck,
      description: 'P&L, Balance Sheet, JV'
    },
    {
      id: 'gst_returns',
      label: 'GST & Tax Registers',
      icon: Calculator,
      badge: 'Sale/Pur',
      badgeColor: 'bg-cyan-100 text-cyan-800',
      description: 'Sale, Purchase & GSTR'
    },
    {
      id: 'users',
      label: 'Users & Permissions',
      icon: ShieldCheck,
      badge: 'RBAC',
      badgeColor: 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40',
      description: 'Roles, matrix & audit log'
    },
    {
      id: 'settings',
      label: 'Settings & Company',
      icon: Settings,
      description: 'Profile, Bank & Templates'
    }
  ];

  const currentRoleMeta = ROLE_DEFINITIONS[currentUser.role] || ROLE_DEFINITIONS.CUSTOM;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen sticky top-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/30">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-white text-base tracking-tight">
              Vyapar<span className="text-cyan-400">Flow</span>
            </span>
            <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
              PRO
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">GST & E-Invoicing Suite</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Business Operations</span>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${currentRoleMeta.badgeBg} ${currentRoleMeta.badgeText}`}>
            {currentUser.role}
          </span>
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasAccess = item.id === 'users' ? true : can(item.id as any, 'view');

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25'
                  : hasAccess
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 opacity-70'
              }`}
              title={!hasAccess ? `Access Restricted for ${currentUser.role}` : item.description}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : hasAccess ? 'text-slate-400 group-hover:text-cyan-400' : 'text-slate-600'
                  }`}
                />
                <span className="font-medium text-left">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {!hasAccess && (
                  <span className="p-1 rounded bg-slate-800 text-slate-500 group-hover:text-amber-400" title="Restricted by role">
                    <Lock className="w-3 h-3" />
                  </span>
                )}

                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Current Active Persona Widget */}
      <div className="p-3 m-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl ${currentUser.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
              {currentUser.avatarText}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-xs truncate leading-none">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-1">
                {currentRoleMeta.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => lockSession()}
              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Lock Screen"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
              title="Log Out to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => openAuthModal()}
            className="py-1 px-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Login or Switch User Account"
          >
            <UserCheck className="w-3 h-3 text-indigo-400" />
            <span>Switch Role</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className="py-1 px-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title="Manage Roles & Team"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Permissions</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

