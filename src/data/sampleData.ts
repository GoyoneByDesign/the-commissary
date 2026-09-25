import { User, Location, InventoryItem, InventoryForm, FormSubmission } from '../types';
import { 
  allAnitaItems, 
  anitasBiWeeklyItems, 
  anitasMonthlyItems, 
  anitasBarItems, 
  anitasCateringItems 
} from './anitasSheetData';

export const sampleUsers: User[] = [
  {
    id: 'u1',
    name: 'Michael Goyone',
    email: 'michael.goyone@gmail.com',
    role: 'Super Admin',
    assignedLocations: ['CM', 'AR', 'AS', 'BK', 'CH', 'FX', 'HN', 'LS', 'MN', 'SP', 'VN'],
    assignedForms: ['f-biweekly-monthly', 'f-bar-beer', 'f-catering', 'f1', 'f2']
  },
  {
    id: 'u2',
    name: 'Carlos Mendez',
    email: 'carlos.m@thecommissary.com',
    role: 'Admin',
    assignedLocations: ['CM', 'AR', 'AS'],
    assignedForms: ['f-biweekly-monthly', 'f-bar-beer', 'f-catering', 'f1']
  },
  {
    id: 'u3',
    name: 'Sarah Jenkins',
    email: 'sarah.j@thecommissary.com',
    role: 'Manager',
    assignedLocations: ['AR'], // Arlington Manager
    assignedForms: ['f-biweekly-monthly', 'f-bar-beer', 'f-catering', 'f1', 'f2']
  },
  {
    id: 'u4',
    name: 'David Ramirez',
    email: 'david.r@thecommissary.com',
    role: 'Employee',
    assignedLocations: ['AR'], // Arlington Employee
    assignedForms: ['f-biweekly-monthly', 'f-bar-beer', 'f-catering', 'f1']
  }
];

// 11 default locations
export const defaultLocations: Location[] = [
  { code: 'CM', name: 'Commissary', active: true, address: '1200 Warehouse Dr, Fairfax VA' },
  { code: 'AR', name: 'Arlington', active: true, address: '4201 Wilson Blvd, Arlington VA' },
  { code: 'AS', name: 'Ashburn', active: true, address: '44112 Ashburn Shopping Pl, Ashburn VA' },
  { code: 'BK', name: 'Burke', active: true, address: '6415 Shiplett Blvd, Burke VA' },
  { code: 'CH', name: 'Chantilly', active: true, address: '14312 Chantilly Crossing Ln, Chantilly VA' },
  { code: 'FX', name: 'Fairfax', active: true, address: '9600 Main St, Fairfax VA' },
  { code: 'HN', name: 'Herndon', active: true, address: '2541 Elden St, Herndon VA' },
  { code: 'LS', name: 'Leesburg', active: true, address: '240 Fort Evans Rd NE, Leesburg VA' },
  { code: 'MN', name: 'Manassas', active: true, address: '8291 Sudley Rd, Manassas VA' },
  { code: 'SP', name: 'Springfield', active: true, address: '6575 Frontier Dr, Springfield VA' },
  { code: 'VN', name: 'Vienna', active: true, address: '136 Maple Ave W, Vienna VA' }
];

// Let's generate additional dummy locations to reach up to 500 locations capability
export const generateLocations = (): Location[] => {
  const result = [...defaultLocations];
  const cities = ['Richmond', 'Alexandria', 'Norfolk', 'Chesapeake', 'Roanoke', 'Williamsburg', 'Bristol', 'Hampton', 'Newport News', 'Stafford', 'Fredericksburg', 'Winchester'];
  let count = defaultLocations.length + 1;
  
  for (let i = 0; i < 489; i++) {
    const city = cities[i % cities.length];
    const code = `${city.substring(0, 2).toUpperCase()}${10 + (i % 90)}`;
    const isDeactivated = i > 400; // a few deactivated ones for administration views
    result.push({
      code,
      name: `${city} Store #${i + 1}`,
      active: !isDeactivated,
      address: `${100 + i} Operational Ln, ${city} VA`
    });
  }
  return result;
};

