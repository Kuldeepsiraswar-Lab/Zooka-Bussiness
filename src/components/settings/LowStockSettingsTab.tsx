import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LowStockSettings, LowStockBehavior, Product } from '../../types';
import { 
  Package, 
  AlertTriangle, 
  ShieldAlert, 
  Bell, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Layers, 
  ShoppingCart, 
  TrendingDown, 
  Zap, 
  Save, 
  Sparkles,
  Info,
  Check,
  Ban,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { 
  DEFAULT_LOW_STOCK_SETTINGS, 
  normalizeLowStockSettings, 
  computeInventoryHealth,
  isProductLowStock,
  isProductCriticalStock,
  isProductOutOfStock
} from '../../utils/stockUtils';

interface LowStockSettingsTabProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  isSaving?: boolean;
}

export const LowStockSettingsTab: React.FC<LowStockSettingsTabProps> = ({
  formData,
  setFormData,
  onSave,
  isSaving = false,
}) => {
  const { products, updateProduct, showToast, setActiveTab } = useApp();
  
  const currentSettings: LowStockSettings = normalizeLowStockSettings(formData.lowStockSettings);
  const health = computeInventoryHealth(products, currentSettings);

  const [isApplyingBulkThreshold, setIsApplyingBulkThreshold] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

  const updateSetting = <K extends keyof LowStockSettings>(key: K, value: LowStockSettings[K]) => {
    setFormData((prev: any) => ({
      ...prev,
      lowStockSettings: {
        ...normalizeLowStockSettings(prev.lowStockSettings),
        [key]: value,
      },
    }));
  };

  const handleApplyThresholdToAll = async () => {
    setIsApplyingBulkThreshold(true);
    try {
      const physicalProducts = products.filter(p => !p.isService);
      for (const prod of physicalProducts) {
        updateProduct(prod.id, {
          minStockAlert: currentSettings.defaultThreshold,
        });
      }
      showToast(
        'success',
        'Thresholds Updated',
        `Default low stock threshold of ${currentSettings.defaultThreshold} units applied to all ${physicalProducts.length} physical catalog items.`
      );
      setShowBulkConfirmModal(false);
    } catch (e) {
      showToast('error', 'Update Failed', 'Failed to update stock thresholds across catalog.');
    } finally {
      setIsApplyingBulkThreshold(false);
    }
  };

  const handleTestAlert = () => {
    const lowStockItems = products.filter(p => isProductLowStock(p, currentSettings));
    if (lowStockItems.length > 0) {
      const sample = lowStockItems.slice(0, 3).map(i => `${i.name} (${i.currentStock} ${i.unit})`).join(', ');
      showToast(
        'warning',
        `⚠️ Low Stock Alert (${lowStockItems.length} items)`,
        `Restock required for: ${sample}${lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : ''}`
      );
    } else {
      showToast(
        'info',
        'Stock Engine Healthy',
        `All physical inventory items are currently above the threshold of ${currentSettings.defaultThreshold} units.`
      );
    }
  };

  const handleExportReorderReport = () => {
    const lowItems = products.filter(p => isProductLowStock(p, currentSettings));
    if (lowItems.length === 0) {
      showToast('info', 'No Reorder Needed', 'All inventory stock levels are healthy.');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Min Alert Limit', 'Suggested Reorder Qty', 'Unit Purchase Price', 'Estimated Reorder Cost'];
    const rows = lowItems.map(p => {
      const needed = Math.max(1, (currentSettings.defaultThreshold * 2) - p.currentStock);
      const estCost = needed * (p.purchasePrice || 0);
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku || ''}"`,
        `"${p.category || 'General'}"`,
        p.currentStock,
        p.minStockAlert || currentSettings.defaultThreshold,
        needed,
        p.purchasePrice || 0,
        estCost.toFixed(2)
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Low_Stock_Reorder_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Report Exported', `Generated reorder procurement list for ${lowItems.length} low-stock items.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner: Inventory Health Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">Low Stock & Inventory Control Engine</h3>
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                currentSettings.enabled 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {currentSettings.enabled ? 'ACTIVE MONITORING' : 'MONITORING DISABLED'}
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              Automated threshold monitoring, out-of-stock billing guards, reorder alerts & navigation indicators.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleTestAlert}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/15 cursor-pointer"
            title="Trigger a live low-stock notification test"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300" />
            <span>Test Notification</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Stock Settings'}</span>
          </button>
        </div>
      </div>

      {/* Live Inventory Health Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Tracked Items</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{health.physicalItems}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{health.serviceItems} service items excluded</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold mb-1">
            <span>Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{health.healthyItems}</div>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Above minimum alert limit</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold mb-1">
            <span>Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{health.lowStockItems}</div>
          <p className="text-[11px] text-amber-600/80 mt-0.5">
            {health.criticalItems} in critical red zone
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold mb-1">
            <span>Out of Stock</span>
            <Ban className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{health.outOfStockItems}</div>
          <p className="text-[11px] text-rose-600/80 mt-0.5">0 units available in depot</p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Master Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Master Engine & Thresholds */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Stock Alert Parameters & Limits</h4>
                  <p className="text-[11px] text-slate-500">Configure global default minimum and critical threshold quantities</p>
                </div>
              </div>

              {/* Master Enabled Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSettings.enabled}
                  onChange={e => updateSetting('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default Threshold */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Default Low Stock Threshold (Units)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    Fallback Limit
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Applied to items when individual product threshold is unset or 0.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={currentSettings.defaultThreshold}
                    onChange={e => updateSetting('defaultThreshold', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-1.5 text-sm font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1">
                    {[5, 10, 15, 25].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateSetting('defaultThreshold', val)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          currentSettings.defaultThreshold === val
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Critical Stock Threshold */}
              <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>Critical Emergency Threshold</span>
                  </label>
                  <span className="text-[10px] text-rose-700 font-mono bg-rose-100/70 px-2 py-0.5 rounded border border-rose-200">
                    High Urgency
                  </span>
                </div>
                <p className="text-[11px] text-rose-800/80">
                  Items at or below this level trigger pulsing red alerts and top priority reorder lists.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={currentSettings.defaultThreshold}
                    value={currentSettings.criticalStockThreshold}
                    onChange={e => updateSetting('criticalStockThreshold', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 px-3 py-1.5 text-sm font-bold font-mono text-rose-900 bg-white border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => updateSetting('criticalStockThreshold', val)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          currentSettings.criticalStockThreshold === val
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bulk Apply Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-indigo-900 font-medium">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Synchronize all {health.physicalItems} catalog products to the default threshold of <strong>{currentSettings.defaultThreshold} units</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                Apply to All Items
              </button>
            </div>
          </div>

          {/* Section 2: Invoicing & POS Billing Guard Policy */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Negative Stock & Sales Billing Policy</h4>
                <p className="text-[11px] text-slate-500">Determine system behavior when invoicing items with insufficient stock</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* BLOCK Policy */}
              <button
                type="button"
                onClick={() => {
                  updateSetting('negativeStockBehavior', 'BLOCK');
                  updateSetting('allowNegativeStock', false);
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSettings.negativeStockBehavior === 'BLOCK'
                    ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      <Ban className="w-4 h-4" />
                    </span>
                    {currentSettings.negativeStockBehavior === 'BLOCK' && (
                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">SELECTED</span>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Strict Block (Safe)</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Completely prohibits billing items when current stock is 0 or less than invoiced quantity.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-bold text-rose-700 uppercase tracking-wider">Zero Deficit Guarantee</span>
              </button>

              {/* WARN Policy */}
              <button
                type="button"
                onClick={() => {
                  updateSetting('negativeStockBehavior', 'WARN');
                  updateSetting('allowNegativeStock', true);
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSettings.negativeStockBehavior === 'WARN'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    {currentSettings.negativeStockBehavior === 'WARN' && (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">RECOMMENDED</span>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Warning Alert</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Displays visual warning badges and alerts the operator, but allows the sale to complete.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-bold text-amber-700 uppercase tracking-wider">Retail & Counter Friendly</span>
              </button>

              {/* ALLOW Policy */}
              <button
                type="button"
                onClick={() => {
                  updateSetting('negativeStockBehavior', 'ALLOW');
                  updateSetting('allowNegativeStock', true);
                }}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  currentSettings.negativeStockBehavior === 'ALLOW'
                    ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </span>
                    {currentSettings.negativeStockBehavior === 'ALLOW' && (
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">UNRESTRICTED</span>
                    )}
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">Unrestricted</h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Silently allows negative stock deductions without any interruptions during high-speed invoicing.
                  </p>
                </div>
                <span className="mt-3 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Fast Lane Processing</span>
              </button>
            </div>

            {/* Additional Billing Toggles */}
            <div className="pt-2 space-y-2.5 border-t border-slate-100">
              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800">Real-Time Alert Toast on Threshold Crossing</span>
                  <p className="text-[11px] text-slate-500">
                    Flash a toast notification to the billing operator if an item reaches low stock after a sale.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.notifyOnBilling}
                  onChange={e => updateSetting('notifyOnBilling', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800">Allow Negative Stock Quantities in POS Cart</span>
                  <p className="text-[11px] text-slate-500">
                    Permits POS quick billing operators to increment line quantities above available depot stock.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.allowNegativeStock}
                  onChange={e => updateSetting('allowNegativeStock', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Visual Channels & Auto-Reorder Procurement */}
        <div className="space-y-6">
          {/* Visual Alert Channels */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Notification Channels</h4>
                <p className="text-[11px] text-slate-500">Where stock alerts are surfaced</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800">Navigation Badges</span>
                  <p className="text-[10px] text-slate-500">Show item count on Sidebar & Mobile tabs</p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.showLowStockBadge}
                  onChange={e => updateSetting('showLowStockBadge', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800">Dashboard Procurement Card</span>
                  <p className="text-[10px] text-slate-500">Prominent low stock overview on home dashboard</p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.showDashboardBanner}
                  onChange={e => updateSetting('showDashboardBanner', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-800">Store Manager Digest</span>
                  <p className="text-[10px] text-slate-500">Daily summary alerts for procurement officer</p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.emailAlertDigest || false}
                  onChange={e => updateSetting('emailAlertDigest', e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Smart Reorder & Procurement Config */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Procurement & Auto Reorder</h4>
                <p className="text-[11px] text-slate-500">Supplier replenishment parameters</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Replenishment Multiplier (Units)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={currentSettings.defaultReorderMultiplier}
                    onChange={e => updateSetting('defaultReorderMultiplier', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 text-xs font-bold font-mono text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                  />
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Units / Order</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Suggested restock volume generated when adding low-stock items to Purchase Bills.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={handleExportReorderReport}
                  className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Reorder CSV ({health.lowStockItems} Items)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('purchases')}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Create Supplier Purchase Bill</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Threshold Synchronization */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">Synchronize All Catalog Thresholds?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will set the minimum alert threshold of <strong>{currentSettings.defaultThreshold} units</strong> across all <strong>{health.physicalItems} physical products</strong> in your inventory catalog.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isApplyingBulkThreshold}
                onClick={handleApplyThresholdToAll}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isApplyingBulkThreshold ? 'Updating Items...' : 'Yes, Update All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
