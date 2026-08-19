import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentRecord, PaymentType, PaymentMethod, Party, Invoice, PurchaseBill } from '../../types';
import { formatINR, formatDate, numberToIndianWords } from '../../utils/formatters';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Calendar, 
  CreditCard, 
  FileText, 
  Receipt, 
  Wallet, 
  X, 
  Download,
  Share2,
  Clock,
  User,
  Hash,
  Landmark,
  FileSpreadsheet
} from 'lucide-react';

export const PaymentsView: React.FC = () => {
  const { 
    payments, 
    createPayment, 
    updatePayment, 
    deletePayment, 
    parties, 
    invoices, 
    purchaseBills, 
    accountHeads, 
    business 
  } = useApp();

  // Active Tab Filter
  const [activeTab, setActiveTab] = useState<'ALL' | 'PAYMENT_IN' | 'PAYMENT_OUT' | 'CONTRA_TRANSFER'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordModalType, setRecordModalType] = useState<PaymentType>('PAYMENT_IN');
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [voucherToPrint, setVoucherToPrint] = useState<PaymentRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State for Recording / Editing Payment
  const [formData, setFormData] = useState({
    voucherNumber: '',
    type: 'PAYMENT_IN' as PaymentType,
    date: new Date().toISOString().split('T')[0],
    partyId: '',
    partyName: '',
    partyType: 'CUSTOMER' as 'CUSTOMER' | 'VENDOR',
    amount: '' as string | number,
    paymentMethod: 'BANK_TRANSFER' as PaymentMethod,
    bankAccountId: 'acc-2',
    bankAccountName: 'HDFC Current Bank Account',
    referenceNo: '',
    chequeDate: '',
    linkedInvoiceId: '',
    linkedInvoiceNumber: '',
    linkedBillId: '',
    linkedBillNumber: '',
    fromAccount: 'Cash in Hand (acc-1)',
    toAccount: 'HDFC Current Bank Account (acc-2)',
    notes: ''
  });

  // Calculate High Level Metrics
  const metrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let totalContra = 0;
    let inCount = 0;
    let outCount = 0;

    payments.forEach(p => {
      if (p.type === 'PAYMENT_IN') {
        totalIn += p.amount;
        inCount++;
      } else if (p.type === 'PAYMENT_OUT') {
        totalOut += p.amount;
        outCount++;
      } else if (p.type === 'CONTRA_TRANSFER') {
        totalContra += p.amount;
      }
    });

    const netCashflow = totalIn - totalOut;

    // Bank and Cash account head balances
    const bankHead = accountHeads.find(a => a.name.toLowerCase().includes('bank') || a.code === '1010');
    const cashHead = accountHeads.find(a => a.name.toLowerCase().includes('cash') || a.code === '1000');

    return {
      totalIn,
      totalOut,
      netCashflow,
      inCount,
      outCount,
      totalContra,
      bankBalance: bankHead ? bankHead.balance : 345800,
      cashBalance: cashHead ? cashHead.balance : 28500
    };
  }, [payments, accountHeads]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Tab filter
      if (activeTab !== 'ALL' && p.type !== activeTab) {
        return false;
      }
      // Method filter
      if (filterMethod !== 'ALL' && p.paymentMethod !== filterMethod) {
        return false;
      }
      // Date filter
      if (dateFilter === 'THIS_MONTH') {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!p.date.startsWith(currentMonth)) return false;
      } else if (dateFilter === 'LAST_MONTH') {
        const now = new Date();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (!p.date.startsWith(lastMonth)) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVoucher = p.voucherNumber.toLowerCase().includes(q);
        const matchParty = p.partyName.toLowerCase().includes(q);
        const matchRef = p.referenceNo ? p.referenceNo.toLowerCase().includes(q) : false;
        const matchNotes = p.notes ? p.notes.toLowerCase().includes(q) : false;
        const matchInv = p.linkedInvoiceNumber ? p.linkedInvoiceNumber.toLowerCase().includes(q) : false;
        const matchBill = p.linkedBillNumber ? p.linkedBillNumber.toLowerCase().includes(q) : false;
        return matchVoucher || matchParty || matchRef || matchNotes || matchInv || matchBill;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, activeTab, filterMethod, dateFilter, searchQuery]);

  // Available Customers & Vendors for dropdowns
  const customers = useMemo(() => parties.filter(p => p.type === 'CUSTOMER' || p.type === 'BOTH'), [parties]);
  const vendors = useMemo(() => parties.filter(p => p.type === 'VENDOR' || p.type === 'BOTH'), [parties]);

  // Open Record Modal
  const handleOpenRecord = (type: PaymentType) => {
    setEditingPayment(null);
    setRecordModalType(type);
    const prefix = type === 'PAYMENT_IN' ? 'RCPT' : type === 'PAYMENT_OUT' ? 'PMT' : 'CNTR';
    const num = Math.floor(100 + Math.random() * 900);
    const defaultVoucher = `${prefix}-2026-${num}`;

    setFormData({
      voucherNumber: defaultVoucher,
      type: type,
      date: new Date().toISOString().split('T')[0],
      partyId: '',
      partyName: '',
      partyType: type === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR',
      amount: '',
      paymentMethod: 'BANK_TRANSFER',
      bankAccountId: 'acc-2',
      bankAccountName: 'HDFC Current Bank Account',
      referenceNo: '',
      chequeDate: '',
      linkedInvoiceId: '',
      linkedInvoiceNumber: '',
      linkedBillId: '',
      linkedBillNumber: '',
      fromAccount: 'Cash in Hand (acc-1)',
      toAccount: 'HDFC Current Bank Account (acc-2)',
      notes: ''
    });
    setIsRecordModalOpen(true);
  };

  // Handle Editing
  const handleOpenEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setRecordModalType(payment.type);
    setFormData({
      voucherNumber: payment.voucherNumber,
      type: payment.type,
      date: payment.date,
      partyId: payment.partyId || '',
      partyName: payment.partyName,
      partyType: payment.partyType || (payment.type === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR'),
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      bankAccountId: payment.bankAccountId || 'acc-2',
      bankAccountName: payment.bankAccountName || 'HDFC Current Bank Account',
      referenceNo: payment.referenceNo || '',
      chequeDate: payment.chequeDate || '',
      linkedInvoiceId: payment.linkedInvoiceId || '',
      linkedInvoiceNumber: payment.linkedInvoiceNumber || '',
      linkedBillId: payment.linkedBillId || '',
      linkedBillNumber: payment.linkedBillNumber || '',
      fromAccount: payment.fromAccount || 'Cash in Hand (acc-1)',
      toAccount: payment.toAccount || 'HDFC Current Bank Account (acc-2)',
      notes: payment.notes || ''
    });
    setIsRecordModalOpen(true);
  };

  // Handle Customer Selection
  const handleSelectParty = (partyId: string) => {
    const selectedParty = parties.find(p => p.id === partyId);
    if (!selectedParty) {
      setFormData(prev => ({ ...prev, partyId: '', partyName: '', linkedInvoiceId: '', linkedInvoiceNumber: '', linkedBillId: '', linkedBillNumber: '' }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      partyType: selectedParty.type === 'VENDOR' ? 'VENDOR' : 'CUSTOMER',
      linkedInvoiceId: '',
      linkedInvoiceNumber: '',
      linkedBillId: '',
      linkedBillNumber: ''
    }));
  };

  // Available Unpaid Invoices for Selected Customer
  const customerUnpaidInvoices = useMemo(() => {
    if (!formData.partyId || formData.type !== 'PAYMENT_IN') return [];
    return invoices.filter(i => (i.customerId === formData.partyId || i.customerName === formData.partyName) && i.status !== 'PAID' && i.status !== 'CANCELLED');
  }, [formData.partyId, formData.partyName, formData.type, invoices]);

  // Available Unpaid Purchase Bills for Selected Vendor
  const vendorUnpaidBills = useMemo(() => {
    if (!formData.partyId || formData.type !== 'PAYMENT_OUT') return [];
    return purchaseBills.filter(b => (b.vendorId === formData.partyId || b.vendorName === formData.partyName) && b.status !== 'PAID');
  }, [formData.partyId, formData.partyName, formData.type, purchaseBills]);

  // Handle Linked Invoice Select
  const handleSelectInvoice = (invId: string) => {
    if (!invId) {
      setFormData(prev => ({ ...prev, linkedInvoiceId: '', linkedInvoiceNumber: '' }));
      return;
    }
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      setFormData(prev => ({
        ...prev,
        linkedInvoiceId: inv.id,
        linkedInvoiceNumber: inv.invoiceNumber,
        amount: prev.amount ? prev.amount : (inv.amountDue || inv.grandTotal)
      }));
    }
  };

  // Handle Linked Bill Select
  const handleSelectBill = (billId: string) => {
    if (!billId) {
      setFormData(prev => ({ ...prev, linkedBillId: '', linkedBillNumber: '' }));
      return;
    }
    const bill = purchaseBills.find(b => b.id === billId);
    if (bill) {
      setFormData(prev => ({
        ...prev,
        linkedBillId: bill.id,
        linkedBillNumber: bill.billNumber,
        amount: prev.amount ? prev.amount : (bill.amountDue || bill.grandTotal)
      }));
    }
  };

  // Submit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid payment amount greater than 0.');
      return;
    }

    let partyDisplayName = formData.partyName;
    if (formData.type === 'CONTRA_TRANSFER') {
      partyDisplayName = `${formData.fromAccount} ➔ ${formData.toAccount}`;
    }

    if (editingPayment) {
      updatePayment(editingPayment.id, {
        voucherNumber: formData.voucherNumber,
        type: formData.type,
        date: formData.date,
        partyId: formData.partyId || undefined,
        partyName: partyDisplayName,
        partyType: formData.partyType,
        amount: parsedAmount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        bankAccountName: formData.bankAccountName,
        referenceNo: formData.referenceNo,
        chequeDate: formData.chequeDate,
        linkedInvoiceId: formData.linkedInvoiceId,
        linkedInvoiceNumber: formData.linkedInvoiceNumber,
        linkedBillId: formData.linkedBillId,
        linkedBillNumber: formData.linkedBillNumber,
        fromAccount: formData.fromAccount,
        toAccount: formData.toAccount,
        notes: formData.notes
      });
    } else {
      createPayment({
        voucherNumber: formData.voucherNumber,
        type: formData.type,
        date: formData.date,
        partyId: formData.partyId || undefined,
        partyName: partyDisplayName,
        partyType: formData.partyType,
        amount: parsedAmount,
        paymentMethod: formData.paymentMethod,
        bankAccountId: formData.bankAccountId,
        bankAccountName: formData.bankAccountName,
        referenceNo: formData.referenceNo,
        chequeDate: formData.chequeDate,
        linkedInvoiceId: formData.linkedInvoiceId,
        linkedInvoiceNumber: formData.linkedInvoiceNumber,
        linkedBillId: formData.linkedBillId,
        linkedBillNumber: formData.linkedBillNumber,
        fromAccount: formData.fromAccount,
        toAccount: formData.toAccount,
        notes: formData.notes
      });
    }

    setIsRecordModalOpen(false);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Voucher No', 'Date', 'Type', 'Party / Transfer', 'Mode', 'Amount (INR)', 'Reference No', 'Linked Doc', 'Notes'];
    const rows = filteredPayments.map(p => [
      p.voucherNumber,
      p.date,
      p.type,
      `"${p.partyName}"`,
      p.paymentMethod,
      p.amount,
      `"${p.referenceNo || ''}"`,
      `"${p.linkedInvoiceNumber || p.linkedBillNumber || ''}"`,
      `"${p.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VyaparFlow_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payments & Receipts Module</h1>
              <p className="text-xs text-slate-500">Record customer collections (Money In), vendor disbursements (Money Out), & Contra bank transfers</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenRecord('PAYMENT_IN')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ Payment Received (In)</span>
          </button>

          <button
            onClick={() => handleOpenRecord('PAYMENT_OUT')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Payment Made (Out)</span>
          </button>

          <button
            onClick={() => handleOpenRecord('CONTRA_TRANSFER')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>⇄ Contra Transfer</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            title="Export CSV Statement"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Money In */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">Money In (Received)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{formatINR(metrics.totalIn)}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{metrics.inCount}</span> receipts recorded from customers
            </div>
          </div>
        </div>

        {/* Total Money Out */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">Money Out (Paid)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{formatINR(metrics.totalOut)}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-rose-600">{metrics.outCount}</span> payments made to vendors/expenses
            </div>
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">Net Cash Flow</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black ${metrics.netCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatINR(metrics.netCashflow)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {metrics.netCashflow >= 0 ? 'Positive net liquidity' : 'Net cash outflow'}
            </div>
          </div>
        </div>

        {/* Bank & Cash Balances */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">Liquid Balances</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Bank (HDFC):</span>
              <span className="font-bold text-slate-800">{formatINR(metrics.bankBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Cash in Hand:</span>
              <span className="font-bold text-slate-800">{formatINR(metrics.cashBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Tab Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Transactions ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_IN')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PAYMENT_IN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Received / Money In ({metrics.inCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('PAYMENT_OUT')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PAYMENT_OUT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Paid / Money Out ({metrics.outCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('CONTRA_TRANSFER')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'CONTRA_TRANSFER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Contra Transfers ({payments.filter(p => p.type === 'CONTRA_TRANSFER').length})</span>
            </button>
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Date:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setDateFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  dateFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateFilter('THIS_MONTH')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  dateFilter === 'THIS_MONTH' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setDateFilter('LAST_MONTH')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  dateFilter === 'LAST_MONTH' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Last Month
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Voucher #, Party Name, Cheque/UTR Ref, Linked Invoice/Bill..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterMethod}
              onChange={e => setFilterMethod(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT_CARD">Credit/Debit Card</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5">Voucher #</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Party / Accounts</th>
                <th className="py-3 px-3.5">Payment Mode & Ref</th>
                <th className="py-3 px-3.5">Linked Document</th>
                <th className="py-3 px-3.5 text-right">Amount</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600 text-sm">No payment records found</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing search filters or create a new payment receipt.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const isMoneyIn = p.type === 'PAYMENT_IN';
                  const isMoneyOut = p.type === 'PAYMENT_OUT';
                  const isContra = p.type === 'CONTRA_TRANSFER';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {formatDate(p.date, 'short')}
                      </td>

                      {/* Voucher No */}
                      <td className="py-3.5 px-3.5">
                        <button
                          onClick={() => setVoucherToPrint(p)}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                        >
                          <Hash className="w-3 h-3 text-indigo-400" />
                          <span>{p.voucherNumber}</span>
                        </button>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        {isMoneyIn && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ArrowDownLeft className="w-3 h-3" /> Received (In)
                          </span>
                        )}
                        {isMoneyOut && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <ArrowUpRight className="w-3 h-3" /> Paid (Out)
                          </span>
                        )}
                        {isContra && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <ArrowLeftRight className="w-3 h-3" /> Contra Transfer
                          </span>
                        )}
                      </td>

                      {/* Party Name */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-semibold text-slate-900 max-w-[220px] truncate" title={p.partyName}>
                          {p.partyName}
                        </div>
                        {p.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[220px]" title={p.notes}>
                            {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Payment Mode & Ref */}
                      <td className="py-3.5 px-3.5">
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.paymentMethod.replace('_', ' ')}</span>
                        </div>
                        {p.referenceNo && (
                          <div className="text-[11px] font-mono text-slate-500">
                            Ref: {p.referenceNo}
                          </div>
                        )}
                      </td>

                      {/* Linked Doc */}
                      <td className="py-3.5 px-3.5">
                        {p.linkedInvoiceNumber && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-mono text-[11px] font-medium border border-indigo-100">
                            <FileText className="w-3 h-3" /> {p.linkedInvoiceNumber}
                          </div>
                        )}
                        {p.linkedBillNumber && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-mono text-[11px] font-medium border border-amber-100">
                            <FileText className="w-3 h-3" /> {p.linkedBillNumber}
                          </div>
                        )}
                        {!p.linkedInvoiceNumber && !p.linkedBillNumber && (
                          <span className="text-slate-400 italic text-[11px]">Direct / Advance</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3.5 text-right font-black whitespace-nowrap text-sm">
                        <span className={isMoneyIn ? 'text-emerald-600' : isMoneyOut ? 'text-rose-600' : 'text-blue-600'}>
                          {isMoneyIn ? '+' : isMoneyOut ? '-' : ''}{formatINR(p.amount)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setVoucherToPrint(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Print Voucher Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit Payment"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Payment"
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

      {/* RECORD / EDIT PAYMENT MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              formData.type === 'PAYMENT_IN' ? 'bg-emerald-50/70 border-emerald-100' :
              formData.type === 'PAYMENT_OUT' ? 'bg-rose-50/70 border-rose-100' : 'bg-blue-50/70 border-blue-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                  formData.type === 'PAYMENT_IN' ? 'bg-emerald-600' :
                  formData.type === 'PAYMENT_OUT' ? 'bg-rose-600' : 'bg-blue-600'
                }`}>
                  {formData.type === 'PAYMENT_IN' ? <ArrowDownLeft className="w-4 h-4" /> :
                   formData.type === 'PAYMENT_OUT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingPayment ? 'Edit Payment Voucher' : 
                     formData.type === 'PAYMENT_IN' ? 'Record Payment Received (Money In)' :
                     formData.type === 'PAYMENT_OUT' ? 'Record Payment Made (Money Out)' : 'Record Contra Bank/Cash Transfer'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {formData.type === 'PAYMENT_IN' ? 'Log customer payment against sales invoice or advance' :
                     formData.type === 'PAYMENT_OUT' ? 'Log payment disbursed to supplier or vendor bill' : 'Transfer money between Bank and Cash accounts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Voucher Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voucher Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.voucherNumber}
                    onChange={e => setFormData({ ...formData, voucherNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Party Selection (For Payment In / Out) */}
              {formData.type !== 'CONTRA_TRANSFER' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {formData.type === 'PAYMENT_IN' ? 'Customer / Received From *' : 'Vendor / Paid To *'}
                  </label>
                  <select
                    value={formData.partyId}
                    onChange={e => handleSelectParty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Select {formData.type === 'PAYMENT_IN' ? 'Customer' : 'Vendor'} --</option>
                    {(formData.type === 'PAYMENT_IN' ? customers : vendors).map(party => (
                      <option key={party.id} value={party.id}>
                        {party.name} ({party.city || party.state || 'India'}) - Current Bal: {formatINR(party.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linked Sales Invoice (For Payment In) */}
              {formData.type === 'PAYMENT_IN' && formData.partyId && customerUnpaidInvoices.length > 0 && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
                  <label className="block font-semibold text-emerald-900 mb-1">
                    Settle Against Pending Invoice (Optional)
                  </label>
                  <select
                    value={formData.linkedInvoiceId}
                    onChange={e => handleSelectInvoice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Direct Payment / Advance (No Specific Invoice) --</option>
                    {customerUnpaidInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} (Date: {formatDate(inv.invoiceDate)}) - Total: {formatINR(inv.grandTotal)} | Due: {formatINR(inv.amountDue || inv.grandTotal)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Linked Purchase Bill (For Payment Out) */}
              {formData.type === 'PAYMENT_OUT' && formData.partyId && vendorUnpaidBills.length > 0 && (
                <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200">
                  <label className="block font-semibold text-rose-900 mb-1">
                    Settle Against Purchase Bill (Optional)
                  </label>
                  <select
                    value={formData.linkedBillId}
                    onChange={e => handleSelectBill(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="">-- Direct / Advance Payment --</option>
                    {vendorUnpaidBills.map(bill => (
                      <option key={bill.id} value={bill.id}>
                        {bill.billNumber} (Date: {formatDate(bill.billDate)}) - Total: {formatINR(bill.grandTotal)} | Due: {formatINR(bill.amountDue || bill.grandTotal)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contra Transfer Account Selection */}
              {formData.type === 'CONTRA_TRANSFER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">Transfer From Account *</label>
                    <select
                      value={formData.fromAccount}
                      onChange={e => setFormData({ ...formData, fromAccount: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs"
                    >
                      <option value="Cash in Hand (acc-1)">Cash in Hand</option>
                      <option value="HDFC Current Bank Account (acc-2)">HDFC Current Bank Account</option>
                      <option value="Petty Cash Fund">Petty Cash Fund</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">Transfer To Account *</label>
                    <select
                      value={formData.toAccount}
                      onChange={e => setFormData({ ...formData, toAccount: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs"
                    >
                      <option value="HDFC Current Bank Account (acc-2)">HDFC Current Bank Account</option>
                      <option value="Cash in Hand (acc-1)">Cash in Hand</option>
                      <option value="SBI Secondary Current A/c">SBI Secondary Current A/c</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Amount & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>

              {/* Bank Account / Deposit To */}
              {formData.type !== 'CONTRA_TRANSFER' && formData.paymentMethod !== 'CASH' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {formData.type === 'PAYMENT_IN' ? 'Deposit Into Bank A/c' : 'Paid From Bank A/c'}
                    </label>
                    <select
                      value={formData.bankAccountId}
                      onChange={e => {
                        const acc = accountHeads.find(a => a.id === e.target.value);
                        setFormData({
                          ...formData,
                          bankAccountId: e.target.value,
                          bankAccountName: acc ? acc.name : 'HDFC Current Bank Account'
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="acc-2">HDFC Current Bank Account (A/c ...5678)</option>
                      <option value="acc-1">Cash in Hand (acc-1)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reference / UTR / Cheque No</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-9821092 or CHQ-88219"
                      value={formData.referenceNo}
                      onChange={e => setFormData({ ...formData, referenceNo: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Cheque Date if Cheque */}
              {formData.paymentMethod === 'CHEQUE' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cheque Date</label>
                  <input
                    type="date"
                    value={formData.chequeDate}
                    onChange={e => setFormData({ ...formData, chequeDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              )}

              {/* Notes / Narration */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Narration / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Enter remarks or payment details..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-sm hover:shadow transition-all ${
                    formData.type === 'PAYMENT_IN' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    formData.type === 'PAYMENT_OUT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {editingPayment ? 'Update Voucher' : 'Save Payment Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE VOUCHER MODAL */}
      {voucherToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
            {/* Modal Controls */}
            <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">
                  {voucherToPrint.type === 'PAYMENT_IN' ? 'Receipt Voucher' : 
                   voucherToPrint.type === 'PAYMENT_OUT' ? 'Payment Voucher' : 'Contra Voucher'}
                </span>
                <span className="text-xs text-slate-400 font-mono">({voucherToPrint.voucherNumber})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setVoucherToPrint(null)}
                  className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Layout */}
            <div id="printable-voucher-content" className="p-6 overflow-y-auto flex-1 text-slate-800 text-xs font-sans space-y-4">
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black text-slate-900">{business.tradeName || business.name}</h2>
                  <p className="text-[11px] text-slate-600">{business.address}, {business.city}, {business.state} - {business.pincode}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-700">
                    <span><strong>GSTIN:</strong> {business.gstin}</span>
                    <span><strong>PAN:</strong> {business.pan}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                    voucherToPrint.type === 'PAYMENT_IN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    voucherToPrint.type === 'PAYMENT_OUT' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}>
                    {voucherToPrint.type === 'PAYMENT_IN' ? 'RECEIPT VOUCHER' :
                     voucherToPrint.type === 'PAYMENT_OUT' ? 'PAYMENT VOUCHER' : 'CONTRA VOUCHER'}
                  </div>
                  <div className="mt-1 font-mono font-bold text-slate-900 text-sm">{voucherToPrint.voucherNumber}</div>
                  <div className="text-[11px] text-slate-500">Date: {formatDate(voucherToPrint.date, 'long')}</div>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="space-y-3.5 py-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">
                    {voucherToPrint.type === 'PAYMENT_IN' ? 'Received with thanks from:' : 'Paid to (Beneficiary):'}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{voucherToPrint.partyName}</span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Amount Received / Disbursed:</span>
                  <span className="font-black text-slate-900 text-base">{formatINR(voucherToPrint.amount)}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 text-[11px] block font-medium">Amount in Words:</span>
                  <span className="font-bold text-indigo-900 text-xs italic">
                    {numberToIndianWords(voucherToPrint.amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Payment Mode:</span>
                    <span className="font-semibold text-slate-900">{voucherToPrint.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  {voucherToPrint.referenceNo && (
                    <div>
                      <span className="text-slate-500 block">Reference / Cheque No:</span>
                      <span className="font-mono font-bold text-slate-900">{voucherToPrint.referenceNo}</span>
                    </div>
                  )}
                  {voucherToPrint.linkedInvoiceNumber && (
                    <div>
                      <span className="text-slate-500 block">Settled Against Invoice:</span>
                      <span className="font-mono font-bold text-indigo-600">{voucherToPrint.linkedInvoiceNumber}</span>
                    </div>
                  )}
                  {voucherToPrint.linkedBillNumber && (
                    <div>
                      <span className="text-slate-500 block">Settled Against Purchase Bill:</span>
                      <span className="font-mono font-bold text-amber-700">{voucherToPrint.linkedBillNumber}</span>
                    </div>
                  )}
                  {voucherToPrint.bankAccountName && (
                    <div>
                      <span className="text-slate-500 block">Bank Account:</span>
                      <span className="font-semibold text-slate-800">{voucherToPrint.bankAccountName}</span>
                    </div>
                  )}
                </div>

                {voucherToPrint.notes && (
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-500 block">Narration / Remarks:</span>
                    <p className="text-slate-700 italic">{voucherToPrint.notes}</p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 mt-6">
                <div className="text-center w-40">
                  <div className="border-b border-slate-400 pb-8"></div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold mt-1">Receiver's Signature</div>
                </div>

                <div className="text-center w-48">
                  {business.signatureUrl ? (
                    <img
                      src={business.signatureUrl}
                      alt="Authorized Signature"
                      className="h-12 max-w-[140px] mx-auto object-contain mb-1"
                    />
                  ) : (
                    <div className="border-b border-slate-400 pb-8"></div>
                  )}
                  <div className="font-bold text-slate-900 text-xs">For {business.tradeName || business.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">
                    {business.signatoryDesignation || 'Authorized Signatory'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Delete Payment Record?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete this payment voucher? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deletePayment(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
