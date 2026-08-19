import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  X, 
  FileText, 
  Users, 
  Package, 
  Truck, 
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (id: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectInvoice
}) => {
  const { invoices, products, parties, purchaseBills, setActiveTab } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const filteredInvoices = cleanQuery
    ? invoices.filter(
        i =>
          i.invoiceNumber.toLowerCase().includes(cleanQuery) ||
          i.customerName.toLowerCase().includes(cleanQuery) ||
          (i.customerGstin && i.customerGstin.toLowerCase().includes(cleanQuery))
      ).slice(0, 5)
    : invoices.slice(0, 4);

  const filteredProducts = cleanQuery
    ? products.filter(
        p =>
          p.name.toLowerCase().includes(cleanQuery) ||
          p.sku.toLowerCase().includes(cleanQuery) ||
          p.hsnCode.includes(cleanQuery) ||
          p.category.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : products.slice(0, 3);

  const filteredParties = cleanQuery
    ? parties.filter(
        p =>
          p.name.toLowerCase().includes(cleanQuery) ||
          (p.gstin && p.gstin.toLowerCase().includes(cleanQuery)) ||
          p.phone.includes(cleanQuery) ||
          p.city.toLowerCase().includes(cleanQuery)
      ).slice(0, 5)
    : parties.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search invoices by #, parties by name/GSTIN, products by HSN/SKU..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full text-sm bg-transparent outline-none text-slate-900 placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-slate-500 bg-white rounded border border-slate-200 shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 divide-y divide-slate-100">
          {/* Invoices Section */}
          {filteredInvoices.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Invoices & Sales
                </span>
                <span>{filteredInvoices.length} results</span>
              </div>
              <div className="space-y-1">
                {filteredInvoices.map(inv => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      onSelectInvoice(inv.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                        INV
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{inv.invoiceNumber}</span>
                          <span className="text-slate-400 font-normal">• {inv.customerName}</span>
                          {inv.isEinvoiceGenerated && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                              IRN Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{inv.invoiceDate}</span>
                          <span>•</span>
                          <span>POS: {inv.placeOfSupplyState}</span>
                          {inv.customerGstin && <span>• GSTIN: {inv.customerGstin}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatINR(inv.grandTotal)}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products & Inventory Section */}
          {filteredProducts.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Inventory & Products
                </span>
                <span>{filteredProducts.length} items</span>
              </div>
              <div className="space-y-1">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setActiveTab('inventory');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        {prod.unit || 'PCS'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{prod.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 px-1 rounded">HSN: {prod.hsnCode}</span>
                          <span>•</span>
                          <span>Category: {prod.category}</span>
                          <span>•</span>
                          <span className="font-medium text-emerald-600">{prod.gstRate}% GST</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatINR(prod.sellingPrice)}</div>
                      <div className={`text-[11px] font-semibold ${prod.currentStock <= prod.minStockAlert ? 'text-rose-600' : 'text-slate-600'}`}>
                        {prod.isService ? 'Service' : `${prod.currentStock} in Stock`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parties Section */}
          {filteredParties.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 px-2 mb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-500" />
                  Parties & Clients
                </span>
                <span>{filteredParties.length} found</span>
              </div>
              <div className="space-y-1">
                {filteredParties.map(party => (
                  <div
                    key={party.id}
                    onClick={() => {
                      setActiveTab('parties');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-50/70 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-[10px]">
                        {party.type === 'VENDOR' ? 'VEN' : 'CUST'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{party.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          {party.gstin ? (
                            <span className="font-mono text-indigo-600 font-medium">GSTIN: {party.gstin}</span>
                          ) : (
                            <span className="text-slate-400">Unregistered Consumer</span>
                          )}
                          <span>•</span>
                          <span>{party.city}, {party.state}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${party.currentBalance > 0 ? 'text-amber-700' : party.currentBalance < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                        {formatINR(Math.abs(party.currentBalance))}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {party.currentBalance > 0 ? 'Receivable' : party.currentBalance < 0 ? 'Payable' : 'Settled'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredInvoices.length === 0 && filteredProducts.length === 0 && filteredParties.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching with a GSTIN number, HSN code, or invoice number.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>Navigation: Click to view details</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Press</span>
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px]">ESC</kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
