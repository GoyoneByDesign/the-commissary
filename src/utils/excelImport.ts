import * as XLSX from 'xlsx';
import { InventoryForm, InventoryItem } from '../types';

export interface ParsedExcelSheetResult {
  sheetTitle: string;
  totalItems: number;
  sections: { name: string; items: Partial<InventoryItem>[] }[];
  detectedColumns: string[];
  rawItemCount: number;
  availableSheets?: string[];
  selectedSheet?: string;
}

/**
 * Clean cell text: strip XML fragments, threaded comment markers, and trailing spaces
 */
function cleanCell(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Strip XML tags like <t xml:space="preserve"> or </r>
  str = str.replace(/<[^>]+>/g, '').trim();
  // Strip threaded comment markers
  str = str.replace(/\[THREADED COMMENT\].*$/is, '').trim();
  return str;
}

/**
 * Parse numeric strings including fractions ("1 1/2", "3/4") and decimals ("1.5", "1.75")
 */
function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9./]/g, '').trim();
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && Number(parts[1]) !== 0) {
      return Number(parts[0]) / Number(parts[1]);
    }
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/**
 * Universal Excel Parser for Restaurant / Commissary Inventory Sheets
 * Handles authentic Anita's Mexican Foods formats (Dual-column CM 1, AR Bi-weekly/Monthly, 
 * PFG, Leonard Paper, Beer, Wine, Smallwares, Inserts) and generic store spreadsheets.
 */