// 12 core items with matching voice recognition cases
const baseSampleItems: InventoryItem[] = [
  {
    id: 'item1',
    name: 'Chicken Breast',
    category: 'Cooler',
    description: 'Fresh boneless, skinless double-lobed chicken breasts.',
    vendorName: 'Sysco Food Services',
    packagingDetails: '4x10 lb bags per case',
    unitOfMeasurement: 'cases',
    defaultParLevel: 10,
    photoUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item2',
    name: 'Tomatoes',
    category: 'Prep Area',
    description: 'Ripe red slicing tomatoes, size 5x6.',
    vendorName: 'FreshPoint Produce',
    packagingDetails: '25 lb loose box',
    unitOfMeasurement: 'pounds',
    defaultParLevel: 15,
    photoUrl: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item3',
    name: 'Salsa',
    category: 'Cooler',
    description: 'Signature medium fire-roasted salsa, pre-made.',
    vendorName: 'Anita\'s Commissary Kitchen',
    packagingDetails: '4x1 gallon jugs per case',
    unitOfMeasurement: 'gallon',
    defaultParLevel: 8,
    photoUrl: 'https://images.unsplash.com/photo-1518013002796-0341c3051bb9?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item4',
    name: 'Red Chile',
    category: 'Steam Table',
    description: 'Anita\'s famous premium red chile sauce infusion.',
    vendorName: 'Anita\'s Commissary Kitchen',
    packagingDetails: '5 lb bulk containers',
    unitOfMeasurement: 'containers',
    defaultParLevel: 6,
    photoUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item5',
    name: 'Ground Beef 80/20',
    category: 'Freezer',
    description: 'Finely ground beef, 80% lean, frozen bricks.',
    vendorName: 'Sysco Food Services',
    packagingDetails: '2x10 lb tubes per case',
    unitOfMeasurement: 'cases',
    defaultParLevel: 5,
    photoUrl: 'https://images.unsplash.com/photo-1588168333986-5078647a5418?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item6',
    name: 'Flour Tortillas 12"',
    category: 'Dry Storage',
    description: 'Super soft pressed flour burritos tortillas.',
    vendorName: 'La Banderita Bakery',
    packagingDetails: '12 packs of 10 per case',
    unitOfMeasurement: 'cases',
    defaultParLevel: 12,
    photoUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item7',
    name: 'Cheddar Jack Shredded Cheese',
    category: 'Cooler',
    description: 'Fine feather shredded blend of Cheddar and Monterey Jack.',
    vendorName: 'US Foods',
    packagingDetails: '4x5 lb bags per case',
    unitOfMeasurement: 'cases',
    defaultParLevel: 7,
    photoUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item8',
    name: 'Sour Cream',
    category: 'Cooler',
    description: 'Grade A premium heavy sour cream tubs.',
    vendorName: 'US Foods',
    packagingDetails: '4x5 lb tubs per case',
    unitOfMeasurement: 'cases',
    defaultParLevel: 4,
    photoUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item9',
    name: 'Corn Tortilla Chips',
    category: 'Dry Storage',
    description: 'Light salted crisp corn bulk chips.',
    vendorName: 'La Banderita Bakery',
    packagingDetails: '15 lb bulk box',
    unitOfMeasurement: 'boxes',
    defaultParLevel: 15,
    photoUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item10',
    name: 'Corona Extra 12oz',
    category: 'Bar',
    description: 'Premium Mexican Lager bottles.',
    vendorName: 'Capital Eagle Distributors',
    packagingDetails: '24-pack glass bottles case',
    unitOfMeasurement: 'cases',
    defaultParLevel: 14,
    photoUrl: 'https://images.unsplash.com/photo-1600712242805-5f9932c68eae?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item11',
    name: 'Pinto Beans Dry',
    category: 'Dry Storage',
    description: 'Triple cleaned raw pinto beans sacks.',
    vendorName: 'Sysco Food Services',
    packagingDetails: '50 lb heavy burlap bag',
    unitOfMeasurement: 'bags',
    defaultParLevel: 6,
    photoUrl: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=200&q=80',
    active: true
  },
  {
    id: 'item12',
    name: 'Lime Margaritas Mix',
    category: 'Bar',
    description: 'Traditional heavy lime juice bar syrup concentrate.',
    vendorName: 'Capital Eagle Distributors',
    packagingDetails: '12x1 Liter bottles',
    unitOfMeasurement: 'cases',
    defaultParLevel: 5,
    photoUrl: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?auto=format&fit=crop&w=200&q=80',
    active: true
  }
];

