import { AppUser, RoleDefinition, RoleType, SecurityAuditLog, UserPermissions } from '../types';

export const SUPER_ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: {
    view: true,
    viewFinancialMetrics: true,
    exportReports: true,
  },
  invoices: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    generateIRN: true,
    cancelInvoice: true,
    printDownload: true,
  },
  pos_billing: {
    view: true,
    createSale: true,
    giveCustomDiscount: true,
    reprintReceipt: true,
  },
  payments: {
    view: true,
    recordPaymentIn: true,
    recordPaymentOut: true,
    recordContra: true,
    deletePayment: true,
  },
  inventory: {
    view: true,
    viewPurchaseCost: true,
    createProduct: true,
    editProduct: true,
    deleteProduct: true,
    adjustStock: true,
  },
  parties: {
    viewCustomers: true,
    viewVendors: true,
    createParty: true,
    editParty: true,
    deleteParty: true,
    viewLedgerStatement: true,
    bulkImport: true,
  },
  purchases: {
    view: true,
    createBill: true,
    editBill: true,
    deleteBill: true,
    viewITCReports: true,
  },
  accounting: {
    viewJournals: true,
    createJournal: true,
    viewChartOfAccounts: true,
    viewBalanceSheet: true,
    viewProfitAndLoss: true,
    viewTrialBalance: true,
  },
  gst_returns: {
    view: true,
    viewGstr1: true,
    viewGstr3b: true,
    viewTaxRegisters: true,
    exportGstJson: true,
  },
  settings: {
    view: true,
    editCompanyProfile: true,
    editBankAndUPI: true,
    manageUsersAndRoles: true,
    backupAndRestore: true,
    resetDatabase: true,
  },
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: {
    view: true,
    viewFinancialMetrics: true,
    exportReports: true,
  },
  invoices: {
    view: true,
    create: true,
    edit: true,
    delete: true,
    generateIRN: true,
    cancelInvoice: true,
    printDownload: true,
  },
  pos_billing: {
    view: true,
    createSale: true,
    giveCustomDiscount: true,
    reprintReceipt: true,
  },
  payments: {
    view: true,
    recordPaymentIn: true,
    recordPaymentOut: true,
    recordContra: true,
    deletePayment: true,
  },
  inventory: {
    view: true,
    viewPurchaseCost: true,
    createProduct: true,
    editProduct: true,
    deleteProduct: true,
    adjustStock: true,
  },
  parties: {
    viewCustomers: true,
    viewVendors: true,
    createParty: true,
    editParty: true,
    deleteParty: true,
    viewLedgerStatement: true,
    bulkImport: true,
  },
  purchases: {
    view: true,
    createBill: true,
    editBill: true,
    deleteBill: true,
    viewITCReports: true,
  },
  accounting: {
    viewJournals: true,
    createJournal: true,
    viewChartOfAccounts: true,
    viewBalanceSheet: true,
    viewProfitAndLoss: true,
    viewTrialBalance: true,
  },
  gst_returns: {
    view: true,
    viewGstr1: true,
    viewGstr3b: true,
    viewTaxRegisters: true,
    exportGstJson: true,
  },
  settings: {
    view: true,
    editCompanyProfile: true,
    editBankAndUPI: true,
    manageUsersAndRoles: true,
    backupAndRestore: true,
    resetDatabase: true,
  },
};

