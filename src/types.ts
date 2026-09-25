export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedLocations: string[]; // List of location codes
  assignedForms: string[];     // List of form ids
  isSuspended?: boolean;
  isLocked?: boolean;
}

export interface Location {
  code: string; // CM, AR, AS, BK, etc.
  name: string; // Arlington, Ashburn, Commissary, etc.
  active: boolean;
  address?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string; // Cooler, Freezer, Dry Storage, Bar, etc.
  description: string;
  vendorName: string;
  packagingDetails: string;
  unitOfMeasurement: string; // cases, pounds, gallons, bags, cans, etc.
  defaultParLevel: number;
  photoUrl: string;
  active: boolean;
  itemCode?: string;
  quantityPerCase?: number;
  measurementType?: 'weight' | 'liquid' | 'discrete';
  weightUnit?: 'lbs' | 'oz';
  liquidUnit?: 'gal' | 'L' | 'mL' | 'fl oz';
  weightOrVolumeValue?: number;
  photoUrls?: string[];
  nestedUnitConfig?: {
    hasNested: boolean;
    innerUnitName: string;
    innerQtyPerParent: number;
    baseUnitName: string;
    baseQtyPerInner: number;
  };
  createdAt?: string;
  createdPrice?: number;
  recentPurchaseDate?: string;
  recentPurchasePrice?: number;
  itemSourceType?: 'purchased' | 'manufactured';
  purchasedQty?: number;
  recipeIngredients?: Array<{
    name: string;
    qty: number;
    unit: string;
  }>;
  yield1Qty?: number;
  yield1Unit?: string;
  yield2Qty?: number;
  yield2Unit?: string;
}

export interface Vendor {
  id: string;
  name: string;
  address: string;
  phone: string;
  representative: string;
  representativePosition?: string; // Position of the point of contact/representative
  email: string;
  cellphone: string;
  directLine: string;
  createdAt: string; // Date and time when vendor was added
}

export interface FormSection {
  name: string; // Cooler, Freezer, Dry Storage, Steam Table, Bar, Prep Area, etc.
  itemIds: string[];
}

export interface InventoryForm {
  id: string;
  title: string;
  locationCode: string; // CM, AR, etc.
  assignedUserIds: string[];
  frequency: 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly';
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  sections: FormSection[];
  active: boolean;
}

export interface SubmissionItem {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  currentCount: number;
  parLevel: number;
  suggestedOrder: number; // Max(0, Par Level - Current Count)
  finalOrder: number;     // Editable
  total: number;          // Current Count + Final Order
  photoUrl: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  locationCode: string;
  userId: string;
  userName: string;
  timestamp: string; // ISO String
  items: SubmissionItem[];
  notes?: string;
}

export interface VoiceInstruction {
  text: string;
  parsedItem?: string;
  parsedQty?: number;
  parsedUnit?: string;
  status: 'matched' | 'unrecognized' | 'listening' | 'idle';
  updatedItemName?: string;
}

export interface UploadedInvoice {
  id: string;
  vendorName: string;
  itemsCount: number;
  totalPrice: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  storeLocation?: string; // location code (e.g. CM, AR, AS)
  category: string; // Cooler, Dry Storage, Bar, Freezer, Prep Area, Steam Table
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    packaging?: string;
  }>;
}

