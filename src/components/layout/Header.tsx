import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserPersonaSwitcher } from '../auth/UserPersonaSwitcher';
import { CloudSyncStatusBadge } from '../common/CloudSyncStatusBadge';
import { 
  Building2, 
  Search, 
  Plus, 
  ShoppingCart, 
  FileText, 
  Menu, 
  Bell, 
  Sparkles, 
  ArrowUpRight, 
  ShieldCheck,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';

interface HeaderProps {
  onOpenNewInvoice: () => void;
  onOpenQuickSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewInvoice, onOpenQuickSearch }) => {
  const { 
    business, 
    currentCompany, 
    setActiveTab, 
    invoices, 
    products, 
    can,
    theme,
    resolvedTheme,
    toggleTheme,
    setTheme
  } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  // Compute live alerts (e.g. low stock, unpaid overdue invoices)
  const lowStockItems = products.filter(p => !p.isService && p.currentStock <= p.minStockAlert);
  const overdueInvoices = invoices.filter(i => i.status === 'UNPAID' && new Date(i.dueDate) < new Date());

  const totalAlertsCount = lowStockItems.length + overdueInvoices.length;

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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Left: Current Active Company Identity (Static, No Switcher) */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${getThemeBg(currentCompany?.themeColor)} text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 ring-1 ring-black/5 dark:ring-white/10`}>
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[220px] md:max-w-[280px]">
              {currentCompany?.tradeName || currentCompany?.name || business.tradeName || business.name}
            </h2>
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
              State: {currentCompany?.gstin ? currentCompany.gstin.substring(0, 2) : '27'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate">GSTIN: {currentCompany?.gstin || business.gstin}</span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
            <span className="hidden md:inline text-slate-500 dark:text-slate-400">{currentCompany?.city || business.city}, {currentCompany?.state || business.state}</span>
          </div>
        </div>
      </div>

      {/* Middle: Universal Quick Search */}
      <div className="flex-1 max-w-md mx-3 hidden md:block">
        <button
          onClick={onOpenQuickSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl transition-all shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>Search</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action CTAs, Theme Toggle, User Persona Switcher & Notification Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Google Cloud DB Sync Status */}
        <CloudSyncStatusBadge compact={true} />

        {/* Quick Theme Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode (Current: ${theme})`}
          aria-label="Toggle Theme Mode"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Quick POS Mobile / Counter Bill Button */}
        {can('pos_billing', 'view') && (
          <button
            onClick={() => setActiveTab('pos_billing')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Quick POS Counter Billing"
          >
            <ShoppingCart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Quick POS</span>
          </button>
        )}

        {/* Create GST Tax Invoice CTA */}
        {can('invoices', 'create') && (
          <button
            onClick={onOpenNewInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
        )}

        {/* User Role Persona Switcher */}
        <UserPersonaSwitcher />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Compliance & Business Alerts</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                  {totalAlertsCount} pending
                </span>
              </div>

              <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {lowStockItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
                    <div className="font-semibold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1">
                      <span>⚠️ Low Stock Alert ({lowStockItems.length} items)</span>
                    </div>
                    <p className="text-amber-800 dark:text-amber-300">
                      {lowStockItems.map(i => `${i.name} (${i.currentStock} left)`).slice(0, 2).join(', ')}
                      {lowStockItems.length > 2 ? ` and ${lowStockItems.length - 2} more` : ''}
                    </p>
                    <button
                      onClick={() => { setActiveTab('inventory'); setShowNotifications(false); }}
                      className="mt-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center"
                    >
                      Restock items <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {overdueInvoices.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs">
                    <div className="font-semibold text-rose-900 dark:text-rose-200 mb-1">
                      🚨 Overdue Receivables ({overdueInvoices.length})
                    </div>
                    <p className="text-rose-800 dark:text-rose-300">
                      Payment pending past due date for {overdueInvoices[0]?.customerName}
                    </p>
                    <button
                      onClick={() => { setActiveTab('invoices'); setShowNotifications(false); }}
                      className="mt-1.5 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center"
                    >
                      View invoices <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {totalAlertsCount === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    🎉 All tax filings, stock thresholds & payments are in good shape!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
