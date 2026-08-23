import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserPersonaSwitcher } from '../auth/UserPersonaSwitcher';
import { 
  Building2, 
  Search, 
  Plus, 
  Bell, 
  ArrowUpRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { isProductLowStock, normalizeLowStockSettings } from '../../utils/stockUtils';

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
    isSidebarCollapsed,
    toggleSidebarCollapse
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && !!document.fullscreenElement;
  });

  // Track browser full screen state changes (via Esc, F11, or button)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request issue:', err);
    }
  };

  // Compute live alerts (e.g. low stock, unpaid overdue invoices)
  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);
  const lowStockItems = stockSettings.enabled && stockSettings.showLowStockBadge
    ? products.filter(p => isProductLowStock(p, stockSettings))
    : [];
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
      {/* Left: Collapsible Sidebar Trigger & Company Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Desktop Collapsible Sidebar Icon Toggle */}
        <button
          onClick={toggleSidebarCollapse}
          className="hidden lg:flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          title={isSidebarCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          aria-label="Toggle Sidebar"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${getThemeBg(currentCompany?.themeColor)} text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs shrink-0 ring-1 ring-black/5 dark:ring-white/10`}>
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[200px] md:max-w-[260px]">
              {currentCompany?.tradeName || currentCompany?.name || business.tradeName || business.name}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate">GSTIN: {currentCompany?.gstin || business.gstin}</span>
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

      {/* Right: Actions, Fullscreen Icon, Persona & Notifications */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Create GST Tax Invoice CTA */}
        {can('invoices', 'create') && (
          <button
            onClick={onOpenNewInvoice}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Invoice</span>
            <span className="sm:hidden">New</span>
          </button>
        )}

        {/* Fullscreen App Icon in Header/Navbar */}
        <button
          onClick={toggleFullScreen}
          className={`flex items-center justify-center p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
            isFullscreen
              ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60'
          }`}
          title={isFullscreen ? 'Exit Full Screen mode (F11 / Esc)' : 'Enter Full Screen app mode (F11)'}
          aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* User Role Persona Switcher */}
        <UserPersonaSwitcher />

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
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