export const ACCOUNTANT_PERMISSIONS: UserPermissions = {
  dashboard: {
    view: true,
    viewFinancialMetrics: true,
    exportReports: true,
  },
  invoices: {
    view: true,
    create: true,
    edit: true,
    delete: false, // Accountants can cancel/credit note, not hard delete
    generateIRN: true,
    cancelInvoice: true,
    printDownload: true,
  },
  pos_billing: {
    view: true,
    createSale: true,
    giveCustomDiscount: true,
    reprintReceipt: true,
  },
  payments: {
    view: true,
    recordPaymentIn: true,
    recordPaymentOut: true,
    recordContra: true,
    deletePayment: false,
  },
  inventory: {
    view: true,
    viewPurchaseCost: true,
    createProduct: true,
    editProduct: true,
    deleteProduct: false,
    adjustStock: true,
  },
  parties: {
    viewCustomers: true,
    viewVendors: true,
    createParty: true,
    editParty: true,
    deleteParty: false,
    viewLedgerStatement: true,
    bulkImport: true,
  },
  purchases: {
    view: true,
    createBill: true,
    editBill: true,
    deleteBill: false,
    viewITCReports: true,
  },
  accounting: {
    viewJournals: true,
    createJournal: true,
    viewChartOfAccounts: true,
    viewBalanceSheet: true,
    viewProfitAndLoss: true,
    viewTrialBalance: true,
  },
  gst_returns: {
    view: true,
    viewGstr1: true,
    viewGstr3b: true,
    viewTaxRegisters: true,
    exportGstJson: true,
  },
  settings: {
    view: true,
    editCompanyProfile: false,
    editBankAndUPI: false,
    manageUsersAndRoles: false,
    backupAndRestore: true,
    resetDatabase: false,
  },
};

export const SALESPERSON_PERMISSIONS: UserPermissions = {
  dashboard: {
    view: true,
    viewFinancialMetrics: false, // Salesperson sees sales count, not P&L/Net margins
    exportReports: false,
  },
  invoices: {
    view: true,
    create: true,
    edit: true,
    delete: false,
    generateIRN: true,
    cancelInvoice: false,
    printDownload: true,
  },
  pos_billing: {
    view: true,
    createSale: true,
    giveCustomDiscount: false, // Strict price control for sales executives
    reprintReceipt: true,
  },
  payments: {
    view: true,
    recordPaymentIn: true, // Can collect payments for sales invoices
    recordPaymentOut: false, // Cannot disburse money
    recordContra: false,
    deletePayment: false,
  },
  inventory: {
    view: true,
    viewPurchaseCost: false, // Confidential buying prices hidden
    createProduct: false,
    editProduct: false,
    deleteProduct: false,
    adjustStock: false,
  },
  parties: {
    viewCustomers: true,
    viewVendors: false, // Vendors hidden from sales reps
    createParty: true, // Can onboard new retail/B2B clients
    editParty: true,
    deleteParty: false,
    viewLedgerStatement: true,
    bulkImport: false,
  },
  purchases: {
    view: false, // No access to vendor purchase invoices
    createBill: false,
    editBill: false,
    deleteBill: false,
    viewITCReports: false,
  },
  accounting: {
    viewJournals: false,
    createJournal: false,
    viewChartOfAccounts: false,
    viewBalanceSheet: false,
    viewProfitAndLoss: false,
    viewTrialBalance: false,
  },
  gst_returns: {
    view: false, // Tax return filings hidden
    viewGstr1: false,
    viewGstr3b: false,
    viewTaxRegisters: false,
    exportGstJson: false,
  },
  settings: {
    view: false,
    editCompanyProfile: false,
    editBankAndUPI: false,
    manageUsersAndRoles: false,
    backupAndRestore: false,
    resetDatabase: false,
  },
};

