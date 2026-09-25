import { useState, useEffect } from 'react';
import { InventoryForm, InventoryItem, SubmissionItem, FormSubmission } from '../types';
import { sampleItems, sampleSubmissions } from '../data/sampleData';
import { Save, Check, Search, Filter, Camera, RefreshCw, Sparkles, Volume2, Mic } from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState<string>(form.sections[0]?.name || 'Cooler');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState('');

  // Local table state to hold the physical count numbers
  const [itemsMap, setItemsMap] = useState<{ [itemId: string]: SubmissionItem }>({});

  // Initialize the list of items for the form structure
  useEffect(() => {
    const freshMap: { [itemId: string]: SubmissionItem } = {};
    form.sections.forEach(section => {
      section.itemIds.forEach(id => {
        const baseItem = sampleItems.find(item => item.id === id);
        if (baseItem) {
          // Preset initial counts to 0 or retrieve from previous draft simulation (standard is 0)
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
            finalOrder: suggested, // Defaults to suggested order
            total: currentCount + suggested,
            photoUrl: baseItem.photoUrl
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
      // Search itemsMap for an item overlapping itemName
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
            total: countValue + suggested
          }
        }));

        // Flash temporary visual feedback on screen
        setDraftSavedMsg(`Voice Command parsed count of (${quantity} ${unit}) onto "${item.name}"!`);
        setTimeout(() => setDraftSavedMsg(''), 4500);
      }
    }
  }, [activeVoiceParsedCmd]);

  // Handle single count update cell
  const handleCountChange = (itemId: string, countVal: string) => {
    const countNum = parseFloat(countVal) || 0;
    const item = itemsMap[itemId];
    if (!item) return;

    // Formula logic: Suggested Order = Par Level - Current Count
    // If negative, Suggested Order should be 0.
    const suggested = Math.max(0, item.parLevel - countNum);
    
    setItemsMap(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        currentCount: countNum,
        suggestedOrder: suggested,
        finalOrder: suggested, // Defaults to suggested but customizable
        total: countNum + suggested
      }
    }));
  };

  // Handle final order overrides
  const handleFinalOrderChange = (itemId: string, orderVal: string) => {
    const orderNum = parseFloat(orderVal) || 0;
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

  // Save drafts simulation
  const handleSaveDraft = () => {
    setSavingDraft(true);
    setTimeout(() => {
      setSavingDraft(false);
      setDraftSavedMsg(`Draft successfully saved locally at ${new Date().toLocaleTimeString()}!`);
      setTimeout(() => setDraftSavedMsg(''), 4000);
    }, 1200);
  };

  // Complete Audit submission
  const handleSubmitForm = () => {
    setSubmitting(true);
    setTimeout(() => {
      // Formulating the values
      const finalizedList: SubmissionItem[] = (Object.values(itemsMap) as SubmissionItem[]).map(item => {
        // Final Order must have a value before submission. If blank default to 0.
        // Handled because parsing with || 0 handles blanks. Here we enforce validation:
        const currentCount = item.currentCount || 0;
        const finalOrder = item.finalOrder || 0;
        return {
          ...item,
          currentCount,
          finalOrder,
          total: currentCount + finalOrder
        };
      });

      // Simulation trigger to save submission
      const subId = `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
      const submission: FormSubmission = {
        id: subId,
        formId: form.id,
        formTitle: form.title,
        locationCode: form.locationCode,
        userId: currentUser.id,
        userName: currentUser.name,
        timestamp: new Date().toISOString(),
        items: finalizedList,
        notes: notes
      };

      // In the real system, writes to Firebase Firestore database and updates metrics.
      // Append submission to mock databases
      sampleSubmissions.unshift(submission);

      setSubmitting(false);
      onSubmitSuccess(subId);
    }, 1800);
  };

  // Get list of items inside the active visual segment Cooler, Freezer, etc.
  const activeSectionObj = form.sections.find(s => s.name === activeSection);
  const activeSectionItemIds = activeSectionObj ? activeSectionObj.itemIds : [];
  const activeSubmissionItems = activeSectionItemIds
    .map(id => itemsMap[id])
    .filter(Boolean)
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 font-sans text-gray-800">
      {/* Form Header info */}
      <div className="bg-gradient-to-br from-gray-950 via-slate-900 to-amber-950 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {form.frequency} Checklist Cycle
            </span>
            <h2 className="text-xl font-bold font-display text-amber-400 mt-2">{form.title}</h2>
            <p className="text-xs text-slate-300 mt-1">
              Store Facility: <span className="text-amber-300 font-bold">{form.locationCode}</span> | Due date: <span className="font-semibold text-red-400">{form.dueDate}</span> at <span className="font-semibold text-red-400">{form.dueTime}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold font-mono">Operator ID:</span>
            <span className="text-xs font-mono font-bold bg-white/10 text-slate-200 px-3 py-1.5 rounded-lg border border-white/10">
              {currentUser.name} ({currentUser.role})
            </span>
          </div>
        </div>
      </div>

      {draftSavedMsg && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs p-3.5 rounded-xl flex items-center justify-between font-mono font-semibold animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <p>{draftSavedMsg}</p>
          </div>
        </div>
      )}

      {/* Grid: Sections layout on the left, Table/items on the right */}
      <div className="grid lg:grid-cols-4 gap-6 items-start">
        {/* Sections Rail Column */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Checklist Sections
          </div>
          <div className="bg-slate-50 border border-slate-100 p-2 rounded-2xl space-y-1 shadow-inner">
            {form.sections.map((section) => {
              const isActive = section.name === activeSection;
              return (
                <button
                  key={section.name}
                  onClick={() => setActiveSection(section.name)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    isActive 
                      ? 'bg-amber-500 text-gray-950 shadow-md transform translate-x-1' 
                      : 'hover:bg-slate-100 text-gray-600 hover:text-gray-900 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 shrink-0" />
                    {section.name}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-200 text-slate-600'}`}>
                    {section.itemIds.length} items
                  </span>
                </button>
              );
            })}
          </div>

          {/* Voice instruction hint box */}
          <div className="bg-amber-500/5 whitespace-normal p-4 rounded-2xl border border-amber-500/20 text-xs text-gray-600 space-y-2">
            <h4 className="font-bold text-amber-800 flex items-center gap-1.5 font-mono">
              <Volume2 className="w-4 h-4 text-amber-500" /> Operator Quick Speak
            </h4>
            <p className="leading-relaxed">
              To voice-count hands-free, tap the <b>Voice Counting Tab</b> above. Speak clearly, or use the interactive Simulator shortcuts. Counts sync immediately onto checklist cells showing calculated purchases!
            </p>
          </div>
        </div>

        {/* Core Items counting Spreadsheet Board */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border">
            {/* Quick search input */}
            <div className="relative flex-1">
              <input 
                type="text" 
                placeholder="Search active section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 bg-slate-50 text-slate-800 placeholder-slate-400 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <div className="text-[10px] font-mono text-gray-400 text-right uppercase tracking-wider font-bold">
              Formula: Sug Order = Max(0, Par - Count)
            </div>
          </div>

          <div className="space-y-3.5">
            {activeSubmissionItems.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-dashed rounded-2xl text-slate-400">
                No matching product cards in "{activeSection}" matching "{searchQuery}"
              </div>
            ) : (
              activeSubmissionItems.map((item) => (
                <div 
                  key={item.itemId} 
                  className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow transition-all grid md:grid-cols-12 gap-4 items-center border-slate-200/80"
                >
                  {/* Photo & Identity Category cell */}
                  <div className="md:col-span-4 flex items-center gap-3">
                    <div className="relative w-14 h-14 bg-slate-100 rounded-xl overflow-hidden shadow-inner border border-slate-200 shrink-0">
                      <img 
                        referrerPolicy="no-referrer"
                        src={item.photoUrl || 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=80&q=80'} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <button className="absolute bottom-1 right-1 bg-slate-900/80 p-1 rounded-md text-white border border-white/25 hover:bg-slate-900">
                        <Camera className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="overflow-hidden">
                      <h4 className="font-bold text-gray-950 text-sm truncate">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase font-bold tracking-wider">
                        Measuring unit: {item.unit}
                      </p>
                      <span className="mt-1 inline-block text-[9px] font-bold font-mono bg-slate-100 border text-slate-500 px-1.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Calculations statistics readout cells */}
                  <div className="md:col-span-4 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="block text-[8px] text-gray-400 font-bold uppercase">Target Par</span>
                      <span className="font-black text-gray-800 text-sm mt-0.5">{item.parLevel}</span>
                    </div>

                    <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <span className="block text-[8px] text-amber-700 font-bold uppercase text-ellipsis overflow-hidden">Sug Order</span>
                      <span className="font-black text-amber-600 text-sm mt-0.5">
                        +{item.suggestedOrder}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className="block text-[8px] text-gray-400 font-bold uppercase text-ellipsis overflow-hidden">Expected Est</span>
                      <span className="font-black text-slate-800 text-sm mt-0.5">{item.total}</span>
                    </div>
                  </div>

                  {/* Operational counting inputs */}
                  <div className="md:col-span-4 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400 font-mono block">Physical On-Hand</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.currentCount || ''}
                        onChange={(e) => handleCountChange(item.itemId, e.target.value)}
                        className="w-full text-center font-mono font-bold text-sm bg-slate-50 hover:bg-slate-100 focus:bg-white text-gray-900 border border-gray-200 focus:border-amber-500 p-2 rounded-xl focus:outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-gray-400 font-mono block">Final Purchase</label>
                      <input 
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.finalOrder || ''}
                        onChange={(e) => handleFinalOrderChange(item.itemId, e.target.value)}
                        className="w-full text-center font-mono font-bold text-sm bg-slate-50 hover:bg-slate-100 focus:bg-white text-gray-900 border border-gray-200 focus:border-amber-500 p-2 rounded-xl focus:outline-none transition text-ellipsis overflow-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Notes area & Footer Action Buttons */}
          <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Operational Notes & Custom Warnings
              </label>
              <textarea 
                rows={3}
                placeholder="Write any notes here, e.g., Cooler seal is torn, or busy weekend coming up requiring additional flour tortillas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 text-slate-800 text-xs bg-white text-sans transition"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft || submitting}
                className="sm:w-1/3 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-gray-700 font-bold border border-slate-200 px-5 py-3 rounded-xl text-xs uppercase cursor-pointer tracking-wider active:scale-95 transition disabled:opacity-50"
              >
                {savingDraft ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Saving Draft...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-slate-500" />
                    <span>Save Draft Layout</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSubmitForm}
                disabled={submitting || savingDraft}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-4 rounded-xl text-sm uppercase cursor-pointer tracking-wider shadow-lg hover:shadow-amber-200/50 active:scale-[0.98] transition disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    <span>Transmitting Audit Details...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4.5 h-4.5 stroke-3 text-slate-950" />
                    <span>Submit & Calculate purchase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