export function parseInventoryExcel(
  fileBuffer: ArrayBuffer, 
  fileName: string, 
  targetSheetName?: string
): ParsedExcelSheetResult {
  const data = new Uint8Array(fileBuffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const availableSheets = workbook.SheetNames;
  const sheetToUse = targetSheetName && availableSheets.includes(targetSheetName)
    ? targetSheetName
    : availableSheets[0];

  const worksheet = workbook.Sheets[sheetToUse];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const rows = rawRows.map(r => (Array.isArray(r) ? r.map(cleanCell) : []));

  let sheetTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();
  if (sheetToUse && sheetToUse !== 'Sheet1') {
    sheetTitle = `${sheetTitle} (${sheetToUse})`;
  }

  // Look for title in first 5 rows
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const rowStr = rows[r].map(c => String(c).trim()).filter(Boolean).join(' ');
    if (rowStr && /ANITA|COMMISSARY|INVENTORY|ORDER|SHEET|AUDIT|FOOD|BEER|BAR|PACKAGING|PFG|LEONARD/i.test(rowStr)) {
      sheetTitle = rowStr.replace(/^ANITA'?S?\s*(?:NEW\s*MEXICAN\s*(?:STYLE)?\s*)?/i, "Anita's ").trim();
      break;
    }
  }

  const sections: { name: string; items: Partial<InventoryItem>[] }[] = [];

  const addItem = (
    sectionName: string, 
    name: string, 
    unit?: string, 
    par?: any, 
    code?: string, 
    casePack?: string, 
    size?: string,
    storageLocation?: string
  ) => {
    if (!name || name.length < 2) return;
    const lower = name.toLowerCase();
    if (/^(total|subtotal|name|date|time|mod|cashier|employee|unit|inv|par|ord|check|signature|comment|these kegs|these items)/i.test(lower)) return;
    if (name.includes('THREADED COMMENT')) return;
    if (name.startsWith('<') || name.startsWith('&')) return;

    let sec = sections.find(s => s.name === sectionName);
    if (!sec) {
      sec = { name: sectionName, items: [] };
      sections.push(sec);
    }

    const cleanPar = Math.round(parseNumber(par) * 100) / 100;
    const itemId = `imported-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`;

    sec.items.push({
      id: itemId,
      name: name.trim(),
      itemCode: code ? String(code).trim() : undefined,
      unitOfMeasurement: (unit || 'EA').toUpperCase().trim(),
      defaultParLevel: cleanPar,
      category: sectionName,
      casePackDetails: casePack ? String(casePack).trim() : undefined,
      size: size ? String(size).trim() : undefined,
      storageLocation: storageLocation || sectionName
    });
  };

  // Heuristic Scan for sheet structure
  let isDualTable = false;
  let leftHeaderCol = -1, rightHeaderCol = -1;
  let leftParCol = -1, rightParCol = -1;
  let leftUnitCol = -1, rightUnitCol = -1;
  let leftSecName = sheetToUse || 'MAIN SECTION';
  let rightSecName = (sheetToUse || 'MAIN SECTION') + ' - B';
  let startRow = 0;

  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const row = rows[r];
    const rowStr = row.map(c => c.toLowerCase());

    // Case A: Dual-table side-by-side (CM 1 ... CM 1, BI-WEEKLY ... MONTHLY, SILVERWARE ... CHINA, SERVER STATION ... KITCHENWARE)
    const cmIndices: number[] = [];
    rowStr.forEach((c, idx) => {
      if (
        c.includes('cm 1') || c.includes('cm 2') || 
        c.includes('bi-weekly items') || c.includes('silverware') || 
        c.includes('server station') || c.includes('inserts')
      ) {
        cmIndices.push(idx);
      }
    });

    if (
      cmIndices.length >= 2 || 
      (cmIndices.length === 1 && (rowStr.some(c => c.includes('monthly items') || c.includes('china') || c.includes('kitchenware'))))
    ) {
      isDualTable = true;
      leftHeaderCol = cmIndices[0];
      leftSecName = row[leftHeaderCol] || 'SECTION 1';

      const rightIdx = cmIndices.length >= 2 
        ? cmIndices[1] 
        : rowStr.findIndex(c => c.includes('monthly') || c.includes('china') || c.includes('kitchenware'));
      
      rightHeaderCol = rightIdx;
      rightSecName = row[rightHeaderCol] || 'SECTION 2';

      // Find unit and par cols for left
      for (let c = leftHeaderCol; c < rightHeaderCol; c++) {
        if (rowStr[c].includes('unit') || rowStr[c].includes('size')) leftUnitCol = c;
        if (rowStr[c].includes('par')) leftParCol = c;
      }
      // Find unit and par cols for right
      for (let c = rightHeaderCol; c < row.length; c++) {
        if (rowStr[c].includes('unit') || rowStr[c].includes('size')) rightUnitCol = c;
        if (rowStr[c].includes('par')) rightParCol = c;
      }
      startRow = r + 1;
      break;
    }

    // Case B: PFG / Leonard with CS PACKED & ITEM column
    if (rowStr.includes('cs packed') || (rowStr.includes('item') && rowStr.includes('code'))) {
      const itemCol = rowStr.findIndex(c => c === 'item' || c === 'item name');
      const parCol = rowStr.findIndex(c => c === 'par');
      const codeCol = rowStr.findIndex(c => c === 'code');
      const unitCol = rowStr.findIndex(c => c === 'unit');

      startRow = r + 1;
      const currentSection = sheetToUse || 'PURVEYOR ORDER';

      for (let i = startRow; i < rows.length; i++) {
        const itemRow = rows[i];
        const itemName = itemRow[itemCol];
        if (!itemName || itemName.length < 2) continue;
        const code = codeCol !== -1 ? itemRow[codeCol] : undefined;
        const par = parCol !== -1 ? itemRow[parCol] : 0;
        const unit = unitCol !== -1 ? itemRow[unitCol] : (itemRow[itemCol + 1] || 'CS');
        const casePack = itemRow.slice(0, itemCol).filter(Boolean).join(' ');
        addItem(currentSection, itemName, unit, par, code, casePack, undefined);
      }

      const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
      return {
        sheetTitle,
        totalItems,
        sections,
        detectedColumns: ['Item Name', 'Code', 'Unit', 'Par', 'Case Pack'],
        rawItemCount: totalItems,
        availableSheets,
        selectedSheet: sheetToUse
      };
    }

    // Case C: Beverage / Beer / Kegs / Coke / Liquor: "BOTTLES | UNIT | PAR" or "KEGS | UNIT | PAR"
    if (
      rowStr.includes('bottles') || rowStr.includes('kegs') || 
      rowStr.includes('juice') || (rowStr.includes('unit') && rowStr.includes('par'))
    ) {
      const itemCol = 0;
      const unitCol = rowStr.findIndex(c => c === 'unit');
      const parCol = rowStr.findIndex(c => c === 'par');

      startRow = r + 1;
      const currentSection = sheetToUse || 'BEVERAGE & BAR';

      for (let i = startRow; i < rows.length; i++) {
        const itemRow = rows[i];
        const itemName = itemRow[itemCol];
        if (!itemName || itemName.length < 2) continue;
        const par = parCol !== -1 ? itemRow[parCol] : 0;
        const unit = unitCol !== -1 ? itemRow[unitCol] : 'EA';
        addItem(currentSection, itemName, unit, par, undefined, undefined, undefined);
      }

      const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
      return {
        sheetTitle,
        totalItems,
        sections,
        detectedColumns: ['Item Name', 'Unit', 'Par'],
        rawItemCount: totalItems,
        availableSheets,
        selectedSheet: sheetToUse
      };
    }
  }

  // Execute Dual-Table parsing
  if (isDualTable) {
    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      // Left item
      const leftName = row[leftHeaderCol];
      if (leftName && leftName.length > 1) {
        const leftUnit = leftUnitCol !== -1 ? row[leftUnitCol] : 'EA';
        const leftPar = leftParCol !== -1 ? row[leftParCol] : 0;
        addItem(leftSecName, leftName, leftUnit, leftPar, undefined, undefined, undefined);
      }

      // Right item
      const rightName = row[rightHeaderCol];
      if (rightName && rightName.length > 1) {
        const rightUnit = rightUnitCol !== -1 ? row[rightUnitCol] : 'EA';
        const rightPar = rightParCol !== -1 ? row[rightParCol] : 0;
        addItem(rightSecName, rightName, rightUnit, rightPar, undefined, undefined, undefined);
      }
    }

    const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
    return {
      sheetTitle,
      totalItems,
      sections,
      detectedColumns: ['Item Name', 'Unit', 'Par Level'],
      rawItemCount: totalItems,
      availableSheets,
      selectedSheet: sheetToUse
    };
  }

  // Case D: General single table scan fallback
  let generalItemCol = -1;
  let generalParCol = -1;
  let generalUnitCol = -1;

  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const row = rows[r].map(c => c.toLowerCase());
    row.forEach((cell, idx) => {
      if (cell.includes('item') || cell.includes('name') || cell.includes('description')) generalItemCol = idx;
      if (cell.includes('par') || cell.includes('standard')) generalParCol = idx;
      if (cell.includes('unit') || cell.includes('measure')) generalUnitCol = idx;
    });
    if (generalItemCol !== -1) {
      startRow = r + 1;
      break;
    }
  }

  if (generalItemCol === -1) generalItemCol = 0;

  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    const name = row[generalItemCol] || row[1];
    if (name && typeof name === 'string' && name.length > 2 && isNaN(Number(name))) {
      const par = generalParCol !== -1 ? row[generalParCol] : (row[2] || row[3] || 0);
      const unit = generalUnitCol !== -1 ? row[generalUnitCol] : 'EA';
      addItem(sheetToUse || 'INVENTORY', name, unit, par, undefined, undefined, undefined);
    }
  }

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  return {
    sheetTitle,
    totalItems,
    sections,
    detectedColumns: ['Item Name', 'Unit', 'Par'],
    rawItemCount: totalItems,
    availableSheets,
    selectedSheet: sheetToUse
  };
}
