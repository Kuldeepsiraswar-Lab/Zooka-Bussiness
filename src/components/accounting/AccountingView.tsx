import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Scale, 
  FileSpreadsheet, 
  Filter, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  Edit,
  Trash2,
  Search,
  Printer,
  FileText,
  AlertTriangle,
  Receipt,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  FolderPlus,
  Building,
  CreditCard,
  Briefcase,
  Landmark,
  Upload,
  Sparkles
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { AccountHead, JournalEntry, Invoice, PurchaseBill, Expense } from '../../types';
import { BankStatementImportModal } from './BankStatementImportModal';

interface LedgerPosting {
  id: string;
  date: string;
  timestamp: number;
  voucherType: 'INVOICE' | 'PAYMENT_RECEIVED' | 'PURCHASE_BILL' | 'VENDOR_PAYMENT' | 'EXPENSE' | 'JOURNAL_ENTRY' | 'OPENING';
  voucherNumber: string;
  particulars: string;
  oppositeAccount?: string;
  debit: number;
  credit: number;
  runningBalance?: number;
  balanceType?: 'Dr' | 'Cr';
}

const SUBCATEGORY_OPTIONS: { [cat: string]: string[] } = {
  ASSET: [
    'Bank Accounts',
    'Cash on Hand',
    'Sundry Debtors (Receivables)',
    'Stock / Inventory',
    'Fixed Assets & Equipment',
    'Loans & Advances (Asset)',
    'Duties & Taxes (Input GST Credit)',
    'Other Current Assets'
  ],
  LIABILITY: [
    'Sundry Creditors (Payables)',
    'Duties & Taxes (Output GST Liability)',
    'Bank Overdraft / OD / CC',
    'Secured & Unsecured Loans',
    'Current Liabilities & Provisions',
    'Statutory Liabilities (TDS/PF/ESI)'
  ],
  EQUITY: [
    'Owner / Partner Capital',
    'Retained Earnings & Reserves',
    'Share Capital',
    'Drawings Account'
  ],
  INCOME: [
    'Revenue from Operations (Sales)',
    'Service & Consulting Charges',
    'Interest & Dividend Income',
    'Discount & Commission Received',
    'Other Direct & Indirect Incomes'
  ],
  EXPENSE: [
    'Cost of Goods Sold / Purchases',
    'Rent, Rates & Office Space',
    'Freight, Logistics & Shipping',
    'Electricity, Fuel & Utilities',
    'Staff Salaries, Wages & Bonus',
    'Legal & Professional Fees',
    'Advertising & Marketing',
    'Bank Charges & Interest Paid',
    'Printing, Stationery & Postage',
    'Repairs & Maintenance',
    'Miscellaneous Operating Expenses'
  ]
};