const anitaCategoryImages: Record<string, string> = {
  'Produce': 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=200&q=80',
  'Cooler': 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80',
  'Dry Storage': 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=200&q=80',
  'Bar': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&q=80',
  'Beer Draft': 'https://images.unsplash.com/photo-1608270199042-3a832d207ec1?auto=format&fit=crop&w=200&q=80',
  'Beer Bottles': 'https://images.unsplash.com/photo-1600712242805-5f9932c68eae?auto=format&fit=crop&w=200&q=80',
  'Beverages': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=200&q=80',
  'Paper Goods': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=200&q=80',
  'Chemicals': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=200&q=80',
  'Sanitation': 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=200&q=80',
  'Catering Pans': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Serving Utensils': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Catering Equipment': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Catering Fuel': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Catering Containers': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Catering Beverage': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=200&q=80',
  'Catering Linens': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=200&q=80',
  'Insulated Transport': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Fleet': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
  'Fresh Catering Fruit': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=200&q=80',
  'Gas Systems': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80',
  'Day Dots': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=200&q=80',
  'Labels': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=200&q=80',
  'Office/POS': 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=200&q=80',
  'Dining Room': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
  'Empties': 'https://images.unsplash.com/photo-1608270199042-3a832d207ec1?auto=format&fit=crop&w=200&q=80'
};

const anitaInventoryItems: InventoryItem[] = allAnitaItems.map((item, index) => {
  let vendor = "Anita's Commissary Kitchen";
  if (['KEGS', 'BOTTLES'].includes(item.sheetCategory) || item.category.includes('Beer')) {
    vendor = 'Capital Eagle Distributors';
  } else if (item.sheetCategory === 'BEVERAGES') {
    vendor = 'Coca-Cola Refreshments';
  } else if (item.category === 'Produce' || item.sheetCategory === 'FRUIT') {
    vendor = 'FreshPoint Produce';
  } else if (['Paper Goods', 'Chemicals', 'Sanitation', 'Catering Pans', 'Catering Containers', 'Serving Utensils'].includes(item.category)) {
    vendor = 'Sysco Food Services';
  }

  const basePrice = item.sheetCategory === 'KEGS' ? 85.00 :
                    item.sheetCategory === 'BOTTLES' ? 32.50 :
                    item.unit === 'SLV' ? 28.00 :
                    item.unit === 'BX' ? 44.00 :
                    item.unit === 'RL' ? 14.50 : 12.00;

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    description: item.notes || `${item.name} (${item.unit}) - ${item.sheetCategory}`,
    vendorName: vendor,
    packagingDetails: item.packSize || `Unit: ${item.unit}`,
    unitOfMeasurement: item.unit,
    defaultParLevel: item.defaultPar,
    photoUrl: anitaCategoryImages[item.category] || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80',
    active: true,
    itemCode: item.id.toUpperCase(),
    quantityPerCase: item.packSize && item.packSize.includes('24') ? 24 : 1,
    measurementType: item.unit === 'PT' || item.unit === '4QT' ? 'liquid' : 'discrete',
    liquidUnit: item.unit === 'PT' ? 'fl oz' : 'gal',
    createdPrice: basePrice + (index % 5) * 1.5,
    recentPurchasePrice: basePrice + (index % 5) * 1.5,
    recentPurchaseDate: '2026-05-18'
  };
});

