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
    // Food / CM 1 & CM 2 / Bi-Weekly & Monthly / Catering
    headerRows = [
      [`ANITA'S NEW MEXICAN STYLE MEXICAN FOOD - ${sheetTitle.toUpperCase()}`],
      [`STORE: ${locationCode}`, `NAME: ${userName}`, `MOD: ${managerOnDuty}`, `DATE: ${dateStr}`, `SHIFT / TIME: ${shiftSlot}`],
      [isFoodSheet ? "* NOTE: These items must be dated at the store level." : "NOTICE: ONLY FILL IN CELLS HIGHLIGHTED IN GREEN (INV ON-HAND)"],
      [],
      ["#", "ITEM NAME", "UNIT", "INV (ON-HAND)", "PAR", "ORD (SUGGESTED)", "FINAL ORDER", "CATEGORY", "NOTES"]
    ];

    items.forEach((item, index) => {
      const displayName = item.requiresDating ? `* ${item.name}` : item.name;
      headerRows.push([
        index + 1,
        displayName,
        item.unit,
        item.inv === '' ? 0 : item.inv,
        item.par,
        item.ord,
        item.finalOrd,
        item.category || '',
        item.notes || ''
      ]);
    });

    colWidths = [
      { wch: 6 },
      { wch: 32 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
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
