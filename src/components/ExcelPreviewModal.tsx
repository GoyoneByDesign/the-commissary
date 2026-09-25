import React from 'react';
import { X, FileSpreadsheet, Download, Mail, CheckCircle2, Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { SubmissionItem } from '../types';

interface ExcelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  formTitle: string;
  items: SubmissionItem[];
  userName: string;
  dateStr: string;
  timeStr: string;
  footerText: string;
  onDownload: () => void;
  onEmail: () => void;
  isEmailing?: boolean;
}

export default function ExcelPreviewModal({
  isOpen,
  onClose,
  fileName,
  formTitle,
  items,
  userName,
  dateStr,
  timeStr,
  footerText,
  onDownload,
  onEmail,
  isEmailing
}: ExcelPreviewModalProps) {
  if (!isOpen) return null;

  const totalCounted = items.filter(i => (i.currentCount || 0) > 0).length;
  const totalOrdered = items.filter(i => (i.finalOrder || 0) > 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">
                  Excel Sheet Preview
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">{fileName}</span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white font-display mt-0.5">
                {formTitle}
              </h3>
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

        {/* Metadata info strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 px-5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Date: <strong>{dateStr}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Time: <strong>{timeStr}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>Taken By: <strong>{userName}</strong></span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
              {totalCounted} Counted
            </span>
            <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
              {totalOrdered} Ordered
            </span>
          </div>
        </div>

        {/* Spreadsheet Content Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white text-xs font-mono">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-2 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right bg-emerald-50 text-emerald-900">Inventory</th>
                  <th className="py-2.5 px-3 text-right">Par Level</th>
                  <th className="py-2.5 px-3 text-right text-slate-500">Theoretical</th>
                  <th className="py-2.5 px-3 text-right bg-amber-50 text-amber-900 font-black">Final Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const theoretical = Math.max(0, (item.parLevel || 0) - (item.currentCount || 0));
                  const hasCount = (item.currentCount || 0) > 0;
                  const hasOrder = (item.finalOrder || 0) > 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.name}
                        {item.itemCode && <span className="text-[10px] text-slate-400 block">{item.itemCode}</span>}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500 uppercase">{item.unit || 'EA'}</td>
                      <td className={`py-2 px-3 text-right font-bold font-mono ${hasCount ? 'text-emerald-700 bg-emerald-50/40' : 'text-slate-400'}`}>
                        {item.currentCount ?? 0}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 font-mono">
                        {item.parLevel ?? 0}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 font-mono">
                        {theoretical}
                      </td>
                      <td className={`py-2 px-3 text-right font-black font-mono ${hasOrder ? 'text-amber-800 bg-amber-50/60 text-sm' : 'text-slate-400'}`}>
                        {item.finalOrder ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer note box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-mono text-slate-600">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sheet Bottom Verification Tag:</span>
            <strong className="text-slate-900">{footerText}</strong>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase transition cursor-pointer"
          >
            Close Preview
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEmail}
              disabled={isEmailing}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEmailing ? 'Sending...' : 'Email Excel File'}</span>
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black uppercase font-mono flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 stroke-2" />
              <span>Download .xlsx</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