// Full combined catalog (original base items + complete authentic Anita's store catalog)
export const sampleItems: InventoryItem[] = [
  ...baseSampleItems,
  ...anitaInventoryItems
];

export const sampleForms: InventoryForm[] = [
  {
    id: 'f-biweekly-monthly',
    title: "Anita's Bi-Weekly & Monthly Store Order Form",
    locationCode: 'AR', // Arlington
    assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
    frequency: 'Bi-weekly',
    dueDate: '2026-06-03',
    dueTime: '10:59',
    sections: [
      { name: 'BI-WEEKLY ORDER', itemIds: anitasBiWeeklyItems.map(i => i.id) },
      { name: 'MONTHLY ORDER', itemIds: anitasMonthlyItems.map(i => i.id) }
    ],
    active: true
  },
  {
    id: 'f-bar-beer',
    title: "Anita's Bar, Draft Beer & Beverage Audit",
    locationCode: 'AR',
    assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
    frequency: 'Weekly',
    dueDate: '2026-05-31',
    dueTime: '23:59',
    sections: [
      { name: 'DRAFT BEER (KEGS)', itemIds: anitasBarItems.filter(i => i.sheetCategory === 'KEGS').map(i => i.id) },
      { name: 'BEER BOTTLES (6-PACK RULE)', itemIds: anitasBarItems.filter(i => i.sheetCategory === 'BOTTLES').map(i => i.id) },
      { name: 'SODA & BEVERAGES', itemIds: anitasBarItems.filter(i => i.sheetCategory === 'BEVERAGES').map(i => i.id) },
      { name: 'BULK GAS & CO2', itemIds: anitasBarItems.filter(i => i.sheetCategory === 'CO2').map(i => i.id) }
    ],
    active: true
  },
  {
    id: 'f-catering',
    title: "Anita's Catering & Operational Supplies Form",
    locationCode: 'AR',
    assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
    frequency: 'Weekly',
    dueDate: '2026-06-01',
    dueTime: '17:00',
    sections: [
      { name: 'CATERING SUPPLIES', itemIds: anitasCateringItems.filter(i => i.sheetCategory === 'SUPPLIES').map(i => i.id) },
      { name: 'OPERATIONAL EQUIPMENT', itemIds: anitasCateringItems.filter(i => i.sheetCategory === 'OPERATIONAL').map(i => i.id) },
      { name: 'FRESH CATERING FRUIT', itemIds: anitasCateringItems.filter(i => i.sheetCategory === 'FRUIT').map(i => i.id) }
    ],
    active: true
  },
  {
    id: 'f1',
    title: 'Daily Store Prep & Kitchen Stock Sheet',
    locationCode: 'AR',
    assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
    frequency: 'Daily',
    dueDate: '2026-05-30',
    dueTime: '22:00',
    sections: [
      { name: 'Cooler', itemIds: ['item1', 'item3', 'item7', 'item8', 'bw-1', 'bw-2', 'bw-7', 'bw-13'] },
      { name: 'Dry Storage', itemIds: ['item6', 'item9', 'item11', 'bw-3', 'bw-4', 'bw-6', 'bw-8', 'bw-9'] },
      { name: 'Prep Area', itemIds: ['item2'] },
      { name: 'Bar', itemIds: ['item10', 'item12', 'bw-5'] },
      { name: 'Freezer', itemIds: ['item5'] },
      { name: 'Steam Table', itemIds: ['item4'] }
    ],
    active: true
  },
  {
    id: 'f2',
    title: 'Daily Commissary Central Stock Sheet',
    locationCode: 'CM',
    assignedUserIds: ['u1', 'u2', 'u3', 'u4'],
    frequency: 'Daily',
    dueDate: '2026-05-24',
    dueTime: '17:00',
    sections: [
      { name: 'Cooler', itemIds: ['item3', 'item4', 'item7', 'item8'] },
      { name: 'Dry Storage', itemIds: ['item6', 'item9', 'item11'] }
    ],
    active: true
  }
];

