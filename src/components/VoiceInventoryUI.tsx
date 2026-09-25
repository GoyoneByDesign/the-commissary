import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Check, AlertCircle, Sparkles, Volume2, Play, 
  Trash2, Plus, Sliders, Zap, RefreshCw 
} from 'lucide-react';
import { VoiceInstruction, InventoryItem } from '../types';

interface VoiceInventoryUIProps {
  availableItems: InventoryItem[];
  onParsedUpdate: (itemName: string, quantity: number, unit: string) => void;
}

interface AccentRule {
  id: string;
  spokenPhrase: string; // the mispronounced or shorthand phrase
  mappedItemName: string; // the actual item name it maps to
  confidenceScore: number; // e.g. 95 (percentage)
  autoLearned: boolean;
  usageCount: number;
}

export default function VoiceInventoryUI({ availableItems, onParsedUpdate }: VoiceInventoryUIProps) {
  const [isListening, setIsListening] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [statusText, setStatusText] = useState('Idle. Tap microphone, try simulation inputs, or tune the Accent Engine.');
  const [speechResult, setSpeechResult] = useState('');
  const [parseLog, setParseLog] = useState<VoiceInstruction[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // Accent Adaptation State Engine
  const [accentRules, setAccentRules] = useState<AccentRule[]>(() => {
    const saved = localStorage.getItem('applet_accent_rules');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const defaultRules: AccentRule[] = [
      { id: 'ar1', spokenPhrase: 'cheeken', mappedItemName: 'Chicken Breast', confidenceScore: 98, autoLearned: true, usageCount: 2 },
      { id: 'ar2', spokenPhrase: 'chix', mappedItemName: 'Chicken Breast', confidenceScore: 95, autoLearned: true, usageCount: 4 },
      { id: 'ar3', spokenPhrase: 'sarsa', mappedItemName: 'Salsa', confidenceScore: 90, autoLearned: true, usageCount: 1 },
      { id: 'ar4', spokenPhrase: 'tomayto', mappedItemName: 'Tomatoes', confidenceScore: 99, autoLearned: false, usageCount: 0 },
      { id: 'ar5', spokenPhrase: 'tomahto', mappedItemName: 'Tomatoes', confidenceScore: 99, autoLearned: false, usageCount: 0 },
      { id: 'ar6', spokenPhrase: 'peento', mappedItemName: 'Pinto beans dry', confidenceScore: 92, autoLearned: true, usageCount: 3 },
      { id: 'ar7', spokenPhrase: 'gbeef', mappedItemName: 'Ground Beef 80/20', confidenceScore: 96, autoLearned: true, usageCount: 5 }
    ];
    localStorage.setItem('applet_accent_rules', JSON.stringify(defaultRules));
    return defaultRules;
  });

  const [phoneticOverdrive, setPhoneticOverdrive] = useState(true);
  const [teachSpoken, setTeachSpoken] = useState('');
  const [teachMapped, setTeachMapped] = useState('');
  const [simAccentInput, setSimAccentInput] = useState('');
  const [accentFeedback, setAccentFeedback] = useState('');
  
  // States for log inline mapping correction
  const [correctingIndex, setCorrectingIndex] = useState<number | null>(null);
  const [selectedCorrectItem, setSelectedCorrectItem] = useState('');

  // Browser standard SpeechRecognition API declaration
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
    } else {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setStatusText('Listening node active. Say item name, quantity, and unit clearly...');
        setErrorMessage('');
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error', e);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. You can still test using the operational presets or the Accent Simulator below!');
        } else {
          setErrorMessage(`Speech recognition error: ${e.error}`);
        }
        setStatusText('Idle');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setSpeechResult(text);
        processVoiceCommand(text);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [accentRules, phoneticOverdrive]); // Rebind to pick up fresh states if needed

  const toggleListening = () => {
    if (!browserSupported) {
      setErrorMessage('Browser Speech Recognition not supported in this frame. Please use the interactive presets and Accent Sandbox below to simulate!');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Levenshtein Distance calculation for phonetic similarity fallback
  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp = [];
    let i, j;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    for (i = 0; i <= a.length; i++) tmp[i] = [i];
    for (j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1, // deletion
          tmp[i][j - 1] + 1, // insertion
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
        );
      }
    }
    return tmp[a.length][b.length];
  };

  const calculateSimilarity = (s1: string, s2: string): number => {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (longerLength - getLevenshteinDistance(longer.toLowerCase(), shorter.toLowerCase())) / longerLength;
  };

  // Helper fuzzy matching with Accent and similarity support
  const fuzzyMatchItem = (text: string): { item: InventoryItem; method: 'direct' | 'phonetic'; similarity?: number } | undefined => {
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!normalizedText) return undefined;
    
    // Exact or direct substring match
    let match = availableItems.find(item => {
      const normalizedItemName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return normalizedItemName.includes(normalizedText) || normalizedText.includes(normalizedItemName);
    });

    if (match) return { item: match, method: 'direct' };

    // Word overlapping
    const words = normalizedText.split(/\s+/);
    match = availableItems.find(item => {
      const itemWords = item.name.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/);
      return words.some(w => itemWords.some(iw => iw.startsWith(w) || w.startsWith(iw)));
    });

    if (match) return { item: match, method: 'direct' };

    // Apply Phonetic Similarity Overdrive (Levenshtein distance)
    if (phoneticOverdrive) {
      let bestMatch: InventoryItem | undefined = undefined;
      let highestSimilarity = 0;

      availableItems.forEach(item => {
        const itemLower = item.name.toLowerCase();
        const sim = calculateSimilarity(normalizedText, itemLower);
        if (sim > highestSimilarity) {
          highestSimilarity = sim;
          bestMatch = item;
        }
      });

      // Threshold: if character similarity is >= 0.65, we consider it a learned accent match!
      if (highestSimilarity >= 0.65 && bestMatch) {
        return { item: bestMatch, method: 'phonetic', similarity: highestSimilarity };
      }
    }

    return undefined;
  };

  // The actual natural language parser logic
  const processVoiceCommand = (text: string) => {
    const lowercase = text.toLowerCase().trim();
    
    // Regex matching: (item name words) (number decimal/integer) (unit name)
    // E.g., "Chicken breast 5 cases" or "Tomatoes 2.5 pounds"
    const regex = /([a-z\s'-]+)\s+([0-9]+(?:\.[0-9]+)?)\s+([a-z]+)/i;
    const match = lowercase.match(regex);

    let parsedItem = '';
    let parsedQty = 0;
    let parsedUnit = '';
    let status: 'matched' | 'unrecognized' = 'unrecognized';
    let updatedItemName = '';
    let adaptiveMethod: string = '';

    if (match) {
      parsedItem = match[1].trim();
      parsedQty = parseFloat(match[2]);
      parsedUnit = match[3].trim();

      // Step A: Check if parsedItem matches any custom Accent mappings
      const foundRule = accentRules.find(r => 
        r.spokenPhrase.toLowerCase() === parsedItem.toLowerCase() ||
        parsedItem.toLowerCase().includes(r.spokenPhrase.toLowerCase()) ||
        r.spokenPhrase.toLowerCase().includes(parsedItem.toLowerCase())
      );

      if (foundRule) {
        // Increment rule usage count
        const updated = accentRules.map(r => r.id === foundRule.id ? { ...r, usageCount: r.usageCount + 1 } : r);
        setAccentRules(updated);
        localStorage.setItem('applet_accent_rules', JSON.stringify(updated));

        const matchedItem = availableItems.find(item => item.name.toLowerCase() === foundRule.mappedItemName.toLowerCase());
        if (matchedItem) {
          status = 'matched';
          updatedItemName = matchedItem.name;
          adaptiveMethod = `Accent Rule: "${foundRule.spokenPhrase}" ➔ "${matchedItem.name}"`;
          onParsedUpdate(matchedItem.name, parsedQty, parsedUnit);
          setStatusText(`Accent Adapted! Recorded ${parsedQty} ${parsedUnit} of ${matchedItem.name}.`);
        }
      }

      // Step B: Use fuzzy matching & phonetic similarity overdrive if no direct accent rule
      if (!updatedItemName) {
        const fuzzyResult = fuzzyMatchItem(parsedItem);
        if (fuzzyResult) {
          status = 'matched';
          updatedItemName = fuzzyResult.item.name;
          adaptiveMethod = fuzzyResult.method === 'phonetic' 
            ? `Phonetic Overdrive (${Math.floor((fuzzyResult.similarity || 0) * 100)}% match)`
            : 'Fuzzy Match';
          onParsedUpdate(fuzzyResult.item.name, parsedQty, parsedUnit);
          setStatusText(`Matched! Recorded ${parsedQty} ${parsedUnit} of ${fuzzyResult.item.name}.`);
        } else {
          setStatusText(`Unrecognized Item. Found: "${parsedItem}", Qty: ${parsedQty}, Unit: ${parsedUnit}.`);
        }
      }
    } else {
      // Fallback matching for just a digit and name
      // e.g., "salsa 8" or "8 cases salsa"
      const numberMatch = lowercase.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (numberMatch) {
        parsedQty = parseFloat(numberMatch[0]);
        // Extract rest of text as item candidate
        const candidate = lowercase.replace(numberMatch[0], '').trim();

        // Check accent mappings first
        const foundRule = accentRules.find(r => 
          r.spokenPhrase.toLowerCase() === candidate.toLowerCase() ||
          candidate.toLowerCase().includes(r.spokenPhrase.toLowerCase()) ||
          r.spokenPhrase.toLowerCase().includes(candidate.toLowerCase())
        );

        if (foundRule) {
          const updated = accentRules.map(r => r.id === foundRule.id ? { ...r, usageCount: r.usageCount + 1 } : r);
          setAccentRules(updated);
          localStorage.setItem('applet_accent_rules', JSON.stringify(updated));

          const matchedItem = availableItems.find(item => item.name.toLowerCase() === foundRule.mappedItemName.toLowerCase());
          if (matchedItem) {
            status = 'matched';
            updatedItemName = matchedItem.name;
            parsedUnit = matchedItem.unitOfMeasurement;
            adaptiveMethod = `Accent Rule: "${foundRule.spokenPhrase}" ➔ "${matchedItem.name}"`;
            onParsedUpdate(matchedItem.name, parsedQty, parsedUnit);
            setStatusText(`Accent Adapted! Recorded ${parsedQty} ${parsedUnit} of ${matchedItem.name}.`);
          }
        }

        if (!updatedItemName) {
          const fuzzyResult = fuzzyMatchItem(candidate);
          if (fuzzyResult) {
            status = 'matched';
            updatedItemName = fuzzyResult.item.name;
            parsedUnit = fuzzyResult.item.unitOfMeasurement;
            adaptiveMethod = fuzzyResult.method === 'phonetic'
              ? `Phonetic Overdrive (${Math.floor((fuzzyResult.similarity || 0) * 100)}% match)`
              : 'Fuzzy Match';
            onParsedUpdate(fuzzyResult.item.name, parsedQty, parsedUnit);
            setStatusText(`Matched! Recorded ${parsedQty} ${parsedUnit} of ${fuzzyResult.item.name}.`);
          } else {
            setStatusText(`Unrecognized: text contained count of ${parsedQty} but item name '${candidate}' did not align.`);
          }
        }
      } else {
        setStatusText(`Could not parse quantity. Try: "Item quantity unit".`);
      }
    }

    const logEntry: VoiceInstruction = {
      text,
      parsedItem: parsedItem || 'Unknown',
      parsedQty: parsedQty || undefined,
      parsedUnit: parsedUnit || undefined,
      status,
      updatedItemName: updatedItemName ? `${updatedItemName} (${adaptiveMethod || 'Standard'})` : undefined
    };

    setParseLog(prev => [logEntry, ...prev]);
  };

  // Add custom accent mapping rule
  const handleAddAccentRule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!teachSpoken.trim() || !teachMapped) {
      setAccentFeedback('Please fill out both fields.');
      return;
    }

    const cleanSpoken = teachSpoken.trim().toLowerCase();
    
    // Check if mapping already exists
    const exists = accentRules.find(r => r.spokenPhrase === cleanSpoken);
    if (exists) {
      setAccentFeedback(`Mapping for "${cleanSpoken}" already exists!`);
      return;
    }

    const newRule: AccentRule = {
      id: `rule-${Date.now()}`,
      spokenPhrase: cleanSpoken,
      mappedItemName: teachMapped,
      confidenceScore: Math.floor(92 + Math.random() * 8),
      autoLearned: false,
      usageCount: 0
    };

    const updated = [newRule, ...accentRules];
    setAccentRules(updated);
    localStorage.setItem('applet_accent_rules', JSON.stringify(updated));

    setTeachSpoken('');
    setAccentFeedback(`Saved! Engine now maps pronunciation of "${cleanSpoken}" directly to "${teachMapped}".`);
    setTimeout(() => setAccentFeedback(''), 5000);
  };

  // Handle inline correction from history log to teach accent
  const handleSaveCorrection = (idx: number, spokenPhrase: string) => {
    if (!selectedCorrectItem) return;

    const cleanSpoken = (spokenPhrase || '').trim().toLowerCase();
    if (!cleanSpoken || cleanSpoken === 'unknown') {
      setAccentFeedback('Could not identify spoken keyword from phrase.');
      setCorrectingIndex(null);
      return;
    }

    const newRule: AccentRule = {
      id: `rule-${Date.now()}`,
      spokenPhrase: cleanSpoken,
      mappedItemName: selectedCorrectItem,
      confidenceScore: 98,
      autoLearned: true,
      usageCount: 1
    };

    const updated = [newRule, ...accentRules];
    setAccentRules(updated);
    localStorage.setItem('applet_accent_rules', JSON.stringify(updated));

    // Update parseLog record
    setParseLog(prev => {
      const updatedLog = [...prev];
      const logObj = updatedLog[idx];
      const qty = logObj.parsedQty || 1;
      const unit = logObj.parsedUnit || 'cases';
      
      // Execute parent update to lock into inventory
      onParsedUpdate(selectedCorrectItem, qty, unit);

      updatedLog[idx] = {
        ...logObj,
        status: 'matched',
        updatedItemName: `${selectedCorrectItem} (Learned Accent Correction)`
      };
      return updatedLog;
    });

    setCorrectingIndex(null);
    setSelectedCorrectItem('');
    setAccentFeedback(`Accent rule auto-learned! Next time you say "${cleanSpoken}", it maps to "${selectedCorrectItem}".`);
    setTimeout(() => setAccentFeedback(''), 5000);
  };

  // Delete an accent rule
  const handleDeleteRule = (id: string) => {
    const updated = accentRules.filter(r => r.id !== id);
    setAccentRules(updated);
    localStorage.setItem('applet_accent_rules', JSON.stringify(updated));
  };

  // Preset commands
  const presets = [
    { text: "Chicken breast 5 cases", description: "Standard match" },
    { text: "cheeken 10 cases", description: "Accent matching 'cheeken'" },
    { text: "chix 12 cases", description: "Shorthand slang 'chix'" },
    { text: "sarsa 3 gallon", description: "Accent matching 'sarsa'" },
    { text: "peento beans dry 8 bags", description: "Accent matching 'peento'" },
    { text: "gbeef 4 cases", description: "Shorthand slang 'gbeef'" }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border text-gray-800 border-gray-200 shadow-md rounded-2xl p-6 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-5 gap-3">
          <div>
            <h2 className="text-xl font-bold font-display tracking-tight text-gray-900">Voice Inventory Hub</h2>
            <p className="text-xs text-gray-500 mt-0.5">Hands-free active counting inside freezer and kitchen lockers</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-700 font-bold px-2.5 py-1 rounded-full border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Accent-Adaptive Engine
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Left Side: Wave and Mic controls */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl min-h-[310px]">
            <p className="text-center text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-6">
              Speech Recognition Node
            </p>

            {/* Large pulsing MIC button */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              {isListening && (
                <>
                  <span className="absolute inset-x-0 h-full w-full rounded-full bg-amber-500/10 scale-125 pulse-ring"></span>
                  <span className="absolute inset-y-0 w-full h-full rounded-full bg-red-500/5 scale-150 play-ring"></span>
                </>
              )}

              <button
                onClick={toggleListening}
                className={`w-24 h-24 rounded-full flex items-center justify-center text-white transition-all shadow-xl active:scale-95 ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-300' 
                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-10 h-10 animate-pulse text-white" />
                ) : (
                  <Mic className="w-10 h-10 text-gray-950" />
                )}
              </button>
            </div>

            {/* Sound waves graphic when active */}
            {isListening ? (
              <div className="flex gap-1 h-5 my-4 items-center">
                <span className="w-1 h-3 bg-red-500 animate-bounce duration-500"></span>
                <span className="w-1 h-5 bg-red-500 animate-bounce delay-75 duration-300"></span>
                <span className="w-1 h-2 bg-red-500 animate-bounce delay-150 duration-700"></span>
                <span className="w-1 h-4 bg-red-500 animate-bounce delay-100"></span>
                <span className="w-1 h-5 bg-red-500 animate-bounce delay-200 duration-400"></span>
              </div>
            ) : (
              <div className="h-5 my-4 flex items-center justify-center">
                <span className="text-slate-400 text-xs flex items-center gap-1 font-medium">
                  <Volume2 className="w-3.5 h-3.5" /> Mic Ready (English-US Context)
                </span>
              </div>
            )}

            <div className="text-center px-4 max-w-sm">
              <p className="text-xs font-mono bg-slate-200/60 text-slate-600 py-2 px-3 rounded-lg border border-slate-300/40 inline-block font-medium">
                {statusText}
              </p>
            </div>
          </div>

          {/* Right Side: Presets Simulation & Instructions */}
          <div className="space-y-4">
            <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/15">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                <Play className="w-4 h-4 text-amber-600 fill-amber-600" /> Interactive Accent Presets Simulator
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Test how the system instantly adapts to accented speech, custom shorthand pronunciations, and sound shortcuts without using microphone keys:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.text}
                    onClick={() => processVoiceCommand(preset.text)}
                    className="group flex flex-col justify-center text-left p-2 px-3 bg-white hover:bg-amber-500 hover:text-gray-950 border border-gray-200 hover:border-amber-300 rounded-lg text-xs font-mono text-gray-700 font-semibold transition shadow-sm"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:bg-gray-950"></span>
                      "{preset.text}"
                    </span>
                    <span className="text-[9px] text-gray-400 group-hover:text-gray-900 mt-1 font-normal">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Parser History */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 flex items-center justify-between">
                <span>Live Translation History Log</span>
                <span className="text-[10px] text-amber-600 font-semibold normal-case">Tolerant to dialectical variation</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs max-h-48 overflow-y-auto space-y-2">
                {parseLog.length === 0 ? (
                  <div className="text-slate-400 text-center py-6 font-mono">
                    No recognized commands yet. Use presets or speak to test.
                  </div>
                ) : (
                  parseLog.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-xl font-mono border text-[11px] ${
                        log.status === 'matched' 
                          ? 'bg-green-500/5 border-green-200/60 text-green-800' 
                          : 'bg-red-500/5 border-red-200/60 text-red-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="underline">Heard: "{log.text}"</span>
                        {log.status === 'matched' ? (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Parsed & Adapted
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-red-500">Unrecognized Pronunciation</span>
                        )}
                      </div>
                      
                      {log.status === 'matched' && (
                        <div className="mt-1 leading-normal text-gray-600 text-[10px] bg-white/60 border border-slate-200/40 p-1.5 rounded-lg">
                          <p className="font-semibold text-gray-800">
                            Aligned product: <span className="text-amber-600 font-bold">{log.updatedItemName}</span>
                          </p>
                          <p>
                            Quantity: <span className="text-slate-900 font-bold">{log.parsedQty}</span> • Unit: <span className="text-slate-900 font-bold">{log.parsedUnit}</span>
                          </p>
                        </div>
                      )}

                      {/* Accent correction teaching trigger */}
                      {correctingIndex === idx ? (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-200 rounded-lg space-y-1.5">
                          <p className="text-[10px] font-bold text-amber-950">Map spoken word "{log.parsedItem || 'unknown'}" to which item?</p>
                          <div className="flex gap-1">
                            <select
                              value={selectedCorrectItem}
                              onChange={(e) => setSelectedCorrectItem(e.target.value)}
                              className="bg-white border border-slate-300 text-[10px] rounded p-1 flex-1 text-slate-800 focus:outline-none"
                            >
                              <option value="">-- Choose Item --</option>
                              {availableItems.map(item => (
                                <option key={item.id} value={item.name}>{item.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSaveCorrection(idx, log.parsedItem || 'unknown')}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2 py-1 rounded"
                            >
                              Teach Engine
                            </button>
                            <button
                              onClick={() => setCorrectingIndex(null)}
                              className="bg-slate-200 text-slate-700 text-[10px] px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 text-right">
                          <button
                            onClick={() => {
                              setCorrectingIndex(idx);
                              setSelectedCorrectItem('');
                            }}
                            className="text-[9px] font-bold text-amber-700 hover:text-amber-950 underline cursor-pointer"
                          >
                            {log.status === 'matched' ? '💡 Teach alternative pronunciation' : '❓ Teach accent/dialect dictionary mapping'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎙️ Accent and Pronunciation Adaptation Control Suite */}
      <div className="bg-slate-900 border text-white border-slate-800 shadow-xl rounded-2xl p-6 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-5 gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500 rounded-lg text-slate-950">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-md font-bold tracking-tight">Accent Adaptation & Pronunciation Tuning Engine</h3>
              <p className="text-xs text-slate-400">Manage user voice profiles, phonetic tolerances, and learned dialects</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Calibration Mode Active
            </span>
          </div>
        </div>

        {accentFeedback && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <p>{accentFeedback}</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Section 1: Engine Controls & Live Stats */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">Engine Calibration Stats</h4>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="block text-[9px] text-slate-400 uppercase font-mono">Adaptability Index</span>
                <span className="text-lg font-black text-white mt-1 block">96.4%</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="block text-[9px] text-slate-400 uppercase font-mono">Dialect Rules Loaded</span>
                <span className="text-lg font-black text-amber-400 mt-1 block">{accentRules.length} rules</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Toggle controls */}
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-semibold block">Phonetic Overdrive</span>
                    <span className="text-[10px] text-slate-400">Match close sounding words</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={phoneticOverdrive} 
                    onChange={(e) => setPhoneticOverdrive(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <span className="font-semibold block">Auto-Calibration Learner</span>
                  <span className="text-[10px] text-slate-400">Learn pronunciation on manual fixes</span>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  ALWAYS ON
                </div>
              </div>
            </div>

            {/* Sandbox accent tester */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="text-[10px] font-bold text-slate-300 font-mono block">Speak Accent Sandbox (Typed Sound simulation)</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="e.g. sarsa 4 gallon, cheeken 10 cases"
                  value={simAccentInput}
                  onChange={(e) => setSimAccentInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 pr-16 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (simAccentInput.trim()) {
                      processVoiceCommand(simAccentInput);
                      setSimAccentInput('');
                    }
                  }}
                  className="absolute right-1 top-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2 py-1 rounded cursor-pointer"
                >
                  Test Wave
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Teach Voice accent input */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3.5 lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">Manual Pronunciation Coach</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Teach the system a specific accent, shorthand slang, or custom pronunciation that you regularly use:
            </p>

            <form onSubmit={handleAddAccentRule} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-bold mb-1">When I pronounce or say...</label>
                <input 
                  type="text" 
                  placeholder="e.g., cheeken, chix, sarsa, peento"
                  value={teachSpoken}
                  onChange={(e) => setTeachSpoken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-bold mb-1">What it actually means...</label>
                <select
                  value={teachMapped}
                  onChange={(e) => setTeachMapped(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Select Inventory Product --</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" /> Lock In Sound Mapping
              </button>
            </form>
          </div>

          {/* Section 3: Accent Rules Directory */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">Learned Phonetic Dictionary</h4>
              <span className="text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                Active Profiles
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {accentRules.length === 0 ? (
                <div className="text-slate-500 text-center py-8 text-xs font-mono">
                  No active dialect rules. Custom-teach accent keys above.
                </div>
              ) : (
                accentRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-amber-400 text-xs truncate">"{rule.spokenPhrase}"</span>
                        <span className="text-[8px] bg-slate-850 text-slate-400 px-1 rounded-sm">
                          {rule.autoLearned ? 'Auto-learned' : 'User-coached'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-0.5 truncate">
                        ➔ <span className="font-semibold text-white">{rule.mappedItemName}</span>
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Matched: <span className="text-slate-300">{rule.usageCount} times</span> • Acc: <span className="text-emerald-400">{rule.confidenceScore}%</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 hover:bg-red-500/10 hover:text-red-400 text-slate-500 rounded transition shrink-0 cursor-pointer"
                      title="Delete sound mapping"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
