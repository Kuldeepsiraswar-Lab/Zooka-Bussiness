import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ChequeRecord, 
  ChequeType, 
  ChequeStatus, 
  ChequeBook 
} from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { 
  IssueChequeModal 
} from './IssueChequeModal';
import { 
  ChequePrintModal 
} from './ChequePrintModal';
import { 
  ChequeBookManagerModal 
} from './ChequeBookManagerModal';
import { 
  ChequeCalibrationTab 
} from './ChequeCalibrationTab';
import { 
  Landmark, 
  Plus, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Download, 
  Sliders, 
  BookOpen, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Layers, 
  Trash2, 
  Edit, 
  Eye, 
  FileText,
  Calendar,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Check
} from 'lucide-react';

export const ChequePrintingView: React.FC = () => {
  const { 
    cheques, 
    chequeBooks, 
    business, 
    deleteCheque, 
    deleteChequeBook,
    updateChequeBook,
    markChequeAsPrinted,
    markChequeAsCleared,
    markChequeAsBounced,
    setActiveTab,
    showToast 
  } = useApp();

  // Active View Tab
  const [activeTab, setActiveTabState] = useState<'REGISTER' | 'ISSUED' | 'RECEIVED' | 'CHEQUE_BOOKS' | 'CALIBRATION'>('REGISTER');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CURRENT_FY'>('ALL');

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState<boolean>(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState<boolean>(false);
  const [activeChequeForPrint, setActiveChequeForPrint] = useState<ChequeRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Deletion confirmation states
  const [chequeToDelete, setChequeToDelete] = useState<ChequeRecord | null>(null);
  const [bookToDelete, setBookToDelete] = useState<ChequeBook | null>(null);

  // Clearance confirmation modal / prompt
  const [clearanceModalCheque, setClearanceModalCheque] = useState<ChequeRecord | null>(null);
  const [clearanceDate, setClearanceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Unique Banks for filter
  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    cheques.forEach(c => { if (c.bankName) set.add(c.bankName); });
    return Array.from(set);
  }, [cheques]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalIssuedAmt = 0;
    let totalIssuedCount = 0;
    let totalReceivedAmt = 0;
    let totalReceivedCount = 0;
    let pendingClearanceAmt = 0;
    let pendingClearanceCount = 0;
    let clearedAmt = 0;
    let clearedCount = 0;

    cheques.forEach(c => {
      if (c.status === 'CANCELLED' || c.status === 'BOUNCED') return;

      if (c.chequeType === 'PAYMENT_OUT' || c.chequeType === 'SELF_CASH') {
        totalIssuedAmt += c.amount;
        totalIssuedCount++;
      } else if (c.chequeType === 'PAYMENT_IN') {
        totalReceivedAmt += c.amount;
        totalReceivedCount++;
      }

      if (c.status === 'CLEARED') {
        clearedAmt += c.amount;
        clearedCount++;
      } else {
        pendingClearanceAmt += c.amount;
        pendingClearanceCount++;
      }
    });

    return {
      totalIssuedAmt,
      totalIssuedCount,
      totalReceivedAmt,
      totalReceivedCount,
      pendingClearanceAmt,
      pendingClearanceCount,
      clearedAmt,
      clearedCount
    };
  }, [cheques]);

  // Filtered Cheques List
  const filteredCheques = useMemo(() => {
    return cheques.filter(c => {
      // Tab filter
      if (activeTab === 'ISSUED' && c.chequeType !== 'PAYMENT_OUT' && c.chequeType !== 'SELF_CASH') return false;
      if (activeTab === 'RECEIVED' && c.chequeType !== 'PAYMENT_IN') return false;

      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

      // Bank filter
      if (bankFilter !== 'ALL' && c.bankName !== bankFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = (c.chequeNumber || '').toLowerCase().includes(q);
        const matchPayee = (c.payeeName || '').toLowerCase().includes(q);
        const matchBank = (c.bankName || '').toLowerCase().includes(q);
        const matchRef = (c.billReference || '').toLowerCase().includes(q);
        const matchMemo = (c.memo || '').toLowerCase().includes(q);
        const matchAmt = String(c.amount).includes(q);
        if (!matchNum && !matchPayee && !matchBank && !matchRef && !matchMemo && !matchAmt) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const today = new Date();
        const chequeD = new Date(c.chequeDate);
        if (dateFilter === 'THIS_MONTH') {
          if (chequeD.getMonth() !== today.getMonth() || chequeD.getFullYear() !== today.getFullYear()) {
            return false;
          }
        } else if (dateFilter === 'LAST_30_DAYS') {
          const diffDays = (today.getTime() - chequeD.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        } else if (dateFilter === 'CURRENT_FY') {
          const curYear = today.getFullYear();
          const curMonth = today.getMonth();
          const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
          const fyStart = new Date(fyStartYear, 3, 1);
          const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59);
          if (chequeD < fyStart || chequeD > fyEnd) return false;
        }
      }

      return true;
    });
  }, [cheques, activeTab, statusFilter, bankFilter, searchQuery, dateFilter]);

  // Open Print Modal for a cheque
  const handleOpenPrint = (cheque: ChequeRecord) => {
    setActiveChequeForPrint(cheque);
    setIsPrintModalOpen(true);
  };

  // Handle Cheque Creation Success
  const handleChequeCreated = (newCheque: ChequeRecord, openPrintNow?: boolean) => {
    if (openPrintNow) {
      setActiveChequeForPrint(newCheque);
      setIsPrintModalOpen(true);
    }
  };

  // Confirm clearance
  const handleConfirmClearance = () => {
    if (!clearanceModalCheque) return;
    markChequeAsCleared(clearanceModalCheque.id, clearanceDate);
    setClearanceModalCheque(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Cheque Printing & Management
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  CTS-2010
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  Auto-Ledger Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Print Indian bank cheques, manage cheque books, and automatically sync client ledgers & banking.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsBookModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Cheque Books ({chequeBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsIssueModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Issue & Print Cheque</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Issued */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cheques Issued (Out)
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {formatINR(metrics.totalIssuedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-rose-600">{metrics.totalIssuedCount}</span> cheques to vendors/clients
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Received */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cheques Received (In)
            </span>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {formatINR(metrics.totalReceivedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-emerald-600">{metrics.totalReceivedCount}</span> cheques from customers
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Clearance */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Clearance
            </span>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {formatINR(metrics.pendingClearanceAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-amber-600">{metrics.pendingClearanceCount}</span> cheques in-transit / clearing
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Cleared & Settled */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cleared & Settled
            </span>
            <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 font-mono">
              {formatINR(metrics.clearedAmt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
              <span className="font-bold text-blue-600">{metrics.clearedCount}</span> cheques fully reconciled
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
          {[
            { id: 'REGISTER', label: 'All Cheques Register', count: cheques.length },
            { id: 'ISSUED', label: 'Cheques Issued', count: cheques.filter(c => c.chequeType !== 'PAYMENT_IN').length },
            { id: 'RECEIVED', label: 'Cheques Received', count: cheques.filter(c => c.chequeType === 'PAYMENT_IN').length },
            { id: 'CHEQUE_BOOKS', label: 'Cheque Books', count: chequeBooks.length },
            { id: 'CALIBRATION', label: 'Print Calibration Studio' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabState(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CALIBRATION TAB */}
      {activeTab === 'CALIBRATION' && (
        <ChequeCalibrationTab />
      )}

      {/* CHEQUE BOOKS TAB */}
      {activeTab === 'CHEQUE_BOOKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Bank Cheque Books Overview
              </h3>
              <p className="text-xs text-slate-500">
                Register bank cheque series to auto-increment cheque numbers during issuance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBookModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Cheque Book</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chequeBooks.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No cheque books added yet</p>
                <p className="text-xs text-slate-500 mt-1">Click "Register New Cheque Book" above to set up your leaf series.</p>
              </div>
            ) : (
              chequeBooks.map(book => {
                const startNum = parseInt(book.startChequeNo, 10);
                const currentNum = parseInt(book.currentChequeNo, 10);
                const used = Math.max(0, currentNum - startNum);
                const remaining = Math.max(0, book.totalLeaves - used);
                const progressPct = Math.min(100, Math.round((used / book.totalLeaves) * 100));

                return (
                  <div
                    key={book.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                            {book.bankName}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            book.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {book.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          A/C: {book.accountNumber || 'Primary Bank Account'}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Series Range:</span>
                        <strong className="text-slate-800 dark:text-slate-200">#{book.startChequeNo} - #{book.endChequeNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Next Cheque #:</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-bold">#{book.currentChequeNo}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Leaves:</span>
                        <span className="text-slate-800 dark:text-slate-200">{book.totalLeaves} leaves</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>{used} Used</span>
                        <span>{remaining} Remaining</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            progressPct > 90 ? 'bg-rose-500' : progressPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const newStatus = book.status === 'ACTIVE' ? 'EXHAUSTED' : 'ACTIVE';
                          updateChequeBook(book.id, { status: newStatus });
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      >
                        {book.status === 'ACTIVE' ? 'Mark Exhausted' : 'Activate Series'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBookToDelete(book)}
                        title="Delete Cheque Book"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 text-[11px]"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* REGISTER / ISSUED / RECEIVED TABLE TAB */}
      {(activeTab === 'REGISTER' || activeTab === 'ISSUED' || activeTab === 'RECEIVED') && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Cheque #, Payee, Bank, Ref #, Amount..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="ISSUED">Issued</option>
                <option value="PRINTED">Printed</option>
                <option value="CLEARED">Cleared</option>
                <option value="BOUNCED">Bounced</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Bank Filter */}
              {uniqueBanks.length > 0 && (
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Banks</option>
                  {uniqueBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}

              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">All Dates</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="CURRENT_FY">Current FY</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Cheque #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Payee / Client Name</th>
                    <th className="py-3.5 px-4">Bank Account</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 text-right">Amount ({business.currencySymbol})</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ledger Sync</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {filteredCheques.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold">No cheques found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {searchQuery ? 'No cheques match the applied search filter.' : 'Click "Issue & Print Cheque" to record your first cheque.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCheques.map(cheque => {
                      const isPaymentOut = cheque.chequeType === 'PAYMENT_OUT' || cheque.chequeType === 'SELF_CASH';

                      return (
                        <tr
                          key={cheque.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Cheque # */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-blue-600 dark:text-blue-400">#{cheque.chequeNumber}</span>
                              {cheque.isAccountPayeeOnly && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" title="A/C Payee Only">
                                  A/C
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {formatDate(cheque.chequeDate)}
                          </td>

                          {/* Payee Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[200px]">
                              {cheque.payeeName}
                            </div>
                            {cheque.partyName && cheque.partyName !== cheque.payeeName && (
                              <div className="text-[10px] text-slate-400">
                                Party: {cheque.partyName}
                              </div>
                            )}
                            {cheque.billReference && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                Ref: {cheque.billReference}
                              </div>
                            )}
                          </td>

                          {/* Bank */}
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold">{cheque.bankName}</div>
                            {cheque.accountNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                A/C: ••••{cheque.accountNumber.slice(-4)}
                              </div>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              cheque.chequeType === 'PAYMENT_OUT'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                : cheque.chequeType === 'PAYMENT_IN'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            }`}>
                              {cheque.chequeType === 'PAYMENT_OUT' ? 'Out (Issued)' : cheque.chequeType === 'PAYMENT_IN' ? 'In (Received)' : 'Self Cash'}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatINR(cheque.amount)}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              cheque.status === 'CLEARED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : cheque.status === 'PRINTED'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : cheque.status === 'ISSUED'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : cheque.status === 'BOUNCED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>
                              {cheque.status}
                            </span>
                          </td>

                          {/* Ledger Sync Status */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {cheque.autoPostLedger ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full" title="Ledger & Accounting Entry Created">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Synced</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Manual</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              
                              {/* Print Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPrint(cheque)}
                                title="Print Cheque"
                                className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Mark Cleared */}
                              {cheque.status !== 'CLEARED' && (
                                <button
                                  type="button"
                                  onClick={() => setClearanceModalCheque(cheque)}
                                  title="Mark as Cleared in Bank"
                                  className="p-1.5 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => setChequeToDelete(cheque)}
                                title="Delete Cheque"
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE CHEQUE MODAL */}
      <IssueChequeModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={handleChequeCreated}
      />

      {/* CHEQUE PRINT PREVIEW MODAL */}
      <ChequePrintModal
        isOpen={isPrintModalOpen}
        cheque={activeChequeForPrint}
        onClose={() => {
          setIsPrintModalOpen(false);
          setActiveChequeForPrint(null);
        }}
        onMarkPrinted={(id) => markChequeAsPrinted(id)}
      />

      {/* CHEQUE BOOK MANAGER MODAL */}
      <ChequeBookManagerModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
      />

      {/* CHEQUE DELETION MODAL */}
      {chequeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Remove Cheque #{chequeToDelete.chequeNumber}?
                </h3>
                <p className="text-xs text-slate-500">
                  {chequeToDelete.payeeName} • {formatINR(chequeToDelete.amount)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this cheque from the register? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setChequeToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteCheque(chequeToDelete.id);
                  setChequeToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Cheque</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHEQUE BOOK DELETION MODAL (FROM OVERVIEW TAB) */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Delete Cheque Book Series?
                </h3>
                <p className="text-xs text-slate-500">
                  {bookToDelete.bankName} • #{bookToDelete.startChequeNo} - #{bookToDelete.endChequeNo}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to remove this cheque book? Any already recorded cheques in this series will remain in your register.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteChequeBook(bookToDelete.id);
                  setBookToDelete(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Cheque Book</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANK CLEARANCE MODAL */}
      {clearanceModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Reconcile & Clear Cheque #{clearanceModalCheque.chequeNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {clearanceModalCheque.bankName} • {formatINR(clearanceModalCheque.amount)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bank Realization / Clearance Date
              </label>
              <input
                type="date"
                value={clearanceDate}
                onChange={(e) => setClearanceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearanceModalCheque(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  markChequeAsBounced(clearanceModalCheque.id, 'Cheque returned unpaid / insufficient funds');
                  setClearanceModalCheque(null);
                }}
                className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition"
              >
                Mark Bounced
              </button>

              <button
                type="button"
                onClick={handleConfirmClearance}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                Confirm Cleared
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