export const sampleSubmissions: FormSubmission[] = [
  {
    id: 's1',
    formId: 'f1',
    formTitle: 'Bi-Weekly Food & Beverage Audit',
    locationCode: 'AR',
    userId: 'u3',
    userName: 'Sarah Jenkins',
    timestamp: '2026-05-16T21:40:00Z', // Completed 8 days ago
    items: [
      { itemId: 'item1', name: 'Chicken Breast', category: 'Cooler', unit: 'cases', currentCount: 4, parLevel: 10, suggestedOrder: 6, finalOrder: 6, total: 10, photoUrl: sampleItems[0].photoUrl },
      { itemId: 'item3', name: 'Salsa', category: 'Cooler', unit: 'gallon', currentCount: 3, parLevel: 8, suggestedOrder: 5, finalOrder: 5, total: 8, photoUrl: sampleItems[2].photoUrl },
      { itemId: 'item7', name: 'Cheddar Jack Shredded Cheese', category: 'Cooler', unit: 'cases', currentCount: 7, parLevel: 7, suggestedOrder: 0, finalOrder: 0, total: 7, photoUrl: sampleItems[6].photoUrl },
      { itemId: 'item8', name: 'Sour Cream', category: 'Cooler', unit: 'cases', currentCount: 1, parLevel: 4, suggestedOrder: 3, finalOrder: 4, total: 5, photoUrl: sampleItems[7].photoUrl },
      { itemId: 'item6', name: 'Flour Tortillas 12"', category: 'Dry Storage', unit: 'cases', currentCount: 8, parLevel: 12, suggestedOrder: 4, finalOrder: 4, total: 12, photoUrl: sampleItems[5].photoUrl },
      { itemId: 'item9', name: 'Corn Tortilla Chips', category: 'Dry Storage', unit: 'boxes', currentCount: 3, parLevel: 15, suggestedOrder: 12, finalOrder: 15, total: 18, photoUrl: sampleItems[8].photoUrl },
      { itemId: 'item11', name: 'Pinto Beans Dry', category: 'Dry Storage', unit: 'bags', currentCount: 5, parLevel: 6, suggestedOrder: 1, finalOrder: 1, total: 6, photoUrl: sampleItems[10].photoUrl },
      { itemId: 'item2', name: 'Tomatoes', category: 'Prep Area', unit: 'pounds', currentCount: 12, parLevel: 15, suggestedOrder: 3, finalOrder: 3, total: 15, photoUrl: sampleItems[1].photoUrl },
      { itemId: 'item10', name: 'Corona Extra 12oz', category: 'Bar', unit: 'cases', currentCount: 14, parLevel: 14, suggestedOrder: 0, finalOrder: 0, total: 14, photoUrl: sampleItems[9].photoUrl },
      { itemId: 'item12', name: 'Lime Margaritas Mix', category: 'Bar', unit: 'cases', currentCount: 2, parLevel: 5, suggestedOrder: 3, finalOrder: 3, total: 5, photoUrl: sampleItems[11].photoUrl },
      { itemId: 'item5', name: 'Ground Beef 80/20', category: 'Freezer', unit: 'cases', currentCount: 1, parLevel: 5, suggestedOrder: 4, finalOrder: 4, total: 5, photoUrl: sampleItems[4].photoUrl },
      { itemId: 'item4', name: 'Red Chile', category: 'Steam Table', unit: 'containers', currentCount: 2, parLevel: 6, suggestedOrder: 4, finalOrder: 4, total: 6, photoUrl: sampleItems[3].photoUrl }
    ],
    notes: 'Busy week. Adjusted chip order up due to upcoming Memorial Day weekend promo.'
  },
  {
    id: 's2',
    formId: 'f1',
    formTitle: 'Bi-Weekly Food & Beverage Audit',
    locationCode: 'AR',
    userId: 'u4',
    userName: 'David Ramirez',
    timestamp: '2026-05-02T21:15:00Z', // Completed 22 days ago
    items: [
      { itemId: 'item1', name: 'Chicken Breast', category: 'Cooler', unit: 'cases', currentCount: 8, parLevel: 10, suggestedOrder: 2, finalOrder: 2, total: 10, photoUrl: sampleItems[0].photoUrl },
      { itemId: 'item3', name: 'Salsa', category: 'Cooler', unit: 'gallon', currentCount: 6, parLevel: 8, suggestedOrder: 2, finalOrder: 2, total: 8, photoUrl: sampleItems[2].photoUrl },
      { itemId: 'item7', name: 'Cheddar Jack Shredded Cheese', category: 'Cooler', unit: 'cases', currentCount: 3, parLevel: 7, suggestedOrder: 4, finalOrder: 4, total: 7, photoUrl: sampleItems[6].photoUrl },
      { itemId: 'item8', name: 'Sour Cream', category: 'Cooler', unit: 'cases', currentCount: 2, parLevel: 4, suggestedOrder: 2, finalOrder: 2, total: 4, photoUrl: sampleItems[7].photoUrl },
      { itemId: 'item6', name: 'Flour Tortillas 12"', category: 'Dry Storage', unit: 'cases', currentCount: 10, parLevel: 12, suggestedOrder: 2, finalOrder: 2, total: 12, photoUrl: sampleItems[5].photoUrl },
      { itemId: 'item9', name: 'Corn Tortilla Chips', category: 'Dry Storage', unit: 'boxes', currentCount: 5, parLevel: 15, suggestedOrder: 10, finalOrder: 10, total: 15, photoUrl: sampleItems[8].photoUrl },
      { itemId: 'item11', name: 'Pinto Beans Dry', category: 'Dry Storage', unit: 'bags', currentCount: 4, parLevel: 6, suggestedOrder: 2, finalOrder: 2, total: 6, photoUrl: sampleItems[10].photoUrl },
      { itemId: 'item2', name: 'Tomatoes', category: 'Prep Area', unit: 'pounds', currentCount: 5, parLevel: 15, suggestedOrder: 10, finalOrder: 10, total: 15, photoUrl: sampleItems[1].photoUrl },
      { itemId: 'item10', name: 'Corona Extra 12oz', category: 'Bar', unit: 'cases', currentCount: 10, parLevel: 14, suggestedOrder: 4, finalOrder: 5, total: 15, photoUrl: sampleItems[9].photoUrl },
      { itemId: 'item12', name: 'Lime Margaritas Mix', category: 'Bar', unit: 'cases', currentCount: 4, parLevel: 5, suggestedOrder: 1, finalOrder: 1, total: 5, photoUrl: sampleItems[11].photoUrl },
      { itemId: 'item5', name: 'Ground Beef 80/20', category: 'Freezer', unit: 'cases', currentCount: 3, parLevel: 5, suggestedOrder: 2, finalOrder: 2, total: 5, photoUrl: sampleItems[4].photoUrl },
      { itemId: 'item4', name: 'Red Chile', category: 'Steam Table', unit: 'containers', currentCount: 4, parLevel: 6, suggestedOrder: 2, finalOrder: 2, total: 6, photoUrl: sampleItems[3].photoUrl }
    ],
    notes: 'All items tracked normally.'
  }
];
export const auditLogsSample = [
  { id: 'l1', action: 'CREATE_USER', user: 'Michael Goyone', details: 'Created user David Ramirez (Employee)', timestamp: '2026-05-23T09:12:00Z' },
  { id: 'l2', action: 'ASSIGN_LOCATION', user: 'Michael Goyone', details: 'Assigned David Ramirez to Arlington (AR)', timestamp: '2026-05-23T09:14:00Z' },
  { id: 'l3', action: 'GENERATE_REPORT', user: 'Sarah Jenkins', details: 'Exported Bi-Weekly stock variance report for AR to CSV', timestamp: '2026-05-16T21:42:00Z' },
  { id: 'l4', action: 'UPDATE_ITEM', user: 'Carlos Mendez', details: 'Edited pricing & details on Chicken Breast (item1)', timestamp: '2026-05-15T14:30:00Z' }
];
