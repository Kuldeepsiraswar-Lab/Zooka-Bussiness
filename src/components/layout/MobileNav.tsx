import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, ActiveTab } from '../../context/AppContext';
import { usePWA } from '../../hooks/usePWA';
import { PwaInstallModal } from '../pwa/PwaInstallModal';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Package, 
  Menu, 
  X, 
  Users, 
  Truck, 
  BookOpenCheck, 
  Calculator, 
  Settings, 
  ShieldCheck, 
  Receipt,
  Sun,
  Moon,
  Plus,
  Sparkles,
  ChevronRight,
  Crown,
  Download,
  Smartphone
} from 'lucide-react';
import { 
  ALL_AVAILABLE_NAV_TABS, 
  DEFAULT_BOTTOM_NAV_CONFIG,
  TabMetaDefinition 
} from '../../utils/bottomNavDefaults';
import { QuickActionType } from '../../types';

export const MobileNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    business, 
    resolvedTheme, 
    toggleTheme, 
    products, 
    currentUser, 
    can,
    showToast 
  } = useApp();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [showPwaModal, setShowPwaModal] = useState(false);
  const { isInstalled, isOnline } = usePWA();

  // Retrieve current bottom navigation configuration
  const config = useApp().business.bottomNavConfig || DEFAULT_BOTTOM_NAV_CONFIG;

  // Compute low stock count for badges
  const lowStockCount = useMemo(() => {
    return products.filter(p => !p.isService && p.currentStock <= p.minStockAlert).length;
  }, [products]);

  // Tab meta lookup map
  const metaMap = useMemo(() => {
    const map = new Map<string, TabMetaDefinition>();
    ALL_AVAILABLE_NAV_TABS.forEach(t => map.set(t.id, t));
    return map;
  }, []);

  // Sorted enabled main tabs for the bottom bar
  const mainTabs = useMemo(() => {
    const tabs = [...(config.tabs || DEFAULT_BOTTOM_NAV_CONFIG.tabs)];
    return tabs
      .filter(t => t.isEnabled)
      .sort((a, b) => a.order - b.order)
      .map(tab => {
        const meta = metaMap.get(tab.id) || {
          id: tab.id,
          defaultLabel: tab.label,
          shortLabel: tab.label,
          description: '',
          icon: LayoutDashboard
        };

        return {
          id: tab.id as ActiveTab,
          label: (tab.customLabel && tab.customLabel.trim()) ? tab.customLabel.trim() : (tab.label || meta.shortLabel),
          icon: meta.icon,
          meta
        };
      });
  }, [config.tabs, metaMap]);

  // Drawer tabs (tabs that are not in the main bar, plus any essential fallback)
  const drawerTabs = useMemo(() => {
    const activeTabIds = new Set(mainTabs.map(t => t.id));
    return ALL_AVAILABLE_NAV_TABS.filter(meta => !activeTabIds.has(meta.id as ActiveTab));
  }, [mainTabs]);

  const quickActionMeta: Record<QuickActionType, { label: string; tab: ActiveTab; icon: React.ElementType; color: string; desc: string }> = {
    invoice: { label: 'New Tax Invoice', tab: 'invoices', icon: FileText, color: 'bg-indigo-600', desc: 'Create GST sales invoice' },
    pos: { label: 'POS Quick Sale', tab: 'pos_billing', icon: ShoppingCart, color: 'bg-emerald-600', desc: 'Instant counter retail billing' },
    payment_in: { label: 'Customer Payment', tab: 'payments', icon: Receipt, color: 'bg-teal-600', desc: 'Receive money-in voucher' },
    payment_out: { label: 'Vendor Payment', tab: 'payments', icon: Receipt, color: 'bg-rose-600', desc: 'Disburse money-out voucher' },
    product: { label: 'Add Stock Item', tab: 'inventory', icon: Package, color: 'bg-amber-600', desc: 'Create product with HSN' },
    party: { label: 'Add Party Contact', tab: 'parties', icon: Users, color: 'bg-blue-600', desc: 'New customer or vendor' },
    expense: { label: 'Record Expense', tab: 'purchases', icon: Truck, color: 'bg-purple-600', desc: 'Operating & office expenses' }
  };

  const handleQuickActionSelect = (tab: ActiveTab) => {
    setQuickActionOpen(false);
    setActiveTab(tab);
  };

  if (!config.enabled) {
    return null;
  }

  return (
    <>
      {/* Quick Action FAB Popover Sheet */}
      <AnimatePresence>
        {quickActionOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setQuickActionOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed bottom-20 inset-x-3 max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Quick Create Action</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Select a shortcut to start immediately</p>
                  </div>
                </div>
                <button
                  onClick={() => setQuickActionOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(config.quickActionItems || ['invoice', 'pos', 'payment_in', 'product']).map(actionKey => {
                  const meta = quickActionMeta[actionKey];
                  if (!meta) return null;
                  const Icon = meta.icon;

                  return (
                    <button
                      key={actionKey}
                      onClick={() => handleQuickActionSelect(meta.tab)}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 text-left transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 group"
                    >
                      <div className={`w-8 h-8 rounded-xl ${meta.color} text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{meta.label}</span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate">{meta.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drawer Overlay for Extra Operations on Mobile with Framer Motion */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-slate-900 text-white p-5 shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-base text-white">{business.tradeName || business.name}</h3>
                    <p className="text-xs text-slate-400 font-mono">GSTIN: {business.gstin}</p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Theme Mode Quick Selector in Drawer */}
                <div className="my-3 p-2 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Theme Mode</span>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    {resolvedTheme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Dark Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Light Mode</span>
                      </>
                    )}
                  </button>
                </div>

                {/* All Application Modules in Drawer */}
                <div className="mt-4 space-y-1">
                  {currentUser.role === 'SUPER_ADMIN' && (
                    <button
                      onClick={() => {
                        setActiveTab('super_admin_dashboard');
                        setDrawerOpen(false);
                      }}
                      className={`w-full mb-2 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer border ${
                        activeTab === 'super_admin_dashboard'
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>Super Admin Master Portal</span>
                      </div>
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                        Master
                      </span>
                    </button>
                  )}

                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                    <span>All App Modules</span>
                    <span className="text-[10px] text-slate-500 font-normal">Switch View</span>
                  </div>

                  {ALL_AVAILABLE_NAV_TABS.map(tab => {
                    const Icon = tab.icon;
                    const isDrawerActive = activeTab === tab.id;
                    const isMainBarTab = mainTabs.some(t => t.id === tab.id);

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as ActiveTab);
                          setDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          isDrawerActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isDrawerActive ? 'text-white' : 'text-slate-400'}`} />
                          <span>{tab.defaultLabel}</span>
                        </div>

                        {isMainBarTab && (
                          <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                            On Bar
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isInstalled && (
                <div className="mt-4 p-3 bg-gradient-to-r from-indigo-950/80 to-blue-950/80 rounded-xl border border-indigo-500/40 text-xs text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-cyan-300">
                      <Smartphone className="w-4 h-4" />
                      <span>Install Mobile App</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/30 text-indigo-200 rounded font-bold uppercase">
                      PWA
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200">
                    Add to home screen for full offline GST billing and barcode scanning.
                  </p>
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      setShowPwaModal(true);
                    }}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install to Phone</span>
                  </button>
                </div>
              )}

              <div className="mt-4 p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4" /> GST Compliance Ready
                </div>
                <p className="text-[11px]">Direct E-Invoice IRN & E-Way Bill generation enabled.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA Mobile Installation Modal */}
      <PwaInstallModal
        isOpen={showPwaModal}
        onClose={() => setShowPwaModal(false)}
      />

      {/* Customizable Bottom Navigation Bar for Mobile/Tablet screens */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-all ${
        config.style === 'FLOATING_PILL'
          ? 'px-3 pb-3 pt-1 pointer-events-none'
          : config.style === 'MODERN_CURVED'
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-2xl border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-lg'
          : config.style === 'COMPACT_SLIM'
          ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1.5 py-0.5 shadow-md'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-lg'
      }`}>
        <div className={`flex items-center justify-around pointer-events-auto ${
          config.style === 'FLOATING_PILL'
            ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl px-2 py-1.5'
            : ''
        }`}>
          {(() => {
            const items = [...mainTabs];
            const middleIdx = Math.floor(items.length / 2);

            const nodes = items.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              const buttonElement = (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavActivePill"
                      className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                    {config.showBadges && tab.id === 'inventory' && lowStockCount > 0 && (
                      <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white border border-white dark:border-slate-900">
                        {lowStockCount}
                      </span>
                    )}
                  </div>
                  {config.showLabels && (
                    <span className="text-[10px] mt-0.5 truncate max-w-[56px]">{tab.label}</span>
                  )}
                </button>
              );

              // Center Quick Action FAB
              if (config.showQuickActionCenter && idx === middleIdx) {
                return (
                  <React.Fragment key={`group-${tab.id}`}>
                    <button
                      key="center-fab-action"
                      onClick={() => setQuickActionOpen(prev => !prev)}
                      className="relative -top-2 flex flex-col items-center justify-center p-2.5 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/40 border-2 border-white dark:border-slate-900 cursor-pointer active:scale-95 transition-all"
                      title="Quick Action"
                    >
                      <Plus className={`w-4 h-4 transition-transform duration-200 ${quickActionOpen ? 'rotate-45' : ''}`} />
                    </button>
                    {buttonElement}
                  </React.Fragment>
                );
              }

              return buttonElement;
            });

            // More Drawer button
            if (config.showMoreDrawerButton) {
              nodes.push(
                <button
                  key="more-drawer-btn"
                  onClick={() => setDrawerOpen(true)}
                  className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="More modules"
                >
                  <Menu className="w-5 h-5" />
                  {config.showLabels && <span className="text-[10px] mt-0.5">More</span>}
                </button>
              );
            }

            return nodes;
          })()}
        </div>
      </nav>
    </>
  );
};
