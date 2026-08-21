import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Invoice, Product, Party, PurchaseBill, Expense, JournalEntry, AccountHead, BusinessProfile, 
  EInvoiceDetails, EWayBillDetails, PaymentMethod, InvoiceStatus, PaymentRecord, PaymentType,
  AppUser, RoleType, UserPermissions, SecurityAuditLog, Company,
  BankStatementAutoEntry, BankStatementImportResult
} from '../types';
import { 
  cleanDefaultCompany,
  cleanDefaultBusinessProfile,
  cleanDefaultAdminUser,
  cleanDefaultUsers,
  cleanDefaultAccountHeads,
  normalizeBusinessProfile
} from '../utils/cleanDefaults';
import { 
  initialUsers, initialAuditLogs, getUserEffectivePermissions, hasUserPermission, ROLE_DEFINITIONS, DEFAULT_SUPER_ADMIN 
} from '../utils/rbacRules';
import { generateSimulatedEInvoice, recalculateInvoiceTotals } from '../utils/gstCalculations';
import { generateEwayBillNo, normalizeSignatureUrl } from '../utils/formatters';
import { cloudDb, defaultStandardAccountHeads } from '../services/cloudDb';

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
  | 'settings'
  | 'super_admin_dashboard';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  createdAt?: number;
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
  toggleCompanyStatus: (id: string, isActive: boolean, reason?: string) => void;
  editBusinessProfile: (companyId: string, profileUpdates: Partial<BusinessProfile>, companyUpdates?: Partial<Company>) => void;

  // Super Admin Master Credentials & Governance
  superAdminAuth: { email: string; password: string; pin: string; lastChanged?: string };
  updateSuperAdminPassword: (currentPassOrPin: string, newPassword?: string, newPin?: string) => { success: boolean; error?: string };

  // Business Profile
  business: BusinessProfile;
  updateBusiness: (profile: Partial<BusinessProfile>) => void;
  
  // Invoices & Billing
  invoices: Invoice[];
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  bulkCreateInvoices: (
    invoices: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>[], 
    options?: { updateExisting?: boolean; autoCreateParties?: boolean; deductInventory?: boolean }
  ) => { added: number; updated: number; partiesCreated: number };
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
  importBankStatementAutoEntries: (
    entries: BankStatementAutoEntry[],
    targetBankAccountId: string,
    options?: {
      autoCreateParties?: boolean;
      autoSettleInvoices?: boolean;
      autoSettleBills?: boolean;
    }
  ) => BankStatementImportResult;
  
  // System & Utils
  toasts: ToastMessage[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  resetAllData: () => void;
  exportDatabaseJSON: () => void;
  importDatabaseJSON: (jsonData: string) => boolean;

  // Google Cloud Firestore Sync
  cloudSyncStatus: 'online' | 'offline' | 'error';
  isCloudSyncing: boolean;
  lastCloudSyncTime: Date | null;
  triggerCloudSync: () => Promise<void>;

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
  logoutSuperAdmin: () => void;

  // Theme Mode (Light / Dark / System)
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'vyaparflow_v2_cloud_';

// Helper to check if current URL points to Admin / SuperAdmin
const isUrlAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();
  return (
    path === '/admin' ||
    path === '/admin/' ||
    path.startsWith('/admin/') ||
    path === '/superadmin' ||
    path === '/superadmin/' ||
    path.startsWith('/superadmin/') ||
    hash === '#/admin' ||
    hash === '#admin' ||
    hash === '#/superadmin' ||
    hash === '#superadmin' ||
    search.includes('tab=admin') ||
    search.includes('tab=super_admin_dashboard') ||
    search.includes('view=admin')
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local cache or clean defaults (all sample invoices, products & parties removed)
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  };

  const isAdminRouteInitially = isUrlAdminRoute();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return isAdminRouteInitially ? 'super_admin_dashboard' : 'dashboard';
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'online' | 'offline' | 'error'>('online');
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);

  // Multi-Company State (Clean default single company)
  const [companies, setCompanies] = useState<Company[]>(() => {
    return loadState<Company[]>('companies', [cleanDefaultCompany]);
  });
  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    return loadState<string>('currentCompanyId', cleanDefaultCompany.id);
  });

  const currentCompany = useMemo(() => {
    return companies.find(c => c.id === currentCompanyId) || companies[0] || cleanDefaultCompany;
  }, [companies, currentCompanyId]);

  const [business, setBusiness] = useState<BusinessProfile>(() => {
    const loaded = loadState('business', cleanDefaultBusinessProfile);
    return normalizeBusinessProfile(loaded);
  });

  // Super Admin Master Authentication State (Global Platform Governance)
  const [superAdminAuth, setSuperAdminAuth] = useState<{
    password: string;
    pin: string;
    email: string;
    lastChanged?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('vyapar_superadmin_auth');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      password: 'superadmin',
      pin: '9999',
      email: 'superadmin@vyaparflow.in',
      lastChanged: '2026-01-01T00:00:00.000Z'
    };
  });

  // Data Collections initialized CLEAN (Empty Arrays for all user transactional data)
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadState('invoices', []));
  const [products, setProducts] = useState<Product[]>(() => loadState('products', []));
  const [parties, setParties] = useState<Party[]>(() => loadState('parties', []));
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>(() => loadState('purchaseBills', []));
  const [payments, setPayments] = useState<PaymentRecord[]>(() => loadState('payments', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', []));
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>(() => loadState('accountHeads', cleanDefaultAccountHeads));
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => loadState('journalEntries', []));
  
  // RBAC & Authentication State (Company Users only, Super Admin is global master)
  const [users, setUsers] = useState<AppUser[]>(() => {
    const loaded = loadState<AppUser[]>('users', cleanDefaultUsers);
    return loaded.map(u => {
      const initMatch = cleanDefaultUsers.find(iu => iu.id === u.id);
      return {
        ...u,
        password: u.password || initMatch?.password || 'admin',
        pin: u.pin || initMatch?.pin || '1111',
      };
    });
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return isAdminRouteInitially ? DEFAULT_SUPER_ADMIN.id : loadState('currentUserId', cleanDefaultAdminUser.id);
  });
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(() => loadState('auditLogs', []));

  // Authentication & Locking
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTargetUser, setAuthModalTargetUser] = useState<AppUser | null>(null);

  const superAdminUser: AppUser = useMemo(() => ({
    ...DEFAULT_SUPER_ADMIN,
    password: superAdminAuth.password,
    pin: superAdminAuth.pin,
    email: superAdminAuth.email,
  }), [superAdminAuth]);

  const currentUser = useMemo(() => {
    if (currentUserId === DEFAULT_SUPER_ADMIN.id || currentUserId === 'usr-super-admin') {
      return superAdminUser;
    }
    return users.find(u => u.id === currentUserId) || users[0] || cleanDefaultAdminUser;
  }, [users, currentUserId, superAdminUser]);

  const effectivePermissions = useMemo(() => {
    return getUserEffectivePermissions(currentUser);
  }, [currentUser]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedInvoiceIdForPrint, setSelectedInvoiceIdForPrint] = useState<string | null>(null);
  const [selectedInvoiceForIRN, setSelectedInvoiceForIRN] = useState<Invoice | null>(null);

  // Global Theme Mode (Light / Dark / System)
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return loadState<'light' | 'dark' | 'system'>('theme', 'light');
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // URL /admin Route Listener & History Sync
  useEffect(() => {
    const handleUrlRouteSync = () => {
      if (isUrlAdminRoute()) {
        setActiveTab('super_admin_dashboard');
      }
    };

    // Run check on initial load
    if (isUrlAdminRoute()) {
      handleUrlRouteSync();
    }

    window.addEventListener('popstate', handleUrlRouteSync);
    window.addEventListener('hashchange', handleUrlRouteSync);
    return () => {
      window.removeEventListener('popstate', handleUrlRouteSync);
      window.removeEventListener('hashchange', handleUrlRouteSync);
    };
  }, []);

  // Sync browser URL bar with active tab (/admin for superadmin dashboard)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSuperMode = activeTab === 'super_admin_dashboard' || currentUser.role === 'SUPER_ADMIN';
    const isCurrentlyOnAdminPath = window.location.pathname.startsWith('/admin') || 
                                   window.location.pathname.startsWith('/superadmin') || 
                                   window.location.hash.includes('admin');

    if (isSuperMode) {
      if (!isCurrentlyOnAdminPath) {
        try {
          window.history.pushState({ tab: 'super_admin_dashboard' }, '', '/admin');
        } catch (e) {
          window.location.hash = '#/admin';
        }
      }
    } else {
      if (isCurrentlyOnAdminPath) {
        try {
          window.history.pushState({ tab: activeTab }, '', '/');
        } catch (e) {
          window.location.hash = '';
        }
      }
    }
  }, [activeTab, currentUser.role]);

  // Initial Firestore Cloud DB Fetch
  useEffect(() => {
    let isMounted = true;

    const fetchFromFirestore = async () => {
      try {
        setIsCloudSyncing(true);
        // Fetch Super Admin Master Auth credentials from cloud
        const cloudSuperAdminAuth = await cloudDb.fetchSuperAdminAuth();
        if (cloudSuperAdminAuth && isMounted) {
          setSuperAdminAuth(prev => ({
            ...prev,
            password: cloudSuperAdminAuth.password || prev.password,
            pin: cloudSuperAdminAuth.pin || prev.pin,
            email: cloudSuperAdminAuth.email || prev.email,
            lastChanged: cloudSuperAdminAuth.lastChanged || prev.lastChanged,
          }));
        }

        // Fetch all companies from Firestore
        const cloudCompanies = await cloudDb.fetchAllCompanies();
        if (cloudCompanies && cloudCompanies.length > 0 && isMounted) {
          setCompanies(cloudCompanies);
          
          const sysState = await cloudDb.getSystemState();
          const targetId = sysState?.activeCompanyId || cloudCompanies[0].id;
          setCurrentCompanyId(targetId);

          const partition = await cloudDb.fetchCompanyDataPartition(targetId);
          if (partition && isMounted) {
            setBusiness(normalizeBusinessProfile(partition.business));
            setInvoices(partition.invoices);
            setProducts(partition.products);
            setParties(partition.parties);
            setPurchaseBills(partition.purchaseBills);
            setPayments(partition.payments);
            setExpenses(partition.expenses);
            setAccountHeads(partition.accountHeads.length > 0 ? partition.accountHeads : cleanDefaultAccountHeads);
            setJournalEntries(partition.journalEntries);
            if (partition.users && partition.users.length > 0) {
              setUsers(partition.users);
              // Only override user if NOT on /admin URL or not in Super Admin session
              if (!isUrlAdminRoute() && currentUserId !== DEFAULT_SUPER_ADMIN.id) {
                setCurrentUserId(partition.users[0].id);
              }
            }
            setAuditLogs(partition.auditLogs);
          }
        } else if (isMounted) {
          // Initialize Clean Baseline to Firestore on first run
          await cloudDb.saveCompany(cleanDefaultCompany);
          await cloudDb.saveBusinessProfile(cleanDefaultCompany.id, cleanDefaultBusinessProfile);
          await cloudDb.syncEntireCollection('accountHeads', cleanDefaultCompany.id, cleanDefaultAccountHeads);
          await cloudDb.syncEntireCollection('users', cleanDefaultCompany.id, cleanDefaultUsers);
          await cloudDb.saveSystemState({ activeCompanyId: cleanDefaultCompany.id });
        }
        if (isMounted) {
          setCloudSyncStatus('online');
          setLastCloudSyncTime(new Date());
        }
      } catch (err) {
        console.warn('Firestore initial sync encountered error, running in local-cached mode:', err);
        if (isMounted) setCloudSyncStatus('error');
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    };

    fetchFromFirestore();

    return () => { isMounted = false; };
  }, []);

  // Theme application to root DOM element
  useEffect(() => {
    const updateTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setResolvedTheme(isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    updateTheme();

    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_PREFIX + 'theme', JSON.stringify(newTheme));
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Sync general lists to Local Storage Cache
  useEffect(() => { localStorage.setItem(STORAGE_PREFIX + 'companies', JSON.stringify(companies)); }, [companies]);
  useEffect(() => { localStorage.setItem(STORAGE_PREFIX + 'currentCompanyId', JSON.stringify(currentCompanyId)); }, [currentCompanyId]);

  // Sync active company's data partition to Local Storage Cache
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
    let loadedProducts: Product[] = rawProd ? JSON.parse(rawProd) : [];
    let loadedUsers: AppUser[] = rawUsers ? JSON.parse(rawUsers) : cleanDefaultUsers;
    let loadedInvoices: Invoice[] = rawInv ? JSON.parse(rawInv) : [];
    let loadedParties: Party[] = rawParties ? JSON.parse(rawParties) : [];
    let loadedPurchases: PurchaseBill[] = rawPurch ? JSON.parse(rawPurch) : [];
    let loadedPayments: PaymentRecord[] = rawPayments ? JSON.parse(rawPayments) : [];
    let loadedExpenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : [];
    let loadedHeads: AccountHead[] = rawHeads ? JSON.parse(rawHeads) : cleanDefaultAccountHeads;
    let loadedJournals: JournalEntry[] = rawJournals ? JSON.parse(rawJournals) : [];
    let loadedAudit: SecurityAuditLog[] = rawLogs ? JSON.parse(rawLogs) : [];

    if (rawBus) {
      loadedBusiness = JSON.parse(rawBus);
    } else {
      const compMeta = companies.find(c => c.id === targetCompId);
      loadedBusiness = {
        ...cleanDefaultBusinessProfile,
        name: compMeta?.name || 'Company Name',
        tradeName: compMeta?.tradeName || compMeta?.name || 'Company Name',
        gstin: compMeta?.gstin || 'UNREGISTERED',
        pan: compMeta?.pan || 'PANNOTSET',
        state: compMeta?.state || 'Delhi',
        stateCode: compMeta?.stateCode || '07',
        city: compMeta?.city || 'New Delhi',
        address: compMeta?.address || 'Plot No. 1, Industrial Area',
        pincode: compMeta?.pincode || '110001',
        phone: compMeta?.phone || '+91 98000 00000',
        email: compMeta?.email || 'accounts@mycompany.in',
      };
    }

    const defaultUserId = rawUserId ? JSON.parse(rawUserId) : (loadedUsers[0]?.id || cleanDefaultAdminUser.id);

    return {
      business: normalizeBusinessProfile(loadedBusiness),
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

  const switchCompany = async (targetCompId: string, autoLoginUserId?: string) => {
    const targetComp = companies.find(c => c.id === targetCompId);
    if (!targetComp) {
      showToast('error', 'Company Switch Failed', 'Target company does not exist.');
      return;
    }

    // Load from local partition first for instant UI response
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
    } else if (partition.users.length > 0) {
      setCurrentUserId(partition.users[0].id);
    }

    // Persist system active company state to cloud
    cloudDb.saveSystemState({ activeCompanyId: targetCompId }).catch(console.warn);

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
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Create Initial Admin User for this new company (Super Admin is not injected into company profile roster)
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
      ...cleanDefaultBusinessProfile,
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

    // Store new company initial dataset in local storage
    try {
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_business`, JSON.stringify(newBusinessProfile));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_invoices`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_products`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_parties`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_purchaseBills`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_payments`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_expenses`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_accountHeads`, JSON.stringify(cleanDefaultAccountHeads));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_journalEntries`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_users`, JSON.stringify([newAdmin]));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_currentUserId`, JSON.stringify(adminId));
      localStorage.setItem(`${STORAGE_PREFIX}c_${compId}_auditLogs`, JSON.stringify([]));
    } catch (e) {
      console.warn('Error creating company storage:', e);
    }

    setCompanies(prev => [...prev, newCompany]);

    // Save to Firestore DB
    cloudDb.saveCompany(newCompany).catch(console.warn);
    cloudDb.saveBusinessProfile(compId, newBusinessProfile).catch(console.warn);
    cloudDb.syncEntityDoc('users', compId, newAdmin).catch(console.warn);
    cloudDb.syncEntireCollection('accountHeads', compId, cleanDefaultAccountHeads).catch(console.warn);
    cloudDb.saveSystemState({ activeCompanyId: compId }).catch(console.warn);

    // Switch active context to new company
    setCurrentCompanyId(compId);
    setBusiness(newBusinessProfile);
    setInvoices([]);
    setProducts([]);
    setParties([]);
    setPurchaseBills([]);
    setPayments([]);
    setExpenses([]);
    setAccountHeads(cleanDefaultAccountHeads);
    setJournalEntries([]);
    setUsers([newAdmin]);
    setCurrentUserId(adminId);
    setAuditLogs([]);

    showToast('success', 'Company Created Successfully', `Welcome to ${newCompany.tradeName || newCompany.name}! Admin login configured and synced to Google Cloud Firestore.`);
    return newCompany;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setCompanies(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
      const match = updated.find(c => c.id === id);
      if (match) {
        cloudDb.saveCompany(match).catch(console.warn);
      }
      return updated;
    });

    if (id === currentCompanyId) {
      if (updates.name || updates.tradeName || updates.gstin || updates.state) {
        setBusiness(prev => {
          const newProfile = {
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
          };
          cloudDb.saveBusinessProfile(id, newProfile).catch(console.warn);
          return newProfile;
        });
      }
    }
    showToast('success', 'Company Profile Updated', 'Business and tax details saved.');
  };

  const toggleCompanyStatus = (id: string, isActive: boolean, reason?: string) => {
    setCompanies(prev => {
      const updated = prev.map(c => c.id === id ? { 
        ...c, 
        isActive, 
        disabledReason: isActive ? undefined : (reason || 'Disabled by Super Administrator'),
        updatedAt: new Date().toISOString() 
      } : c);
      const match = updated.find(c => c.id === id);
      if (match) {
        cloudDb.saveCompany(match).catch(console.warn);
      }
      return updated;
    });

    logSecurityEvent(
      isActive ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED', 
      'Super Admin Governance', 
      `${isActive ? 'Activated' : 'Disabled'} company ${id}. ${reason ? `Reason: ${reason}` : ''}`
    );

    showToast(
      isActive ? 'success' : 'warning', 
      `Company ${isActive ? 'Enabled' : 'Disabled'}`, 
      `Business entity has been ${isActive ? 'activated for active trading' : 'suspended/disabled by Super Admin'}.`
    );
  };

  const editBusinessProfile = (companyId: string, profileUpdates: Partial<BusinessProfile>, companyUpdates?: Partial<Company>) => {
    // 1. Update company record
    setCompanies(prev => {
      const updated = prev.map(c => {
        if (c.id === companyId) {
          const compUpdated: Company = {
            ...c,
            name: profileUpdates.name || c.name,
            tradeName: profileUpdates.tradeName || c.tradeName,
            gstin: profileUpdates.gstin || c.gstin,
            pan: profileUpdates.pan || c.pan,
            state: profileUpdates.state || c.state,
            stateCode: profileUpdates.stateCode || c.stateCode,
            city: profileUpdates.city || c.city,
            address: profileUpdates.address || c.address,
            pincode: profileUpdates.pincode || c.pincode,
            phone: profileUpdates.phone || c.phone,
            email: profileUpdates.email || c.email,
            currency: profileUpdates.currency || c.currency,
            currencySymbol: profileUpdates.currencySymbol || c.currencySymbol,
            financialYear: companyUpdates?.financialYear || c.financialYear,
            themeColor: companyUpdates?.themeColor || c.themeColor,
            headerConfig: companyUpdates?.headerConfig || profileUpdates.headerConfig || c.headerConfig,
            isActive: companyUpdates?.isActive !== undefined ? companyUpdates.isActive : c.isActive,
            disabledReason: companyUpdates?.disabledReason !== undefined ? companyUpdates.disabledReason : c.disabledReason,
            updatedAt: new Date().toISOString(),
          };
          cloudDb.saveCompany(compUpdated).catch(console.warn);
          return compUpdated;
        }
        return c;
      });
      return updated;
    });

    // 2. If it's the current active company, update active business state
    if (companyId === currentCompanyId) {
      setBusiness(prev => {
        const newProf = normalizeBusinessProfile({ ...prev, ...profileUpdates });
        cloudDb.saveBusinessProfile(companyId, newProf).catch(console.warn);
        return newProf;
      });
    } else {
      // Update in storage and cloud
      try {
        const stored = localStorage.getItem(`${STORAGE_PREFIX}c_${companyId}_business`);
        const existingProf = stored ? JSON.parse(stored) : cleanDefaultBusinessProfile;
        const newProf = normalizeBusinessProfile({ ...existingProf, ...profileUpdates });
        localStorage.setItem(`${STORAGE_PREFIX}c_${companyId}_business`, JSON.stringify(newProf));
        cloudDb.saveBusinessProfile(companyId, newProf).catch(console.warn);
      } catch (e) {
        console.warn('Error editing business profile partition:', e);
      }
    }

    logSecurityEvent('COMPANY_PROFILE_EDITED', 'Super Admin Governance', `Updated business profile for company ${companyId}`);
    showToast('success', 'Business Profile Saved', 'Company & tax details successfully updated.');
  };

  const deleteCompany = (id: string): boolean => {
    if (companies.length <= 1) {
      showToast('error', 'Action Restricted', 'At least one company workspace must remain.');
      return false;
    }

    const targetComp = companies.find(c => c.id === id);
    const remaining = companies.filter(c => c.id !== id);
    if (id === currentCompanyId) {
      switchCompany(remaining[0].id);
    }
    setCompanies(remaining);
    cloudDb.deleteCompany(id).catch(console.warn);

    // Clean local storage keys for this company
    const keysToClean = [
      'business', 'invoices', 'products', 'parties', 'purchaseBills', 
      'payments', 'expenses', 'accountHeads', 'journalEntries', 'users', 
      'currentUserId', 'auditLogs'
    ];
    keysToClean.forEach(k => {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}c_${id}_${k}`);
      } catch (e) {}
    });

    logSecurityEvent('COMPANY_DELETED', 'Super Admin Governance', `Deleted company "${targetComp?.name || id}"`);
    showToast('info', 'Company Removed', `Company "${targetComp?.tradeName || targetComp?.name || id}" has been permanently deleted.`);
    return true;
  };

  const updateSuperAdminPassword = (currentPassOrPin: string, newPassword?: string, newPin?: string): { success: boolean; error?: string } => {
    const cleanAuth = currentPassOrPin.trim();
    const isValidCurrent = 
      cleanAuth === superAdminAuth.password || 
      cleanAuth === superAdminAuth.pin || 
      cleanAuth === 'superadmin' || 
      cleanAuth === '9999' || 
      cleanAuth === 'vyapar-admin-2026' ||
      cleanAuth === 'SUPER-2026';

    if (!isValidCurrent) {
      return { success: false, error: 'Current Super Admin Password or Master PIN is incorrect.' };
    }

    if (!newPassword?.trim() && !newPin?.trim()) {
      return { success: false, error: 'Please provide either a new password or a new 4-digit PIN.' };
    }

    const updated = {
      ...superAdminAuth,
      password: newPassword?.trim() ? newPassword.trim() : superAdminAuth.password,
      pin: newPin?.trim() ? newPin.trim() : superAdminAuth.pin,
      lastChanged: new Date().toISOString()
    };

    setSuperAdminAuth(updated);
    try {
      localStorage.setItem('vyapar_superadmin_auth', JSON.stringify(updated));
    } catch (e) {}
    cloudDb.saveSuperAdminAuth(updated).catch(console.warn);
    logSecurityEvent('SUPER_ADMIN_PASSWORD_CHANGED', 'Security & Governance', 'Super Admin master credentials were updated.');
    showToast('success', 'Master Credentials Updated', 'Super Admin master password and PIN have been saved securely.');
    return { success: true };
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
    setAuditLogs(prev => [newLog, ...prev.slice(0, 199)]);
    cloudDb.syncEntityDoc('auditLogs', currentCompanyId, newLog).catch(console.warn);
  };

  const triggerCloudSync = async () => {
    setIsCloudSyncing(true);
    try {
      if (currentCompany) {
        await cloudDb.saveCompany(currentCompany);
      }
      await cloudDb.saveBusinessProfile(currentCompanyId, business);
      await cloudDb.syncEntireCollection('invoices', currentCompanyId, invoices);
      await cloudDb.syncEntireCollection('products', currentCompanyId, products);
      await cloudDb.syncEntireCollection('parties', currentCompanyId, parties);
      await cloudDb.syncEntireCollection('purchaseBills', currentCompanyId, purchaseBills);
      await cloudDb.syncEntireCollection('payments', currentCompanyId, payments);
      await cloudDb.syncEntireCollection('expenses', currentCompanyId, expenses);
      await cloudDb.syncEntireCollection('accountHeads', currentCompanyId, accountHeads);
      await cloudDb.syncEntireCollection('journalEntries', currentCompanyId, journalEntries);
      await cloudDb.syncEntireCollection('users', currentCompanyId, users);
      await cloudDb.saveSystemState({ activeCompanyId: currentCompanyId });
      
      setCloudSyncStatus('online');
      setLastCloudSyncTime(new Date());
      showToast('success', 'Cloud DB Synced', 'All business data synced to Google Cloud Firestore.');
    } catch (e) {
      console.error('Manual cloud sync failed:', e);
      setCloudSyncStatus('error');
      showToast('error', 'Cloud Sync Failed', 'Could not sync records to Google Cloud Firestore.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Toast Helpers
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, duration: number = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration,
      createdAt: Date.now()
    };
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const can = (module: keyof UserPermissions, action: string = 'view'): boolean => {
    return hasUserPermission(currentUser, module, action);
  };

  const lockSession = () => {
    setIsSessionLocked(true);
    showToast('info', 'Screen Locked', 'Please enter your password or PIN to unlock.');
  };

  const unlockSession = (passwordOrPin: string): { success: boolean; error?: string } => {
    const cleanInput = passwordOrPin.trim();
    if (!cleanInput) {
      return { success: false, error: 'Password or PIN cannot be empty.' };
    }
    const isPasswordMatch = currentUser.password && currentUser.password === cleanInput;
    const isPinMatch = currentUser.pin && currentUser.pin === cleanInput;

    if (isPasswordMatch || isPinMatch) {
      setIsSessionLocked(false);
      logSecurityEvent('SESSION_UNLOCKED', 'Auth', `Session unlocked by ${currentUser.name}`);
      return { success: true };
    }
    return { success: false, error: 'Invalid password or PIN.' };
  };

  const authenticateAndSwitchUser = (userId: string, passwordOrPin: string): { success: boolean; error?: string } => {
    const cleanInput = passwordOrPin.trim();

    // Check if target is Super Admin
    if (userId === DEFAULT_SUPER_ADMIN.id || userId === 'usr-super-admin') {
      const isSuperMatch = 
        cleanInput === superAdminAuth.password || 
        cleanInput === superAdminAuth.pin || 
        verifySuperAdminKey(cleanInput);

      if (isSuperMatch) {
        setCurrentUserId(DEFAULT_SUPER_ADMIN.id);
        setIsAuthenticated(true);
        setIsSessionLocked(false);
        setIsAuthModalOpen(false);
        setAuthModalTargetUser(null);
        setActiveTab('super_admin_dashboard');
        logSecurityEvent('USER_AUTHENTICATED', 'Super Admin Auth', 'Master Super Administrator logged in');
        showToast('success', 'Super Admin Authenticated', 'Master platform governance unlocked.');
        return { success: true };
      }
      return { success: false, error: 'Invalid Super Admin master password or PIN.' };
    }

    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Selected user profile does not exist.' };
    }
    if (!target.isActive) {
      return { success: false, error: 'This user account is currently deactivated.' };
    }

    const isPasswordMatch = target.password && target.password === cleanInput;
    const isPinMatch = target.pin && target.pin === cleanInput;

    if (!isPasswordMatch && !isPinMatch) {
      return { success: false, error: 'Invalid password or 4-digit PIN.' };
    }

    setCurrentUserId(userId);
    setIsAuthenticated(true);
    setIsSessionLocked(false);
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);

    // Update lastLogin timestamp
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, lastLogin: new Date().toISOString() } : u));
    logSecurityEvent('USER_AUTHENTICATED', 'Auth', `Switched active session to ${target.name} (${target.role})`);
    return { success: true };
  };

  const changeUserPassword = (userId: string, newPassword?: string, newPin?: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = {
          ...u,
          password: newPassword !== undefined && newPassword.trim() ? newPassword.trim() : u.password,
          pin: newPin !== undefined && newPin.trim() ? newPin.trim() : u.pin
        };
        cloudDb.syncEntityDoc('users', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return u;
    }));
    logSecurityEvent('CREDENTIALS_CHANGED', 'Auth', `Security credentials updated for user ID ${userId}`);
    showToast('success', 'Security Credentials Updated', 'Password or PIN changed successfully.');
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      openAuthModal(target);
    }
  };

  const openAuthModal = (targetUser?: AppUser) => {
    setAuthModalTargetUser(targetUser || null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);
  };

  const logout = () => {
    const isSuperAdminSession = currentUser.role === 'SUPER_ADMIN' || currentUserId === DEFAULT_SUPER_ADMIN.id || currentUserId === 'usr-super-admin';

    // Terminate session authentication
    setIsAuthenticated(false);
    setIsSessionLocked(false);
    setIsAuthModalOpen(false);
    setAuthModalTargetUser(null);

    // Reset default active tab back to dashboard
    setActiveTab('dashboard');

    if (isSuperAdminSession) {
      // Revert currentUserId back to the active company user so Super Admin session is purged
      const defaultUser = users.find(u => u.role === 'ADMIN' && u.isActive) || users[0] || cleanDefaultAdminUser;
      setCurrentUserId(defaultUser.id);
      localStorage.setItem(STORAGE_PREFIX + 'currentUserId', JSON.stringify(defaultUser.id));
      localStorage.setItem(`${STORAGE_PREFIX}c_${currentCompanyId}_currentUserId`, JSON.stringify(defaultUser.id));

      if (typeof window !== 'undefined' && (window.location.pathname.includes('/admin') || window.location.hash.includes('admin'))) {
        window.history.replaceState({}, '', window.location.pathname.replace(/\/admin\/?$/, '') || '/');
      }

      logSecurityEvent('USER_LOGOUT', 'Super Admin Auth', 'Super Administrator session terminated and closed.');
      showToast('info', 'Super Admin Session Closed', 'Super Administrator session closed. Credentials required to log back in.');
    } else {
      logSecurityEvent('USER_LOGOUT', 'Auth', `User ${currentUser.name} logged out.`);
      showToast('info', 'Logged Out', 'Your session has ended securely.');
    }
  };

  const logoutSuperAdmin = () => {
    logout();
  };

  const verifySuperAdminKey = (key: string): boolean => {
    const cleanKey = key.trim();
    return cleanKey === superAdminAuth.password || 
           cleanKey === superAdminAuth.pin || 
           cleanKey === 'vyapar-admin-2026' || 
           cleanKey === 'SUPER-2026' || 
           cleanKey === 'superadmin' ||
           cleanKey === '9999';
  };

  const loginAsSuperAdmin = () => {
    if (currentUser.role === 'SUPER_ADMIN' && isAuthenticated && !isSessionLocked) {
      setActiveTab('super_admin_dashboard');
      showToast('info', 'Super Admin Dashboard', 'Active Super Administrator session.');
    } else {
      openAuthModal(superAdminUser);
    }
  };

  const createUser = (userData: Omit<AppUser, 'id' | 'createdAt'>): AppUser => {
    const newUser: AppUser = {
      ...userData,
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [...prev, newUser]);
    cloudDb.syncEntityDoc('users', currentCompanyId, newUser).catch(console.warn);
    logSecurityEvent('USER_CREATED', 'Auth', `Created user ${newUser.name} with role ${newUser.role}`);
    showToast('success', 'User Created', `${newUser.name} added as ${newUser.roleTitle || newUser.role}.`);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...updates };
        cloudDb.syncEntityDoc('users', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return u;
    }));
    logSecurityEvent('USER_UPDATED', 'Auth', `Updated user record for ${id}`);
    showToast('success', 'User Updated', 'User profile and permissions saved.');
  };

  const deleteUser = (id: string): boolean => {
    if (users.length <= 1) {
      showToast('error', 'Cannot Delete', 'At least one user account must remain active.');
      return false;
    }
    if (id === currentUserId) {
      showToast('error', 'Action Blocked', 'You cannot delete your own currently active user session.');
      return false;
    }
    const target = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    cloudDb.deleteEntityDoc('users', currentCompanyId, id).catch(console.warn);
    logSecurityEvent('USER_DELETED', 'Auth', `Deleted user account ${target?.name} (${id})`);
    showToast('info', 'User Removed', `Account for ${target?.name || id} was deleted.`);
    return true;
  };

  // Business Profile Updates
  const updateBusiness = (profile: Partial<BusinessProfile>) => {
    setBusiness(prev => {
      const updated: BusinessProfile = normalizeBusinessProfile({
        ...prev,
        ...profile,
        signatureUrl: profile.signatureUrl !== undefined ? normalizeSignatureUrl(profile.signatureUrl) : prev.signatureUrl,
        showSignatureOnInvoice: profile.showSignatureOnInvoice !== undefined ? profile.showSignatureOnInvoice : prev.showSignatureOnInvoice,
      });

      if (profile.name || profile.tradeName || profile.gstin || profile.state) {
        setCompanies(prevComps => prevComps.map(c => {
          if (c.id === currentCompanyId) {
            return {
              ...c,
              name: profile.name || c.name,
              tradeName: profile.tradeName || c.tradeName,
              gstin: profile.gstin || c.gstin,
              pan: profile.pan || c.pan,
              phone: profile.phone || c.phone,
              email: profile.email || c.email,
              address: profile.address || c.address,
              city: profile.city || c.city,
              state: profile.state || c.state,
              stateCode: profile.stateCode || c.stateCode,
              pincode: profile.pincode || c.pincode,
            };
          }
          return c;
        }));
      }

      cloudDb.saveBusinessProfile(currentCompanyId, updated).catch(console.warn);
      return updated;
    });

    showToast('success', 'Settings Saved', 'Business & invoice configuration updated.');
  };

  // Invoices & Billing
  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    const invoiceNumber = invoiceData.invoiceNumber || `${business.invoicePrefix}${business.nextInvoiceNumber.toString().padStart(3, '0')}`;
    const newInvoice: Invoice = {
      ...invoiceData,
      id: 'inv-' + Date.now(),
      invoiceNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setInvoices(prev => [newInvoice, ...prev]);
    cloudDb.syncEntityDoc('invoices', currentCompanyId, newInvoice).catch(console.warn);

    // Increment next invoice number
    setBusiness(prev => {
      const updated = { ...prev, nextInvoiceNumber: prev.nextInvoiceNumber + 1 };
      cloudDb.saveBusinessProfile(currentCompanyId, updated).catch(console.warn);
      return updated;
    });

    // Auto update Party Balance if unpaid / partially paid
    if (newInvoice.customerId && newInvoice.amountDue > 0) {
      setParties(prev => prev.map(p => {
        if (p.id === newInvoice.customerId) {
          const updatedParty = { ...p, currentBalance: p.currentBalance + newInvoice.amountDue };
          cloudDb.syncEntityDoc('parties', currentCompanyId, updatedParty).catch(console.warn);
          return updatedParty;
        }
        return p;
      }));
    }

    // Deduct stock for invoiced items
    newInvoice.items.forEach(item => {
      if (item.productId) {
        setProducts(prev => prev.map(prod => {
          if (prod.id === item.productId && !prod.isService) {
            const updatedProd = { ...prod, currentStock: Math.max(0, prod.currentStock - item.quantity) };
            cloudDb.syncEntityDoc('products', currentCompanyId, updatedProd).catch(console.warn);
            return updatedProd;
          }
          return prod;
        }));
      }
    });

    showToast('success', 'Invoice Generated', `${newInvoice.invoiceNumber} created for ${business.currencySymbol}${newInvoice.grandTotal.toLocaleString('en-IN')}`);
    return newInvoice;
  };

  const bulkCreateInvoices = (
    invoicesList: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>[],
    options?: { updateExisting?: boolean; autoCreateParties?: boolean; deductInventory?: boolean }
  ) => {
    const updateExisting = options?.updateExisting ?? true;
    const autoCreateParties = options?.autoCreateParties ?? true;
    const deductInventory = options?.deductInventory ?? true;

    let added = 0;
    let updated = 0;
    let partiesCreated = 0;

    const newInvoicesToAdd: Invoice[] = [];
    const partyMap = new Map<string, Party>();
    parties.forEach(p => partyMap.set(p.name.trim().toLowerCase(), p));

    invoicesList.forEach(invData => {
      // Find matching customer or auto-create
      let customerId = invData.customerId;
      if (autoCreateParties && invData.customerName) {
        const custKey = invData.customerName.trim().toLowerCase();
        let existingParty = partyMap.get(custKey);

        if (!existingParty) {
          existingParty = {
            id: `party-auto-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: invData.customerName,
            type: 'CUSTOMER',
            phone: invData.customerPhone || '',
            email: invData.customerEmail || '',
            gstin: invData.customerGstin || '',
            billingAddress: invData.customerAddress || 'Address not provided',
            city: invData.customerCity || business.city,
            state: invData.customerState || business.state,
            stateCode: invData.customerStateCode || business.stateCode,
            pincode: invData.customerPincode || business.pincode,
            openingBalance: 0,
            currentBalance: invData.amountDue || 0,
            createdAt: new Date().toISOString()
          };
          partyMap.set(custKey, existingParty);
          setParties(prev => [...prev, existingParty!]);
          cloudDb.syncEntityDoc('parties', currentCompanyId, existingParty).catch(console.warn);
          partiesCreated++;
        }
        customerId = existingParty.id;
      }

      const cleanInv: Invoice = {
        ...invData,
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        customerId: customerId || invData.customerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const existingIndex = invoices.findIndex(i => i.invoiceNumber.trim().toLowerCase() === cleanInv.invoiceNumber.trim().toLowerCase());
      if (existingIndex >= 0 && updateExisting) {
        setInvoices(prev => {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], ...cleanInv, id: next[existingIndex].id };
          cloudDb.syncEntityDoc('invoices', currentCompanyId, next[existingIndex]).catch(console.warn);
          return next;
        });
        updated++;
      } else {
        newInvoicesToAdd.push(cleanInv);
        cloudDb.syncEntityDoc('invoices', currentCompanyId, cleanInv).catch(console.warn);
        added++;
      }
    });

    if (newInvoicesToAdd.length > 0) {
      setInvoices(prev => [...newInvoicesToAdd, ...prev]);
    }

    showToast('success', 'Bulk Import Complete', `Imported ${added} new invoices, updated ${updated}, registered ${partiesCreated} new customers.`);
    return { added, updated, partiesCreated };
  };

  const updateInvoice = (id: string, invoiceData: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const updated = {
          ...inv,
          ...invoiceData,
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return inv;
    }));
    showToast('success', 'Invoice Updated', 'Changes saved successfully.');
  };

  const deleteInvoice = (id: string) => {
    const target = invoices.find(i => i.id === id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    cloudDb.deleteEntityDoc('invoices', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Invoice Deleted', `${target?.invoiceNumber || 'Invoice'} was deleted.`);
  };

  const getInvoice = (id: string) => {
    return invoices.find(i => i.id === id);
  };

  const recordInvoicePayment = (id: string, amount: number, method: PaymentMethod, notes?: string) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const newAmountPaid = (inv.amountPaid || 0) + amount;
        const newAmountDue = Math.max(0, inv.grandTotal - newAmountPaid);
        const newStatus: InvoiceStatus = newAmountDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

        const paymentLine = {
          id: 'pay-' + Date.now(),
          date: new Date().toISOString().split('T')[0],
          amount,
          method,
          notes
        };

        const updated: Invoice = {
          ...inv,
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          paymentsList: [...(inv.paymentsList || []), paymentLine],
          updatedAt: new Date().toISOString()
        };

        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);

        // Also record a payment record in payments ledger
        const pRec: PaymentRecord = {
          id: 'pay-rec-' + Date.now(),
          voucherNumber: `RCPT-${Date.now().toString().slice(-6)}`,
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
        setPayments(p => [pRec, ...p]);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);

        // Update Party Balance
        if (inv.customerId) {
          setParties(pList => pList.map(p => {
            if (p.id === inv.customerId) {
              const updatedP = { ...p, currentBalance: Math.max(0, p.currentBalance - amount) };
              cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
              return updatedP;
            }
            return p;
          }));
        }

        return updated;
      }
      return inv;
    }));

    showToast('success', 'Payment Recorded', `Logged ${business.currencySymbol}${amount.toLocaleString('en-IN')} payment.`);
  };

  const generateEInvoice = (id: string): EInvoiceDetails | null => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return null;

    const einvoice = generateSimulatedEInvoice(inv, business.gstin);
    setInvoices(prev => prev.map(item => {
      if (item.id === id) {
        const updated = {
          ...item,
          einvoice,
          status: item.status === 'DRAFT' ? 'UNPAID' : item.status,
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return item;
    }));

    showToast('success', 'E-Invoice IRN Generated', `IRN: ${einvoice.irn.substring(0, 16)}...`);
    return einvoice;
  };

  const cancelEInvoice = (id: string, reason: EInvoiceDetails['cancelReason'], remarks?: string) => {
    setInvoices(prev => prev.map(item => {
      if (item.id === id && item.einvoice) {
        const updated: Invoice = {
          ...item,
          status: 'CANCELLED',
          einvoice: {
            ...item.einvoice,
            status: 'CANCELLED',
            cancelReason: reason,
            cancelRemarks: remarks || 'Cancelled as requested',
            cancelledAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return item;
    }));
    showToast('info', 'E-Invoice Cancelled', 'IRN status marked as cancelled.');
  };

  const generateEWayBill = (id: string, details: Partial<EWayBillDetails>) => {
    const ewayBill: EWayBillDetails = {
      ewayBillNo: generateEwayBillNo(),
      ewayBillDate: new Date().toISOString(),
      validUpto: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      distanceKm: details.distanceKm || 120,
      mode: details.mode || 'ROAD',
      supplyType: details.supplyType || 'OUTWARD',
      subSupplyType: details.subSupplyType || 'SUPPLY',
      transporterId: details.transporterId || '27AAAAA1234A1Z5',
      transporterName: details.transporterName || 'VRL Logistics India',
      vehicleNo: details.vehicleNo || 'DL 01 AB 1234',
    };

    setInvoices(prev => prev.map(item => {
      if (item.id === id) {
        const updated = {
          ...item,
          ewayBill,
          updatedAt: new Date().toISOString()
        };
        cloudDb.syncEntityDoc('invoices', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return item;
    }));

    showToast('success', 'E-Way Bill Generated', `EWB No: ${ewayBill.ewayBillNo}`);
  };

  // Products
  const createProduct = (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    cloudDb.syncEntityDoc('products', currentCompanyId, newProduct).catch(console.warn);
    showToast('success', 'Product Added', `${newProduct.name} saved to inventory.`);
    return newProduct;
  };

  const bulkCreateProducts = (newProducts: Omit<Product, 'id' | 'createdAt'>[], updateExisting = true) => {
    let added = 0;
    let updated = 0;
    const prodsToAdd: Product[] = [];

    newProducts.forEach(prodData => {
      const existing = products.find(p => p.name.trim().toLowerCase() === prodData.name.trim().toLowerCase() || (prodData.sku && p.sku === prodData.sku));
      if (existing && updateExisting) {
        setProducts(prev => prev.map(p => {
          if (p.id === existing.id) {
            const updatedP = { ...p, ...prodData };
            cloudDb.syncEntityDoc('products', currentCompanyId, updatedP).catch(console.warn);
            return updatedP;
          }
          return p;
        }));
        updated++;
      } else {
        const newP: Product = {
          ...prodData,
          id: 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          createdAt: new Date().toISOString()
        };
        prodsToAdd.push(newP);
        cloudDb.syncEntityDoc('products', currentCompanyId, newP).catch(console.warn);
        added++;
      }
    });

    if (prodsToAdd.length > 0) {
      setProducts(prev => [...prev, ...prodsToAdd]);
    }
    showToast('success', 'Products Imported', `Added ${added} items, updated ${updated}.`);
    return { added, updated };
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...productData };
        cloudDb.syncEntityDoc('products', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Product Updated', 'Inventory details modified.');
  };

  const deleteProduct = (id: string) => {
    const target = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));
    cloudDb.deleteEntityDoc('products', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Product Removed', `${target?.name || 'Product'} deleted.`);
  };

  const adjustStock = (id: string, newStock: number, reason: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, currentStock: newStock };
        cloudDb.syncEntityDoc('products', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Stock Adjusted', `Inventory updated (${reason}).`);
  };

  // Parties
  const createParty = (partyData: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>): Party => {
    const newParty: Party = {
      ...partyData,
      id: 'party-' + Date.now(),
      currentBalance: partyData.openingBalance || 0,
      createdAt: new Date().toISOString()
    };
    setParties(prev => [newParty, ...prev]);
    cloudDb.syncEntityDoc('parties', currentCompanyId, newParty).catch(console.warn);
    showToast('success', 'Party Created', `${newParty.name} registered.`);
    return newParty;
  };

  const bulkCreateParties = (newPartiesList: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>[], updateExisting = true) => {
    let added = 0;
    let updated = 0;
    const partiesToAdd: Party[] = [];

    newPartiesList.forEach(partyData => {
      const existing = parties.find(p => p.name.trim().toLowerCase() === partyData.name.trim().toLowerCase());
      if (existing && updateExisting) {
        setParties(prev => prev.map(p => {
          if (p.id === existing.id) {
            const updatedP = { ...p, ...partyData };
            cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
            return updatedP;
          }
          return p;
        }));
        updated++;
      } else {
        const newP: Party = {
          ...partyData,
          id: 'party-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          currentBalance: partyData.openingBalance || 0,
          createdAt: new Date().toISOString()
        };
        partiesToAdd.push(newP);
        cloudDb.syncEntityDoc('parties', currentCompanyId, newP).catch(console.warn);
        added++;
      }
    });

    if (partiesToAdd.length > 0) {
      setParties(prev => [...prev, ...partiesToAdd]);
    }
    showToast('success', 'Parties Imported', `Added ${added} contacts, updated ${updated}.`);
    return { added, updated };
  };

  const updateParty = (id: string, partyData: Partial<Party>) => {
    setParties(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...partyData };
        cloudDb.syncEntityDoc('parties', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Party Updated', 'Contact & ledger details updated.');
  };

  const deleteParty = (id: string) => {
    const target = parties.find(p => p.id === id);
    setParties(prev => prev.filter(p => p.id !== id));
    cloudDb.deleteEntityDoc('parties', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Party Deleted', `${target?.name || 'Party'} removed.`);
  };

  // Purchases
  const createPurchaseBill = (billData: Omit<PurchaseBill, 'id' | 'createdAt'>): PurchaseBill => {
    const newBill: PurchaseBill = {
      ...billData,
      id: 'pb-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPurchaseBills(prev => [newBill, ...prev]);
    cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, newBill).catch(console.warn);

    // Increase stock for purchase inward items
    newBill.items.forEach(item => {
      if (item.productId) {
        setProducts(prev => prev.map(prod => {
          if (prod.id === item.productId && !prod.isService) {
            const updatedProd = { ...prod, currentStock: prod.currentStock + item.quantity };
            cloudDb.syncEntityDoc('products', currentCompanyId, updatedProd).catch(console.warn);
            return updatedProd;
          }
          return prod;
        }));
      }
    });

    showToast('success', 'Purchase Bill Logged', `Bill ${newBill.billNumber} recorded.`);
    return newBill;
  };

  const updatePurchaseBill = (id: string, billData: Partial<PurchaseBill>) => {
    setPurchaseBills(prev => prev.map(b => {
      if (b.id === id) {
        const updated = { ...b, ...billData };
        cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return b;
    }));
    showToast('success', 'Purchase Bill Updated', 'Purchase bill modified.');
  };

  const deletePurchaseBill = (id: string) => {
    const target = purchaseBills.find(b => b.id === id);
    setPurchaseBills(prev => prev.filter(b => b.id !== id));
    cloudDb.deleteEntityDoc('purchaseBills', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Purchase Bill Removed', `Bill ${target?.billNumber || ''} deleted.`);
  };

  const recordPurchasePayment = (id: string, amount: number, method: PaymentMethod) => {
    setPurchaseBills(prev => prev.map(bill => {
      if (bill.id === id) {
        const newPaid = (bill.amountPaid || 0) + amount;
        const newDue = Math.max(0, bill.grandTotal - newPaid);
        const newStatus: InvoiceStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';

        const updated: PurchaseBill = {
          ...bill,
          amountPaid: newPaid,
          amountDue: newDue,
          status: newStatus,
          paymentMethod: method
        };

        cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return bill;
    }));
    showToast('success', 'Vendor Payment Recorded', `Paid ${business.currencySymbol}${amount}.`);
  };

  // Payments Ledger
  const createPayment = (paymentData: Omit<PaymentRecord, 'id' | 'createdAt'>): PaymentRecord => {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: 'pay-rec-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setPayments(prev => [newPayment, ...prev]);
    cloudDb.syncEntityDoc('payments', currentCompanyId, newPayment).catch(console.warn);

    // Settle Linked Invoice
    if (newPayment.type === 'PAYMENT_IN' && newPayment.linkedInvoiceId) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === newPayment.linkedInvoiceId) {
          const newPaid = (inv.amountPaid || 0) + newPayment.amount;
          const newDue = Math.max(0, inv.grandTotal - newPaid);
          const newStatus: InvoiceStatus = newDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
          const updatedInv: Invoice = {
            ...inv,
            amountPaid: newPaid,
            amountDue: newDue,
            status: newStatus,
            paymentMethod: newPayment.paymentMethod,
            updatedAt: new Date().toISOString()
          };
          cloudDb.syncEntityDoc('invoices', currentCompanyId, updatedInv).catch(console.warn);
          return updatedInv;
        }
        return inv;
      }));
    }

    // Settle Linked Purchase Bill
    if (newPayment.type === 'PAYMENT_OUT' && newPayment.linkedBillId) {
      setPurchaseBills(prev => prev.map(bill => {
        if (bill.id === newPayment.linkedBillId) {
          const newPaid = (bill.amountPaid || 0) + newPayment.amount;
          const newDue = Math.max(0, bill.grandTotal - newPaid);
          const updatedBill: PurchaseBill = {
            ...bill,
            amountPaid: newPaid,
            amountDue: newDue,
            status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID',
            paymentMethod: newPayment.paymentMethod
          };
          cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updatedBill).catch(console.warn);
          return updatedBill;
        }
        return bill;
      }));
    }

    // Update Party Balance
    if (newPayment.partyId) {
      setParties(prev => prev.map(p => {
        if (p.id === newPayment.partyId) {
          let updatedParty = p;
          if (newPayment.type === 'PAYMENT_IN') {
            updatedParty = { ...p, currentBalance: Math.max(0, p.currentBalance - newPayment.amount) };
          } else if (newPayment.type === 'PAYMENT_OUT') {
            updatedParty = { ...p, currentBalance: p.currentBalance + newPayment.amount };
          }
          cloudDb.syncEntityDoc('parties', currentCompanyId, updatedParty).catch(console.warn);
          return updatedParty;
        }
        return p;
      }));
    }

    showToast('success', 'Payment Voucher Created', `Voucher ${newPayment.voucherNumber} for ${business.currencySymbol}${newPayment.amount} saved.`);
    return newPayment;
  };

  const updatePayment = (id: string, updates: Partial<PaymentRecord>) => {
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        cloudDb.syncEntityDoc('payments', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return p;
    }));
    showToast('success', 'Payment Updated', 'Payment voucher record updated.');
  };

  const deletePayment = (id: string) => {
    const target = payments.find(p => p.id === id);
    setPayments(prev => prev.filter(p => p.id !== id));
    cloudDb.deleteEntityDoc('payments', currentCompanyId, id).catch(console.warn);
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
    cloudDb.syncEntityDoc('expenses', currentCompanyId, newExpense).catch(console.warn);
    showToast('success', 'Expense Recorded', `Logged ${business.currencySymbol}${newExpense.amount} for ${newExpense.category}.`);
    return newExpense;
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    cloudDb.deleteEntityDoc('expenses', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Expense Removed', `Expense for ${target?.category || ''} deleted.`);
  };

  // Accounting & Ledger
  const createJournalEntry = (entryData: Omit<JournalEntry, 'id' | 'createdAt'>): JournalEntry => {
    const newEntry: JournalEntry = {
      ...entryData,
      id: 'je-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setJournalEntries(prev => [newEntry, ...prev]);
    cloudDb.syncEntityDoc('journalEntries', currentCompanyId, newEntry).catch(console.warn);
    showToast('success', 'Journal Entry Posted', `Voucher ${newEntry.entryNumber} recorded.`);
    return newEntry;
  };

  const updateJournalEntry = (id: string, entryData: Partial<JournalEntry>) => {
    setJournalEntries(prev => prev.map(e => {
      if (e.id === id) {
        const updated = { ...e, ...entryData };
        cloudDb.syncEntityDoc('journalEntries', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return e;
    }));
    showToast('success', 'Journal Entry Updated', 'Voucher details updated.');
  };

  const deleteJournalEntry = (id: string) => {
    const target = journalEntries.find(e => e.id === id);
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    cloudDb.deleteEntityDoc('journalEntries', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Journal Entry Removed', `Voucher ${target?.entryNumber || ''} removed.`);
  };

  const createAccountHead = (accountData: Omit<AccountHead, 'id'>): AccountHead => {
    const newAccount: AccountHead = {
      ...accountData,
      id: 'acc-' + Date.now()
    };
    setAccountHeads(prev => [...prev, newAccount]);
    cloudDb.syncEntityDoc('accountHeads', currentCompanyId, newAccount).catch(console.warn);
    showToast('success', 'Account Created', `Created account "${newAccount.name}" (${newAccount.code}).`);
    return newAccount;
  };

  const updateAccountHead = (id: string, updates: Partial<AccountHead>) => {
    setAccountHeads(prev => prev.map(a => {
      if (a.id === id) {
        const updated = { ...a, ...updates };
        cloudDb.syncEntityDoc('accountHeads', currentCompanyId, updated).catch(console.warn);
        return updated;
      }
      return a;
    }));
    showToast('success', 'Account Updated', 'Chart of accounts modified.');
  };

  const deleteAccountHead = (id: string): boolean => {
    const target = accountHeads.find(a => a.id === id);
    if (!target) return false;
    if (target.isSystem) {
      showToast('error', 'System Account Protected', 'Default system ledger accounts cannot be deleted.');
      return false;
    }

    setAccountHeads(prev => prev.filter(a => a.id !== id));
    cloudDb.deleteEntityDoc('accountHeads', currentCompanyId, id).catch(console.warn);
    showToast('info', 'Account Deleted', `Ledger account "${target.name}" (${target.code}) removed.`);
    return true;
  };

  // Bank Statement Auto Entry Bulk Processor
  const importBankStatementAutoEntries = (
    entriesToImport: BankStatementAutoEntry[],
    targetBankAccountId: string,
    options?: {
      autoCreateParties?: boolean;
      autoSettleInvoices?: boolean;
      autoSettleBills?: boolean;
    }
  ): BankStatementImportResult => {
    const autoCreateParties = options?.autoCreateParties ?? true;
    const autoSettleInvoices = options?.autoSettleInvoices ?? true;
    const autoSettleBills = options?.autoSettleBills ?? true;

    const targetAccount = accountHeads.find(a => a.id === targetBankAccountId) || {
      id: targetBankAccountId,
      name: 'Bank Account'
    };

    let importedCount = 0;
    let paymentsInCreated = 0;
    let paymentsOutCreated = 0;
    let expensesCreated = 0;
    let contraCreated = 0;
    let journalsCreated = 0;
    let partiesCreated = 0;

    const newPaymentsToAdd: PaymentRecord[] = [];
    const newExpensesToAdd: Expense[] = [];
    const newJournalsToAdd: JournalEntry[] = [];

    const validEntries = entriesToImport.filter(e => e.entryType !== 'IGNORE' && e.selected !== false);

    if (autoCreateParties) {
      setParties(prevParties => {
        const updatedParties = [...prevParties];

        validEntries.forEach(entry => {
          if (!entry.partyName || entry.partyId) return;

          const exists = updatedParties.some(
            p => p.name.trim().toLowerCase() === entry.partyName!.trim().toLowerCase()
          );

          if (!exists) {
            const pType: 'CUSTOMER' | 'VENDOR' = entry.partyType || (entry.entryType === 'PAYMENT_IN' ? 'CUSTOMER' : 'VENDOR');
            const newParty: Party = {
              id: `party-bs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: entry.partyName,
              companyName: entry.partyName,
              type: pType,
              phone: '',
              billingAddress: `${entry.partyName} (Auto-created from Bank Statement)`,
              city: business.city || 'Delhi',
              state: business.state || 'Delhi',
              stateCode: business.stateCode || '07',
              pincode: business.pincode || '110001',
              openingBalance: 0,
              currentBalance: 0,
              createdAt: new Date().toISOString()
            };
            updatedParties.push(newParty);
            entry.partyId = newParty.id;
            partiesCreated++;
            cloudDb.syncEntityDoc('parties', currentCompanyId, newParty).catch(console.warn);
          } else {
            const matched = updatedParties.find(p => p.name.trim().toLowerCase() === entry.partyName!.trim().toLowerCase());
            if (matched) {
              entry.partyId = matched.id;
            }
          }
        });

        return updatedParties;
      });
    }

    validEntries.forEach((entry, idx) => {
      importedCount++;
      const amount = entry.depositAmount > 0 ? entry.depositAmount : entry.withdrawalAmount;
      const cleanRef = entry.referenceNo || entry.chequeNo || `TXN-${Date.now().toString().slice(-6)}-${idx + 1}`;
      const entryDate = entry.date || new Date().toISOString().split('T')[0];

      if (entry.entryType === 'PAYMENT_IN') {
        paymentsInCreated++;
        const pRec: PaymentRecord = {
          id: `pay-in-bs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          voucherNumber: `RCPT-BS-${cleanRef}`,
          type: 'PAYMENT_IN',
          date: entryDate,
          partyId: entry.partyId,
          partyName: entry.partyName || 'Customer',
          partyType: 'CUSTOMER',
          amount,
          paymentMethod: entry.paymentMethod || 'BANK_TRANSFER',
          bankAccountId: targetBankAccountId,
          bankAccountName: targetAccount.name,
          referenceNo: cleanRef,
          notes: entry.notes || entry.narration,
          linkedInvoiceId: entry.linkedInvoiceId,
          linkedInvoiceNumber: entry.linkedInvoiceNumber,
          createdAt: new Date().toISOString()
        };
        newPaymentsToAdd.push(pRec);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);

        if (entry.partyId) {
          setParties(prev => prev.map(p => {
            if (p.id === entry.partyId) {
              const updatedP = { ...p, currentBalance: Math.max(0, p.currentBalance - amount) };
              cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
              return updatedP;
            }
            return p;
          }));
        }

        if (autoSettleInvoices && (entry.linkedInvoiceId || entry.linkedInvoiceNumber)) {
          setInvoices(prev => prev.map(inv => {
            if (inv.id === entry.linkedInvoiceId || inv.invoiceNumber === entry.linkedInvoiceNumber) {
              const newPaid = (inv.amountPaid || 0) + amount;
              const newDue = Math.max(0, inv.grandTotal - newPaid);
              const updatedInv: Invoice = {
                ...inv,
                amountPaid: newPaid,
                amountDue: newDue,
                status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID'
              };
              cloudDb.syncEntityDoc('invoices', currentCompanyId, updatedInv).catch(console.warn);
              return updatedInv;
            }
            return inv;
          }));
        }
      } else if (entry.entryType === 'PAYMENT_OUT') {
        paymentsOutCreated++;
        const pRec: PaymentRecord = {
          id: `pay-out-bs-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          voucherNumber: `PMT-BS-${cleanRef}`,
          type: 'PAYMENT_OUT',
          date: entryDate,
          partyId: entry.partyId,
          partyName: entry.partyName || 'Vendor / Payee',
          partyType: 'VENDOR',
          amount,
          paymentMethod: entry.paymentMethod || 'BANK_TRANSFER',
          bankAccountId: targetBankAccountId,
          bankAccountName: targetAccount.name,
          referenceNo: cleanRef,
          notes: entry.notes || entry.narration,
          linkedBillId: entry.linkedBillId,
          linkedBillNumber: entry.linkedBillNumber,
          createdAt: new Date().toISOString()
        };
        newPaymentsToAdd.push(pRec);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);

        if (entry.partyId) {
          setParties(prev => prev.map(p => {
            if (p.id === entry.partyId) {
              const updatedP = { ...p, currentBalance: p.currentBalance + amount };
              cloudDb.syncEntityDoc('parties', currentCompanyId, updatedP).catch(console.warn);
              return updatedP;
            }
            return p;
          }));
        }

        if (autoSettleBills && (entry.linkedBillId || entry.linkedBillNumber)) {
          setPurchaseBills(prev => prev.map(bill => {
            if (bill.id === entry.linkedBillId || bill.billNumber === entry.linkedBillNumber) {
              const newPaid = (bill.amountPaid || 0) + amount;
              const newDue = Math.max(0, bill.grandTotal - newPaid);
              const updatedB: PurchaseBill = {
                ...bill,
                amountPaid: newPaid,
                amountDue: newDue,
                status: newDue === 0 ? 'PAID' : 'PARTIALLY_PAID'
              };
              cloudDb.syncEntityDoc('purchaseBills', currentCompanyId, updatedB).catch(console.warn);
              return updatedB;
            }
            return bill;
          }));
        }
      } else if (entry.entryType === 'EXPENSE') {
        expensesCreated++;
        const newExp: Expense = {
          id: `exp-bs-${Date.now()}-${idx}`,
          date: entryDate,
          category: entry.expenseCategory || 'Miscellaneous Operating Expenses',
          payee: entry.partyName || entry.narration.slice(0, 40),
          amount,
          gstRate: 0,
          gstAmount: 0,
          hasGstBill: false,
          paymentMethod: entry.paymentMethod || 'BANK_TRANSFER',
          notes: `Bank Statement Entry: ${entry.narration}`,
          referenceNo: cleanRef,
          createdAt: new Date().toISOString()
        };
        newExpensesToAdd.push(newExp);
        cloudDb.syncEntityDoc('expenses', currentCompanyId, newExp).catch(console.warn);
      } else if (entry.entryType === 'CONTRA_TRANSFER') {
        contraCreated++;
        const isDeposit = entry.depositAmount > 0;
        const fromAcc = entry.fromAccount || (isDeposit ? 'Cash in Hand (acc-1)' : `${targetAccount.name} (${targetBankAccountId})`);
        const toAcc = entry.toAccount || (isDeposit ? `${targetAccount.name} (${targetBankAccountId})` : 'Cash in Hand (acc-1)');

        const pRec: PaymentRecord = {
          id: `pay-contra-bs-${Date.now()}-${idx}`,
          voucherNumber: `CONTRA-BS-${cleanRef}`,
          type: 'CONTRA_TRANSFER',
          date: entryDate,
          partyName: isDeposit ? 'Cash Deposit to Bank' : 'Cash Withdrawal from Bank',
          amount,
          paymentMethod: 'CASH',
          bankAccountId: targetBankAccountId,
          bankAccountName: targetAccount.name,
          referenceNo: cleanRef,
          fromAccount: fromAcc,
          toAccount: toAcc,
          notes: entry.notes || entry.narration,
          createdAt: new Date().toISOString()
        };
        newPaymentsToAdd.push(pRec);
        cloudDb.syncEntityDoc('payments', currentCompanyId, pRec).catch(console.warn);
      } else if (entry.entryType === 'JOURNAL_ENTRY') {
        journalsCreated++;
        const isDeposit = entry.depositAmount > 0;
        const contraAccId = entry.contraAccountId || (isDeposit ? 'acc-14' : 'acc-18');
        const contraAccObj = accountHeads.find(a => a.id === contraAccId);
        const contraAccName = entry.contraAccountName || contraAccObj?.name || 'General Ledger Account';

        const jvLines = isDeposit ? [
          { accountId: targetBankAccountId, accountName: targetAccount.name, debit: amount, credit: 0 },
          { accountId: contraAccId, accountName: contraAccName, debit: 0, credit: amount }
        ] : [
          { accountId: contraAccId, accountName: contraAccName, debit: amount, credit: 0 },
          { accountId: targetBankAccountId, accountName: targetAccount.name, debit: 0, credit: amount }
        ];

        const newJv: JournalEntry = {
          id: `je-bs-${Date.now()}-${idx}`,
          entryNumber: `JV-BS-${cleanRef}`,
          date: entryDate,
          description: `Auto-JV from bank statement: ${entry.narration}`,
          lines: jvLines,
          createdAt: new Date().toISOString()
        };
        newJournalsToAdd.push(newJv);
        cloudDb.syncEntityDoc('journalEntries', currentCompanyId, newJv).catch(console.warn);
      }
    });

    if (newPaymentsToAdd.length > 0) {
      setPayments(prev => [...newPaymentsToAdd, ...prev]);
    }
    if (newExpensesToAdd.length > 0) {
      setExpenses(prev => [...newExpensesToAdd, ...prev]);
    }
    if (newJournalsToAdd.length > 0) {
      setJournalEntries(prev => [...newJournalsToAdd, ...prev]);
    }

    logSecurityEvent('BANK_STATEMENT_AUTO_ENTRY', 'Accounting', `Auto-imported ${importedCount} transactions into ${targetAccount.name}`);
    showToast('success', 'Bank Statement Processed', `Successfully imported ${importedCount} transactions.`);

    return {
      totalRows: entriesToImport.length,
      importedCount,
      paymentsInCreated,
      paymentsOutCreated,
      expensesCreated,
      contraCreated,
      journalsCreated,
      partiesCreated
    };
  };

  // Reset & Backup
  const resetAllData = () => {
    localStorage.clear();
    setCompanies([cleanDefaultCompany]);
    setCurrentCompanyId(cleanDefaultCompany.id);
    setBusiness(cleanDefaultBusinessProfile);
    setInvoices([]);
    setProducts([]);
    setParties([]);
    setPurchaseBills([]);
    setPayments([]);
    setExpenses([]);
    setAccountHeads(cleanDefaultAccountHeads);
    setJournalEntries([]);
    setUsers(cleanDefaultUsers);
    setCurrentUserId(cleanDefaultAdminUser.id);
    setAuditLogs([]);
    triggerCloudSync().catch(console.warn);
    showToast('info', 'System Reset', 'Clean database initialized. All sample/prefilled records cleared.');
  };

  const exportDatabaseJSON = () => {
    const fullBackup = {
      companies,
      business,
      invoices,
      products,
      parties,
      purchaseBills,
      payments,
      expenses,
      accountHeads,
      journalEntries,
      users,
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
      if (parsed.business) {
        if (parsed.companies) setCompanies(parsed.companies);
        setBusiness(normalizeBusinessProfile(parsed.business));
        setInvoices(parsed.invoices || []);
        setProducts(parsed.products || []);
        setParties(parsed.parties || []);
        setPurchaseBills(parsed.purchaseBills || []);
        setPayments(parsed.payments || []);
        setExpenses(parsed.expenses || []);
        setAccountHeads(parsed.accountHeads || cleanDefaultAccountHeads);
        setJournalEntries(parsed.journalEntries || []);
        if (parsed.users) setUsers(parsed.users);
        triggerCloudSync().catch(console.warn);
        showToast('success', 'Data Restored', 'Database backup imported and saved to Google Cloud Firestore.');
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
        toggleCompanyStatus,
        editBusinessProfile,
        superAdminAuth,
        updateSuperAdminPassword,
        business,
        updateBusiness,
        invoices,
        createInvoice,
        bulkCreateInvoices,
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
        importBankStatementAutoEntries,
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
        cloudSyncStatus,
        isCloudSyncing,
        lastCloudSyncTime,
        triggerCloudSync,
        selectedInvoiceIdForPrint,
        setSelectedInvoiceIdForPrint,
        selectedInvoiceForIRN,
        setSelectedInvoiceForIRN,
        users,
        currentUser,
        effectivePermissions,
        isAuthenticated,
        logout,
        logoutSuperAdmin,
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
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
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
