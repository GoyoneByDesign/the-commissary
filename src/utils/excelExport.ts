import * as XLSX from 'xlsx';

export interface AnitaExportItem {
  name: string;
  unit: string;
  inv: number | '';
  par: number;
  ord: number;
  finalOrd: number;
  wlkIn?: number;
  barCount?: number;
  notes?: string;
  category?: string;
  itemCode?: string;
  casePackDetails?: string;
  requiresDating?: boolean;
  size?: string;
}

export const exportAnitaSheetToExcel = (
  sheetTitle: string,
  locationCode: string,
  managerOnDuty: string,
  userName: string,
  dateStr: string,
  shiftSlot: string,
  items: AnitaExportItem[],
  isBarSheet: boolean = false,
  isFoodSheet: boolean = false,
  isPackagingSheet: boolean = false
) => {
  const wb = XLSX.utils.book_new();

  let headerRows: any[][];
  let colWidths: any[];

  if (isBarSheet) {
    headerRows = [
      ["ANITA'S NEW MEXICAN STYLE MEXICAN FOOD - BEER, BAR & BEVERAGE AUDIT"],
      [`STORE: ${locationCode}`, `NAME: ${userName}`, `MOD: ${managerOnDuty}`, `DATE: ${dateStr}`, `SHIFT / TIME: ${shiftSlot}`],
      ["RULE: ONLY SETS OF 6 BOTTLES ARE ALLOWED TO BE KEPT IN WALK-IN COOLER (6, 12, 18, 24...)"],
      ["NOTICE: GREEN CELLS ARE FOR STORE COUNTS (WLK-IN AND BAR/CO)"],
      [],
      ["#", "ITEM NAME", "UNIT / PACK", "WLK-IN", "BAR / C/O", "TOTAL INV", "PAR", "SUG ORDER", "FINAL ORDER", "NOTES"]
    ];

    items.forEach((item, index) => {
      const wlkIn = item.wlkIn ?? 0;
      const bar = item.barCount ?? 0;
      const tot = wlkIn + bar;
      headerRows.push([
        index + 1,
        item.name,
        item.unit,
        wlkIn,
        bar,
        tot,
        item.par,
        item.ord,
        item.finalOrd,
        item.notes || ''
      ]);
    });

    colWidths = [
      { wch: 6 },
      { wch: 32 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 30 }
    ];
  } else if (isPackagingSheet) {
    headerRows = [
      [`ANITA'S NEW MEXICAN STYLE MEXICAN FOOD - PACKAGING & PAPER GOODS ORDER FORM`],
      [`STORE: ${locationCode}`, `NAME: ${userName}`, `MOD: ${managerOnDuty}`, `DATE: ${dateStr}`, `SHIFT / TIME: ${shiftSlot}`],
      ["NOTICE: ONLY FILL IN CELLS HIGHLIGHTED IN GREEN (INV ON-HAND)"],
      [],
      ["#", "CS PACKED", "ITEM NAME", "UNIT", "INV (ON-HAND)", "PAR", "ORD (SUGGESTED)", "FINAL ORDER", "CODE", "NOTES"]
    ];

    items.forEach((item, index) => {
      headerRows.push([
        index + 1,
        item.casePackDetails || '',
        item.name,
        item.unit,
        item.inv === '' ? 0 : item.inv,
        item.par,
        item.ord,
        item.finalOrd,
        item.itemCode || '',
        item.notes || ''
      ]);
    });

    colWidths = [
      { wch: 6 },
      { wch: 16 },
      { wch: 32 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 25 }
    ];
  } else {
    // Silverware / China / Glassware / Smallwares / Food / Bar Equipment / Patio / Master
    const hasSize = items.some(i => !!i.size && i.size !== '—');
    const hasCode = items.some(i => !!i.itemCode);
    const hasPack = items.some(i => !!i.casePackDetails);

    const cols = ["#", "ITEM NAME"];
    if (hasSize) cols.push("SIZE");
    if (hasPack) cols.push("CS PACKED");
    cols.push("UNIT", "INV (ON-HAND)", "PAR", "ORD (SUGGESTED)", "FINAL ORDER");
    if (hasCode) cols.push("CODE");
    cols.push("CATEGORY", "NOTES");

    headerRows = [
      [`ANITA'S NEW MEXICAN STYLE MEXICAN FOOD - ${sheetTitle.toUpperCase()}`],
      [`STORE: ${locationCode}`, `NAME: ${userName}`, `MOD: ${managerOnDuty}`, `DATE: ${dateStr}`, `SHIFT / TIME: ${shiftSlot}`],
      [isFoodSheet ? "* NOTE: These items must be dated at the store level." : "NOTICE: ONLY FILL IN CELLS HIGHLIGHTED IN GREEN (INV ON-HAND)"],
      [],
      cols
    ];

    items.forEach((item, index) => {
      const displayName = item.requiresDating ? `* ${item.name}` : item.name;
      const row: any[] = [index + 1, displayName];
      if (hasSize) row.push(item.size || '—');
      if (hasPack) row.push(item.casePackDetails || '—');
      row.push(
        item.unit,
        item.inv === '' ? 0 : item.inv,
        item.par,
        item.ord,
        item.finalOrd
      );
      if (hasCode) row.push(item.itemCode || '');
      row.push(item.category || '', item.notes || '');
      headerRows.push(row);
    });

    colWidths = [
      { wch: 6 },
      { wch: 32 },
      ...(hasSize ? [{ wch: 14 }] : []),
      ...(hasPack ? [{ wch: 16 }] : []),
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      ...(hasCode ? [{ wch: 16 }] : []),
      { wch: 20 },
      { wch: 30 }
    ];
  }

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Inventory Sheet");
  const cleanDate = dateStr.replace(/[^\w-]/g, '_');
  XLSX.writeFile(wb, `Anitas_${locationCode}_Inventory_${cleanDate}.xlsx`);
};
