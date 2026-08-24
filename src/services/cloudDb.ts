import { db, collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch, query, where, onSnapshot } from './firebase';
import { 
  Company, 
  BusinessProfile, 
  Invoice, 
  Product, 
  Party, 
  PurchaseBill, 
  PaymentRecord, 
  Expense, 
  AccountHead, 
  JournalEntry, 
  AppUser, 
  SecurityAuditLog,
  SuperAdminAuthData,
  CustomHsnCode,
  ChequeRecord,
  ChequeBook,
  ChequeTemplateConfig
} from '../types';
import { normalizeBusinessProfile } from '../utils/cleanDefaults';

/**
 * Recursively removes undefined values, functions, and invalid values so Firestore setDoc / writeBatch succeeds cleanly without schema errors
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== 'function') {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return obj;
}

/**
 * Standard Standardized Chart of Accounts (COA) template for new clean companies
 */
export const defaultStandardAccountHeads: AccountHead[] = [
  { id: 'acc-1', code: '1000', name: 'Cash in Hand', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-2', code: '1010', name: 'Main Current Bank Account', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-3', code: '1020', name: 'Sundry Debtors (Accounts Receivable)', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-4', code: '1030', name: 'Stock in Trade (Inventory)', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-5', code: '1040', name: 'Input Tax Credit (ITC) CGST', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-6', code: '1050', name: 'Input Tax Credit (ITC) SGST', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-7', code: '1060', name: 'Input Tax Credit (ITC) IGST', category: 'ASSET', balance: 0, isSystem: true },
  { id: 'acc-8', code: '2000', name: 'Sundry Creditors (Accounts Payable)', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-9', code: '2010', name: 'Output Tax Liability CGST', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-10', code: '2020', name: 'Output Tax Liability SGST', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-11', code: '2030', name: 'Output Tax Liability IGST', category: 'LIABILITY', balance: 0, isSystem: true },
  { id: 'acc-12', code: '3000', name: 'Capital Account (Owner Equity)', category: 'EQUITY', balance: 0, isSystem: true },
  { id: 'acc-13', code: '3010', name: 'Retained Earnings', category: 'EQUITY', balance: 0, isSystem: true },
  { id: 'acc-14', code: '4000', name: 'Sales Revenue (Goods & Services)', category: 'INCOME', balance: 0, isSystem: true },
  { id: 'acc-15', code: '5000', name: 'Cost of Goods Sold (Purchases)', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-16', code: '5010', name: 'Rent & Office Expenses', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-17', code: '5020', name: 'Freight & Courier Outward', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-18', code: '5030', name: 'Utility & Electricity Expenses', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-19', code: '5040', name: 'Salaries & Staff Benefits', category: 'EXPENSE', balance: 0, isSystem: true },
  { id: 'acc-20', code: '5050', name: 'Bank Charges & Gateway Fees', category: 'EXPENSE', balance: 0, isSystem: true }
];

export interface CloudCompanyData {
  company: Company;
  business: BusinessProfile;
  invoices: Invoice[];
  products: Product[];
  parties: Party[];
  purchaseBills: PurchaseBill[];
  payments: PaymentRecord[];
  expenses: Expense[];
  accountHeads: AccountHead[];
  journalEntries: JournalEntry[];
  users: AppUser[];
  auditLogs: SecurityAuditLog[];
  customHsnCodes?: CustomHsnCode[];
  cheques?: ChequeRecord[];
  chequeBooks?: ChequeBook[];
  chequeTemplates?: ChequeTemplateConfig[];
}

class CloudDbService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { this.isOnline = true; });
      window.addEventListener('offline', () => { this.isOnline = false; });
    }
  }

  public checkOnline(): boolean {
    return this.isOnline;
  }

  // -------------------------------------------------------------
  // System State: Active Company Pointer & Super Admin Master Auth
  // -------------------------------------------------------------
  async getSystemState(): Promise<{ activeCompanyId?: string } | null> {
    try {
      const docRef = doc(db, 'systemState', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as { activeCompanyId?: string };
      }
    } catch (e) {
      console.warn('CloudDb: Failed reading system state from Firestore:', e);
    }
    return null;
  }

  async saveSystemState(state: { activeCompanyId: string }): Promise<void> {
    try {
      const docRef = doc(db, 'systemState', 'global');
      await setDoc(docRef, { ...state, lastSyncedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('CloudDb: Failed writing system state to Firestore:', e);
    }
  }

  async fetchSuperAdminAuth(): Promise<Partial<SuperAdminAuthData> | null> {
    try {
      const docRef = doc(db, 'systemState', 'superAdminAuth');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Partial<SuperAdminAuthData>;
      }
    } catch (e) {
      console.warn('CloudDb: Failed reading Super Admin auth from Firestore:', e);
    }
    return null;
  }

  async saveSuperAdminAuth(authData: Partial<SuperAdminAuthData>): Promise<void> {
    try {
      const docRef = doc(db, 'systemState', 'superAdminAuth');
      const cleanData = sanitizeForFirestore({ ...authData, updatedAt: new Date().toISOString() });
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.error('CloudDb: Failed saving Super Admin auth to Firestore:', e);
    }
  }

  // -------------------------------------------------------------
  // Companies Collection
  // -------------------------------------------------------------
  async fetchAllCompanies(): Promise<Company[]> {
    try {
      const collRef = collection(db, 'companies');
      const snap = await getDocs(collRef);
      const list: Company[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as Company);
      });
      return list;
    } catch (e) {
      console.warn('CloudDb: Failed fetching companies from Firestore:', e);
      return [];
    }
  }

  async saveCompany(company: Company): Promise<void> {
    try {
      const docRef = doc(db, 'companies', company.id);
      const cleanData = sanitizeForFirestore({ ...company, updatedAt: new Date().toISOString() });
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.warn('CloudDb: Note saving company to Firestore:', e);
    }
  }

  async deleteCompany(companyId: string): Promise<void> {
    try {
      const docRef = doc(db, 'companies', companyId);
      await deleteDoc(docRef);
      const busDocRef = doc(db, 'businessProfiles', companyId);
      await deleteDoc(busDocRef);

      // Clean up partitioned collection documents for this company
      const collectionsToClean = [
        'invoices',
        'products',
        'parties',
        'purchaseBills',
        'payments',
        'expenses',
        'accountHeads',
        'journalEntries',
        'users',
        'auditLogs',
        'customHsnCodes',
        'cheques',
        'chequeBooks',
        'chequeTemplates'
      ];

      for (const collName of collectionsToClean) {
        await this.clearCollection(collName, companyId);
      }
    } catch (e) {
      console.warn('CloudDb: Note deleting company:', e);
    }
  }

  // -------------------------------------------------------------
  // Business Profile for a Company
  // -------------------------------------------------------------
  async fetchBusinessProfile(companyId: string): Promise<BusinessProfile | null> {
    try {
      const docRef = doc(db, 'businessProfiles', companyId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return normalizeBusinessProfile(snap.data() as BusinessProfile);
      }
    } catch (e) {
      console.warn(`CloudDb: Error fetching business profile for ${companyId}:`, e);
    }
    return null;
  }

  async saveBusinessProfile(companyId: string, profile: BusinessProfile): Promise<void> {
    try {
      const docRef = doc(db, 'businessProfiles', companyId);
      const cleanData = sanitizeForFirestore({ ...profile, updatedAt: new Date().toISOString() });
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.warn('CloudDb: Note saving business profile:', e);
    }
  }

  // -------------------------------------------------------------
  // Company Data Partition Fetch & Batch Save
  // -------------------------------------------------------------
  async fetchCompanyDataPartition(companyId: string): Promise<CloudCompanyData | null> {
    try {
      const compDocRef = doc(db, 'companies', companyId);
      const compSnap = await getDoc(compDocRef);
      if (!compSnap.exists()) {
        return null;
      }
      const company = compSnap.data() as Company;

      const busDocRef = doc(db, 'businessProfiles', companyId);
      const busSnap = await getDoc(busDocRef);
      const rawBus = busSnap.exists() ? (busSnap.data() as BusinessProfile) : null;

      const businessData: BusinessProfile = rawBus ? {
        ...rawBus,
        headerConfig: rawBus.headerConfig || company.headerConfig,
        footerConfig: rawBus.footerConfig || company.footerConfig,
        lowStockSettings: rawBus.lowStockSettings || company.lowStockSettings,
        sessionTimeoutSettings: rawBus.sessionTimeoutSettings || company.sessionTimeoutSettings,
      } : ({
        name: company.name,
        tradeName: company.tradeName || company.name,
        gstin: company.gstin || 'UNREGISTERED',
        pan: company.pan || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || 'Delhi',
        stateCode: company.stateCode || '07',
        pincode: company.pincode || '',
        currency: company.currency || 'INR',
        currencySymbol: company.currencySymbol || '₹',
        bankName: 'HDFC Bank Ltd',
        accountNumber: '50200000000000',
        ifscCode: 'HDFC0000000',
        upiId: 'accounts@upi',
        invoicePrefix: company.invoicePrefix || '',
        nextInvoiceNumber: company.nextInvoiceNumber || 1,
        defaultTerms: '1. Goods once sold will not be returned.\n2. Payment due on invoice terms.',
        defaultNotes: 'Thank you for your business!',
        enableEinvoice: true,
        enableEwayBill: true,
        showSignatureOnInvoice: true,
        headerConfig: company.headerConfig,
        footerConfig: company.footerConfig,
        lowStockSettings: company.lowStockSettings,
        sessionTimeoutSettings: company.sessionTimeoutSettings,
      } as BusinessProfile);

      const business = normalizeBusinessProfile(businessData);

      // Fetch company sub-collections or partitioned documents
      const fetchList = async <T>(collName: string): Promise<T[]> => {
        try {
          const q = query(collection(db, collName), where('companyId', '==', companyId));
          const snap = await getDocs(q);
          const res: T[] = [];
          snap.forEach(d => res.push(d.data() as T));
          return res;
        } catch (err) {
          console.warn(`Error querying ${collName} for company ${companyId}:`, err);
          return [];
        }
      };

      const [
        invoices,
        products,
        parties,
        purchaseBills,
        payments,
        expenses,
        accountHeads,
        journalEntries,
        users,
        auditLogs,
        customHsnCodes,
        cheques,
        chequeBooks,
        chequeTemplates
      ] = await Promise.all([
        fetchList<Invoice>('invoices'),
        fetchList<Product>('products'),
        fetchList<Party>('parties'),
        fetchList<PurchaseBill>('purchaseBills'),
        fetchList<PaymentRecord>('payments'),
        fetchList<Expense>('expenses'),
        fetchList<AccountHead>('accountHeads'),
        fetchList<JournalEntry>('journalEntries'),
        fetchList<AppUser>('users'),
        fetchList<SecurityAuditLog>('auditLogs'),
        fetchList<CustomHsnCode>('customHsnCodes'),
        fetchList<ChequeRecord>('cheques'),
        fetchList<ChequeBook>('chequeBooks'),
        fetchList<ChequeTemplateConfig>('chequeTemplates')
      ]);

      return {
        company,
        business,
        invoices,
        products,
        parties,
        purchaseBills,
        payments,
        expenses,
        accountHeads: accountHeads.length > 0 ? accountHeads : defaultStandardAccountHeads,
        journalEntries,
        users,
        auditLogs,
        customHsnCodes,
        cheques,
        chequeBooks,
        chequeTemplates
      };
    } catch (e) {
      console.error(`CloudDb: Error fetching data partition for company ${companyId}:`, e);
      return null;
    }
  }

  // -------------------------------------------------------------
  // Real-time Cloud Syncer for an active Entity
  // -------------------------------------------------------------
  async syncEntityDoc<T extends { id: string }>(collectionName: string, companyId: string, item: T): Promise<void> {
    try {
      if (!item || !item.id || !companyId) return;
      const docRef = doc(db, collectionName, `${companyId}_${item.id}`);
      const cleanData = sanitizeForFirestore({ ...item, companyId, updatedAt: new Date().toISOString() });
      await setDoc(docRef, cleanData, { merge: true });
    } catch (e) {
      console.warn(`CloudDb: Note syncing ${collectionName}/${item.id}:`, e);
    }
  }

  async deleteEntityDoc(collectionName: string, companyId: string, itemId: string): Promise<void> {
    try {
      if (!itemId || !companyId) return;
      const docRef = doc(db, collectionName, `${companyId}_${itemId}`);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn(`CloudDb: Note deleting ${collectionName}/${itemId}:`, e);
    }
  }

  async clearCollection(collectionName: string, companyId: string): Promise<void> {
    try {
      const collRef = collection(db, collectionName);
      const q = query(collRef, where('companyId', '==', companyId));
      const snap = await getDocs(q);
      if (snap.empty) return;
      
      const BATCH_LIMIT = 450;
      for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = snap.docs.slice(i, i + BATCH_LIMIT);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn(`CloudDb: Note clearing collection ${collectionName} for company ${companyId}:`, e);
    }
  }

  async syncEntireCollection<T extends { id: string }>(collectionName: string, companyId: string, items: T[]): Promise<void> {
    try {
      if (!items || items.length === 0 || !companyId) return;
      const BATCH_LIMIT = 450;
      for (let i = 0; i < items.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + BATCH_LIMIT);
        for (const item of chunk) {
          const docRef = doc(db, collectionName, `${companyId}_${item.id}`);
          const cleanData = sanitizeForFirestore({ ...item, companyId, updatedAt: new Date().toISOString() });
          batch.set(docRef, cleanData, { merge: true });
        }
        await batch.commit();
      }
    } catch (e) {
      console.warn(`CloudDb: Note syncing entire collection ${collectionName}:`, e);
    }
  }
}

export const cloudDb = new CloudDbService();
export default cloudDb;

