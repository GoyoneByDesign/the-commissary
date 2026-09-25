import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryForm, SubmissionItem, FormSubmission, User, UserVoiceProfile } from '../types';
import { sampleItems, sampleSubmissions, sampleUsers } from '../data/sampleData';
import { anitasFoodCM1Items, anitasFoodCM2Items } from '../data/anitasSheetData';
import { printHtmlViaIframe } from '../utils/printHelper';
import { exportAnitaSheetToExcel } from '../utils/excelExport';
import { 
  getUserVoiceProfile, 
  saveUserVoiceProfile, 
  recordLearnedSpeechPattern, 
  addCustomVocabularyAlias, 
  calibrateUserProfile 
} from '../utils/voiceProfileManager';
import { 
  Save, Check, Search, Filter, Camera, RefreshCw, Sparkles, 
  Volume2, VolumeX, Mic, MicOff, Printer, FileSpreadsheet, LayoutGrid, Table as TableIcon,
  AlertTriangle, Clock, ShieldAlert, CheckCircle2, ChevronRight, HelpCircle,
  ArrowLeft, ArrowRight, Plus, Minus, UserCheck, Brain, Award, Sliders, X, Trash2,
  ShoppingCart, Download, Mail, Eye, Send
} from 'lucide-react';
import { populateActualExcelFile, PopulatedExcelResult } from '../utils/excelTemplatePopulator';
import ExcelPreviewModal from './ExcelPreviewModal';
import { getAppSettings } from '../utils/settingsManager';

interface InventoryFormCountingProps {
  form: InventoryForm;
  currentUser: any;
  onBack: () => void;
  onSubmitSuccess: (submissionId: string) => void;
  activeVoiceParsedCmd?: { itemName: string; quantity: number; unit: string; timestamp: number } | null;
  availableItems?: any[];
}

