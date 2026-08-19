import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calculator, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  Layers, 
  FileText, 
  ShieldCheck, 
  Scale, 
  ArrowUpRight, 
  ArrowDownLeft,
  Info,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Filter,
  Printer,
  RefreshCw,
  X,
  Building2,
  Tag,
  Truck
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { HSN_MASTER_LIST } from '../../utils/constants';

type GstTabType = 'gstr1' | 'gstr3b' | 'sale_register' | 'purchase_register' | 'hsn_finder';
type FilterMode = 'month' | 'date_range';

export const GstReturnsView: React.FC = () => {
  const { business, invoices, purchaseBills, showToast } = useApp();
  
  const [returnType, setReturnType] = useState<GstTabType>('sale_register');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('August 2026');
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');

  // -------------------------------------------------------------
  // SALES & PURCHASE REGISTER FILTERS (Month & Date Filters)
  // -------------------------------------------------------------
  const [filterMode, setFilterMode] = useState<FilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08'); // YYYY-MM or 'ALL' or 'Q2_2026' or 'FY_2026_27'
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Specific register filters
  const [salesTypeFilter, setSalesTypeFilter] = useState<'ALL' | 'B2B' | 'B2C' | 'INTER_STATE' | 'INTRA_STATE' | 'POS'>('ALL');
  const [purchaseItcFilter, setPurchaseItcFilter] = useState<'ALL' | 'ELIGIBLE_ALL' | 'ELIGIBLE_CAPITAL_GOODS' | 'INELIGIBLE_17_5' | 'INTER_STATE' | 'INTRA_STATE'>('ALL');

  // Quick Date Range helper
  const handleQuickPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_FY' | 'ALL_TIME') => {
    if (preset === 'THIS_MONTH') {
      setFilterMode('month');
      setSelectedMonth('2026-08');
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
    } else if (preset === 'LAST_MONTH') {
      setFilterMode('month');
      setSelectedMonth('2026-07');
      setStartDate('2026-07-01');
      setEndDate('2026-07-31');
    } else if (preset === 'THIS_QUARTER') {
      setFilterMode('month');
      setSelectedMonth('Q2_2026');
      setStartDate('2026-07-01');
      setEndDate('2026-09-30');
    } else if (preset === 'THIS_FY') {
      setFilterMode('month');
      setSelectedMonth('FY_2026_27');
      setStartDate('2026-04-01');
      setEndDate('2027-03-31');
    } else if (preset === 'ALL_TIME') {
      setFilterMode('month');
      setSelectedMonth('ALL');
      setStartDate('');
      setEndDate('');
    }
  };

  // Helper date checker
  const isDateInRange = (dateStr: string): boolean => {
    if (!dateStr) return true;
    if (filterMode === 'month') {
      if (selectedMonth === 'ALL') return true;
      if (selectedMonth === 'Q1_2026') return dateStr >= '2026-04-01' && dateStr <= '2026-06-30';
      if (selectedMonth === 'Q2_2026') return dateStr >= '2026-07-01' && dateStr <= '2026-09-30';
      if (selectedMonth === 'FY_2026_27') return dateStr >= '2026-04-01' && dateStr <= '2027-03-31';
      return dateStr.startsWith(selectedMonth);
    } else {
      // Date Range mode
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
    }
  };

  // -------------------------------------------------------------
  // FILTERED SALES REGISTER DATA
  // -------------------------------------------------------------
  const filteredSalesInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.status === 'CANCELLED') return false;

      // 1. Date / Month Filter
      if (!isDateInRange(inv.invoiceDate)) return false;

      // 2. Search Query (Invoice #, Customer Name, GSTIN, State)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInv = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesCust = inv.customerName.toLowerCase().includes(q);
        const matchesGstin = (inv.customerGstin || '').toLowerCase().includes(q);
        const matchesState = (inv.placeOfSupplyState || inv.customerState || '').toLowerCase().includes(q);
        if (!matchesInv && !matchesCust && !matchesGstin && !matchesState) return false;
      }

      // 3. Tax / Supply Category Filter
      if (salesTypeFilter === 'B2B') {
        return Boolean(inv.customerGstin && inv.customerGstin.trim().length === 15);
      }
      if (salesTypeFilter === 'B2C') {
        return !inv.customerGstin || inv.customerGstin.trim().length < 15;
      }
      if (salesTypeFilter === 'INTER_STATE') {
        return inv.isInterState;
      }
      if (salesTypeFilter === 'INTRA_STATE') {
        return !inv.isInterState;
      }
      if (salesTypeFilter === 'POS') {
        return inv.invoiceType === 'POS_SALE' || inv.notes?.toLowerCase().includes('pos');
      }

      return true;
    });
  }, [invoices, filterMode, selectedMonth, startDate, endDate, searchQuery, salesTypeFilter]);

  // Sales Register Aggregates
  const salesTotals = useMemo(() => {
    return filteredSalesInvoices.reduce((acc, inv) => {
      acc.count += 1;
      acc.taxable += inv.subTotalTaxable || 0;
      acc.cgst += inv.totalCgst || 0;
      acc.sgst += inv.totalSgst || 0;
      acc.igst += inv.totalIgst || 0;
      acc.cess += inv.totalCess || 0;
      acc.totalTax += inv.totalTax || 0;
      acc.grandTotal += inv.grandTotal || 0;
      return acc;
    }, { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, totalTax: 0, grandTotal: 0 });
  }, [filteredSalesInvoices]);

  // -------------------------------------------------------------
  // FILTERED PURCHASE REGISTER DATA
  // -------------------------------------------------------------
  const filteredPurchaseBills = useMemo(() => {
    return purchaseBills.filter(bill => {
      // 1. Date / Month Filter
      if (!isDateInRange(bill.billDate)) return false;

      // 2. Search Query (Bill #, Vendor Name, GSTIN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesBill = bill.billNumber.toLowerCase().includes(q) || (bill.vendorInvoiceNumber || '').toLowerCase().includes(q);
        const matchesVendor = bill.vendorName.toLowerCase().includes(q);
        const matchesGstin = (bill.vendorGstin || '').toLowerCase().includes(q);
        if (!matchesBill && !matchesVendor && !matchesGstin) return false;
      }

      // 3. ITC Eligibility Filter
      if (purchaseItcFilter === 'ELIGIBLE_ALL') {
        return bill.itcEligibility === 'ELIGIBLE_ALL';
      }
      if (purchaseItcFilter === 'ELIGIBLE_CAPITAL_GOODS') {
        return bill.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS';
      }
      if (purchaseItcFilter === 'INELIGIBLE_17_5') {
        return bill.itcEligibility === 'INELIGIBLE_17_5';
      }
      if (purchaseItcFilter === 'INTER_STATE') {
        return bill.isInterState;
      }
      if (purchaseItcFilter === 'INTRA_STATE') {
        return !bill.isInterState;
      }

      return true;
    });
  }, [purchaseBills, filterMode, selectedMonth, startDate, endDate, searchQuery, purchaseItcFilter]);

  // Purchase Register Aggregates
  const purchaseTotals = useMemo(() => {
    return filteredPurchaseBills.reduce((acc, bill) => {
      acc.count += 1;
      acc.taxable += bill.subTotalTaxable || 0;
      acc.cgst += bill.totalCgst || 0;
      acc.sgst += bill.totalSgst || 0;
      acc.igst += bill.totalIgst || 0;
      acc.totalTax += bill.totalTax || 0;
      acc.grandTotal += bill.grandTotal || 0;
      if (bill.itcEligibility !== 'INELIGIBLE_17_5') {
        acc.eligibleItc += bill.totalTax || 0;
      } else {
        acc.blockedItc += bill.totalTax || 0;
      }
      return acc;
    }, { count: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0, grandTotal: 0, eligibleItc: 0, blockedItc: 0 });
  }, [filteredPurchaseBills]);

  // -------------------------------------------------------------
  // CSV EXPORT HANDLERS
  // -------------------------------------------------------------
  const handleExportSalesCsv = () => {
    if (filteredSalesInvoices.length === 0) {
      showToast('error', 'No Data to Export', 'No sales records match the selected date/month filter.');
      return;
    }

    const headers = [
      'Sr No',
      'Invoice Date',
      'Invoice Number',
      'Invoice Type',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Supply Type',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Cess (INR)',
      'Total GST (INR)',
      'Invoice Value (INR)',
      'Payment Status'
    ];

    const rows = filteredSalesInvoices.map((inv, idx) => [
      idx + 1,
      inv.invoiceDate,
      `"${inv.invoiceNumber}"`,
      inv.invoiceType,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      inv.customerGstin || 'Unregistered / B2C',
      `"${inv.placeOfSupplyStateCode} - ${inv.placeOfSupplyState}"`,
      inv.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
      inv.subTotalTaxable.toFixed(2),
      inv.totalCgst.toFixed(2),
      inv.totalSgst.toFixed(2),
      inv.totalIgst.toFixed(2),
      inv.totalCess.toFixed(2),
      inv.totalTax.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Sale_Register_${business.gstin || 'Tax'}_${filterMode === 'month' ? selectedMonth : 'Custom'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Sale Register Exported', `Exported ${filteredSalesInvoices.length} sales records to CSV.`);
  };

  const handleExportPurchaseCsv = () => {
    if (filteredPurchaseBills.length === 0) {
      showToast('error', 'No Data to Export', 'No purchase records match the selected date/month filter.');
      return;
    }

    const headers = [
      'Sr No',
      'Bill Date',
      'Internal Bill No',
      'Vendor Inv No',
      'Vendor Name',
      'Vendor GSTIN',
      'Supply Type',
      'ITC Eligibility',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total GST / ITC (INR)',
      'Bill Grand Total (INR)',
      'Payment Status'
    ];

    const rows = filteredPurchaseBills.map((bill, idx) => [
      idx + 1,
      bill.billDate,
      `"${bill.billNumber}"`,
      `"${bill.vendorInvoiceNumber || ''}"`,
      `"${bill.vendorName.replace(/"/g, '""')}"`,
      bill.vendorGstin || 'Unregistered',
      bill.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
      bill.itcEligibility,
      bill.subTotalTaxable.toFixed(2),
      bill.totalCgst.toFixed(2),
      bill.totalSgst.toFixed(2),
      bill.totalIgst.toFixed(2),
      bill.totalTax.toFixed(2),
      bill.grandTotal.toFixed(2),
      bill.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GST_Purchase_Register_${business.gstin || 'Tax'}_${filterMode === 'month' ? selectedMonth : 'Custom'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Purchase Register Exported', `Exported ${filteredPurchaseBills.length} purchase records to CSV.`);
  };

  // -------------------------------------------------------------
  // GSTR-1 CALCULATIONS (Standard Statutory View)
  // -------------------------------------------------------------
  const activeInvoices = invoices.filter(i => i.status !== 'CANCELLED');
  const b2bInvoices = activeInvoices.filter(i => Boolean(i.customerGstin && i.customerGstin.trim().length === 15));
  const b2csInvoices = activeInvoices.filter(i => !i.customerGstin && !(i.isInterState && i.grandTotal > 250000));
  
  // HSN Summary aggregation
  const hsnSummaryMap: { [hsn: string]: { hsn: string; desc: string; uqc: string; qty: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number; total: number } } = {};
  activeInvoices.forEach(inv => {
    inv.items.forEach(item => {
      const code = item.hsnCode || '9999';
      if (!hsnSummaryMap[code]) {
        hsnSummaryMap[code] = {
          hsn: code,
          desc: item.name,
          uqc: item.unit || 'NOS',
          qty: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cess: 0,
          total: 0
        };
      }
      hsnSummaryMap[code].qty += item.quantity;
      hsnSummaryMap[code].taxable += item.taxableAmount;
      hsnSummaryMap[code].cgst += item.cgstAmount;
      hsnSummaryMap[code].sgst += item.sgstAmount;
      hsnSummaryMap[code].igst += item.igstAmount;
      hsnSummaryMap[code].cess += item.cessAmount || 0;
      hsnSummaryMap[code].total += item.totalAmount;
    });
  });
  const hsnSummaryList = Object.values(hsnSummaryMap);

  const b2bTaxable = b2bInvoices.reduce((s, i) => s + i.subTotalTaxable, 0);
  const b2csTaxable = b2csInvoices.reduce((s, i) => s + i.subTotalTaxable, 0);
  const b2csCgst = b2csInvoices.reduce((s, i) => s + i.totalCgst, 0);
  const b2csSgst = b2csInvoices.reduce((s, i) => s + i.totalSgst, 0);

  const totalOutwardTaxable = activeInvoices.reduce((s, i) => s + i.subTotalTaxable, 0);
  const totalOutwardCgst = activeInvoices.reduce((s, i) => s + i.totalCgst, 0);
  const totalOutwardSgst = activeInvoices.reduce((s, i) => s + i.totalSgst, 0);
  const totalOutwardIgst = activeInvoices.reduce((s, i) => s + i.totalIgst, 0);
  const totalOutwardTax = activeInvoices.reduce((s, i) => s + i.totalTax, 0);

  // -------------------------------------------------------------
  // GSTR-3B CALCULATIONS (Eligible ITC from Purchases)
  // -------------------------------------------------------------
  const eligiblePurchases = purchaseBills.filter(b => b.itcEligibility !== 'INELIGIBLE_17_5');
  const totalItcCgst = eligiblePurchases.reduce((s, b) => s + b.totalCgst, 0);
  const totalItcSgst = eligiblePurchases.reduce((s, b) => s + b.totalSgst, 0);
  const totalItcIgst = eligiblePurchases.reduce((s, b) => s + b.totalIgst, 0);
  const totalItcAvailable = eligiblePurchases.reduce((s, b) => s + b.totalTax, 0);
  const blockedPurchases = purchaseBills.filter(b => b.itcEligibility === 'INELIGIBLE_17_5');
  const totalBlockedItc = blockedPurchases.reduce((s, b) => s + b.totalTax, 0);

  const netCgstPayable = Math.max(0, totalOutwardCgst - totalItcCgst);
  const netSgstPayable = Math.max(0, totalOutwardSgst - totalItcSgst);
  const netIgstPayable = Math.max(0, totalOutwardIgst - totalItcIgst);
  const totalNetCashPayable = netCgstPayable + netSgstPayable + netIgstPayable;

  // JSON Download for GSTR-1
  const handleDownloadGstr1Json = () => {
    const gstr1Data = {
      gstin: business.gstin,
      fp: '082026',
      cur_gt: totalOutwardTaxable,
      b2b: b2bInvoices.map(inv => ({
        ctin: inv.customerGstin,
        inv: [{
          inum: inv.invoiceNumber,
          idt: inv.invoiceDate,
          val: inv.grandTotal,
          pos: inv.placeOfSupplyStateCode,
          rchrg: inv.isReverseCharge ? 'Y' : 'N',
          inv_typ: 'R',
          itms: inv.items.map(it => ({
            num: 1,
            itm_det: {
              rt: it.gstRate,
              txval: it.taxableAmount,
              iamt: it.igstAmount,
              camt: it.cgstAmount,
              samt: it.sgstAmount,
              csamt: it.cessAmount || 0
            }
          }))
        }]
      })),
      b2cs: [
        {
          sply_ty: 'INTRA',
          rt: 18,
          txval: b2csTaxable,
          camt: b2csCgst,
          samt: b2csSgst,
          iamt: 0,
          csamt: 0
        }
      ],
      hsn: {
        data: hsnSummaryList.map((h, i) => ({
          num: i + 1,
          hsn_sc: h.hsn,
          desc: h.desc,
          uqc: h.uqc,
          qty: h.qty,
          val: h.total,
          txval: h.taxable,
          iamt: h.igst,
          camt: h.cgst,
          samt: h.sgst,
          csamt: h.cess
        }))
      },
      doc_issue: {
        doc_det: [{
          doc_num: 1,
          doc_typ: 'Invoices for outward supply',
          from: invoices[invoices.length - 1]?.invoiceNumber || 'INV-0001',
          to: invoices[0]?.invoiceNumber || 'INV-0001',
          totnum: invoices.length,
          canc: invoices.filter(i => i.status === 'CANCELLED').length,
          net_issue: activeInvoices.length
        }]
      }
    };

    const blob = new Blob([JSON.stringify(gstr1Data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${business.gstin}_082026.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'GSTR-1 JSON Exported', 'Valid JSON file generated for GST Offline Utility.');
  };

  const filteredHsnMaster = HSN_MASTER_LIST.filter(
    h => h.code.includes(hsnSearchQuery) || h.description.toLowerCase().includes(hsnSearchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-indigo-600" />
            GST Returns & Statutory Registers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete GST compliance center with Sale Register, Purchase Register, GSTR-1, GSTR-3B and HSN directory.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {returnType === 'sale_register' && (
            <button
              onClick={handleExportSalesCsv}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Sales CSV</span>
            </button>
          )}

          {returnType === 'purchase_register' && (
            <button
              onClick={handleExportPurchaseCsv}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Purchase CSV</span>
            </button>
          )}

          {(returnType === 'sale_register' || returnType === 'purchase_register') && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Print current register"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>
          )}

          {returnType === 'gstr1' && (
            <button
              onClick={handleDownloadGstr1Json}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Portal JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Switch Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setReturnType('sale_register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'sale_register'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Sale Register (Outward Tax)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {filteredSalesInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setReturnType('purchase_register')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'purchase_register'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>Purchase Register (Inward & ITC)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {filteredPurchaseBills.length}
          </span>
        </button>

        <button
          onClick={() => setReturnType('gstr1')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'gstr1'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          GSTR-1 (Outward Supplies Return)
        </button>

        <button
          onClick={() => setReturnType('gstr3b')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'gstr3b'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          GSTR-3B (Summary Return & ITC Offset)
        </button>

        <button
          onClick={() => setReturnType('hsn_finder')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            returnType === 'hsn_finder'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          HSN / SAC Master Finder
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FILTER CONTROL BAR (Used by Sale Register & Purchase Register)    */}
      {/* ------------------------------------------------------------------ */}
      {(returnType === 'sale_register' || returnType === 'purchase_register') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Mode Toggle & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'month'
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Filter by Month
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('date_range')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === 'date_range'
                      ? 'bg-white text-indigo-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Filter by Date Range
                </button>
              </div>

              {/* Month Dropdown Selector */}
              {filterMode === 'month' ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-slate-500 font-semibold">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="2026-08">August 2026 (Current)</option>
                    <option value="2026-07">July 2026</option>
                    <option value="2026-06">June 2026</option>
                    <option value="2026-05">May 2026</option>
                    <option value="2026-04">April 2026</option>
                    <option value="2026-03">March 2026</option>
                    <option value="2026-02">February 2026</option>
                    <option value="2026-01">January 2026</option>
                    <option value="Q2_2026">Q2 (Jul - Sep 2026)</option>
                    <option value="Q1_2026">Q1 (Apr - Jun 2026)</option>
                    <option value="FY_2026_27">Full Financial Year (2026-27)</option>
                    <option value="ALL">All Records (No Month Filter)</option>
                  </select>
                </div>
              ) : (
                /* Date Range Pickers */
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-slate-400 font-medium">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="font-semibold text-slate-800 bg-transparent outline-none cursor-pointer text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                    <span className="text-slate-400 font-medium">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="font-semibold text-slate-800 bg-transparent outline-none cursor-pointer text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('THIS_MONTH')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('LAST_MONTH')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('THIS_QUARTER')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  This Quarter
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('ALL_TIME')}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  All
                </button>
              </div>
            </div>

            {/* Right: Search & Sub-Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={returnType === 'sale_register' ? 'Search buyer, GSTIN, invoice #...' : 'Search vendor, bill #, GSTIN...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sales Category Filter */}
              {returnType === 'sale_register' && (
                <select
                  value={salesTypeFilter}
                  onChange={(e) => setSalesTypeFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Supply Types</option>
                  <option value="B2B">B2B Registered Invoices</option>
                  <option value="B2C">B2C Retail Sales</option>
                  <option value="INTER_STATE">Inter-State (IGST)</option>
                  <option value="INTRA_STATE">Intra-State (CGST+SGST)</option>
                  <option value="POS">POS Quick Sales</option>
                </select>
              )}

              {/* Purchase ITC Filter */}
              {returnType === 'purchase_register' && (
                <select
                  value={purchaseItcFilter}
                  onChange={(e) => setPurchaseItcFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Inward Bills</option>
                  <option value="ELIGIBLE_ALL">Eligible ITC (Input Goods/Services)</option>
                  <option value="ELIGIBLE_CAPITAL_GOODS">Eligible Capital Goods</option>
                  <option value="INELIGIBLE_17_5">Ineligible ITC (Sec 17(5) Blocked)</option>
                  <option value="INTER_STATE">Inter-State Purchases (IGST)</option>
                  <option value="INTRA_STATE">Intra-State Purchases (CGST+SGST)</option>
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: SALE REGISTER                                                 */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'sale_register' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Invoices</div>
              <div className="text-lg font-black text-slate-900 mt-1">{salesTotals.count}</div>
              <div className="text-[10px] text-slate-500">Tax & Retail Invoices</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxable Value</div>
              <div className="text-lg font-black text-indigo-900 mt-1">{formatINR(salesTotals.taxable)}</div>
              <div className="text-[10px] text-slate-500">Net Taxable Turnover</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CGST Output</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(salesTotals.cgst)}</div>
              <div className="text-[10px] text-slate-500">Central Tax Output</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SGST Output</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(salesTotals.sgst)}</div>
              <div className="text-[10px] text-slate-500">State / UT Tax Output</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IGST Output</div>
              <div className="text-lg font-black text-indigo-600 mt-1">{formatINR(salesTotals.igst)}</div>
              <div className="text-[10px] text-slate-500">Integrated Tax Output</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Gross Total (Tax Incl.)</div>
              <div className="text-lg font-black text-indigo-950 mt-1">{formatINR(salesTotals.grandTotal)}</div>
              <div className="text-[10px] text-indigo-700">Total GST: {formatINR(salesTotals.totalTax)}</div>
            </div>
          </div>

          {/* Sales Register Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>GST Sales Outward Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed statutory record of outward tax invoices and retail sales
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  {filteredSalesInvoices.length} invoices found
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Invoice No.</th>
                    <th className="py-3 px-4">Buyer / Customer Name</th>
                    <th className="py-3 px-3">GSTIN</th>
                    <th className="py-3 px-3">Place of Supply</th>
                    <th className="py-3 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3 px-3 text-right">CGST (₹)</th>
                    <th className="py-3 px-3 text-right">SGST (₹)</th>
                    <th className="py-3 px-3 text-right">IGST (₹)</th>
                    <th className="py-3 px-3 text-right">Total Tax (₹)</th>
                    <th className="py-3 px-3 text-right">Invoice Total (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesInvoices.length > 0 ? (
                    filteredSalesInvoices.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{inv.invoiceDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                          {inv.customerName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {inv.customerGstin ? (
                            <span className="text-indigo-700 font-bold">{inv.customerGstin}</span>
                          ) : (
                            <span className="text-slate-400 italic">B2C / Unregistered</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          <span className="font-mono">{inv.placeOfSupplyStateCode}</span> - {inv.placeOfSupplyState}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatINR(inv.subTotalTaxable)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {inv.totalCgst > 0 ? formatINR(inv.totalCgst) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {inv.totalSgst > 0 ? formatINR(inv.totalSgst) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-semibold">
                          {inv.totalIgst > 0 ? formatINR(inv.totalIgst) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {formatINR(inv.totalTax)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(inv.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calculator className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">No Sales Invoices Found</p>
                          <p className="text-xs text-slate-400">
                            Try choosing a different month or expanding the date filter range above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Footer with Summary Sums */}
                {filteredSalesInvoices.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={6} className="py-3 px-4 text-right uppercase text-xs tracking-wider">
                        Total for {filteredSalesInvoices.length} Invoices:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{formatINR(salesTotals.taxable)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">{formatINR(salesTotals.cgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">{formatINR(salesTotals.sgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-indigo-700">{formatINR(salesTotals.igst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-indigo-900">{formatINR(salesTotals.totalTax)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800 font-extrabold">{formatINR(salesTotals.grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: PURCHASE REGISTER                                             */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'purchase_register' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchase Bills</div>
              <div className="text-lg font-black text-slate-900 mt-1">{purchaseTotals.count}</div>
              <div className="text-[10px] text-slate-500">Inward Supplies</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxable Purchases</div>
              <div className="text-lg font-black text-indigo-900 mt-1">{formatINR(purchaseTotals.taxable)}</div>
              <div className="text-[10px] text-slate-500">Inward Taxable Value</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CGST Input</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(purchaseTotals.cgst)}</div>
              <div className="text-[10px] text-slate-500">Central Tax Input</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SGST Input</div>
              <div className="text-lg font-black text-slate-800 mt-1">{formatINR(purchaseTotals.sgst)}</div>
              <div className="text-[10px] text-slate-500">State / UT Tax Input</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IGST Input</div>
              <div className="text-lg font-black text-indigo-600 mt-1">{formatINR(purchaseTotals.igst)}</div>
              <div className="text-[10px] text-slate-500">Integrated Tax Input</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Eligible ITC Input</div>
              <div className="text-lg font-black text-emerald-950 mt-1">{formatINR(purchaseTotals.eligibleItc)}</div>
              <div className="text-[10px] text-emerald-700">Gross: {formatINR(purchaseTotals.grandTotal)}</div>
            </div>
          </div>

          {/* Purchase Register Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  <span>GST Purchase Inward Register & ITC Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statutory inward purchase bills, vendor GSTIN reconciliation and ITC eligibility
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  {filteredPurchaseBills.length} bills recorded
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Bill / Ref No.</th>
                    <th className="py-3 px-4">Supplier / Vendor Name</th>
                    <th className="py-3 px-3">Vendor GSTIN</th>
                    <th className="py-3 px-3">Supply Type</th>
                    <th className="py-3 px-3">ITC Status</th>
                    <th className="py-3 px-3 text-right">Taxable (₹)</th>
                    <th className="py-3 px-3 text-right">CGST (₹)</th>
                    <th className="py-3 px-3 text-right">SGST (₹)</th>
                    <th className="py-3 px-3 text-right">IGST (₹)</th>
                    <th className="py-3 px-3 text-right">Total Tax (₹)</th>
                    <th className="py-3 px-3 text-right">Bill Total (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchaseBills.length > 0 ? (
                    filteredPurchaseBills.map((bill, idx) => (
                      <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{bill.billDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {bill.billNumber}
                          {bill.vendorInvoiceNumber && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              Ref: {bill.vendorInvoiceNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                          {bill.vendorName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {bill.vendorGstin ? (
                            <span className="text-emerald-700 font-bold">{bill.vendorGstin}</span>
                          ) : (
                            <span className="text-slate-400 italic">Unregistered Vendor</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            bill.isInterState ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {bill.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.itcEligibility === 'INELIGIBLE_17_5'
                              ? 'bg-rose-100 text-rose-800'
                              : bill.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {bill.itcEligibility === 'INELIGIBLE_17_5'
                              ? 'Blocked Sec 17(5)'
                              : bill.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS'
                              ? 'Capital Goods'
                              : 'Eligible ITC'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          {formatINR(bill.subTotalTaxable)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {bill.totalCgst > 0 ? formatINR(bill.totalCgst) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {bill.totalSgst > 0 ? formatINR(bill.totalSgst) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-semibold">
                          {bill.totalIgst > 0 ? formatINR(bill.totalIgst) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {formatINR(bill.totalTax)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(bill.grandTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            bill.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : bill.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Truck className="w-8 h-8 text-slate-300" />
                          <p className="text-sm font-semibold text-slate-600">No Purchase Bills Found</p>
                          <p className="text-xs text-slate-400">
                            Try choosing a different month or date range in the filter above.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Table Footer with Summary Sums */}
                {filteredPurchaseBills.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={7} className="py-3 px-4 text-right uppercase text-xs tracking-wider">
                        Total for {filteredPurchaseBills.length} Inward Bills:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{formatINR(purchaseTotals.taxable)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">{formatINR(purchaseTotals.cgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-700">{formatINR(purchaseTotals.sgst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-indigo-700">{formatINR(purchaseTotals.igst)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-emerald-800">{formatINR(purchaseTotals.totalTax)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs text-slate-950 font-extrabold">{formatINR(purchaseTotals.grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: GSTR-1 RETURN                                                 */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'gstr1' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Total Taxable Outward</div>
              <div className="text-xl font-extrabold text-slate-900">{formatINR(totalOutwardTaxable)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{activeInvoices.length} active invoices</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Total Output Tax (IGST+CGST+SGST)</div>
              <div className="text-xl font-extrabold text-indigo-600">{formatINR(totalOutwardTax)}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                CGST: {formatINR(totalOutwardCgst)} • SGST: {formatINR(totalOutwardSgst)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">4A - B2B Registered Sales</div>
              <div className="text-xl font-extrabold text-emerald-700">{formatINR(b2bTaxable)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{b2bInvoices.length} Registered Buyers</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">7 - B2C Small & Retail</div>
              <div className="text-xl font-extrabold text-cyan-700">{formatINR(b2csTaxable)}</div>
              <div className="text-[11px] text-slate-500 mt-1">{b2csInvoices.length} Unregistered invoices</div>
            </div>
          </div>

          {/* Table 4A: B2B Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono text-xs">Table 4A</span>
                  B2B Tax Invoices (Registered Recipient)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Supplies made to GST registered buyers eligible for buyer ITC</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {b2bInvoices.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">GSTIN of Recipient</th>
                    <th className="py-2.5 px-4">Receiver Name</th>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Invoice Value</th>
                    <th className="py-2.5 px-4">Place of Supply</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">CGST</th>
                    <th className="py-2.5 px-4 text-right">SGST</th>
                    <th className="py-2.5 px-4 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b2bInvoices.length > 0 ? (
                    b2bInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">{inv.customerGstin}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{inv.customerName}</td>
                        <td className="py-2.5 px-4 font-mono font-medium">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-4 text-slate-500">{inv.invoiceDate}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">{formatINR(inv.grandTotal)}</td>
                        <td className="py-2.5 px-4 text-slate-600">{inv.placeOfSupplyStateCode}-{inv.placeOfSupplyState}</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatINR(inv.subTotalTaxable)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatINR(inv.totalCgst)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatINR(inv.totalSgst)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatINR(inv.totalIgst)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No B2B invoices recorded in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 12: HSN Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs">Table 12</span>
                  HSN-wise Summary of Outward Supplies
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Mandatory 4-digit / 6-digit HSN code aggregate reporting</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {hsnSummaryList.length} HSN codes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">HSN/SAC</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">UQC</th>
                    <th className="py-2.5 px-4 text-right">Total Qty</th>
                    <th className="py-2.5 px-4 text-right">Total Value</th>
                    <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">CGST</th>
                    <th className="py-2.5 px-4 text-right">SGST</th>
                    <th className="py-2.5 px-4 text-right">IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hsnSummaryList.map(h => (
                    <tr key={h.hsn} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{h.hsn}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-700">{h.desc}</td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">{h.uqc}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">{h.qty}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold">{formatINR(h.total)}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{formatINR(h.taxable)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatINR(h.cgst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatINR(h.sgst)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">{formatINR(h.igst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: GSTR-3B RETURN                                                */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'gstr3b' && (
        <div className="space-y-6">
          {/* GSTR-3B Table 3.1 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-mono text-xs">Table 3.1</span>
                Details of Outward Supplies and inward supplies liable to reverse charge
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Nature of Supplies</th>
                    <th className="py-2.5 px-4 text-right">Total Taxable Value</th>
                    <th className="py-2.5 px-4 text-right">Integrated Tax (IGST)</th>
                    <th className="py-2.5 px-4 text-right">Central Tax (CGST)</th>
                    <th className="py-2.5 px-4 text-right">State/UT Tax (SGST)</th>
                    <th className="py-2.5 px-4 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatINR(totalOutwardTaxable)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">{formatINR(totalOutwardIgst)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">{formatINR(totalOutwardCgst)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">{formatINR(totalOutwardSgst)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* GSTR-3B Table 4: Eligible ITC */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-xs">Table 4</span>
                Eligible ITC (Input Tax Credit Available)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Details</th>
                    <th className="py-2.5 px-4 text-right">Integrated Tax (IGST)</th>
                    <th className="py-2.5 px-4 text-right">Central Tax (CGST)</th>
                    <th className="py-2.5 px-4 text-right">State/UT Tax (SGST)</th>
                    <th className="py-2.5 px-4 text-right">Cess</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      (A) ITC Available (whether in full or part) - All other ITC
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">{formatINR(totalItcIgst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">{formatINR(totalItcCgst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-700">{formatINR(totalItcSgst)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">₹0.00</td>
                  </tr>
                  <tr className="hover:bg-slate-50 text-rose-600">
                    <td className="py-2.5 px-4 font-semibold">
                      (D) Ineligible ITC / Blocked under Section 17(5)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">₹0.00</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(totalBlockedItc / 2)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(totalBlockedItc / 2)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* GSTR-3B Table 6.1: Net Tax Liability */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  Net Tax Liability to be Paid in Cash
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Output tax after set-off with available Input Tax Credit (ITC)
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-bold">Total Cash Payable</div>
                <div className="text-xl font-black text-indigo-600">{formatINR(totalNetCashPayable)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-700 mb-2">Central Tax (CGST)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Output Tax:</span>
                    <span className="font-mono font-semibold">{formatINR(totalOutwardCgst)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid through ITC:</span>
                    <span className="font-mono font-semibold">- {formatINR(Math.min(totalOutwardCgst, totalItcCgst))}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Cash Payable:</span>
                    <span className="font-mono text-indigo-600">{formatINR(netCgstPayable)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-700 mb-2">State Tax (SGST)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Output Tax:</span>
                    <span className="font-mono font-semibold">{formatINR(totalOutwardSgst)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid through ITC:</span>
                    <span className="font-mono font-semibold">- {formatINR(Math.min(totalOutwardSgst, totalItcSgst))}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Cash Payable:</span>
                    <span className="font-mono text-indigo-600">{formatINR(netSgstPayable)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-700 mb-2">Integrated Tax (IGST)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Output Tax:</span>
                    <span className="font-mono font-semibold">{formatINR(totalOutwardIgst)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid through ITC:</span>
                    <span className="font-mono font-semibold">- {formatINR(Math.min(totalOutwardIgst, totalItcIgst))}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Cash Payable:</span>
                    <span className="font-mono text-indigo-600">{formatINR(netIgstPayable)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB: HSN/SAC MASTER FINDER                                         */}
      {/* ------------------------------------------------------------------ */}
      {returnType === 'hsn_finder' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">HSN & SAC Code GST Tariff Directory</h3>
              <p className="text-xs text-slate-500 mt-0.5">Find standard 4-digit / 6-digit / 8-digit HSN codes with prescribed GST slabs</p>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by HSN or item name..."
                value={hsnSearchQuery}
                onChange={e => setHsnSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2.5 px-4">HSN / SAC Code</th>
                  <th className="py-2.5 px-4">Goods / Services Description</th>
                  <th className="py-2.5 px-4 text-center">GST Slab</th>
                  <th className="py-2.5 px-4 text-center">CGST</th>
                  <th className="py-2.5 px-4 text-center">SGST</th>
                  <th className="py-2.5 px-4 text-center">IGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHsnMaster.map(item => (
                  <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{item.code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 text-[11px]">
                        {item.gstRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{item.gstRate / 2}%</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{item.gstRate / 2}%</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">{item.gstRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
