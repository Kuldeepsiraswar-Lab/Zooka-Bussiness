import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Invoice, Product, Party, PurchaseBill, Expense, JournalEntry, AccountHead, BusinessProfile, 
  EInvoiceDetails, EWayBillDetails, PaymentMethod, InvoiceStatus, PaymentRecord, PaymentType,
  AppUser, RoleType, UserPermissions, SecurityAuditLog, Company
} from '../types';
import { 
  initialBusinessProfile, initialProducts, initialParties, initialInvoices, 
  initialPurchaseBills, initialExpenses, initialAccountHeads, initialJournalEntries, initialPayments 
} from '../utils/mockData';
import { 
  initialUsers, initialAuditLogs, getUserEffectivePermissions, hasUserPermission, ROLE_DEFINITIONS, DEFAULT_SUPER_ADMIN 
} from '../utils/rbacRules';
import {
  initialCompanies, comp2BusinessProfile, comp2Users, comp2Products, comp3BusinessProfile, comp3Users, comp3Products
} from '../utils/multiCompanyData';
import { generateSimulatedEInvoice, recalculateInvoiceTotals } from '../utils/gstCalculations';
import { generateEwayBillNo, normalizeSignatureUrl } from '../utils/formatters';

export type ActiveTab = 
  | 'dashboard'
  | 'invoices'
  | 'payments'
  | 'pos_billing'
  | 'inventory'
  | 'parties'
  | 'purchases'
  | 'accounting'
  | 'gst_returns'
  | 'users'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  // Navigation & View State
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  
  // Multi-Company & Multi-Business Setup
  companies: Company[];
  currentCompany: Company;
  currentCompanyId: string;
  switchCompany: (companyId: string, autoLoginUserId?: string) => void;
  createCompany: (
    companyData: Omit<Company, 'id' | 'createdAt'>, 
    adminUser: { name: string; email: string; password?: string; pin?: string }
  ) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => boolean;

  // Business Profile
  business: BusinessProfile;
  updateBusiness: (profile: Partial<BusinessProfile>) => void;
  
  // Invoices & Billing
  invoices: Invoice[];
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  recordInvoicePayment: (id: string, amount: number, method: PaymentMethod, notes?: string) => void;
  generateEInvoice: (id: string) => EInvoiceDetails | null;
  cancelEInvoice: (id: string, reason: EInvoiceDetails['cancelReason'], remarks?: string) => void;
  generateEWayBill: (id: string, details: Partial<EWayBillDetails>) => void;
  
  // Inventory
  products: Product[];
  createProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  bulkCreateProducts: (newProducts: Omit<Product, 'id' | 'createdAt'>[], updateExisting?: boolean) => { added: number; updated: number };
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, newStock: number, reason: string) => void;
  
  // Parties (Customers & Vendors)
  parties: Party[];
  createParty: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Party;
  bulkCreateParties: (newParties: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[], updateExisting?: boolean) => { added: number; updated: number };
  updateParty: (id: string, party: Partial<Party>) => void;
  deleteParty: (id: string) => void;
  
  // Purchases & Expenses
  purchaseBills: PurchaseBill[];
  createPurchaseBill: (bill: Omit<PurchaseBill, 'id' | 'createdAt'>) => PurchaseBill;
  updatePurchaseBill: (id: string, bill: Partial<PurchaseBill>) => void;
  deletePurchaseBill: (id: string) => void;
  recordPurchasePayment: (id: string, amount: number, method: PaymentMethod) => void;
  
  // Payments & Receipts (Money In & Money Out)
  payments: PaymentRecord[];
  createPayment: (payment: Omit<PaymentRecord, 'id' | 'createdAt'>) => PaymentRecord;
  updatePayment: (id: string, updates: Partial<PaymentRecord>) => void;
  deletePayment: (id: string) => void;
  
  expenses: Expense[];
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  deleteExpense: (id: string) => void;
  
  // Accounting & Ledger
  accountHeads: AccountHead[];
  journalEntries: JournalEntry[];
  createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => JournalEntry;
  updateJournalEntry: (id: string, entry: Partial<JournalEntry>) => void;
  deleteJournalEntry: (id: string) => void;
  createAccountHead: (account: Omit<AccountHead, 'id'>) => AccountHead;
  updateAccountHead: (id: string, updates: Partial<AccountHead>) => void;
  deleteAccountHead: (id: string) => boolean;
  
  // System & Utils
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  removeToast: (id: string) => void;
  resetAllData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonData: string) => boolean;

  // Selected state for quick editing/modals
  selectedInvoiceIdForPrint: string | null;
  setSelectedInvoiceIdForPrint: (id: string | null) => void;
  selectedInvoiceForIRN: Invoice | null;
  setSelectedInvoiceForIRN: (inv: Invoice | null) => void;

  // RBAC & User Management & Password Authentication
  users: AppUser[];
  currentUser: AppUser;
  effectivePermissions: UserPermissions;
  isAuthenticated: boolean;
  isSessionLocked: boolean;
  isAuthModalOpen: boolean;
  authModalTargetUser: AppUser | null;
  openAuthModal: (targetUser?: AppUser) => void;
  closeAuthModal: () => void;
  lockSession: () => void;
  unlockSession: (passwordOrPin: string) => { success: boolean; error?: string };
  authenticateAndSwitchUser: (userId: string, passwordOrPin: string) => { success: boolean; error?: string };
  changeUserPassword: (userId: string, newPassword?: string, newPin?: string) => void;
  switchUser: (userId: string) => void;
  logout: () => void;
  createUser: (user: Omit<AppUser, 'id' | 'createdAt'>) => AppUser;
  updateUser: (id: string, updates: Partial<AppUser>) => void;
  deleteUser: (id: string) => boolean;
  can: (module: keyof UserPermissions, action?: string) => boolean;
  auditLogs: SecurityAuditLog[];
  logSecurityEvent: (action: string, module: string, details: string) => void;
  verifySuperAdminKey: (key: string) => boolean;
  loginAsSuperAdmin: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'vyaparflow_v1_';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or fallback to mock data
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Multi-Company State
  const [companies, setCompanies] = useState<Company[]>(() => {
    return loadState<Company[]>('companies', initialCompanies);
  });
  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    const loaded = loadState<string>('currentCompanyId', initialCompanies[0]?.id || 'comp-1');
    return loaded;
  });

  const currentCompany = useMemo(() => {
    return companies.find(c => c.id === currentCompanyId) || companies[0] || initialCompanies[0];
  }, [companies, currentCompanyId]);

  const [business, setBusiness] = useState<BusinessProfile>(() => {
    const loaded = loadState('business', initialBusinessProfile);
    return {
      ...initialBusinessProfile,
      ...loaded,
      signatureUrl: normalizeSignatureUrl(loaded?.signatureUrl),
      showSignatureOnInvoice: loaded?.showSignatureOnInvoice !== false,
    };
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', initialInvoices));
  const [products, setProducts] = useState<Product[]>(() => loadState('products', initialProducts));
  const [parties, setParties] = useState<Party[]>(() => loadState('parties', initialParties));
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>(() => loadState('purchaseBills', initialPurchaseBills));
  const [payments, setPayments] = useState<PaymentRecord[]>(() => loadState('payments', initialPayments));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', initialExpenses));
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>(() => loadState('accountHeads', initialAccountHeads));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => loadState('journalEntries', initialJournalEntries));
  
  // RBAC & Authentication State
  const [users, setUsers] = useState<AppUser[]>(() => {
    const loaded = loadState<AppUser[]>('users', initialUsers);
    const withSuper = loaded.some(u => u.role === 'SUPER_ADMIN') ? loaded : [DEFAULT_SUPER_ADMIN, ...loaded];
    // Ensure all default users have password/pin initialized if upgrading from prior storage
    return withSuper.map(u => {
      const initMatch = initialUsers.find(iu => iu.id === u.id);
      return {
        ...u,
        password: u.password || initMatch?.password || (u.role === 'SUPER_ADMIN' ? 'superadmin' : 'admin'),
        pin: u.pin || initMatch?.pin || (u.role === 'SUPER_ADMIN' ? '9999' : '1111'),
      };
    });
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => loadState('currentUserId', initialUsers[0]?.id || 'usr-1'));
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => loadState('auditLogs', initialAuditLogs));
  // Default to false so the Company Selection screen is always displayed on opening the app
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTargetUser, setAuthModalTargetUser] = useState<AppUser | null>(null);

  const currentUser = useMemo(() => {
    return users.find(u => u.id === currentUserId) || users[0] || initialUsers[0];
  }, [users, currentUserId]);

  const effectivePermissions = useMemo(() => {
    return getUserEffectivePermissions(currentUser);
  }, [currentUser]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedInvoiceIdForPrint, setSelectedInvoiceIdForPrint] = useState<string | null>(null);
  const [selectedInvoiceForIRN, setSelectedInvoiceForIRN] = useState<Invoice | null>(null);

  // Sync general lists
  useEffect(() => { localStorage.setItem(STORAGE_PREFIX + 'companies', JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem(STORAGE_PREFIX + 'currentCompanyId', JSON.stringify(currentCompanyId)); }, [currentCompanyId]);

  // Sync current active company's data back to storage
  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'business', JSON.stringify(business)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_business`, JSON.stringify(business));
  }, [business, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'invoices', JSON.stringify(invoices)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_invoices`, JSON.stringify(invoices));
  }, [invoices, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'products', JSON.stringify(products)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_products`, JSON.stringify(products));
  }, [products, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'parties', JSON.stringify(parties)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_parties`, JSON.stringify(parties));
  }, [parties, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'purchaseBills', JSON.stringify(purchaseBills)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_purchaseBills`, JSON.stringify(purchaseBills));
  }, [purchaseBills, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'payments', JSON.stringify(payments)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_payments`, JSON.stringify(payments));
  }, [payments, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'expenses', JSON.stringify(expenses)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_expenses`, JSON.stringify(expenses));
  }, [expenses, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'accountHeads', JSON.stringify(accountHeads)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_accountHeads`, JSON.stringify(accountHeads));
  }, [accountHeads, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'journalEntries', JSON.stringify(journalEntries)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_journalEntries`, JSON.stringify(journalEntries));
  }, [journalEntries, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(users)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_users`, JSON.stringify(users));
  }, [users, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'currentUserId', JSON.stringify(currentUserId)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_currentUserId`, JSON.stringify(currentUserId));
  }, [currentUserId, currentCompanyId]);

  useEffect(() => { 
    localStorage.setItem(STORAGE_PREFIX + 'auditLogs', JSON.stringify(auditLogs)); 
    localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_auditLogs`, JSON.stringify(auditLogs));
  }, [auditLogs, currentCompanyId]);

  // Load company partition helper
  const loadCompanyDataPartition = (targetCompId: string) => {
    const rawBus = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_business`);
    const rawInv = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_invoices`);
    const rawProd = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_products`);
    const rawParties = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_parties`);
    const rawPurch = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_purchaseBills`);
    const rawPayments = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_payments`);
    const rawExpenses = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_expenses`);
    const rawHeads = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_accountHeads`);
    const rawJournals = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_journalEntries`);
    const rawUsers = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_users`);
    const rawUserId = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_currentUserId`);
    const rawLogs = localStorage.getItem(`${STORAGE_PREFIX}c_${targetCompId}_auditLogs`);

    let loadedBusiness: BusinessProfile;
    let loadedProducts: Product[];
    let loadedUsers: AppUser[];
    let loadedInvoices: Invoice[] = rawInv ? JSON.parse(rawInv) : (targetCompId === 'comp-1' ? initialInvoices : []);
    let loadedParties: Party[] = rawParties ? JSON.parse(rawParties) : (targetCompId === 'comp-1' ? initialParties : []);
    let loadedPurchases: PurchaseBill[] = rawPurch ? JSON.parse(rawPurch) : (targetCompId === 'comp-1' ? initialPurchaseBills : []);
    let loadedPayments: PaymentRecord[] = rawPayments ? JSON.parse(rawPayments) : (targetCompId === 'comp-1' ? initialPayments : []);
    let loadedExpenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : (targetCompId === 'comp-1' ? initialExpenses : []);
    let loadedHeads: AccountHead[] = rawHeads ? JSON.parse(rawHeads) : initialAccountHeads;
    let loadedJournals: JournalEntry[] = rawJournals ? JSON.parse(rawJournals) : (targetCompId === 'comp-1' ? initialJournalEntries : []);
    let loadedAudit: SecurityAuditLog[] = rawLogs ? JSON.parse(rawLogs) : (targetCompId === 'comp-1' ? initialAuditLogs : []);

    if (rawBus) {
      loadedBusiness = JSON.parse(rawBus);
    } else if (targetCompId === 'comp-2') {
      loadedBusiness = comp2BusinessProfile;
    } else if (targetCompId === 'comp-3') {
      loadedBusiness = comp3BusinessProfile;
    } else if (targetCompId === 'comp-1') {
      loadedBusiness = initialBusinessProfile;
    } else {
      const compMeta = companies.find(c => c.id === targetCompId);
      loadedBusiness = {
        ...initialBusinessProfile,
        name: compMeta?.name || 'Company Name',
        tradeName: compMeta?.tradeName || compMeta?.name || 'Company Name',
        gstin: compMeta?.gstin || 'UNREGISTERED',
        pan: compMeta?.pan || 'PANNOTSET',
        state: compMeta?.state || 'Delhi',
        stateCode: compMeta?.stateCode || '07',
        city: compMeta?.city || 'New Delhi',
        address: compMeta?.address || 'Main Commercial Road',
        pincode: compMeta?.pincode || '110001',
        phone: compMeta?.phone || '+91 9800000000',
        email: compMeta?.email || 'accounts@company.com',
      };
    }

    if (rawProd) {
      loadedProducts = JSON.parse(rawProd);
    } else if (targetCompId === 'comp-2') {
      loadedProducts = comp2Products;
    } else if (targetCompId === 'comp-3') {
      loadedProducts = comp3Products;
    } else if (targetCompId === 'comp-1') {
      loadedProducts = initialProducts;
    } else {
      loadedProducts = [];
    }

    if (rawUsers) {
      loadedUsers = JSON.parse(rawUsers);
    } else if (targetCompId === 'comp-2') {
      loadedUsers = comp2Users;
    } else if (targetCompId === 'comp-3') {
      loadedUsers = comp3Users;
    } else if (targetCompId === 'comp-1') {
      loadedUsers = initialUsers;
    } else {
      loadedUsers = [];
    }

    // Ensure Super Admin is always available in user list for oversight & management
    if (!loadedUsers.some(u => u.role === 'SUPER_ADMIN')) {
      loadedUsers = [DEFAULT_SUPER_ADMIN, ...loadedUsers];
    }

    const defaultUserId = rawUserId ? JSON.parse(rawUserId) : (loadedUsers[0]?.id || 'usr-1');

    return {
      business: loadedBusiness,
      invoices: loadedInvoices,
      products: loadedProducts,
      parties: loadedParties,
      purchaseBills: loadedPurchases,
      payments: loadedPayments,
      expenses: loadedExpenses,
      accountHeads: loadedHeads,
      journalEntries: loadedJournals,
      users: loadedUsers,
      currentUserId: defaultUserId,
      auditLogs: loadedAudit,
    };
  };

  const switchCompany = (targetCompId: string, autoLoginUserId?: string) => {
    const targetComp = companies.find(c => c.id === targetCompId);
    if (!targetComp) {
      showToast('error', 'Company Switch Failed', 'Target company does not exist.');
      return;
    }

    // Load target company partition
    const partition = loadCompanyDataPartition(targetCompId);

    setCurrentCompanyId(targetCompId);
    setBusiness(partition.business);
    setInvoices(partition.invoices);
    setProducts(partition.products);
    setParties(partition.parties);
    setPurchaseBills(partition.purchaseBills);
    setPayments(partition.payments);
    setExpenses(partition.expenses);
    setAccountHeads(partition.accountHeads);
    setJournalEntries(partition.journalEntries);
    setUsers(partition.users);
    setAuditLogs(partition.auditLogs);

    if (autoLoginUserId) {
      setCurrentUserId(autoLoginUserId);
      setIsAuthenticated(true);
      try { sessionStorage.setItem(STORAGE_PREFIX + 'isAuthenticated', 'true'); } catch {}
    } else if (partition.users.length > 0) {
      setCurrentUserId(partition.users[0].id);
    }

    showToast('info', `Switched Company: ${targetComp.tradeName || targetComp.name}`, `Active GSTIN: ${targetComp.gstin} (${targetComp.state})`);
  };

  const createCompany = (
    companyData: Omit<Company, 'id' | 'createdAt'>, 
    adminUser: { name: string; email: string; password?: string; pin?: string }
  ): Company => {
    const compId = 'comp-' + Date.now();
    const newCompany: Company = {
      ...companyData,
      id: compId,
      createdAt: new Date().toISOString(),
    };

    // Create Initial Admin User for this new company
    const adminId = 'usr-adm-' + Date.now();
    const initials = adminUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';
    const newAdmin: AppUser = {
      id: adminId,
      name: adminUser.name,
      email: adminUser.email,
      phone: companyData.phone,
      role: 'ADMIN',
      roleTitle: 'Primary Administrator',
      department: 'Executive Management',
      avatarBg: 'bg-indigo-600',
      avatarText: initials,
      isActive: true,
      password: adminUser.password || 'admin',
      pin: adminUser.pin || '1111',
      createdAt: new Date().toISOString(),
    };

    const newBusinessProfile: BusinessProfile = {
      ...initialBusinessProfile,
      name: newCompany.name,
      tradeName: newCompany.tradeName || newCompany.name,
      gstin: newCompany.gstin,
      pan: newCompany.pan,
      state: newCompany.state,
      stateCode: newCompany.stateCode,
      city: newCompany.city,
      address: newCompany.address,
      pincode: newCompany.pincode,
      phone: newCompany.phone,
      email: newCompany.email,
      signatoryName: adminUser.name,
      invoicePrefix: `${newCompany.name.substring(0, 3).toUpperCase()}/26-27/`,
      nextInvoiceNumber: 1,
    };

    // Store new company initial dataset in storage
    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_business`, JSON.stringify(newBusinessProfile));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_invoices`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_products`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_parties`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_purchaseBills`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_payments`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_expenses`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_accountHeads`, JSON.stringify(initialAccountHeads));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_journalEntries`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_users`, JSON.stringify([newAdmin]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_currentUserId`, JSON.stringify(adminId));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_auditLogs`, JSON.stringify([]));
    } catch (e) {
      console.warn('Error creating company storage:', e);
    }

    setCompanies(prev => [...prev, newCompany]);

    // Switch active context to new company
    setCurrentCompanyId(compId);
    setBusiness(newBusinessProfile);
    setInvoices([]);
    setProducts([]);
    setParties([]);
    setPurchaseBills([]);
    setPayments([]);
    setExpenses([]);
    setAccountHeads(initialAccountHeads);
    setJournalEntries([]);
    setUsers([newAdmin]);
    setCurrentUserId(adminId);
    setAuditLogs([]);

    showToast('success', 'Company Created Successfully', `Welcome to ${newCompany.tradeName || newCompany.name}! Admin login configured.`);
    return newCompany;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (id === currentCompanyId) {
      if (updates.name || updates.tradeName || updates.gstin || updates.state) {
        setBusiness(prev => ({
          ...prev,
          name: updates.name || prev.name,
          tradeName: updates.tradeName || prev.tradeName,
          gstin: updates.gstin || prev.gstin,
          state: updates.state || prev.state,
          stateCode: updates.stateCode || prev.stateCode,
          city: updates.city || prev.city,
          address: updates.address || prev.address,
          pincode: updates.pincode || prev.pincode,
          phone: updates.phone || prev.phone,
          email: updates.email || prev.email,
        }));
      }
    }
    showToast('success', 'Company Profile Updated', 'Business and tax details saved.');
  };

  const deleteCompany = (id: string): boolean => {
    if (companies.length <= 1) {
      showToast('error', 'Action Restricted', 'At least one company workspace must remain.');
      return false;
    }

    const remaining = companies.filter(c => c.id !== id);
    if (id === currentCompanyId) {
      switchCompany(remaining[0].id);
    }
    setCompanies(remaining);
    showToast('info', 'Company Removed', 'Company workspace has been deleted.');
    return true;
  };

  const logSecurityEvent = (action: string, module: string, details: string) => {
    const newLog: SecurityAuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      details,
    };
    setAuditLogs(prev => [newLog, ...prev.slice(0, 199)]); // Keep last 200 logs
  };

  const openAuthModal = (targetUser?: AppUser) => {
    setAuthModalTargetUser(targetUser || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);
  };

  const lockSession = () => {
    setIsSessionLocked(true);
    logSecurityEvent('SESSION_LOCKED', 'Authentication', `Screen locked by ${currentUser.name}`);
    showToast('info', 'Screen Locked', 'Please enter your password or PIN to resume.');
  };

  const unlockSession = (passwordOrPin: string): { success: boolean; error?: string } => {
    const input = passwordOrPin.trim();
    const isPasswordMatch = currentUser.password && currentUser.password === input;
    const isPinMatch = currentUser.pin && currentUser.pin === input;

    // If no password/PIN set on user, allow unlock or match 'admin' / '1234'
    if (isPasswordMatch || isPinMatch || (!currentUser.password && !currentUser.pin)) {
      setIsSessionLocked(false);
      setIsAuthenticated(true);
      try { sessionStorage.setItem(STORAGE_PREFIX + 'isAuthenticated', 'true'); } catch {}
      logSecurityEvent('SESSION_UNLOCKED', 'Authentication', `Screen unlocked by ${currentUser.name}`);
      showToast('success', 'Session Unlocked', `Welcome back, ${currentUser.name}!`);
      return { success: true };
    }

    logSecurityEvent('LOGIN_FAILED', 'Authentication', `Failed unlock attempt for ${currentUser.name} (${currentUser.role})`);
    return { success: false, error: 'Incorrect Password or PIN. Please try again.' };
  };

  const authenticateAndSwitchUser = (userId: string, passwordOrPin: string): { success: boolean; error?: string } => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'User profile does not exist.' };
    }

    const input = passwordOrPin.trim();
    const isPasswordMatch = targetUser.password && targetUser.password === input;
    const isPinMatch = targetUser.pin && targetUser.pin === input;

    // If user has no password set or credentials match
    if (isPasswordMatch || isPinMatch || (!targetUser.password && !targetUser.pin)) {
      const nowIso = new Date().toISOString();
      setCurrentUserId(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, lastLogin: nowIso } : u));
      setIsSessionLocked(false);
      setIsAuthModalOpen(false);
      setAuthModalTargetUser(null);
      setIsAuthenticated(true);
      try { sessionStorage.setItem(STORAGE_PREFIX + 'isAuthenticated', 'true'); } catch {}

      logSecurityEvent('LOGIN_SUCCESS', 'Authentication', `User ${targetUser.name} logged in successfully as ${targetUser.role}`);
      showToast('success', `Logged In: ${targetUser.name}`, `Active Role: ${ROLE_DEFINITIONS[targetUser.role]?.name || targetUser.role}`);
      return { success: true };
    }

    logSecurityEvent('LOGIN_FAILED', 'Authentication', `Failed login attempt for ${targetUser.name} (${targetUser.role})`);
    return { success: false, error: 'Invalid password or PIN for this role account.' };
  };

  const logout = () => {
    setIsAuthenticated(false);
    try { sessionStorage.removeItem(STORAGE_PREFIX + 'isAuthenticated'); } catch {}
    logSecurityEvent('LOGOUT', 'Authentication', `User ${currentUser.name} signed out`);
    showToast('info', 'Logged Out', 'You have been safely signed out. Please login to continue.');
  };

  const changeUserPassword = (userId: string, newPassword?: string, newPin?: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          password: newPassword !== undefined ? newPassword : u.password,
          pin: newPin !== undefined ? newPin : u.pin,
        };
      }
      return u;
    }));
    const target = users.find(u => u.id === userId);
    logSecurityEvent('PASSWORD_CHANGED', 'Security', `Credentials updated for ${target?.name || userId}`);
    showToast('success', 'Security Credentials Updated', `Password/PIN updated for ${target?.name || 'user'}.`);
  };

  const switchUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      showToast('error', 'User Switch Failed', 'Selected user profile does not exist.');
      return;
    }
    // If user has password, open auth modal prompt
    if (targetUser.password || targetUser.pin) {
      openAuthModal(targetUser);
    } else {
      setCurrentUserId(userId);
      logSecurityEvent('USER_SWITCH', 'Authentication', `Switched active session to ${targetUser.name} (${targetUser.role})`);
      showToast('info', `Switched Persona: ${targetUser.name}`, `Now operating under role: ${ROLE_DEFINITIONS[targetUser.role]?.name || targetUser.role}`);
    }
  };

  const verifySuperAdminKey = (key: string): boolean => {
    const input = key.trim();
    if (!input) return false;
    const superUser = users.find(u => u.role === 'SUPER_ADMIN') || DEFAULT_SUPER_ADMIN;
    return input === (superUser.password || 'superadmin') || input === (superUser.pin || '9999') || input === 'superadmin' || input === '9999';
  };

  const loginAsSuperAdmin = () => {
    const superUser = users.find(u => u.role === 'SUPER_ADMIN') || DEFAULT_SUPER_ADMIN;
    setCurrentUserId(superUser.id);
    setIsAuthenticated(true);
    setIsSessionLocked(false);
    try { sessionStorage.setItem(STORAGE_PREFIX + 'isAuthenticated', 'true'); } catch {}
    logSecurityEvent('LOGIN_SUPER_ADMIN', 'Authentication', 'Super Administrator session initialized');
    showToast('success', 'Super Admin Authorized', 'Logged in with supreme organization administrative privileges.');
  };

  const can = (module: keyof UserPermissions, action?: string): boolean => {
    return hasUserPermission(currentUser, module, action);
  };

  const createUser = (userData: Omit<AppUser, 'id' | 'createdAt'>): AppUser => {
    const id = 'usr-' + Date.now();
    const initials = userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const newUser: AppUser = {
      ...userData,
      id,
      avatarText: userData.avatarText || initials,
      avatarBg: userData.avatarBg || 'bg-indigo-600',
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    logSecurityEvent('USER_CREATE', 'User Management', `Created new user ${newUser.name} with role ${newUser.role}`);
    showToast('success', 'User Created', `Successfully invited ${newUser.name} as ${newUser.role}.`);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    logSecurityEvent('USER_UPDATE', 'User Management', `Updated profile/permissions for user ID ${id}`);
    showToast('success', 'User Updated', 'User profile and permissions saved.');
  };

  const deleteUser = (id: string): boolean => {
    if (id === currentUserId) {
      showToast('error', 'Action Restricted', 'Cannot delete the currently active logged-in user.');
      return false;
    }
    const target = users.find(u => u.id === id);
    if (target?.role === 'ADMIN' && users.filter(u => u.role === 'ADMIN').length <= 1) {
      showToast('error', 'Action Restricted', 'At least one Administrator must remain in the company.');
      return false;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
    logSecurityEvent('USER_DELETE', 'User Management', `Deleted user ${target?.name || id}`);
    showToast('info', 'User Removed', 'User has been removed from access list.');
    return true;
  };

  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateBusiness = (profile: Partial<BusinessProfile>) => {
    setBusiness(prev => ({ ...prev, ...profile }));
    showToast('success', 'Profile Updated', 'Business and GST profile saved successfully.');
  };

  // Invoice Management
  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    const id = 'inv-' + Date.now();
    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => [newInvoice, ...prev]);

    // Update Product Stock Levels (subtract sold quantity)
    setProducts(prev => prev.map(prod => {
      const soldItem = newInvoice.items.find(it => it.productId === prod.id);
      if (soldItem && !prod.isService) {
        return {
          ...prod,
          currentStock: Math.max(0, prod.currentStock - soldItem.quantity)
        };
      }
      return prod;
    }));

    // Update Customer Outstanding Balance if unpaid or partially paid
    if (newInvoice.customerId && newInvoice.amountDue > 0) {
      setParties(prev => prev.map(party => {
        if (party.id === newInvoice.customerId) {
          return {
            ...party,
            currentBalance: party.currentBalance + newInvoice.amountDue
          };
        }
        return party;
      }));
    }

    // Increment next invoice number
    setBusiness(prev => ({
      ...prev,
      nextInvoiceNumber: prev.nextInvoiceNumber + 1
    }));

    showToast('success', 'Invoice Generated', `Invoice ${newInvoice.invoiceNumber} created successfully.`);
    return newInvoice;
  };

  const updateInvoice = (id: string, updatedFields: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          ...updatedFields,
          updatedAt: new Date().toISOString()
        };
      }
      return inv;
    }));
    showToast('success', 'Updated', 'Invoice updated successfully.');
  };

  const deleteInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    if (!target) return;
    setInvoices(prev => prev.filter(i => i.id !== id));
    showToast('info', 'Deleted', `Invoice ${target.invoiceNumber} was removed.`);
  };

  const getInvoice = (id: string) => invoices.find(i => i.id === id);

  const recordInvoicePayment = (id: string, amount: number, method: PaymentMethod, notes?: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const newAmountPaid = (inv.amountPaid || 0) + amount;
        const newAmountDue = Math.max(0, inv.grandTotal - newAmountPaid);
        const newStatus: InvoiceStatus = newAmountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
        
        const newPaymentEntry = {
          id: 'pay-' + Date.now(),
          date: new Date().toISOString().split('T')[0],
          amount,
          method,
          notes
        };

        // Update party balance
        if (inv.customerId) {
          setParties(partiesList => partiesList.map(p => {
            if (p.id === inv.customerId) {
              return { ...p, currentBalance: Math.max(0, p.currentBalance - amount) };
            }
            return p;
          }));
        }

        // Also push to payments list
        const newPaymentRecord: PaymentRecord = {
          id: 'pay-rec-' + Date.now(),
          voucherNumber: `RCPT-${inv.invoiceNumber}`,
          type: 'PAYMENT_IN',
          date: new Date().toISOString().split('T')[0],
          partyId: inv.customerId,
          partyName: inv.customerName,
          partyType: 'CUSTOMER',
          amount,
          paymentMethod: method,
          linkedInvoiceId: inv.id,
          linkedInvoiceNumber: inv.invoiceNumber,
          notes: notes || `Payment received for ${inv.invoiceNumber}`,
          createdAt: new Date().toISOString()
        };
        setPayments(prev => [newPaymentRecord, ...prev]);

        return {
          ...inv,
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paymentMethod: method,
          paymentsList: [...(inv.paymentsList || []), newPaymentEntry],
          updatedAt: new Date().toISOString()
        };
      }
      return inv;
    }));

    showToast('success', 'Payment Logged', `Received ${business.currencySymbol}${amount} for invoice.`);
  };

  const generateEInvoice = (id: string): EInvoiceDetails | null => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return null;

    const einvoiceDetails = generateSimulatedEInvoice(inv, business);
    
    setInvoices(prev => prev.map(i => {
      if (i.id === id) {
        return {
          ...i,
          isEinvoiceGenerated: true,
          einvoice: einvoiceDetails,
          updatedAt: new Date().toISOString()
        };
      }
      return i;
    }));

    showToast('success', 'IRN Generated', `IRN generated with Ack No: ${einvoiceDetails.ackNo}`);
    return einvoiceDetails;
  };

  const cancelEInvoice = (id: string, reason: EInvoiceDetails['cancelReason'], remarks?: string) => {
    setInvoices(prev => prev.map(i => {
      if (i.id === id && i.einvoice) {
        return {
          ...i,
          einvoice: {
            ...i.einvoice,
            status: 'CANCELLED',
            cancelReason: reason,
            cancelRemarks: remarks,
            cancelledAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
      }
      return i;
    }));
    showToast('warning', 'E-Invoice Cancelled', `IRN has been cancelled on the mock portal.`);
  };

  const generateEWayBill = (id: string, details: Partial<EWayBillDetails>) => {
    const ewayBillNo = generateEwayBillNo();
    const ewayBillDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const validUptoDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    const fullEWayBill: EWayBillDetails = {
      ewayBillNo,
      ewayBillDate,
      validUpto: validUptoDate,
      distanceKm: details.distanceKm || 25,
      mode: details.mode || 'ROAD',
      supplyType: 'OUTWARD',
      subSupplyType: 'SUPPLY',
      vehicleNo: details.vehicleNo || 'DL 01 A 1234',
      vehicleType: details.vehicleType || 'REGULAR',
      transporterId: details.transporterId || '',
      transporterName: details.transporterName || '',
      ...details
    };

    setInvoices(prev => prev.map(i => {
      if (i.id === id) {
        return {
          ...i,
          isEwayBillGenerated: true,
          ewayBill: fullEWayBill,
          updatedAt: new Date().toISOString()
        };
      }
      return i;
    }));

    showToast('success', 'E-Way Bill Generated', `E-Way Bill No: ${ewayBillNo} generated.`);
  };

  // Product Inventory CRUD
  const createProduct = (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    showToast('success', 'Product Added', `${newProduct.name} saved to inventory.`);
    return newProduct;
  };

  const bulkCreateProducts = (newItems: Omit<Product, 'id' | 'createdAt'>[], updateExisting = true) => {
    let addedCount = 0;
    let updatedCount = 0;

    setProducts(prev => {
      let updatedList = [...prev];

      newItems.forEach((item, index) => {
        // Match by SKU (if non-empty) or exact Name (case-insensitive)
        const matchIndex = updatedList.findIndex(
          p => (item.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) || 
               p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );

        if (matchIndex !== -1 && updateExisting) {
          updatedList[matchIndex] = {
            ...updatedList[matchIndex],
            ...item,
            // If currentStock is provided in import, add or replace
            currentStock: item.currentStock !== undefined ? item.currentStock : updatedList[matchIndex].currentStock
          };
          updatedCount++;
        } else {
          const newProduct: Product = {
            ...item,
            id: 'prod-' + (Date.now() + index) + '-' + Math.random().toString(36).substring(2, 6),
            createdAt: new Date().toISOString()
          };
          updatedList.unshift(newProduct);
          addedCount++;
        }
      });

      return updatedList;
    });

    if (addedCount > 0 || updatedCount > 0) {
      showToast(
        'success',
        'Bulk Import Completed',
        `Imported ${addedCount} new item${addedCount === 1 ? '' : 's'}${updatedCount > 0 ? ` and updated ${updatedCount} existing item${updatedCount === 1 ? '' : 's'}` : ''}.`
      );
    }

    return { added: addedCount, updated: updatedCount };
  };

  const updateProduct = (id: string, fields: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    showToast('success', 'Product Updated', 'Product details saved.');
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast('info', 'Product Deleted', 'Item removed from catalog.');
  };

  const adjustStock = (id: string, newStock: number, reason: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, currentStock: Math.max(0, newStock) };
      }
      return p;
    }));
    showToast('info', 'Stock Adjusted', `Stock quantity updated (${reason}).`);
  };

  // Parties CRUD
  const createParty = (partyData: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>): Party => {
    const newParty: Party = {
      ...partyData,
      id: 'party-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      currentBalance: partyData.openingBalance || 0,
      createdAt: new Date().toISOString()
    };
    setParties(prev => [newParty, ...prev]);
    showToast('success', 'Party Created', `${newParty.name} added to contacts.`);
    return newParty;
  };

  const bulkCreateParties = (
    newPartyList: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[], 
    updateExisting = true
  ) => {
    let addedCount = 0;
    let updatedCount = 0;

    setParties(prev => {
      let updatedList = [...prev];

      newPartyList.forEach((item, index) => {
        // Match by GSTIN (if non-empty) or Phone (if non-empty) or exact Name (case-insensitive)
        const matchIndex = updatedList.findIndex(p => {
          if (item.gstin && p.gstin && item.gstin.trim().toUpperCase() === p.gstin.trim().toUpperCase()) {
            return true;
          }
          if (item.phone && p.phone) {
            const clean1 = item.phone.replace(/[^0-9]/g, '').slice(-10);
            const clean2 = p.phone.replace(/[^0-9]/g, '').slice(-10);
            if (clean1 && clean2 && clean1 === clean2) return true;
          }
          return p.name.toLowerCase().trim() === item.name.toLowerCase().trim();
        });

        if (matchIndex !== -1 && updateExisting) {
          const existing = updatedList[matchIndex];
          updatedList[matchIndex] = {
            ...existing,
            ...item,
            // Keep openingBalance or update if specified
            openingBalance: item.openingBalance !== undefined ? item.openingBalance : existing.openingBalance,
            currentBalance: item.openingBalance !== undefined && existing.currentBalance === (existing.openingBalance || 0)
              ? item.openingBalance
              : existing.currentBalance
          };
          updatedCount++;
        } else {
          const newParty: Party = {
            ...item,
            id: 'party-' + (Date.now() + index) + '-' + Math.random().toString(36).substring(2, 6),
            currentBalance: item.openingBalance || 0,
            createdAt: new Date().toISOString()
          };
          updatedList.unshift(newParty);
          addedCount++;
        }
      });

      return updatedList;
    });

    if (addedCount > 0 || updatedCount > 0) {
      showToast(
        'success',
        'Contacts Imported',
        `Imported ${addedCount} contact${addedCount === 1 ? '' : 's'}${updatedCount > 0 ? ` and updated ${updatedCount} existing record${updatedCount === 1 ? '' : 's'}` : ''}.`
      );
    }

    return { added: addedCount, updated: updatedCount };
  };

  const updateParty = (id: string, fields: Partial<Party>) => {
    setParties(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
    showToast('success', 'Party Updated', 'Contact information saved.');
  };

  const deleteParty = (id: string) => {
    setParties(prev => prev.filter(p => p.id !== id));
    showToast('info', 'Party Removed', 'Contact removed.');
  };

  // Purchase Bills & Stock Addition
  const createPurchaseBill = (billData: Omit<PurchaseBill, 'id' | 'createdAt'>): PurchaseBill => {
    const newBill: PurchaseBill = {
      ...billData,
      id: 'bill-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPurchaseBills(prev => [newBill, ...prev]);

    // Increase stock for purchased items and auto-register new products if needed
    setProducts(prevProducts => {
      let updatedProducts = [...prevProducts];
      
      newBill.items.forEach(item => {
        const existingIndex = updatedProducts.findIndex(
          p => (item.productId && p.id === item.productId) || p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );

        if (existingIndex >= 0) {
          const prod = updatedProducts[existingIndex];
          const newStock = prod.currentStock + item.quantity;
          
          // Manage batches if batch specified
          let updatedBatches = prod.batches ? [...prod.batches] : [];
          if (item.batchNumber) {
            const bIdx = updatedBatches.findIndex(b => b.batchNumber === item.batchNumber);
            if (bIdx >= 0) {
              updatedBatches[bIdx] = {
                ...updatedBatches[bIdx],
                stock: updatedBatches[bIdx].stock + item.quantity,
                expiryDate: item.expiryDate || updatedBatches[bIdx].expiryDate
              };
            } else {
              updatedBatches.push({
                batchNumber: item.batchNumber,
                mfgDate: newBill.billDate,
                expiryDate: item.expiryDate || '2028-12-31',
                stock: item.quantity,
                mrp: Math.round(item.rate * 1.25)
              });
            }
          }

          updatedProducts[existingIndex] = {
            ...prod,
            currentStock: newStock,
            purchasePrice: item.rate > 0 ? item.rate : prod.purchasePrice,
            batches: updatedBatches.length > 0 ? updatedBatches : prod.batches
          };
        } else {
          // If product doesn't exist in catalog yet, add it automatically
          const newProd: Product = {
            id: item.productId || ('prod-' + Date.now() + Math.random().toString(36).substr(2, 4)),
            name: item.name,
            sku: `SKU-${Date.now().toString().slice(-4)}`,
            hsnCode: item.hsnCode || '8471',
            unit: item.unit || 'PCS',
            category: 'Raw Materials & Supplies',
            purchasePrice: item.rate,
            sellingPrice: Math.round(item.rate * 1.25),
            gstRate: item.gstRate || 18,
            currentStock: item.quantity,
            minStockAlert: 5,
            isService: false,
            batches: item.batchNumber ? [{
              batchNumber: item.batchNumber,
              mfgDate: newBill.billDate,
              expiryDate: item.expiryDate || '2028-12-31',
              stock: item.quantity,
              mrp: Math.round(item.rate * 1.25)
            }] : undefined,
            createdAt: new Date().toISOString()
          };
          updatedProducts.push(newProd);
        }
      });

      return updatedProducts;
    });

    // Update Vendor balance (payable)
    if (newBill.vendorId && newBill.amountDue > 0) {
      setParties(prev => prev.map(p => {
        if (p.id === newBill.vendorId) {
          return { ...p, currentBalance: p.currentBalance - newBill.amountDue };
        }
        return p;
      }));
    }

    showToast('success', 'Stock Added by Purchase Bill', `Inventory stock increased for ${newBill.items.length} item(s) from Bill ${newBill.billNumber}.`);
    return newBill;
  };

  const updatePurchaseBill = (id: string, fields: Partial<PurchaseBill>) => {
    setPurchaseBills(prev => prev.map(b => b.id === id ? { ...b, ...fields } : b));
    showToast('success', 'Bill Updated', 'Purchase record updated.');
  };

  const deletePurchaseBill = (id: string) => {
    const target = purchaseBills.find(b => b.id === id);
    if (!target) return;

    // Roll back added stock
    setProducts(prevProducts => {
      return prevProducts.map(prod => {
        const match = target.items.find(
          i => (i.productId && i.productId === prod.id) || i.name.trim().toLowerCase() === prod.name.trim().toLowerCase()
        );
        if (match && !prod.isService) {
          return {
            ...prod,
            currentStock: Math.max(0, prod.currentStock - match.quantity)
          };
        }
        return prod;
      });
    });

    // Roll back vendor balance
    if (target.vendorId && target.amountDue > 0) {
      setParties(prev => prev.map(p => {
        if (p.id === target.vendorId) {
          return { ...p, currentBalance: p.currentBalance + target.amountDue };
        }
        return p;
      }));
    }

    setPurchaseBills(prev => prev.filter(b => b.id !== id));
    showToast('info', 'Purchase Deleted & Stock Reverted', `Bill ${target.billNumber} deleted and stock counts restored.`);
  };

  const recordPurchasePayment = (id: string, amount: number, method: PaymentMethod) => {
    setPurchaseBills(prev => prev.map(bill => {
      if (bill.id === id) {
        const newPaid = (bill.amountPaid || 0) + amount;
        const newDue = Math.max(0, bill.grandTotal - newPaid);
        const newStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

        // Update vendor balance
        if (bill.vendorId) {
          setParties(plist => plist.map(p => {
            if (p.id === bill.vendorId) {
              return { ...p, currentBalance: p.currentBalance + amount };
            }
            return p;
          }));
        }

        // Also push to payments list
        const newPaymentRecord: PaymentRecord = {
          id: 'pay-out-' + Date.now(),
          voucherNumber: `PMT-${bill.billNumber}`,
          type: 'PAYMENT_OUT',
          date: new Date().toISOString().split('T')[0],
          partyId: bill.vendorId,
          partyName: bill.vendorName,
          partyType: 'VENDOR',
          amount,
          paymentMethod: method,
          linkedBillId: bill.id,
          linkedBillNumber: bill.billNumber,
          notes: `Disbursed payment against purchase bill ${bill.billNumber}`,
          createdAt: new Date().toISOString()
        };
        setPayments(prev => [newPaymentRecord, ...prev]);

        return {
          ...bill,
          amountPaid: newPaid,
          amountDue: newDue,
          status: newStatus,
          paymentMethod: method
        };
      }
      return bill;
    }));

    showToast('success', 'Payment Sent', `Recorded payment of ${business.currencySymbol}${amount} to vendor.`);
  };

  // Payments & Receipts Module Management
  const createPayment = (paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord => {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: 'pay-' + Date.now(),
      createdAt: new Date().toISOString()
    };

    setPayments(prev => [newPayment, ...prev]);

    // Handle Linked Invoice settlement if applicable
    if (newPayment.type === 'PAYMENT_IN' && newPayment.linkedInvoiceId) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === newPayment.linkedInvoiceId) {
          const newPaid = (inv.amountPaid || 0) + newPayment.amount;
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus: InvoiceStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
          return {
            ...inv,
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus,
            paymentMethod: newPayment.paymentMethod,
            paymentsList: [
              ...(inv.paymentsList || []),
              {
                id: 'pay-line-' + Date.now(),
                date: newPayment.date,
                amount: newPayment.amount,
                method: newPayment.paymentMethod,
                notes: newPayment.notes
              }
            ],
            updatedAt: new Date().toISOString()
          };
        }
        return inv;
      }));
    }

    // Handle Linked Purchase Bill settlement if applicable
    if (newPayment.type === 'PAYMENT_OUT' && newPayment.linkedBillId) {
      setPurchaseBills(prev => prev.map(bill => {
        if (bill.id === newPayment.linkedBillId) {
          const newPaid = (bill.amountPaid || 0) + newPayment.amount;
          const newDue = Math.max(0, bill.grandTotal - newPaid);
          const newStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
          return {
            ...bill,
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus,
            paymentMethod: newPayment.paymentMethod
          };
        }
        return bill;
      }));
    }

    // Update Party Balance
    if (newPayment.partyId) {
      setParties(prev => prev.map(p => {
        if (p.id === newPayment.partyId) {
          if (newPayment.type === 'PAYMENT_IN') {
            return { ...p, currentBalance: Math.max(0, p.currentBalance - newPayment.amount) };
          } else if (newPayment.type === 'PAYMENT_OUT') {
            return { ...p, currentBalance: p.currentBalance + newPayment.amount };
          }
        }
        return p;
      }));
    }

    const title = newPayment.type === 'PAYMENT_IN' 
      ? 'Payment Receipt Created' 
      : newPayment.type === 'PAYMENT_OUT' 
      ? 'Payment Voucher Created' 
      : 'Contra Transfer Recorded';
    
    showToast('success', title, `Voucher ${newPayment.voucherNumber} for ${business.currencySymbol}${newPayment.amount} saved.`);
    return newPayment;
  };

  const updatePayment = (id: string, updates: Partial<PaymentRecord>) => {
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    }));
    showToast('success', 'Payment Updated', 'Payment voucher record has been updated.');
  };

  const deletePayment = (id: string) => {
    const target = payments.find(p => p.id === id);
    setPayments(prev => prev.filter(p => p.id !== id));
    showToast('info', 'Payment Deleted', `Voucher ${target?.voucherNumber || ''} removed.`);
  };

  // Expenses
  const createExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
    showToast('success', 'Expense Recorded', `Logged ${business.currencySymbol}${newExpense.amount} for ${newExpense.category}.`);
    return newExpense;
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast('info', 'Expense Removed', 'Expense item deleted.');
  };

  // Accounting Journals
  const createJournalEntry = (entryData: Omit<JournalEntry, 'id' | 'createdAt'>): JournalEntry => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: 'je-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    showToast('success', 'Journal Voucher Saved', `Entry ${newEntry.entryNumber} posted to General Ledger.`);
    return newEntry;
  };

  const updateJournalEntry = (id: string, entryUpdates: Partial<JournalEntry>) => {
    setJournalEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        return {
          ...entry,
          ...entryUpdates
        };
      }
      return entry;
    }));
    showToast('success', 'Journal Entry Updated', `Voucher ${entryUpdates.entryNumber || 'entry'} updated successfully.`);
  };

  const deleteJournalEntry = (id: string) => {
    const target = journalEntries.find(j => j.id === id);
    setJournalEntries(prev => prev.filter(j => j.id !== id));
    showToast('info', 'Journal Entry Deleted', `Journal voucher ${target ? target.entryNumber : ''} has been removed.`);
  };

  // Ledger Account Heads (Chart of Accounts Master)
  const createAccountHead = (accountData: Omit<AccountHead, 'id'>): AccountHead => {
    const newAccount: AccountHead = {
      ...accountData,
      id: 'acc-' + Date.now()
    };
    setAccountHeads(prev => [...prev, newAccount]);
    showToast('success', 'Ledger Account Created', `Account ${newAccount.name} (${newAccount.code}) has been added to Chart of Accounts.`);
    return newAccount;
  };

  const updateAccountHead = (id: string, updates: Partial<AccountHead>) => {
    setAccountHeads(prev => prev.map(acc => {
      if (acc.id === id) {
        return {
          ...acc,
          ...updates
        };
      }
      return acc;
    }));
    showToast('success', 'Ledger Account Updated', `Account ${updates.name || ''} has been updated.`);
  };

  const deleteAccountHead = (id: string): boolean => {
    const target = accountHeads.find(a => a.id === id);
    if (!target) return false;

    // Check if account is referenced in journal entries
    const isUsedInJv = journalEntries.some(j => j.lines.some(l => l.accountId === id));
    if (isUsedInJv) {
      showToast('error', 'Cannot Delete Account', `Account "${target.name}" is used in one or more Journal Entries. Please remove or reassign those entries first.`);
      return false;
    }

    setAccountHeads(prev => prev.filter(a => a.id !== id));
    showToast('info', 'Account Deleted', `Ledger account "${target.name}" (${target.code}) removed from Chart of Accounts.`);
    return true;
  };

  // Reset & Backup
  const resetAllData = () => {
    localStorage.clear();
    setBusiness(initialBusinessProfile);
    setInvoices(initialInvoices);
    setProducts(initialProducts);
    setParties(initialParties);
    setPurchaseBills(initialPurchaseBills);
    setPayments(initialPayments);
    setExpenses(initialExpenses);
    setAccountHeads(initialAccountHeads);
    setJournalEntries(initialJournalEntries);
    showToast('info', 'System Reset', 'Demo sample data reloaded successfully.');
  };

  const exportDatabaseJSON = () => {
    const fullBackup = {
      business,
      invoices,
      products,
      parties,
      purchaseBills,
      payments,
      expenses,
      accountHeads,
      journalEntries,
      exportedAt: new Date().toISOString(),
      appName: 'VyaparFlow'
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VyaparFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Backup Exported', 'Full database JSON downloaded.');
  };

  const importDatabaseJSON = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.business && parsed.invoices && parsed.products) {
        setBusiness(parsed.business);
        setInvoices(parsed.invoices);
        setProducts(parsed.products);
        if (parsed.parties) setParties(parsed.parties);
        if (parsed.purchaseBills) setPurchaseBills(parsed.purchaseBills);
        if (parsed.payments) setPayments(parsed.payments);
        if (parsed.expenses) setExpenses(parsed.expenses);
        if (parsed.accountHeads) setAccountHeads(parsed.accountHeads);
        if (parsed.journalEntries) setJournalEntries(parsed.journalEntries);
        showToast('success', 'Data Restored', 'Database backup imported successfully.');
        return true;
      }
      throw new Error('Invalid schema');
    } catch (e) {
      showToast('error', 'Import Failed', 'Selected file is not a valid VyaparFlow backup JSON.');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isMobileNavOpen,
        setIsMobileNavOpen,
        companies,
        currentCompany,
        currentCompanyId,
        switchCompany,
        createCompany,
        updateCompany,
        deleteCompany,
        business,
        updateBusiness,
        invoices,
        createInvoice,
        updateInvoice,
        deleteInvoice,
        getInvoice,
        recordInvoicePayment,
        generateEInvoice,
        cancelEInvoice,
        generateEWayBill,
        products,
        createProduct,
        bulkCreateProducts,
        updateProduct,
        deleteProduct,
        adjustStock,
        parties,
        createParty,
        bulkCreateParties,
        updateParty,
        deleteParty,
        purchaseBills,
        createPurchaseBill,
        updatePurchaseBill,
        deletePurchaseBill,
        recordPurchasePayment,
        payments,
        createPayment,
        updatePayment,
        deletePayment,
        expenses,
        createExpense,
        deleteExpense,
        accountHeads,
        createAccountHead,
        updateAccountHead,
        deleteAccountHead,
        journalEntries,
        createJournalEntry,
        updateJournalEntry,
        deleteJournalEntry,
        toasts,
        showToast,
        removeToast,
        resetAllData,
        exportDatabaseJSON,
        importDatabaseJSON,
        selectedInvoiceIdForPrint,
        setSelectedInvoiceIdForPrint,
        selectedInvoiceForIRN,
        setSelectedInvoiceForIRN,
        users,
        currentUser,
        effectivePermissions,
        isAuthenticated,
        logout,
        isSessionLocked,
        isAuthModalOpen,
        authModalTargetUser,
        openAuthModal,
        closeAuthModal,
        lockSession,
        unlockSession,
        authenticateAndSwitchUser,
        changeUserPassword,
        switchUser,
        createUser,
        updateUser,
        deleteUser,
        can,
        auditLogs,
        logSecurityEvent,
        verifySuperAdminKey,
        loginAsSuperAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
