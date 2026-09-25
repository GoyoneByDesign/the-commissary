import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryForm, SubmissionItem, FormSubmission } from '../types';
import { sampleItems, sampleSubmissions } from '../data/sampleData';
import { anitasFoodCM1Items, anitasFoodCM2Items } from '../data/anitasSheetData';
import { printHtmlViaIframe } from '../utils/printHelper';
import { exportAnitaSheetToExcel } from '../utils/excelExport';
import { 
  Save, Check, Search, Filter, Camera, RefreshCw, Sparkles, 
  Volume2, VolumeX, Mic, MicOff, Printer, FileSpreadsheet, LayoutGrid, Table as TableIcon,
  AlertTriangle, Clock, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle,
  ArrowLeft, ArrowRight, Plus, Minus
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
  // 🎯 Counting Phase: 'counting' (Fast count showing ONLY Item Name & Count) vs 'review' (Everything shown for checking)
  const [countingPhase, setCountingPhase] = useState<'counting' | 'review'>('counting');

  // 🎙️ Input method during counting: 'manual' (keypad/touch/buttons) vs 'voice' (AI speech)
  const [countInputMethod, setCountInputMethod] = useState<'manual' | 'voice'>('manual');

  // 🔊 Voice recognition & AI speech engine states
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedbackMsg, setVoiceFeedbackMsg] = useState('');
  const [lastCountedItemId, setLastCountedItemId] = useState<string | null>(null);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [continuousListening, setContinuousListening] = useState(false);
  const [aiParsingInProgress, setAiParsingInProgress] = useState(false);
  const recognitionRef = useRef<any>(null);

  // View mode in Review: 'sheet' (Adaptive Mobile List on phone / Grid on tablet), 'cards' (Touch Cards), or 'table' (Raw Grid Table)
  const [viewMode, setViewMode] = useState<'sheet' | 'cards' | 'table'>('sheet');

  // Active section or 'ALL'
  const [activeSection, setActiveSection] = useState<string>(form.sections[0]?.name || 'BI-WEEKLY ORDER');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState('');

  // Store sheet header metadata matching Anita's physical forms
  const [managerOnDuty, setManagerOnDuty] = useState(currentUser.name || 'Sarah Jenkins');
  const [employeeEntering, setEmployeeEntering] = useState(currentUser.name || 'Sarah Jenkins');
  const [invTakenBy, setInvTakenBy] = useState('David Ramirez');
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
  const isBarBeerSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id === 'f-bar-beer' || (id.includes('bar') && t.includes('draft beer'));
  }, [form]);

  const isBarSheet = isBarBeerSheet;

  const isCateringSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id.includes('catering') || t.includes('catering');
  }, [form]);

  const isFoodSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id.includes('food') || id.includes('cm') || t.includes('food') || t.includes('kitchen') || t.includes('cm 1');
  }, [form]);

  const isPackagingSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id.includes('packaging') || t.includes('packaging') || t.includes('paper');
  }, [form]);

  const isPansSheet = useMemo(() => {
    const t = form.title.toLowerCase();
    const id = form.id.toLowerCase();
    return id.includes('pans') || t.includes('pan') || t.includes('lids');
  }, [form]);

  // Local state holding the physical count items
  const [itemsMap, setItemsMap] = useState<{ [itemId: string]: SubmissionItem }>({});

  // Dynamic column detection based on item properties
  const hasSizeColumn = useMemo(() => {
    return (Object.values(itemsMap) as SubmissionItem[]).some(i => !!i.size && i.size !== '—');
  }, [itemsMap]);

  const hasCasePackColumn = useMemo(() => {
    return isPackagingSheet || form.id.includes('food-weekly') || (Object.values(itemsMap) as SubmissionItem[]).some(i => !!i.casePackDetails && i.casePackDetails !== '—');
  }, [itemsMap, isPackagingSheet, form.id]);

  const hasItemCodeColumn = useMemo(() => {
    return isPackagingSheet || form.id.includes('food-weekly') || form.id.includes('liquor') || (Object.values(itemsMap) as SubmissionItem[]).some(i => !!i.itemCode && i.itemCode !== '—');
  }, [itemsMap, isPackagingSheet, form.id]);

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
            size: baseItem.size,
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
            co2GaugePct: id === 'co2-1' ? 75 : undefined,
            itemCode: baseItem.itemCode,
            casePackDetails: baseItem.casePackDetails,
            requiresDating: baseItem.requiresDating
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

  // ➕ Quick increment / decrement helpers for Fast Counting Mode
  const handleIncrementCount = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.currentCount || 0;
    handleCountChange(itemId, String(Math.max(0, cur + step)));
  };

  const handleDecrementCount = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.currentCount || 0;
    handleCountChange(itemId, String(Math.max(0, cur - step)));
  };

  const handleIncrementWlkIn = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.wlkInCount || 0;
    handleWlkInChange(itemId, String(Math.max(0, cur + step)));
  };

  const handleDecrementWlkIn = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.wlkInCount || 0;
    handleWlkInChange(itemId, String(Math.max(0, cur - step)));
  };

  const handleIncrementBar = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.barCount || 0;
    handleBarCountChange(itemId, String(Math.max(0, cur + step)));
  };

  const handleDecrementBar = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.barCount || 0;
    handleBarCountChange(itemId, String(Math.max(0, cur - step)));
  };

  // 🔊 Audio speak-back confirmation for hands-free counting
  const speakFeedback = (text: string) => {
    if (!speechSynthesisEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error", e);
    }
  };

  // 🎙️ Process voice input through smart local NLP + Gemini AI fallback
  const handleProcessSpokenText = async (rawText: string) => {
    if (!rawText.trim()) return;
    setVoiceTranscript(rawText);
    const lower = rawText.toLowerCase().trim();
    const itemsList = Object.values(itemsMap) as SubmissionItem[];

    // 1. Dual Beer matching (walk-in and bar)
    const walkInBarRegex = /(.*?)(?:walk\s*in|walkin)\s*(\d+(?:\.\d+)?).*?(?:bar|front)\s*(\d+(?:\.\d+)?)/i;
    const wlkMatch = lower.match(walkInBarRegex);
    if (wlkMatch) {
      const phraseItem = wlkMatch[1].trim();
      const wlkVal = parseFloat(wlkMatch[2]);
      const barVal = parseFloat(wlkMatch[3]);
      const target = itemsList.find(i => 
        i.name.toLowerCase().includes(phraseItem) || phraseItem.includes(i.name.toLowerCase())
      );
      if (target) {
        applyVoiceCount(target.itemId, wlkVal + barVal, wlkVal, barVal);
        return;
      }
    }

    // 2. Standard Pattern: "Item Name [number]" or "[number] Item Name"
    let matchedItem: SubmissionItem | undefined;
    let foundCount: number | null = null;

    for (const item of itemsList) {
      const cleanItemName = item.name.toLowerCase().replace(/[^\w\s]/g, '');
      const words = cleanItemName.split(' ').filter(w => w.length > 2);
      if (lower.includes(cleanItemName) || (words.length > 0 && words.every(w => lower.includes(w)))) {
        const numMatches = lower.match(/\b\d+(?:\.\d+)?\b/g);
        if (numMatches && numMatches.length > 0) {
          foundCount = parseFloat(numMatches[numMatches.length - 1]);
          matchedItem = item;
          break;
        }
      }
    }

    if (matchedItem && foundCount !== null) {
      applyVoiceCount(matchedItem.itemId, foundCount);
      return;
    }

    // 3. Fallback to Gemini AI Voice Understanding endpoint
    setAiParsingInProgress(true);
    try {
      const res = await fetch('/api/ai/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spokenText: rawText,
          availableItemNames: itemsList.map(i => i.name)
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          data.matches.forEach((m: any) => {
            const target = itemsList.find(i => 
              i.name.toLowerCase() === m.matchedItemName.toLowerCase() ||
              i.name.toLowerCase().includes(m.matchedItemName.toLowerCase())
            );
            if (target && m.count !== null && m.count !== undefined) {
              applyVoiceCount(target.itemId, m.count, m.wlkInCount, m.barCount);
            }
          });
          setAiParsingInProgress(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Gemini voice parse fallback error", e);
    }
    setAiParsingInProgress(false);
    setVoiceFeedbackMsg(`Could not recognize count for: "${rawText}". Try: "Item Name [number]"`);
  };

  const applyVoiceCount = (itemId: string, count: number, wlkIn?: number | null, bar?: number | null) => {
    const item = itemsMap[itemId];
    if (!item) return;

    if (wlkIn !== null && wlkIn !== undefined && bar !== null && bar !== undefined) {
      const total = wlkIn + bar;
      const suggested = Math.max(0, item.parLevel - total);
      setItemsMap(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          wlkInCount: wlkIn,
          barCount: bar,
          currentCount: total,
          suggestedOrder: suggested,
          finalOrder: suggested,
          total: total + suggested,
          isChecked: true
        }
      }));
      setLastCountedItemId(itemId);
      const msg = `✓ Set ${item.name}: Walk-in ${wlkIn}, Bar ${bar} (Total ${total})`;
      setVoiceFeedbackMsg(msg);
      speakFeedback(`${item.name}: set to ${total}`);
    } else {
      const suggested = Math.max(0, item.parLevel - count);
      setItemsMap(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          currentCount: count,
          suggestedOrder: suggested,
          finalOrder: suggested,
          total: count + suggested,
          isChecked: true
        }
      }));
      setLastCountedItemId(itemId);
      const msg = `✓ Set ${item.name} to ${count}`;
      setVoiceFeedbackMsg(msg);
      speakFeedback(`${item.name}: ${count}`);
    }
  };

  // Browser Speech Recognition Lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = continuousListening;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsVoiceListening(true);
      setVoiceFeedbackMsg("Listening hands-free... Say item name and count (e.g. 'Tortilla 15')");
    };

    rec.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
      handleProcessSpokenText(transcript);
    };

    rec.onerror = (e: any) => {
      console.warn("Speech error:", e.error);
      if (e.error !== 'no-speech') {
        setIsVoiceListening(false);
      }
    };

    rec.onend = () => {
      if (countInputMethod === 'voice' && continuousListening) {
        try {
          rec.start();
        } catch {}
      } else {
        setIsVoiceListening(false);
      }
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch {}
    };
  }, [continuousListening, countInputMethod, itemsMap]);

  const toggleVoiceListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser speech recognition is not supported in this frame. You can use Manual Count or the quick test simulation chips!");
      return;
    }

    if (isVoiceListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsVoiceListening(false);
      setVoiceFeedbackMsg("Voice recognition paused. Tap mic to resume.");
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn("Speech start warning:", e);
        }
      }
    }
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
        userName: employeeEntering,
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
    const exportList = (Object.values(itemsMap) as SubmissionItem[]).map(i => {
      const base = sampleItems.find(s => s.id === i.itemId);
      const isDateReq = base?.name.startsWith('*') || (anitasFoodCM1Items.some(c => c.id === i.itemId && c.requiresDating) || anitasFoodCM2Items.some(c => c.id === i.itemId && c.requiresDating));
      return {
        name: i.name,
        unit: i.unit,
        size: i.size || base?.size,
        inv: i.currentCount,
        par: i.parLevel,
        ord: i.suggestedOrder,
        finalOrd: i.finalOrder,
        wlkIn: i.wlkInCount,
        barCount: i.barCount,
        category: i.category,
        itemCode: i.itemCode || base?.itemCode,
        casePackDetails: i.casePackDetails || base?.packagingDetails,
        requiresDating: isDateReq,
        notes: i.co2GaugePct !== undefined ? `CO2 Gauge: ${i.co2GaugePct}%` : ''
      };
    });

    exportAnitaSheetToExcel(
      form.title,
      form.locationCode,
      managerOnDuty,
      employeeEntering,
      dateStr,
      shiftSlot,
      exportList,
      isBarBeerSheet,
      isFoodSheet,
      isPackagingSheet
    );
  };

  // Print authentic physical store sheet
  const handlePrintStoreSheet = () => {
    let rowsHtml = '';
    const allItems = Object.values(itemsMap) as SubmissionItem[];

    if (isBarBeerSheet) {
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
          <div><strong>STORE:</strong> ${form.locationCode} &nbsp;|&nbsp; <strong>CASHIER/MOD:</strong> ${managerOnDuty} &nbsp;|&nbsp; <strong>ENTERING:</strong> ${employeeEntering}</div>
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
    } else if (isPackagingSheet) {
      allItems.forEach((item, idx) => {
        const base = sampleItems.find(s => s.id === item.itemId);
        rowsHtml += `
          <tr>
            <td class="center" style="font-family:monospace;width:25px;">${idx + 1}</td>
            <td class="center" style="font-family:monospace;font-size:9.5px;">${base?.packagingDetails || ''}</td>
            <td><strong>${item.name}</strong></td>
            <td class="center" style="font-family:monospace;">${item.unit}</td>
            <td class="green-cell">${item.currentCount > 0 ? item.currentCount : ''}</td>
            <td class="center" style="font-family:monospace;">${item.parLevel}</td>
            <td class="center" style="font-weight:bold;color:#b45309;">${item.suggestedOrder > 0 ? item.suggestedOrder : '0'}</td>
            <td class="center">${item.finalOrder > 0 ? item.finalOrder : ''}</td>
            <td class="center" style="font-family:monospace;font-weight:bold;">${base?.itemCode || ''}</td>
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
          <div><strong>STORE:</strong> ${form.locationCode} &nbsp;|&nbsp; <strong>CASHIER/MOD:</strong> ${managerOnDuty} &nbsp;|&nbsp; <strong>ENTERING:</strong> ${employeeEntering} &nbsp;|&nbsp; <strong>INV BY:</strong> ${invTakenBy}</div>
          <div><strong>DATE:</strong> ${dateStr} &nbsp;|&nbsp; <strong>SHIFT:</strong> ${shiftSlot}</div>
        </div>

        <div class="banner-notice">
          🟢 ONLY FILL IN CELLS HIGHLIGHTED IN GREEN! (INV ON-HAND)
        </div>

        <table>
          <thead>
            <tr>
              <th class="center">#</th>
              <th class="center">CS PACKED</th>
              <th>Item Name</th>
              <th class="center">Unit</th>
              <th class="center" style="background:#d1e7dd!important;color:#0a3622;">INV</th>
              <th class="center">PAR</th>
              <th class="center">ORD</th>
              <th class="center">FINAL</th>
              <th class="center">CODE</th>
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
    } else if (isFoodSheet) {
      allItems.forEach((item, idx) => {
        const base = sampleItems.find(s => s.id === item.itemId);
        const isDateReq = base?.name.startsWith('*') || (anitasFoodCM1Items.some(c => c.id === item.itemId && c.requiresDating) || anitasFoodCM2Items.some(c => c.id === item.itemId && c.requiresDating));
        const nameDisplay = isDateReq ? `* <strong>${item.name}</strong> <span style="font-size:8px;color:#d97706;">(Date at Store)</span>` : `<strong>${item.name}</strong>`;
        rowsHtml += `
          <tr>
            <td class="center" style="font-family:monospace;width:30px;">${idx + 1}</td>
            <td>${nameDisplay}</td>
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
          <div><strong>STORE:</strong> ${form.locationCode} &nbsp;|&nbsp; <strong>CASHIER/MOD:</strong> ${managerOnDuty} &nbsp;|&nbsp; <strong>ENTERING:</strong> ${employeeEntering} &nbsp;|&nbsp; <strong>INV BY:</strong> ${invTakenBy}</div>
          <div><strong>DATE:</strong> ${dateStr} &nbsp;|&nbsp; <strong>SHIFT:</strong> ${shiftSlot}</div>
        </div>

        <div class="banner-notice" style="background:#fef3c7;border-color:#fde68a;color:#92400e;">
          🏷️ * These items must be dated at the store level. &nbsp;|&nbsp; ONLY FILL IN CELLS HIGHLIGHTED IN GREEN!
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
    } else {
      // Standard / Bi-Weekly & Monthly / Catering / Equipment / Smallwares / Master Liquor / Weekly Orders
      allItems.forEach((item, idx) => {
        const base = sampleItems.find(s => s.id === item.itemId);
        const itemCodeVal = item.itemCode || base?.itemCode;
        const casePackVal = item.casePackDetails || base?.packagingDetails;
        const sizeVal = item.size || base?.size;

        rowsHtml += `
          <tr>
            <td class="center" style="font-family:monospace;width:30px;">${idx + 1}</td>
            <td><strong>${item.name}</strong></td>
            ${hasSizeColumn ? `<td class="center" style="font-family:monospace;">${sizeVal || '—'}</td>` : ''}
            ${hasCasePackColumn ? `<td class="center" style="font-family:monospace;font-size:9.5px;">${casePackVal || '—'}</td>` : ''}
            <td class="center" style="font-family:monospace;">${item.unit}</td>
            <td class="green-cell">${item.currentCount > 0 ? item.currentCount : ''}</td>
            <td class="center" style="font-family:monospace;">${item.parLevel}</td>
            <td class="center" style="font-weight:bold;color:#b45309;">${item.suggestedOrder > 0 ? item.suggestedOrder : '0'}</td>
            <td class="center">${item.finalOrder > 0 ? item.finalOrder : ''}</td>
            ${hasItemCodeColumn ? `<td class="center" style="font-family:monospace;font-weight:bold;">${itemCodeVal || '—'}</td>` : ''}
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
          <div><strong>STORE:</strong> ${form.locationCode} &nbsp;|&nbsp; <strong>CASHIER/MOD:</strong> ${managerOnDuty} &nbsp;|&nbsp; <strong>ENTERING:</strong> ${employeeEntering} &nbsp;|&nbsp; <strong>INV BY:</strong> ${invTakenBy}</div>
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
              ${hasSizeColumn ? '<th class="center">Size</th>' : ''}
              ${hasCasePackColumn ? '<th class="center">CS Packed</th>' : ''}
              <th class="center">Unit</th>
              <th class="center" style="background:#d1e7dd!important;color:#0a3622;">INV</th>
              <th class="center">PAR</th>
              <th class="center">ORD</th>
              <th class="center">FINAL</th>
              ${hasItemCodeColumn ? '<th class="center">Code</th>' : ''}
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
      
      {/* 🎯 FAST COUNTING PHASE (Item Name & Count ONLY) */}
      {countingPhase === 'counting' ? (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded uppercase">
                    STORE: {form.locationCode}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                    ACTIVE COUNTING
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-white mt-1.5">{form.title}</h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Progress: <strong className="text-emerald-400 font-bold">{stats.totalCounted} of {stats.totalItems}</strong> items entered ({Math.round((stats.totalCounted / Math.max(1, stats.totalItems)) * 100)}%)
                </p>
              </div>

              {/* Big Review & Check Button */}
              <button
                type="button"
                onClick={() => {
                  setCountingPhase('review');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <span>Check & Review ({stats.totalCounted}/{stats.totalItems})</span>
                <ArrowRight className="w-4 h-4 stroke-3" />
              </button>
            </div>

            {/* Mode Switcher: ✍️ MANUAL COUNT vs 🎙️ VOICE COUNT (AI) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCountInputMethod('manual');
                    if (isVoiceListening && recognitionRef.current) {
                      try { recognitionRef.current.stop(); } catch {}
                      setIsVoiceListening(false);
                    }
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    countInputMethod === 'manual'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>✍️ Manual Count</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCountInputMethod('voice')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    countInputMethod === 'voice'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>🎙️ Voice Count (AI)</span>
                </button>
              </div>

              <div className="text-xs text-slate-300 font-mono flex items-center gap-2">
                <span>Shift: <strong className="text-amber-400">{shiftSlot}</strong></span>
                <span>•</span>
                <span>MOD: <strong className="text-slate-100">{managerOnDuty}</strong></span>
              </div>
            </div>

            {/* 🎙️ Voice Assistant Control Deck (Active in Voice Count mode) */}
            {countInputMethod === 'voice' && (
              <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3.5 sm:p-4 space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleVoiceListening}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer ${
                        isVoiceListening
                          ? 'bg-red-500 text-white animate-pulse shadow-red-500/50'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                      title={isVoiceListening ? 'Tap to pause microphone' : 'Tap to start voice recognition'}
                    >
                      {isVoiceListening ? <Mic className="w-6 h-6 stroke-3" /> : <Mic className="w-6 h-6" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-white">
                          {isVoiceListening ? '🎙️ Listening Hands-Free...' : '🎙️ Tap Mic to Start Voice Counting'}
                        </h4>
                        {isVoiceListening && (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Say item name and count (e.g., <i>"Tortilla 15"</i> or <i>"Carnitas 6"</i>)
                      </p>
                    </div>
                  </div>

                  {/* Read-back voice audio toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSpeechSynthesisEnabled(!speechSynthesisEnabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition border ${
                        speechSynthesisEnabled
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-400'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                      title="Speak confirmation out loud after each item is counted"
                    >
                      {speechSynthesisEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      <span>{speechSynthesisEnabled ? 'Voice Confirm: ON' : 'Voice Confirm: OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* Transcript / Feedback banner */}
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 truncate mr-2">
                    {voiceFeedbackMsg || (voiceTranscript ? `Heard: "${voiceTranscript}"` : "Waiting for speech... Speak clearly near phone or headset.")}
                  </span>
                  {aiParsingInProgress && (
                    <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <RefreshCw className="w-3 h-3 animate-spin" /> AI Analyzing...
                    </span>
                  )}
                </div>

                {/* Quick Voice Simulation Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono">
                  <span className="text-slate-500 uppercase text-[9px] font-bold">Quick Speech Tests:</span>
                  {displayedItems.slice(0, 4).map((it, idx) => (
                    <button
                      key={it.itemId}
                      type="button"
                      onClick={() => handleProcessSpokenText(`${it.name} ${idx === 0 ? 12 : idx === 1 ? 5 : 8}`)}
                      className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 rounded-md transition cursor-pointer"
                    >
                      "{it.name} {idx === 0 ? 12 : idx === 1 ? 5 : 8}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section Pills & Search Bar */}
          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
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

            <div className="relative md:w-72">
              <input
                type="text"
                placeholder="Search item name..."
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

          {/* 📋 THE FAST COUNTING LIST (ONLY ITEM NAME & COUNT SHOWN!) */}
          <div className="space-y-2.5">
            {displayedItems.length === 0 ? (
              <div className="py-12 px-4 text-center bg-white border border-dashed rounded-2xl text-slate-400 font-mono text-xs">
                No products found matching "{searchQuery}" in {activeSection}
              </div>
            ) : (
              displayedItems.map((item, index) => {
                const isBeer = isBarSheet && (item.category === 'Beer Bottles' || item.category === 'Beer Draft' || item.isBeer);
                const isLastUpdated = lastCountedItemId === item.itemId;

                return (
                  <div
                    key={item.itemId}
                    className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLastUpdated
                        ? 'ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-400'
                        : item.currentCount > 0
                        ? 'border-emerald-300 bg-emerald-50/15'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* ONLY ITEM NAME! */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-mono text-xs font-black bg-slate-100 text-slate-700 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug truncate">
                          {item.requiresDating && <span className="text-rose-600 font-black mr-1">*</span>}
                          {item.name}
                        </h3>
                        {item.currentCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-bold mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Counted: <strong className="text-emerald-950 font-black">{item.currentCount}</strong> {item.unit}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                            Unit: {item.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ONLY COUNT CONTROLS! */}
                    {isBeer ? (
                      // Dual Walk-in & Bar count for Beer items
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Walk-in count */}
                        <div className="flex flex-col items-center bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono mb-1">Walk-In</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecrementWlkIn(item.itemId, 1)}
                              className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.wlkInCount === 0 ? '' : item.wlkInCount}
                              onChange={(e) => handleWlkInChange(item.itemId, e.target.value)}
                              placeholder="0"
                              className="w-14 text-center font-mono font-black text-base bg-emerald-100 text-emerald-950 border border-emerald-400 py-1.5 rounded-lg focus:outline-none focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleIncrementWlkIn(item.itemId, 1)}
                              className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Bar count */}
                        <div className="flex flex-col items-center bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-slate-500 font-mono mb-1">Bar / Front</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDecrementBar(item.itemId, 1)}
                              className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.barCount === 0 ? '' : item.barCount}
                              onChange={(e) => handleBarCountChange(item.itemId, e.target.value)}
                              placeholder="0"
                              className="w-14 text-center font-mono font-black text-base bg-emerald-100 text-emerald-950 border border-emerald-400 py-1.5 rounded-lg focus:outline-none focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleIncrementBar(item.itemId, 1)}
                              className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Standard single count input with big + and - touch buttons
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleDecrementCount(item.itemId, 1)}
                          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-base flex items-center justify-center transition border border-slate-300 touch-manipulation cursor-pointer"
                          title="Subtract 1"
                        >
                          <Minus className="w-4 h-4 stroke-3" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.currentCount === 0 ? '' : item.currentCount}
                          onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                          placeholder="0"
                          className="w-20 sm:w-24 h-11 text-center font-mono font-black text-xl bg-emerald-100 text-emerald-950 border-2 border-emerald-400 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition"
                        />

                        <button
                          type="button"
                          onClick={() => handleIncrementCount(item.itemId, 1)}
                          className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex items-center justify-center transition shadow-sm touch-manipulation cursor-pointer"
                          title="Add 1"
                        >
                          <Plus className="w-4 h-4 stroke-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 📋 Sticky Bottom Action Bar to Finish & Review */}
          <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs sm:text-sm font-bold font-mono">
                Ready to review? <strong className="text-amber-400">{stats.totalCounted} of {stats.totalItems}</strong> items entered
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setCountingPhase('review');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
            >
              <span>Finish & Review Inventory</span>
              <ArrowRight className="w-4 h-4 stroke-3" />
            </button>
          </div>
        </div>
      ) : (
        /* 📋 REVIEW PHASE (EVERYTHING SHOWN FOR CHECKING) */
        <div className="space-y-5 animate-fadeIn">
          
          {/* Review Banner with Back to Counting Button */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-slate-950 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
                📋
              </span>
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-950 leading-tight">
                  Inventory Review & Verification Mode
                </h3>
                <p className="text-xs text-slate-900 font-medium">
                  Reviewing all specifications, par levels, suggested orders, and store dating rules before final submission.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCountingPhase('counting');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-slate-950 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Counting</span>
            </button>
          </div>

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
            
            {/* View Mode Toggle: Adaptive Store Sheet vs Cards vs Table */}
            <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setViewMode('sheet')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'sheet' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Adaptive Store Sheet (Zero-Scroll Mobile List on Phone, Sheet Grid on Tablet/Desktop)"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Store Sheet</span>
                <span className="sm:hidden">Count List</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'cards' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Product Cards View with Photos"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`hidden sm:flex px-2.5 py-1.5 rounded-lg text-xs font-bold items-center gap-1 transition cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Spreadsheet Table View"
              >
                <span>Grid Table</span>
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

        {/* Store Metadata Inputs: CASHIER/MOD, ENTERING IN COMPUTER, INV TAKEN BY, DATE, TIME OF INV / SHIFT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs sm:text-sm">
          
          {/* 1. Cashier / Manager On Duty (MOD) */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              CASHIER / MOD
            </label>
            <input 
              type="text"
              value={managerOnDuty}
              onChange={(e) => setManagerOnDuty(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500"
              placeholder="Cashier / MOD"
            />
          </div>

          {/* 2. Employee Entering in Computer */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              ENTERING IN COMPUTER
            </label>
            <input 
              type="text"
              value={employeeEntering}
              onChange={(e) => setEmployeeEntering(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500"
              placeholder="Computer entry"
            />
          </div>

          {/* 3. Inventory Taken By */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              INV TAKEN BY
            </label>
            <input 
              type="text"
              value={invTakenBy}
              onChange={(e) => setInvTakenBy(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold focus:outline-none focus:border-amber-500"
              placeholder="Physical count taker"
            />
          </div>

          {/* 4. Date of Inventory */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block">
              DATE (DATE)
            </label>
            <input 
              type="text"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-700 text-slate-100 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold font-mono focus:outline-none focus:border-amber-500"
              placeholder="MM/DD/YYYY"
            />
          </div>

          {/* 5. Shift Slot Selector (Breakfast, Lunch, Dinner) */}
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl space-y-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block flex items-center justify-between">
              <span>TIME / SHIFT</span>
              <Clock className="w-3 h-3 text-amber-400" />
            </label>
            <select
              value={shiftSlot}
              onChange={(e) => setShiftSlot(e.target.value as any)}
              className="w-full bg-slate-950/70 border border-slate-700 text-amber-300 font-bold px-2.5 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="Breakfast">Breakfast (Open – 10:59 am)</option>
              <option value="Lunch">Lunch (11:00 am – 3:59 pm)</option>
              <option value="Dinner">Dinner (4:00 pm – Close)</option>
            </select>
          </div>
        </div>

        {/* Authentic Store Instructions & Rules Banners */}
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

          {/* Special Store Notice: CM 1 & CM 2 Store Food Sheet Dating Rule */}
          {isFoodSheet && (
            <div className="bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2.5 font-mono">
              <span className="text-base shrink-0">🏷️</span>
              <span>
                <strong>STORE DATING NOTICE:</strong> <span className="text-amber-300 font-bold">*</span> Items marked with an asterisk must be dated at the store level.
              </span>
            </div>
          )}

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
      {viewMode === 'sheet' || viewMode === 'table' ? (
        <div className="space-y-4">
          
          {/* A. MOBILE-FIRST INVENTORY COUNT SHEET (Active on phones < md with ZERO horizontal scroll) */}
          {viewMode === 'sheet' && (
            <div className="block md:hidden space-y-3">
              {displayedItems.length === 0 ? (
                <div className="py-12 px-4 text-center bg-white border border-dashed rounded-2xl text-slate-400 font-mono text-xs">
                  No products found matching "{searchQuery}" in {activeSection}
                </div>
              ) : (
                displayedItems.map((item, index) => {
                  const isKeg = item.category === 'Beer Draft' || item.unit.includes('KEG');
                  const isBottle = item.category === 'Beer Bottles';
                  const isCO2 = item.itemId === 'co2-1' || item.category === 'Gas Systems';
                  const isEmpties = item.itemId === 'keg-10';
                  const wlkInInvalid = isBottle && (item.wlkInCount || 0) > 0 && (item.wlkInCount || 0) % 6 !== 0;

                  return (
                    <div
                      key={item.itemId}
                      className={`bg-white border rounded-2xl p-4 shadow-xs transition-all space-y-3 ${
                        item.isChecked ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      {/* Top Header: Row #, Item Name, Checkbox */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="font-mono text-xs font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                            #{index + 1}
                          </span>
                          <div>
                            <h4 className="font-black text-slate-900 text-base leading-snug">
                              {item.requiresDating && <span className="text-rose-600 font-black text-lg mr-1">*</span>}
                              {item.name}
                            </h4>
                          </div>
                        </div>

                        {/* Interactive Count ✔ Checkmark Button (large touch target 44x44) */}
                        <button
                          type="button"
                          onClick={() => toggleItemChecked(item.itemId)}
                          className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center shrink-0 transition active:scale-95 cursor-pointer ${
                            item.isChecked
                              ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                              : 'bg-slate-50 border-slate-300 text-slate-300 hover:border-slate-400'
                          }`}
                          title="Mark Counted"
                        >
                          <Check className="w-5 h-5 stroke-3" />
                        </button>
                      </div>

                      {/* Specification Badges (Size, Pack, Code, Category, Unit) */}
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          {item.category}
                        </span>
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold">
                          Unit: {item.unit}
                        </span>
                        {item.size && (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md border border-amber-300">
                            Size: {item.size}
                          </span>
                        )}
                        {item.casePackDetails && (
                          <span className="bg-slate-100 text-slate-900 font-bold px-2 py-0.5 rounded-md border border-slate-300">
                            Pack: {item.casePackDetails}
                          </span>
                        )}
                        {item.itemCode && (
                          <span className="bg-slate-900 text-amber-300 font-bold px-2 py-0.5 rounded-md">
                            Code: {item.itemCode}
                          </span>
                        )}
                        {item.requiresDating && (
                          <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-md border border-rose-200">
                            * Must Date at Store Level
                          </span>
                        )}
                        {isBottle && (
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200">
                            6-Pack Rule
                          </span>
                        )}
                        {isEmpties && (
                          <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-md border border-red-200 animate-pulse">
                            Return on Delivery
                          </span>
                        )}
                        {wlkInInvalid && (
                          <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-md">
                            ⚠️ Walk-in sets of 6 only!
                          </span>
                        )}
                      </div>

                      {/* Par & Suggested Order info bar */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Standard Par</span>
                          <span className="text-base font-black text-slate-900 mt-0.5 block">{item.parLevel}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-800 font-bold uppercase block">Sug Order</span>
                          <span className="text-base font-black text-amber-700 mt-0.5 block">
                            {item.suggestedOrder > 0 ? `+${item.suggestedOrder}` : '0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Final Order</span>
                          <input
                            type="number"
                            min="0"
                            value={item.finalOrder === 0 ? '' : item.finalOrder}
                            onChange={(e) => handleFinalOrderChange(item.itemId, e.target.value)}
                            placeholder="0"
                            className="w-full text-center font-mono font-bold text-sm bg-white border border-slate-300 text-slate-900 py-1 rounded-lg focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      {/* Physical Count Inputs (GREEN CELLS HIGHLIGHTED) */}
                      {isBarBeerSheet ? (
                        /* Draft & Bottled Beer: Walk-In + Bar Inputs */
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-black text-emerald-950 uppercase flex items-center justify-between">
                              <span>WLK-IN 🟢</span>
                              {isBottle && <span className="text-[9px] text-amber-700 font-bold">(sets of 6)</span>}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step={isKeg ? "0.5" : "1"}
                              value={item.wlkInCount === 0 ? '' : item.wlkInCount}
                              onChange={(e) => handleWlkInChange(item.itemId, e.target.value)}
                              placeholder="0"
                              className={`w-full text-center font-mono font-black text-lg py-2.5 rounded-xl border-2 transition ${
                                wlkInInvalid
                                  ? 'bg-amber-100 text-amber-950 border-amber-400 focus:border-amber-600'
                                  : 'bg-emerald-100 text-emerald-950 border-emerald-400 focus:bg-white focus:border-emerald-600'
                              }`}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-black text-emerald-950 uppercase">
                              BAR / C-O 🟢
                            </label>
                            <input
                              type="number"
                              min="0"
                              step={isKeg ? "0.5" : "1"}
                              value={item.barCount === 0 ? '' : item.barCount}
                              onChange={(e) => handleBarCountChange(item.itemId, e.target.value)}
                              placeholder="0"
                              className="w-full text-center font-mono font-black text-lg py-2.5 rounded-xl border-2 bg-emerald-100 text-emerald-950 border-emerald-400 focus:bg-white focus:border-emerald-600 transition"
                            />
                          </div>
                        </div>
                      ) : isCO2 ? (
                        /* CO2 Gauge */
                        <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-emerald-950">CO2 TANK PRESSURE:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.co2GaugePct ?? 75}
                              onChange={(e) => handleCo2GaugeChange(item.itemId, e.target.value)}
                              className="w-20 text-center font-mono font-black text-base bg-emerald-100 text-emerald-950 border-2 border-emerald-400 py-1.5 rounded-lg"
                            />
                            <span className="font-bold text-emerald-900 font-mono">%</span>
                          </div>
                        </div>
                      ) : (
                        /* Standard Physical Inventory On-Hand Box (INV 🟢) */
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-mono font-black text-emerald-950 uppercase block">
                              ON-HAND INVENTORY (INV 🟢)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={item.currentCount === 0 ? '' : item.currentCount}
                              onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                              placeholder="0"
                              className="w-full text-center font-mono font-black text-xl bg-emerald-100 text-emerald-950 border-2 border-emerald-500 py-2.5 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400 transition shadow-xs"
                            />
                          </div>

                          {/* Received button */}
                          {!isBarBeerSheet && (
                            <div className="shrink-0 space-y-1 text-center">
                              <label className="text-[10px] font-mono font-bold text-slate-500 uppercase block">
                                REC ✔
                              </label>
                              <button
                                type="button"
                                onClick={() => toggleItemReceived(item.itemId)}
                                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition active:scale-95 cursor-pointer ${
                                  item.isReceived
                                    ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                                    : 'bg-white border-slate-300 text-slate-300 hover:border-slate-400'
                                }`}
                                title="Mark received on delivery"
                              >
                                <Check className="w-5 h-5 stroke-3" />
                              </button>
                            </div>
                          )}

                          {/* Back order for catering */}
                          {isCateringSheet && (
                            <div className="shrink-0 space-y-1 text-center">
                              <label className="text-[10px] font-mono font-bold text-amber-700 uppercase block">
                                B/O
                              </label>
                              <div className="w-12 h-12 flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={!!item.isBackOrder}
                                  onChange={() => toggleBackOrder(item.itemId)}
                                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* B. TABLET & DESKTOP STORE SPREADSHEET TABLE GRID (Visible on >= md screens, or when viewMode === 'table') */}
          <div className={`${viewMode === 'table' ? 'block' : 'hidden md:block'} bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden`}>
            {viewMode === 'table' && (
              <div className="md:hidden bg-amber-50 border-b border-amber-200 p-2 px-3 text-[11px] font-mono text-amber-900 flex items-center justify-between">
                <span>↔️ Swipe horizontally to view all columns</span>
                <button 
                  onClick={() => setViewMode('sheet')}
                  className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded cursor-pointer"
                >
                  Switch to Mobile List
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-mono text-[10px] text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12 font-bold">#</th>
                  <th className="py-2.5 px-3 min-w-[200px] font-bold">ITEM NAME</th>
                  {hasSizeColumn && (
                    <th className="py-2.5 px-2 text-center w-24 font-bold text-slate-700 bg-slate-200/50">SIZE</th>
                  )}
                  {hasCasePackColumn && (
                    <th className="py-2.5 px-2 text-center w-28 font-bold text-slate-700 bg-slate-200/50">CS PACKED</th>
                  )}
                  {hasItemCodeColumn && (
                    <th className="py-2.5 px-2 text-center w-24 font-bold text-slate-700 bg-slate-200/50">CODE</th>
                  )}
                  <th className="py-2.5 px-2 text-center w-20 font-bold">UNIT</th>
                  
                  {isBarBeerSheet ? (
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
                  
                  {!isBarBeerSheet && (
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
                    <td colSpan={(isBarBeerSheet ? 10 : 9) + (hasSizeColumn ? 1 : 0) + (hasCasePackColumn ? 1 : 0) + (hasItemCodeColumn ? 1 : 0) + (isCateringSheet ? 1 : 0)} className="py-12 text-center text-slate-400">
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
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {item.requiresDating && <span className="text-rose-600 font-black text-sm">*</span>}
                            <span>{item.name}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              {item.category}
                            </span>

                            {/* Store level dating badge for CM 1 & CM 2 */}
                            {item.requiresDating && (
                              <span className="text-[8px] font-mono font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded border border-rose-200">
                                * Must Date at Store Level
                              </span>
                            )}
                            
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

                        {/* Size Column */}
                        {hasSizeColumn && (
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-amber-800 font-bold bg-amber-50/40 border-x border-slate-100">
                            {item.size || '—'}
                          </td>
                        )}

                        {/* Packaging / Weekly Supply Case Packing Details */}
                        {hasCasePackColumn && (
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-700 font-bold bg-slate-50/70 border-x border-slate-100">
                            {item.casePackDetails || '—'}
                          </td>
                        )}

                        {/* Item Code (Sysco / ABC liquor) */}
                        {hasItemCodeColumn && (
                          <td className="py-2 px-2 text-center font-mono text-[10px] text-slate-600 font-bold bg-slate-50/40 border-r border-slate-100">
                            {item.itemCode || '—'}
                          </td>
                        )}

                        {/* 3. Unit */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 font-semibold">
                          {item.unit}
                        </td>

                        {/* 4. Store Sheet Editable Inputs (GREEN HIGHLIGHTED CELLS) */}
                        {isBarBeerSheet ? (
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
                        {!isBarBeerSheet && (
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

          {/* Authentic Store Facility Outlet Codes Footer */}
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                Store Locations
              </span>
              <span className="text-slate-400 text-[11px]">
                AS (Ashburn) • BK (Burke) • CH (Chantilly) • FX (Fairfax) • HN (Herndon) • LS (Leesburg) • MN (Manassas) • SP (South Riding) • VN (Vienna) • CM (Commissary)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
              <span>Active Store: <strong className="text-amber-400">{form.locationCode}</strong></span>
              <span>Shift: <strong className="text-emerald-400">{shiftSlot}</strong></span>
            </div>
          </div>
        </div>
        </div>
      ) : (
        /* ALTERNATIVE PRODUCT CARDS VIEW (For touch / mobile) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedItems.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white border border-dashed rounded-2xl text-slate-400 font-mono text-xs">
              No matching products in "{activeSection}"
            </div>
          ) : (
            displayedItems.map(item => {
              const isKeg = item.category === 'Beer Draft' || item.unit.includes('KEG');
              const isBottle = item.category === 'Beer Bottles';
              const wlkInInvalid = isBottle && (item.wlkInCount || 0) > 0 && (item.wlkInCount || 0) % 6 !== 0;

              return (
                <div 
                  key={item.itemId}
                  className={`bg-white border rounded-2xl p-4 shadow-xs transition-all space-y-3 ${
                    item.isChecked ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={item.photoUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=120&q=80'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                        {item.requiresDating && <span className="text-rose-600 font-black mr-1">*</span>}
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono mt-1 uppercase font-semibold flex flex-wrap gap-1">
                        <span>{item.unit}</span>
                        {item.size && <span className="text-amber-700 font-bold">• {item.size}</span>}
                        {item.casePackDetails && <span className="text-slate-700 font-bold">• {item.casePackDetails}</span>}
                        <span>• {item.category}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => toggleItemChecked(item.itemId)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ${
                        item.isChecked 
                          ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-slate-300'
                      }`}
                      title="Mark Counted"
                    >
                      <Check className="w-5 h-5 stroke-3" />
                    </button>
                  </div>

                  {/* Par and Sug Order stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-50 border border-slate-100 rounded-xl p-2">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Par</span>
                      <span className="font-black text-slate-800 text-sm mt-0.5 block">{item.parLevel}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-amber-700 font-bold uppercase">Sug Order</span>
                      <span className="font-black text-amber-600 text-sm mt-0.5 block">
                        {item.suggestedOrder > 0 ? `+${item.suggestedOrder}` : '0'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">Total</span>
                      <span className="font-black text-slate-800 text-sm mt-0.5 block">{item.total}</span>
                    </div>
                  </div>

                  {/* Physical Count Inputs */}
                  {isBarBeerSheet ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-emerald-900 font-mono block">
                          WLK-IN 🟢
                        </label>
                        <input
                          type="number"
                          min="0"
                          step={isKeg ? "0.5" : "1"}
                          placeholder="0"
                          value={item.wlkInCount === 0 ? '' : item.wlkInCount}
                          onChange={(e) => handleWlkInChange(item.itemId, e.target.value)}
                          className={`w-full text-center font-mono font-black text-base py-2 rounded-xl border-2 transition ${
                            wlkInInvalid
                              ? 'bg-amber-100 text-amber-950 border-amber-400'
                              : 'bg-emerald-100 text-emerald-950 border-emerald-400 focus:bg-white focus:border-emerald-600'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-emerald-900 font-mono block">
                          BAR/CO 🟢
                        </label>
                        <input
                          type="number"
                          min="0"
                          step={isKeg ? "0.5" : "1"}
                          placeholder="0"
                          value={item.barCount === 0 ? '' : item.barCount}
                          onChange={(e) => handleBarCountChange(item.itemId, e.target.value)}
                          className="w-full text-center font-mono font-black text-base py-2 rounded-xl border-2 bg-emerald-100 text-emerald-950 border-emerald-400 focus:bg-white focus:border-emerald-600 transition"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-black text-emerald-900 font-mono block">
                          INV (On-Hand) 🟢
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.currentCount === 0 ? '' : item.currentCount}
                          onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                          className="w-full text-center font-mono font-black text-lg bg-emerald-100 text-emerald-950 border-2 border-emerald-400 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 font-mono block">
                          Final Order
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.finalOrder === 0 ? '' : item.finalOrder}
                          onChange={(e) => handleFinalOrderChange(item.itemId, e.target.value)}
                          className="w-full text-center font-mono font-bold text-sm bg-slate-50 border border-slate-200 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
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
  )}

    </div>
  );
}