export const INVENTORY_MANAGER_PERMISSIONS: UserPermissions = {
  dashboard: {
    view: true,
    viewFinancialMetrics: false,
    exportReports: false,
  },
  invoices: {
    view: true, // Can check dispatched sales
    create: false,
    edit: false,
    delete: false,
    generateIRN: false,
    cancelInvoice: false,
    printDownload: true,
  },
  pos_billing: {
    view: false,
    createSale: false,
    giveCustomDiscount: false,
    reprintReceipt: false,
  },
  payments: {
    view: false,
    recordPaymentIn: false,
    recordPaymentOut: false,
    recordContra: false,
    deletePayment: false,
  },
  inventory: {
    view: true,
    viewPurchaseCost: true,
    createProduct: true,
    editProduct: true,
    deleteProduct: true,
    adjustStock: true, // Primary duty
  },
  parties: {
    viewCustomers: false,
    viewVendors: true,
    createParty: false,
    editParty: false,
    deleteParty: false,
    viewLedgerStatement: false,
    bulkImport: false,
  },
  purchases: {
    view: true, // Receive stock against GRN/Purchase bills
    createBill: true,
    editBill: true,
    deleteBill: false,
    viewITCReports: false,
  },
  accounting: {
    viewJournals: false,
    createJournal: false,
    viewChartOfAccounts: false,
    viewBalanceSheet: false,
    viewProfitAndLoss: false,
    viewTrialBalance: false,
  },
  gst_returns: {
    view: false,
    viewGstr1: false,
    viewGstr3b: false,
    viewTaxRegisters: false,
    exportGstJson: false,
  },
  settings: {
    view: false,
    editCompanyProfile: false,
    editBankAndUPI: false,
    manageUsersAndRoles: false,
    backupAndRestore: false,
    resetDatabase: false,
  },
};

export const AUDITOR_PERMISSIONS: UserPermissions = {
  dashboard: {
    view: true,
    viewFinancialMetrics: true,
    exportReports: true,
  },
  invoices: {
    view: true,
    create: false,
    edit: false,
    delete: false,
    generateIRN: false,
    cancelInvoice: false,
    printDownload: true,
  },
  pos_billing: {
    view: true,
    createSale: false,
    giveCustomDiscount: false,
    reprintReceipt: true,
  },
  payments: {
    view: true,
    recordPaymentIn: false,
    recordPaymentOut: false,
    recordContra: false,
    deletePayment: false,
  },
  inventory: {
    view: true,
    viewPurchaseCost: true,
    createProduct: false,
    editProduct: false,
    deleteProduct: false,
    adjustStock: false,
  },
  parties: {
    viewCustomers: true,
    viewVendors: true,
    createParty: false,
    editParty: false,
    deleteParty: false,
    viewLedgerStatement: true,
    bulkImport: false,
  },
  purchases: {
    view: true,
    createBill: false,
    editBill: false,
    deleteBill: false,
    viewITCReports: true,
  },
  accounting: {
    viewJournals: true,
    createJournal: false,
    viewChartOfAccounts: true,
    viewBalanceSheet: true,
    viewProfitAndLoss: true,
    viewTrialBalance: true,
  },
  gst_returns: {
    view: true,
    viewGstr1: true,
    viewGstr3b: true,
    viewTaxRegisters: true,
    exportGstJson: true,
  },
  settings: {
    view: true,
    editCompanyProfile: false,
    editBankAndUPI: false,
    manageUsersAndRoles: false,
    backupAndRestore: false,
    resetDatabase: false,
  },
};

