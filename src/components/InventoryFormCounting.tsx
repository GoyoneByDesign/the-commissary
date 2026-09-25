import React, { useState, useEffect, useMemo } from 'react';
import { InventoryForm, SubmissionItem, FormSubmission } from '../types';
import { sampleItems, sampleSubmissions } from '../data/sampleData';
import { printHtmlViaIframe } from '../utils/printHelper';
import { exportAnitaSheetToExcel } from '../utils/excelExport';
import { 
  Save, Check, Search, Filter, Camera, RefreshCw, Sparkles, 
  Volume2, Mic, Printer, FileSpreadsheet, LayoutGrid, Table as TableIcon,
  AlertTriangle, Clock, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';

interface InventoryFormCountingProps {
  form: InventoryForm;
  currentUser: any;
  onBack: () => void;
  onSubmitSuccess: (submissionId: string) => void;
  activeVoiceParsedCmd?: { itemName: string; quantity: number; unit: string; timestamp: number } | null;
}

export default function InventoryFormCounting({
  form,
  currentUser,
  onBack,
  onSubmitSuccess,
  activeVoiceParsedCmd
}: InventoryFormCountingProps) {
  // View mode: 'sheet' (Store Excel Grid) or 'cards' (Touch Cards)
  const [viewMode, setViewMode] = useState<'sheet' | 'cards'>('sheet');

  // Active section or 'ALL'
  const [activeSection, setActiveSection] = useState<string>(form.sections[0]?.name || 'BI-WEEKLY ORDER');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState('');

  // Store sheet header metadata matching Anita's physical forms
  const [managerOnDuty, setManagerOnDuty] = useState(currentUser.name || 'Sarah Jenkins');
  const [operatorName, setOperatorName] = useState(currentUser.name || 'Staff Member');
  const [dateStr, setDateStr] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  });

  // Calculate current shift slot based on configured hours:
  // Breakfast: opening until 10:59 am (< 11:00 am)
  // Lunch: 11:00 am - 3:59 pm (11:00 am to 3:59 pm)
  // Dinner: 4:00 pm till closing (>= 4:00 pm)
  const getCurrentShift = (): 'Breakfast' | 'Lunch' | 'Dinner' => {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    if (totalMinutes < 660) return 'Breakfast';
    if (totalMinutes < 960) return 'Lunch';
    return 'Dinner';
  };
  const [shiftSlot, setShiftSlot] = useState<'Breakfast' | 'Lunch' | 'Dinner'>(getCurrentShift);

  // Form type heuristics
  const isBarSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id.includes('bar') || t.includes('bar') || t.includes('beer') || t.includes('beverage');
  }, [form]);

  const isCateringSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id.includes('catering') || t.includes('catering');
  }, [form]);

  // Local state holding the physical count items
  const [itemsMap, setItemsMap] = useState<{ [itemId: string]: SubmissionItem }>({});

  // Initialize the list of items for the form structure
  useEffect(() => {
    const freshMap: { [itemId: string]: SubmissionItem } = {};
    form.sections.forEach(section => {
      section.itemIds.forEach(id => {
        const baseItem = sampleItems.find(item => item.id === id);
        if (baseItem) {
          const currentCount = 0;
          const suggested = Math.max(0, baseItem.defaultParLevel - currentCount);
          freshMap[id] = {
            itemId: id,
            name: baseItem.name,
            category: baseItem.category,
            unit: baseItem.unitOfMeasurement,
            currentCount: currentCount,
            parLevel: baseItem.defaultParLevel,
            suggestedOrder: suggested,
            finalOrder: suggested,
            total: currentCount + suggested,
            photoUrl: baseItem.photoUrl,
            wlkInCount: 0,
            barCount: 0,
            isChecked: false,
            isReceived: false,
            isBackOrder: false,
            co2GaugePct: id === 'co2-1' ? 75 : undefined
          };
        }
      });
    });
    setItemsMap(freshMap);
  }, [form]);

  // Hook into active voice command parsing (emitted by VoiceInventoryUI)
  useEffect(() => {
    if (activeVoiceParsedCmd) {
      const { itemName, quantity, unit } = activeVoiceParsedCmd;
      const matchedEntry = (Object.entries(itemsMap) as [string, SubmissionItem][]).find(([id, item]) => 
        item.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(item.name.toLowerCase())
      );

      if (matchedEntry) {
        const [id, item] = matchedEntry;
        const countValue = quantity;
        const suggested = Math.max(0, item.parLevel - countValue);
        
        setItemsMap(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            currentCount: countValue,
            suggestedOrder: suggested,
            finalOrder: suggested,
            total: countValue + suggested,
            isChecked: true
          }
        }));

        setDraftSavedMsg(`Voice Command synced: ${quantity} ${unit} for "${item.name}"`);
        setTimeout(() => setDraftSavedMsg(''), 4500);
      }
    }
  }, [activeVoiceParsedCmd]);

  // Standard count change handler (for INV cell)
  const handleCountChange = (itemId: string, countVal: string) => {
    const countNum = countVal === '' ? 0 : parseFloat(countVal) || 0;
    const item = itemsMap[itemId];
    if (!item) return;

    const suggested = Math.max(0, item.parLevel - countNum);
    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        currentCount: countNum,
        suggestedOrder: suggested,
        finalOrder: suggested,
        total: countNum + suggested,
        isChecked: countNum > 0 ? true : prev[itemId]?.isChecked
      }
    }));
  };

  // Bar sheet walk-in count change handler
  const handleWlkInChange = (itemId: string, val: string) => {
    const wlkNum = val === '' ? 0 : parseFloat(val) || 0;
    const item = itemsMap[itemId];
    if (!item) return;

    const barNum = item.barCount || 0;
    const totalCount = wlkNum + barNum;
    const suggested = Math.max(0, item.parLevel - totalCount);

    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        wlkInCount: wlkNum,
        currentCount: totalCount,
        suggestedOrder: suggested,
        finalOrder: suggested,
        total: totalCount + suggested,
        isChecked: totalCount > 0 ? true : prev[itemId]?.isChecked
      }
    }));
  };

  // Bar sheet bar / carry-out count change handler
  const handleBarCountChange = (itemId: string, val: string) => {
    const barNum = val === '' ? 0 : parseFloat(val) || 0;
    const item = itemsMap[itemId];
    if (!item) return;

    const wlkNum = item.wlkInCount || 0;
    const totalCount = wlkNum + barNum;
    const suggested = Math.max(0, item.parLevel - totalCount);

    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        barCount: barNum,
        currentCount: totalCount,
        suggestedOrder: suggested,
        finalOrder: suggested,
        total: totalCount + suggested,
        isChecked: totalCount > 0 ? true : prev[itemId]?.isChecked
      }
    }));
  };

  // CO2 gauge percentage change handler
  const handleCo2GaugeChange = (itemId: string, val: string) => {
    const pct = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        co2GaugePct: pct,
        currentCount: pct,
        suggestedOrder: pct < 25 ? 1 : 0,
        finalOrder: pct < 25 ? 1 : 0,
        isChecked: true
      }
    }));
  };

  // Final Order override
  const handleFinalOrderChange = (itemId: string, orderVal: string) => {
    const orderNum = orderVal === '' ? 0 : parseFloat(orderVal) || 0;
    const item = itemsMap[itemId];
    if (!item) return;

    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        finalOrder: orderNum,
        total: item.currentCount + orderNum
      }
    }));
  };

  // Toggle checkmark (Count ✔)
  const toggleItemChecked = (itemId: string) => {
    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        isChecked: !prev[itemId]?.isChecked
      }
    }));
  };

  // Toggle received checkmark (Rec ✔)
  const toggleItemReceived = (itemId: string) => {
    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        isReceived: !prev[itemId]?.isReceived
      }
    }));
  };

  // Toggle back-order checkbox (B/O)
  const toggleBackOrder = (itemId: string) => {
    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        isBackOrder: !prev[itemId]?.isBackOrder
      }
    }));
  };

  // Save drafts simulation
  const handleSaveDraft = () => {
    setSavingDraft(true);
    setTimeout(() => {
      setSavingDraft(false);
      setDraftSavedMsg(`Draft successfully saved locally at ${new Date().toLocaleTimeString()}!`);
      setTimeout(() => setDraftSavedMsg(''), 4000);
    }, 1000);
  };

  // Complete Audit submission
  const handleSubmitForm = () => {
    setSubmitting(true);
    setTimeout(() => {
      const finalizedList: SubmissionItem[] = (Object.values(itemsMap) as SubmissionItem[]).map(item => {
        const currentCount = item.currentCount || 0;
        const finalOrder = item.finalOrder || 0;
        return {
          ...item,
          currentCount,
          finalOrder,
          total: currentCount + finalOrder,
          shiftSlot,
          managerOnDuty
        };
      });

      const subId = `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
      const submission: FormSubmission = {
        id: subId,
        formId: form.id,
        formTitle: form.title,
        locationCode: form.locationCode,
        userId: currentUser.id,
        userName: operatorName,
        timestamp: new Date().toISOString(),
        items: finalizedList,
        notes: notes,
        managerOnDuty,
        shiftSlot
      };

      sampleSubmissions.unshift(submission);
      setSubmitting(false);
      onSubmitSuccess(subId);
    }, 1500);
  };

  // Get displayed items based on active section and search filter
  const displayedItems = useMemo(() => {
    let list: SubmissionItem[] = [];
    if (activeSection === 'ALL') {
      // Gather all items across all sections in section order
      const seenIds = new Set<string>();
      form.sections.forEach(sec => {
        sec.itemIds.forEach(id => {
          if (!seenIds.has(id) && itemsMap[id]) {
            seenIds.add(id);
            list.push(itemsMap[id]);
          }
        });
      });
    } else {
      const secObj = form.sections.find(s => s.name === activeSection);
      if (secObj) {
        secObj.itemIds.forEach(id => {
          if (itemsMap[id]) list.push(itemsMap[id]);
        });
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(it => 
        it.name.toLowerCase().includes(q) || 
        it.category.toLowerCase().includes(q) ||
        it.unit.toLowerCase().includes(q)
      );
    }
    return list;
  }, [form, activeSection, itemsMap, searchQuery]);

  // Summary statistics across active items
  const stats = useMemo(() => {
    const allItems = Object.values(itemsMap) as SubmissionItem[];
    const totalCounted = allItems.filter(i => (i.currentCount || 0) > 0 || i.isChecked).length;
    const totalSuggested = allItems.reduce((acc, i) => acc + (i.suggestedOrder || 0), 0);
    const totalFinal = allItems.reduce((acc, i) => acc + (i.finalOrder || 0), 0);
    return {
      totalItems: allItems.length,
      totalCounted,
      totalSuggested,
      totalFinal
    };
  }, [itemsMap]);

  // Export to authentic Excel (.xlsx) file
  const handleExportExcel = () => {
    const exportList = (Object.values(itemsMap) as SubmissionItem[]).map(i => ({
      name: i.name,
      unit: i.unit,
      inv: i.currentCount,
      par: i.parLevel,
      ord: i.suggestedOrder,
      finalOrd: i.finalOrder,
      wlkIn: i.wlkInCount,
      barCount: i.barCount,
      category: i.category,
      notes: i.co2GaugePct !== undefined ? `CO2 Gauge: ${i.co2GaugePct}%` : ''
    }));

    exportAnitaSheetToExcel(
      form.title,
      form.locationCode,
      managerOnDuty,
      operatorName,
      dateStr,
      shiftSlot,
      exportList,
      isBarSheet
    );
  };

  // Print authentic physical store sheet
  const handlePrintStoreSheet = () => {
    let rowsHtml = '';
    const allItems = Object.values(itemsMap) as SubmissionItem[];

    if (isBarSheet) {
      allItems.forEach((item, idx) => {
        const isBottle6Rule = item.category === 'Beer Bottles' || item.name.includes('CORONA') || item.name.includes('MODELO NEGRA');
        const ruleNote = isBottle6Rule ? '<span style="font-size:8px;color:#d97706;display:block;">(Walk-In: sets of 6 only)</span>' : '';
        const wlkIn = item.wlkInCount || 0;
        const bar = item.barCount || 0;
        const tot = wlkIn + bar;

        rowsHtml += `
          <tr>
            <td class="center" style="font-family:monospace;width:30px;">${idx + 1}</td>
            <td><strong>${item.name}</strong>${ruleNote}</td>
            <td class="center" style="font-family:monospace;">${item.unit}</td>
            <td class="green-cell">${wlkIn > 0 ? wlkIn : ''}</td>
            <td class="green-cell">${bar > 0 ? bar : ''}</td>
            <td class="center" style="font-weight:bold;">${tot > 0 ? tot : ''}</td>
            <td class="center" style="font-family:monospace;">${item.parLevel}</td>
            <td class="center" style="font-weight:bold;color:#b45309;">${item.suggestedOrder > 0 ? item.suggestedOrder : '0'}</td>
            <td class="center">${item.finalOrder > 0 ? item.finalOrder : ''}</td>
            <td class="center">${item.isChecked ? '✔' : ''}</td>
          </tr>
        `;
      });

      const bodyHtml = `
        <h1>Anita's New Mexican Style Mexican Food</h1>
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;text-transform:uppercase;">
          ${form.title}
        </div>
        <div class="meta-header">
          <div><strong>STORE:</strong> ${form.locationCode} &nbsp;|&nbsp; <strong>NAME:</strong> ${operatorName} &nbsp;|&nbsp; <strong>MOD:</strong> ${managerOnDuty}</div>
          <div><strong>DATE:</strong> ${dateStr} &nbsp;|&nbsp; <strong>SHIFT:</strong> ${shiftSlot}</div>
        </div>

        <div class="banner-notice">
          ⚠️ ONLY FILL IN CELLS HIGHLIGHTED IN GREEN! &nbsp;|&nbsp; WALK-IN COOLER RULE: ONLY SETS OF 6 BOTTLES (6, 12, 18, 24...)
        </div>

        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>Item Name</th>
              <th class="center">Unit</th>
              <th class="center" style="background:#d1e7dd!important;color:#0a3622;">WLK-IN</th>
              <th class="center" style="background:#d1e7dd!important;color:#0a3622;">BAR / C-O</th>
              <th class="center">TOT</th>
              <th class="center">PAR</th>
              <th class="center">ORD</th>
              <th class="center">FINAL</th>
              <th class="center">✔</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Manager on Duty Signature: <span class="sig-line"></span></div>
          <div>Date / Time Verified: <span class="sig-line" style="width:120px;"></span></div>
        </div>
      `;

      printHtmlViaIframe(form.title, bodyHtml);
    } else {
      // Standard / Bi-Weekly & Monthly / Catering
      allItems.forEach((item, idx) => {
        rowsHtml += `
          <tr>
            <td class="center" style="font-family:monospace;width:30px;">${idx + 1}</td>
            <td><strong>${item.name}</strong></td>
            <td class="center" style="font-family:monospace;">${item.unit}</td>
            <td class="green-cell">${item.currentCount > 0 ? item.currentCount : ''}</td>
            <td class="center" style="font-family:monospace;">${item.parLevel}</td>
            <td class="center" style="font-weight:bold;color:#b45309;">${item.suggestedOrder > 0 ? item.suggestedOrder : '0'}</td>
            <td class="center">${item.finalOrder > 0 ? item.finalOrder : ''}</td>
            <td class="center">${item.isChecked ? '✔' : ''}</td>
            <td class="center">${item.isReceived ? '✔' : ''}</td>
          </tr>
        `;
      });

      const bodyHtml = `
        <h1>Anita's New Mexican Style Mexican Food</h1>
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px;text-transform:uppercase;">
          ${form.title}
        </div>
        <div class="meta-header">
          <div><strong>STORE:</strong> ${form.locationCode} &nbsp;|&nbsp; <strong>NAME:</strong> ${operatorName} &nbsp;|&nbsp; <strong>MOD:</strong> ${managerOnDuty}</div>
          <div><strong>DATE:</strong> ${dateStr} &nbsp;|&nbsp; <strong>SHIFT:</strong> ${shiftSlot}</div>
        </div>

        <div class="banner-notice">
          🟢 ONLY FILL IN CELLS HIGHLIGHTED IN GREEN! (INV ON-HAND)
        </div>

        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th>Item Name</th>
              <th class="center">Unit</th>
              <th class="center" style="background:#d1e7dd!important;color:#0a3622;">INV</th>
              <th class="center">PAR</th>
              <th class="center">ORD</th>
              <th class="center">FINAL</th>
              <th class="center">COUNT ✔</th>
              <th class="center">REC ✔</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Manager on Duty Signature: <span class="sig-line"></span></div>
          <div>Date / Time Verified: <span class="sig-line" style="width:120px;"></span></div>
        </div>
      `;

      printHtmlViaIframe(form.title, bodyHtml);
    }
  };

  return (
    <div className="space-y-5 font-sans text-gray-800">
      
      {/* 1. REAL-WORLD STORE SHEET HEADER BLOCK (Identical to Anita's physical store clipboard sheets) */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        
        {/* Top brand & title row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded uppercase tracking-wider">
                Anita's Store Order Sheet
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/70 border border-amber-600/30 px-2 py-0.5 rounded">
                STORE: {form.locationCode}
              </span>
            </div>
            <h2 className="text-xl font-black font-display text-white mt-1.5">{form.title}</h2>
            <p className="text-xs text-slate-300">
              Checklist Cycle: <span className="font-semibold text-amber-400">{form.frequency}</span> • Due: <span className="text-red-400 font-semibold">{form.dueDate} at {form.dueTime}</span>
            </p>
          </div>

          {/* Quick Actions (Print, Export to Excel, View Mode Toggle) */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Mode Toggle: Store Sheet vs Touch Cards */}
            <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setViewMode('sheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'sheet' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Exact Excel Store Grid Format"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Store Sheet Grid</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'cards' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Product Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
            </div>

            {/* Print Blank / Completed Sheet button */}
            <button
              onClick={handlePrintStoreSheet}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Print store inventory form to clipboard"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Sheet</span>
            </button>

            {/* Export to Excel (.xlsx) button */}
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              title="Download Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export .XLSX</span>
            </button>
          </div>
        </div>

        {/* Store Metadata Inputs: NAME, MOD, DATE, TIME OF INV / SHIFT */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          
          {/* Operator Name */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Operator (NAME)
            </label>
            <input 
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500"
              placeholder="Employee taking count"
            />
          </div>

          {/* Manager on Duty */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Manager On Duty (MOD)
            </label>
            <input 
              type="text"
              value={managerOnDuty}
              onChange={(e) => setManagerOnDuty(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2 py-1 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500"
              placeholder="Manager on duty"
            />
          </div>

          {/* Date of Inventory */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Date (DATE)
            </label>
            <input 
              type="text"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2 py-1 rounded-lg text-xs font-semibold font-mono focus:outline-none focus:border-amber-500"
              placeholder="MM/DD/YYYY"
            />
          </div>

          {/* Shift Slot Selector (Breakfast, Lunch, Dinner) */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block flex items-center justify-between">
              <span>Time Slot / Shift</span>
              <Clock className="w-3 h-3 text-amber-400" />
            </label>
            <select
              value={shiftSlot}
              onChange={(e) => setShiftSlot(e.target.value as any)}
              className="w-full bg-slate-950/70 border border-slate-700 text-amber-300 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="Breakfast">Breakfast (Open – 10:59 am)</option>
              <option value="Lunch">Lunch (11:00 am – 3:59 pm)</option>
              <option value="Dinner">Dinner (4:00 pm – Close)</option>
            </select>
          </div>
        </div>

        {/* Authentic Store Instructions & Rules Banner */}
        <div className="space-y-2">
          {/* Green Cell Directive Banner */}
          <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-2 rounded-xl flex items-center justify-between font-mono font-bold">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
              <span>INSTRUCTION: ONLY FILL IN CELLS HIGHLIGHTED IN GREEN! (INV ON-HAND)</span>
            </div>
            <span className="hidden sm:inline text-[10px] text-emerald-300/80">
              Formula: ORD = MAX(0, PAR - INV)
            </span>
          </div>

          {/* Special Store Notice: 6-Bottle Rule for Walk-In Cooler (for Bar Sheets) */}
          {isBarSheet && (
            <div className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs px-4 py-2 rounded-xl flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>COOLER RULE:</strong> Only sets of 6 bottles are allowed to be kept in the walk-in cooler (6, 12, 18, 24...)
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Voice feedback toast alert */}
      {draftSavedMsg && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs p-3.5 rounded-xl flex items-center justify-between font-mono font-semibold animate-pulse shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <p>{draftSavedMsg}</p>
          </div>
        </div>
      )}

      {/* 2. STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Products</span>
          <span className="text-lg font-black text-slate-800 mt-0.5 block">{stats.totalItems}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] text-emerald-800 uppercase font-bold block">Items Counted</span>
          <span className="text-lg font-black text-emerald-700 mt-0.5 block">
            {stats.totalCounted} <span className="text-xs text-emerald-600 font-normal">/ {stats.totalItems}</span>
          </span>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] text-amber-800 uppercase font-bold block">Sug Order Units</span>
          <span className="text-lg font-black text-amber-700 mt-0.5 block">{stats.totalSuggested}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Final Order Total</span>
          <span className="text-lg font-black text-slate-900 mt-0.5 block">{stats.totalFinal}</span>
        </div>
      </div>

      {/* 3. SECTION TABS & SEARCH BAR */}
      <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Section Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveSection('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSection === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Sections ({Object.keys(itemsMap).length})
          </button>

          {form.sections.map(section => {
            const isActive = section.name === activeSection;
            return (
              <button
                key={section.name}
                onClick={() => setActiveSection(section.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{section.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {section.itemIds.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Item Search Input */}
        <div className="relative md:w-72">
          <input
            type="text"
            placeholder="Search items or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 transition"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN VIEW: SPREADSHEET STORE GRID vs CARDS */}
      {viewMode === 'sheet' ? (
        /* EXACT SPREADSHEET TABLE GRID REPLICA */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[10px] text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12 font-bold">#</th>
                  <th className="py-2.5 px-3 min-w-[200px] font-bold">ITEM NAME</th>
                  <th className="py-2.5 px-2 text-center w-20 font-bold">UNIT</th>
                  
                  {isBarSheet ? (
                    <>
                      {/* Walk-in Cooler Green input header */}
                      <th className="py-2.5 px-2 text-center w-24 bg-emerald-100/90 text-emerald-950 font-black border-x border-emerald-200">
                        WLK-IN 🟢
                      </th>
                      {/* Bar / Carry Out Green input header */}
                      <th className="py-2.5 px-2 text-center w-24 bg-emerald-100/90 text-emerald-950 font-black border-r border-emerald-200">
                        BAR/CO 🟢
                      </th>
                      <th className="py-2.5 px-2 text-center w-20 font-bold">TOT</th>
                    </>
                  ) : (
                    /* Standard On-Hand Count Green cell header */
                    <th className="py-2.5 px-2 text-center w-28 bg-emerald-100/90 text-emerald-950 font-black border-x border-emerald-200">
                      INV 🟢
                    </th>
                  )}

                  <th className="py-2.5 px-2 text-center w-20 font-bold">PAR</th>
                  <th className="py-2.5 px-2 text-center w-24 font-bold text-amber-800 bg-amber-50/50">ORD</th>
                  <th className="py-2.5 px-2 text-center w-24 font-bold">FINAL</th>
                  <th className="py-2.5 px-2 text-center w-20 font-bold">COUNT ✔</th>
                  
                  {!isBarSheet && (
                    <th className="py-2.5 px-2 text-center w-20 font-bold">REC ✔</th>
                  )}
                  {isCateringSheet && (
                    <th className="py-2.5 px-2 text-center w-20 font-bold">B/O</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-150">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={isBarSheet ? 10 : 9} className="py-12 text-center text-slate-400">
                      No products found matching "{searchQuery}" in {activeSection}
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, index) => {
                    const isKeg = item.category === 'Beer Draft' || item.unit.includes('KEG');
                    const isBottle = item.category === 'Beer Bottles';
                    const isCO2 = item.itemId === 'co2-1' || item.category === 'Gas Systems';
                    const isEmpties = item.itemId === 'keg-10';

                    // 6-bottle rule validation: walk-in count must be multiple of 6
                    const wlkInInvalid = isBottle && (item.wlkInCount || 0) > 0 && (item.wlkInCount || 0) % 6 !== 0;

                    return (
                      <tr 
                        key={item.itemId} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          item.isChecked ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        {/* 1. Row Index */}
                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                          {index + 1}
                        </td>

                        {/* 2. Item Name & Badges */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">
                            {item.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              {item.category}
                            </span>
                            
                            {/* 6-bottle rule notice on bottles */}
                            {isBottle && (
                              <span className="text-[8px] font-mono font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-200">
                                6-Pack Rule
                              </span>
                            )}

                            {/* Empty kegs reminder */}
                            {isEmpties && (
                              <span className="text-[8px] font-mono font-bold bg-red-100 text-red-800 px-1.5 py-0.2 rounded border border-red-200 animate-pulse">
                                Return on Delivery
                              </span>
                            )}

                            {/* Walk-in warning banner if not multiple of 6 */}
                            {wlkInInvalid && (
                              <span className="text-[8px] font-mono font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">
                                Walk-in sets of 6 only!
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Unit */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 font-semibold">
                          {item.unit}
                        </td>

                        {/* 4. Store Sheet Editable Inputs (GREEN HIGHLIGHTED CELLS) */}
                        {isBarSheet ? (
                          <>
                            {/* WLK-IN (Green Cell) */}
                            <td className={`py-1.5 px-2 text-center border-x border-emerald-100 ${
                              wlkInInvalid ? 'bg-amber-100/90' : 'bg-emerald-50/90'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step={isKeg ? "0.5" : "1"}
                                value={item.wlkInCount === 0 ? '' : item.wlkInCount}
                                onChange={(e) => handleWlkInChange(item.itemId, e.target.value)}
                                placeholder="0"
                                className={`w-18 text-center font-mono font-bold text-xs py-1 rounded-lg border focus:bg-white focus:outline-none transition ${
                                  wlkInInvalid
                                    ? 'bg-amber-50 text-amber-900 border-amber-400 focus:border-amber-600'
                                    : 'bg-emerald-100/80 text-emerald-950 border-emerald-400 focus:border-emerald-600'
                                }`}
                              />
                            </td>

                            {/* BAR / C-O (Green Cell) */}
                            <td className="py-1.5 px-2 text-center bg-emerald-50/90 border-r border-emerald-100">
                              <input
                                type="number"
                                min="0"
                                step={isKeg ? "0.5" : "1"}
                                value={item.barCount === 0 ? '' : item.barCount}
                                onChange={(e) => handleBarCountChange(item.itemId, e.target.value)}
                                placeholder="0"
                                className="w-18 text-center font-mono font-bold text-xs bg-emerald-100/80 text-emerald-950 border border-emerald-400 focus:bg-white focus:border-emerald-600 py-1 rounded-lg focus:outline-none transition"
                              />
                            </td>

                            {/* TOTAL (Auto-calculated: WLK-IN + BAR) */}
                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-900 text-xs">
                              {item.currentCount}
                            </td>
                          </>
                        ) : isCO2 ? (
                          /* CO2 Gauge Percentage Input */
                          <td className="py-1.5 px-2 text-center bg-emerald-50/90 border-x border-emerald-100">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.co2GaugePct ?? 75}
                                onChange={(e) => handleCo2GaugeChange(item.itemId, e.target.value)}
                                className="w-16 text-center font-mono font-bold text-xs bg-emerald-100/80 text-emerald-950 border border-emerald-400 focus:bg-white focus:border-emerald-600 py-1 rounded-lg focus:outline-none"
                              />
                              <span className="font-mono text-[10px] text-emerald-900 font-bold">%</span>
                            </div>
                          </td>
                        ) : (
                          /* Standard On-Hand Physical Inventory (INV) (GREEN CELL) */
                          <td className="py-1.5 px-2 text-center bg-emerald-50/90 border-x border-emerald-100">
                            <input
                              type="number"
                              min="0"
                              value={item.currentCount === 0 ? '' : item.currentCount}
                              onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                              placeholder="0"
                              className="w-20 text-center font-mono font-bold text-xs bg-emerald-100/80 text-emerald-950 border-2 border-emerald-400 focus:bg-white focus:border-emerald-600 py-1 rounded-lg focus:outline-none transition shadow-2xs"
                            />
                          </td>
                        )}

                        {/* 5. Standard Par Level */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700 text-xs">
                          {item.parLevel}
                        </td>

                        {/* 6. Suggested Order (ORD = MAX(0, PAR - INV)) */}
                        <td className="py-2 px-2 text-center font-mono font-black text-amber-700 text-xs bg-amber-50/30">
                          {item.suggestedOrder > 0 ? (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-mono">
                              +{item.suggestedOrder}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* 7. Final Order (Editable override) */}
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.finalOrder === 0 ? '' : item.finalOrder}
                            onChange={(e) => handleFinalOrderChange(item.itemId, e.target.value)}
                            placeholder="0"
                            className="w-18 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-300 focus:bg-white focus:border-amber-500 py-1 rounded-lg focus:outline-none transition"
                          />
                        </td>

                        {/* 8. Interactive Count ✔ Checkmark */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleItemChecked(item.itemId)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition cursor-pointer ${
                              item.isChecked
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                                : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-3" />
                          </button>
                        </td>

                        {/* 9. Received Checkmark (REC ✔) */}
                        {!isBarSheet && (
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleItemReceived(item.itemId)}
                              className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition cursor-pointer ${
                                item.isReceived
                                  ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                                  : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-3" />
                            </button>
                          </td>
                        )}

                        {/* 10. Back-Order Checkbox (B/O) for Catering */}
                        {isCateringSheet && (
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={!!item.isBackOrder}
                              onChange={() => toggleBackOrder(item.itemId)}
                              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ALTERNATIVE PRODUCT CARDS VIEW (For touch / mobile) */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedItems.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white border border-dashed rounded-2xl text-slate-400">
              No matching products in "{activeSection}"
            </div>
          ) : (
            displayedItems.map(item => (
              <div 
                key={item.itemId}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                    <img
                      src={item.photoUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=120&q=80'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-bold text-slate-900 text-xs truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase font-bold">
                      Unit: {item.unit} • {item.category}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleItemChecked(item.itemId)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                      item.isChecked 
                        ? 'bg-emerald-500 border-emerald-600 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-3" />
                  </button>
                </div>

                {/* Par and Sug Order stats */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Par</span>
                    <span className="font-black text-slate-800 text-xs mt-0.5">{item.parLevel}</span>
                  </div>
                  <div className="p-1.5 bg-amber-50 border border-amber-200/60 rounded-lg">
                    <span className="block text-[8px] text-amber-700 font-bold uppercase">Sug Order</span>
                    <span className="font-black text-amber-600 text-xs mt-0.5">+{item.suggestedOrder}</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Expected</span>
                    <span className="font-black text-slate-800 text-xs mt-0.5">{item.total}</span>
                  </div>
                </div>

                {/* Green On-Hand Count Cell */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-emerald-800 font-mono block">
                      INV (On-Hand) 🟢
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.currentCount === 0 ? '' : item.currentCount}
                      onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                      className="w-full text-center font-mono font-bold text-sm bg-emerald-100/90 text-emerald-950 border-2 border-emerald-400 p-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-400 font-mono block">
                      Final Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={item.finalOrder === 0 ? '' : item.finalOrder}
                      onChange={(e) => handleFinalOrderChange(item.itemId, e.target.value)}
                      className="w-full text-center font-mono font-bold text-sm bg-slate-50 border border-slate-200 p-1.5 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. NOTES & SUBMISSION CONTROLS */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Store Operational Notes & Shift Observations
          </label>
          <textarea
            rows={2}
            placeholder="Add any store notes here (e.g., walk-in cooler temperature normal, extra flour tortillas needed for weekend catering...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 text-xs bg-slate-50 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Back button */}
          <button
            onClick={onBack}
            className="sm:w-1/4 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer transition text-center"
          >
            Cancel & Return
          </button>

          {/* Save Draft */}
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft || submitting}
            className="sm:w-1/3 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 px-5 py-3 rounded-xl text-xs uppercase cursor-pointer tracking-wider active:scale-95 transition disabled:opacity-50"
          >
            {savingDraft ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Saving Draft...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-slate-500" />
                <span>Save Draft</span>
              </>
            )}
          </button>

          {/* Final Submit & Transmit Order */}
          <button
            onClick={handleSubmitForm}
            disabled={submitting || savingDraft}
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-3.5 rounded-xl text-xs uppercase cursor-pointer tracking-wider shadow-md hover:shadow-amber-200 active:scale-[0.98] transition disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Transmitting Order to Commissary...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-3 text-slate-950" />
                <span>Submit & Transmit Store Order</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
