import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, GstTaxRate } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { COMMON_HSN_CODES, STANDARD_UNITS } from '../../utils/constants';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BarcodeLabelPrintModal } from './BarcodeLabelPrintModal';
import { BulkProductUploadModal } from './BulkProductUploadModal';
import { CustomHsnModal } from '../common/CustomHsnModal';
import { HsnLookupDialog } from '../common/HsnLookupDialog';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Tag, 
  Layers, 
  TrendingUp, 
  Calendar,
  X,
  ArrowUpDown,
  PackagePlus,
  Scan,
  Printer,
  Sparkles,
  Zap,
  FileText,
  Upload,
  FileSpreadsheet,
  Ban,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { 
  normalizeLowStockSettings, 
  getProductStockThreshold, 
  isProductLowStock, 
  isProductCriticalStock, 
  isProductOutOfStock,
  computeInventoryHealth
} from '../../utils/stockUtils';

interface InventoryViewProps {
  onOpenNewInvoiceWithItem?: (product: Product) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onOpenNewInvoiceWithItem }) => {
  const { 
    products, 
    business, 
    customHsnCodes,
    createProduct, 
    bulkCreateProducts, 
    updateProduct, 
    deleteProduct, 
    adjustStock, 
    setActiveTab, 
    showToast,
    can 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Barcode Scanner, Label Print, Bulk CSV Upload & Custom HSN Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCustomHsnModalOpen, setIsCustomHsnModalOpen] = useState(false);
  const [isHsnLookupOpen, setIsHsnLookupOpen] = useState(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<Product | null>(null);

  // Add / Edit Modal
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Physical audit verification');

  // Form fields for product modal
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [hsnCode, setHsnCode] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [gstRate, setGstRate] = useState<GstTaxRate>(18);
  const [currentStock, setCurrentStock] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [isService, setIsService] = useState(false);

  // Batch fields
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];
  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);
  const health = computeInventoryHealth(products, stockSettings);

  const filteredProducts = products.filter(prod => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      prod.name.toLowerCase().includes(q) ||
      prod.sku.toLowerCase().includes(q) ||
      (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
      prod.hsnCode.includes(q);
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    const matchesLowStock = !showLowStockOnly || isProductLowStock(prod, stockSettings);

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const totalInventoryValuation = health.totalValuation;
  const lowStockCount = health.lowStockItems;

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setSku(`SKU-${Date.now().toString().slice(-5)}`);
    setBarcode(`890123${Date.now().toString().slice(-7)}`);
    setDescription('');
    setCategory('General');
    setHsnCode('');
    setUnit('PCS');
    setPurchasePrice(0);
    setSellingPrice(0);
    setGstRate(18);
    setCurrentStock(10);
    setMinStockAlert(stockSettings.defaultThreshold || 5);
    setIsService(false);
    setBatchNo('');
    setExpiryDate('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setDescription(p.description || '');
    setCategory(p.category);
    setHsnCode(p.hsnCode);
    setUnit(p.unit);
    setPurchasePrice(p.purchasePrice);
    setSellingPrice(p.sellingPrice);
    setGstRate(p.gstRate);
    setCurrentStock(p.currentStock);
    setMinStockAlert(p.minStockAlert);
    setIsService(p.isService || false);
    setIsCreateModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Missing Name', 'Product name is required.');
      return;
    }

    const batches = batchNo ? [{
      batchNumber: batchNo,
      mfgDate: new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '2029-12-31',
      stock: currentStock,
      mrp: sellingPrice * 1.15
    }] : undefined;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        sku,
        barcode,
        description,
        category,
        hsnCode,
        unit,
        purchasePrice,
        sellingPrice,
        gstRate,
        currentStock,
        minStockAlert,
        isService,
        batches
      });
    } else {
      createProduct({
        name,
        sku,
        barcode,
        description,
        category,
        hsnCode,
        unit,
        purchasePrice,
        sellingPrice,
        gstRate,
        currentStock,
        minStockAlert,
        isService,
        batches
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleConfirmStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    adjustStock(adjustingProduct.id, newStockQty, adjustReason);
    setAdjustingProduct(null);
  };

  // Handler for adding a scanned item to invoice
  const handleAddToInvoice = (product: Product) => {
    if (onOpenNewInvoiceWithItem) {
      onOpenNewInvoiceWithItem(product);
    } else {
      setActiveTab('invoices');
    }
  };

  const handleOpenPosSale = (product: Product) => {
    setActiveTab('pos_billing');
  };

  const handlePrintLabel = (product: Product) => {
    setSelectedProductForLabel(product);
    setIsLabelPrintOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>Inventory & Stock Management</span>
          </h1>
          <p className="text-xs text-slate-500">
            Catalog, HSN directory, barcode scanner lookup, batch tracking & stock valuation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom HSN Directory */}
          <button
            onClick={() => setIsCustomHsnModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Manage Custom HSN and SAC codes directory"
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>HSN Directory {customHsnCodes.length > 0 && `(${customHsnCodes.length})`}</span>
          </button>

          {/* Barcode Scanner Primary Action */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 rounded-xl shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            title="Scan barcodes to locate stock, view inventory or add directly to invoice"
          >
            <Scan className="w-4 h-4 text-slate-950" />
            <span>Scan Barcode</span>
          </button>

          {can('purchases', 'view') && (
            <button
              onClick={() => setActiveTab('purchases')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Log a supplier purchase bill to automatically add stock"
            >
              <PackagePlus className="w-4 h-4 text-indigo-600" />
              <span>Purchase Bill</span>
            </button>
          )}

          {/* Bulk Import CSV Action */}
          {can('inventory', 'createProduct') && (
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Bulk upload items from CSV file or Excel spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import CSV</span>
            </button>
          )}

          {can('inventory', 'createProduct') && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Items in Catalog</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{products.length}</div>
            <span className="text-[11px] text-slate-400">
              {products.filter(p => !p.isService).length} Goods • {products.filter(p => p.isService).length} Services
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Total Stock Valuation (At Cost)</span>
            <div className="text-2xl font-bold text-indigo-900 mt-1">
              {formatCurrency(totalInventoryValuation, business.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400">Asset value on balance sheet</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500">Low Stock Warnings</span>
            <div className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</div>
            <span className="text-[11px] text-slate-400">Below threshold alerts</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, HSN, or scan barcode..."
            className="w-full pl-9 pr-24 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors cursor-pointer"
            title="Open Barcode Scanner"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
            ))}
          </select>

          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
              showLowStockOnly
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⚠️ Low Stock ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Product Catalog Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Barcode & HSN</th>
                {can('inventory', 'viewPurchaseCost') && (
                  <th className="py-3 px-4 text-right">Purchase (₹)</th>
                )}
                <th className="py-3 px-4 text-right">Selling (₹)</th>
                <th className="py-3 px-4 text-center">GST Rate</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(prod => {
                const effectiveThreshold = getProductStockThreshold(prod, stockSettings);
                const isOutOfStock = isProductOutOfStock(prod);
                const isCritical = isProductCriticalStock(prod, stockSettings);
                const isLow = isProductLowStock(prod, stockSettings);
                const marginPercent = prod.purchasePrice > 0 
                  ? (((prod.sellingPrice - prod.purchasePrice) / prod.purchasePrice) * 100).toFixed(0)
                  : 0;

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{prod.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>SKU: {prod.sku}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">{prod.category}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-slate-800 font-semibold text-[11px]">
                          {prod.barcode || prod.sku}
                        </div>
                        <button
                          onClick={() => handlePrintLabel(prod)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          title="Print Barcode Stickers"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">HSN: {prod.hsnCode}</div>
                    </td>
                    {can('inventory', 'viewPurchaseCost') && (
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatCurrency(prod.purchasePrice, business.currencySymbol)}
                      </td>
                    )}
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                      </div>
                      {can('inventory', 'viewPurchaseCost') && (
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          +{marginPercent}% margin
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                        {prod.gstRate}% GST
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {prod.isService ? (
                        <span className="text-[11px] font-semibold text-indigo-600">Service</span>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span
                            title={`Current: ${prod.currentStock} ${prod.unit} • Threshold: ${effectiveThreshold}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isCritical
                                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {isOutOfStock && <Ban className="w-3 h-3 text-rose-600" />}
                            {isCritical && !isOutOfStock && <ShieldAlert className="w-3 h-3 text-rose-600" />}
                            {isLow && !isCritical && !isOutOfStock && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                            <span>{prod.currentStock} {prod.unit}</span>
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            Min: {effectiveThreshold}
                          </span>
                          {can('inventory', 'adjustStock') && (
                            <button
                              onClick={() => {
                                setAdjustingProduct(prod);
                                setNewStockQty(prod.currentStock);
                              }}
                              className="text-[10px] text-indigo-600 font-medium hover:underline mt-0.5 cursor-pointer"
                            >
                              Adjust Stock
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {can('invoices', 'create') && (
                          <button
                            onClick={() => handleAddToInvoice(prod)}
                            title="Create Invoice with this item"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintLabel(prod)}
                          title="Print Barcode Labels"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {can('inventory', 'editProduct') && (
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            title="Edit Product"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {can('inventory', 'deleteProduct') && (
                          <button
                            onClick={() => deleteProduct(prod.id)}
                            title="Delete Product"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">No items found in catalog</p>
                        <p className="text-xs text-slate-400 mt-0.5">Quickly seed your inventory using CSV bulk upload or add individual items.</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setIsBulkUploadOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Bulk Import CSV</span>
                        </button>
                        <button
                          onClick={handleOpenCreate}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Item</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-lg md:max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Catalog Item' : 'Add New Item / Service'}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Item / Service Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dell 27-inch 4K Monitor"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode / EAN (Scan to fill)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="890123456789"
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Hardware, Electronics, Service..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">HSN / SAC Code</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsHsnLookupOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200/60"
                        title="Lookup HSN in App Dialog Format"
                      >
                        <Search className="w-3 h-3" />
                        <span>App Directory</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCustomHsnModalOpen(true)}
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        <span>Custom</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="inventory-hsn-suggestions"
                      value={hsnCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHsnCode(val);
                        // Auto-match rate from custom codes or standard tariff if exact match
                        const matchCustom = customHsnCodes.find(c => c.code.toLowerCase() === val.trim().toLowerCase());
                        if (matchCustom) {
                          setGstRate(matchCustom.gstRate);
                          if (matchCustom.uqc && matchCustom.uqc !== 'OTH') setUnit(matchCustom.uqc);
                          if (matchCustom.type === 'SAC') setIsService(true);
                        } else {
                          const matchStandard = COMMON_HSN_CODES.find(c => c.code === val.trim());
                          if (matchStandard) {
                            setGstRate(matchStandard.defaultGst as GstTaxRate);
                            if (matchStandard.code.startsWith('99')) setIsService(true);
                          }
                        }
                      }}
                      placeholder="e.g. 8471, 9983, 1006 or custom..."
                      className="w-full px-3 py-2 font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
                    />
                    {hsnCode && (
                      <button
                        type="button"
                        onClick={() => setHsnCode('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        title="Clear HSN"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <datalist id="inventory-hsn-suggestions">
                    {customHsnCodes.map(h => (
                      <option key={`c-${h.id}`} value={h.code}>
                        [Custom] {h.code} - {h.description} ({h.gstRate}%)
                      </option>
                    ))}
                    {COMMON_HSN_CODES.map(h => (
                      <option key={`s-${h.code}`} value={h.code}>
                        {h.code} - {h.description} ({h.defaultGst}%)
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseInt(e.target.value) as GstTaxRate)}
                    className="w-full px-3 py-2 font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5% (Essentials)</option>
                    <option value="12">12% (Standard Slabs)</option>
                    <option value="18">18% (General Goods/Services)</option>
                    <option value="28">28% (Luxury / De-merit)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    disabled={isService}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min. Alert Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
                    disabled={isService}
                    className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Service toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Is this an intangible Service?</span>
                  <span className="text-[11px] text-slate-500">Services do not maintain physical stock inventory</span>
                </div>
                <input
                  type="checkbox"
                  checked={isService}
                  onChange={(e) => setIsService(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Batch info */}
              {!isService && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 uppercase text-[10px]">Batch & Expiry (Optional)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Initial Batch #</label>
                      <input
                        type="text"
                        value={batchNo}
                        onChange={(e) => setBatchNo(e.target.value)}
                        placeholder="BATCH-001"
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Expiry Date</label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {editingProduct ? 'Update Item' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="w-full max-w-[96vw] sm:max-w-md bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Adjust Physical Stock Count
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Item: <strong className="text-slate-800">{adjustingProduct.name}</strong> (Current: {adjustingProduct.currentStock} {adjustingProduct.unit})
            </p>

            <form onSubmit={handleConfirmStockAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Verified Physical Count</label>
                <input
                  type="number"
                  min="0"
                  value={newStockQty}
                  onChange={(e) => setNewStockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-base font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="Physical audit verification">Physical audit verification</option>
                  <option value="Damaged / Expired goods write-off">Damaged / Expired goods write-off</option>
                  <option value="Stock received without invoice">Stock received without invoice</option>
                  <option value="Correction of clerical counting error">Correction of clerical counting error</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Apply Stock Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        currencySymbol={business.currencySymbol}
        onAddToInvoice={handleAddToInvoice}
        onOpenPosSale={handleOpenPosSale}
        onAdjustStock={adjustStock}
        onPrintLabel={handlePrintLabel}
      />

      {/* Barcode Label Print Modal */}
      <BarcodeLabelPrintModal
        isOpen={isLabelPrintOpen}
        onClose={() => setIsLabelPrintOpen(false)}
        product={selectedProductForLabel}
        business={business}
      />

      {/* Bulk CSV Product Upload Modal */}
      <BulkProductUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onImport={(items, updateExisting) => {
          bulkCreateProducts(items, updateExisting);
        }}
        currencySymbol={business.currencySymbol}
      />

      {/* HSN / SAC Code App Lookup Dialog */}
      <HsnLookupDialog
        isOpen={isHsnLookupOpen}
        onClose={() => setIsHsnLookupOpen(false)}
        currentCode={hsnCode}
        onSelect={(item) => {
          setHsnCode(item.code);
          setGstRate(item.gstRate);
          if (item.uqc && item.uqc !== 'OTH') setUnit(item.uqc);
          if (item.type === 'SAC') setIsService(true);
          showToast('success', 'HSN Code Selected', `${item.code} (${item.gstRate}% GST) applied.`);
        }}
        onOpenCustomManager={() => setIsCustomHsnModalOpen(true)}
      />

      {/* Custom HSN & SAC Management Modal */}
      <CustomHsnModal
        isOpen={isCustomHsnModalOpen}
        onClose={() => setIsCustomHsnModalOpen(false)}
        onSelectHsn={(item) => {
          setHsnCode(item.code);
          setGstRate(item.gstRate);
          if (item.uqc && item.uqc !== 'OTH') setUnit(item.uqc);
          if (item.type === 'SAC') setIsService(true);
        }}
      />
    </div>
  );
};