export const ROLE_DEFINITIONS: Record<RoleType, RoleDefinition> = {
  SUPER_ADMIN: {
    id: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Supreme administrative authority across all multi-company workspaces, business entity provisioning, master configuration, and organization governance.',
    color: 'violet',
    badgeBg: 'bg-purple-100 border-purple-300',
    badgeText: 'text-purple-900',
    isSystem: true,
    defaultPermissions: SUPER_ADMIN_PERMISSIONS,
  },
  ADMIN: {
    id: 'ADMIN',
    name: 'Administrator',
    description: 'Complete unrestricted access to all financial modules, taxation, company settings, and user permissions.',
    color: 'indigo',
    badgeBg: 'bg-indigo-100 border-indigo-200',
    badgeText: 'text-indigo-800',
    isSystem: true,
    defaultPermissions: ADMIN_PERMISSIONS,
  },
  ACCOUNTANT: {
    id: 'ACCOUNTANT',
    name: 'Accountant',
    description: 'Full management of Invoices, Purchases, General Ledger, Journals, GST Returns, and Client Statements.',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 border-emerald-200',
    badgeText: 'text-emerald-800',
    isSystem: true,
    defaultPermissions: ACCOUNTANT_PERMISSIONS,
  },
  SALESPERSON: {
    id: 'SALESPERSON',
    name: 'Salesperson',
    description: 'Front-office sales execution: Create Sales Invoices, POS Counter Billing, Customer CRM, and Payment Receipts.',
    color: 'blue',
    badgeBg: 'bg-blue-100 border-blue-200',
    badgeText: 'text-blue-800',
    isSystem: true,
    defaultPermissions: SALESPERSON_PERMISSIONS,
  },
  INVENTORY_MANAGER: {
    id: 'INVENTORY_MANAGER',
    name: 'Inventory Manager',
    description: 'Warehouse & Store operations: Stock adjustments, batch tracking, receiving vendor purchase bills.',
    color: 'amber',
    badgeBg: 'bg-amber-100 border-amber-200',
    badgeText: 'text-amber-800',
    isSystem: true,
    defaultPermissions: INVENTORY_MANAGER_PERMISSIONS,
  },
  AUDITOR: {
    id: 'AUDITOR',
    name: 'Statutory Auditor / CA',
    description: 'Read-only financial audit access across books of accounts, tax registers, Trial Balance, and P&L.',
    color: 'purple',
    badgeBg: 'bg-purple-100 border-purple-200',
    badgeText: 'text-purple-800',
    isSystem: true,
    defaultPermissions: AUDITOR_PERMISSIONS,
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Custom Tailored Role',
    description: 'Customized granular permission policy tailored for specific operational staff or assistants.',
    color: 'slate',
    badgeBg: 'bg-slate-100 border-slate-200',
    badgeText: 'text-slate-800',
    isSystem: false,
    defaultPermissions: SALESPERSON_PERMISSIONS,
  },
};

/**
 * Roles assignable within individual company/business profiles.
 * Super Admin is a global platform role outside individual business profiles.
 */
export const COMPANY_ASSIGNABLE_ROLES: RoleType[] = [
  'ADMIN',
  'ACCOUNTANT',
  'SALESPERSON',
  'INVENTORY_MANAGER',
  'AUDITOR',
  'CUSTOM',
];

export const DEFAULT_SUPER_ADMIN: AppUser = {
  id: 'usr-super-admin',
  name: 'Vikram Singhania',
  email: 'superadmin@vyaparflow.in',
  phone: '+91 99999 88888',
  role: 'SUPER_ADMIN',
  roleTitle: 'Platform Super Administrator',
  department: 'Executive Governance & Board',
  avatarBg: 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-700',
  avatarText: 'SA',
  password: 'superadmin',
  pin: '9999',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastLogin: '2026-08-20T08:00:00.000Z',
};

export const initialUsers: AppUser[] = [
  DEFAULT_SUPER_ADMIN,
  {
    id: 'usr-1',
    name: 'Rajesh K. Sharma',
    email: 'rajesh@bharattech.in',
    phone: '+91 98765 43210',
    role: 'ADMIN',
    roleTitle: 'Managing Director & Admin',
    department: 'Executive Management',
    avatarBg: 'bg-indigo-600',
    avatarText: 'RS',
    password: 'admin',
    pin: '1111',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLogin: '2026-08-19T09:30:00.000Z',
  },
  {
    id: 'usr-2',
    name: 'Pooja Verma',
    email: 'pooja.verma@bharattech.in',
    phone: '+91 98111 22334',
    role: 'ACCOUNTANT',
    roleTitle: 'Senior Chartered Accountant',
    department: 'Finance & Accounts',
    avatarBg: 'bg-emerald-600',
    avatarText: 'PV',
    password: 'acc',
    pin: '2222',
    isActive: true,
    createdAt: '2026-01-15T00:00:00.000Z',
    lastLogin: '2026-08-19T08:45:00.000Z',
  },
  {
    id: 'usr-3',
    name: 'Amit Kumar',
    email: 'amit.sales@bharattech.in',
    phone: '+91 98222 33445',
    role: 'SALESPERSON',
    roleTitle: 'Sales & Billing Executive',
    department: 'Retail & Distribution',
    avatarBg: 'bg-blue-600',
    avatarText: 'AK',
    password: 'sales',
    pin: '3333',
    isActive: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    lastLogin: '2026-08-19T09:15:00.000Z',
  },
  {
    id: 'usr-4',
    name: 'Vikram Singh',
    email: 'vikram.store@bharattech.in',
    phone: '+91 98333 44556',
    role: 'INVENTORY_MANAGER',
    roleTitle: 'Warehouse & Store Keeper',
    department: 'Supply Chain & Logistics',
    avatarBg: 'bg-amber-600',
    avatarText: 'VS',
    password: 'inv',
    pin: '4444',
    isActive: true,
    createdAt: '2026-02-15T00:00:00.000Z',
    lastLogin: '2026-08-18T17:00:00.000Z',
  },
  {
    id: 'usr-5',
    name: 'CA Suresh Mehta',
    email: 'suresh.audit@mehtaca.in',
    phone: '+91 98444 55667',
    role: 'AUDITOR',
    roleTitle: 'External Statutory Auditor',
    department: 'Mehta & Associates CA',
    avatarBg: 'bg-purple-600',
    avatarText: 'SM',
    password: 'audit',
    pin: '5555',
    isActive: true,
    createdAt: '2026-03-01T00:00:00.000Z',
    lastLogin: '2026-08-17T11:20:00.000Z',
  },
];