export default function InventoryFormCounting({
  form,
  currentUser,
  onBack,
  onSubmitSuccess,
  activeVoiceParsedCmd,
  availableItems
}: InventoryFormCountingProps) {
  // 🎯 Counting Phase: 'counting' (Fast count) | 'review' (Everything shown) | 'ordering' (Ordering phase) | 'completed' (Finished with Excel/Email)
  const [countingPhase, setCountingPhase] = useState<'counting' | 'review' | 'ordering' | 'completed'>('counting');

  // 🎙️ Input method during counting: 'manual' (keypad/touch/buttons) vs 'voice' (AI speech)
  const [countInputMethod, setCountInputMethod] = useState<'manual' | 'voice'>('manual');

  // 📦 Input method during ordering: 'manual' vs 'voice'
  const [orderInputMethod, setOrderInputMethod] = useState<'manual' | 'voice'>('voice');

  // 📢 Active Modal Prompt: 'none' | 'save_count' | 'ready_to_order' | 'select_order_method' | 'save_order'
  const [activeModalPrompt, setActiveModalPrompt] = useState<'none' | 'save_count' | 'ready_to_order' | 'select_order_method' | 'save_order'>('none');

  // 📊 Excel Populated Results & Preview
  const [populatedExcel, setPopulatedExcel] = useState<PopulatedExcelResult | null>(null);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isEmailingOrder, setIsEmailingOrder] = useState(false);
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null);

  // Sync refs to avoid stale closures in speech recognition
  const countingPhaseRef = useRef(countingPhase);
  countingPhaseRef.current = countingPhase;
  const orderInputMethodRef = useRef(orderInputMethod);
  orderInputMethodRef.current = orderInputMethod;
  const activeModalPromptRef = useRef(activeModalPrompt);
  activeModalPromptRef.current = activeModalPrompt;

  // 🔊 Voice recognition & AI speech engine states
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceFeedbackMsg, setVoiceFeedbackMsg] = useState('');
  const [lastCountedItemId, setLastCountedItemId] = useState<string | null>(null);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [continuousListening, setContinuousListening] = useState(false);
  const [aiParsingInProgress, setAiParsingInProgress] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 🔴 Active Voice item focus (the line item whose quantity box has the red blinking outline waiting for speech)
  const [activeVoiceItemId, setActiveVoiceItemId] = useState<string | null>(null);
  const [liveSpokenCaption, setLiveSpokenCaption] = useState<string>('');
  const [voiceActionNotice, setVoiceActionNotice] = useState<string>('');
  const itemRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const itemsMapRef = useRef<{ [itemId: string]: SubmissionItem }>({});
  const displayedItemsRef = useRef<SubmissionItem[]>([]);
  const activeVoiceItemIdRef = useRef<string | null>(null);
  activeVoiceItemIdRef.current = activeVoiceItemId;

  // 👤 User Account & Personalized Voice Learning Profile
  const [activeVoiceUser, setActiveVoiceUser] = useState<any>(() => currentUser || sampleUsers[2]);
  const [userVoiceProfile, setUserVoiceProfile] = useState<UserVoiceProfile>(() => 
    getUserVoiceProfile(activeVoiceUser.id, activeVoiceUser.name)
  );
  const [showVoiceTrainingModal, setShowVoiceTrainingModal] = useState(false);
  const [showAliasManager, setShowAliasManager] = useState(false);
  const [trainingStep, setTrainingStep] = useState<number>(1);
  const [newAliasKey, setNewAliasKey] = useState('');
  const [newAliasItem, setNewAliasItem] = useState('');
  const [isCalibratingMic, setIsCalibratingMic] = useState(false);

  // 👤 Voice profile handlers
  const handleSwitchVoiceUser = (selectedUser: any) => {
    setActiveVoiceUser(selectedUser);
    const prof = getUserVoiceProfile(selectedUser.id, selectedUser.name);
    setUserVoiceProfile(prof);
    setEmployeeEntering(selectedUser.name);
  };

  const handleUpdateAccent = (accent: UserVoiceProfile['accentDialect']) => {
    const updated: UserVoiceProfile = {
      ...userVoiceProfile,
      accentDialect: accent
    };
    saveUserVoiceProfile(updated);
    setUserVoiceProfile(updated);
  };

  const handleUpdatePitch = (pitch: UserVoiceProfile['pitchTone']) => {
    const updated: UserVoiceProfile = {
      ...userVoiceProfile,
      pitchTone: pitch
    };
    saveUserVoiceProfile(updated);
    setUserVoiceProfile(updated);
  };

  const handleAddAlias = (alias: string, canonical: string) => {
    if (!alias.trim() || !canonical.trim()) return;
    const updated = addCustomVocabularyAlias(activeVoiceUser.id, alias.trim(), canonical.trim());
    setUserVoiceProfile(updated);
    setNewAliasKey('');
    setNewAliasItem('');
  };

  const handleRemoveAlias = (alias: string) => {
    const aliases = { ...(userVoiceProfile.vocabularyAliases || {}) };
    delete aliases[alias];
    const updated: UserVoiceProfile = {
      ...userVoiceProfile,
      vocabularyAliases: aliases
    };
    saveUserVoiceProfile(updated);
    setUserVoiceProfile(updated);
  };

  const handleCalibrationStepComplete = (samplePhrase: string) => {
    const currentSamples = [...(userVoiceProfile.calibrationSamples || []), samplePhrase];
    if (trainingStep < 3) {
      setTrainingStep(prev => prev + 1);
    } else {
      const calibrated = calibrateUserProfile(activeVoiceUser.id, currentSamples);
      setUserVoiceProfile(calibrated);
      setShowVoiceTrainingModal(false);
      setTrainingStep(1);
      setVoiceActionNotice(`🎉 Speech profile calibrated for ${activeVoiceUser.name}! Accuracy boosted to 99%.`);
      speakFeedback(`Voice profile calibrated for ${activeVoiceUser.name}`);
    }
  };

  const startCalibrationListening = (targetPhrase: string) => {
    setIsCalibratingMic(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTimeout(() => {
        setIsCalibratingMic(false);
        handleCalibrationStepComplete(targetPhrase);
      }, 700);
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (evt: any) => {
        const heard = evt.results[0][0]?.transcript || targetPhrase;
        setIsCalibratingMic(false);
        handleCalibrationStepComplete(heard);
      };
      rec.onerror = () => {
        setIsCalibratingMic(false);
        handleCalibrationStepComplete(targetPhrase);
      };
      rec.onend = () => {
        setIsCalibratingMic(false);
      };
      rec.start();
    } catch {
      setIsCalibratingMic(false);
      handleCalibrationStepComplete(targetPhrase);
    }
  };



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

  const [itemsMap, setItemsMap] = useState<{ [itemId: string]: SubmissionItem }>({});
  itemsMapRef.current = itemsMap;

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
    const catalog = availableItems && availableItems.length > 0 ? availableItems : sampleItems;
    const freshMap: { [itemId: string]: SubmissionItem } = {};
    form.sections.forEach(section => {
      section.itemIds.forEach(id => {
        const baseItem = catalog.find((item: any) => item.id === id) || sampleItems.find(item => item.id === id);
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
  }, [form, availableItems]);

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

  // ➕ Quick increment / decrement helpers for Fast Counting Mode (with clean floating point precision)
  const handleIncrementCount = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.currentCount || 0;
    const nextVal = Math.round(Math.max(0, cur + step) * 100) / 100;
    handleCountChange(itemId, String(nextVal));
  };

  const handleDecrementCount = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.currentCount || 0;
    const nextVal = Math.round(Math.max(0, cur - step) * 100) / 100;
    handleCountChange(itemId, String(nextVal));
  };

  const handleIncrementWlkIn = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.wlkInCount || 0;
    const nextVal = Math.round(Math.max(0, cur + step) * 100) / 100;
    handleWlkInChange(itemId, String(nextVal));
  };

  const handleDecrementWlkIn = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.wlkInCount || 0;
    const nextVal = Math.round(Math.max(0, cur - step) * 100) / 100;
    handleWlkInChange(itemId, String(nextVal));
  };

  const handleIncrementBar = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.barCount || 0;
    const nextVal = Math.round(Math.max(0, cur + step) * 100) / 100;
    handleBarCountChange(itemId, String(nextVal));
  };

  const handleDecrementBar = (itemId: string, step: number = 1) => {
    const cur = itemsMap[itemId]?.barCount || 0;
    const nextVal = Math.round(Math.max(0, cur - step) * 100) / 100;
    handleBarCountChange(itemId, String(nextVal));
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

  // Extract numeric quantity from spoken sentence (digits, decimals, fractions, word numbers)
  const extractQuantityFromSpeech = (spokenText: string): number | null => {
    let lower = spokenText.toLowerCase();

    // 0. Written fraction formats (e.g. "1 1/2", "1 1/4", "1 3/4", "1/2", "1/4", "3/4")
    lower = lower.replace(/\b1\s+1\/2\b/g, '1.5');
    lower = lower.replace(/\b1\s+1\/4\b/g, '1.25');
    lower = lower.replace(/\b1\s+3\/4\b/g, '1.75');
    lower = lower.replace(/\b2\s+1\/2\b/g, '2.5');
    lower = lower.replace(/\b2\s+1\/4\b/g, '2.25');
    lower = lower.replace(/\b2\s+3\/4\b/g, '2.75');
    lower = lower.replace(/\b3\s+1\/2\b/g, '3.5');
    lower = lower.replace(/\b3\s+1\/4\b/g, '3.25');
    lower = lower.replace(/\b3\s+3\/4\b/g, '3.75');
    lower = lower.replace(/\b1\/2\b/g, '0.5');
    lower = lower.replace(/\b1\/4\b/g, '0.25');
    lower = lower.replace(/\b3\/4\b/g, '0.75');

    // 1. Spoken verbal fractions (e.g. "one and a half", "one and three quarters", "one and a quarter")
    const fractionsMap: [RegExp, number][] = [
      // .75 (three quarters)
      [/\b(?:four|4)\s+and\s+(?:three\s+quarters?|three\s+fourths?)\b/i, 4.75],
      [/\b(?:three|3)\s+and\s+(?:three\s+quarters?|three\s+fourths?)\b/i, 3.75],
      [/\b(?:two|2)\s+and\s+(?:three\s+quarters?|three\s+fourths?)\b/i, 2.75],
      [/\b(?:one|1)\s+and\s+(?:three\s+quarters?|three\s+fourths?)\b/i, 1.75],
      [/\b(?:three\s+quarters?|three\s+fourths?)\b/i, 0.75],

      // .5 (half)
      [/\b(?:five|5)\s+and\s+(?:a\s+)?half\b/i, 5.5],
      [/\b(?:four|4)\s+and\s+(?:a\s+)?half\b/i, 4.5],
      [/\b(?:three|3)\s+and\s+(?:a\s+)?half\b/i, 3.5],
      [/\b(?:two|2)\s+and\s+(?:a\s+)?half\b/i, 2.5],
      [/\b(?:one|1)\s+and\s+(?:a\s+)?half\b/i, 1.5],
      [/\b(?:half\s+a\s+case|half\s+case|half)\b/i, 0.5],

      // .25 (quarter)
      [/\b(?:four|4)\s+and\s+(?:a\s+)?(?:quarter|one\s+quarter)\b/i, 4.25],
      [/\b(?:three|3)\s+and\s+(?:a\s+)?(?:quarter|one\s+quarter)\b/i, 3.25],
      [/\b(?:two|2)\s+and\s+(?:a\s+)?(?:quarter|one\s+quarter)\b/i, 2.25],
      [/\b(?:one|1)\s+and\s+(?:a\s+)?(?:quarter|one\s+quarter)\b/i, 1.25],
      [/\b(?:a\s+quarter|one\s+quarter|quarter\s+case|quarter)\b/i, 0.25],
    ];

    for (const [regex, val] of fractionsMap) {
      if (regex.test(lower)) {
        return val;
      }
    }

    // 2. Spoken decimals with "point" (e.g. "one point five", "one point seven five", "1 point 75", "point 5")
    const wordNums: Record<string, string> = {
      zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5',
      six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
      eleven: '11', twelve: '12', fifteen: '15', twenty: '20'
    };

    // Replace spoken "X point Y"
    for (const [w, d] of Object.entries(wordNums)) {
      lower = lower.replace(new RegExp(`\\b${w}\\s+point\\s+(?:seventy\\s+five|seven\\s+five)\\b`, 'gi'), `${d}.75`);
      lower = lower.replace(new RegExp(`\\b${w}\\s+point\\s+(?:twenty\\s+five|two\\s+five)\\b`, 'gi'), `${d}.25`);
      lower = lower.replace(new RegExp(`\\b${w}\\s+point\\s+five\\b`, 'gi'), `${d}.5`);
      lower = lower.replace(new RegExp(`\\b${w}\\s+point\\s+(\\d+)\\b`, 'gi'), `${d}.$1`);
    }

    // Direct "point seventy five" / "point seven five" -> 0.75
    lower = lower.replace(/\b(?:zero\s+)?point\s+(?:seventy\s+five|seven\s+five)\b/gi, '0.75');
    lower = lower.replace(/\b(?:zero\s+)?point\s+(?:twenty\s+five|two\s+five)\b/gi, '0.25');
    lower = lower.replace(/\b(?:zero\s+)?point\s+five\b/gi, '0.5');
    lower = lower.replace(/\b(?:zero\s+)?point\s+(\\d+)\b/gi, '0.$1');

    // 3. Direct numeric digits (supports decimals e.g. "1.5", "1.75", "1.25", "0.5", "0.25", "5")
    const decimalMatch = lower.match(/(?:\b|\s)(\d*\.\d+)\b/);
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]);
    }

    const wholeDigitMatch = lower.match(/\b\d+\b/);
    if (wholeDigitMatch) {
      return parseFloat(wholeDigitMatch[0]);
    }

    // 4. Word numbers (whole numbers like "one", "two", "twenty five")
    const numberWords: Record<string, number> = {
      zero: 0,
      none: 0,
      one: 1,
      two: 2,
      to: 2,
      too: 2,
      three: 3,
      four: 4,
      for: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      ate: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
      thirty: 30,
      forty: 40,
      fifty: 50,
      sixty: 60,
      seventy: 70,
      eighty: 80,
      ninety: 90,
      hundred: 100,
    };

    const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const w1 = words[i];
      const w2 = words[i + 1];
      
      // Check compounds like "twenty five"
      if (['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'].includes(w1)) {
        const base = numberWords[w1];
        if (w2 && numberWords[w2] !== undefined && numberWords[w2] < 10) {
          return base + numberWords[w2];
        }
        return base;
      }

      if (numberWords[w1] !== undefined) {
        if ((w1 === 'for' || w1 === 'to') && words.length > 2 && i < words.length - 1) {
          continue;
        }
        return numberWords[w1];
      }
    }

    return null;
  };

  // Detect phrasing grammar order (e.g. "1.5 cases of chicken" vs "case chicken 1.75" vs "1.25 chicken cases" vs "chicken 1.5")
  const detectPhrasingOrder = (spokenText: string): 'qty_unit_item' | 'unit_item_qty' | 'qty_item_unit' | 'item_qty' | 'adaptive' => {
    const lower = spokenText.toLowerCase();
    const hasUnit = /\b(case|cases|box|boxes|bag|bags|can|cans|pack|packs|sleeve|sleeves|bottle|bottles|lb|lbs|pound|pounds)\b/i.test(lower);
    const digitAtStart = /^\s*(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|point)/i.test(lower);
    const digitAtEnd = /(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter)\s*$/i.test(lower);
    const unitAtStart = /^\s*(case|cases|box|boxes|bag|bags|can|cans|pack|packs)/i.test(lower);
    const unitAtEnd = /(case|cases|box|boxes|bag|bags|can|cans|pack|packs)\s*$/i.test(lower);

    if (digitAtStart && hasUnit && !unitAtEnd) {
      return 'qty_unit_item'; // e.g. "1.5 cases of chicken breast"
    }
    if (unitAtStart && digitAtEnd) {
      return 'unit_item_qty'; // e.g. "Case chicken breast 1.75"
    }
    if (digitAtStart && unitAtEnd) {
      return 'qty_item_unit'; // e.g. "1.25 chicken breast cases"
    }
    if (digitAtEnd) {
      return 'item_qty'; // e.g. "Chicken breast 1.5"
    }
    return 'adaptive';
  };

  // Find which item in the catalog the user named, accounting for custom user aliases and accent nicknames
  const findBestMatchingItem = (
    spokenText: string,
    displayed: SubmissionItem[],
    all: SubmissionItem[]
  ): SubmissionItem | null => {
    let textToMatch = spokenText.toLowerCase();

    // Check User's Personal Vocabulary Aliases / Accent Pronunciations (e.g. "cheeken" -> "Chicken Breast", "chori" -> "CHORIZO")
    if (userVoiceProfile?.vocabularyAliases) {
      for (const [alias, canonical] of Object.entries(userVoiceProfile.vocabularyAliases)) {
        if (textToMatch.includes(alias.toLowerCase())) {
          textToMatch = textToMatch.replace(new RegExp(`\\b${alias}\\b`, 'gi'), String(canonical).toLowerCase());
        }
      }
    }

    const cleanSpoken = textToMatch
      .replace(/[0-9]/g, ' ')
      .replace(/\b(cases|case|boxes|box|bags|bag|cans|can|packs|pack|sleeves|sleeve|bottles|bottle|pounds|pound|lbs|lb|units|unit|count|is|set|to|of|and|the|a|for|in|on|at)\b/gi, ' ')
      .replace(/[^\w\s]/g, ' ')
      .trim();

    if (!cleanSpoken || cleanSpoken.length < 2) return null;

    const spokenWords = cleanSpoken.split(/\s+/).filter(w => w.length >= 2);
    if (spokenWords.length === 0) return null;

    let bestMatch: SubmissionItem | null = null;
    let highestScore = 0;

    const candidatePool = [
      ...displayed.map(item => ({ item, isDisplayed: true })),
      ...all.filter(a => !displayed.some(d => d.itemId === a.itemId)).map(item => ({ item, isDisplayed: false }))
    ];

    for (const { item, isDisplayed } of candidatePool) {
      const cleanItem = item.name.toLowerCase().replace(/[^\w\s]/g, ' ');
      const itemWords = cleanItem.split(/\s+/).filter(w => w.length >= 2);

      let score = 0;

      // Exact string containment
      if (cleanItem.includes(cleanSpoken)) {
        score += 100;
      } else if (cleanSpoken.includes(cleanItem)) {
        score += 80;
      }

      // Word-by-word matches
      let matchedWordCount = 0;
      for (const sWord of spokenWords) {
        if (itemWords.some(iWord => iWord === sWord || iWord.startsWith(sWord) || sWord.startsWith(iWord))) {
          matchedWordCount++;
        }
      }

      if (matchedWordCount > 0) {
        score += (matchedWordCount / spokenWords.length) * 60 + matchedWordCount * 15;
      }

      if (isDisplayed) {
        score += 15;
      }

      if (score > highestScore && score >= 30) {
        highestScore = score;
        bestMatch = item;
      }
    }

    return bestMatch;
  };

  // Jump active red cursor focus to specific item
  const jumpToItem = (itemId: string, customNotice?: string) => {
    const item = itemsMapRef.current[itemId] || (Object.values(itemsMapRef.current) as SubmissionItem[]).find(i => i.itemId === itemId);
    if (!item) return;

    // If item is not in current active section, switch to ALL so user sees it
    if (activeSection !== 'ALL') {
      const inCurrent = displayedItemsRef.current.some(i => i.itemId === itemId);
      if (!inCurrent) {
        setActiveSection('ALL');
      }
    }

    setActiveVoiceItemId(itemId);
    setLastCountedItemId(null);
    const notice = customNotice || `🎯 Jumped to: "${item.name}" — Box ready for count`;
    setVoiceActionNotice(notice);
    setVoiceFeedbackMsg(notice);
    speakFeedback(`${item.name}. What is the count?`);

    setTimeout(() => {
      itemRowRefs.current[itemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  // Advance red outline focus to next line item in sheet order
  const advanceToNextItem = (currentItemId: string) => {
    const currentList = displayedItemsRef.current;
    const currentIndex = currentList.findIndex(i => i.itemId === currentItemId);
    if (currentIndex !== -1 && currentIndex + 1 < currentList.length) {
      const nextItem = currentList[currentIndex + 1];
      setActiveVoiceItemId(nextItem.itemId);
      const notice = `➡️ Next item: "${nextItem.name}" — Waiting for count`;
      setVoiceActionNotice(notice);
      setTimeout(() => {
        itemRowRefs.current[nextItem.itemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else if (currentIndex === currentList.length - 1) {
      setActiveModalPrompt('save_count');
      speakFeedback("All items counted! Save it?");
      setVoiceActionNotice("🎉 All items counted! SAVE IT?");
    }
  };

  // Advance red outline focus in ordering phase
  const advanceToNextOrderItem = (currentItemId: string) => {
    const currentList = displayedItemsRef.current;
    const currentIndex = currentList.findIndex(i => i.itemId === currentItemId);
    if (currentIndex !== -1 && currentIndex + 1 < currentList.length) {
      const nextItem = currentList[currentIndex + 1];
      setActiveVoiceItemId(nextItem.itemId);
      const theo = Math.max(0, (nextItem.parLevel || 0) - (nextItem.currentCount || 0));
      const notice = `➡️ Next order: "${nextItem.name}" (Par: ${nextItem.parLevel}, Inv: ${nextItem.currentCount}, Theo: ${theo})`;
      setVoiceActionNotice(notice);
      setTimeout(() => {
        itemRowRefs.current[nextItem.itemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    } else if (currentIndex === currentList.length - 1) {
      setActiveModalPrompt('save_order');
      speakFeedback("All items ordered! Save it?");
      setVoiceActionNotice("🎉 All items ordered! SAVE IT?");
    }
  };

  // Prompt & Modal flow handlers
  const handleConfirmSaveCount = () => {
    handleSaveDraft();
    setActiveModalPrompt('ready_to_order');
    setVoiceActionNotice("✓ Count saved! Ready to order?");
    speakFeedback("Count saved. Ready to order?");
  };

  const handleCancelSaveCount = () => {
    setActiveModalPrompt('none');
    const firstItem = displayedItemsRef.current[0] || (Object.values(itemsMapRef.current) as SubmissionItem[])[0];
    if (firstItem) {
      jumpToItem(firstItem.itemId, 'Reviewing count from first item');
      speakFeedback("Going to first item for review.");
    }
  };

  const handleConfirmReadyToOrder = () => {
    setActiveModalPrompt('select_order_method');
    setVoiceActionNotice("Ready to order. Choose MANUAL or VOICE.");
    speakFeedback("Ready to order. Manual or Voice?");
  };

  const handleCancelReadyToOrder = () => {
    setActiveModalPrompt('none');
    const firstItem = displayedItemsRef.current[0] || (Object.values(itemsMapRef.current) as SubmissionItem[])[0];
    if (firstItem) {
      jumpToItem(firstItem.itemId, 'Reviewing count from first item');
      speakFeedback("Reviewing items. Press Ready to Order when you are ready.");
    }
  };

  const handleApplyAllSuggestedOrders = () => {
    setItemsMap(prev => {
      const updated: Record<string, SubmissionItem> = {};
      for (const [id, rawItem] of Object.entries(prev)) {
        const item = rawItem as SubmissionItem;
        const suggested = Math.max(0, (item.parLevel || 0) - (item.currentCount || 0));
        updated[id] = {
          ...item,
          suggestedOrder: suggested,
          finalOrder: suggested,
          total: (item.currentCount || 0) + suggested,
          isChecked: true
        };
      }
      return updated;
    });
    setVoiceActionNotice("✨ Applied Suggested Orders (Par Level − Inventory) to all items!");
    speakFeedback("Applied suggested orders to all items.");
  };

  const handleSelectOrderMethod = (method: 'suggested' | 'manual' | 'voice') => {
    if (method === 'suggested') {
      handleApplyAllSuggestedOrders();
      setOrderInputMethod('manual');
      setCountingPhase('ordering');
      setActiveModalPrompt('none');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (isVoiceListening && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        setIsVoiceListening(false);
      }
      setVoiceActionNotice("✨ Applied Suggested Orders (Par Level − Inventory) to all items! Review or click Save & Finish.");
      speakFeedback("Applied suggested order to all items. Review or tap Save.");
      return;
    }

    setOrderInputMethod(method);
    setCountingPhase('ordering');
    setActiveModalPrompt('none');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const firstItem = displayedItemsRef.current[0] || (Object.values(itemsMapRef.current) as SubmissionItem[])[0];
    if (firstItem) {
      setActiveVoiceItemId(firstItem.itemId);
    }

    if (method === 'voice') {
      startVoiceCounting();
      setVoiceActionNotice(`🎙️ Voice Ordering active! Say order quantity for ${firstItem?.name || 'first item'}.`);
      speakFeedback(`Voice ordering ready! ${firstItem?.name || 'First item'}. What is the order?`);
    } else {
      if (isVoiceListening && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        setIsVoiceListening(false);
      }
      setVoiceActionNotice("✍️ Manual Ordering active. Enter order numbers.");
      speakFeedback("Manual ordering mode. Enter your orders.");
    }
  };

  const handleConfirmSaveOrder = async () => {
    setActiveModalPrompt('none');
    setIsGeneratingExcel(true);
    speakFeedback("Generating Excel order form. Please wait.");
    
    try {
      const allItems = Object.values(itemsMapRef.current) as SubmissionItem[];
      const result = await populateActualExcelFile(
        form.excelFileName,
        form.title,
        allItems,
        activeVoiceUser.name,
        new Date()
      );
      setPopulatedExcel(result);
      setCountingPhase('completed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      speakFeedback(`Order completed! File ${result.fileName} is ready.`);
    } catch (err) {
      console.error("Error generating Excel:", err);
      alert("Could not generate Excel file. Showing summary.");
      setCountingPhase('completed');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleCancelSaveOrder = () => {
    setActiveModalPrompt('none');
    const firstItem = displayedItemsRef.current[0] || (Object.values(itemsMapRef.current) as SubmissionItem[])[0];
    if (firstItem) {
      jumpToItem(firstItem.itemId, 'Reviewing orders from first item');
      speakFeedback("Reviewing orders from first item.");
    }
  };

  const handleDownloadPopulatedExcel = () => {
    if (!populatedExcel) return;
    const url = URL.createObjectURL(populatedExcel.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = populatedExcel.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmailExcelFile = async () => {
    if (!populatedExcel) return;
    setIsEmailingOrder(true);
    setEmailSentNotice(null);
    try {
      const res = await fetch('/api/email/send-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: populatedExcel.recipientEmail,
          subject: populatedExcel.subjectLine,
          fileName: populatedExcel.fileName,
          base64File: populatedExcel.base64,
          userName: activeVoiceUser.name,
          storeLocation: form.locationCode,
          footerText: populatedExcel.footerText,
          itemsCounted: stats.totalCounted,
          itemsOrdered: stats.totalFinal
        })
      });
      if (res.ok) {
        setEmailSentNotice(`✓ Order file "${populatedExcel.fileName}" sent to ${populatedExcel.recipientEmail}!`);
        speakFeedback(`Order dispatched to ${populatedExcel.recipientEmail}`);
      } else {
        window.open(`mailto:${populatedExcel.recipientEmail}?subject=${encodeURIComponent(populatedExcel.subjectLine)}&body=${encodeURIComponent("Please find attached the inventory order spreadsheet: " + populatedExcel.fileName)}`);
        setEmailSentNotice(`✓ Mail client opened for ${populatedExcel.recipientEmail}`);
      }
    } catch (err) {
      window.open(`mailto:${populatedExcel.recipientEmail}?subject=${encodeURIComponent(populatedExcel.subjectLine)}&body=${encodeURIComponent("Please find attached the inventory order spreadsheet: " + populatedExcel.fileName)}`);
      setEmailSentNotice(`✓ Mail client opened for ${populatedExcel.recipientEmail}`);
    } finally {
      setIsEmailingOrder(false);
    }
  };

  const applyVoiceCount = (
    itemId: string, 
    count: number, 
    wlkIn?: number | null, 
    bar?: number | null, 
    spokenDetail?: string
  ) => {
    const item = itemsMapRef.current[itemId];
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
      speakFeedback(`${item.name}: ${spokenDetail || count}`);
    }
  };

  // 🎙️ Process voice input through Personalized Adaptive NLP + Gemini AI fallback
  const handleProcessSpokenText = async (rawText: string) => {
    if (!rawText.trim()) return;
    const cleanSpoken = rawText.trim();
    setLiveSpokenCaption(cleanSpoken);
    setVoiceTranscript(cleanSpoken);
    const lower = cleanSpoken.toLowerCase();
    const currentPrompt = activeModalPromptRef.current;
    const currentPhase = countingPhaseRef.current;

    // =========================================================================
    // A. DIALOG PROMPTS VOICE ROUTING ("SAVE IT?", "READY TO ORDER?", "MANUAL/VOICE")
    // =========================================================================
    if (currentPrompt === 'save_count') {
      if (/\b(yes|yeah|yep|si|sí|sure|save|save it|ok|okay|confirm)\b/i.test(lower)) {
        handleConfirmSaveCount();
        return;
      }
      if (/\b(no|nope|cancel|wait|review|back|stop)\b/i.test(lower)) {
        handleCancelSaveCount();
        return;
      }
    }

    if (currentPrompt === 'ready_to_order') {
      if (/\b(suggested|use suggested|use that|theo|theoretical)\b/i.test(lower)) {
        handleSelectOrderMethod('suggested');
        return;
      }
      if (/\b(yes|yeah|yep|si|sí|sure|order|ready|ok|okay)\b/i.test(lower)) {
        handleConfirmReadyToOrder();
        return;
      }
      if (/\b(no|nope|not yet|wait|review|cancel)\b/i.test(lower)) {
        handleCancelReadyToOrder();
        return;
      }
    }

    if (currentPrompt === 'select_order_method') {
      if (/\b(suggested|suggest|use that|use suggested|theo|theoretical|auto|automatic|recommended|yes|si|sí|1|one)\b/i.test(lower)) {
        handleSelectOrderMethod('suggested');
        return;
      }
      if (/\b(voice|speech|talk|speak|handsfree|2|two)\b/i.test(lower)) {
        handleSelectOrderMethod('voice');
        return;
      }
      if (/\b(manual|hand|type|keyboard|3|three)\b/i.test(lower)) {
        handleSelectOrderMethod('manual');
        return;
      }
    }

    if (currentPrompt === 'save_order') {
      if (/\b(yes|yeah|yep|si|sí|sure|save|save it|submit|confirm|done|finish)\b/i.test(lower)) {
        handleConfirmSaveOrder();
        return;
      }
      if (/\b(no|nope|cancel|wait|review|edit|back)\b/i.test(lower)) {
        handleCancelSaveOrder();
        return;
      }
    }

    const allItems = Object.values(itemsMapRef.current) as SubmissionItem[];
    const displayed = displayedItemsRef.current.length > 0 ? displayedItemsRef.current : allItems;

    // Current active item with the red outline
    const currentActiveItem = (activeVoiceItemIdRef.current && itemsMapRef.current[activeVoiceItemIdRef.current]) 
      || displayed[0] 
      || allItems[0];

    // =========================================================================
    // B. "SKIP TO [ITEM]" / "GO TO [ITEM]" / "SAVE IT" NAVIGATION COMMANDS
    // =========================================================================
    const skipMatch = lower.match(/(?:skip\s+to|go\s+to|jump\s+to|move\s+to)\s+(.+)/i);
    if (skipMatch) {
      const targetQuery = skipMatch[1].trim();
      const targetItem = findBestMatchingItem(targetQuery, displayed, allItems);
      if (targetItem) {
        jumpToItem(targetItem.itemId, `🎯 Skipped to: "${targetItem.name}"`);
        return;
      }
    }

    // Trigger save / prompt spoken shortcuts
    if (currentPhase === 'counting') {
      if (/\b(save it|save form|finish count|done counting|ready to order)\b/i.test(lower)) {
        setActiveModalPrompt('save_count');
        speakFeedback("SAVE IT?");
        return;
      }
    } else if (currentPhase === 'ordering') {
      if (/\b(save it|save order|finish order|done ordering|complete order|submit order)\b/i.test(lower)) {
        setActiveModalPrompt('save_order');
        speakFeedback("SAVE IT?");
        return;
      }
    }

    // =========================================================================
    // C. ORDERING PHASE VOICE ENTRY (Fills Final Order & Advances Down)
    // =========================================================================
    if (currentPhase === 'ordering') {
      // 1. Spoken command to apply suggested order to all
      if (/\b(use\s+all\s+suggested|apply\s+all\s+suggested|all\s+suggested|use\s+suggested\s+for\s+all)\b/i.test(lower)) {
        handleApplyAllSuggestedOrders();
        setVoiceActionNotice("✨ Applied Suggested Orders to all items!");
        speakFeedback("Applied suggested order to all items.");
        return;
      }

      // 2. Spoken command to use suggested order for active item
      if (/\b(use\s+suggested|suggested|suggested\s+order|use\s+that|take\s+suggested|same)\b/i.test(lower)) {
        const itemToUpdate = currentActiveItem;
        if (itemToUpdate) {
          const theo = Math.max(0, (itemToUpdate.parLevel || 0) - (itemToUpdate.currentCount || 0));
          handleFinalOrderChange(itemToUpdate.itemId, String(theo));
          setVoiceActionNotice(`✓ Set Order for "${itemToUpdate.name}" to suggested (${theo})`);
          speakFeedback(`${itemToUpdate.name}: order ${theo}`);
          advanceToNextOrderItem(itemToUpdate.itemId);
          return;
        }
      }

      const extractedCount = extractQuantityFromSpeech(cleanSpoken);
      const matchedItem = findBestMatchingItem(cleanSpoken, displayed, allItems);

      if (matchedItem && extractedCount !== null) {
        handleFinalOrderChange(matchedItem.itemId, String(extractedCount));
        setVoiceActionNotice(`✓ Set Order for "${matchedItem.name}" to ${extractedCount}`);
        speakFeedback(`${matchedItem.name}: order ${extractedCount}`);
        advanceToNextOrderItem(matchedItem.itemId);
        return;
      }

      if (matchedItem && extractedCount === null) {
        jumpToItem(matchedItem.itemId);
        return;
      }

      if (!matchedItem && extractedCount !== null && currentActiveItem) {
        handleFinalOrderChange(currentActiveItem.itemId, String(extractedCount));
        setVoiceActionNotice(`✓ Set Order for "${currentActiveItem.name}" to ${extractedCount}`);
        speakFeedback(`${currentActiveItem.name}: order ${extractedCount}`);
        advanceToNextOrderItem(currentActiveItem.itemId);
        return;
      }

      return;
    }

    // =========================================================================
    // D. COUNTING PHASE VOICE ENTRY (Fills Inventory Count & Advances Down)
    // =========================================================================
    // 1. Dual Beer matching (walk-in and bar)
    const walkInBarRegex = /(.*?)(?:walk\s*in|walkin)\s*(\d+(?:\.\d+)?).*?(?:bar|front)\s*(\d+(?:\.\d+)?)/i;
    const wlkMatch = lower.match(walkInBarRegex);
    if (wlkMatch) {
      const phraseItem = wlkMatch[1].trim();
      const wlkVal = parseFloat(wlkMatch[2]);
      const barVal = parseFloat(wlkMatch[3]);
      let target = displayed.find(i => 
        i.name.toLowerCase().includes(phraseItem) || phraseItem.includes(i.name.toLowerCase())
      );
      if (!target) target = allItems.find(i => 
        i.name.toLowerCase().includes(phraseItem) || phraseItem.includes(i.name.toLowerCase())
      );
      if (!target && currentActiveItem) target = currentActiveItem;

      if (target) {
        applyVoiceCount(target.itemId, wlkVal + barVal, wlkVal, barVal, `Walk-in ${wlkVal}, Bar ${barVal}`);
        advanceToNextItem(target.itemId);
        // Learn pattern
        const pat = detectPhrasingOrder(cleanSpoken);
        const up = recordLearnedSpeechPattern(activeVoiceUser.id, pat, cleanSpoken, target.name);
        setUserVoiceProfile(up);
        return;
      }
    }

    // 2. Extract numeric quantity from speech
    const extractedCount = extractQuantityFromSpeech(cleanSpoken);

    // 3. Search for item name mentioned in spoken speech (applies user vocabulary aliases)
    const matchedItem = findBestMatchingItem(cleanSpoken, displayed, allItems);

    // CASE A: User said a specific item name AND a quantity (e.g. "5 cases of Chicken", "Case Chicken 5", "5 Chicken Cases")
    if (matchedItem && extractedCount !== null) {
      const unitNotice = cleanSpoken.toLowerCase().includes('case') ? 'cases' : matchedItem.unit || 'units';
      const actionMsg = `✓ Set "${matchedItem.name}" to ${extractedCount} ${unitNotice}`;
      setVoiceActionNotice(actionMsg);
      applyVoiceCount(matchedItem.itemId, extractedCount, null, null, `${extractedCount} ${unitNotice}`);
      advanceToNextItem(matchedItem.itemId);
      // Learn pattern for current user
      const pat = detectPhrasingOrder(cleanSpoken);
      const up = recordLearnedSpeechPattern(activeVoiceUser.id, pat, cleanSpoken, matchedItem.name);
      setUserVoiceProfile(up);
      return;
    }

    // CASE B: User said a DIFFERENT item name with NO quantity (Skipping/Jumping!)
    // e.g. Next item is Chorizo, but user says "Sausage"
    if (matchedItem && extractedCount === null) {
      jumpToItem(matchedItem.itemId);
      const pat = detectPhrasingOrder(cleanSpoken);
      const up = recordLearnedSpeechPattern(activeVoiceUser.id, pat, cleanSpoken, matchedItem.name);
      setUserVoiceProfile(up);
      return;
    }

    // CASE C: User said ONLY a quantity with NO item name (Filling the active item with red outline!)
    // e.g. User is on Chicken Breast (red box) and says "5", "five cases", "twelve"
    if (!matchedItem && extractedCount !== null && currentActiveItem) {
      const unitNotice = cleanSpoken.toLowerCase().includes('case') ? 'cases' : currentActiveItem.unit || 'units';
      const actionMsg = `✓ Set "${currentActiveItem.name}" to ${extractedCount} ${unitNotice}`;
      setVoiceActionNotice(actionMsg);
      applyVoiceCount(currentActiveItem.itemId, extractedCount, null, null, `${extractedCount} ${unitNotice}`);
      advanceToNextItem(currentActiveItem.itemId);
      const pat = detectPhrasingOrder(cleanSpoken);
      const up = recordLearnedSpeechPattern(activeVoiceUser.id, pat, cleanSpoken, currentActiveItem.name);
      setUserVoiceProfile(up);
      return;
    }

    // CASE D: Fallback to Personalized Gemini AI Voice Understanding endpoint
    setAiParsingInProgress(true);
    try {
      const res = await fetch('/api/ai/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spokenText: rawText,
          availableItemNames: displayed.map(i => i.name),
          userVoiceProfile: userVoiceProfile
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          const firstMatch = data.matches[0];
          const target = allItems.find(i => 
            i.name.toLowerCase() === firstMatch.matchedItemName?.toLowerCase() ||
            i.name.toLowerCase().includes(firstMatch.matchedItemName?.toLowerCase())
          );
          if (target && firstMatch.count !== null && firstMatch.count !== undefined) {
            applyVoiceCount(target.itemId, firstMatch.count, firstMatch.wlkInCount, firstMatch.barCount);
            advanceToNextItem(target.itemId);
            setAiParsingInProgress(false);
            if (firstMatch.patternDetected) {
              const up = recordLearnedSpeechPattern(activeVoiceUser.id, firstMatch.patternDetected, cleanSpoken, target.name);
              setUserVoiceProfile(up);
            }
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Gemini voice parse fallback error", e);
    }
    setAiParsingInProgress(false);
    setVoiceActionNotice(`Could not recognize count. Try: "5 cases of ${currentActiveItem?.name || 'Item'}" or say a number.`);
  };

  // Start Voice feature to count (announces "I'M READY!", focuses first item with red outline, starts speech recognition)
  const startVoiceCounting = () => {
    setCountInputMethod('voice');
    setContinuousListening(true);
    
    const candidates = displayedItemsRef.current.length > 0 ? displayedItemsRef.current : (Object.values(itemsMapRef.current) as SubmissionItem[]);
    const targetId = (activeVoiceItemIdRef.current && candidates.some(i => i.itemId === activeVoiceItemIdRef.current))
      ? activeVoiceItemIdRef.current
      : candidates[0]?.itemId || null;
    
    if (targetId) {
      setActiveVoiceItemId(targetId);
      setTimeout(() => {
        itemRowRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }

    setLiveSpokenCaption("");
    const readyMsg = "I'M READY! Waiting for you to speak...";
    setVoiceActionNotice(readyMsg);
    setVoiceFeedbackMsg(readyMsg);
    speakFeedback("I'M READY!");

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Speech start:", e);
      }
    }
  };

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
      startVoiceCounting();
    }
  };

  // Browser Speech Recognition Lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = continuousListening;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsVoiceListening(true);
      setVoiceFeedbackMsg("Listening hands-free... Say count or item name.");
    };

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const trans = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += trans;
        } else {
          interim += trans;
        }
      }

      const heard = (final || interim).trim();
      if (heard) {
        setLiveSpokenCaption(heard);
      }

      if (final.trim()) {
        handleProcessSpokenText(final.trim());
      }
    };

    rec.onerror = (e: any) => {
      console.warn("Speech error:", e.error);
      if (e.error !== 'no-speech') {
        setIsVoiceListening(false);
      }
    };

    rec.onend = () => {
      const activeVoiceMode = (countInputMethod === 'voice' || orderInputMethod === 'voice' || activeModalPrompt !== 'none');
      if (activeVoiceMode && continuousListening) {
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
  }, [continuousListening, countInputMethod, orderInputMethod, activeModalPrompt]);

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
  displayedItemsRef.current = displayedItems;

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
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded uppercase">
                    STORE: {form.locationCode}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded">
                    ACTIVE COUNTING
                  </span>

                  {/* 👤 Per-User Account Switcher */}
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-0.5 rounded-lg">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] text-slate-400 font-mono">COUNTING AS:</span>
                    <select
                      value={activeVoiceUser.id}
                      onChange={(e) => {
                        const found = sampleUsers.find(u => u.id === e.target.value);
                        if (found) handleSwitchVoiceUser(found);
                      }}
                      className="bg-transparent text-white text-[11px] font-bold focus:outline-none cursor-pointer"
                    >
                      {sampleUsers.map(u => (
                        <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                          {u.name} ({u.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
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
                  onClick={startVoiceCounting}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                    countInputMethod === 'voice'
                      ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
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
              <div className="bg-slate-950/95 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleVoiceListening}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition shadow-lg cursor-pointer ${
                        isVoiceListening
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/50 ring-4 ring-red-400/40'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                      }`}
                      title={isVoiceListening ? 'Tap to pause microphone' : 'Tap to start voice recognition'}
                    >
                      {isVoiceListening ? <Mic className="w-7 h-7 stroke-3" /> : <Mic className="w-7 h-7" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base text-white">
                          {isVoiceListening ? '🎙️ Listening Hands-Free...' : '🎙️ Tap Mic to Start Voice Counting'}
                        </h4>
                        {isVoiceListening && (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-mono mt-0.5">
                        {isVoiceListening ? (
                          <>Red outline shows active box. Say <i>"5 cases"</i>, <i>"5 cases of {itemsMap[activeVoiceItemId || '']?.name || 'Chicken'}"</i>, or name another item to skip!</>
                        ) : (
                          <>Tap the microphone or say <i>"I'm ready"</i> to activate speech recognition</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Read-back voice audio toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSpeechSynthesisEnabled(!speechSynthesisEnabled)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition border cursor-pointer ${
                        speechSynthesisEnabled
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-400 shadow-xs'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                      title="Speak confirmation out loud after each item is counted"
                    >
                      {speechSynthesisEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                      <span>{speechSynthesisEnabled ? 'Audio Feedback: ON' : 'Audio Feedback: OFF'}</span>
                    </button>
                  </div>
                </div>

                {/* 🗣️ LIVE SPOKEN CAPTION DISPLAY */}
                <div className="bg-slate-900 border-2 border-amber-400/50 rounded-xl p-3.5 sm:p-4 shadow-md space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                      Live Voice Caption
                    </span>
                    <div className="flex items-center gap-2">
                      {activeVoiceItemId && itemsMap[activeVoiceItemId] && (
                        <span className="bg-rose-950/90 border border-rose-500/60 text-rose-300 px-2.5 py-0.5 rounded text-[10.5px] font-bold animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                          Waiting: {itemsMap[activeVoiceItemId].name}
                        </span>
                      )}
                      {isVoiceListening && (
                        <span className="text-emerald-400 font-bold bg-emerald-950/90 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          STANDBY / LISTENING
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quoted caption box */}
                  <div className="bg-slate-950 p-3 sm:p-3.5 rounded-lg border border-slate-800">
                    {liveSpokenCaption ? (
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-400 text-sm font-mono shrink-0">Heard:</span>
                          <p className="text-white text-base sm:text-lg font-black tracking-wide font-sans">
                            “{liveSpokenCaption}”
                          </p>
                        </div>
                        <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                          <span>{voiceActionNotice || voiceFeedbackMsg || 'Processing speech command...'}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1 py-1">
                        <p className="text-amber-400 text-sm sm:text-base font-black tracking-wider uppercase flex items-center gap-2">
                          <span className="text-lg">📢</span> "I'M READY!"
                        </p>
                        <p className="text-xs font-mono text-slate-300">
                          The red outline below marks the active item waiting for a number. Read the item and say the value (e.g. <i>"5 cases of {itemsMap[activeVoiceItemId || '']?.name || 'Chicken Breast'}"</i>, or just <i>"5"</i>). If you skip and say another item like <i>"Sausage"</i>, the red outline moves to that line automatically!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🧠 AI Voice Speech Adaptation Deck */}
                <div className="bg-gradient-to-br from-slate-900/95 via-slate-950 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-3 sm:p-4 space-y-3 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                            Speech Pattern Learning: {activeVoiceUser.name}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.2 rounded-full font-bold border ${
                            userVoiceProfile.calibrated 
                              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                              : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-300'
                          }`}>
                            {userVoiceProfile.calibrated ? '✓ Calibrated' : 'Learning'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          Adapts to {activeVoiceUser.name.split(' ')[0]}'s accent, vocal pitch, and phrasing permutations
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-xs">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{userVoiceProfile.accuracyRatePct}% Accuracy</span>
                        <span className="text-slate-400 text-[10px]">({userVoiceProfile.successfulMatches}/{userVoiceProfile.totalVoiceInputs})</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setShowVoiceTrainingModal(true)}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Voice Training</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAliasManager(true)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Manage custom phonetic nicknames and slang aliases"
                      >
                        <span>Nicknames ({Object.keys(userVoiceProfile.vocabularyAliases || {}).length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Adaptive Controls: Accent Tuning & Pitch Tuning */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs font-mono">
                    {/* Accent Dialect Tuning */}
                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                      <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                        <span>Accent / Dialect:</span>
                        <span className="text-amber-400 font-bold capitalize">{userVoiceProfile.accentDialect.replace('_', ' ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'general', label: 'Standard' },
                          { id: 'hispanic_latino', label: '🇲🇽 Hispanic/Latino' },
                          { id: 'kitchen_fast', label: '⚡ Kitchen Slang' },
                          { id: 'southern', label: 'Southern' }
                        ].map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleUpdateAccent(acc.id as any)}
                            className={`px-2 py-0.5 rounded text-[10.5px] transition cursor-pointer font-bold ${
                              userVoiceProfile.accentDialect === acc.id
                                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {acc.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Vocal Pitch / Tone Tuning */}
                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg space-y-1.5">
                      <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                        <span>Vocal Pitch / Tone:</span>
                        <span className="text-cyan-400 font-bold capitalize">{userVoiceProfile.pitchTone} Tone</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'normal', label: 'Natural Range' },
                          { id: 'higher', label: 'High Tone' },
                          { id: 'deep', label: 'Deep Tone' }
                        ].map(pt => (
                          <button
                            key={pt.id}
                            type="button"
                            onClick={() => handleUpdatePitch(pt.id as any)}
                            className={`px-2 py-0.5 rounded text-[10.5px] transition cursor-pointer font-bold ${
                              userVoiceProfile.pitchTone === pt.id
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-xs'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {pt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phrasing Grammar Habit */}
                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-lg space-y-1 sm:col-span-2 lg:col-span-1">
                      <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-between">
                        <span>Learned Phrasing Habit:</span>
                        <span className="text-emerald-400 font-bold">Active</span>
                      </div>
                      <p className="text-[11px] text-slate-200 truncate font-mono">
                        {userVoiceProfile.phrasingHabits?.mostUsedPattern === 'qty_unit_item' && 'Qty → Unit → Item ("5 cases of Chicken")'}
                        {userVoiceProfile.phrasingHabits?.mostUsedPattern === 'unit_item_qty' && 'Unit → Item → Qty ("Case Chicken 5")'}
                        {userVoiceProfile.phrasingHabits?.mostUsedPattern === 'qty_item_unit' && 'Qty → Item → Unit ("5 Chicken Cases")'}
                        {userVoiceProfile.phrasingHabits?.mostUsedPattern === 'item_qty' && 'Item → Qty ("Chicken 5")'}
                        {userVoiceProfile.phrasingHabits?.mostUsedPattern === 'adaptive' && 'Adaptive Permutations'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {userVoiceProfile.totalVoiceInputs} speech inputs recorded • Auto-learning
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Voice Simulation Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400 uppercase text-[9px] font-bold shrink-0">Try Voice Commands:</span>
                  <button
                    type="button"
                    onClick={() => handleProcessSpokenText(`1.5 cases of ${displayedItems[0]?.name || 'Chicken Breast'}`)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition cursor-pointer"
                  >
                    "1.5 cases of {displayedItems[0]?.name || 'Chicken Breast'}"
                  </button>
                  {displayedItems[1] && (
                    <button
                      type="button"
                      onClick={() => handleProcessSpokenText(`Case ${displayedItems[1].name} 1.75`)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 rounded-lg transition cursor-pointer"
                    >
                      "Case {displayedItems[1].name} 1.75"
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleProcessSpokenText("1.25")}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-lg transition cursor-pointer"
                  >
                    Say decimal count: "1.25"
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessSpokenText("one and a half")}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 rounded-lg transition cursor-pointer"
                  >
                    Say fraction: "one and a half"
                  </button>
                  {isBarSheet && (
                    <button
                      type="button"
                      onClick={() => handleProcessSpokenText("Corona 8 walk in and 3 bar")}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 rounded-lg transition cursor-pointer"
                    >
                      "Corona 8 walk in and 3 bar"
                    </button>
                  )}
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

          {/* 🗣️ Floating Sticky Voice Status Bar when in Voice Count mode */}
          {countInputMethod === 'voice' && (
            <div className="sticky top-2 z-20 bg-slate-950/95 backdrop-blur-md border border-amber-500/50 p-2.5 sm:p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0"></span>
                <span className="text-amber-400 font-bold uppercase text-[10px] shrink-0">🗣️ Live Voice:</span>
                <span className="text-white truncate font-bold text-xs sm:text-sm">
                  {liveSpokenCaption ? `“${liveSpokenCaption}”` : '"I\'M READY! Waiting for you to speak..."'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeVoiceItemId && itemsMap[activeVoiceItemId] && (
                  <span className="bg-rose-950 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-[10.5px] font-black animate-pulse flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                    Waiting: {itemsMap[activeVoiceItemId].name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleVoiceListening}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1 transition cursor-pointer ${
                    isVoiceListening ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  <Mic className="w-3 h-3" />
                  <span>{isVoiceListening ? 'Listening' : 'Start Mic'}</span>
                </button>
              </div>
            </div>
          )}

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
                const isVoiceActive = countInputMethod === 'voice' && activeVoiceItemId === item.itemId;

                return (
                  <div
                    key={item.itemId}
                    ref={(el) => { itemRowRefs.current[item.itemId] = el; }}
                    onClick={() => {
                      if (countInputMethod === 'voice') {
                        jumpToItem(item.itemId);
                      }
                    }}
                    className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isVoiceActive
                        ? 'ring-4 ring-rose-500/80 border-rose-500 bg-rose-50/30 shadow-xl scale-[1.01]'
                        : isLastUpdated
                        ? 'ring-2 ring-emerald-500 bg-emerald-50/40 border-emerald-400'
                        : item.currentCount > 0
                        ? 'border-emerald-300 bg-emerald-50/15'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* ONLY ITEM NAME! */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`font-mono text-xs font-black w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                        isVoiceActive ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                      }`}>
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug truncate">
                            {item.requiresDating && <span className="text-rose-600 font-black mr-1">*</span>}
                            {item.name}
                          </h3>
                          {isVoiceActive && (
                            <span className="hidden sm:inline-flex items-center gap-1 bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md animate-pulse shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                              Active Voice Line
                            </span>
                          )}
                        </div>
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
                        <div className={`flex flex-col items-center p-1.5 rounded-xl transition ${
                          isVoiceActive
                            ? 'bg-rose-50 border-2 border-rose-500 ring-2 ring-rose-400/60 animate-pulse'
                            : 'bg-slate-50 border border-slate-200'
                        }`}>
                          <span className={`text-[9px] uppercase font-bold font-mono mb-1 ${
                            isVoiceActive ? 'text-rose-700 font-black' : 'text-slate-500'
                          }`}>
                            {isVoiceActive ? '🔴 Walk-In' : 'Walk-In'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDecrementWlkIn(item.itemId, 1); }}
                              className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              ref={(el) => { inputRefs.current[item.itemId] = el; }}
                              type="number"
                              min="0"
                              value={item.wlkInCount === 0 ? '' : item.wlkInCount}
                              onChange={(e) => handleWlkInChange(item.itemId, e.target.value)}
                              onFocus={() => {
                                if (countInputMethod === 'voice') {
                                  setActiveVoiceItemId(item.itemId);
                                }
                              }}
                              placeholder="0"
                              className={`w-14 text-center font-mono font-black text-base py-1.5 rounded-lg transition ${
                                isVoiceActive
                                  ? 'bg-rose-50 text-rose-950 border-2 border-rose-600 ring-2 ring-rose-400 focus:outline-none focus:bg-white'
                                  : 'bg-emerald-100 text-emerald-950 border border-emerald-400 focus:outline-none focus:bg-white'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleIncrementWlkIn(item.itemId, 1); }}
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
                              onClick={(e) => { e.stopPropagation(); handleDecrementBar(item.itemId, 1); }}
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
                              onClick={(e) => { e.stopPropagation(); handleIncrementBar(item.itemId, 1); }}
                              className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer touch-manipulation"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Standard single count input with big + and - touch buttons + fractional quick chips + RED WAITING OUTLINE
                      <div className="flex flex-col items-end gap-1.5 shrink-0 self-end sm:self-center">
                        <div className="relative flex items-center gap-1.5">
                          {/* Red pulsating badge waiting for number */}
                          {isVoiceActive && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse shadow-md flex items-center gap-1.5 border border-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                WAITING FOR NUMBER
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDecrementCount(item.itemId, 1); }}
                            className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-base flex items-center justify-center transition border border-slate-300 touch-manipulation cursor-pointer"
                            title="Subtract 1"
                          >
                            <Minus className="w-4 h-4 stroke-3" />
                          </button>

                          <input
                            ref={(el) => { inputRefs.current[item.itemId] = el; }}
                            type="number"
                            min="0"
                            step="any"
                            value={item.currentCount === 0 ? '' : item.currentCount}
                            onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                            onFocus={() => {
                              if (countInputMethod === 'voice') {
                                setActiveVoiceItemId(item.itemId);
                              }
                            }}
                            placeholder="0"
                            className={`w-20 sm:w-24 h-11 text-center font-mono font-black text-xl rounded-xl transition cursor-text ${
                              isVoiceActive
                                ? 'bg-rose-50 text-rose-950 border-4 border-rose-600 ring-4 ring-rose-400/60 animate-pulse shadow-inner focus:outline-none'
                                : 'bg-emerald-100 text-emerald-950 border-2 border-emerald-400 focus:bg-white focus:outline-none focus:border-emerald-600'
                            }`}
                          />

                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleIncrementCount(item.itemId, 1); }}
                            className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex items-center justify-center transition shadow-sm touch-manipulation cursor-pointer"
                            title="Add 1"
                          >
                            <Plus className="w-4 h-4 stroke-3" />
                          </button>
                        </div>

                        {/* Quick Decimal / Fractional Touch Buttons */}
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleIncrementCount(item.itemId, 0.25); }}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold border border-slate-300 transition cursor-pointer"
                            title="Add 0.25 (Quarter Case)"
                          >
                            +¼ (.25)
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleIncrementCount(item.itemId, 0.5); }}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold border border-slate-300 transition cursor-pointer"
                            title="Add 0.5 (Half Case)"
                          >
                            +½ (.50)
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleIncrementCount(item.itemId, 0.75); }}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold border border-slate-300 transition cursor-pointer"
                            title="Add 0.75 (Three-Quarters Case)"
                          >
                            +¾ (.75)
                          </button>
                        </div>
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
                Counts: <strong className="text-amber-400">{stats.totalCounted} of {stats.totalItems}</strong> items entered
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModalPrompt('save_count');
                  speakFeedback("Save it?");
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <Save className="w-4 h-4 stroke-3" />
                <span>Save Count ("SAVE IT?")</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCountingPhase('review');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Review Sheet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : countingPhase === 'review' ? (
        /* 📋 REVIEW PHASE (EVERYTHING SHOWN FOR CHECKING) */
        <div className="space-y-5 animate-fadeIn">
          
          {/* Review Banner with Ready to Order & Back to Counting Buttons */}
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModalPrompt('ready_to_order');
                  speakFeedback("Ready to order?");
                }}
                className="bg-slate-950 hover:bg-slate-900 text-amber-400 border border-amber-400/50 font-black px-4 py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 shadow transition cursor-pointer active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Ready to Order?</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setCountingPhase('counting');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-slate-950/80 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Count</span>
              </button>
            </div>
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
                            step="any"
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
                              step="any"
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
                              step="any"
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
                              step="any"
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
                                step="any"
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
                                step="any"
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
                              step="any"
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
                            step="any"
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
                          step="any"
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
                          step="any"
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
                          step="any"
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
                          step="any"
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

          {/* Quick Use Suggested Order Button */}
          <button
            type="button"
            onClick={() => handleSelectOrderMethod('suggested')}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black px-5 py-3.5 rounded-xl text-xs uppercase cursor-pointer tracking-wider shadow-md hover:shadow-amber-200 active:scale-[0.98] transition"
            title="Auto-fill all items with Suggested Order (Par Level - Inventory)"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Use Suggested Order</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Ready to Order Button */}
          <button
            type="button"
            onClick={() => {
              setActiveModalPrompt('ready_to_order');
              speakFeedback("Ready to order?");
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3.5 rounded-xl text-xs uppercase cursor-pointer tracking-wider shadow-md hover:shadow-emerald-200 active:scale-[0.98] transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ready to Order</span>
            <ArrowRight className="w-4 h-4" />
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
  ) : countingPhase === 'ordering' ? (
    /* ========================================================================= */
    /* 📦 ORDERING PHASE (INVENTORY, PAR, THEORETICAL ORDER, ORDER BOX)           */
    /* ========================================================================= */
    <div className="space-y-4 animate-fadeIn">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded uppercase">
                STORE: {form.locationCode}
              </span>
              <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-950/80 border border-indigo-500/40 px-2 py-0.5 rounded">
                ORDERING PHASE
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                ORDERING AS: <strong className="text-white">{activeVoiceUser.name}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-display text-white mt-1.5">
              {form.title} — Store Order
            </h2>
            <p className="text-xs text-slate-300 font-mono mt-0.5">
              Ordered Total: <strong className="text-amber-400 font-bold">{stats.totalFinal}</strong> units across {displayedItems.length} items
            </p>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveModalPrompt('save_order');
                speakFeedback("Save it?");
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-3" />
              <span>Save & Finish Order ("SAVE IT?")</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCountingPhase('review');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase transition cursor-pointer"
            >
              Review
            </button>
          </div>
        </div>

        {/* Mode Switcher & Quick Suggested Order Action */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setOrderInputMethod('manual');
                  if (isVoiceListening && recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch {}
                    setIsVoiceListening(false);
                  }
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  orderInputMethod === 'manual'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>✍️ Manual Order</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderInputMethod('voice');
                  startVoiceCounting();
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  orderInputMethod === 'voice'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>🎙️ Voice Order (AI)</span>
              </button>
            </div>

            {/* Quick Button: Use Suggested Order for All */}
            <button
              type="button"
              onClick={handleApplyAllSuggestedOrders}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1.5"
              title="Apply Suggested Order (Par Level minus Inventory) to every line item"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡ Use Suggested Order for All</span>
            </button>
          </div>

          <div className="text-xs text-slate-300 font-mono">
            Formula: <span className="text-amber-300 font-bold">Suggested Order = Par Level - Inventory</span>
          </div>
        </div>

        {/* Voice Status Box in Ordering Mode */}
        {orderInputMethod === 'voice' && (
          <div className="bg-slate-950/90 border border-indigo-500/50 p-3 sm:p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                🎙️ Voice Ordering Assistant Active
              </span>
              {activeVoiceItemId && itemsMap[activeVoiceItemId] && (
                <span className="bg-rose-950 text-rose-300 border border-rose-500 px-2 py-0.5 rounded text-[10.5px] font-black animate-pulse">
                  Focus: {itemsMap[activeVoiceItemId].name}
                </span>
              )}
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs font-mono">
              {liveSpokenCaption ? (
                <p className="text-white font-black text-sm">“{liveSpokenCaption}”</p>
              ) : (
                <p className="text-slate-300">
                  Red outline shows active order box. Say just the number (e.g. <i>"3"</i>, <i>"1.5"</i>) to enter order and move to the next item line, or say <i>"SKIP TO [ITEM]"</i>!
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Voice Bar if in Voice Order Mode */}
      {orderInputMethod === 'voice' && (
        <div className="sticky top-2 z-20 bg-slate-950/95 backdrop-blur-md border border-indigo-500/50 p-2.5 sm:p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0"></span>
            <span className="text-indigo-400 font-bold uppercase text-[10px] shrink-0">🎙️ Spoken Order:</span>
            <span className="text-white truncate font-bold text-xs sm:text-sm">
              {liveSpokenCaption ? `“${liveSpokenCaption}”` : '"Listening... Say order number"'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeVoiceItemId && itemsMap[activeVoiceItemId] && (
              <span className="bg-rose-950 border border-rose-500 text-rose-300 px-2.5 py-1 rounded-lg text-[10.5px] font-black animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                Order: {itemsMap[activeVoiceItemId].name}
              </span>
            )}
            <button
              type="button"
              onClick={toggleVoiceListening}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1 transition cursor-pointer ${
                isVoiceListening ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>{isVoiceListening ? 'Listening' : 'Start Mic'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Ordering Items List (Mobile-Optimized Layout) */}
      <div className="space-y-3">
        {displayedItems.map((item, index) => {
          const isVoiceActive = orderInputMethod === 'voice' && activeVoiceItemId === item.itemId;
          const theoOrder = Math.max(0, (item.parLevel || 0) - (item.currentCount || 0));
          const hasOrdered = (item.finalOrder || 0) > 0;

          return (
            <div
              key={item.itemId}
              ref={(el) => { itemRowRefs.current[item.itemId] = el; }}
              onClick={() => {
                if (orderInputMethod === 'voice') {
                  jumpToItem(item.itemId);
                }
              }}
              className={`bg-white border rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col gap-3 ${
                isVoiceActive
                  ? 'ring-4 ring-rose-500/80 border-rose-500 bg-rose-50/30 shadow-xl scale-[1.01]'
                  : hasOrdered
                  ? 'border-amber-300 bg-amber-50/15'
                  : 'border-slate-200'
              }`}
            >
              {/* Top Item Row */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`font-mono text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isVoiceActive ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700'
                  }`}>
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug truncate">
                      {item.requiresDating && <span className="text-rose-600 font-black mr-1">*</span>}
                      {item.name}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      Unit: <strong className="text-slate-800">{item.unit}</strong> {item.itemCode ? `• Code: ${item.itemCode}` : ''}
                    </span>
                  </div>
                </div>

                {isVoiceActive && (
                  <span className="inline-flex items-center gap-1 bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                    Active Voice Order
                  </span>
                )}
              </div>

              {/* 4-Box Metrics Row: 1. INVENTORY, 2. PAR LEVEL, 3. THEORETICAL ORDER, 4. ORDER BOX */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-center">
                {/* 1. INVENTORY */}
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-emerald-700 font-bold block mb-0.5">
                    1. INVENTORY (Count)
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-black text-emerald-950">
                    {item.currentCount || 0}
                  </span>
                </div>

                {/* 2. PAR LEVEL */}
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-0.5">
                    2. PAR LEVEL
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-black text-slate-800">
                    {item.parLevel || 0}
                  </span>
                </div>

                {/* 3. SUGGESTED ORDER (PAR LEVEL - INVENTORY) */}
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-amber-800 font-bold block mb-0.5">
                    3. SUGGESTED ORDER
                  </span>
                  <span className="font-mono text-lg sm:text-xl font-black text-amber-950">
                    {theoOrder}
                  </span>
                </div>

                {/* 4. ORDER BOX (Editable final order) */}
                <div className="flex flex-col items-center gap-1 col-span-2 sm:col-span-1">
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-indigo-700 font-bold block text-center">
                    4. ORDER BOX
                  </span>
                  <div className="relative flex items-center gap-1 w-full justify-center">
                    {isVoiceActive && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse shadow-md flex items-center gap-1 border border-white">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                          WAITING FOR ORDER #
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const cur = item.finalOrder || 0;
                        handleFinalOrderChange(item.itemId, String(Math.max(0, cur - 1)));
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-base flex items-center justify-center transition border border-slate-300 touch-manipulation cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-3" />
                    </button>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.finalOrder === 0 ? '' : item.finalOrder}
                      onChange={(e) => handleFinalOrderChange(item.itemId, e.target.value)}
                      onFocus={() => {
                        if (orderInputMethod === 'voice') {
                          setActiveVoiceItemId(item.itemId);
                        }
                      }}
                      placeholder="0"
                      className={`w-20 sm:w-24 h-10 text-center font-mono font-black text-lg rounded-xl transition cursor-text ${
                        isVoiceActive
                          ? 'bg-rose-50 text-rose-950 border-4 border-rose-600 ring-4 ring-rose-400/60 animate-pulse focus:outline-none'
                          : 'bg-amber-100 text-amber-950 border-2 border-amber-400 focus:bg-white focus:outline-none focus:border-amber-600'
                      }`}
                    />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const cur = item.finalOrder || 0;
                        handleFinalOrderChange(item.itemId, String(cur + 1));
                      }}
                      className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-base flex items-center justify-center transition shadow-sm touch-manipulation cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-3" />
                    </button>
                  </div>

                  {/* Quick fractional and Suggested buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-1 font-mono text-[9px] mt-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const cur = item.finalOrder || 0;
                        handleFinalOrderChange(item.itemId, String(Math.round((cur + 0.25) * 100) / 100));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 cursor-pointer"
                    >
                      +¼
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const cur = item.finalOrder || 0;
                        handleFinalOrderChange(item.itemId, String(Math.round((cur + 0.5) * 100) / 100));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 cursor-pointer"
                    >
                      +½
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const cur = item.finalOrder || 0;
                        handleFinalOrderChange(item.itemId, String(Math.round((cur + 0.75) * 100) / 100));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 cursor-pointer"
                    >
                      +¾
                    </button>
                    {/* One-tap Suggested Order Chip */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinalOrderChange(item.itemId, String(theoOrder));
                      }}
                      className={`px-2 py-0.5 rounded font-bold border transition cursor-pointer flex items-center gap-1 ${
                        (item.finalOrder || 0) === theoOrder && theoOrder > 0
                          ? 'bg-amber-200 text-amber-950 border-amber-400 shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                      title="Set to Suggested Order"
                    >
                      <Sparkles className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                      <span>Use Suggested ({theoOrder})</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Action Bar in Ordering Mode */}
      <div className="sticky bottom-4 z-30 bg-slate-900/95 backdrop-blur-md text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-xs sm:text-sm font-bold font-mono">
            Order Total: <strong className="text-amber-400">{stats.totalFinal}</strong> units ready to order
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveModalPrompt('save_order');
            speakFeedback("Save it?");
          }}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-3 rounded-xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-3" />
          <span>Save Order ("SAVE IT?")</span>
        </button>
      </div>
    </div>
  ) : (
    /* ========================================================================= */
    /* 🎉 COMPLETED PHASE (DOWNLOAD EXCEL, PREVIEW FILE, EMAIL FILE)              */
    /* ========================================================================= */
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/50 shadow-2xl space-y-5 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded uppercase">
                STORE ORDER SAVED & VERIFIED
              </span>
              <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 rounded">
                STORE: {form.locationCode}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white mt-1.5">
              {form.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Completed by <strong className="text-white">{activeVoiceUser.name}</strong> • {dateStr} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Verification Tag Card */}
        <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2 text-left font-mono">
          <div className="flex items-center justify-between text-[11px] text-emerald-400 uppercase font-bold border-b border-white/10 pb-2">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Authentic Populated Excel Template
            </span>
            <span className="text-slate-400 text-[10px]">Populated & Ready</span>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-white">
              <span className="text-slate-400">File Name: </span>
              <strong className="text-emerald-300 font-black">{populatedExcel?.fileName || 'InventoryOrder.xlsx'}</strong>
            </p>
            <p className="text-slate-300 text-[11px]">
              <span className="text-slate-400">Verification Footer: </span>
              <strong className="text-amber-300">{populatedExcel?.footerText || ''}</strong>
            </p>
            <p className="text-slate-400 text-[11px]">
              Recipient: <strong className="text-slate-200">{populatedExcel?.recipientEmail || 'michael.goyone@gmail.com'}</strong>
            </p>
          </div>
        </div>

        {/* Notice banner if emailed */}
        {emailSentNotice && (
          <div className="bg-emerald-950/90 border border-emerald-400 text-emerald-200 p-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{emailSentNotice}</span>
          </div>
        )}

        {/* Action Buttons: 1. Download Excel, 2. Preview File, 3. Email File */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* 1. Download Excel */}
          <button
            type="button"
            onClick={handleDownloadPopulatedExcel}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition cursor-pointer"
          >
            <Download className="w-5 h-5 stroke-3" />
            <span>Download Excel File</span>
          </button>

          {/* 2. Preview File */}
          <button
            type="button"
            onClick={() => setShowExcelPreview(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black py-4 px-5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 border border-slate-700 shadow-lg active:scale-95 transition cursor-pointer"
          >
            <Eye className="w-5 h-5 text-amber-400" />
            <span>Preview File</span>
          </button>

          {/* 3. Email File */}
          <button
            type="button"
            disabled={isEmailingOrder}
            onClick={handleEmailExcelFile}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-4 px-5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition cursor-pointer"
          >
            {isEmailingOrder ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Dispatching...</span>
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 stroke-3" />
                <span>Email File</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 pt-3 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={handlePrintStoreSheet}
            className="text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Physical Checksheet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCountingPhase('review');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>Review Audit Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onBack}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <span>Back to Form Select</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )}

      {/* ========================================================================= */}
      {/* 🎙️ 3-STEP INTERACTIVE VOICE TRAINING & CALIBRATION MODAL                  */}
      {/* ========================================================================= */}
      {showVoiceTrainingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white space-y-0">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 sm:p-5 border-b border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white font-display">
                    🎙️ AI Voice Training & Calibration
                  </h3>
                  <p className="text-xs text-indigo-300 font-mono">
                    Profile for: <strong className="text-white">{activeVoiceUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowVoiceTrainingModal(false);
                  setTrainingStep(1);
                  setIsCalibratingMic(false);
                }}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Step indicator pills */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                {[
                  { step: 1, label: 'Qty → Unit → Item' },
                  { step: 2, label: 'Unit → Item → Qty' },
                  { step: 3, label: 'Qty → Item → Unit' },
                ].map(({ step, label }) => (
                  <div key={step} className="flex-1 text-center">
                    <div className={`text-[10px] font-mono uppercase font-bold py-1 px-1.5 rounded-lg border transition ${
                      trainingStep === step
                        ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-md'
                        : trainingStep > step
                        ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}>
                      {trainingStep > step ? `✓ Step ${step}` : `Step ${step}`}
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono block mt-0.5 truncate">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {trainingStep === 1 && (
                <div className="space-y-4 text-center">
                  <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                    Phrase 1 of 3: Standard Phrasing Rhythm
                  </span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-1">
                    <p className="text-xl sm:text-2xl font-black text-white font-sans">
                      “5 cases of Chicken Breast”
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      (Quantity first → Unit of measure → Item name)
                    </p>
                  </div>
                  <p className="text-xs text-slate-300">
                    The AI learns your vocal pitch and pronunciation of inventory nouns. Tap below and speak the phrase out loud naturally!
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isCalibratingMic}
                      onClick={() => startCalibrationListening("5 cases of Chicken Breast")}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                        isCalibratingMic
                          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-400/40'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isCalibratingMic ? 'Listening to your voice...' : '🎙️ Speak Phrase 1'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalibrationStepComplete("5 cases of Chicken Breast")}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      ⚡ Quick Sample (Simulate)
                    </button>
                  </div>
                </div>
              )}

              {trainingStep === 2 && (
                <div className="space-y-4 text-center">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                    Phrase 2 of 3: Fast Kitchen Slang Rhythm
                  </span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/40 space-y-1">
                    <p className="text-xl sm:text-2xl font-black text-white font-sans">
                      “Case Chorizo 4”
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      (Unit first → Item name → Quantity last)
                    </p>
                  </div>
                  <p className="text-xs text-slate-300">
                    Staff frequently call out the container first when moving down shelves. The AI adapts to this inverted syntax.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isCalibratingMic}
                      onClick={() => startCalibrationListening("Case Chorizo 4")}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                        isCalibratingMic
                          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-400/40'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isCalibratingMic ? 'Listening to your voice...' : '🎙️ Speak Phrase 2'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalibrationStepComplete("Case Chorizo 4")}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      ⚡ Quick Sample (Simulate)
                    </button>
                  </div>
                </div>
              )}

              {trainingStep === 3 && (
                <div className="space-y-4 text-center">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                    Phrase 3 of 3: Colloquial Permutation
                  </span>
                  <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-1">
                    <p className="text-xl sm:text-2xl font-black text-white font-sans">
                      “6 Flour Tortillas Cases”
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      (Quantity first → Item name → Unit last)
                    </p>
                  </div>
                  <p className="text-xs text-slate-300">
                    Final calibration test. Completing this step locks in your speech profile with an accuracy score of 99%.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isCalibratingMic}
                      onClick={() => startCalibrationListening("6 Flour Tortillas Cases")}
                      className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg ${
                        isCalibratingMic
                          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-400/40'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isCalibratingMic ? 'Listening to your voice...' : '🎙️ Complete Calibration'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalibrationStepComplete("6 Flour Tortillas Cases")}
                      className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                    >
                      ⚡ Quick Sample (Simulate)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-3.5 sm:p-4 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Accent: <strong className="text-amber-400">{userVoiceProfile.accentDialect}</strong></span>
              <span>Pitch: <strong className="text-cyan-400">{userVoiceProfile.pitchTone}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🗣️ CUSTOM VOCABULARY & SLANG ALIASES MODAL / DRAWER                      */}
      {/* ========================================================================= */}
      {showAliasManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white space-y-0">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white font-display">
                    🗣️ Custom Nicknames & Kitchen Slang
                  </h3>
                  <p className="text-xs text-amber-300 font-mono">
                    Vocabulary Aliases for: <strong className="text-white">{activeVoiceUser.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAliasManager(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-300">
                Map bilingual kitchen terms (e.g. <i>"pollo"</i>, <i>"carnita"</i>, <i>"chori"</i>) or custom phonetic pronunciations directly to store inventory items.
              </p>

              {/* Add New Alias Form */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold block">
                  + Add New Slang / Nickname Mapping
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      When I Say (Word/Phrase):
                    </label>
                    <input
                      type="text"
                      placeholder='e.g. "crema", "chori"'
                      value={newAliasKey}
                      onChange={(e) => setNewAliasKey(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                      Map to Catalog Item:
                    </label>
                    <select
                      value={newAliasItem}
                      onChange={(e) => setNewAliasItem(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                    >
                      <option value="">Select item...</option>
                      {(Object.values(itemsMap) as SubmissionItem[]).map(i => (
                        <option key={i.itemId} value={i.name}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddAlias(newAliasKey, newAliasItem)}
                  disabled={!newAliasKey.trim() || !newAliasItem.trim()}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase rounded-lg transition cursor-pointer"
                >
                  Save Nickname Mapping
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Quick Add Recommended Slang:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { alias: 'pollo', item: 'Chicken Breast' },
                    { alias: 'carnita', item: 'Pork Carnitas' },
                    { alias: 'chori', item: 'CHORIZO' },
                    { alias: 'crema', item: 'Sour Cream' },
                    { alias: 'cheeken', item: 'Chicken Breast' }
                  ].map(preset => (
                    <button
                      key={preset.alias}
                      type="button"
                      onClick={() => handleAddAlias(preset.alias, preset.item)}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 border border-slate-700 hover:border-amber-500/50 rounded-lg text-[10.5px] font-mono text-slate-300 transition cursor-pointer"
                    >
                      + "{preset.alias}" → {preset.item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Aliases List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 border-b border-slate-800 pb-1.5">
                  <span>Current Nicknames ({Object.keys(userVoiceProfile.vocabularyAliases || {}).length})</span>
                  <span>Target Item</span>
                </div>

                {Object.entries(userVoiceProfile.vocabularyAliases || {}).length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-3 text-center">
                    No custom aliases saved yet for this profile.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(userVoiceProfile.vocabularyAliases || {}).map(([alias, canonical]) => (
                      <div
                        key={alias}
                        className="bg-slate-950/80 border border-slate-800/80 p-2 rounded-lg flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-amber-300 font-bold bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded text-[11px]">
                            "{alias}"
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className="text-white truncate font-bold">{canonical}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAlias(alias)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition cursor-pointer"
                          title="Delete nickname"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-3.5 sm:p-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAliasManager(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold font-mono transition cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🗣️ ACTIVE VOICE WORKFLOW MODAL PROMPTS ("SAVE IT?", "READY TO ORDER?", etc) */}
      {/* ========================================================================= */}
      {activeModalPrompt !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl w-full max-w-md shadow-2xl p-6 text-white text-center space-y-5 animate-scaleUp">
            
            {/* Prompt Icon */}
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2"
              style={{
                backgroundColor: activeModalPrompt === 'select_order_method' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                borderColor: activeModalPrompt === 'select_order_method' ? '#818cf8' : '#f59e0b',
                color: activeModalPrompt === 'select_order_method' ? '#a5b4fc' : '#fbbf24'
              }}
            >
              {activeModalPrompt === 'save_count' && <Save className="w-9 h-9" />}
              {activeModalPrompt === 'ready_to_order' && <ShoppingCart className="w-9 h-9" />}
              {activeModalPrompt === 'select_order_method' && <Brain className="w-9 h-9" />}
              {activeModalPrompt === 'save_order' && <CheckCircle2 className="w-9 h-9" />}
            </div>

            {/* Prompt Text */}
            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black font-display text-white tracking-wide uppercase">
                {activeModalPrompt === 'save_count' && 'SAVE IT?'}
                {activeModalPrompt === 'ready_to_order' && 'READY TO ORDER?'}
                {activeModalPrompt === 'select_order_method' && 'CHOOSE ORDER METHOD'}
                {activeModalPrompt === 'save_order' && 'SAVE IT?'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {activeModalPrompt === 'save_count' && 'Inventory count complete! Would you like to save this count?'}
                {activeModalPrompt === 'ready_to_order' && 'Inventory count saved! Would you like to enter order numbers for your store?'}
                {activeModalPrompt === 'select_order_method' && 'How would you like to enter order quantities for each item?'}
                {activeModalPrompt === 'save_order' && 'All orders entered! Do you want to save and generate the final Excel order sheet?'}
              </p>
            </div>

            {/* Speech Listening Pulse Badge */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-amber-400 font-bold">
                {activeModalPrompt === 'select_order_method'
                  ? 'Listening: Say "SUGGESTED", "VOICE", or "MANUAL"'
                  : 'Listening hands-free: Say "YES" / "SI" or "NO"'}
              </span>
            </div>

            {/* Action Buttons */}
            {activeModalPrompt === 'select_order_method' ? (
              <div className="space-y-2.5 pt-1">
                {/* 1. USE SUGGESTED ORDER (Recommended) */}
                <button
                  type="button"
                  onClick={() => handleSelectOrderMethod('suggested')}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between shadow-xl ring-2 ring-amber-300 active:scale-[0.98] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <span className="text-xl">⚡</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black">USE SUGGESTED ORDER</span>
                        <span className="bg-slate-950 text-amber-300 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-[10.5px] font-mono text-slate-900 font-medium">
                        Auto-fills Par Level − Inventory for all items
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 stroke-3 text-slate-950 shrink-0" />
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectOrderMethod('voice')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 px-3 rounded-2xl text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition cursor-pointer border border-indigo-400/40"
                  >
                    <div className="flex items-center gap-1.5">
                      <Mic className="w-4 h-4" />
                      <span>VOICE ORDER</span>
                    </div>
                    <span className="text-[9.5px] font-mono text-indigo-200 font-normal">AI Hands-Free</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOrderMethod('manual')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-black py-3 px-3 rounded-2xl text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition cursor-pointer border border-slate-700"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">✍️</span>
                      <span>MANUAL</span>
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-400 font-normal">Custom keypad</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (activeModalPrompt === 'save_count') handleConfirmSaveCount();
                    else if (activeModalPrompt === 'ready_to_order') handleConfirmReadyToOrder();
                    else if (activeModalPrompt === 'save_order') handleConfirmSaveOrder();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-4 rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-3" />
                  <span>YES / SI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeModalPrompt === 'save_count') handleCancelSaveCount();
                    else if (activeModalPrompt === 'ready_to_order') handleCancelReadyToOrder();
                    else if (activeModalPrompt === 'save_order') handleCancelSaveOrder();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black py-4 px-4 rounded-2xl text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                  <span>NO</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 FULL SCREEN AUTHENTIC EXCEL SPREADSHEET PREVIEW MODAL                  */}
      {/* ========================================================================= */}
      {showExcelPreview && (
        <ExcelPreviewModal
          isOpen={showExcelPreview}
          onClose={() => setShowExcelPreview(false)}
          fileName={populatedExcel?.fileName || 'InventoryOrder.xlsx'}
          formTitle={form.title}
          items={Object.values(itemsMap)}
          userName={activeVoiceUser.name}
          dateStr={dateStr}
          timeStr={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          footerText={populatedExcel?.footerText || ''}
          onDownload={handleDownloadPopulatedExcel}
          onEmail={handleEmailExcelFile}
          isEmailing={isEmailingOrder}
        />
      )}

    </div>
  );
}
