const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const oneDriveDir = "C:\\Users\\Michael Allan\\OneDrive - Anita's\\2026\\The Commissary App";
const userUploadsDir = "C:\\Users\\Michael Allan\\.gemini\\antigravity\\brain\\74bb329a-26cb-462d-83a5-3d4916dd6972\\.user_uploaded";
const publicTargetDir = path.join(__dirname, '..', 'public', 'excel-forms');

if (!fs.existsSync(publicTargetDir)) {
  fs.mkdirSync(publicTargetDir, { recursive: true });
}

function cleanCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  str = str.replace(/<[^>]+>/g, '').trim();
  str = str.replace(/\[THREADED COMMENT\].*$/is, '').trim();
  return str;
}

function parseNumber(val) {
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

const storeNamesMap = {
  'AR': 'Arlington',
  'AS': 'Ashburn',
  'BK': 'Burke',
  'CH': 'Chantilly',
  'FX': 'Fairfax',
  'HN': 'Herndon',
  'LS': 'Leesburg',
  'MN': 'Manassas',
  'SP': 'Springfield',
  'VN': 'Vienna',
  'CM': 'Commissary Kitchen'
};

const allFiles = [];

// 1. Files from OneDrive
if (fs.existsSync(oneDriveDir)) {
  const odFiles = fs.readdirSync(oneDriveDir).filter(f => f.endsWith('.xlsx'));
  odFiles.forEach(f => {
    allFiles.push({
      fileName: f,
      filePath: path.join(oneDriveDir, f)
    });
  });
}

// 2. Also copy AR sheet if in user uploads
if (fs.existsSync(userUploadsDir)) {
  const arFile = path.join(userUploadsDir, 'media_1790350630225.xlsx');
  if (fs.existsSync(arFile)) {
    const arDestName = 'AR - DG & PP.xlsx';
    try {
      fs.copyFileSync(arFile, path.join(oneDriveDir, arDestName));
      allFiles.push({
        fileName: arDestName,
        filePath: arFile
      });
    } catch (e) {
      allFiles.push({
        fileName: arDestName,
        filePath: arFile
      });
    }
  }
}

console.log(`Processing total of ${allFiles.length} store inventory files...`);

// Mirror to public/excel-forms
allFiles.forEach(f => {
  const dest = path.join(publicTargetDir, f.fileName);
  try {
    fs.copyFileSync(f.filePath, dest);
  } catch (err) {}
});

const allExtractedForms = [];
const allExtractedItems = new Map();

allFiles.forEach(({ fileName, filePath }) => {
  let storeCode = '';
  let formTitleRaw = '';

  const match = fileName.match(/^([A-Z]{2})\s*[-_]\s*(.+)\.xlsx$/i);
  if (match) {
    storeCode = match[1].toUpperCase();
    formTitleRaw = match[2].trim();
  } else {
    storeCode = 'STORE';
    formTitleRaw = fileName.replace('.xlsx', '').trim();
  }

  const storeName = storeNamesMap[storeCode] || storeCode;

  try {
    const wb = xlsx.readFile(filePath);
    const primarySheets = wb.SheetNames.filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes('hidden') && !lower.includes('data list') && !lower.includes('pan size guide');
    });

    primarySheets.forEach((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
      const rows = rawRows.map(r => (Array.isArray(r) ? r.map(cleanCell) : []));
      if (!rows || rows.length === 0) return;

      const formId = `form-${storeCode.toLowerCase()}-${formTitleRaw.toLowerCase().replace(/[^a-z0-9]/g, '-')}${primarySheets.length > 1 ? `-${sheetName.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : ''}`;
      
      let frequency = 'Weekly';
      const upperRaw = formTitleRaw.toUpperCase();
      if (upperRaw.includes('FOOD') || upperRaw.includes('DAILY') || upperRaw.includes('SUN FOR MON') || upperRaw.includes('TUE FOR WED') || upperRaw.includes('WED FOR THUR') || upperRaw.includes('THUR FOR FRI') || upperRaw.includes('FRI FOR SAT')) {
        frequency = 'Daily';
      } else if (upperRaw.includes('SMALLWARES') || upperRaw.includes('TABLEWARE') || upperRaw.includes('INSERTS') || upperRaw.includes('LIGHTS') || upperRaw.includes('CATERING')) {
        frequency = 'Monthly';
      } else if (upperRaw.includes('DG & PP') || upperRaw.includes('BI-WEEKLY')) {
        frequency = 'Bi-weekly';
      }

      let dueTime = '11:00 AM';
      if (upperRaw.includes('FOOD')) {
        dueTime = '08:00 PM';
      } else if (upperRaw.includes('PFG') || upperRaw.includes('LEONARD')) {
        dueTime = '10:59 AM';
      } else if (upperRaw.includes('BEER') || upperRaw.includes('WINE') || upperRaw.includes('LIQUOR')) {
        dueTime = '02:00 PM';
      }

      let displayTitle = `Anita's ${storeName} — ${formTitleRaw}`;
      if (primarySheets.length > 1 && !displayTitle.toLowerCase().includes(sheetName.toLowerCase())) {
        displayTitle += ` (${sheetName})`;
      }

      const sections = [];

      const addItem = (secName, name, unit, par, code, casePack, size) => {
        if (!name || name.length < 2) return;
        const lower = name.toLowerCase();
        if (/^(total|subtotal|name|date|time|mod|cashier|employee|unit|inv|par|ord|check|signature|comment|these kegs|these items)/i.test(lower)) return;
        if (name.includes('THREADED COMMENT')) return;
        if (name.startsWith('<') || name.startsWith('&')) return;

        let sec = sections.find(s => s.name === secName);
        if (!sec) {
          sec = { name: secName, itemIds: [] };
          sections.push(sec);
        }

        const cleanPar = Math.round(parseNumber(par) * 100) / 100;
        const itemId = `item-${storeCode.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-${(unit || 'ea').toLowerCase()}`;

        if (!allExtractedItems.has(itemId)) {
          allExtractedItems.set(itemId, {
            id: itemId,
            name: name.trim(),
            category: secName,
            description: `${name.trim()} (${unit || 'EA'}) - ${storeName} Stock`,
            vendorName: upperRaw.includes('PFG') ? 'Performance Food Group' 
                      : upperRaw.includes('LEONARD') ? 'Leonard Paper Company'
                      : upperRaw.includes('BEER') || upperRaw.includes('WINE') || upperRaw.includes('LIQUOR') ? 'Capital Eagle / ABC'
                      : upperRaw.includes('COKE') ? 'Coca-Cola Bottling Co.'
                      : "Anita's Commissary Kitchen",
            packagingDetails: casePack || (size ? `Size: ${size}` : 'Standard Pack'),
            unitOfMeasurement: (unit || 'EA').toUpperCase().trim(),
            defaultParLevel: cleanPar,
            photoUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80',
            active: true,
            storageLocation: secName,
            itemCode: code ? String(code).trim() : undefined,
            casePackDetails: casePack ? String(casePack).trim() : undefined,
            size: size ? String(size).trim() : undefined
          });
        }

        if (!sec.itemIds.includes(itemId)) {
          sec.itemIds.push(itemId);
        }
      };

      // Table layout parsing
      let isDualTable = false;
      let leftHeaderCol = -1, rightHeaderCol = -1;
      let leftParCol = -1, rightParCol = -1;
      let leftUnitCol = -1, rightUnitCol = -1;
      let leftSecName = sheetName;
      let rightSecName = `${sheetName} - Part 2`;
      let startRow = 0;

      for (let r = 0; r < Math.min(8, rows.length); r++) {
        const row = rows[r];
        const rowStr = row.map(c => c.toLowerCase());

        const cmIndices = [];
        rowStr.forEach((c, idx) => {
          if (
            c.includes('cm 1') || c.includes('cm 2') || 
            c.includes('bi-weekly items') || c.includes('silverware') || 
            c.includes('server station') || c.includes('metal')
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

          for (let c = leftHeaderCol; c < rightHeaderCol; c++) {
            if (rowStr[c].includes('unit') || rowStr[c].includes('size')) leftUnitCol = c;
            if (rowStr[c].includes('par')) leftParCol = c;
          }
          for (let c = rightHeaderCol; c < row.length; c++) {
            if (rowStr[c].includes('unit') || rowStr[c].includes('size')) rightUnitCol = c;
            if (rowStr[c].includes('par')) rightParCol = c;
          }
          startRow = r + 1;
          break;
        }

        // PFG / Leonard
        if (rowStr.includes('cs packed') || (rowStr.includes('item') && rowStr.includes('code'))) {
          const itemCol = rowStr.findIndex(c => c === 'item' || c === 'item name');
          const parCol = rowStr.findIndex(c => c === 'par');
          const codeCol = rowStr.findIndex(c => c === 'code');
          const unitCol = rowStr.findIndex(c => c === 'unit');

          startRow = r + 1;
          const currentSection = sheetName || 'PURVEYOR SUPPLIES';

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
          break;
        }

        // Beverages
        if (
          rowStr.includes('bottles') || rowStr.includes('kegs') || 
          rowStr.includes('juice') || (rowStr.includes('unit') && rowStr.includes('par'))
        ) {
          const itemCol = 0;
          const unitCol = rowStr.findIndex(c => c === 'unit');
          const parCol = rowStr.findIndex(c => c === 'par');

          startRow = r + 1;
          const currentSection = sheetName || 'BEVERAGE & BAR';

          for (let i = startRow; i < rows.length; i++) {
            const itemRow = rows[i];
            const itemName = itemRow[itemCol];
            if (!itemName || itemName.length < 2) continue;
            const par = parCol !== -1 ? itemRow[parCol] : 0;
            const unit = unitCol !== -1 ? itemRow[unitCol] : 'EA';
            addItem(currentSection, itemName, unit, par, undefined, undefined, undefined);
          }
          break;
        }
      }

      if (isDualTable) {
        for (let r = startRow; r < rows.length; r++) {
          const row = rows[r];
          const leftName = row[leftHeaderCol];
          if (leftName && leftName.length > 1) {
            const leftUnit = leftUnitCol !== -1 ? row[leftUnitCol] : 'EA';
            const leftPar = leftParCol !== -1 ? row[leftParCol] : 0;
            addItem(leftSecName, leftName, leftUnit, leftPar, undefined, undefined, undefined);
          }

          const rightName = row[rightHeaderCol];
          if (rightName && rightName.length > 1) {
            const rightUnit = rightUnitCol !== -1 ? row[rightUnitCol] : 'EA';
            const rightPar = rightParCol !== -1 ? row[rightParCol] : 0;
            addItem(rightSecName, rightName, rightUnit, rightPar, undefined, undefined, undefined);
          }
        }
      } else if (sections.length === 0) {
        let generalItemCol = 0;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const name = row[generalItemCol] || row[1];
          if (name && typeof name === 'string' && name.length > 2 && isNaN(Number(name))) {
            const par = row[2] || row[3] || 0;
            const unit = 'EA';
            addItem(sheetName || 'INVENTORY', name, unit, par, undefined, undefined, undefined);
          }
        }
      }

      const totalItemsInForm = sections.reduce((acc, s) => acc + s.itemIds.length, 0);
      if (totalItemsInForm > 0) {
        allExtractedForms.push({
          id: formId,
          title: displayTitle,
          locationCode: storeCode,
          assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
          frequency,
          dueDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
          dueTime,
          sections,
          excelFileName: fileName,
          active: true
        });
      }
    });

  } catch (err) {
    console.error(`Failed reading ${fileName}:`, err.message);
  }
});

console.log(`Writing storeFormsData.json...`);
const jsonOut = {
  forms: allExtractedForms,
  items: Array.from(allExtractedItems.values())
};

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'storeFormsData.json');
fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2), 'utf8');

const tsPath = path.join(__dirname, '..', 'src', 'data', 'storeFormsData.ts');
const tsContent = `// Auto-generated master catalog and checksheets from OneDrive 2026 Commissary App folder
import { InventoryForm, InventoryItem } from '../types';
import storeData from './storeFormsData.json';

export const allOfficialStoreForms: InventoryForm[] = storeData.forms as InventoryForm[];
export const allOfficialStoreItems: InventoryItem[] = storeData.items as InventoryItem[];
`;

fs.writeFileSync(tsPath, tsContent, 'utf8');

console.log(`Successfully generated:`);
console.log(`  ${jsonPath} (${(fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`  ${tsPath}`);
console.log(`Total forms: ${allExtractedForms.length}`);
console.log(`Total items: ${allExtractedItems.size}`);
