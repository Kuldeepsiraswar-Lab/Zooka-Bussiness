import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, PaymentMethod, InvoiceItem, Party } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateItemGst, recalculateInvoiceTotals } from '../../utils/gstCalculations';
import confetti from 'canvas-confetti';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  QrCode, 
  Printer, 
  CreditCard, 
  Banknote, 
  Percent, 
  Sparkles,
  PackageCheck,
  CheckCircle2,
  Scan,
  Users,
  UserCheck,
  UserPlus,
  Phone,
  MapPin,
  Mail,
  ChevronDown,
  X,
  Check
} from 'lucide-react';

interface CartItem extends InvoiceItem {
  maxStock: number;
}

export const PosBillingView: React.FC = () => {
  const { products, parties, business, createInvoice, createParty, setSelectedInvoiceIdForPrint, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer selection & contacts state
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [saveToContacts, setSaveToContacts] = useState(true);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [discountOverall, setDiscountOverall] = useState<number>(0);

  // Close party dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter contacts matching name or phone
  const matchingParties = parties.filter(p => {
    if (!customerName && !customerPhone) return p.type === 'CUSTOMER' || p.type === 'BOTH';
    const term = (customerName || customerPhone).toLowerCase();
    return (
      (p.type === 'CUSTOMER' || p.type === 'BOTH') &&
      (p.name.toLowerCase().includes(term) ||
       p.phone.includes(term) ||
       (p.companyName && p.companyName.toLowerCase().includes(term)))
    );
  });

  const handleSelectParty = (party: Party) => {
    setSelectedPartyId(party.id);
    setCustomerName(party.name);
    setCustomerPhone(party.phone || '');
    setCustomerEmail(party.email || '');
    setCustomerAddress(party.billingAddress || '');
    setCustomerGstin(party.gstin || '');
    setShowPartyDropdown(false);
    showToast('info', 'Customer Selected', `${party.name} linked from Contacts.`);
  };

  const handleClearPartySelection = () => {
    setSelectedPartyId(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerGstin('');
  };

  // Extract categories
  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(prod => {
    const matchesSearch = 
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.barcode && prod.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === 'ALL' || prod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate cart totals
  const totals = recalculateInvoiceTotals(cart, false); // Intra-state by default for counter sales
  const changeToReturn = Math.max(0, cashTendered - totals.grandTotal);

  // Add product to cart
  const handleAddToCart = (product: Product) => {
    if (!product.isService && product.currentStock <= 0) {
      showToast('warning', 'Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (!product.isService && existing.quantity >= product.currentStock) {
          showToast('warning', 'Stock Limit', `Only ${product.currentStock} units available.`);
          return prev;
        }
        const updatedQty = existing.quantity + 1;
        const calcs = calculateItemGst(product.sellingPrice, updatedQty, existing.discountPercent, product.gstRate, false);
        return prev.map(item => item.productId === product.id ? { ...item, ...calcs } : item);
      } else {
        const calcs = calculateItemGst(product.sellingPrice, 1, 0, product.gstRate, false);
        const newItem: CartItem = {
          id: 'pos-' + Date.now() + Math.random(),
          productId: product.id,
          name: product.name,
          hsnCode: product.hsnCode,
          unit: product.unit,
          maxStock: product.currentStock,
          ...calcs
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null as any;
          if (item.maxStock && newQty > item.maxStock) {
            showToast('warning', 'Max Stock Reached', `Available stock is ${item.maxStock}`);
            return item;
          }
          const calcs = calculateItemGst(item.rate, newQty, item.discountPercent, item.gstRate, false);
          return { ...item, ...calcs };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showToast('error', 'Cart Empty', 'Please add products to the cart first.');
      return;
    }

    let finalPartyId: string | undefined = selectedPartyId || undefined;
    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    // If not explicitly selected from contacts, check if party already exists by phone or name
    if (!finalPartyId && (cleanName || cleanPhone)) {
      const existing = parties.find(p => 
        (cleanPhone && p.phone && p.phone.replace(/[^0-9]/g, '').slice(-10) === cleanPhone.replace(/[^0-9]/g, '').slice(-10)) ||
        (cleanName && cleanName.toLowerCase() !== 'walk-in customer' && p.name.toLowerCase() === cleanName.toLowerCase())
      );

      if (existing) {
        finalPartyId = existing.id;
      } else if (saveToContacts || cleanPhone || (cleanName && cleanName.toLowerCase() !== 'walk-in customer')) {
        // Automatically create new contact in Contacts Master
        const newParty = createParty({
          type: 'CUSTOMER',
          name: cleanName || `Retail Customer ${cleanPhone}`,
          phone: cleanPhone || business.phone,
          email: customerEmail.trim() || undefined,
          gstin: customerGstin.trim() ? customerGstin.trim().toUpperCase() : undefined,
          billingAddress: customerAddress.trim() || 'POS Counter Sale, ' + business.city,
          city: business.city,
          state: business.state,
          stateCode: business.stateCode,
          pincode: business.pincode,
          openingBalance: 0,
          creditLimit: 50000,
          creditPeriodDays: 15
        });
        finalPartyId = newParty.id;
      }
    }

    if (!finalPartyId) {
      // Find standard walkin or fallback
      const walkinParty = parties.find(p => p.id === 'party-3' || p.name.toLowerCase().includes('walk-in'));
      finalPartyId = walkinParty?.id || 'party-retail-walkin';
    }

    // Continue the exact consecutive Tax Invoice numbering series
    const sequentialInvoiceNumber = `${business.invoicePrefix}${String(business.nextInvoiceNumber).padStart(3, '0')}`;
    
    const invoice = createInvoice({
      invoiceNumber: sequentialInvoiceNumber,
      invoiceType: 'TAX_INVOICE',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'PAID',
      sellerGstin: business.gstin,
      sellerStateCode: business.stateCode,
      sellerState: business.state,
      customerId: finalPartyId,
      customerName: cleanName || 'Walk-in Retail Customer',
      customerPhone: cleanPhone || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerGstin: customerGstin.trim() ? customerGstin.trim().toUpperCase() : undefined,
      customerAddress: customerAddress.trim() || 'Counter Retail Sale',
      customerCity: business.city,
      customerState: business.state,
      customerStateCode: business.stateCode,
      placeOfSupplyState: business.state,
      placeOfSupplyStateCode: business.stateCode,
      isInterState: false,
      isReverseCharge: false,
      items: cart,
      subTotalTaxable: totals.subTotalTaxable,
      totalCgst: totals.totalCgst,
      totalSgst: totals.totalSgst,
      totalIgst: 0,
      totalCess: 0,
      totalTax: totals.totalTax,
      totalDiscount: totals.totalDiscount,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      amountPaid: totals.grandTotal,
      amountDue: 0,
      paymentMethod,
      notes: 'Counter POS quick tax invoice'
    });

    // Celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    setCart([]);
    setCashTendered(0);
    setSelectedInvoiceIdForPrint(invoice.id);
  };

  const nextSequentialInvoiceNo = `${business.invoicePrefix}${String(business.nextInvoiceNumber).padStart(3, '0')}`;

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>POS Counter Quick Billing</span>
            <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Live Terminal
            </span>
          </h1>
          <p className="text-xs text-slate-500">Fast barcode lookup, tap-to-add POS cart and thermal receipt printer</p>
        </div>

        {/* Unified Continuous Series Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-indigo-700 uppercase">Tax Invoice No:</span>
            <span className="font-mono font-bold text-xs text-indigo-950 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
              {nextSequentialInvoiceNo}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Continuous Series
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Product Grid & Quick Search (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Search & Category Filter */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Scan barcode or type product name, SKU..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Category chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map(prod => {
              const inCart = cart.find(i => i.productId === prod.id);
              const isOutOfStock = !prod.isService && prod.currentStock <= 0;

              return (
                <button
                  key={prod.id}
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(prod)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group relative cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md active:scale-95'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-slate-600 font-semibold truncate max-w-[80px]">
                        {prod.sku}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                        GST {prod.gstRate}%
                      </span>
                    </div>
                    <h3 className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600 line-clamp-2 leading-snug">
                      {prod.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 font-mono">
                        {formatCurrency(prod.sellingPrice, business.currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {prod.isService ? 'Service' : `${prod.currentStock} in stock`}
                      </div>
                    </div>

                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                      inCart ? 'bg-indigo-600 text-white' : 'bg-slate-100 group-hover:bg-indigo-50 text-slate-700'
                    }`}>
                      {inCart ? (
                        <span className="text-xs font-bold">{inCart.quantity}</span>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                No products found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Right: POS Cart & Checkout Drawer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <h2 className="font-bold text-sm text-slate-900">Current Sale Cart</h2>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {cart.reduce((s, i) => s + i.quantity, 0)} Items
              </span>
            </div>

            {/* Customer & Contacts Selection Bar */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Customer / Contacts</span>
                </div>
                {selectedPartyId ? (
                  <button
                    type="button"
                    onClick={handleClearPartySelection}
                    className="flex items-center gap-1 text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Select Contact ({parties.length})</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Contact Picker Dropdown */}
              {showPartyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 max-h-56 overflow-y-auto space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Select Existing Customer / Contact
                  </div>
                  {matchingParties.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectParty(p)}
                      className="w-full text-left p-2 rounded-lg hover:bg-indigo-50/80 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {p.phone || 'No phone'} {p.companyName ? `• ${p.companyName}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Select
                      </span>
                    </button>
                  ))}
                  {matchingParties.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching contact found
                    </div>
                  )}
                </div>
              )}

              {/* Selected Contact Banner */}
              {selectedPartyId ? (
                <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-indigo-950">{customerName}</div>
                      <div className="text-[10px] text-indigo-700 font-mono">{customerPhone || 'Linked from Contacts'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold bg-indigo-100 text-indigo-800 rounded-full">
                    LINKED CONTACT
                  </span>
                </div>
              ) : (
                /* Customer Name & Phone Inputs */
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setSelectedPartyId(null);
                      }}
                      placeholder="Customer Name"
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setSelectedPartyId(null);
                      }}
                      placeholder="Phone (e.g. 9876543210)"
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  {/* Toggle Extra Fields */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowExtraDetails(!showExtraDetails)}
                      className="text-[10px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {showExtraDetails ? '- Hide details' : '+ Add Email / GSTIN / Address'}
                    </button>

                    <label className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToContacts}
                        onChange={(e) => setSaveToContacts(e.target.checked)}
                        className="w-3 h-3 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span>Save to Contacts</span>
                    </label>
                  </div>

                  {showExtraDetails && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Email Address"
                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                      <input
                        type="text"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value)}
                        placeholder="Customer GSTIN"
                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none uppercase font-mono"
                      />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Address / Locality"
                        className="col-span-2 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {cart.map(item => (
                <div
                  key={item.id}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-slate-900 line-clamp-1">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {item.quantity} x {formatCurrency(item.rate, business.currencySymbol)} (GST {item.gstRate}%)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateQty(item.productId!, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3 text-slate-600" />
                    </button>
                    <span className="w-6 text-center font-bold font-mono">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(item.productId!, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleRemoveFromCart(item.productId!)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Cart is empty. Tap products to add.
                </div>
              )}
            </div>

            {/* Payment & Tender Calculator */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Taxable:</span>
                  <span className="font-mono">{formatCurrency(totals.subTotalTaxable, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (CGST+SGST):</span>
                  <span className="font-mono">{formatCurrency(totals.totalTax, business.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Payable:</span>
                  <span className="font-mono text-base text-indigo-600">
                    {formatCurrency(totals.grandTotal, business.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Payment methods selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Settlement Method
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CASH', 'UPI', 'CREDIT_CARD'] as PaymentMethod[]).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                        paymentMethod === method
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {method === 'CASH' ? '💵 Cash' : method === 'UPI' ? '⚡ UPI QR' : '💳 Card'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash tender calculator if CASH selected */}
              {paymentMethod === 'CASH' && (
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900">Cash Tendered:</span>
                    <input
                      type="number"
                      value={cashTendered || ''}
                      onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                      placeholder={String(totals.grandTotal)}
                      className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-amber-300 rounded-lg focus:outline-none"
                    />
                  </div>
                  {cashTendered > totals.grandTotal && (
                    <div className="flex justify-between font-bold text-emerald-800 text-xs pt-1 border-t border-amber-200">
                      <span>Change Return:</span>
                      <span className="font-mono">{formatCurrency(changeToReturn, business.currencySymbol)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout CTA */}
              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Complete Sale & Print Receipt ({formatCurrency(totals.grandTotal, business.currencySymbol)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
