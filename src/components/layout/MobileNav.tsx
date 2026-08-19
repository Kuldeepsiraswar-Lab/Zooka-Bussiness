import React, { useState } from 'react';
import { useApp, ActiveTab } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  QrCode, 
  Package, 
  Menu, 
  X,
  Users,
  Truck,
  BookOpenCheck,
  Calculator,
  Settings,
  ShieldCheck,
  Receipt
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, business } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const mainTabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'pos_billing', label: 'POS Sale', icon: ShoppingCart },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'parties', label: 'Contacts', icon: Users },
  ];

  const drawerTabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'payments', label: 'Payments & Receipts', icon: Receipt },
    { id: 'purchases', label: 'Purchases & Expenses', icon: Truck },
    { id: 'accounting', label: 'Accounting & Reports', icon: BookOpenCheck },
    { id: 'gst_returns', label: 'GST Returns (GSTR-1/3B)', icon: Calculator },
    { id: 'users', label: 'Users & Role Permissions', icon: ShieldCheck },
    { id: 'settings', label: 'Company & Tax Settings', icon: Settings },
  ];

  return (
    <>
      {/* Drawer Overlay for Extra Navigation on Mobile */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="fixed inset-y-0 right-0 w-4/5 max-w-sm bg-slate-900 text-white p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-white">{business.tradeName || business.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">GSTIN: {business.gstin}</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  More Operations
                </div>
                {drawerTabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" /> GST Compliance Ready
              </div>
              <p className="text-[11px]">Direct E-Invoice IRN & E-Way Bill generation enabled.</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Nav Bar for Phone/Tablet screens */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                  isActive ? 'text-indigo-600 font-bold scale-105' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[10px] mt-0.5">{tab.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
