import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceStatus, InvoiceType, PaymentMethod } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ClientStatementModal } from '../parties/ClientStatementModal';
import { ImportSaleInvoicesModal } from './ImportSaleInvoicesModal';
import { 
  Search, 
  Filter, 
  Plus, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Share2, 
  Trash2, 
  DollarSign, 
  Truck,
  ExternalLink,
  ChevronDown,
  AlertCircle,
  BookOpen,
  Package,
  Boxes,
  Edit3,
  Upload,
  FileSpreadsheet
} from 'lucide-react';

interface InvoiceListViewProps {
  onOpenNewInvoice: () => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({ onOpenNewInvoice, onEditInvoice }) => {
  const { 
    invoices, 
    parties,
    business, 
    setSelectedInvoiceIdForPrint, 
    recordInvoicePayment,
    deleteInvoice,
    showToast,
    setActiveTab
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  // Client Statement Modal State
  const [statementPartyId, setStatementPartyId] = useState<string | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Payment recording modal state
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const filteredInvoices = invoices.filter(inv => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q)) ||
      (inv.items && inv.items.some(item => 
        item.name.toLowerCase().includes(q) || 
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      ));

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inv.invoiceType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleOpenPayment = (inv: Invoice) => {
    setPaymentModalInvoice(inv);
    setPaymentAmount(inv.amountDue);
    setPaymentNotes(`Payment for ${inv.invoiceNumber}`);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    if (paymentAmount <= 0) {
      showToast('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
      return;
    }
    recordInvoicePayment(paymentModalInvoice.id, paymentAmount, paymentMethod, paymentNotes);
    setPaymentModalInvoice(null);
  };

  const handleShareWhatsApp = (inv: Invoice) => {
    const text = encodeURIComponent(
      `Hello ${inv.customerName},\nYour invoice ${inv.invoiceNumber} dated ${formatDate(inv.invoiceDate)} for ${formatCurrency(inv.grandTotal, business.currencySymbol)} is ready.\nDue amount: ${formatCurrency(inv.amountDue, business.currencySymbol)}.\nBank/UPI: ${business.upiId}\nThank you!\n- ${business.tradeName || business.name}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tax Invoices & Billing</h1>
          <p className="text-xs text-slate-500">Create, track, and manage GST compliant tax invoices & receipts</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Import historical and bulk sale invoices from CSV, Excel, or JSON"
          >
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import Sale Invoice</span>
          </button>
          <button
            onClick={() => {
              setStatementPartyId(parties[0]?.id || null);
              setIsStatementOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Generate and export client account statement"
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Account Statement</span>
          </button>
          <button
            onClick={() => setActiveTab('pos_billing')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <span>POS Quick Sale</span>
          </button>
          <button
            onClick={onOpenNewInvoice}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, customer name, GSTIN..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Types</option>
            <option value="TAX_INVOICE">Tax Invoice (GST)</option>
            <option value="BILL_OF_SUPPLY">Bill of Supply</option>
            <option value="POS_SALE">POS Sale</option>
            <option value="QUOTATION">Quotation / Estimate</option>
            <option value="CREDIT_NOTE">Credit Note</option>
          </select>
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3.5 px-4">Type & Number</th>
                <th className="py-3.5 px-4">Date & Due Date</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Products & Items</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">GST Total</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map(inv => {
                const isPaid = inv.status === 'PAID';
                const hasPendingPayment = (inv.amountDue || 0) > 0;
                const totalItemsCount = inv.items?.length || 0;
                const totalUnitsCount = inv.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

                return (
                  <tr key={inv.id} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                      <div className="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5 transition-colors">
                        <span>{inv.invoiceNumber}</span>
                      </div>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                        {inv.invoiceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                      <div className="text-slate-800 font-medium">{formatDate(inv.invoiceDate)}</div>
                      <div className="text-[10px] text-slate-400">Due: {formatDate(inv.dueDate)}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[180px] cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                      <div className="font-semibold text-slate-900 truncate">{inv.customerName}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {inv.customerGstin ? `GSTIN: ${inv.customerGstin}` : 'Retail / Unregistered'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        POS: {inv.placeOfSupplyState} ({inv.placeOfSupplyStateCode})
                      </div>
                    </td>
                    <td className="py-3.5 px-4 min-w-[200px] max-w-[280px] cursor-pointer" onClick={() => setSelectedInvoiceIdForPrint(inv.id)}>
                      {inv.items && inv.items.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-col gap-1">
                            {inv.items.slice(0, 2).map((item, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-100 hover:bg-indigo-50 border border-slate-200/90 rounded-lg text-[11px] transition-colors"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span className="font-semibold text-slate-900 truncate" title={item.name}>
                                    {item.name}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-100 text-[10px] shrink-0">
                                  {item.quantity} {item.unit || 'PCS'}
                                </span>
                              </div>
                            ))}
                          </div>
                          {inv.items.length > 2 && (
                            <div className="flex items-center justify-between text-[10px] pt-0.5">
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"
                                title={inv.items.slice(2).map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}
                              >
                                <Boxes className="w-3 h-3" />
                                +{inv.items.length - 2} more products
                              </span>
                              <span className="text-slate-400 font-medium">
                                Total: {totalUnitsCount} units
                              </span>
                            </div>
                          )}
                          {inv.items.length <= 2 && (
                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <span>{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                              <span>•</span>
                              <span>{totalUnitsCount} units</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No items attached</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatCurrency(inv.subTotalTaxable, business.currencySymbol)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      <div>{formatCurrency(inv.totalTax, business.currencySymbol)}</div>
                      <div className="text-[9px] text-slate-400">
                        {inv.isInterState ? 'IGST' : 'CGST+SGST'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="font-bold text-slate-900">
                        {formatCurrency(inv.grandTotal, business.currencySymbol)}
                      </div>
                      {hasPendingPayment && (
                        <div className="text-[10px] text-rose-600 font-semibold">
                          Due: {formatCurrency(inv.amountDue, business.currencySymbol)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditInvoice && (
                          <button
                            onClick={() => onEditInvoice(inv)}
                            title="Edit Invoice"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedInvoiceIdForPrint(inv.id)}
                          title="Print / View Invoice"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Print</span>
                        </button>

                        <button
                          onClick={() => {
                            setStatementPartyId(inv.customerId || parties[0]?.id || null);
                            setIsStatementOpen(true);
                          }}
                          title="Generate & View Client Statement"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {hasPendingPayment && (
                          <button
                            onClick={() => handleOpenPayment(inv)}
                            title="Record Payment"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleShareWhatsApp(inv)}
                          title="Share on WhatsApp"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          title="Delete Invoice"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No invoices match your search filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Record Customer Payment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Invoice {paymentModalInvoice.invoiceNumber} • Total: {formatCurrency(paymentModalInvoice.grandTotal, business.currencySymbol)}
            </p>

            <form onSubmit={handleSubmitPayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Received ({business.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentModalInvoice.amountDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Due Balance: {formatCurrency(paymentModalInvoice.amountDue, business.currencySymbol)}</span>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(paymentModalInvoice.amountDue)}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Pay Full Amount
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS / IMPS</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Notes / Reference ID
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. UTR #1882910 or Cheque #004821"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Statement of Account Modal */}
      {isStatementOpen && (
        <ClientStatementModal
          partyId={statementPartyId || undefined}
          onClose={() => {
            setIsStatementOpen(false);
            setStatementPartyId(null);
          }}
          onSelectInvoiceForPrint={setSelectedInvoiceIdForPrint}
        />
      )}

      {/* Import Sale Invoices Bulk Modal */}
      <ImportSaleInvoicesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
