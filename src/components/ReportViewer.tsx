import React, { useState } from 'react';
import { FormSubmission, SubmissionItem, Location, UploadedInvoice } from '../types';
import { sampleSubmissions, sampleItems, defaultLocations } from '../data/sampleData';
import { 
  Table, Download, FileSpreadsheet, FileText, BarChart3, AlertTriangle, 
  TrendingUp, Compass, Layers, CheckCircle, Scale, Printer, Clock, Coins, 
  Filter, ShieldCheck, ChevronRight, ArrowUpDown, RefreshCw, ShoppingCart,
  Receipt, PlusCircle, Edit2, Trash2, Plus, Trash, Check, X, ShieldAlert, Lock
} from 'lucide-react';

interface ReportViewerProps {
  simUser?: any;
  uploadedInvoices?: UploadedInvoice[];
  setUploadedInvoices?: React.Dispatch<React.SetStateAction<UploadedInvoice[]>>;
}

export default function ReportViewer({ simUser, uploadedInvoices = [], setUploadedInvoices }: ReportViewerProps = {}) {
  const [activeTab, setActiveTab] = useState<'history' | 'usage' | 'suggested' | 'variance' | 'catalog-print' | 'store-compare' | 'pmix' | 'usage-calc' | 'invoices'>('catalog-print');
  const [selectedLocation, setSelectedLocation] = useState<string>('AR');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState('');

  // 1. Catalog Print Filters State
  const [filterVendor, setFilterVendor] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStore, setFilterStore] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTime, setFilterTime] = useState<string>('');
  const [filterPriceMin, setFilterPriceMin] = useState<number>(0);
  const [filterPriceMax, setFilterPriceMax] = useState<number>(200);

  // 2. Store Comparison selections (Up to 10 Stores)
  const [comparedStores, setComparedStores] = useState<string[]>(['AR', 'CM', 'AS', 'BK']);

  // Mock items and categories / vendors extracted dynamically for filter options
  const uniqueVendors = Array.from(new Set(sampleItems.map(item => item.vendorName)));
  const uniqueCategories = Array.from(new Set(sampleItems.map(item => item.category)));

  // Filter items matching selected inputs
  const filteredCatalogItems = sampleItems.filter(item => {
    if (filterVendor && item.vendorName !== filterVendor) return false;
    if (filterCategory && item.category !== filterCategory) return false;
    
    // Price range calculation
    const priceRange = item.recentPurchasePrice || item.createdPrice || 24.50;
    if (priceRange < filterPriceMin || priceRange > filterPriceMax) return false;
    
    return true;
  });

  const submissions = sampleSubmissions.filter(s => s.locationCode === selectedLocation);

  // Invoices Filtering states
  const [invFilterVendor, setInvFilterVendor] = useState<string>('');
  const [invFilterStartDate, setInvFilterStartDate] = useState<string>('');
  const [invFilterEndDate, setInvFilterEndDate] = useState<string>('');
  const [invFilterCategory, setInvFilterCategory] = useState<string>('');
  const [invFilterMinPrice, setInvFilterMinPrice] = useState<number | ''>('');
  const [invFilterMaxPrice, setInvFilterMaxPrice] = useState<number | ''>('');
  const [invFilterStartTime, setInvFilterStartTime] = useState<string>('');
  const [invFilterEndTime, setInvFilterEndTime] = useState<string>('');

  // Invoice Manual Entry state variables
  const [isAddingInvoice, setIsAddingInvoice] = useState<boolean>(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [formVendor, setFormVendor] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState<string>(new Date().toTimeString().split(' ')[0].substring(0, 5));
  const [formStore, setFormStore] = useState<string>('AR');
  const [formCategory, setFormCategory] = useState<string>('Cooler');
  const [formItems, setFormItems] = useState<Array<{ name: string; quantity: number; price: number; packaging: string }>>([]);

  // Item fields within manual invoice form
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemUnit, setNewItemUnit] = useState<string>('cases');

  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const addFormItem = () => {
    if (!newItemName.trim()) {
      alert("Please specify a valid item designation name.");
      return;
    }
    setFormItems(prev => [
      ...prev,
      {
        name: newItemName.trim(),
        quantity: newItemQty || 1,
        price: newItemPrice || 0,
        packaging: newItemUnit || 'cases'
      }
    ]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemUnit('cases');
  };

  const removeFormItem = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  };

  const saveInvoiceForm = () => {
    if (!formVendor.trim()) {
      alert("Please specify a valid supplier vendor name.");
      return;
    }
    if (formItems.length === 0) {
      alert("Please add at least one line item before saving this invoice.");
      return;
    }

    const itemsCount = formItems.reduce((acc, cr) => acc + cr.quantity, 0);
    const totalPrice = formItems.reduce((acc, cr) => acc + (cr.price * cr.quantity), 0);

    if (editingInvoiceId) {
      if (setUploadedInvoices) {
        setUploadedInvoices(prev => prev.map(inv => inv.id === editingInvoiceId ? {
          ...inv,
          vendorName: formVendor.trim(),
          date: formDate,
          time: formTime,
          storeLocation: formStore,
          category: formCategory,
          itemsCount,
          totalPrice,
          items: formItems
        } : inv));
      }
      triggerToast(`Successfully modified details for invoice id: ${editingInvoiceId}`);
    } else {
      const newInvoice: UploadedInvoice = {
        id: `inv-manual-${Date.now()}`,
        vendorName: formVendor.trim(),
        date: formDate,
        time: formTime,
        storeLocation: formStore,
        category: formCategory,
        itemsCount,
        totalPrice,
        items: formItems
      };
      if (setUploadedInvoices) {
        setUploadedInvoices(prev => [newInvoice, ...prev]);
      }
      triggerToast(`Created new delivery profile for supplier: ${formVendor}`);
    }

    // Reset Form
    setIsAddingInvoice(false);
    setEditingInvoiceId(null);
    setFormVendor('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    setFormStore('AR');
    setFormCategory('Cooler');
    setFormItems([]);
  };

  const startEditInvoice = (inv: UploadedInvoice) => {
    setEditingInvoiceId(inv.id);
    setFormVendor(inv.vendorName);
    setFormDate(inv.date);
    setFormTime(inv.time);
    setFormStore(inv.storeLocation || 'AR');
    setFormCategory(inv.category);
    setFormItems(inv.items.map(it => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      packaging: it.packaging || 'cases'
    })));
    setIsAddingInvoice(true);
  };

  const deleteInvoiceAction = (id: string, name: string) => {
    if (confirm(`Are you sure you would like to permanently delete the invoice from ${name}?`)) {
      if (setUploadedInvoices) {
        setUploadedInvoices(prev => prev.filter(inv => inv.id !== id));
      }
      triggerToast(`Deleted invoice reference: ${id}`);
    }
  };

  const filteredInvoices = (uploadedInvoices || []).filter(inv => {
    // 1. Vendor check
    if (invFilterVendor && !inv.vendorName.toLowerCase().includes(invFilterVendor.toLowerCase())) return false;
    
    // 2. Category check
    if (invFilterCategory && inv.category !== invFilterCategory) return false;
    
    // 3. Date check
    if (invFilterStartDate && inv.date < invFilterStartDate) return false;
    if (invFilterEndDate && inv.date > invFilterEndDate) return false;

    // 4. Price range check
    if (invFilterMinPrice !== '' && inv.totalPrice < invFilterMinPrice) return false;
    if (invFilterMaxPrice !== '' && inv.totalPrice > invFilterMaxPrice) return false;

    // 5. Time range check
    if (invFilterStartTime && inv.time < invFilterStartTime) return false;
    if (invFilterEndTime && inv.time > invFilterEndTime) return false;

    return true;
  });

  const triggerInvoicesPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to open the printable preview sheet.");
      return;
    }

    const compiledHtml = `
      <html>
        <head>
          <title>Commissary System - Culinary Invoices Procurement Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 5px; }
            .meta { font-size: 11px; color: #64748b; font-family: monospace; margin-bottom: 25px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; text-align: left; }
            th { font-size: 10px; text-transform: uppercase; color: #475569; padding: 10px; border-bottom: 2px solid #cbd5e1; font-weight: bold; background: #f8fafc; }
            td { font-size: 11px; padding: 12px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
            .total-row { font-weight: bold; font-family: monospace; background: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; font-size: 9px; text-transform: uppercase; border-radius: 4px; font-weight: bold; border: 1px solid #e2e8f0; background: #f1f5f9; }
            .grand-box { margin-top: 30px; text-align: right; font-size: 14px; font-weight: bold; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <h1>Operational Invoicing Summary Report</h1>
          <div class="meta">
            <span>Report Date: ${new Date().toLocaleDateString()} @ ${new Date().toLocaleTimeString()}</span>
            <span>Requested By: ${simUser?.name || 'Authorized Admin'} (${simUser?.role || 'Authority'})</span>
          </div>
          <p style="font-size: 11px; color: #64748b;">Filtering: ${invFilterVendor ? `Vendor: "${invFilterVendor}" ` : ''}${invFilterCategory ? `Category: "${invFilterCategory}" ` : ''}${invFilterStartDate ? `From: ${invFilterStartDate} ` : ''}${invFilterEndDate ? `To: ${invFilterEndDate}` : ''}</p>
          
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Vendor Supplier</th>
                <th>Category</th>
                <th>Store Code</th>
                <th>Purchased Items</th>
                <th>Receipt Date</th>
                <th>Receipt Time</th>
                <th>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInvoices.map(inv => `
                <tr>
                  <td style="font-family: monospace;">${inv.id}</td>
                  <td><strong>${inv.vendorName}</strong></td>
                  <td><span class="badge">${inv.category}</span></td>
                  <td style="font-family: monospace;">${inv.storeLocation || 'N/A'}</td>
                  <td>${inv.itemsCount} products</td>
                  <td>${inv.date}</td>
                  <td>${inv.time}</td>
                  <td style="font-family: monospace; font-weight: bold;">$${inv.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">Grand Filtering Matched Aggregations:</td>
                <td>${filteredInvoices.reduce((a, b) => a + b.itemsCount, 0)} quantities</td>
                <td colspan="2"></td>
                <td>$${filteredInvoices.reduce((a, b) => a + b.totalPrice, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="grand-box">
            Total Operational Outlay: $${filteredInvoices.reduce((a, b) => a + b.totalPrice, 0).toFixed(2)} USD
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(compiledHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Toggle store code selection for comparison card (constraint: max 10 stores)
  const handleToggleCompareStore = (code: string) => {
    if (comparedStores.includes(code)) {
      setComparedStores(comparedStores.filter(c => c !== code));
    } else {
      if (comparedStores.length >= 10) {
        setDownloadSuccessMsg("⚠️ Standard retail policy limits side-by-side matrices to up to 10 stores for visual clarity.");
        setTimeout(() => setDownloadSuccessMsg(''), 4000);
        return;
      }
      setComparedStores([...comparedStores, code]);
    }
  };

  // Printable print command
  const triggerNativePrint = () => {
    const printContent = document.getElementById('printable-report-area');
    if (!printContent) return;
    
    // Open a beautifully styled print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to open the printable preview sheet.");
      return;
    }

    const compiledHtml = `
      <html>
        <head>
          <title>Commissary System - Culinary Audit Catalog Spec Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            h1 { font-size: 22px; font-weight: 800; margin-bottom: 5px; text-transform: uppercase; letter-spacing: -0.5px; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 30px; font-family: monospace; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background: #f8fafc; text-align: left; padding: 10px; font-weight: bold; border-bottom: 1.5px solid #cbd5e1; font-family: monospace; text-transform: uppercase; }
            td { padding: 10px; border-bottom: 1.5px solid #f1f5f9; }
            .badge { background: #f1f5f9; padding: 3px 6px; rounded: 4px; font-family: monospace; font-size: 9px; font-weight: bold; border: 1px solid #e2e8f0; }
            .price { font-weight: bold; font-family: monospace; color: #15803d; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 50px; border-top: 1px dashed #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>Inventory Catalog Master Specification Audit Sheet</h1>
          <div class="meta">
            <div>GENERATED: ${new Date().toLocaleString()}</div>
            <div>STORES SELECTED: ${filterStore || 'All Available Outlets'} | SHIFT TIME: ${filterTime || 'All Day'}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Item Title</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Measure System & Weight/Volume</th>
                <th>Par level</th>
                <th>Estimated Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCatalogItems.map(item => `
                <tr>
                  <td><strong>${item.itemCode || item.id}</strong></td>
                  <td>${item.name}</td>
                  <td><span class="badge">${item.category}</span></td>
                  <td>${item.vendorName}</td>
                  <td>
                    ${item.measurementType === 'weight' ? `⚖️ Weight: ${item.weightOrVolumeValue} ${item.weightUnit || 'lbs'}` : ''}
                    ${item.measurementType === 'liquid' ? `💧 Liquid: ${item.weightOrVolumeValue} ${item.liquidUnit || 'gal'}` : ''}
                    ${(!item.measurementType || item.measurementType === 'discrete') ? `📦 Standard (${item.unitOfMeasurement})` : ''}
                  </td>
                  <td>${item.defaultParLevel} ${item.unitOfMeasurement}</td>
                  <td class="price">$${(item.recentPurchasePrice || item.createdPrice || 24.50).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Food Safety & Procurement Intelligence Agency System. Printed from Cloud Native Terminal. Verified and Secure.
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(compiledHtml);
    printWindow.document.close();
  };

  // Download simulation mechanics
  const triggerDownload = (format: 'CSV' | 'Excel' | 'PDF', reportType: string) => {
    let filename = `Commissary_${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0,10)}`;
    let textContent = '';

    if (format === 'CSV') {
      textContent = "Item ID,Item Name,Category,Unit,Current Count,Par Level,Suggested Order,Final Order\n";
      sampleItems.forEach(item => {
        textContent += `${item.id},"${item.name}",${item.category},${item.unitOfMeasurement},3,${item.defaultParLevel},${Math.max(0, item.defaultParLevel - 3)},${Math.max(0, item.defaultParLevel - 3)}\n`;
      });
      const blob = new Blob([textContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
    } else if (format === 'Excel') {
      textContent = "ID\tName\tCategory\tUnit\tCurrent\tPar\tSuggested\tFinal\n";
      sampleItems.forEach(item => {
        textContent += `${item.id}\t${item.name}\t${item.category}\t${item.unitOfMeasurement}\t3\t${item.defaultParLevel}\t${Math.max(0, item.defaultParLevel - 3)}\t${Math.max(0, item.defaultParLevel - 3)}\n`;
      });
      const blob = new Blob([textContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xls`;
      a.click();
    } else {
      // PDF Mock
      setDownloadSuccessMsg("Triggering Native PDF engine generator... PDF report processed & downloaded.");
      setTimeout(() => setDownloadSuccessMsg(''), 4000);
      return;
    }

    setDownloadSuccessMsg(`Successfully generated and downloaded ${filename}.${format === 'CSV' ? 'csv' : 'xls'}`);
    setTimeout(() => setDownloadSuccessMsg(''), 4500);
  };

  return (
    <div className="bg-white text-gray-800 border border-gray-100 shadow-md rounded-2xl p-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 mb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
            <BarChart3 className="w-5.5 h-5.5 text-amber-500 shrink-0" />
            Culinary Procurement & Analytics Terminal
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Automated PMIX menus, side-by-side store comparative matrix, usage calculators, and vendor catalog printing</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 font-mono">Store Context:</label>
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="text-xs font-bold font-mono bg-slate-100 border border-slate-200 rounded-lg p-2 rounded-lg text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer text-[11px]"
          >
            {defaultLocations.map(l => (
              <option key={l.code} value={l.code}>{l.code} - {l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {downloadSuccessMsg && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-xl flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 animate-pulse" />
          <p className="font-bold">{downloadSuccessMsg}</p>
        </div>
      )}

      {/* Primary Report Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3.5 mb-5">
        <button
          onClick={() => setActiveTab('catalog-print')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'catalog-print' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Print Catalog Master ({filteredCatalogItems.length})
        </button>

        <button
          onClick={() => setActiveTab('store-compare')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'store-compare' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Store Comparison Matrix
        </button>

        <button
          onClick={() => setActiveTab('pmix')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'pmix' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          PMIX Report
        </button>

        <button
          onClick={() => setActiveTab('usage-calc')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'usage-calc' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          USAGE Report (Calculate Waste)
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Audit Trail Log History
        </button>

        <button
          onClick={() => setActiveTab('suggested')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'suggested' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Suggested Purchases
        </button>

        <button
          onClick={() => setActiveTab('variance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'variance' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Physical Stock Variance
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
            activeTab === 'invoices' 
              ? 'bg-amber-500 text-slate-950 shadow-md active:scale-95' 
              : 'bg-slate-50 text-gray-600 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Uploaded Invoices ({filteredInvoices.length})
        </button>
      </div>

      {/* Export Format Actions Header block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500">
        <span className="font-mono flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Export current data matrices strictly with secure backups:</span>
        <div className="flex gap-1.5 font-mono">
          <button 
            type="button"
            onClick={() => triggerDownload('CSV', activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10.5px] font-bold transition shadow-sm"
          >
            <Download className="w-3 h-3 text-slate-500" /> CSV Excel-lite
          </button>
          <button 
            type="button"
            onClick={() => triggerDownload('Excel', activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10.5px] font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-600 animate-pulse" /> Excel Spreadsheet
          </button>
          <button 
            type="button"
            onClick={() => triggerDownload('PDF', activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 rounded-lg text-[10.5px] font-serif font-black transition shadow-sm"
          >
            <FileText className="w-3 h-3 text-red-600" /> Android PDF
          </button>
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. PRINT CATALOG MASTER SHEET WITH FILTERS */}
      {activeTab === 'catalog-print' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Filters Dashboard Grid */}
          <div className="bg-slate-100 p-4 border border-slate-200 rounded-2xl space-y-3.5">
            <span className="flex items-center gap-1 text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest leading-none">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> Configure Procurement Filters to Print / Query
            </span>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase">Vendor</label>
                <select 
                  value={filterVendor}
                  onChange={(e) => setFilterVendor(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] text-slate-700 outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="">-- All Vendors --</option>
                  {uniqueVendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase">Category</label>
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] text-slate-700 outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="">-- All Categories --</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase">Store (Outlet)</label>
                <select 
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] text-slate-700 outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="">-- All Stores --</option>
                  {defaultLocations.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase">Date Selected</label>
                <input 
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] text-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase">Time Shift Slot</label>
                <select 
                  value={filterTime}
                  onChange={(e) => setFilterTime(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] text-slate-700 outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="">-- All Day --</option>
                  <option value="morning">Morning Shift (06:00 - 12:00)</option>
                  <option value="afternoon">Afternoon Shift (12:00 - 18:00)</option>
                  <option value="night">Graveyard Shift (18:00 - Midnight)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase">Price Range</label>
                <div className="bg-white px-2 py-1 border rounded-lg flex items-center justify-between font-mono text-[10px] text-emerald-800 font-black">
                  <span>${filterPriceMin}</span>
                  <span>to</span>
                  <span>${filterPriceMax}</span>
                </div>
              </div>
            </div>

            {/* Price Sliders Mini Interface */}
            <div className="grid grid-cols-2 gap-4 pt-1.5">
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className="font-mono text-slate-500 uppercase text-[9px] font-extrabold">Min Price:</span>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-slate-300 rounded"
                />
              </div>
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className="font-mono text-slate-500 uppercase text-[9px] font-extrabold">Max Price:</span>
                <input 
                  type="range"
                  min="100"
                  max="500"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-slate-300 rounded"
                />
              </div>
            </div>
          </div>

          {/* Table list to print */}
          <div id="printable-report-area" className="border border-slate-200.rounded-2xl overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Printer className="w-4 h-4 text-amber-500 animate-pulse" /> Printable Inventory Specifications
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Found {filteredCatalogItems.length} cataloged ingredients matching procurement metrics</p>
              </div>

              <button
                type="button"
                onClick={triggerNativePrint}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase transition flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                Print This Active Report
              </button>
            </div>

            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[9.5px] font-black">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-3">Item Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Vendor</th>
                    <th className="py-3 px-3">Measure Type</th>
                    <th className="py-3 px-3 text-center">Standard Par</th>
                    <th className="py-3 px-4 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredCatalogItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        {item.itemCode || item.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <img 
                            referrerPolicy="no-referrer"
                            src={item.photoUrl} 
                            alt={item.name} 
                            className="w-7 h-7 rounded border object-cover bg-slate-50 shrink-0" 
                          />
                          <span className="font-extrabold text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 border text-slate-600 font-bold px-2 py-0.5 rounded-lg text-[9px]">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.vendorName}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {item.measurementType === 'weight' && (
                          <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            ⚖️ {item.weightOrVolumeValue} {item.weightUnit || 'lbs'}
                          </span>
                        )}
                        {item.measurementType === 'liquid' && (
                          <span className="text-sky-800 font-bold bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                            💧 {item.weightOrVolumeValue} {item.liquidUnit || 'gal'}
                          </span>
                        )}
                        {(!item.measurementType || item.measurementType === 'discrete') && (
                          <span className="text-slate-600 font-semibold">
                            📦 Std ({item.unitOfMeasurement})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {item.defaultParLevel} {item.unitOfMeasurement || 'cases'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800">
                        ${(item.recentPurchasePrice || item.createdPrice || 24.50).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {filteredCatalogItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 bg-slate-50 text-xs font-mono">
                        No inventory item records match your applied filter spec modifiers.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIDE BY SIDE STORE COMPARATIVE REPORT (UP TO 10 STORES) */}
      {activeTab === 'store-compare' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Instructions Box */}
          <div className="bg-slate-100 p-4 border border-slate-200 rounded-2xl space-y-3.5">
            <span className="flex items-center gap-1 text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest leading-none">
              <Scale className="w-4 h-4 text-amber-500" /> SIDE-BY-SIDE INVENTORY OUTLET COMPARISON (MAX 10 STORES)
            </span>
            <p className="text-[11px] text-slate-600 leading-normal">
              Compare hand stock index values and par thresholds side-by-side between separate regional warehouses. Choose up to 10 outlets below. Visual rows compare identical ingredient types ("apples to apples").
            </p>

            {/* Selectable Store Checkbox Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
              {defaultLocations.map(location => {
                const isSelected = comparedStores.includes(location.code);
                return (
                  <button
                    key={location.code}
                    type="button"
                    onClick={() => handleToggleCompareStore(location.code)}
                    className={`p-2.5 rounded-xl border text-[11px] font-mono font-bold transition flex items-center justify-between text-left ${
                      isSelected 
                        ? 'border-amber-500 bg-amber-50 text-slate-900 shadow-sm' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate pr-1">{location.name} ({location.code})</span>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 text-[7px] ${
                      isSelected ? 'bg-amber-500 border-amber-600 text-slate-950 font-black' : 'border-slate-350 bg-slate-50'
                    }`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-500 pt-1.5">
              <span>Currently showing <strong className="text-slate-800">{comparedStores.length}</strong> outlets in comparative matrix view (Max limit: 10)</span>
              <button 
                type="button" 
                onClick={() => setComparedStores(['AR', 'CM', 'AS'])} 
                className="text-amber-700 hover:underline font-extrabold"
              >
                Reset Default Compare
              </button>
            </div>
          </div>

          {/* Comparative visual grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-100 font-mono uppercase text-[9px] tracking-wider">
                    <td className="py-3.5 px-4 font-black">Comparing Ingredient ("Apples to Apples")</td>
                    {comparedStores.map(code => {
                      const locationObj = defaultLocations.find(l => l.code === code);
                      return (
                        <td key={code} className="py-3.5 px-3 border-l border-slate-800 text-center font-extrabold text-amber-400 min-w-[120px]">
                          🏨 {locationObj?.name || code} ({code})
                        </td>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-755 font-mono">
                  {sampleItems.slice(0, 10).map((item, index) => {
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-sans font-extrabold text-slate-900 text-[11.5px] flex items-center gap-2">
                          <img 
                            referrerPolicy="no-referrer"
                            src={item.photoUrl} 
                            alt={item.name} 
                            className="w-6 h-6 rounded object-cover border bg-slate-50 shrink-0" 
                          />
                          <span>{item.name}</span>
                          <span className="bg-slate-100 text-slate-500 px-1 py-0.5 rounded text-[8.5px] font-mono">
                            {item.unitOfMeasurement}
                          </span>
                        </td>
                        
                        {comparedStores.map(code => {
                          // Simulated hand count variation per individual warehouse outlet
                          const multiplier = code === 'CM' ? 3.5 : code === 'AS' ? 1.2 : code === 'BK' ? 0.8 : 1.5;
                          const count = Math.round((item.defaultParLevel || 10) * multiplier * (0.6 + (index % 5) * 0.1));
                          const holdsPar = count >= item.defaultParLevel;

                          return (
                            <td key={code} className="py-3 px-3 border-l text-center">
                              <div className="space-y-1">
                                <span className={`inline-block px-2 py-1 font-black rounded-lg text-xs ${
                                  holdsPar ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-700 animate-pulse'
                                }`}>
                                  {count} Hand
                                </span>
                                <div className="text-[8.5px] text-slate-400 font-mono">
                                  Par target: {item.defaultParLevel}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {comparedStores.length === 0 && (
                <div className="text-center py-16 text-slate-400 font-sans text-xs">
                  Please check at least one warehouse store outlet checkbox in the control deck to load comparison data rows.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. PMIX REPORT DESIGN (PRODUCT MIX) */}
      {activeTab === 'pmix' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Educational overview */}
          <div className="bg-slate-900 text-slate-100 p-4 border border-slate-950 rounded-2xl space-y-2">
            <h3 className="text-sm font-bold font-mono text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-500" /> PMIX POPULARITY / PROFITABILITY CULINARY MATRIX
            </h3>
            <p className="text-[11px] text-slate-300 leading-normal font-sans">
              Product Mix (PMIX) records let operations evaluate menu efficiency by tracking total quantities sold, relative mix % share, portion ingredient costs, standard price points, and theoretical margins. Items classify into engineering indexes:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono pt-1">
              <div className="p-1 px-1.5 rounded bg-emerald-950/60 border border-emerald-700 text-emerald-400">
                ⭐ <strong>STARS:</strong> High popularity, High profit
              </div>
              <div className="p-1 px-1.5 rounded bg-sky-950/60 border border-sky-700 text-sky-450">
                🐎 <strong>HORSES:</strong> High popularity, Low profit
              </div>
              <div className="p-1 px-1.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400">
                🧩 <strong>PUZZLES:</strong> Low popularity, High profit
              </div>
              <div className="p-1 px-1.5 rounded bg-red-955/60 border border-red-800 text-red-400">
                🐕 <strong>DOGS:</strong> Low popularity, Low profit
              </div>
            </div>
          </div>

          {/* Interactive PMIX Table Grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono uppercase text-[9.5px] font-black">
                    <th className="py-3 px-4 pl-4">Item Product / Dish</th>
                    <th className="py-3 px-3 text-center">Qty Sold (Period)</th>
                    <th className="py-3 px-3 text-center">Mix Share %</th>
                    <th className="py-3 px-3 text-right">Retail Menu Price</th>
                    <th className="py-3 px-3 text-right">Ingredient Portion Cost</th>
                    <th className="py-3 px-3 text-right">Food Cost %</th>
                    <th className="py-3 px-3 text-right">Per Unit Gross Margin</th>
                    <th className="py-3 px-4 text-center">Engineering Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-120 text-slate-755 font-mono">
                  {[
                    { name: 'Sourdough Roast Beef Melt', qty: 450, share: 29.5, price: 14.50, cost: 4.10, class: 'Star' },
                    { name: 'Artisanal Tomato Caprese Panini', qty: 380, share: 24.9, price: 11.00, cost: 2.20, class: 'Star' },
                    { name: 'Smoked Turkey Clubhouse Stack', qty: 310, share: 20.3, price: 12.50, cost: 5.60, class: 'Horse' },
                    { name: 'Organic Garden Harvest Salad Bowl', qty: 180, share: 11.8, price: 10.50, cost: 1.80, class: 'Puzzle' },
                    { name: 'Spiced Pumpkin Purée Cup', qty: 120, share: 7.9, price: 6.50, cost: 3.10, class: 'Dog' },
                    { name: 'Cold Pressed Golden Elixir (Juice)', qty: 85, share: 5.6, price: 8.00, cost: 1.50, class: 'Puzzle' },
                  ].map((p, i) => {
                    const fcPercent = (p.cost / p.price) * 100;
                    const margin = p.price - p.cost;
                    
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 pl-4 font-sans font-extrabold text-slate-900 text-sm">
                          {p.name}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">
                          {p.qty} orders
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-bold">{p.share}%</span>
                            <div className="w-12 bg-slate-200 h-1 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full" style={{ width: `${p.share * 2.5}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-800">
                          ${p.price.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-500">
                          ${p.cost.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-bold ${fcPercent > 40 ? 'text-red-700 underline' : 'text-emerald-700'}`}>
                            {fcPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-800">
                          ${margin.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.class === 'Star' && (
                            <span className="bg-emerald-100 text-emerald-850 px-2.5 py-1 border border-emerald-300 font-extrabold rounded-lg text-[9px] uppercase tracking-wider block text-center shadow-xs">
                              ⭐ Star High profit
                            </span>
                          )}
                          {p.class === 'Horse' && (
                            <span className="bg-sky-100 text-sky-850 px-2.5 py-1 border border-sky-300 font-extrabold rounded-lg text-[9px] uppercase tracking-wider block text-center shadow-xs">
                              🐎 Horse Popular
                            </span>
                          )}
                          {p.class === 'Puzzle' && (
                            <span className="bg-amber-100 text-amber-850 px-2.5 py-1 border border-amber-300 font-extrabold rounded-lg text-[9px] uppercase tracking-wider block text-center shadow-xs">
                              🧩 Puzzle Margin
                            </span>
                          )}
                          {p.class === 'Dog' && (
                            <span className="bg-red-100 text-red-850 px-2.5 py-1 border border-red-300 font-extrabold rounded-lg text-[9px] uppercase tracking-wider block text-center shadow-xs">
                              🐕 Dog Action
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 p-3.5 border-t text-[10px] text-slate-500 font-mono flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <span>* High theoretical food cost index points should trigger inventory item par level modifications.</span>
              <span className="text-slate-800 font-bold">Optimal target Food Cost Range: 22% - 32% Average</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. REAL-TIME USAGE CALCULATOR (STARTING + INVOICES - ENDING) */}
      {activeTab === 'usage-calc' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Formula box */}
          <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl flex items-start gap-3">
            <Coins className="w-5.5 h-5.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-800 space-y-1">
              <h4 className="font-extrabold uppercase text-slate-900 font-mono tracking-wider">Culinarian Waste Formula System</h4>
              <p className="leading-relaxed text-slate-650">
                To evaluate total product usage we operate the baseline audit theorem:
                <br />
                <code className="block bg-white p-2 border rounded-xl font-bold font-mono text-center text-amber-900 mt-2 text-xs">
                  Usage Volume = Starting Stock (Inv Par) + Deliveries (Scanned Invoices) - Ending Stock (Hand Audit Count)
                </code>
              </p>
            </div>
          </div>

          {/* Interactive Calculator Grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto text-[11px]" id="usage-report-calc-grid">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white border-b font-mono uppercase text-[9.5px] font-black">
                    <th className="py-3.5 px-4">Ingredient Title</th>
                    <th className="py-3.5 px-3 text-center bg-slate-800/80">A. Starting Stock (Inv Par)</th>
                    <th className="py-3.5 px-3 text-center bg-sky-900/80">B. Deliveries (Scanned Invoices)</th>
                    <th className="py-3.5 px-3 text-center bg-amber-550/80">C. Ending Stock (Audit Log)</th>
                    <th className="py-3.5 px-3 text-right text-amber-400 bg-slate-950 font-extrabold pr-4">Total period usage (= A + B - C)</th>
                    <th className="py-3.5 px-4 text-center">Inventory Health Spec</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-120 font-mono text-slate-700">
                  {sampleItems.slice(0, 9).map((item, index) => {
                    const startingStock = item.defaultParLevel || 10;
                    // Deliveries added from simulated invoice scans (6, 12, or 24 cases/bags)
                    const deliveries = index % 3 === 0 ? 12 : index % 2 === 0 ? 6 : 18;
                    // Ending Stock from reported physical counts (3 cases average)
                    const endingStock = index % 4 === 0 ? 8 : 4;
                    // Period Usage calculation
                    const periodUsage = Math.max(0, (startingStock + deliveries) - endingStock);
                    
                    let healthStatus = 'Stable';
                    let healthColor = 'text-green-700 bg-green-50 border-green-200';
                    if (periodUsage > 15) {
                      healthStatus = 'High Velocity';
                      healthColor = 'text-amber-700 bg-amber-50 border-amber-200 animate-pulse';
                    } else if (periodUsage < 4) {
                      healthStatus = 'Waste Risk / Dead Stock';
                      healthColor = 'text-red-700 bg-red-50 border-red-200';
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-sans font-extrabold text-slate-905 flex items-center gap-1.5">
                          <img 
                            referrerPolicy="no-referrer"
                            src={item.photoUrl} 
                            alt={item.name} 
                            className="w-7 h-7 rounded border object-cover shrink-0" 
                          />
                          <div>
                            <span className="block font-bold">{item.name}</span>
                            <span className="text-[7.5px] font-mono text-slate-400 uppercase">Unit: {item.unitOfMeasurement}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center bg-slate-50/50 font-bold text-slate-600">
                          {startingStock} {item.unitOfMeasurement || 'units'}
                        </td>
                        <td className="py-3 px-3 text-center bg-sky-50/30 text-sky-850 font-extrabold">
                          +{deliveries}
                        </td>
                        <td className="py-3 px-3 text-center bg-amber-50/20 text-slate-900">
                          {endingStock}
                        </td>
                        <td className="py-3 px-3 text-right bg-slate-50 font-black text-amber-700 text-sm pr-4">
                          {periodUsage} {item.unitOfMeasurement || 'units'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 border rounded-lg text-[9px] font-black uppercase tracking-wider block text-center ${healthColor}`}>
                            {healthStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHECKLIST AUDIT TRAIL */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Checklist Audit Trail History</h3>
          {submissions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed rounded-xl text-slate-400 text-xs">
              No historical submission logs entered for this location. Select another Store Context above.
            </div>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 p-4 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{sub.formTitle}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Submitted by <span className="font-medium text-slate-700">{sub.userName}</span> on {new Date(sub.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded">
                    ID: {sub.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white border text-gray-850 border-slate-200/50 p-2.5 rounded-lg shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Checked items</p>
                    <p className="text-lg font-black text-gray-900 font-mono mt-0.5">{sub.items.length}</p>
                  </div>
                  <div className="bg-white border text-gray-850 border-slate-200/50 p-2.5 rounded-lg shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Suggested orders</p>
                    <p className="text-lg font-black text-amber-600 font-mono mt-0.5">
                      {sub.items.reduce((sum, item) => sum + item.suggestedOrder, 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-white border text-gray-850 border-slate-200/50 p-2.5 rounded-lg shadow-sm">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Purchase overrides</p>
                    <p className="text-lg font-black text-red-650 font-mono mt-0.5">
                      {sub.items.reduce((sum, item) => sum + item.finalOrder, 0).toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-white border text-gray-850 border-slate-200/50 p-2.5 rounded-lg shadow-sm mr-1">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Variance Index</p>
                    <p className="text-lg font-black text-slate-900 font-mono mt-0.5">Stable</p>
                  </div>
                </div>

                {sub.notes && (
                  <div className="bg-slate-100 text-[11px] p-2.5 rounded mt-3 text-slate-600 border border-slate-200/65">
                    <span className="font-bold block mb-0.5 text-slate-800">Operator notes:</span>
                    "{sub.notes}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 6. CONSOLIDATED SUGGESTED PURCHASES */}
      {activeTab === 'suggested' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-slate-800 p-4 rounded-xl leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-slate-750">
              The following values comprise the <b>Suggested order rolls</b> calculated as <code>Suggested Order = Par Level - Current count</code>. If numbers on-hand are below par, purchase orders fire automatically to maintain warehouse operations.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase font-mono text-[9.5px] font-black">
                  <th className="p-3 pl-4">Audit Item</th>
                  <th className="p-3">Measuring Unit</th>
                  <th className="p-3 text-center">On-Hand Count</th>
                  <th className="p-3 text-center">Standard Par</th>
                  <th className="p-3 text-right pr-4 text-amber-700 font-bold">Suggested purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-gray-700">
                {sampleItems.slice(0, 15).map((item) => {
                  const onHand = 3; // simulated current hand count
                  const suggested = Math.max(0, item.defaultParLevel - onHand);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 pl-4 font-bold text-gray-900">{item.name}</td>
                      <td className="p-3 text-slate-500 font-mono">{item.unitOfMeasurement}</td>
                      <td className="p-3 text-center font-mono font-semibold">3</td>
                      <td className="p-3 text-center font-mono">{item.defaultParLevel}</td>
                      <td className="p-3 text-right pr-4 font-mono font-bold text-amber-600 bg-amber-50/25">
                        {suggested > 0 ? `+${suggested}` : '0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TECHNICAL STOCK VARIANCE ANALYSIS */}
      {activeTab === 'variance' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-red-500/5 border border-red-100 rounded-xl p-4 text-xs text-red-800 leading-normal flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-950">Variance Safety Warnings</p>
              <p className="mt-0.5">Physical counts indicating deficit levels steeper than 40% par level appear highlighted in red. Please monitor kitchen waste controls if these persist.</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-2xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-500 uppercase font-mono text-[9.5px] font-black">
                  <th className="p-3 pl-4">Item Catalog</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-center">Standard Target Par</th>
                  <th className="p-3 text-center">Reported Count</th>
                  <th className="p-3 text-right pr-4">Deficit Variance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-gray-700">
                {sampleItems.slice(0, 10).map((item, index) => {
                  const reportedCount = index === 0 ? 1 : index === 3 ? 2 : 4;
                  const variancePercent = Math.max(0, Math.round(((item.defaultParLevel - reportedCount) / item.defaultParLevel) * 100));
                  const isSevere = variancePercent > 40;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 pl-4 font-bold text-gray-900">{item.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-50 rounded text-[10px] text-gray-500 border font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono">{item.defaultParLevel}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{reportedCount}</td>
                      <td className={`p-3 text-right pr-4 font-mono font-black ${isSevere ? 'text-red-650 bg-red-50/20' : 'text-slate-700'}`}>
                        {variancePercent > 0 ? `-${variancePercent}%` : '0%'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. UPLOADED DELIVERY INVOICES REPORT & MANAGER PANEL */}
      {activeTab === 'invoices' && simUser?.role === 'Employee' && (
        <div className="bg-white border select-none border-red-100 rounded-2xl p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm animate-fadeIn">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
          <h3 className="text-base font-black text-gray-900 font-sans tracking-tight">Access Control Protection</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-sans">
            Your current assigned simulation authority role is <strong className="text-red-655 bg-red-50 px-1.5 py-0.5 rounded">Employee</strong>. Employees are restricted strictly to physical inventory count tasking and cannot consult, submit, edit, or delete supplier accounting invoices or reports.
          </p>
          <div className="text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded">
            Required Role: Super Admin | Admin | Manager
          </div>
        </div>
      )}

      {activeTab === 'invoices' && simUser?.role !== 'Employee' && (
        <div className="space-y-6 animate-fadeIn">
          {/* High-Contrast Toast Notifications */}
          {toastMsg && (
            <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-amber-400 font-bold px-4.5 py-3 rounded-xl shadow-xl text-xs flex items-center gap-2 border border-slate-800 animate-slideIn">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block tracking-wider">Matched Receipts Count</span>
                <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">{filteredInvoices.length} Invoices</span>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                <Receipt className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block tracking-wider">Aggregate Outlay Sum</span>
                <span className="text-lg font-black text-emerald-705 font-mono mt-0.5 block font-bold">
                  ${filteredInvoices.reduce((acc, cr) => acc + cr.totalPrice, 0).toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl text-amber-705">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block tracking-wider">Total Products Sourced</span>
                <span className="text-lg font-black text-slate-800 font-mono mt-0.5 block font-bold">
                  {filteredInvoices.reduce((acc, cr) => acc + cr.itemsCount, 0)} quantities
                </span>
              </div>
              <div className="p-3 bg-sky-100 rounded-xl text-sky-650">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 leading-none">
                <Receipt className="w-4 h-4 text-amber-500" /> Ledger of Operational Supplier Invoices
              </h3>
              <p className="text-[10.5px] text-slate-400 font-mono mt-1">Review, filter, edit or register manual/OCR delivery sheets in real-time</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={triggerInvoicesPrint}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs uppercase cursor-pointer transition flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Print Filtered Report
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setIsAddingInvoice(!isAddingInvoice);
                  setEditingInvoiceId(null);
                  setFormVendor('');
                  setFormItems([]);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs uppercase cursor-pointer transition flex items-center gap-1.5 shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" /> 
                {isAddingInvoice ? "Collapse Form" : "Create Manual Record"}
              </button>
            </div>
          </div>

          {/* Create or Edit Manual Invoice Slide Form */}
          {isAddingInvoice && (
            <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4 animate-fadeIn">
              <h4 className="text-xs font-black text-slate-900 uppercase font-mono tracking-wider flex items-center gap-1">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                {editingInvoiceId ? `Modify Invoice Specs [ID: ${editingInvoiceId}]` : "Register New Manual Delivery Document"}
              </h4>

              {/* Form Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block">Supplier Vendor Name</label>
                  <input 
                    type="text"
                    placeholder="E.g. Sysco Foodservice"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full p-2.5 border bg-white rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block">Delivery Date</label>
                  <input 
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 border bg-white rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block">Delivery Time</label>
                  <input 
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full p-2.5 border bg-white rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block">Recipient Location Store</label>
                  <select
                    value={formStore}
                    onChange={(e) => setFormStore(e.target.value)}
                    className="w-full p-2.5 border bg-white rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 font-mono"
                  >
                    {defaultLocations.map(l => (
                      <option key={l.code} value={l.code}>{l.code} ({l.name})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Choice */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block">Product Catalog Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 border bg-white rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cooler">Cooler (Dairy, Shellfish, Proteins)</option>
                    <option value="Dry Storage">Dry Storage (Canned, Beans, Grains)</option>
                    <option value="Prep Area">Prep Area (Oils, Sauces, Prep)</option>
                    <option value="Bar">Bar (Beverages, Garnishes)</option>
                    <option value="Freezer">Freezer (Frozen products, Icecream)</option>
                    <option value="Steam Table">Steam Table (Hot holding items)</option>
                  </select>
                </div>
              </div>

              {/* Inline Itemizer Sub-Builder */}
              <div className="bg-white p-4.5 border border-slate-150 rounded-xl space-y-3.5 shadow-sm">
                <h5 className="text-[10px] font-bold text-slate-500 font-mono uppercase block">Append Product Item Details Line</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                  <div className="md:col-span-5">
                    <input 
                      type="text"
                      placeholder="Product designation (e.g., Chicken Breast raw)"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:border-sky-500 text-xs font-bold"
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-1">
                    <input 
                      type="number"
                      placeholder="QTY"
                      min="1"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:border-sky-500 text-center font-mono font-bold"
                      title="Item Count / Ordered Quantity"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center border rounded-lg px-2 bg-slate-50/50">
                    <span className="text-slate-400 font-mono">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="Price"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 bg-transparent focus:outline-none text-right font-mono font-bold"
                      title="Unit Cost Price"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <input 
                      type="text"
                      placeholder="lbs/oz/cases"
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:border-sky-500 text-center font-mono font-bold"
                      title="Item weight abbreviation or packaging unit"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={addFormItem}
                      className="w-full h-full bg-slate-800 hover:bg-slate-900 active:scale-95 text-white p-2 rounded-lg font-black transition flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Built Lines Manifest */}
                {formItems.length > 0 ? (
                  <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/15">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b text-slate-500 font-mono text-[8.5px] font-black uppercase">
                          <th className="p-2 pl-3">Designation Name</th>
                          <th className="p-2 text-center">Qty Purchased</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2 text-center">Weight / Packaging Unit</th>
                          <th className="p-2 text-right">Row Outlay Cost</th>
                          <th className="p-2 text-center pr-3 shrink-0"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono font-bold">
                        {formItems.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition font-normal text-slate-700">
                            <td className="p-2 pl-3 font-semibold text-gray-900 font-sans">{v.name}</td>
                            <td className="p-2 text-center text-slate-900 font-black">{v.quantity}</td>
                            <td className="p-2 text-right text-slate-700">${Number(v.price).toFixed(2)}</td>
                            <td className="p-2 text-center text-slate-500">{v.packaging}</td>
                            <td className="p-2 text-right font-black text-emerald-700">
                              ${(Number(v.price) * Number(v.quantity)).toFixed(2)}
                            </td>
                            <td className="p-2 text-center pr-3">
                              <button
                                type="button"
                                onClick={() => removeFormItem(i)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-md transition"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-amber-500/10 font-bold border-t">
                          <td className="p-2 pl-3 text-slate-950">Total Estimated Invoicing:</td>
                          <td className="p-2 text-center text-slate-900">{formItems.reduce((a, b) => a + b.quantity, 0)} items</td>
                          <td colSpan="2"></td>
                          <td className="p-2 text-right font-black text-emerald-800">
                            ${formItems.reduce((a, b) => a + (b.price * b.quantity), 0).toFixed(2)}
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-mono text-center py-2.5 italic border border-dashed rounded-lg bg-slate-50/40">No item rows compiled into the manifest yet. Fill in product details above.</p>
                )}
              </div>

              {/* Form Action Controls */}
              <div className="flex justify-end gap-2 pt-1 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingInvoice(false);
                    setEditingInvoiceId(null);
                    setFormItems([]);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold px-4 py-2 rounded-xl text-xs uppercase transition"
                >
                  Cancel Registration
                </button>
                <button
                  type="button"
                  onClick={saveInvoiceForm}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2 rounded-xl text-xs uppercase cursor-pointer transition shadow active:scale-95"
                >
                  Confirm & Save Invoice Profile
                </button>
              </div>
            </div>
          )}

          {/* Search and Advanced Filters Panel */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
            <span className="flex items-center gap-1.5 text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest leading-none font-bold">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> Filter Invoice Records
            </span>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Vendor Supplier</label>
                <input 
                  type="text"
                  placeholder="E.g. Sysco"
                  value={invFilterVendor}
                  onChange={(e) => setInvFilterVendor(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] text-slate-700 outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Date Range (Start)</label>
                <input 
                  type="date"
                  value={invFilterStartDate}
                  onChange={(e) => setInvFilterStartDate(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Date Range (End)</label>
                <input 
                  type="date"
                  value={invFilterEndDate}
                  onChange={(e) => setInvFilterEndDate(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Product Category</label>
                <select
                  value={invFilterCategory}
                  onChange={(e) => setInvFilterCategory(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] font-bold text-slate-700 outline-none focus:border-amber-500"
                >
                  <option value="">-- All Categories --</option>
                  <option value="Cooler">Cooler</option>
                  <option value="Dry Storage">Dry Storage</option>
                  <option value="Prep Area">Prep Area</option>
                  <option value="Bar">Bar</option>
                  <option value="Freezer">Freezer</option>
                  <option value="Steam Table">Steam Table</option>
                </select>
              </div>
            </div>

            {/* Price range & Time shift grids */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs pt-1.5 border-t border-slate-200/50">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Min Outlay Cost Price ($)</label>
                <input 
                  type="number"
                  placeholder="E.g. 50"
                  value={invFilterMinPrice}
                  onChange={(e) => setInvFilterMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] outline-none focus:border-amber-500 text-emerald-800 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Max Outlay Cost Price ($)</label>
                <input 
                  type="number"
                  placeholder="E.g. 500"
                  value={invFilterMaxPrice}
                  onChange={(e) => setInvFilterMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] outline-none focus:border-amber-500 text-emerald-800 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Receipt Time (Since)</label>
                <input 
                  type="time"
                  value={invFilterStartTime}
                  onChange={(e) => setInvFilterStartTime(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold text-slate-500 font-mono uppercase font-bold">Receipt Time (Until)</label>
                <input 
                  type="time"
                  value={invFilterEndTime}
                  onChange={(e) => setInvFilterEndTime(e.target.value)}
                  className="w-full p-2 border bg-white rounded-lg font-mono text-[10.5px] outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Reset filters */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setInvFilterVendor('');
                  setInvFilterStartDate('');
                  setInvFilterEndDate('');
                  setInvFilterCategory('');
                  setInvFilterMinPrice('');
                  setInvFilterMaxPrice('');
                  setInvFilterStartTime('');
                  setInvFilterEndTime('');
                }}
                className="text-[10px] font-bold text-slate-500 hover:text-amber-600 transition font-mono uppercase flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset Invoicing Filters
              </button>
            </div>
          </div>

          {/* Invoices Ledger Table */}
          <div id="printable-invoices-report" className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white uppercase font-mono text-[9px] font-bold tracking-wider">
                  <th className="p-3.5 pl-4 w-12 text-center">Detail</th>
                  <th className="p-3.5">Invoice ID</th>
                  <th className="p-3.5">Vendor Supplier</th>
                  <th className="p-3.5 text-center">Category</th>
                  <th className="p-3.5 text-center font-bold">Store Code</th>
                  <th className="p-3.5 text-center font-bold">Purchased Qty</th>
                  <th className="p-3.5 font-mono">Receipt Date / Time</th>
                  <th className="p-3.5 text-right w-32">Grand Total</th>
                  <th className="p-3.5 text-center pr-4 w-28 shrink-0 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-gray-700">
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((inv) => {
                    const isExpanded = expandedInvoiceId === inv.id;
                    return (
                      <React.Fragment key={inv.id}>
                        <tr className="hover:bg-slate-50/50 transition duration-75">
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                              className="p-1 px-2 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                            >
                              {isExpanded ? 'Hide' : 'Show'}
                            </button>
                          </td>
                          <td className="p-3 font-mono text-[10.5px] text-slate-500">{inv.id}</td>
                          <td className="p-3 font-extrabold text-slate-900">{inv.vendorName}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-[10px] rounded font-bold uppercase border border-slate-200">
                              {inv.category}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-amber-700">
                            {inv.storeLocation || "N/A"}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-650">
                            {inv.itemsCount} cases
                          </td>
                          <td className="p-3 font-mono text-slate-550">
                            {inv.date} <span className="text-slate-400">@ {inv.time}</span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700 text-sm">
                            ${Number(inv.totalPrice).toFixed(2)}
                          </td>
                          
                          {/* Invoice CRUD Button Row */}
                          <td className="p-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={() => startEditInvoice(inv)}
                                title="Edit invoice details and items manifest"
                                className="p-1.5 hover:bg-amber-100 hover:text-amber-800 text-slate-400 rounded-lg transition text-slate-500"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => deleteInvoiceAction(inv.id, inv.vendorName)}
                                title="Delete invoice permanently"
                                className="p-1.5 hover:bg-red-50 hover:text-red-650 text-slate-400 rounded-lg transition text-slate-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Collapsible Row Expansions containing individual items specs */}
                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={9} className="p-4 pl-6 border-b">
                              <div className="space-y-2 max-w-4xl border border-slate-150 rounded-xl bg-white p-4 shadow-sm">
                                <h5 className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider block font-bold">Line-Item Product Receipts Breakdown</h5>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-[11px] text-left">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-500 font-mono text-[8.5px] font-black uppercase border-b border-slate-200">
                                        <th className="p-2">Item Description</th>
                                        <th className="p-2 text-center">Qty Bought</th>
                                        <th className="p-2 text-center font-bold">Cost Packaging Unit</th>
                                        <th className="p-2 text-right font-mono">Unit Price</th>
                                        <th className="p-2 text-right pr-4 font-bold">Total Price Outlay</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                      {inv.items.map((it, sIdx) => (
                                        <tr key={sIdx} className="hover:bg-slate-50/50">
                                          <td className="p-2 font-bold font-sans text-gray-800">{it.name}</td>
                                          <td className="p-2 text-center text-slate-900 font-black">{it.quantity}</td>
                                          <td className="p-2 text-center text-slate-500 font-sans">{it.packaging || 'cases'}</td>
                                          <td className="p-2 text-right text-slate-700">${Number(it.price).toFixed(2)}</td>
                                          <td className="p-2 text-right pr-4 font-extrabold text-emerald-850">
                                            ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 italic">No invoicing delivery matches found for the active criteria. Try loosening up filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
