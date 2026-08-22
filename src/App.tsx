import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { ToastContainer } from './components/common/ToastContainer';
import { QuickSearchModal } from './components/common/QuickSearchModal';

// Main Views
import { DashboardView } from './components/dashboard/DashboardView';
import { InvoiceListView } from './components/invoices/InvoiceListView';
import { InvoiceEditor } from './components/invoices/InvoiceEditor';
import { InvoicePrintView } from './components/invoices/InvoicePrintView';
import { PosBillingView } from './components/invoices/PosBillingView';
import { InventoryView } from './components/inventory/InventoryView';
import { PartiesView } from './components/parties/PartiesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { PaymentsView } from './components/payments/PaymentsView';
import { AccountingView } from './components/accounting/AccountingView';
import { GstReturnsView } from './components/reports/GstReturnsView';
import { SettingsView } from './components/settings/SettingsView';
import { UsersAndRolesView } from './components/auth/UsersAndRolesView';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { AccessRestricted } from './components/auth/AccessRestricted';
import { UserAuthModal } from './components/auth/UserAuthModal';
import { LockScreenOverlay } from './components/auth/LockScreenOverlay';
import { LoginScreen } from './components/auth/LoginScreen';
import { Invoice, Product } from './types';
import { calculateItemGst } from './utils/gstCalculations';

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: 'blur(2px)' },
  animate: { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0px)',
    transition: { 
      duration: 0.24, 
      ease: [0.22, 1, 0.36, 1] 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -8, 
    filter: 'blur(2px)',
    transition: { 
      duration: 0.16, 
      ease: [0.32, 0, 0.67, 0] 
    } 
  }
};

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    selectedInvoiceIdForPrint, 
    setSelectedInvoiceIdForPrint,
    can,
    currentUser,
    isAuthenticated
  } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingInvoiceData, setEditingInvoiceData] = useState<Partial<Invoice> | undefined>(undefined);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K => Quick Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }
      // Escape => close editor or modal
      if (e.key === 'Escape') {
        if (selectedInvoiceIdForPrint) {
          setSelectedInvoiceIdForPrint(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedInvoiceIdForPrint, setSelectedInvoiceIdForPrint]);

  // Mandate Login Screen when user is not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen />
        <ToastContainer />
      </>
    );
  }

  const handleOpenNewInvoice = () => {
    setEditingInvoiceData(undefined);
    setIsEditorOpen(true);
  };

  const handleOpenNewInvoiceWithItem = (product: Product) => {
    const isInter = false;
    const calcs = calculateItemGst(product.sellingPrice, 1, 0, product.gstRate, isInter);
    setEditingInvoiceData({
      items: [
        {
          id: 'item-' + Date.now(),
          productId: product.id,
          name: product.name,
          hsnCode: product.hsnCode,
          quantity: 1,
          unit: product.unit,
          ...calcs
        }
      ]
    });
    setIsEditorOpen(true);
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceData(inv);
    setIsEditorOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-6">
        <Header 
          onOpenNewInvoice={handleOpenNewInvoice}
          onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            {/* If Print view is active, show the printable document overlay */}
            {selectedInvoiceIdForPrint ? (
              <motion.div
                key="print-view"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <InvoicePrintView
                  invoiceId={selectedInvoiceIdForPrint}
                  onBack={() => setSelectedInvoiceIdForPrint(null)}
                  onEdit={(inv) => {
                    setSelectedInvoiceIdForPrint(null);
                    handleEditInvoice(inv);
                  }}
                />
              </motion.div>
            ) : isEditorOpen ? (
              /* If creating / editing invoice */
              <motion.div
                key="editor-view"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <InvoiceEditor
                  initialData={editingInvoiceData}
                  onClose={() => setIsEditorOpen(false)}
                />
              </motion.div>
            ) : (
              /* Render Current View Tab with RBAC Protection */
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                {activeTab === 'dashboard' && (
                  <DashboardView 
                    onOpenNewInvoice={handleOpenNewInvoice}
                    onEditInvoice={handleEditInvoice}
                  />
                )}
                {activeTab === 'invoices' && (
                  can('invoices', 'view') ? (
                    <InvoiceListView
                      onOpenNewInvoice={handleOpenNewInvoice}
                      onEditInvoice={handleEditInvoice}
                    />
                  ) : (
                    <AccessRestricted moduleName="Invoices & Billing" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'payments' && (
                  can('payments', 'view') ? (
                    <PaymentsView />
                  ) : (
                    <AccessRestricted moduleName="Payments & Receipts" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'pos_billing' && (
                  can('pos_billing', 'view') ? (
                    <PosBillingView />
                  ) : (
                    <AccessRestricted moduleName="POS Counter Billing" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON']} />
                  )
                )}
                {activeTab === 'inventory' && (
                  can('inventory', 'view') ? (
                    <InventoryView onOpenNewInvoiceWithItem={handleOpenNewInvoiceWithItem} />
                  ) : (
                    <AccessRestricted moduleName="Inventory & Stock" allowedRoles={['ADMIN', 'ACCOUNTANT', 'INVENTORY_MANAGER']} />
                  )
                )}
                {activeTab === 'parties' && (
                  (can('parties', 'viewCustomers') || can('parties', 'viewVendors')) ? (
                    <PartiesView />
                  ) : (
                    <AccessRestricted moduleName="Customers & Vendors Directory" allowedRoles={['ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'INVENTORY_MANAGER']} />
                  )
                )}
                {activeTab === 'purchases' && (
                  can('purchases', 'view') ? (
                    <PurchasesView />
                  ) : (
                    <AccessRestricted moduleName="Purchases & Vendor Bills" allowedRoles={['ADMIN', 'ACCOUNTANT', 'INVENTORY_MANAGER']} />
                  )
                )}
                {activeTab === 'accounting' && (
                  can('accounting', 'viewJournals') ? (
                    <AccountingView />
                  ) : (
                    <AccessRestricted moduleName="Accounting & Financial Statements" allowedRoles={['ADMIN', 'ACCOUNTANT', 'AUDITOR']} />
                  )
                )}
                {activeTab === 'gst_returns' && (
                  can('gst_returns', 'view') ? (
                    <GstReturnsView />
                  ) : (
                    <AccessRestricted moduleName="GST Returns & Tax Registers" allowedRoles={['ADMIN', 'ACCOUNTANT', 'AUDITOR']} />
                  )
                )}
                {activeTab === 'users' && <UsersAndRolesView />}
                {activeTab === 'super_admin_dashboard' && (
                  currentUser.role === 'SUPER_ADMIN' ? (
                    <SuperAdminDashboard />
                  ) : (
                    <AccessRestricted moduleName="Super Admin Master Governance" allowedRoles={['SUPER_ADMIN']} />
                  )
                )}
                {activeTab === 'settings' && (
                  can('settings', 'view') ? (
                    <SettingsView />
                  ) : (
                    <AccessRestricted moduleName="Settings & Company Profile" allowedRoles={['ADMIN']} />
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <MobileNav />

      {/* Universal Quick Search Modal */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        onSelectInvoice={(id) => setSelectedInvoiceIdForPrint(id)}
      />

      {/* User Role Authentication / Login Modal */}
      <UserAuthModal />

      {/* Screen Lock Overlay */}
      <LockScreenOverlay />

      {/* Global Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