export const AccountingView: React.FC = () => {
  const { 
    business, 
    accountHeads: baseAccountHeads, 
    createAccountHead,
    updateAccountHead,
    deleteAccountHead,
    clearAllLedgerData,
    journalEntries, 
    createJournalEntry, 
    updateJournalEntry,
    deleteJournalEntry,
    invoices, 
    purchaseBills, 
    expenses 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'general_ledger' | 'daybook' | 'trial_balance' | 'pnl' | 'balance_sheet'>('overview');
  const [showClearLedgerModal, setShowClearLedgerModal] = useState(false);
  const [isClearingLedger, setIsClearingLedger] = useState(false);
  
  // Ledger Drilldown State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-2'); // Default to Bank
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStartDate, setLedgerStartDate] = useState('2026-04-01');
  const [ledgerEndDate, setLedgerEndDate] = useState('2027-03-31');

  // Daybook Filters
  const [daybookSearch, setDaybookSearch] = useState('');
  const [daybookAccountFilter, setDaybookAccountFilter] = useState('all');

  // Chart of Accounts Filters
  const [coaSearch, setCoaSearch] = useState('');
  const [coaCategoryFilter, setCoaCategoryFilter] = useState<string>('ALL');

  // Bank Statement Auto Entry Import Modal State
  const [showBankStatementImportModal, setShowBankStatementImportModal] = useState<boolean>(false);

  // JV Entry Modal State
  const [showJvModal, setShowJvModal] = useState(false);
  const [editingJvId, setEditingJvId] = useState<string | null>(null);
  const [editingJvNumber, setEditingJvNumber] = useState<string>('');
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  // JV Entry Form State
  const [jvDate, setJvDate] = useState(new Date().toISOString().split('T')[0]);
  const [jvDescription, setJvDescription] = useState('');
  const [jvReference, setJvReference] = useState('');
  const [jvLines, setJvLines] = useState<Array<{ accountId: string; accountName: string; debit: number; credit: number }>>([
    { accountId: 'acc-1', accountName: 'Cash in Hand', debit: 0, credit: 0 },
    { accountId: 'acc-16', accountName: 'Rent & Office Expenses', debit: 0, credit: 0 }
  ]);

  // Account Head (Ledger Master) Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountHead | null>(null);

  // Account Head Form State
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [accCategory, setAccCategory] = useState<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>('EXPENSE');
  const [accSubCategory, setAccSubCategory] = useState('Miscellaneous Operating Expenses');
  const [accOpeningBalance, setAccOpeningBalance] = useState<number>(0);
  const [accOpeningType, setAccOpeningType] = useState<'Dr' | 'Cr'>('Dr');
  const [accDescription, setAccDescription] = useState('');

  // =========================================================================
  // DYNAMIC GENERAL LEDGER ENGINE (Accurate Double-Entry Computation)
  // =========================================================================
  const { accountLedgerMap, dynamicAccountHeads, trialBalanceStats } = useMemo(() => {
    // 1. Initialize Map for all accounts
    const map: { [accId: string]: LedgerPosting[] } = {};
    baseAccountHeads.forEach(acc => {
      map[acc.id] = [];
    });

    // Ensure common standard accounts exist in map
    const standardIds = [
      'acc-1', 'acc-2', 'acc-3', 'acc-4', 'acc-5', 'acc-6', 'acc-7',
      'acc-8', 'acc-9', 'acc-10', 'acc-11', 'acc-12', 'acc-13', 'acc-14',
      'acc-15', 'acc-16', 'acc-17', 'acc-18', 'acc-19'
    ];
    standardIds.forEach(id => {
      if (!map[id]) map[id] = [];
    });

    // 2. Post Sales Invoices (Accrual basis)
    invoices.filter(inv => inv.status !== 'CANCELLED').forEach(inv => {
      const invDate = inv.invoiceDate;
      const invTimestamp = new Date(invDate + 'T10:00:00').getTime();

      // Dr: Sundry Debtors (Gross Amount)
      if (map['acc-3']) {
        map['acc-3'].push({
          id: `inv-dr-${inv.id}`,
          date: invDate,
          timestamp: invTimestamp,
          voucherType: 'INVOICE',
          voucherNumber: inv.invoiceNumber,
          particulars: `Sales to ${inv.customerName} (${inv.items.length} items)`,
          oppositeAccount: 'Sales Revenue & GST',
          debit: inv.grandTotal,
          credit: 0
        });
      }

      // Cr: Sales Revenue (Taxable Amount)
      if (map['acc-14']) {
        map['acc-14'].push({
          id: `inv-cr-sales-${inv.id}`,
          date: invDate,
          timestamp: invTimestamp,
          voucherType: 'INVOICE',
          voucherNumber: inv.invoiceNumber,
          particulars: `Taxable Sales to ${inv.customerName}`,
          oppositeAccount: 'Sundry Debtors',
          debit: 0,
          credit: inv.subTotalTaxable
        });
      }

      // Cr: Output CGST
      if (inv.totalCgst > 0 && map['acc-9']) {
        map['acc-9'].push({
          id: `inv-cr-cgst-${inv.id}`,
          date: invDate,
          timestamp: invTimestamp,
          voucherType: 'INVOICE',
          voucherNumber: inv.invoiceNumber,
          particulars: `Output CGST on ${inv.invoiceNumber}`,
          oppositeAccount: 'Sundry Debtors',
          debit: 0,
          credit: inv.totalCgst
        });
      }

      // Cr: Output SGST
      if (inv.totalSgst > 0 && map['acc-10']) {
        map['acc-10'].push({
          id: `inv-cr-sgst-${inv.id}`,
          date: invDate,
          timestamp: invTimestamp,
          voucherType: 'INVOICE',
          voucherNumber: inv.invoiceNumber,
          particulars: `Output SGST on ${inv.invoiceNumber}`,
          oppositeAccount: 'Sundry Debtors',
          debit: 0,
          credit: inv.totalSgst
        });
      }

      // Cr: Output IGST
      if (inv.totalIgst > 0 && map['acc-11']) {
        map['acc-11'].push({
          id: `inv-cr-igst-${inv.id}`,
          date: invDate,
          timestamp: invTimestamp,
          voucherType: 'INVOICE',
          voucherNumber: inv.invoiceNumber,
          particulars: `Output IGST on ${inv.invoiceNumber}`,
          oppositeAccount: 'Sundry Debtors',
          debit: 0,
          credit: inv.totalIgst
        });
      }

      // Customer Payment Receipts
      if (inv.amountPaid > 0) {
        const payAccount = inv.paymentMethod === 'CASH' ? 'acc-1' : 'acc-2';
        const payTimestamp = invTimestamp + 1000;

        // Dr: Bank / Cash
        if (map[payAccount]) {
          map[payAccount].push({
            id: `pay-dr-${inv.id}`,
            date: invDate,
            timestamp: payTimestamp,
            voucherType: 'PAYMENT_RECEIVED',
            voucherNumber: `RCPT-${inv.invoiceNumber}`,
            particulars: `Receipt from ${inv.customerName} (${inv.paymentMethod || 'UPI/Bank'})`,
            oppositeAccount: 'Sundry Debtors',
            debit: inv.amountPaid,
            credit: 0
          });
        }

        // Cr: Sundry Debtors
        if (map['acc-3']) {
          map['acc-3'].push({
            id: `pay-cr-debtor-${inv.id}`,
            date: invDate,
            timestamp: payTimestamp,
            voucherType: 'PAYMENT_RECEIVED',
            voucherNumber: `RCPT-${inv.invoiceNumber}`,
            particulars: `Payment received against ${inv.invoiceNumber}`,
            oppositeAccount: inv.paymentMethod === 'CASH' ? 'Cash in Hand' : 'HDFC Bank',
            debit: 0,
            credit: inv.amountPaid
          });
        }
      }
    });

    // 3. Post Purchase Bills
    purchaseBills.forEach(bill => {
      const billDate = bill.billDate;
      const billTimestamp = new Date(billDate + 'T11:00:00').getTime();

      // Dr: COGS / Purchases (Taxable)
      if (map['acc-15']) {
        map['acc-15'].push({
          id: `bill-dr-cogs-${bill.id}`,
          date: billDate,
          timestamp: billTimestamp,
          voucherType: 'PURCHASE_BILL',
          voucherNumber: bill.billNumber,
          particulars: `Purchase from ${bill.vendorName} (Ref: ${bill.vendorInvoiceNumber})`,
          oppositeAccount: 'Sundry Creditors',
          debit: bill.subTotalTaxable,
          credit: 0
        });
      }

      // Dr: ITC CGST
      if (bill.totalCgst > 0 && map['acc-5']) {
        map['acc-5'].push({
          id: `bill-dr-cgst-${bill.id}`,
          date: billDate,
          timestamp: billTimestamp,
          voucherType: 'PURCHASE_BILL',
          voucherNumber: bill.billNumber,
          particulars: `Input Tax Credit (CGST) - ${bill.vendorName}`,
          oppositeAccount: 'Sundry Creditors',
          debit: bill.totalCgst,
          credit: 0
        });
      }

      // Dr: ITC SGST
      if (bill.totalSgst > 0 && map['acc-6']) {
        map['acc-6'].push({
          id: `bill-dr-sgst-${bill.id}`,
          date: billDate,
          timestamp: billTimestamp,
          voucherType: 'PURCHASE_BILL',
          voucherNumber: bill.billNumber,
          particulars: `Input Tax Credit (SGST) - ${bill.vendorName}`,
          oppositeAccount: 'Sundry Creditors',
          debit: bill.totalSgst,
          credit: 0
        });
      }

      // Dr: ITC IGST
      if (bill.totalIgst > 0 && map['acc-7']) {
        map['acc-7'].push({
          id: `bill-dr-igst-${bill.id}`,
          date: billDate,
          timestamp: billTimestamp,
          voucherType: 'PURCHASE_BILL',
          voucherNumber: bill.billNumber,
          particulars: `Input Tax Credit (IGST) - ${bill.vendorName}`,
          oppositeAccount: 'Sundry Creditors',
          debit: bill.totalIgst,
          credit: 0
        });
      }

      // Cr: Sundry Creditors (Gross)
      if (map['acc-8']) {
        map['acc-8'].push({
          id: `bill-cr-creditor-${bill.id}`,
          date: billDate,
          timestamp: billTimestamp,
          voucherType: 'PURCHASE_BILL',
          voucherNumber: bill.billNumber,
          particulars: `Inward supply from ${bill.vendorName}`,
          oppositeAccount: 'Purchases & ITC',
          debit: 0,
          credit: bill.grandTotal
        });
      }

      // Vendor Payments
      if (bill.amountPaid > 0) {
        const payAccount = bill.paymentMethod === 'CASH' ? 'acc-1' : 'acc-2';
        const payTimestamp = billTimestamp + 2000;

        // Dr: Sundry Creditors
        if (map['acc-8']) {
          map['acc-8'].push({
            id: `vpay-dr-${bill.id}`,
            date: billDate,
            timestamp: payTimestamp,
            voucherType: 'VENDOR_PAYMENT',
            voucherNumber: `PMT-${bill.billNumber}`,
            particulars: `Payment to ${bill.vendorName} (${bill.paymentMethod || 'Bank'})`,
            oppositeAccount: bill.paymentMethod === 'CASH' ? 'Cash in Hand' : 'HDFC Bank',
            debit: bill.amountPaid,
            credit: 0
          });
        }

        // Cr: Bank / Cash
        if (map[payAccount]) {
          map[payAccount].push({
            id: `vpay-cr-${bill.id}`,
            date: billDate,
            timestamp: payTimestamp,
            voucherType: 'VENDOR_PAYMENT',
            voucherNumber: `PMT-${bill.billNumber}`,
            particulars: `Disbursed to ${bill.vendorName} for ${bill.billNumber}`,
            oppositeAccount: 'Sundry Creditors',
            debit: 0,
            credit: bill.amountPaid
          });
        }
      }
    });

    // 4. Post Expenses
    expenses.forEach(exp => {
      const expDate = exp.date;
      const expTimestamp = new Date(expDate + 'T12:00:00').getTime();
      const payAccount = exp.paymentMethod === 'CASH' ? 'acc-1' : 'acc-2';

      let targetExpHead = 'acc-16'; // Default Rent
      if (exp.category.toLowerCase().includes('freight') || exp.category.toLowerCase().includes('courier')) {
        targetExpHead = 'acc-17';
      } else if (exp.category.toLowerCase().includes('electricity') || exp.category.toLowerCase().includes('utility')) {
        targetExpHead = 'acc-18';
      }

      const hasGst = exp.hasGstBill && exp.gstAmount > 0;
      const netExpense = hasGst ? (exp.amount - exp.gstAmount) : exp.amount;

      // Dr: Expense Account Head
      if (map[targetExpHead]) {
        map[targetExpHead].push({
          id: `exp-dr-${exp.id}`,
          date: expDate,
          timestamp: expTimestamp,
          voucherType: 'EXPENSE',
          voucherNumber: exp.referenceNo || `EXP-${exp.id.slice(0, 6)}`,
          particulars: `${exp.category}: Paid to ${exp.payee} (${exp.notes || ''})`,
          oppositeAccount: exp.paymentMethod === 'CASH' ? 'Cash in Hand' : 'HDFC Bank',
          debit: netExpense,
          credit: 0
        });
      }

      // Dr: ITC on Expense
      if (hasGst) {
        const halfGst = exp.gstAmount / 2;
        if (map['acc-5']) {
          map['acc-5'].push({
            id: `exp-itc-cgst-${exp.id}`,
            date: expDate,
            timestamp: expTimestamp,
            voucherType: 'EXPENSE',
            voucherNumber: exp.referenceNo || `EXP-${exp.id.slice(0, 6)}`,
            particulars: `ITC CGST on Expense: ${exp.payee}`,
            oppositeAccount: exp.paymentMethod === 'CASH' ? 'Cash in Hand' : 'HDFC Bank',
            debit: halfGst,
            credit: 0
          });
        }
        if (map['acc-6']) {
          map['acc-6'].push({
            id: `exp-itc-sgst-${exp.id}`,
            date: expDate,
            timestamp: expTimestamp,
            voucherType: 'EXPENSE',
            voucherNumber: exp.referenceNo || `EXP-${exp.id.slice(0, 6)}`,
            particulars: `ITC SGST on Expense: ${exp.payee}`,
            oppositeAccount: exp.paymentMethod === 'CASH' ? 'Cash in Hand' : 'HDFC Bank',
            debit: halfGst,
            credit: 0
          });
        }
      }

      // Cr: Cash / Bank
      if (map[payAccount]) {
        map[payAccount].push({
          id: `exp-cr-${exp.id}`,
          date: expDate,
          timestamp: expTimestamp,
          voucherType: 'EXPENSE',
          voucherNumber: exp.referenceNo || `EXP-${exp.id.slice(0, 6)}`,
          particulars: `Expense payment to ${exp.payee} (${exp.category})`,
          oppositeAccount: 'Operating Expenses',
          debit: 0,
          credit: exp.amount
        });
      }
    });

    // 5. Post Manual Journal Entries (JVs)
    journalEntries.forEach(jv => {
      const jvDateVal = jv.date;
      const jvTimestamp = new Date(jvDateVal + 'T14:00:00').getTime();

      jv.lines.forEach((line, lineIdx) => {
        if (!map[line.accountId]) {
          map[line.accountId] = [];
        }

        const otherLines = jv.lines.filter((_, i) => i !== lineIdx);
        const oppAccountName = otherLines.map(l => l.accountName).join(' / ') || 'General Journal Adjustment';

        map[line.accountId].push({
          id: `jv-${jv.id}-${lineIdx}`,
          date: jvDateVal,
          timestamp: jvTimestamp,
          voucherType: 'JOURNAL_ENTRY',
          voucherNumber: jv.entryNumber,
          particulars: `${jv.description} ${jv.reference ? `(Ref: ${jv.reference})` : ''}`,
          oppositeAccount: oppAccountName,
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0
        });
      });
    });

    // 6. Compute Dynamic Balances for each Account Head
    let totalTrialDebit = 0;
    let totalTrialCredit = 0;

    const dynamicHeads: AccountHead[] = baseAccountHeads.map(baseAcc => {
      const postings = map[baseAcc.id] || [];
      // Sort postings chronologically
      postings.sort((a, b) => a.timestamp - b.timestamp);

      const isAssetOrExpense = baseAcc.category === 'ASSET' || baseAcc.category === 'EXPENSE';
      const openBal = baseAcc.openingBalance !== undefined 
        ? Number(baseAcc.openingBalance) 
        : (Number(baseAcc.balance) || 0);

      const sumDebit = postings.reduce((s, p) => s + p.debit, 0);
      const sumCredit = postings.reduce((s, p) => s + p.credit, 0);

      let finalBalance = 0;
      if (isAssetOrExpense) {
        finalBalance = openBal + sumDebit - sumCredit;
      } else {
        finalBalance = openBal + sumCredit - sumDebit;
      }

      // Calculate running balance on each posting for statement view
      let running = openBal;
      postings.forEach(p => {
        if (isAssetOrExpense) {
          running += (p.debit - p.credit);
          p.runningBalance = Math.abs(running);
          p.balanceType = running >= 0 ? 'Dr' : 'Cr';
        } else {
          running += (p.credit - p.debit);
          p.runningBalance = Math.abs(running);
          p.balanceType = running >= 0 ? 'Cr' : 'Dr';
        }
      });

      if (isAssetOrExpense) {
        totalTrialDebit += (openBal + sumDebit);
        totalTrialCredit += sumCredit;
      } else {
        totalTrialDebit += sumDebit;
        totalTrialCredit += (openBal + sumCredit);
      }

      return {
        ...baseAcc,
        openingBalance: openBal,
        balance: finalBalance
      };
    });

    return {
      accountLedgerMap: map,
      dynamicAccountHeads: dynamicHeads,
      trialBalanceStats: {
        totalDebit: totalTrialDebit,
        totalCredit: totalTrialCredit
      }
    };
  }, [baseAccountHeads, invoices, purchaseBills, expenses, journalEntries]);

  // Selected Account for Ledger Statement View
  const currentAccount = useMemo(() => {
    return dynamicAccountHeads.find(a => a.id === selectedAccountId) || dynamicAccountHeads[0];
  }, [dynamicAccountHeads, selectedAccountId]);

  const currentAccountPostings = useMemo(() => {
    const rawPostings = accountLedgerMap[selectedAccountId] || [];
    return rawPostings.filter(p => {
      const matchSearch = ledgerSearch.trim() === '' ||
        p.voucherNumber.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        p.particulars.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (p.oppositeAccount && p.oppositeAccount.toLowerCase().includes(ledgerSearch.toLowerCase()));

      const matchDate = (!ledgerStartDate || p.date >= ledgerStartDate) &&
                        (!ledgerEndDate || p.date <= ledgerEndDate);

      return matchSearch && matchDate;
    });
  }, [accountLedgerMap, selectedAccountId, ledgerSearch, ledgerStartDate, ledgerEndDate]);

  // Filtered Chart of Accounts
  const filteredChartOfAccounts = useMemo(() => {
    return dynamicAccountHeads.filter(acc => {
      const matchSearch = coaSearch.trim() === '' ||
        acc.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
        acc.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
        (acc.subCategory && acc.subCategory.toLowerCase().includes(coaSearch.toLowerCase()));

      const matchCategory = coaCategoryFilter === 'ALL' || acc.category === coaCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [dynamicAccountHeads, coaSearch, coaCategoryFilter]);

  // Compute Live Financials
  const totalSalesRevenue = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, i) => sum + i.subTotalTaxable, 0);

  const totalOutputGst = invoices
    .filter(i => i.status !== 'CANCELLED')
    .reduce((sum, i) => sum + i.totalTax, 0);

  const totalPurchaseCost = purchaseBills
    .reduce((sum, b) => sum + b.subTotalTaxable, 0);

  const totalInputGst = purchaseBills
    .reduce((sum, b) => sum + b.totalTax, 0);

  const totalExpensesAmount = expenses
    .reduce((sum, e) => sum + e.amount, 0);

  const grossProfit = totalSalesRevenue - totalPurchaseCost;
  const netProfit = grossProfit - totalExpensesAmount;

  const totalReceivables = invoices
    .filter(i => i.status === 'UNPAID' || i.status === 'PARTIALLY_PAID')
    .reduce((sum, i) => sum + i.amountDue, 0);

  const totalPayables = purchaseBills
    .filter(b => b.status === 'UNPAID' || b.status === 'PARTIALLY_PAID')
    .reduce((sum, b) => sum + b.amountDue, 0);

  const netGstPayable = Math.max(0, totalOutputGst - totalInputGst);
  const excessItcCarriedForward = Math.max(0, totalInputGst - totalOutputGst);

  // JV Balances validation
  const totalDebit = jvLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = jvLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isJvBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  // Filtered Daybook Entries
  const filteredDaybookEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const matchSearch = daybookSearch.trim() === '' || 
        entry.entryNumber.toLowerCase().includes(daybookSearch.toLowerCase()) ||
        entry.description.toLowerCase().includes(daybookSearch.toLowerCase()) ||
        (entry.reference && entry.reference.toLowerCase().includes(daybookSearch.toLowerCase())) ||
        entry.lines.some(l => l.accountName.toLowerCase().includes(daybookSearch.toLowerCase()));

      const matchAccount = daybookAccountFilter === 'all' ||
        entry.lines.some(l => l.accountId === daybookAccountFilter);

      return matchSearch && matchAccount;
    });
  }, [journalEntries, daybookSearch, daybookAccountFilter]);

  // =========================================================================
  // ACCOUNT HEAD (LEDGER MASTER) HANDLERS
  // =========================================================================
  const suggestAccountCode = (category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE') => {
    const prefixes: { [cat: string]: number } = {
      ASSET: 1000,
      LIABILITY: 2000,
      EQUITY: 3000,
      INCOME: 4000,
      EXPENSE: 5000
    };
    const prefix = prefixes[category];
    const existingCodes = baseAccountHeads
      .map(a => parseInt(a.code, 10))
      .filter(n => !isNaN(n) && n >= prefix && n < prefix + 1000);

    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : prefix;
    return String(maxCode + 10);
  };

  const handleOpenNewAccount = () => {
    setEditingAccountId(null);
    const cat = 'EXPENSE';
    setAccCategory(cat);
    setAccCode(suggestAccountCode(cat));
    setAccName('');
    setAccSubCategory(SUBCATEGORY_OPTIONS[cat][0] || '');
    setAccOpeningBalance(0);
    setAccOpeningType('Dr');
    setAccDescription('');
    setShowAccountModal(true);
  };

  const handleOpenEditAccount = (acc: AccountHead) => {
    setEditingAccountId(acc.id);
    setAccCode(acc.code);
    setAccName(acc.name);
    setAccCategory(acc.category);
    setAccSubCategory(acc.subCategory || SUBCATEGORY_OPTIONS[acc.category][0] || '');
    setAccOpeningBalance(acc.openingBalance || 0);
    setAccOpeningType(acc.openingBalanceType || (acc.category === 'ASSET' || acc.category === 'EXPENSE' ? 'Dr' : 'Cr'));
    setAccDescription(acc.description || '');
    setShowAccountModal(true);
  };

  const handleCategoryChange = (newCat: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE') => {
    setAccCategory(newCat);
    if (!editingAccountId) {
      setAccCode(suggestAccountCode(newCat));
    }
    const defaultSub = SUBCATEGORY_OPTIONS[newCat][0] || '';
    setAccSubCategory(defaultSub);
    setAccOpeningType(newCat === 'ASSET' || newCat === 'EXPENSE' ? 'Dr' : 'Cr');
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accCode.trim()) return;

    if (editingAccountId) {
      updateAccountHead(editingAccountId, {
        code: accCode.trim(),
        name: accName.trim(),
        category: accCategory,
        subCategory: accSubCategory,
        openingBalance: Number(accOpeningBalance) || 0,
        openingBalanceType: accOpeningType,
        description: accDescription.trim()
      });
    } else {
      createAccountHead({
        code: accCode.trim(),
        name: accName.trim(),
        category: accCategory,
        subCategory: accSubCategory,
        openingBalance: Number(accOpeningBalance) || 0,
        openingBalanceType: accOpeningType,
        description: accDescription.trim(),
        balance: 0,
        isSystem: false
      });
    }

    setShowAccountModal(false);
    setEditingAccountId(null);
  };

  const handleConfirmDeleteAccount = () => {
    if (accountToDelete) {
      const success = deleteAccountHead(accountToDelete.id);
      if (success) {
        if (selectedAccountId === accountToDelete.id) {
          setSelectedAccountId('acc-2');
        }
      }
      setAccountToDelete(null);
    }
  };

  // =========================================================================
  // JOURNAL VOUCHER HANDLERS
  // =========================================================================
  const handleOpenNewJv = () => {
    setEditingJvId(null);
    setEditingJvNumber('');
    setJvDate(new Date().toISOString().split('T')[0]);
    setJvDescription('');
    setJvReference('');
    setJvLines([
      { accountId: 'acc-1', accountName: 'Cash in Hand', debit: 0, credit: 0 },
      { accountId: 'acc-16', accountName: 'Rent & Office Expenses', debit: 0, credit: 0 }
    ]);
    setShowJvModal(true);
  };

  const handleOpenEditJv = (entry: JournalEntry) => {
    setEditingJvId(entry.id);
    setEditingJvNumber(entry.entryNumber);
    setJvDate(entry.date);
    setJvDescription(entry.description);
    setJvReference(entry.reference || '');
    setJvLines(entry.lines.map(l => ({ ...l })));
    setShowJvModal(true);
  };

  const handleAddJvLine = () => {
    setJvLines(prev => [...prev, { 
      accountId: dynamicAccountHeads[0]?.id || 'acc-1', 
      accountName: dynamicAccountHeads[0]?.name || '', 
      debit: 0, 
      credit: 0 
    }]);
  };

  const handleRemoveJvLine = (index: number) => {
    if (jvLines.length <= 2) return;
    setJvLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateJvLine = (index: number, field: 'accountId' | 'debit' | 'credit', value: any) => {
    setJvLines(prev => prev.map((l, i) => {
      if (i === index) {
        if (field === 'accountId') {
          const acc = dynamicAccountHeads.find(a => a.id === value);
          return { ...l, accountId: value, accountName: acc ? acc.name : '' };
        }
        if (field === 'debit') {
          return { ...l, debit: parseFloat(value) || 0, credit: 0 };
        }
        if (field === 'credit') {
          return { ...l, credit: parseFloat(value) || 0, debit: 0 };
        }
      }
      return l;
    }));
  };

  const handleSaveJv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJvBalanced) return;
    if (!jvDescription.trim()) return;

    if (editingJvId) {
      updateJournalEntry(editingJvId, {
        date: jvDate,
        description: jvDescription,
        reference: jvReference,
        lines: jvLines
      });
    } else {
      createJournalEntry({
        entryNumber: `JV-${new Date().getFullYear()}-${String(journalEntries.length + 1).padStart(3, '0')}`,
        date: jvDate,
        description: jvDescription,
        reference: jvReference,
        lines: jvLines
      });
    }

    setShowJvModal(false);
    setEditingJvId(null);
  };

  const handleConfirmDeleteJv = () => {
    if (entryToDelete) {
      deleteJournalEntry(entryToDelete.id);
      setEntryToDelete(null);
    }
  };

  // Cash, Bank, Debtors, Creditors and Capital Balances
  const cashHead = dynamicAccountHeads.find(a => a.id === 'acc-1');
  const bankHead = dynamicAccountHeads.find(a => a.id === 'acc-2');
  const debtorsHead = dynamicAccountHeads.find(a => a.id === 'acc-3');
  const creditorsHead = dynamicAccountHeads.find(a => a.id === 'acc-8');
  const capitalHead = dynamicAccountHeads.find(a => a.id === 'acc-12' || a.code === '3000' || a.category === 'EQUITY');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Financial Accounting & General Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time double-entry posting engine, Ledger Master (Add/Edit/Delete), General Ledger Statements, Daybook, P&L & Balance Sheet.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowClearLedgerModal(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            title="Clear all journal entries and reset ledger accounts to zero baseline"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear Ledger Data</span>
          </button>

          <button
            onClick={() => setShowBankStatementImportModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
            title="Import Bank Statement CSV for auto-reconciliation and voucher posting"
          >
            <Landmark className="w-4 h-4 text-indigo-600" />
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Bank Statement Auto Entry (CSV)</span>
          </button>

          <button
            onClick={handleOpenNewAccount}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-slate-600" />
            <span>+ Add Ledger Account</span>
          </button>

          <button
            onClick={handleOpenNewJv}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Journal Entry</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Accounting Dashboard
        </button>

        <button
          onClick={() => setActiveSubTab('trial_balance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'trial_balance'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Chart of Accounts & Ledger Master</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
            {dynamicAccountHeads.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('general_ledger')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'general_ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>General Ledger Statement</span>
        </button>

        <button
          onClick={() => setActiveSubTab('daybook')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeSubTab === 'daybook'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span>Daybook & Journal Entries</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
            {journalEntries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('pnl')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'pnl'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Profit & Loss Statement
        </button>

        <button
          onClick={() => setActiveSubTab('balance_sheet')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'balance_sheet'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Balance Sheet
        </button>
      </div>

      {/* =========================================================================
          TAB 1: ACCOUNTING OVERVIEW
         ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Revenue (Sales)</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{formatINR(totalSalesRevenue)}</div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1">From Tax Invoices</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Total Purchases</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{formatINR(totalPurchaseCost)}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">From Inward Bills</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Net Estimated Profit</span>
                <DollarSign className="w-4 h-4 text-indigo-500" />
              </div>
              <div className={`text-xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatINR(netProfit)}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">After direct & indirect expenses</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Accounts Receivable</span>
                <Scale className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold text-amber-700">{formatINR(totalReceivables)}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">Outstanding from clients</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Chart of Accounts Summary */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Accurate General Ledger Account Balances
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Click any account below to open its detailed statement of debits and credits
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenNewAccount}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Account</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setActiveSubTab('trial_balance')}
                    className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Manage All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {dynamicAccountHeads.slice(0, 8).map(acc => (
                  <div 
                    key={acc.id} 
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setActiveSubTab('general_ledger');
                    }}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5 transition-colors">
                        <span>{acc.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-200/70 px-1.5 py-0.2 rounded">
                          {acc.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">{acc.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">
                        {formatINR(Math.abs(acc.balance))}
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        acc.category === 'ASSET' || acc.category === 'EXPENSE'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {acc.category === 'ASSET' || acc.category === 'EXPENSE' ? 'Dr Balance' : 'Cr Balance'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Daybook Log */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-slate-900">Recent Journal Vouchers</h3>
                <button
                  onClick={() => setActiveSubTab('daybook')}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Full Daybook &rarr;
                </button>
              </div>

              <div className="space-y-3">
                {journalEntries.slice(0, 4).map(entry => (
                  <div key={entry.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs relative group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold font-mono text-indigo-600">{entry.entryNumber}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">{entry.date}</span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditJv(entry)}
                            title="Edit Journal Entry"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEntryToDelete(entry)}
                            title="Delete Journal Entry"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="font-medium text-slate-900 mb-2 truncate">{entry.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-slate-400 font-semibold">Debit: </span>
                        <span className="text-slate-700 font-medium">{entry.lines.filter(l => l.debit > 0).map(l => `${l.accountName} (${formatINR(l.debit)})`).join(', ')}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-semibold">Credit: </span>
                        <span className="text-slate-700 font-medium">{entry.lines.filter(l => l.credit > 0).map(l => `${l.accountName} (${formatINR(l.credit)})`).join(', ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CHART OF ACCOUNTS & LEDGER MASTER (ADD / EDIT / DELETE)
         ========================================================================= */}
      {activeSubTab === 'trial_balance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header & Master Controls */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Chart of Accounts & Ledger Master (Ind AS)
                </h3>
                <p className="text-xs text-slate-500">
                  Add, edit, customize, or delete general ledger account heads across Assets, Liabilities, Equity, Incomes & Expenses.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenNewAccount}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Ledger Account</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search account code, name or group..."
                    value={coaSearch}
                    onChange={e => setCoaSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-60 sm:w-72"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCoaCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        coaCategoryFilter === cat
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                Showing {filteredChartOfAccounts.length} of {dynamicAccountHeads.length} Accounts
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Name & Sub-Group</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4 text-right">Opening Balance</th>
                    <th className="py-3 px-4 text-right">Debit Balance (Dr)</th>
                    <th className="py-3 px-4 text-right">Credit Balance (Cr)</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredChartOfAccounts.map(acc => {
                    const isDr = acc.category === 'ASSET' || acc.category === 'EXPENSE';
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {acc.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>{acc.name}</span>
                            {acc.isSystem && (
                              <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                System Default
                              </span>
                            )}
                          </div>
                          {acc.subCategory && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              {acc.subCategory}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.category === 'ASSET' ? 'bg-blue-100 text-blue-800' :
                            acc.category === 'LIABILITY' ? 'bg-amber-100 text-amber-800' :
                            acc.category === 'EQUITY' ? 'bg-purple-100 text-purple-800' :
                            acc.category === 'INCOME' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {acc.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          {acc.openingBalance ? formatINR(acc.openingBalance) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {isDr ? formatINR(Math.abs(acc.balance)) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {!isDr ? formatINR(Math.abs(acc.balance)) : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Drilldown to Statement */}
                            <button
                              onClick={() => {
                                setSelectedAccountId(acc.id);
                                setActiveSubTab('general_ledger');
                              }}
                              className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-md font-semibold cursor-pointer flex items-center gap-1"
                              title="View Ledger Statement"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Statement</span>
                            </button>

                            {/* Edit Account */}
                            <button
                              onClick={() => handleOpenEditAccount(acc)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                              title="Edit Ledger Account Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Account */}
                            <button
                              onClick={() => setAccountToDelete(acc)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                              title="Delete Ledger Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredChartOfAccounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No ledger accounts matching the search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-xs">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-slate-900 uppercase">
                      Trial Balance Totals (Dr = Cr)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-800 text-sm">
                      {formatINR(dynamicAccountHeads.filter(a => a.category === 'ASSET' || a.category === 'EXPENSE').reduce((s, a) => s + Math.abs(a.balance), 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-800 text-sm">
                      {formatINR(dynamicAccountHeads.filter(a => a.category !== 'ASSET' && a.category !== 'EXPENSE').reduce((s, a) => s + Math.abs(a.balance), 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ACCURATE GENERAL LEDGER ACCOUNT STATEMENT (DRILL-DOWN)
         ========================================================================= */}
      {activeSubTab === 'general_ledger' && (
        <div className="space-y-5">
          {/* Top Account Selector & Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Select General Ledger Account:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold">
                    {currentAccount.code}
                  </span>
                </div>
                <select
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="px-3 py-2 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 min-w-[280px]"
                >
                  {dynamicAccountHeads.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name} ({acc.category}) — Bal: {formatINR(Math.abs(acc.balance))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Balance Summary Highlight */}
              <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Account Classification
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {currentAccount.category}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Transactions
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {currentAccountPostings.length} Postings
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Closing Ledger Balance
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono font-extrabold text-indigo-700">
                      {formatINR(Math.abs(currentAccount.balance))}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                      {currentAccount.category === 'ASSET' || currentAccount.category === 'EXPENSE' ? 'Dr' : 'Cr'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search narration or voucher #..."
                    value={ledgerSearch}
                    onChange={e => setLedgerSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-60"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>From:</span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={e => setLedgerStartDate(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                  <span>To:</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={e => setLedgerEndDate(e.target.value)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBankStatementImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors shadow-2xs active:scale-95"
                  title="Import Bank Statement CSV for this Account"
                >
                  <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Auto Entry from Bank Statement (CSV)</span>
                </button>

                <button
                  onClick={() => handleOpenEditAccount(currentAccount)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit Account Details</span>
                </button>
              </div>
            </div>
          </div>

          {/* If current account is Bank Account, show specialized Bank Reconcile banner */}
          {(currentAccount.name.toLowerCase().includes('bank') || currentAccount.code === '1010' || currentAccount.subCategory?.toLowerCase().includes('bank')) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50/50 border border-indigo-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-indigo-950 flex items-center gap-2">
                    <span>Reconcile & Auto-Populate {currentAccount.name} from Bank CSV</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      AI Parser
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Upload official bank statement CSV (HDFC, ICICI, SBI, Axis, Kotak) to auto-generate receipts, vendor payments, expenses, and contra transfers.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowBankStatementImportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer whitespace-nowrap active:scale-95 transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Auto Entry Bank Statement</span>
              </button>
            </div>
          )}

          {/* General Ledger Statement Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Voucher Type</th>
                    <th className="py-3 px-4">Voucher / Doc #</th>
                    <th className="py-3 px-4">Particulars & Opposing Account</th>
                    <th className="py-3 px-4 text-right">Debit (Dr)</th>
                    <th className="py-3 px-4 text-right">Credit (Cr)</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentAccountPostings.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {p.date}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.voucherType === 'INVOICE' ? 'bg-indigo-100 text-indigo-800' :
                          p.voucherType === 'PAYMENT_RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                          p.voucherType === 'PURCHASE_BILL' ? 'bg-amber-100 text-amber-800' :
                          p.voucherType === 'VENDOR_PAYMENT' ? 'bg-blue-100 text-blue-800' :
                          p.voucherType === 'EXPENSE' ? 'bg-rose-100 text-rose-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {p.voucherType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {p.voucherNumber}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">{p.particulars}</div>
                        {p.oppositeAccount && (
                          <div className="text-[10px] text-slate-400">
                            Opposite: {p.oppositeAccount}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                        {p.debit > 0 ? formatINR(p.debit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {p.credit > 0 ? formatINR(p.credit) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(p.runningBalance || 0)}
                        <span className="text-[10px] text-slate-400 ml-1 font-sans">
                          {p.balanceType || (currentAccount.category === 'ASSET' || currentAccount.category === 'EXPENSE' ? 'Dr' : 'Cr')}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {currentAccountPostings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 italic">
                        No transactions recorded for {currentAccount.name} in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-slate-800 uppercase font-extrabold">
                      Total Ledger Postings & Final Balance
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-700">
                      {formatINR(currentAccountPostings.reduce((s, p) => s + p.debit, 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700">
                      {formatINR(currentAccountPostings.reduce((s, p) => s + p.credit, 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-900 font-extrabold text-sm">
                      {formatINR(Math.abs(currentAccount.balance))}
                      <span className="text-xs ml-1 font-sans text-slate-500">
                        {currentAccount.category === 'ASSET' || currentAccount.category === 'EXPENSE' ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: DAYBOOK & JOURNAL ENTRIES
         ========================================================================= */}
      {activeSubTab === 'daybook' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header & Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-sm text-slate-900">General Journal Entries (Double-Entry Book)</h3>
              <p className="text-xs text-slate-500">Edit, delete, or create manual journal adjustments</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search voucher # or narration..."
                  value={daybookSearch}
                  onChange={e => setDaybookSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 w-52 sm:w-64"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <select
                value={daybookAccountFilter}
                onChange={e => setDaybookAccountFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none text-slate-700"
              >
                <option value="all">All Accounts</option>
                {dynamicAccountHeads.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>

              <button
                onClick={handleOpenNewJv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Voucher</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredDaybookEntries.map(entry => {
              const drTotal = entry.lines.reduce((s, l) => s + l.debit, 0);
              return (
                <div key={entry.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                        {entry.entryNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {entry.date}
                      </span>
                      {entry.reference && (
                        <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                          Ref: {entry.reference}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs font-extrabold text-slate-900">
                        Total Amount: {formatINR(drTotal)}
                      </div>

                      {/* Action Buttons: Edit, Delete */}
                      <div className="flex items-center gap-1 pl-3 border-l border-slate-200">
                        <button
                          onClick={() => handleOpenEditJv(entry)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                          title="Edit this Journal Voucher"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setEntryToDelete(entry)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                          title="Delete this Journal Voucher"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mb-3 italic">
                    "{entry.description}"
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-1.5 px-3">Account Head</th>
                          <th className="py-1.5 px-3 text-right">Debit (Dr)</th>
                          <th className="py-1.5 px-3 text-right">Credit (Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entry.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-white">
                            <td className="py-1.5 px-3 font-medium text-slate-800">
                              {line.accountName}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-blue-700">
                              {line.debit > 0 ? formatINR(line.debit) : '-'}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-emerald-700">
                              {line.credit > 0 ? formatINR(line.credit) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {filteredDaybookEntries.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic">
                No journal entries matching the search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: STATEMENT OF PROFIT & LOSS
         ========================================================================= */}
      {activeSubTab === 'pnl' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Statement of Profit & Loss</h3>
              <p className="text-xs text-slate-500">For the period 01-Apr-2026 to 31-Mar-2027</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-bold">
                Accrual Basis (GST Aligned)
              </span>
            </div>
          </div>

          <div className="space-y-6 text-xs">
            {/* 1. Revenue */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 bg-slate-50 p-2 rounded-lg">
                I. Revenue from Operations
              </h4>
              <div className="space-y-2 px-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Taxable Sales Turnover</span>
                  <span className="font-mono font-bold">{formatINR(totalSalesRevenue)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 bg-emerald-50/50 p-2 rounded">
                  <span>Total Revenue (A)</span>
                  <span className="font-mono">{formatINR(totalSalesRevenue)}</span>
                </div>
              </div>
            </div>

            {/* 2. Expenses */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 bg-slate-50 p-2 rounded-lg">
                II. Expenses
              </h4>
              <div className="space-y-2 px-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Cost of Materials Purchased (COGS)</span>
                  <span className="font-mono font-semibold">{formatINR(totalPurchaseCost)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">Operating & Administrative Expenses</span>
                  <span className="font-mono font-semibold">{formatINR(totalExpensesAmount)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-slate-900 bg-rose-50/50 p-2 rounded">
                  <span>Total Expenses (B)</span>
                  <span className="font-mono">{formatINR(totalPurchaseCost + totalExpensesAmount)}</span>
                </div>
              </div>
            </div>

            {/* 3. Net Result */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between font-extrabold text-sm">
              <span>Estimated Net Profit Before Tax (A - B)</span>
              <span className={`font-mono text-base ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatINR(netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: BALANCE SHEET
         ========================================================================= */}
      {activeSubTab === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Provisional Balance Sheet</h3>
              <p className="text-xs text-slate-500">As of today (Double-Entry Financial Position)</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-200">
                Balanced Position
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            {/* Liabilities & Equity */}
            <div className="space-y-4">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-900 font-bold uppercase tracking-wider text-[11px]">
                Equities & Liabilities
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-700">1. Current Liabilities:</div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Trade Payables (Sundry Creditors)</span>
                  <span className="font-mono font-semibold">{formatINR(Math.abs(creditorsHead?.balance || totalPayables))}</span>
                </div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">GST Output Tax Liability</span>
                  <span className="font-mono font-semibold">{formatINR(netGstPayable)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-700">2. Owner's Equity & Retained Earnings:</div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Owner Capital (Equity)</span>
                  <span className="font-mono font-semibold">{formatINR(Math.abs(capitalHead?.balance || 0))}</span>
                </div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Current Period Net Profit</span>
                  <span className="font-mono font-semibold">{formatINR(netProfit)}</span>
                </div>
              </div>
            </div>

            {/* Assets */}
            <div className="space-y-4">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-900 font-bold uppercase tracking-wider text-[11px]">
                Assets
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-700">1. Current Assets:</div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Trade Receivables (Sundry Debtors)</span>
                  <span className="font-mono font-semibold">{formatINR(Math.abs(debtorsHead?.balance || totalReceivables))}</span>
                </div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Bank Balance (HDFC Current Account)</span>
                  <span className="font-mono font-semibold">{formatINR(Math.abs(bankHead?.balance || 0))}</span>
                </div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Cash in Hand</span>
                  <span className="font-mono font-semibold">{formatINR(Math.abs(cashHead?.balance || 0))}</span>
                </div>
                <div className="flex justify-between py-1 pl-4 border-b border-slate-100">
                  <span className="text-slate-600">Input Tax Credit (ITC) Available</span>
                  <span className="font-mono font-semibold">{formatINR(excessItcCarriedForward)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          LEDGER MASTER (ADD / EDIT ACCOUNT HEAD) MODAL
         ========================================================================= */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md md:max-w-lg w-full text-xs space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingAccountId ? 'Edit Ledger Account' : 'Create New Ledger Account'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingAccountId ? 'Update account code, group or opening balance' : 'Add custom ledger head to Chart of Accounts'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAccountModal(false);
                  setEditingAccountId(null);
                }} 
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Category *</label>
                  <select
                    value={accCategory}
                    onChange={e => handleCategoryChange(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="ASSET">ASSET (Current / Fixed Assets / Bank)</option>
                    <option value="LIABILITY">LIABILITY (Duties, Loans, Creditors)</option>
                    <option value="EQUITY">EQUITY (Capital & Reserves)</option>
                    <option value="INCOME">INCOME (Sales & Other Incomes)</option>
                    <option value="EXPENSE">EXPENSE (Direct & Indirect Expenses)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. 5040"
                    value={accCode}
                    onChange={e => setAccCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Account Head Name *</label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India A/c, Staff Salary, Travelling Expenses"
                  value={accName}
                  onChange={e => setAccName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sub-Group / Classification</label>
                <select
                  value={accSubCategory}
                  onChange={e => setAccSubCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                >
                  {(SUBCATEGORY_OPTIONS[accCategory] || []).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={accOpeningBalance || ''}
                    onChange={e => setAccOpeningBalance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Opening Balance Type</label>
                  <select
                    value={accOpeningType}
                    onChange={e => setAccOpeningType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="Dr">Debit (Dr)</option>
                    <option value="Cr">Credit (Cr)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="Optional account description or purpose"
                  value={accDescription}
                  onChange={e => setAccDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false);
                    setEditingAccountId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow cursor-pointer"
                >
                  {editingAccountId ? 'Save Changes' : 'Create Ledger Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE ACCOUNT CONFIRMATION MODAL
         ========================================================================= */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md w-full text-xs space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  Delete Ledger Account "{accountToDelete.name}"?
                </h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Are you sure you want to remove account <span className="font-mono font-bold text-slate-800">[{accountToDelete.code}] {accountToDelete.name}</span> from the Chart of Accounts?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <div><span className="font-semibold text-slate-500">Classification:</span> {accountToDelete.category} ({accountToDelete.subCategory || 'General'})</div>
              <div><span className="font-semibold text-slate-500">Current Balance:</span> {formatINR(Math.abs(accountToDelete.balance))}</div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow cursor-pointer"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CREATE / EDIT JOURNAL VOUCHER MODAL
         ========================================================================= */}
      {showJvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-w-[98vw] md:max-w-xl lg:max-w-2xl w-full text-xs space-y-4 max-h-[96dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingJvId ? `Edit Journal Voucher (${editingJvNumber})` : 'New General Journal Entry'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingJvId ? 'Update accounting ledger accounts, amounts and narration' : 'Post a double-entry ledger adjustment'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowJvModal(false);
                  setEditingJvId(null);
                }} 
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJv} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    value={jvDate}
                    onChange={e => setJvDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reference / Bill / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-99128, ADJ-04"
                    value={jvReference}
                    onChange={e => setJvReference(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Narration / Description *</label>
                <input
                  type="text"
                  placeholder="Being amount transferred / adjusted towards..."
                  value={jvDescription}
                  onChange={e => setJvDescription(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Debit / Credit Lines */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Accounting Ledger Lines</label>
                  <button
                    type="button"
                    onClick={handleAddJvLine}
                    className="text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {jvLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <select
                        value={line.accountId}
                        onChange={e => handleUpdateJvLine(idx, 'accountId', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 text-xs"
                      >
                        {dynamicAccountHeads.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name} ({acc.category})
                          </option>
                        ))}
                      </select>
                      
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Debit (Dr)"
                          value={line.debit || ''}
                          onChange={e => handleUpdateJvLine(idx, 'debit', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono text-xs font-semibold text-blue-700"
                        />
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Credit (Cr)"
                          value={line.credit || ''}
                          onChange={e => handleUpdateJvLine(idx, 'credit', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono text-xs font-semibold text-emerald-700"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveJvLine(idx)}
                        disabled={jvLines.length <= 2}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        title="Remove row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Checker */}
              <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                isJvBalanced ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {isJvBalanced ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{isJvBalanced ? 'Voucher is Balanced (Debit = Credit)' : 'Voucher is Unbalanced! Debits must equal Credits.'}</span>
                </div>
                <div className="space-x-4 font-mono">
                  <span>Dr: {formatINR(totalDebit)}</span>
                  <span>Cr: {formatINR(totalCredit)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJvModal(false);
                    setEditingJvId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isJvBalanced}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow cursor-pointer"
                >
                  {editingJvId ? 'Update Journal Voucher' : 'Post Journal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE JV CONFIRMATION MODAL
         ========================================================================= */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md w-full text-xs space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  Delete Journal Entry {entryToDelete.entryNumber}?
                </h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Are you sure you want to delete this journal voucher? This will remove the debit and credit postings from the General Ledger.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <div className="font-bold text-slate-800">"{entryToDelete.description}"</div>
              <div className="text-slate-500 font-mono">
                Date: {entryToDelete.date} | Lines: {entryToDelete.lines.length} | Amount: {formatINR(entryToDelete.lines.reduce((s, l) => s + l.debit, 0))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteJv}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow cursor-pointer"
              >
                Yes, Delete Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CONFIRM CLEAR ALL LEDGER DATA MODAL
         ========================================================================= */}
      {showClearLedgerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto modal-overlay">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl p-4 sm:p-6 max-w-[96vw] sm:max-w-md w-full text-xs space-y-4 max-h-[95dvh] sm:max-h-[90dvh] overflow-y-auto modal-content-scroll my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-sm">
                  Clear All Ledger & Journal Data?
                </h3>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  This action will delete all manual journal entries, daybook vouchers, and reset custom ledger account opening balances to zero baseline. Standard Chart of Accounts structure will be preserved.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Permanent ledger wipe</span>
              </div>
              <p className="text-rose-700">
                {journalEntries.length} journal {journalEntries.length === 1 ? 'entry' : 'entries'} and account balances in Google Cloud Firestore will be reset.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isClearingLedger}
                onClick={() => setShowClearLedgerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingLedger}
                onClick={async () => {
                  try {
                    setIsClearingLedger(true);
                    await clearAllLedgerData();
                    setShowClearLedgerModal(false);
                  } finally {
                    setIsClearingLedger(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isClearingLedger ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing Ledgers...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear All Ledgers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BANK STATEMENT AUTO ENTRY & RECONCILIATION MODAL
         ========================================================================= */}
      <BankStatementImportModal
        isOpen={showBankStatementImportModal}
        onClose={() => setShowBankStatementImportModal(false)}
        defaultBankAccountId={selectedAccountId}
      />
    </div>
  );
};
