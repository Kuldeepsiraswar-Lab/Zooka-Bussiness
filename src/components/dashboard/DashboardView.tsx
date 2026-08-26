import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Package, 
  Users, 
  AlertTriangle, 
  Plus, 
  ShoppingCart, 
  Truck, 
  ArrowUpRight, 
  ArrowDownLeft,
  CheckCircle2, 
  Clock, 
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ArrowRightLeft,
  Filter,
  Eye,
  Printer,
  Sparkles,
  BarChart3,
  Activity,
  Maximize2,
  Edit3,
  Crown,
  ShieldAlert,
  KeyRound,
  Ban
} from 'lucide-react';
import { 
  normalizeLowStockSettings, 
  getProductStockThreshold, 
  isProductLowStock, 
  isProductOutOfStock,
  isProductCriticalStock,
  computeInventoryHealth
} from '../../utils/stockUtils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Invoice } from '../../types';

interface DashboardViewProps {
  onOpenNewInvoice: () => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenNewInvoice, onEditInvoice }) => {
  const { 
    invoices, 
    purchaseBills, 
    products, 
    parties, 
    expenses, 
    business, 
    setActiveTab,
    setSelectedInvoiceIdForPrint,
    loginAsSuperAdmin
  } = useApp();

  // Dynamic Today Date String
  const getTodayDateString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Selected Day for Daily Sales & Purchases (Default to real today date)
  const [selectedDay, setSelectedDay] = useState<string>(() => getTodayDateString());

  // Chart Controls for Monthly Sales Trend
  const [chartViewMode, setChartViewMode] = useState<'sales_only' | 'sales_and_purchases' | 'net_margin'>('sales_and_purchases');
  const [chartPeriod, setChartPeriod] = useState<'FY_26_27' | 'LAST_6_MONTHS'>('FY_26_27');

  // Helper date shifting
  const shiftDate = (days: number) => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDay(`${yyyy}-${mm}-${dd}`);
  };

  // -------------------------------------------------------------
  // DAILY METRICS FOR SELECTED DAY
  // -------------------------------------------------------------
  const dayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.invoiceDate === selectedDay && inv.status !== 'CANCELLED');
  }, [invoices, selectedDay]);

  const dayPurchases = useMemo(() => {
    return purchaseBills.filter(bill => bill.billDate === selectedDay);
  }, [purchaseBills, selectedDay]);

  const dailySaleTotal = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [dayInvoices]);

  const dailySaleTaxable = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.subTotalTaxable, 0);
  }, [dayInvoices]);

  const dailySaleTax = useMemo(() => {
    return dayInvoices.reduce((sum, inv) => sum + inv.totalTax, 0);
  }, [dayInvoices]);

  const dailyPurchaseTotal = useMemo(() => {
    return dayPurchases.reduce((sum, bill) => sum + bill.grandTotal, 0);
  }, [dayPurchases]);

  const dailyPurchaseTaxable = useMemo(() => {
    return dayPurchases.reduce((sum, bill) => sum + bill.subTotalTaxable, 0);
  }, [dayPurchases]);

  const dailyPurchaseItc = useMemo(() => {
    return dayPurchases
      .filter(b => b.itcEligibility !== 'INELIGIBLE_17_5')
      .reduce((sum, bill) => sum + bill.totalTax, 0);
  }, [dayPurchases]);

  const dailyNetSpread = dailySaleTotal - dailyPurchaseTotal;

  // -------------------------------------------------------------
  // MONTHLY SALES & PURCHASES TREND DATA (FOR RECHARTS)
  // -------------------------------------------------------------
  const monthlyTrendData = useMemo(() => {
    // Standard baseline months for FY 2026-27
    const monthsList = chartPeriod === 'FY_26_27' 
      ? [
          { key: '2026-04', name: 'Apr 2026', shortName: 'Apr', baseSales: 185000, basePurchases: 142000 },
          { key: '2026-05', name: 'May 2026', shortName: 'May', baseSales: 215000, basePurchases: 168000 },
          { key: '2026-06', name: 'Jun 2026', shortName: 'Jun', baseSales: 268000, basePurchases: 195000 },
          { key: '2026-07', name: 'Jul 2026', shortName: 'Jul', baseSales: 310000, basePurchases: 220000 },
          { key: '2026-08', name: 'Aug 2026', shortName: 'Aug', baseSales: 0, basePurchases: 0 }, // Current active month calculated live
          { key: '2026-09', name: 'Sep 2026 (Est)', shortName: 'Sep', baseSales: 380000, basePurchases: 275000 },
        ]
      : [
          { key: '2026-03', name: 'Mar 2026', shortName: 'Mar', baseSales: 172000, basePurchases: 135000 },
          { key: '2026-04', name: 'Apr 2026', shortName: 'Apr', baseSales: 185000, basePurchases: 142000 },
          { key: '2026-05', name: 'May 2026', shortName: 'May', baseSales: 215000, basePurchases: 168000 },
          { key: '2026-06', name: 'Jun 2026', shortName: 'Jun', baseSales: 268000, basePurchases: 195000 },
          { key: '2026-07', name: 'Jul 2026', shortName: 'Jul', baseSales: 310000, basePurchases: 220000 },
          { key: '2026-08', name: 'Aug 2026', shortName: 'Aug', baseSales: 0, basePurchases: 0 },
        ];

    let prevSales = 0;

    return monthsList.map((m, idx) => {
      // Calculate live invoices and bills for this month
      const monthInvoices = invoices.filter(
        inv => inv.invoiceDate.startsWith(m.key) && inv.status !== 'CANCELLED'
      );
      const monthBills = purchaseBills.filter(
        b => b.billDate.startsWith(m.key)
      );

      const liveSales = monthInvoices.reduce((s, i) => s + i.grandTotal, 0);
      const livePurchases = monthBills.reduce((s, b) => s + b.grandTotal, 0);
      const liveTax = monthInvoices.reduce((s, i) => s + i.totalTax, 0);

      // If active month (Aug 2026), use live transactions; otherwise blend with historical records
      const totalSalesVal = m.key === '2026-08' ? liveSales : (m.baseSales + liveSales);
      const totalPurchasesVal = m.key === '2026-08' ? livePurchases : (m.basePurchases + livePurchases);
      const netProfit = totalSalesVal - totalPurchasesVal;

      // Growth % vs previous month
      let growthPercent = 0;
      if (idx > 0 && prevSales > 0) {
        growthPercent = Number((((totalSalesVal - prevSales) / prevSales) * 100).toFixed(1));
      }
      prevSales = totalSalesVal;

      return {
        monthKey: m.key,
        name: m.name,
        shortName: m.shortName,
        sales: totalSalesVal,
        purchases: totalPurchasesVal,
        netProfit: netProfit,
        tax: liveTax || Math.round(totalSalesVal * 0.18),
        invoicesCount: monthInvoices.length > 0 ? monthInvoices.length : Math.round(totalSalesVal / 45000),
        growthPercent: growthPercent
      };
    });
  }, [invoices, purchaseBills, chartPeriod]);

  // Overall Growth Stats for the Chart Banner
  const chartStats = useMemo(() => {
    const totalSalesPeriod = monthlyTrendData.reduce((s, d) => s + d.sales, 0);
    const totalPurchasesPeriod = monthlyTrendData.reduce((s, d) => s + d.purchases, 0);
    const avgMonthlySales = Math.round(totalSalesPeriod / (monthlyTrendData.length || 1));
    const latestMonth = monthlyTrendData[monthlyTrendData.length - 1];
    const prevMonth = monthlyTrendData[monthlyTrendData.length - 2];
    const latestGrowth = prevMonth && prevMonth.sales > 0
      ? Number((((latestMonth.sales - prevMonth.sales) / prevMonth.sales) * 100).toFixed(1))
      : 0;

    return {
      totalSalesPeriod,
      totalPurchasesPeriod,
      avgMonthlySales,
      latestGrowth,
      netMargin: totalSalesPeriod - totalPurchasesPeriod
    };
  }, [monthlyTrendData]);

  // -------------------------------------------------------------
  // ALL-TIME CUMULATIVE METRICS
  // -------------------------------------------------------------
  const totalSales = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  const totalPurchases = purchaseBills
    .reduce((sum, bill) => sum + bill.grandTotal, 0);

  const totalReceivables = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

  const totalPayables = purchaseBills
    .reduce((sum, bill) => sum + (bill.amountDue || 0), 0);

  const totalOutputGst = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, inv) => sum + inv.totalTax, 0);

  const totalInputItc = purchaseBills
    .filter(b => b.itcEligibility === 'ELIGIBLE_ALL' || b.itcEligibility === 'ELIGIBLE_CAPITAL_GOODS')
    .reduce((sum, bill) => sum + bill.totalTax, 0) + 
    expenses.filter(e => e.hasGstBill).reduce((sum, exp) => sum + exp.gstAmount, 0);

  const netGstPayable = Math.max(0, totalOutputGst - totalInputItc);

  const stockSettings = normalizeLowStockSettings(business.lowStockSettings);
  const health = computeInventoryHealth(products, stockSettings);
  const lowStockProducts = products.filter(p => isProductLowStock(p, stockSettings));
  const recentInvoices = invoices.slice(0, 6);

  // Custom Formatter for Tooltip & Y-Axis
  const formatYAxis = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(0)}k`;
    }
    return `₹${val}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Good day, {business.tradeName || business.name} 👋
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-300">
            GSTIN: <span className="font-mono font-semibold text-cyan-300">{business.gstin}</span> • State Code: {business.stateCode} ({business.state})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loginAsSuperAdmin}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl shadow-lg shadow-purple-950/40 border border-purple-400/40 transition-all active:scale-95 cursor-pointer group"
            title="Login to Super Admin Master Control Dashboard (/admin)"
          >
            <Crown className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span>Super Admin Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('pos_billing')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur transition-all active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-cyan-400" />
            <span>POS Counter Sale</span>
          </button>

          <button
            onClick={onOpenNewInvoice}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 📈 MONTHLY SALES TREND LINE CHART (RECHARTS INTEGRATION)     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
        {/* Header and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Monthly Sales & Revenue Growth Trends</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full">
                    Performance Analytics
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track month-on-month turnover trajectory, compare inward purchases, and project growth.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartViewMode('sales_and_purchases')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartViewMode === 'sales_and_purchases'
                    ? 'bg-white text-indigo-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales vs Purchases
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('sales_only')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartViewMode === 'sales_only'
                    ? 'bg-white text-indigo-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales Only
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('net_margin')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartViewMode === 'net_margin'
                    ? 'bg-white text-indigo-600 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Net Margin
              </button>
            </div>

            {/* Period Selector */}
            <select
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="FY_26_27">FY 2026-27 (Apr - Sep)</option>
              <option value="LAST_6_MONTHS">Last 6 Months (Mar - Aug)</option>
            </select>
          </div>
        </div>

        {/* Growth Stats Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Period Sales</span>
            <div className="text-base sm:text-lg font-black text-indigo-950 mt-0.5 font-mono">
              {formatCurrency(chartStats.totalSalesPeriod, business.currencySymbol)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Monthly Revenue</span>
            <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5 font-mono">
              {formatCurrency(chartStats.avgMonthlySales, business.currencySymbol)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest Growth Trajectory</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-base sm:text-lg font-black font-mono ${
                chartStats.latestGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {chartStats.latestGrowth >= 0 ? '+' : ''}{chartStats.latestGrowth}%
              </span>
              <span className="text-[10px] text-slate-500">MoM</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Net Operating Spread</span>
            <div className="text-base sm:text-lg font-black text-emerald-950 mt-0.5 font-mono">
              {formatCurrency(chartStats.netMargin, business.currencySymbol)}
            </div>
          </div>
        </div>

        {/* Recharts Interactive Line Chart Container */}
        <div className="h-72 sm:h-80 w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyTrendData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="purchasesLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
                <linearGradient id="marginLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              <XAxis 
                dataKey="shortName" 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              />
              
              <YAxis 
                tickFormatter={formatYAxis} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs min-w-[200px] space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-200">{data.name}</span>
                          {data.growthPercent !== 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              data.growthPercent > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {data.growthPercent > 0 ? '▲ +' : '▼ '}{data.growthPercent}%
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-indigo-300">
                            <span>Total Sales:</span>
                            <span className="font-bold font-mono text-white">{formatCurrency(data.sales, business.currencySymbol)}</span>
                          </div>
                          
                          {(chartViewMode === 'sales_and_purchases' || chartViewMode === 'net_margin') && (
                            <div className="flex justify-between items-center text-rose-300">
                              <span>Total Purchases:</span>
                              <span className="font-bold font-mono text-white">{formatCurrency(data.purchases, business.currencySymbol)}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-emerald-300 pt-1 border-t border-slate-800">
                            <span>Net Spread:</span>
                            <span className="font-bold font-mono text-emerald-400">{formatCurrency(data.netProfit, business.currencySymbol)}</span>
                          </div>

                          <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1">
                            <span>Tax Invoices:</span>
                            <span>{data.invoicesCount} orders</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend 
                verticalAlign="top" 
                align="right" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px', fontWeight: 600 }}
              />

              {/* Primary Sales Line */}
              {(chartViewMode === 'sales_only' || chartViewMode === 'sales_and_purchases') && (
                <Line
                  type="monotone"
                  dataKey="sales"
                  name="Monthly Sales (₹)"
                  stroke="url(#salesLineGrad)"
                  strokeWidth={3.5}
                  dot={{ r: 4.5, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#06b6d4', strokeWidth: 2, stroke: '#ffffff' }}
                />
              )}

              {/* Purchases Line */}
              {chartViewMode === 'sales_and_purchases' && (
                <Line
                  type="monotone"
                  dataKey="purchases"
                  name="Purchases (₹)"
                  stroke="url(#purchasesLineGrad)"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: '#f43f5e', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#fb923c', strokeWidth: 2, stroke: '#ffffff' }}
                />
              )}

              {/* Net Margin Line */}
              {chartViewMode === 'net_margin' && (
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  name="Net Margin (₹)"
                  stroke="url(#marginLineGrad)"
                  strokeWidth={3}
                  dot={{ r: 4.5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DAILY SALE & PURCHASE CONTROL & HIGHLIGHT HUB                 */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header & Date Switcher Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Calendar className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">Daily Sale & Purchase Tracker</h2>
              {selectedDay === getTodayDateString() && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live daily turnover, purchases, net cash flow, and transaction breakdown by date.
            </p>
          </div>

          {/* Interactive Day Date Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-300 rounded-xl shadow-xs p-1">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="px-2 py-1 text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDay(getTodayDateString())}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                selectedDay === getTodayDateString()
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Daily Top 3 Metric Cards for Selected Date */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Sale Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Daily Sales</span>
                  <p className="text-[10px] text-slate-500">{formatDate(selectedDay)}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold font-mono bg-emerald-100 text-emerald-800 rounded-lg">
                {dayInvoices.length} {dayInvoices.length === 1 ? 'sale' : 'sales'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                {formatCurrency(dailySaleTotal, business.currencySymbol)}
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-xs text-slate-600">
                <span>Taxable: <strong className="text-slate-800 font-mono">{formatCurrency(dailySaleTaxable, business.currencySymbol)}</strong></span>
                <span>GST: <strong className="text-emerald-700 font-mono">{formatCurrency(dailySaleTax, business.currencySymbol)}</strong></span>
              </div>
            </div>
          </div>

          {/* Daily Purchase Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/70 via-white to-rose-50/30 border border-rose-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-xs">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">Daily Purchases</span>
                  <p className="text-[10px] text-slate-500">{formatDate(selectedDay)}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold font-mono bg-rose-100 text-rose-800 rounded-lg">
                {dayPurchases.length} {dayPurchases.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-950 font-mono">
                {formatCurrency(dailyPurchaseTotal, business.currencySymbol)}
              </div>
              <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-xs text-slate-600">
                <span>Taxable: <strong className="text-slate-800 font-mono">{formatCurrency(dailyPurchaseTaxable, business.currencySymbol)}</strong></span>
                <span>ITC Credit: <strong className="text-rose-700 font-mono">{formatCurrency(dailyPurchaseItc, business.currencySymbol)}</strong></span>
              </div>
            </div>
          </div>

          {/* Daily Net Cash Flow / Spread Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/30 border border-indigo-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">Daily Net Spread</span>
                  <p className="text-[10px] text-slate-500">Sales minus Purchases</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                dailyNetSpread >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {dailyNetSpread >= 0 ? 'Net Surplus' : 'Net Outflow'}
              </span>
            </div>

            <div className="mt-3">
              <div className={`text-2xl sm:text-3xl font-black font-mono ${
                dailyNetSpread >= 0 ? 'text-indigo-950' : 'text-rose-700'
              }`}>
                {dailyNetSpread >= 0 ? '+' : ''}{formatCurrency(dailyNetSpread, business.currencySymbol)}
              </div>
              <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between text-xs text-slate-600">
                <button
                  onClick={() => setActiveTab('gst_returns')}
                  className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View GST Registers</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-slate-500">
                  {dayInvoices.length + dayPurchases.length} total entries
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ALL-TIME CUMULATIVE FINANCIAL KPIS GRID                       */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cumulative Revenue (Sales)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalSales, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>{invoices.length} Invoices issued</span>
            <span className="text-emerald-600 font-medium flex items-center">
              FY 2026-27
            </span>
          </div>
        </div>

        {/* GST Output vs Input ITC */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Net GST Liability</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-950">
            {formatCurrency(netGstPayable, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>ITC: {formatCurrency(totalInputItc, business.currencySymbol)}</span>
            <button
              onClick={() => setActiveTab('gst_returns')}
              className="text-indigo-600 font-medium hover:underline flex items-center cursor-pointer"
            >
              GSTR-3B <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Receivables (Debtors) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Accounts Receivable</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {formatCurrency(totalReceivables, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Pending from customers</span>
            <button
              onClick={() => setActiveTab('parties')}
              className="text-amber-700 font-medium hover:underline cursor-pointer"
            >
              View Debtors
            </button>
          </div>
        </div>

        {/* Purchases & Payables */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Accounts Payable</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">
            {formatCurrency(totalPayables, business.currencySymbol)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Due to suppliers</span>
            <button
              onClick={() => setActiveTab('purchases')}
              className="text-rose-700 font-medium hover:underline cursor-pointer"
            >
              View Bills
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* OPERATIONS & HUBS ROW                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Parties & Client Accounts Hub Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-cyan-300 border border-indigo-400/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Parties & Client Accounts</h3>
                  <p className="text-[11px] text-slate-300">Customer & Vendor Ledger Balances</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                {parties.length} Contacts
              </span>
            </div>

            <div className="space-y-2 mt-4 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-slate-300">Total Receivables (Debtors):</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(totalReceivables, business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-white/10">
                <span className="text-slate-300">Total Payables (Vendors):</span>
                <span className="font-bold text-rose-300 font-mono">
                  {formatCurrency(totalPayables, business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-300">Registered GSTIN Parties:</span>
                <span className="font-bold text-cyan-300">
                  {parties.filter(p => p.gstin).length} Verified
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('parties')}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <span>View Parties & Statements</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Low Stock & Inventory Health */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Inventory Status</h3>
                  <p className="text-[11px] text-slate-500">{products.length} catalog items</p>
                </div>
              </div>
              {lowStockProducts.length > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  {lowStockProducts.length} Low Stock
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  Healthy
                </span>
              )}
            </div>

            <div className="space-y-2 mt-3">
              {lowStockProducts.slice(0, 3).map(prod => {
                const effectiveThreshold = getProductStockThreshold(prod, stockSettings);
                const isOutOfStock = isProductOutOfStock(prod);
                const isCritical = isProductCriticalStock(prod, stockSettings);

                return (
                  <div key={prod.id} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-100 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 line-clamp-1">{prod.name}</p>
                      <p className="text-[10px] text-slate-500">Min Alert: {effectiveThreshold} {prod.unit}</p>
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-xs font-mono shrink-0 flex items-center gap-1 ${
                      isOutOfStock 
                        ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                        : isCritical
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isOutOfStock && <Ban className="w-3 h-3 text-rose-600" />}
                      {prod.currentStock} {prod.unit}
                    </span>
                  </div>
                );
              })}
              {lowStockProducts.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  All inventory stock levels are above threshold limits.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setActiveTab('inventory')}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <span>Manage Inventory & Stock</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GST Filing Quick Status Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">GST & Tax Registers</h3>
                  <p className="text-[11px] text-slate-500">Sale & Purchase Registers</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full">
                August 2026
              </span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Taxable Outward Supplies:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatCurrency(invoices.reduce((s, i) => s + i.subTotalTaxable, 0), business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Total Output Tax (CGST+SGST+IGST):</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {formatCurrency(totalOutputGst, business.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Eligible Inward ITC:</span>
                <span className="font-semibold text-emerald-600 font-mono">
                  {formatCurrency(totalInputItc, business.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('gst_returns')}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Open Sale & Purchase Registers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 👑 SUPER ADMIN MASTER CONTROL ACCESS PORTAL                   */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800/40 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Super Admin Control Dashboard</h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                System Master
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Manage all multi-company entities, switch businesses, verify licenses, and monitor platform logs.
            </p>
          </div>
        </div>

        <button
          onClick={loginAsSuperAdmin}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 border border-purple-400/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <KeyRound className="w-4 h-4 text-amber-300" />
          <span>Login with Password / PIN</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECENT INVOICES FEED TABLE                                    */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Tax Invoices & Sales</h2>
            <p className="text-xs text-slate-500">Latest sales invoices issued with payment tracking</p>
          </div>
          <button
            onClick={() => setActiveTab('invoices')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>View all {invoices.length} invoices</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                <th className="py-2.5 px-3">Invoice No & Date</th>
                <th className="py-2.5 px-3">Customer & GSTIN</th>
                <th className="py-2.5 px-3">Products / Items</th>
                <th className="py-2.5 px-3">Tax Type</th>
                <th className="py-2.5 px-3 text-right">Taxable</th>
                <th className="py-2.5 px-3 text-right">Total Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.map(inv => {
                const isPaid = inv.status === 'PAID';
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="font-semibold">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-400">{formatDate(inv.invoiceDate)}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{inv.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {inv.customerGstin || 'Unregistered / Retail'}
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-[200px]">
                      {inv.items && inv.items.length > 0 ? (
                        <div className="space-y-0.5">
                          <div className="text-slate-800 font-medium truncate flex items-center gap-1" title={inv.items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}>
                            <Package className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate">{inv.items[0]?.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({inv.items[0]?.quantity} {inv.items[0]?.unit})</span>
                          </div>
                          {inv.items.length > 1 && (
                            <div className="text-[10px] font-bold text-indigo-600">
                              +{inv.items.length - 1} more item{inv.items.length - 1 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">No items</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded">
                        {inv.isInterState ? 'IGST (Inter-State)' : 'CGST+SGST (Intra)'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(inv.subTotalTaxable, business.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                      {formatCurrency(inv.grandTotal, business.currencySymbol)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditInvoice && (
                          <button
                            onClick={() => onEditInvoice(inv)}
                            className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3 h-3 text-amber-600" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedInvoiceIdForPrint(inv.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Print / PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