export const initialAuditLogs: SecurityAuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-08-19T09:30:15.000Z',
    userId: 'usr-1',
    userName: 'Rajesh K. Sharma',
    userRole: 'ADMIN',
    action: 'LOGIN',
    module: 'Authentication',
    details: 'User authenticated via Multi-Factor Authentication',
  },
  {
    id: 'log-2',
    timestamp: '2026-08-19T09:12:00.000Z',
    userId: 'usr-3',
    userName: 'Amit Kumar',
    userRole: 'SALESPERSON',
    action: 'INVOICE_CREATE',
    module: 'Invoices',
    details: 'Created Tax Invoice #INV/2026-27/105 for ₹49,560',
  },
  {
    id: 'log-3',
    timestamp: '2026-08-19T08:50:30.000Z',
    userId: 'usr-2',
    userName: 'Pooja Verma',
    userRole: 'ACCOUNTANT',
    action: 'GST_CALCULATION',
    module: 'GST Returns',
    details: 'Recomputed GSTR-3B monthly ITC and outward tax liability',
  },
  {
    id: 'log-4',
    timestamp: '2026-08-18T16:30:00.000Z',
    userId: 'usr-4',
    userName: 'Vikram Singh',
    userRole: 'INVENTORY_MANAGER',
    action: 'STOCK_ADJUSTMENT',
    module: 'Inventory',
    details: 'Adjusted physical stock for 4K Monitors (+5 PCS received)',
  },
];

export const getUserEffectivePermissions = (user?: AppUser | null): UserPermissions => {
  if (!user) return SALESPERSON_PERMISSIONS;
  const roleBase = ROLE_DEFINITIONS[user.role]?.defaultPermissions || SALESPERSON_PERMISSIONS;
  if (!user.customPermissions) return roleBase;

  // Deep merge custom override permissions
  const merged = JSON.parse(JSON.stringify(roleBase)) as UserPermissions;
  for (const moduleKey of Object.keys(user.customPermissions) as (keyof UserPermissions)[]) {
    const modOverrides = user.customPermissions[moduleKey];
    if (modOverrides && typeof modOverrides === 'object') {
      (merged as any)[moduleKey] = {
        ...(merged as any)[moduleKey],
        ...modOverrides,
      };
    }
  }
  return merged;
};

export const hasUserPermission = (
  user: AppUser | null | undefined,
  module: keyof UserPermissions,
  action?: string
): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN') return true; // Admins bypass all checks

  const perms = getUserEffectivePermissions(user);
  const modulePerms = perms[module] as any;
  if (!modulePerms) return false;

  if (!action) {
    return !!modulePerms.view;
  }

  return !!modulePerms[action];
};
