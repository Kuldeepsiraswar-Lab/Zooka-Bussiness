import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserPersonaSwitcher } from '../auth/UserPersonaSwitcher';
import { CompanySwitcher } from '../company/CompanySwitcher';
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
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  onOpenNewInvoice: () => void;
  onOpenQuickSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewInvoice, onOpenQuickSearch }) => {
  const { business, setActiveTab, invoices, products, can } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);

  // Compute live alerts (e.g. low stock, unpaid overdue invoices)
  const lowStockItems = products.filter(p => !p.isService && p.currentStock <= p.minStockAlert);
  const overdueInvoices = invoices.filter(i => i.status === 'UNPAID' && new Date(i.dueDate) < new Date());

  const totalAlertsCount = lowStockItems.length + overdueInvoices.length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Left: Multi-Company Switcher & Business Identity */}
      <div className="flex items-center gap-3">
        <CompanySwitcher />
      </div>

      {/* Middle: Universal Quick Search */}
      <div className="flex-1 max-w-md mx-3 hidden md:block">
        <button
          onClick={onOpenQuickSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-400 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition-all shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white rounded border border-slate-200 shadow-sm">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Action CTAs, User Persona Switcher & Notification Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick POS Mobile / Counter Bill Button */}
        {can('pos_billing', 'view') && (
          <button
            onClick={() => setActiveTab('pos_billing')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Quick POS Counter Billing"
          >
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
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
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-sm text-slate-900">Compliance & Business Alerts</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                  {totalAlertsCount} pending
                </span>
              </div>

              <div className="mt-3 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {lowStockItems.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <div className="font-semibold text-amber-900 mb-1 flex items-center gap-1">
                      <span>⚠️ Low Stock Alert ({lowStockItems.length} items)</span>
                    </div>
                    <p className="text-amber-800">
                      {lowStockItems.map(i => `${i.name} (${i.currentStock} left)`).slice(0, 2).join(', ')}
                      {lowStockItems.length > 2 ? ` and ${lowStockItems.length - 2} more` : ''}
                    </p>
                    <button
                      onClick={() => { setActiveTab('inventory'); setShowNotifications(false); }}
                      className="mt-1.5 text-indigo-600 font-semibold hover:underline inline-flex items-center"
                    >
                      Restock items <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {overdueInvoices.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <div className="font-semibold text-rose-900 mb-1">
                      🚨 Overdue Receivables ({overdueInvoices.length})
                    </div>
                    <p className="text-rose-800">
                      Payment pending past due date for {overdueInvoices[0]?.customerName}
                    </p>
                    <button
                      onClick={() => { setActiveTab('invoices'); setShowNotifications(false); }}
                      className="mt-1.5 text-indigo-600 font-semibold hover:underline inline-flex items-center"
                    >
                      View invoices <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {totalAlertsCount === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
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
