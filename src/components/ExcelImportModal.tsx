import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Check, AlertCircle, X, ChevronRight, Eye, Table as TableIcon, Layers } from 'lucide-react';
import { parseInventoryExcel, ParsedExcelSheetResult } from '../utils/excelImport';
import { InventoryForm, InventoryItem } from '../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (newForm: InventoryForm, newItems: InventoryItem[]) => void;
}

export default function ExcelImportModal({ isOpen, onClose, onImportSuccess }: ExcelImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcelSheetResult | null>(null);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File, targetSheet?: string) => {
    if (!file && !fileBuffer) return;
    setErrorMessage('');
    setParsing(true);

    try {
      let buf = fileBuffer;
      if (file) {
        setFileName(file.name);
        buf = await file.arrayBuffer();
        setFileBuffer(buf);
      }

      if (!buf) return;

      const result = parseInventoryExcel(buf, file ? file.name : fileName, targetSheet);

      if (result.totalItems === 0) {
        setErrorMessage(`No inventory items could be detected in sheet "${result.selectedSheet || 'active'}". Try selecting another tab or check column headers.`);
        setParsedData(result);
      } else {
        setParsedData(result);
        setSelectedSheetTab(result.selectedSheet || '');
      }
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      setErrorMessage(`Failed to read Excel file: ${err?.message || 'Unknown error'}`);
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  const handleSwitchTab = (tabName: string) => {
    if (!fileBuffer) return;
    setSelectedSheetTab(tabName);
    setParsing(true);
    try {
      const result = parseInventoryExcel(fileBuffer, fileName, tabName);
      setParsedData(result);
      setErrorMessage(result.totalItems === 0 ? `No items found in tab "${tabName}".` : '');
    } catch (err: any) {
      setErrorMessage(`Error reading tab ${tabName}: ${err?.message || ''}`);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.totalItems === 0) return;

    const allNewItems: InventoryItem[] = [];
    const sectionsForForm: { name: string; itemIds: string[] }[] = [];

    parsedData.sections.forEach(sec => {
      const secItemIds: string[] = [];
      sec.items.forEach(item => {
        if (item.name) {
          const fullItem: InventoryItem = {
            id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
            name: item.name,
            itemCode: item.itemCode,
            category: item.category || sec.name,
            description: `${item.name} (${item.unitOfMeasurement || 'EA'})`,
            vendorName: "Anita's Commissary / Purveyor",
            packagingDetails: item.casePackDetails || (item.size ? `Size: ${item.size}` : 'Standard Pack'),
            unitOfMeasurement: item.unitOfMeasurement || 'EA',
            defaultParLevel: item.defaultParLevel || 0,
            photoUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80',
            active: true,
            storageLocation: sec.name,
            casePackDetails: item.casePackDetails,
            size: item.size
          };
          allNewItems.push(fullItem);
          secItemIds.push(fullItem.id);
        }
      });

      if (secItemIds.length > 0) {
        sectionsForForm.push({
          name: sec.name,
          itemIds: secItemIds
        });
      }
    });

    const newFormId = `form-imported-${Date.now()}`;
    const newForm: InventoryForm = {
      id: newFormId,
      title: parsedData.sheetTitle || 'Imported Store Inventory Sheet',
      frequency: 'Daily',
      dueDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
      dueTime: '11:00 PM',
      assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
      locationCode: 'STORE',
      sections: sectionsForForm,
      active: true
    };

    onImportSuccess(newForm, allNewItems);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white font-display">
                Upload & Import Inventory Sheet
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Upload your store Excel (.xlsx) file to immediately count or review
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-500 bg-amber-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                Drop your Excel (.xlsx, .xls) or CSV sheet here
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                or tap to browse files from your phone, tablet, or computer
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full uppercase">
              Supports Anita's Food, Beer, PFG, Leonard & Custom Sheets
            </span>
          </div>

          {/* Loading status */}
          {parsing && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Reading spreadsheet data and organizing item categories...</span>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Result Preview */}
          {parsedData && (
            <div className="space-y-4 border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded uppercase">
                    ✓ Spreadsheet Detected
                  </span>
                  <h4 className="font-black text-slate-900 text-base mt-1">
                    {parsedData.sheetTitle}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Found <strong>{parsedData.totalItems} items</strong> across <strong>{parsedData.sections.length} sections</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500">File: {fileName}</span>
                </div>
              </div>

              {/* Sheet / Tab selector if workbook has multiple sheets */}
              {parsedData.availableSheets && parsedData.availableSheets.length > 1 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    Select Sheet Tab to Import:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedData.availableSheets.map((sheet) => (
                      <button
                        key={sheet}
                        type="button"
                        onClick={() => handleSwitchTab(sheet)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                          parsedData.selectedSheet === sheet
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections summary pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                  Detected Sections:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.sections.map((sec, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 text-slate-700 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                      {sec.name} ({sec.items.length})
                    </span>
                  ))}
                </div>
              </div>

              {/* First 5 Preview Items */}
              {parsedData.totalItems > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Item Preview (Sample):
                  </span>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-1.5 px-3">Item Name</th>
                          <th className="py-1.5 px-2">Code</th>
                          <th className="py-1.5 px-2">Unit</th>
                          <th className="py-1.5 px-2">Par</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedData.sections.flatMap(s => s.items).slice(0, 6).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 font-bold text-slate-800">{item.name}</td>
                            <td className="py-1.5 px-2 text-slate-500">{item.itemCode || '—'}</td>
                            <td className="py-1.5 px-2 text-slate-600">{item.unitOfMeasurement || 'EA'}</td>
                            <td className="py-1.5 px-2 font-bold text-amber-700">{item.defaultParLevel ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parsedData || parsedData.totalItems === 0}
            onClick={handleConfirmImport}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Import & Open Checksheet</span>
            <ChevronRight className="w-4 h-4 stroke-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
