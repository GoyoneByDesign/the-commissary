// Real-world Anita's Store Inventory Catalog & Sheet Specifications
// Extracted from authentic Anita's New Mexican Style Mexican Food store forms

export interface AnitaInventoryItem {
  id: string;
  name: string;
  sheetCategory: 'BI-WEEKLY' | 'MONTHLY' | 'BOTTLES' | 'KEGS' | 'BEVERAGES' | 'SUPPLIES' | 'OPERATIONAL' | 'FRUIT' | 'CO2';
  unit: string;
  defaultPar: number;
  packSize?: string;
  category: string;
  storageLocation: string; // Cooler, Dry Storage, Bar, Walk-In, Kitchen
  notes?: string;
}

export const anitasBiWeeklyItems: AnitaInventoryItem[] = [
  { id: 'bw-1', name: 'JALAPENOS', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 3, category: 'Produce', storageLocation: 'Cooler' },
  { id: 'bw-2', name: 'MUSHROOMS', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 2, category: 'Produce', storageLocation: 'Cooler' },
  { id: 'bw-3', name: 'SYRUP', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-4', name: 'VANILLA', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-5', name: 'TRIPLE SEC', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 3, category: 'Bar', storageLocation: 'Bar' },
  { id: 'bw-6', name: 'KETCHUP', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 4, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-7', name: 'MAYONNAISE', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 1, category: 'Cooler', storageLocation: 'Cooler' },
  { id: 'bw-8', name: 'CHOLULA', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 10, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-9', name: 'SALT SEASONED', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-10', name: 'SALT ROUND', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-11', name: 'PANCAKE MIX', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 4, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-12', name: 'CORN FLAKES', sheetCategory: 'BI-WEEKLY', unit: '4QT', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-13', name: 'BEEF BASE', sheetCategory: 'BI-WEEKLY', unit: 'PT', defaultPar: 1, category: 'Cooler', storageLocation: 'Cooler' },
  { id: 'bw-14', name: 'CROUTONS', sheetCategory: 'BI-WEEKLY', unit: 'PT', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-15', name: 'PC HONEY MUSTARD', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-16', name: 'PC JELLY', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-17', name: 'PC MAYO', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-18', name: 'PC KETCHUP', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 6, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-19', name: 'PC LEMON', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-20', name: 'PC HONEY', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-21', name: 'PC SPLENDA', sheetCategory: 'BI-WEEKLY', unit: 'BG', defaultPar: 3, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-22', name: 'COFFEE DECAF', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 14, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-23', name: 'ICE TEA', sheetCategory: 'BI-WEEKLY', unit: '4/BG', defaultPar: 4, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'bw-24', name: 'LID SMOOTHIE', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-25', name: 'EMPLOYEE CUPS', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-26', name: 'CUP 16oz SODA slv=50', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 8, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-27', name: 'CUP 20oz SODA slv=50', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 8, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-28', name: 'CUP 24oz SODA slv=50', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-29', name: 'CUP 16oz COFFEE slv=20', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 4, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-30', name: 'CUP 20oz COFFEE slv=20', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-31', name: 'SLEEVE COFFEE', sheetCategory: 'BI-WEEKLY', unit: 'BOX', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-32', name: '2 CUP CARRY TRAY', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 12, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-33', name: '4 CUP CARRY TRAY', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 24, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-34', name: 'STRAWS box=', sheetCategory: 'BI-WEEKLY', unit: 'BX', defaultPar: 4, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-35', name: '1/2 PT CONT WHT', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 7, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-36', name: '1 PT CONT WHT', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 5, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-37', name: '1 & 1/2 PT LID', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 5, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-38', name: 'FOIL OBLONG SM slv=100', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 3, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-39', name: 'FOIL OBLONG SM LID slv=100', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-40', name: 'CONT 32oz (Salad) slv=63', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-41', name: 'CONT 64oz (Taco Salad) slv=63', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-42', name: 'LID 32/64oz Clr', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-43', name: 'WAX SAUSAGE slv=1000', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-44', name: 'WAX YELLOW slv=1000', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-45', name: 'WAX CHORIZO slv=1000', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-46', name: 'WAX BACON slv=1000', sheetCategory: 'BI-WEEKLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-47', name: 'WAX WHITE FOLDED box=250', sheetCategory: 'BI-WEEKLY', unit: 'BX', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-48', name: 'FOIL GOLD/SILVER box=500', sheetCategory: 'BI-WEEKLY', unit: 'BX', defaultPar: 3, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'bw-49', name: 'TOILET PAPER', sheetCategory: 'BI-WEEKLY', unit: 'RL', defaultPar: 7, category: 'Sanitation', storageLocation: 'Dry Storage' },
  { id: 'bw-50', name: 'TRASH BAG 33X40 roll=25', sheetCategory: 'BI-WEEKLY', unit: 'RL', defaultPar: 4, category: 'Sanitation', storageLocation: 'Dry Storage' },
  { id: 'bw-51', name: 'TRASH BAG 40X48 roll=25', sheetCategory: 'BI-WEEKLY', unit: 'RL', defaultPar: 10, category: 'Sanitation', storageLocation: 'Dry Storage' },
  { id: 'bw-52', name: 'PINESOL', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 1, category: 'Chemicals', storageLocation: 'Dry Storage' },
  { id: 'bw-53', name: 'AMMONIA', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 1, category: 'Chemicals', storageLocation: 'Dry Storage' },
  { id: 'bw-54', name: 'MR. MUSCLE', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 3, category: 'Chemicals', storageLocation: 'Dry Storage' },
  { id: 'bw-55', name: 'GRILL CLEANER', sheetCategory: 'BI-WEEKLY', unit: '10/BG', defaultPar: 2, category: 'Chemicals', storageLocation: 'Kitchen' },
  { id: 'bw-56', name: 'SCOURING PAD BLUE', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 4, category: 'Sanitation', storageLocation: 'Kitchen' },
  { id: 'bw-57', name: 'GRILL BRICK', sheetCategory: 'BI-WEEKLY', unit: 'EA', defaultPar: 4, category: 'Kitchen', storageLocation: 'Kitchen' }
];

export const anitasMonthlyItems: AnitaInventoryItem[] = [
  { id: 'mo-1', name: 'AGAVE NECTAR', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-2', name: 'GRAPEFRUIT JUICE', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 3, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-3', name: 'CRANBERRY JUICE', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-4', name: 'BLOODY MARY MIX', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 3, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-5', name: 'TONIC WATER', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-6', name: 'MARGARITA SALT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-7', name: 'A1 SAUCE', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-8', name: 'TABASCO', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 3, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-9', name: 'HERSHEYS', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-10', name: 'PARMESAN', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Cooler', storageLocation: 'Cooler' },
  { id: 'mo-11', name: 'BKF CEREAL ASSORTED', sheetCategory: 'MONTHLY', unit: '4/BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-12', name: 'HOT CHOCOLATE', sheetCategory: 'MONTHLY', unit: '10/BG', defaultPar: 2, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-13', name: 'HOT TEA', sheetCategory: 'MONTHLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-14', name: 'PC PEPPER', sheetCategory: 'MONTHLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-15', name: 'PC SALT', sheetCategory: 'MONTHLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-16', name: 'PC MUSTARD', sheetCategory: 'MONTHLY', unit: 'BG', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-17', name: 'PEPPER BLACK', sheetCategory: 'MONTHLY', unit: 'PT', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-18', name: 'GARLIC SALT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-19', name: 'SALMON SEASONING', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-20', name: 'MONTREAL STEAK SEASONING', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-21', name: 'CINNAMON SUGAR', sheetCategory: 'MONTHLY', unit: 'PT', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-22', name: 'SUGAR 10 X', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Dry Storage', storageLocation: 'Dry Storage' },
  { id: 'mo-23', name: 'CUP 12oz COCKTAIL slv=50', sheetCategory: 'MONTHLY', unit: 'SLV', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Bar' },
  { id: 'mo-24', name: 'CRAYONS', sheetCategory: 'MONTHLY', unit: 'BG', defaultPar: 3, category: 'Dining Room', storageLocation: 'Dry Storage' },
  { id: 'mo-25', name: 'POS PAPER KITCHEN', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 5, category: 'Office/POS', storageLocation: 'Dry Storage' },
  { id: 'mo-26', name: 'POS PAPER DINING CS/50', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 11, category: 'Office/POS', storageLocation: 'Dry Storage' },
  { id: 'mo-27', name: 'KITCHEN CARTRIDGE', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Office/POS', storageLocation: 'Kitchen' },
  { id: 'mo-28', name: 'STICKER 1', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-29', name: 'STICKER 2', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-30', name: 'STICKER 3', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-31', name: 'JUMBO', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-32', name: 'ZORRO', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-33', name: 'WHITE PLAIN', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 3, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-34', name: 'BLACK SUN DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-35', name: 'BLUE MON DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-36', name: 'YELLOW TUE DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-37', name: 'RED WED DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-38', name: 'BROWN THUR DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-39', name: 'GREEN FRI DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-40', name: 'ORANGE SAT DOT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Day Dots', storageLocation: 'Kitchen' },
  { id: 'mo-41', name: 'ANITA\'S 2X4"', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-42', name: 'ANITA\'S 14"', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 2, category: 'Labels', storageLocation: 'Dry Storage' },
  { id: 'mo-43', name: 'WAX CUSHION FOIL slv=1000', sheetCategory: 'MONTHLY', unit: 'SLV', defaultPar: 1, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'mo-44', name: 'TOOTHPICKS', sheetCategory: 'MONTHLY', unit: 'BX', defaultPar: 2, category: 'Dining Room', storageLocation: 'Dry Storage' },
  { id: 'mo-45', name: 'COFFEE FILTERS slv=', sheetCategory: 'MONTHLY', unit: 'SLV', defaultPar: 1, category: 'Beverage Supplies', storageLocation: 'Dry Storage' },
  { id: 'mo-46', name: 'LID 3.25oz', sheetCategory: 'MONTHLY', unit: 'SLV', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Dry Storage' },
  { id: 'mo-47', name: 'BEVERAGE NAPKINS', sheetCategory: 'MONTHLY', unit: 'SLV', defaultPar: 5, category: 'Paper Goods', storageLocation: 'Bar' },
  { id: 'mo-48', name: 'HALF GAL BAG - MARGARITA', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 10, category: 'Bar', storageLocation: 'Bar' },
  { id: 'mo-49', name: 'HAIRNETS box=', sheetCategory: 'MONTHLY', unit: 'BX', defaultPar: 1, category: 'Sanitation', storageLocation: 'Kitchen' },
  { id: 'mo-50', name: 'MOP RED (kitchen)', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 2, category: 'Sanitation', storageLocation: 'Kitchen' },
  { id: 'mo-51', name: 'MOP GREEN (Dine in)', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 2, category: 'Sanitation', storageLocation: 'Dining Room' },
  { id: 'mo-52', name: 'CHLORINE PH TEST KIT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Chemicals', storageLocation: 'Kitchen' },
  { id: 'mo-53', name: 'LIMEOUT', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 2, category: 'Chemicals', storageLocation: 'Kitchen' },
  { id: 'mo-54', name: 'WINDEX', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Chemicals', storageLocation: 'Dining Room' },
  { id: 'mo-55', name: 'AJAX', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Chemicals', storageLocation: 'Kitchen' },
  { id: 'mo-56', name: 'DRANO', sheetCategory: 'MONTHLY', unit: 'EA', defaultPar: 1, category: 'Chemicals', storageLocation: 'Kitchen' }
];

export const anitasBarItems: AnitaInventoryItem[] = [
  // Draft Beer (Kegs)
  { id: 'keg-1', name: 'OLD TOWN LAGER', sheetCategory: 'KEGS', unit: '1/6 KEG', defaultPar: 1.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/6 Keg (640 oz)' },
  { id: 'keg-2', name: 'ORANGE STAR FISH IPA', sheetCategory: 'KEGS', unit: '1/6 KEG', defaultPar: 2.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/6 Keg (640 oz)' },
  { id: 'keg-3', name: 'MODELO ESPECIAL', sheetCategory: 'KEGS', unit: '1/4 KEG', defaultPar: 1.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/4 Keg (992 oz)' },
  { id: 'keg-4', name: 'MILLER LITE', sheetCategory: 'KEGS', unit: '1/4 KEG', defaultPar: 0.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/4 Keg (992 oz)' },
  { id: 'keg-5', name: 'HAZY LITTLE THING', sheetCategory: 'KEGS', unit: '1/6 KEG', defaultPar: 1.0, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/6 Keg (640 oz)' },
  { id: 'keg-6', name: 'PACIFICO', sheetCategory: 'KEGS', unit: '1/4 KEG', defaultPar: 1.0, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/4 Keg (992 oz)' },
  { id: 'keg-7', name: 'BLUE MOON', sheetCategory: 'KEGS', unit: '1/6 KEG', defaultPar: 0.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/6 Keg (640 oz)' },
  { id: 'keg-8', name: 'SAM ADAMS OCT', sheetCategory: 'KEGS', unit: '1/6 KEG', defaultPar: 0.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: 'Seasonal 1/6 Keg' },
  { id: 'keg-9', name: 'ANGRY ORCHARD', sheetCategory: 'KEGS', unit: '1/6 KEG', defaultPar: 0.5, category: 'Beer Draft', storageLocation: 'Walk-In Cooler', notes: '1/6 Keg (640 oz)' },
  { id: 'keg-10', name: 'EMPTY KEGS RETURN', sheetCategory: 'KEGS', unit: 'EA', defaultPar: 0, category: 'Empties', storageLocation: 'Walk-In Cooler', notes: 'THESE KEGS MUST BE RETURNED ON NEXT DELIVERY!' },

  // Beer Bottles (Subject to 6-bottle Walk-In Rule!)
  { id: 'btl-1', name: 'CORONA', sheetCategory: 'BOTTLES', unit: '24/cs', defaultPar: 24, packSize: '24/cs', category: 'Beer Bottles', storageLocation: 'Walk-In & Bar', notes: 'Walk-in sets of 6 only (6, 12, 18, 24...)' },
  { id: 'btl-2', name: 'CORONA LIGHT', sheetCategory: 'BOTTLES', unit: '24/cs', defaultPar: 12, packSize: '24/cs', category: 'Beer Bottles', storageLocation: 'Walk-In & Bar', notes: 'Walk-in sets of 6 only (6, 12, 18, 24...)' },
  { id: 'btl-3', name: 'MODELO NEGRA', sheetCategory: 'BOTTLES', unit: '24/cs', defaultPar: 12, packSize: '24/cs', category: 'Beer Bottles', storageLocation: 'Walk-In & Bar', notes: 'Walk-in sets of 6 only (6, 12, 18, 24...)' },

  // Non-Alcoholic Bottles & Soda
  { id: 'bev-1', name: 'JUICE APPLE 12oz', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 42, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out' },
  { id: 'bev-2', name: 'COKE', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 77, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out', notes: 'Order via www.my-coke.com' },
  { id: 'bev-3', name: 'COKE DIET', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 48, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out', notes: 'Order via www.my-coke.com' },
  { id: 'bev-4', name: 'COKE ZERO', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 24, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out', notes: 'Order via www.my-coke.com' },
  { id: 'bev-5', name: 'SPRITE', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 24, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out', notes: 'Order via www.my-coke.com' },
  { id: 'bev-6', name: 'FANTA ORANGE', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 24, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out', notes: 'Order via www.my-coke.com' },
  { id: 'bev-7', name: 'POWERADE BLUE', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 34, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out' },
  { id: 'bev-8', name: 'POWERADE RED', sheetCategory: 'BEVERAGES', unit: '24/cs', defaultPar: 12, packSize: '24/cs', category: 'Beverages', storageLocation: 'Walk-In & Carry-Out' },

  // CO2 Monitoring
  { id: 'co2-1', name: 'CO2 - LG 400 LB - SODA', sheetCategory: 'CO2', unit: '%', defaultPar: 100, category: 'Gas Systems', storageLocation: 'Bulk Storage', notes: 'Gauge percentage readout (0 - 100%)' }
];

export const anitasCateringItems: AnitaInventoryItem[] = [
  // Catering Supplies
  { id: 'cat-1', name: 'PAN 1/3 SIZE 4"', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 20, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-2', name: 'LID 1/3 SIZE', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 20, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-3', name: 'PAN HALF SIZE 2"', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 6, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-4', name: 'PAN HALF SIZE 4"', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 50, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-5', name: 'LID HALF SIZE', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 50, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-6', name: 'PAN FULL SIZE 4"', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 15, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-7', name: 'PAN FULL SIZE 6"', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 15, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-8', name: 'LID FULL SIZE', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 10, category: 'Catering Pans', storageLocation: 'Catering Storage' },
  { id: 'cat-9', name: 'SERVING FORK BLK', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 48, category: 'Serving Utensils', storageLocation: 'Catering Storage' },
  { id: 'cat-10', name: 'SERVING SPOON BLK', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 48, category: 'Serving Utensils', storageLocation: 'Catering Storage' },
  { id: 'cat-11', name: 'SERVING TONG BLK', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 48, category: 'Serving Utensils', storageLocation: 'Catering Storage' },
  { id: 'cat-12', name: 'CHAFER RACK', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 13, category: 'Catering Equipment', storageLocation: 'Catering Storage' },
  { id: 'cat-13', name: 'STERNO', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 25, category: 'Catering Fuel', storageLocation: 'Catering Storage' },
  { id: 'cat-14', name: 'BOWL 160oz', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 12, category: 'Catering Containers', storageLocation: 'Catering Storage' },
  { id: 'cat-15', name: 'LID BOWL 160oz', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 12, category: 'Catering Containers', storageLocation: 'Catering Storage' },
  { id: 'cat-16', name: 'COFFEE BOX 160oz', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 7, category: 'Catering Beverage', storageLocation: 'Catering Storage' },
  { id: 'cat-17', name: 'COFFEE BOX 3 GALLON', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 5, category: 'Catering Beverage', storageLocation: 'Catering Storage' },
  { id: 'cat-18', name: 'CUP COFFEE 12oz', sheetCategory: 'SUPPLIES', unit: 'SLV=50EA', defaultPar: 6, category: 'Paper Goods', storageLocation: 'Catering Storage' },
  { id: 'cat-19', name: 'PLATE 10" BLK', sheetCategory: 'SUPPLIES', unit: 'BG=50EA', defaultPar: 2, category: 'Paper Goods', storageLocation: 'Catering Storage' },
  { id: 'cat-20', name: 'TABLE CLOTH ROLL', sheetCategory: 'SUPPLIES', unit: 'EA', defaultPar: 2, category: 'Catering Linens', storageLocation: 'Catering Storage' },

  // Operational Equipment
  { id: 'op-1', name: 'CAMBROS', sheetCategory: 'OPERATIONAL', unit: 'EA', defaultPar: 4, category: 'Insulated Transport', storageLocation: 'Storage' },
  { id: 'op-2', name: 'COFFEE CAMBROS', sheetCategory: 'OPERATIONAL', unit: 'EA', defaultPar: 2, category: 'Insulated Transport', storageLocation: 'Storage' },
  { id: 'op-3', name: 'DELIVERY VAN EQUIPMENT', sheetCategory: 'OPERATIONAL', unit: 'EA', defaultPar: 1, category: 'Fleet', storageLocation: 'Van' },

  // Catering Fruit
  { id: 'frt-1', name: 'Fruit Tray - 12"', sheetCategory: 'FRUIT', unit: 'EA', defaultPar: 2, category: 'Fresh Catering Fruit', storageLocation: 'Cooler' },
  { id: 'frt-2', name: 'Fruit Tray - 18"', sheetCategory: 'FRUIT', unit: 'EA', defaultPar: 2, category: 'Fresh Catering Fruit', storageLocation: 'Cooler' },
  { id: 'frt-3', name: 'Fruit Cups - 25 Ct', sheetCategory: 'FRUIT', unit: 'EA', defaultPar: 2, category: 'Fresh Catering Fruit', storageLocation: 'Cooler' },
  { id: 'frt-4', name: 'Fruit Cups - 50 Ct', sheetCategory: 'FRUIT', unit: 'EA', defaultPar: 2, category: 'Fresh Catering Fruit', storageLocation: 'Cooler' }
];

export const allAnitaItems: AnitaInventoryItem[] = [
  ...anitasBiWeeklyItems,
  ...anitasMonthlyItems,
  ...anitasBarItems,
  ...anitasCateringItems
];
