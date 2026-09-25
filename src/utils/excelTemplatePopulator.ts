import * as XLSX from 'xlsx';
import { SubmissionItem } from '../types';
import { getAppSettings, getUserInitials } from './settingsManager';

export interface PopulatedExcelResult {
  blob: Blob;
  base64: string;
  fileName: string;
  subjectLine: string;
  footerText: string;
  recipientEmail: string;
  itemsCounted: number;
  itemsOrdered: number;
}

/**
 * Format date helpers
 */
function formatDateMMDDYY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

function formatDateSlash(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

function formatTimeAMPM(d: Date): string {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Clean cell text helper
 */
function clean(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/<[^>]+>/g, '').replace(/\[THREADED COMMENT\].*$/is, '').trim();
}

/**
 * Populate the authentic uploaded Excel file with the actual values entered by user (Voice & Manual)
 * Preserves the exact original Excel template, header, formatting, and inserts Date/Time, User Initials,
 * Inventory counts, Order numbers, and Footer text.
 */
export async function populateActualExcelFile(
  templateFileName: string | undefined,
  formTitle: string,
  items: SubmissionItem[],
  userName: string,
  completionDate: Date = new Date(),
  customSettings?: { orderEmailRecipient?: string; footerFormatTemplate?: string }
): Promise<PopulatedExcelResult> {
  const settings = getAppSettings();
  const recipientEmail = customSettings?.orderEmailRecipient || settings.orderEmailRecipient || 'michael.goyone@gmail.com';
  const footerTemplate = customSettings?.footerFormatTemplate || settings.footerFormatTemplate || '[FILENAME]_[DATE]_[INITIALS] ([INITIALS] [DATE_SLASH])';

  const dateCode = formatDateMMDDYY(completionDate);
  const dateSlash = formatDateSlash(completionDate);
  const timeStr = formatTimeAMPM(completionDate);
  const initials = getUserInitials(userName);

  // Determine base file name without .xlsx
  let baseName = templateFileName 
    ? templateFileName.replace(/\.[^/.]+$/, '').trim() 
    : formTitle.replace(/\//g, '-').trim();

  // Clean base name for final output
  const outputFileName = `${baseName}_${dateCode}_${initials}.xlsx`;

  // Compute footer string according to template
  const footerText = footerTemplate
    .replace(/\[FILENAME\]|\{FILENAME\}/g, `${baseName}_${dateCode}_${initials}`)
    .replace(/\[DATE\]|\{DATE\}/g, dateCode)
    .replace(/\[DATE_SLASH\]|\{DATE_SLASH\}/g, dateSlash)
    .replace(/\[INITIALS\]|\{INITIALS\}/g, initials)
    .replace(/\[TIME\]|\{TIME\}/g, timeStr)
    .replace(/\[USER\]|\{USER\}/g, userName);

  let workbook: XLSX.WorkBook | null = null;

  // Try to load original Excel file from /excel-forms/
  if (templateFileName) {
    try {
      const resp = await fetch(`/excel-forms/${encodeURIComponent(templateFileName)}`);
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        workbook = XLSX.read(arrayBuf, { type: 'array' });
      }
    } catch (err) {
      console.warn(`Could not fetch template file ${templateFileName}, generating fallback:`, err);
    }
  }

  // Fallback: If original file could not be fetched, build workbook matching the standard schema
  if (!workbook) {
    workbook = XLSX.utils.book_new();
    const wsData: any[][] = [
      ['CASHIER/MOD', userName, '', '', '', '', '', '', '', 'DATE', dateSlash],
      ['EMPLOYEE ENTERING IN COMPUTER', userName, '', '', '', '', '', '', '', 'TIME', timeStr],
      [],
      ['ITEM', 'UNIT', 'INVENTORY', 'PAR', 'ORD']
    ];

    items.forEach(item => {
      wsData.push([
        item.name,
        item.unit,
        item.currentCount,
        item.parLevel,
        item.finalOrder
      ]);
    });

    wsData.push([]);
    wsData.push([footerText]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, ws, 'Inventory & Order');
  } else {
    // Modify existing template
    const primarySheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[primarySheetName];

    // Find cell positions for DATE, TIME, CASHIER/MOD
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z100');

    // 1. Update Headers (DATE, TIME, CASHIER/MOD)
    for (let r = 0; r <= Math.min(6, range.e.r); r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell || !cell.v) continue;
        const text = clean(cell.v).toUpperCase();

        if (text === 'DATE' || text === 'DATE:') {
          // write date in adjacent cell or 2 cells over
          const targetRef = XLSX.utils.encode_cell({ r, c: c + 1 });
          ws[targetRef] = { t: 's', v: dateSlash };
        } else if (text === 'TIME' || text === 'TIME:' || text === 'TIME OF INV:' || text === 'INV TIME') {
          const targetRef = XLSX.utils.encode_cell({ r, c: c + 1 });
          ws[targetRef] = { t: 's', v: timeStr };
        } else if (text === 'CASHIER/MOD' || text === 'MOD' || text === 'INV TAKEN BY' || text === 'EMPLOYEE ENTERING IN COMPUTER' || text === 'NAME') {
          const targetRef = XLSX.utils.encode_cell({ r, c: c + 1 });
          if (!ws[targetRef] || !ws[targetRef].v) {
            ws[targetRef] = { t: 's', v: `${userName} (${initials})` };
          }
        }
      }
    }

    // 2. Identify column headers for Left & Right tables
    let leftInvCol = -1, leftOrdCol = -1, leftItemCol = -1;
    let rightInvCol = -1, rightOrdCol = -1, rightItemCol = -1;

    for (let r = 0; r <= Math.min(10, range.e.r); r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell || !cell.v) continue;
        const val = clean(cell.v).toUpperCase();

        if (val === 'INVENTORY' || val === 'INV') {
          if (leftInvCol === -1) leftInvCol = c;
          else if (rightInvCol === -1 && c > leftInvCol + 3) rightInvCol = c;
        } else if (val === 'ORD' || val === 'ORDER') {
          if (leftOrdCol === -1) leftOrdCol = c;
          else if (rightOrdCol === -1 && c > leftOrdCol + 3) rightOrdCol = c;
        } else if (val === 'ITEM' || val === 'CM 1' || val === 'BI-WEEKLY ITEMS' || val === 'SILVERWARE' || val === 'SERVER STATION' || val === 'BOTTLES' || val === 'KEGS') {
          if (leftItemCol === -1) leftItemCol = c;
          else if (rightItemCol === -1 && c > leftItemCol + 3) rightItemCol = c;
        }
      }
      if (leftInvCol !== -1 && leftOrdCol !== -1) break;
    }

    // Heuristic fallbacks if exact column tags were not found
    if (leftItemCol === -1) leftItemCol = 1;
    if (leftInvCol === -1) leftInvCol = leftItemCol + 3;
    if (leftOrdCol === -1) leftOrdCol = leftInvCol + 2;

    // 3. Populate matching item rows
    const itemsMapByName = new Map<string, SubmissionItem>();
    items.forEach(it => {
      itemsMapByName.set(it.name.toLowerCase().trim(), it);
    });

    let maxRowUsed = range.s.r;

    for (let r = 3; r <= range.e.r; r++) {
      // Check Left Table
      const leftNameRef = XLSX.utils.encode_cell({ r, c: leftItemCol });
      const leftCell = ws[leftNameRef];
      if (leftCell && leftCell.v) {
        const leftName = clean(leftCell.v).toLowerCase().trim();
        const matched = itemsMapByName.get(leftName) || items.find(i => leftName.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(leftName));
        if (matched) {
          if (leftInvCol !== -1) {
            const invRef = XLSX.utils.encode_cell({ r, c: leftInvCol });
            ws[invRef] = { t: 'n', v: matched.currentCount };
          }
          if (leftOrdCol !== -1) {
            const ordRef = XLSX.utils.encode_cell({ r, c: leftOrdCol });
            ws[ordRef] = { t: 'n', v: matched.finalOrder };
          }
          maxRowUsed = Math.max(maxRowUsed, r);
        }
      }

      // Check Right Table (for dual column sheets like 021226, AR, Tableware, etc.)
      if (rightItemCol !== -1) {
        const rightNameRef = XLSX.utils.encode_cell({ r, c: rightItemCol });
        const rightCell = ws[rightNameRef];
        if (rightCell && rightCell.v) {
          const rightName = clean(rightCell.v).toLowerCase().trim();
          const matched = itemsMapByName.get(rightName) || items.find(i => rightName.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(rightName));
          if (matched) {
            if (rightInvCol !== -1) {
              const invRef = XLSX.utils.encode_cell({ r, c: rightInvCol });
              ws[invRef] = { t: 'n', v: matched.currentCount };
            }
            if (rightOrdCol !== -1) {
              const ordRef = XLSX.utils.encode_cell({ r, c: rightOrdCol });
              ws[ordRef] = { t: 'n', v: matched.finalOrder };
            }
            maxRowUsed = Math.max(maxRowUsed, r);
          }
        }
      }
    }

    // 4. Insert Footer at bottom
    const footerRow = Math.max(maxRowUsed + 2, range.e.r + 1);
    const footerCellRef = XLSX.utils.encode_cell({ r: footerRow, c: 1 });
    ws[footerCellRef] = { t: 's', v: footerText };

    // Update sheet range
    range.e.r = Math.max(range.e.r, footerRow + 1);
    ws['!ref'] = XLSX.utils.encode_range(range);
  }

  // Generate output buffer
  const wbOut = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Convert to Base64 for email sending
  let binary = '';
  const bytes = new Uint8Array(wbOut);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const subjectLine = `${outputFileName} - ${userName}`;
  const itemsCounted = items.filter(i => i.currentCount > 0).length;
  const itemsOrdered = items.filter(i => i.finalOrder > 0).length;

  return {
    blob,
    base64,
    fileName: outputFileName,
    subjectLine,
    footerText,
    recipientEmail,
    itemsCounted,
    itemsOrdered
  };
}
